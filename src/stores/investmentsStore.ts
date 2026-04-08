import { Timestamp } from 'firebase/firestore'
import { create } from 'zustand'

import {
  appendTransaction,
  createInvestment,
  type CreateInvestmentInput,
  deleteInvestment,
  subscribeInvestments,
  subscribePortfolioSnapshots,
  updateInvestmentAlerts,
} from '@/services/investmentService'
import { refreshPortfolioQuotes } from '@/services/marketService'
import {
  buildDiversificationData,
  createTxId,
  DEFAULT_INVESTMENT_FILTERS,
  type DiversificationPoint,
  type Investment,
  type InvestmentFiltersState,
  mapSnapshotsToLineData,
  type PortfolioLinePoint,
  type PortfolioSnapshot,
  type PositionMetrics,
  type PriceAlertRule,
  type TransactionType,
} from '@/types/investment'

interface SaveTransactionInput {
  type: TransactionType
  date: Date
  qty: number
  price: number
  fee?: number
}

interface TotalsSummary {
  totalValue: number
  totalCostBasis: number
  realizedPnl: number
  unrealizedPnl: number
  totalPnl: number
  roiPct: number
  staleCount: number
}

interface InvestmentsStoreState {
  investments: Investment[]
  snapshots: PortfolioSnapshot[]
  loading: boolean
  refreshingQuotes: boolean
  error: string | null
  filters: InvestmentFiltersState
  lastRefreshAt: string | null

  init: () => () => void
  setFilters: (updates: Partial<InvestmentFiltersState>) => void
  resetFilters: () => void

  saveInvestment: (input: CreateInvestmentInput) => Promise<string>
  saveTransaction: (investmentId: string, tx: SaveTransactionInput) => Promise<PositionMetrics>
  saveAlerts: (investmentId: string, alerts: PriceAlertRule[]) => Promise<void>
  removeInvestment: (investmentId: string) => Promise<void>
  refreshQuotes: (force?: boolean, investmentIds?: string[]) => Promise<void>

  filteredInvestments: () => Investment[]
  lineSeries: () => PortfolioLinePoint[]
  diversification: () => DiversificationPoint[]
  totals: () => TotalsSummary
}

function matchesSearch(row: Investment, search: string): boolean {
  if (!search) return true
  const query = search.toLowerCase()
  return (
    row.symbol.toLowerCase().includes(query) ||
    row.displayTicker.toLowerCase().includes(query) ||
    row.market.toLowerCase().includes(query)
  )
}

function sortRows(a: Investment, b: Investment, sortBy: InvestmentFiltersState['sortBy']) {
  switch (sortBy) {
    case 'roi':
      return b.roiPct - a.roiPct
    case 'pnl':
      return b.totalPnl - a.totalPnl
    case 'updated':
      return b.updatedAt.toMillis() - a.updatedAt.toMillis()
    case 'value':
    default:
      return b.currentValue - a.currentValue
  }
}

export const useInvestmentsStore = create<InvestmentsStoreState>((set, get) => ({
  investments: [],
  snapshots: [],
  loading: true,
  refreshingQuotes: false,
  error: null,
  filters: { ...DEFAULT_INVESTMENT_FILTERS },
  lastRefreshAt: null,

  init: () => {
    set({ loading: true, error: null })

    const unsubInvestments = subscribeInvestments(
      (investments) => {
        set({ investments, loading: false, error: null })
      },
      (err) => {
        set({ error: err.message, loading: false })
      },
    )

    const unsubSnapshots = subscribePortfolioSnapshots(
      (snapshots) => {
        set({ snapshots })
      },
      (err) => {
        set({ error: err.message })
      },
    )

    return () => {
      unsubInvestments()
      unsubSnapshots()
    }
  },

  setFilters: (updates) => {
    set((state) => ({
      filters: { ...state.filters, ...updates },
    }))
  },

  resetFilters: () => {
    set({ filters: { ...DEFAULT_INVESTMENT_FILTERS } })
  },

  saveInvestment: async (input) => {
    return createInvestment(input)
  },

  saveTransaction: async (investmentId, tx) => {
    return appendTransaction(investmentId, {
      txId: createTxId(),
      type: tx.type,
      date: tx.date,
      qty: tx.qty,
      price: tx.price,
      fee: tx.fee,
    })
  },

  saveAlerts: async (investmentId, alerts) => {
    await updateInvestmentAlerts(investmentId, alerts)
  },

  removeInvestment: async (investmentId) => {
    await deleteInvestment(investmentId)
  },

  refreshQuotes: async (force = false, investmentIds) => {
    const current = get().investments
    if (current.length === 0) return

    const selectedIds =
      Array.isArray(investmentIds) && investmentIds.length > 0
        ? investmentIds
        : current.map((row) => row.id)

    set({ refreshingQuotes: true, error: null })

    try {
      const response = await refreshPortfolioQuotes({
        investmentIds: selectedIds,
        force,
      })

      set((state) => {
        const quotesById = new Map<string, (typeof response.quotes)[number]>()
        for (const quote of response.quotes) {
          if (typeof quote.investmentId === 'string' && quote.investmentId.length > 0) {
            quotesById.set(quote.investmentId, quote)
          }
        }

        const quotesBySymbol = new Map(
          response.quotes.map((quote) => [quote.symbol.toUpperCase(), quote]),
        )

        const now = Timestamp.now()

        const investments = state.investments.map((row) => {
          const quote =
            quotesById.get(row.id) ??
            quotesBySymbol.get(row.symbol.toUpperCase()) ??
            quotesBySymbol.get(row.displayTicker.toUpperCase())

          if (!quote) return row

          return {
            ...row,
            currentPrice: quote.price ?? row.currentPrice,
            stalePrice: quote.stale,
            priceUpdatedAt: quote.price !== null ? now : row.priceUpdatedAt,
            updatedAt: now,
          }
        })

        return {
          investments,
          refreshingQuotes: false,
          error: null,
          lastRefreshAt: response.refreshedAt,
        }
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al refrescar precios'
      set({ refreshingQuotes: false, error: message })
    }
  },

  filteredInvestments: () => {
    const { investments, filters } = get()

    return [...investments]
      .filter((row) => matchesSearch(row, filters.search))
      .filter((row) => (filters.type === 'all' ? true : row.type === filters.type))
      .filter((row) =>
        filters.market
          ? row.market.toLowerCase().includes(filters.market.toLowerCase())
          : true,
      )
      .sort((a, b) => sortRows(a, b, filters.sortBy))
  },

  lineSeries: () => {
    return mapSnapshotsToLineData(get().snapshots)
  },

  diversification: () => {
    return buildDiversificationData(get().investments)
  },

  totals: () => {
    const investments = get().investments

    const totalValue = investments.reduce((sum, row) => sum + row.currentValue, 0)
    const totalCostBasis = investments.reduce((sum, row) => sum + row.costBasis, 0)
    const realizedPnl = investments.reduce((sum, row) => sum + row.realizedPnl, 0)
    const unrealizedPnl = investments.reduce((sum, row) => sum + row.unrealizedPnl, 0)
    const totalPnl = realizedPnl + unrealizedPnl
    const staleCount = investments.filter((row) => row.stalePrice).length

    return {
      totalValue,
      totalCostBasis,
      realizedPnl,
      unrealizedPnl,
      totalPnl,
      roiPct: totalCostBasis > 0 ? (totalPnl / totalCostBasis) * 100 : 0,
      staleCount,
    }
  },
}))
