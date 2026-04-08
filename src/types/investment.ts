import type { Timestamp } from 'firebase/firestore'

export type InvestmentType = 'crypto' | 'stock' | 'etf'
export type InvestmentCurrency = 'EUR' | 'USD'
export type TransactionType = 'buy' | 'sell'

export const INVESTMENT_TYPE_LABELS: Record<InvestmentType, string> = {
  stock: 'Acción',
  etf: 'ETF',
  crypto: 'Crypto',
}

export interface InvestmentTransaction {
  txId: string
  type: TransactionType
  date: Timestamp
  qty: number
  price: number
  fee: number
}

export interface PriceAlertRule {
  id: string
  type: 'above' | 'below'
  price: number
  active: boolean
  lastTriggeredAt: Timestamp | null
}

export interface PositionMetrics {
  quantity: number
  avgBuyPrice: number
  costBasis: number
  realizedPnl: number
  unrealizedPnl: number
  totalPnl: number
  roiPct: number
  totalFees: number
  currentValue: number
}

export interface Investment extends PositionMetrics {
  id: string
  uid: string
  symbol: string
  displayTicker: string
  type: InvestmentType
  market: string
  currency: InvestmentCurrency
  transactions: InvestmentTransaction[]
  alerts: PriceAlertRule[]
  currentPrice: number | null
  priceUpdatedAt: Timestamp | null
  stalePrice: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface PortfolioSnapshot {
  id: string
  uid: string
  timestamp: Timestamp
  totalValue: number
  totalCostBasis: number
  unrealizedPnl: number
  realizedPnl: number
  totalPnl: number
  roiPct: number
  byType: Record<InvestmentType, number>
  createdAt: Timestamp
}

export interface InvestmentFiltersState {
  search: string
  type: InvestmentType | 'all'
  market: string
  sortBy: 'value' | 'roi' | 'pnl' | 'updated'
}

export const DEFAULT_INVESTMENT_FILTERS: InvestmentFiltersState = {
  search: '',
  type: 'all',
  market: '',
  sortBy: 'value',
}

export interface PortfolioLinePoint {
  id: string
  label: string
  totalValue: number
  totalPnl: number
  roiPct: number
}

export interface DiversificationPoint {
  key: InvestmentType
  label: string
  value: number
  pct: number
  color: string
}

export interface UpsertInvestmentTransactionRequest {
  investmentId?: string
  symbol: string
  displayTicker: string
  type: InvestmentType
  market: string
  currency: InvestmentCurrency
  transaction: {
    txId: string
    type: TransactionType
    date: string
    qty: number
    price: number
    fee?: number
  }
}

export interface UpsertInvestmentTransactionResponse {
  ok: boolean
  investmentId: string
  position: PositionMetrics
}

export interface RefreshPortfolioQuotesRequest {
  investmentIds?: string[]
  force?: boolean
}

export interface RefreshPortfolioQuote {
  investmentId?: string
  symbol: string
  price: number | null
  stale: boolean
  source?: string
  error?: string
}

export interface RefreshPortfolioQuotesResponse {
  ok: boolean
  refreshedAt: string
  rateLimit: {
    used: number
    remaining: number
    windowKey: string
  }
  quotes: RefreshPortfolioQuote[]
  alertsTriggered: string[]
}

export function toSafeNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function computePositionMetrics(
  transactions: InvestmentTransaction[],
  currentPrice: number | null,
): PositionMetrics {
  let quantity = 0
  let costBasis = 0
  let realizedPnl = 0
  let totalFees = 0
  let investedCapital = 0

  const ordered = [...transactions].sort(
    (a, b) => a.date.toMillis() - b.date.toMillis(),
  )

  for (const tx of ordered) {
    if (tx.qty <= 0 || tx.price <= 0) {
      continue
    }

    totalFees += tx.fee

    if (tx.type === 'buy') {
      const txCost = tx.qty * tx.price + tx.fee
      quantity += tx.qty
      costBasis += txCost
      investedCapital += txCost
      continue
    }

    if (tx.qty > quantity + 1e-9) {
      throw new Error('SELL_EXCEEDS_POSITION')
    }

    const avgCost = quantity > 0 ? costBasis / quantity : 0
    const soldCost = avgCost * tx.qty
    const proceeds = tx.qty * tx.price - tx.fee

    realizedPnl += proceeds - soldCost
    quantity -= tx.qty
    costBasis -= soldCost

    if (quantity <= 1e-9) {
      quantity = 0
      costBasis = 0
    }
  }

  const avgBuyPrice = quantity > 0 ? costBasis / quantity : 0
  const currentValue = currentPrice !== null ? quantity * currentPrice : 0
  const unrealizedPnl = currentPrice !== null ? currentValue - costBasis : 0
  const totalPnl = realizedPnl + unrealizedPnl
  const roiPct = investedCapital > 0 ? (totalPnl / investedCapital) * 100 : 0

  return {
    quantity,
    avgBuyPrice,
    costBasis,
    realizedPnl,
    unrealizedPnl,
    totalPnl,
    roiPct,
    totalFees,
    currentValue,
  }
}

export function createTxId(prefix = 'tx'): string {
  const suffix =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${String(Date.now())}-${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}-${suffix}`
}

function toMillis(value: Timestamp | Date | string | null | undefined): number {
  if (!value) return 0
  if (typeof value === 'string') return new Date(value).getTime()
  if (value instanceof Date) return value.getTime()
  return value.toMillis()
}

function formatDayLabel(timestamp: Timestamp): string {
  return timestamp.toDate().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
  })
}

export function mapSnapshotsToLineData(
  snapshots: PortfolioSnapshot[],
): PortfolioLinePoint[] {
  return [...snapshots]
    .sort((a, b) => toMillis(a.timestamp) - toMillis(b.timestamp))
    .map((snapshot) => ({
      id: snapshot.id,
      label: formatDayLabel(snapshot.timestamp),
      totalValue: snapshot.totalValue,
      totalPnl: snapshot.totalPnl,
      roiPct: snapshot.roiPct,
    }))
}

const TYPE_META: Record<InvestmentType, { label: string; color: string }> = {
  stock: { label: 'Acciones', color: '#3b82f6' },
  etf: { label: 'ETF', color: '#22c55e' },
  crypto: { label: 'Crypto', color: '#f59e0b' },
}

export function buildDiversificationData(
  investments: Investment[],
): DiversificationPoint[] {
  const totals: Record<InvestmentType, number> = {
    stock: 0,
    etf: 0,
    crypto: 0,
  }

  for (const row of investments) {
    const value = row.currentValue > 0 ? row.currentValue : row.costBasis
    totals[row.type] += value
  }

  const grandTotal = totals.stock + totals.etf + totals.crypto
  if (grandTotal <= 0) return []

  const byType = (Object.keys(totals) as InvestmentType[])
    .map((type) => ({
      key: type,
      label: TYPE_META[type].label,
      color: TYPE_META[type].color,
      value: totals[type],
      pct: (totals[type] / grandTotal) * 100,
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value)

  return byType
}
