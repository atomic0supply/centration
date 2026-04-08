/* @vitest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react'
import { Timestamp } from 'firebase/firestore'
import { createElement } from 'react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/components/ui', () => ({
  Button: ({ children, ...props }: Record<string, unknown>) =>
    createElement('button', props as Record<string, unknown>, children as string),
  Card: ({ children, className }: Record<string, unknown>) =>
    createElement('div', { className: className as string }, children as string),
  Skeleton: () => createElement('div', { 'data-testid': 'skeleton' }),
  Modal: ({ open, children }: Record<string, unknown>) =>
    open ? createElement('div', null, children as string) : null,
}))

vi.mock('@/components/domain/budget', () => ({
  BudgetOverview: () => createElement('div', { 'data-testid': 'budget-overview' }),
}))

vi.mock('@/components/domain/expenses', () => ({
  ExpenseCard: () => createElement('div', { 'data-testid': 'expense-card' }),
  ExpenseCharts: () => createElement('div', { 'data-testid': 'expense-charts' }),
  ExpenseFilters: () => createElement('div', { 'data-testid': 'expense-filters' }),
  ExpenseForm: () => createElement('div', { 'data-testid': 'expense-form' }),
}))

vi.mock('@/components/domain/subscriptions', () => ({
  ChargeCalendar: () => createElement('div', { 'data-testid': 'charge-calendar' }),
  SubscriptionCard: () => createElement('div', { 'data-testid': 'subscription-card' }),
  SubscriptionForm: () => createElement('div', { 'data-testid': 'subscription-form' }),
}))

vi.mock('@/components/domain/investments', () => ({
  InvestmentForm: () => createElement('div', { 'data-testid': 'investment-form' }),
  InvestmentsCharts: () => createElement('div', { 'data-testid': 'investments-charts' }),
  InvestmentsFilters: () => createElement('div', { 'data-testid': 'investments-filters' }),
  NetWorthCard: () => createElement('div', { 'data-testid': 'net-worth-card' }),
  PositionRow: () => createElement('div', { 'data-testid': 'position-row' }),
  PriceAlertForm: () => createElement('div', { 'data-testid': 'price-alert-form' }),
  TransactionForm: () => createElement('div', { 'data-testid': 'transaction-form' }),
}))

vi.mock('@/services/expenseService', () => ({
  createExpense: vi.fn(),
  deleteExpense: vi.fn(),
  updateExpense: vi.fn(),
}))

vi.mock('@/services/subscriptionService', () => ({
  createSubscription: vi.fn(),
  deleteSubscription: vi.fn(),
  updateSubscription: vi.fn(),
}))

vi.mock('@/utils/csvExport', () => ({
  exportExpensesToCSV: vi.fn(),
}))

vi.mock('@/stores/budgetStore', () => {
  const state = {
    init: () => () => undefined,
  }

  return {
    useBudgetStore: <T,>(selector: (s: typeof state) => T) => selector(state),
  }
})

vi.mock('@/stores/expensesStore', () => {
  const state = {
    expenses: [],
    loading: false,
    filters: {
      search: '',
      category: 'all',
      dateFrom: '',
      dateTo: '',
      provider: '',
      sortBy: 'date',
      sortOrder: 'desc',
    },
    init: () => () => undefined,
    setFilters: vi.fn(),
    resetFilters: vi.fn(),
    filteredExpenses: () => [],
    totalThisMonth: () => 0,
    uniqueProviders: () => [],
  }

  return {
    useExpensesStore: <T,>(selector: (s: typeof state) => T) => selector(state),
  }
})

vi.mock('@/stores/subscriptionsStore', () => {
  const state = {
    subscriptions: [],
    loading: false,
    init: () => () => undefined,
    activeSubscriptions: () => [],
    totalMonthlyCost: () => 0,
    totalYearlyCost: () => 0,
  }

  return {
    useSubscriptionsStore: <T,>(selector: (s: typeof state) => T) => selector(state),
  }
})

vi.mock('@/stores/investmentsStore', () => {
  const state = {
    investments: [],
    snapshots: [],
    loading: false,
    refreshingQuotes: false,
    error: null,
    filters: {
      search: '',
      type: 'all',
      market: '',
      sortBy: 'value',
    },
    lastRefreshAt: null,
    init: () => () => undefined,
    setFilters: vi.fn(),
    resetFilters: vi.fn(),
    saveInvestment: vi.fn(),
    saveTransaction: vi.fn(),
    saveAlerts: vi.fn(),
    removeInvestment: vi.fn(),
    refreshQuotes: vi.fn(),
    filteredInvestments: () => [],
    lineSeries: () => [],
    diversification: () => [],
    totals: () => ({
      totalValue: 0,
      totalCostBasis: 0,
      realizedPnl: 0,
      unrealizedPnl: 0,
      totalPnl: 0,
      roiPct: 0,
      staleCount: 0,
    }),
  }

  return {
    useInvestmentsStore: <T,>(selector: (s: typeof state) => T) => selector(state),
  }
})

import { PositionRow } from '@/components/domain/investments/PositionRow'
import { Ledger } from '@/pages/Ledger'
import {
  buildDiversificationData,
  computePositionMetrics,
  type Investment,
  type InvestmentTransaction,
  mapSnapshotsToLineData,
  type PortfolioSnapshot,
} from '@/types/investment'

function makeTimestamp(isoDate: string): Timestamp {
  return Timestamp.fromDate(new Date(isoDate))
}

function makeInvestment(overrides: Partial<Investment> = {}): Investment {
  const now = Timestamp.now()

  return {
    id: 'inv-1',
    uid: 'user-1',
    symbol: 'AAPL',
    displayTicker: 'AAPL',
    type: 'stock',
    market: 'US',
    currency: 'USD',
    transactions: [],
    alerts: [],
    currentPrice: 120,
    priceUpdatedAt: now,
    stalePrice: false,
    quantity: 10,
    avgBuyPrice: 100,
    costBasis: 1_000,
    realizedPnl: 50,
    unrealizedPnl: 200,
    totalPnl: 250,
    roiPct: 25,
    totalFees: 2,
    currentValue: 1_200,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('investments frontend module', () => {
  it('renders investments tab in Ledger', () => {
    render(createElement(Ledger))

    const tabBtn = screen.getByRole('button', { name: /inversiones/i })
    expect(tabBtn).toBeTruthy()

    fireEvent.click(tabBtn)
    expect(screen.getByText(/sin posiciones/i)).toBeTruthy()
  })

  it('computes position metrics after buy/sell transactions', () => {
    const transactions: InvestmentTransaction[] = [
      {
        txId: 'tx-1',
        type: 'buy',
        date: makeTimestamp('2026-01-01T00:00:00.000Z'),
        qty: 10,
        price: 100,
        fee: 1,
      },
      {
        txId: 'tx-2',
        type: 'buy',
        date: makeTimestamp('2026-01-02T00:00:00.000Z'),
        qty: 10,
        price: 120,
        fee: 1,
      },
      {
        txId: 'tx-3',
        type: 'sell',
        date: makeTimestamp('2026-01-03T00:00:00.000Z'),
        qty: 5,
        price: 150,
        fee: 1,
      },
    ]

    const metrics = computePositionMetrics(transactions, 140)

    expect(metrics.quantity).toBeCloseTo(15)
    expect(metrics.avgBuyPrice).toBeCloseTo(110.1)
    expect(metrics.costBasis).toBeCloseTo(1651.5)
    expect(metrics.realizedPnl).toBeCloseTo(198.5)
    expect(metrics.unrealizedPnl).toBeCloseTo(448.5)
    expect(metrics.totalPnl).toBeCloseTo(647)
    expect(metrics.roiPct).toBeGreaterThan(29)
    expect(metrics.currentValue).toBeCloseTo(2100)
  })

  it('shows stale badge when quote is stale', () => {
    const investment = makeInvestment({ stalePrice: true })

    render(
      createElement(PositionRow, {
        investment,
        onAddTransaction: () => undefined,
        onEditAlerts: () => undefined,
        onDelete: () => undefined,
      }),
    )

    expect(screen.getByTestId('stale-badge')).toBeTruthy()
  })

  it('maps chart helpers for line and donut datasets', () => {
    const snapshots: PortfolioSnapshot[] = [
      {
        id: 'snap-2',
        uid: 'user-1',
        timestamp: makeTimestamp('2026-02-02T00:00:00.000Z'),
        totalValue: 1200,
        totalCostBasis: 1000,
        realizedPnl: 50,
        unrealizedPnl: 150,
        totalPnl: 200,
        roiPct: 20,
        byType: { stock: 1000, crypto: 200, etf: 0 },
        createdAt: makeTimestamp('2026-02-02T00:00:00.000Z'),
      },
      {
        id: 'snap-1',
        uid: 'user-1',
        timestamp: makeTimestamp('2026-02-01T00:00:00.000Z'),
        totalValue: 1000,
        totalCostBasis: 950,
        realizedPnl: 20,
        unrealizedPnl: 30,
        totalPnl: 50,
        roiPct: 5,
        byType: { stock: 700, crypto: 300, etf: 0 },
        createdAt: makeTimestamp('2026-02-01T00:00:00.000Z'),
      },
    ]

    const lineData = mapSnapshotsToLineData(snapshots)
    expect(lineData[0].id).toBe('snap-1')
    expect(lineData[1].id).toBe('snap-2')

    const investments = [
      makeInvestment({ id: 'a', type: 'stock', currentValue: 1200, costBasis: 1000 }),
      makeInvestment({ id: 'b', type: 'crypto', currentValue: 300, costBasis: 280 }),
      makeInvestment({ id: 'c', type: 'etf', currentValue: 0, costBasis: 200 }),
    ]

    const donutData = buildDiversificationData(investments)
    expect(donutData).toHaveLength(3)
    expect(donutData[0].key).toBe('stock')
    expect(donutData[0].value).toBe(1200)
    expect(donutData[1].key).toBe('crypto')
    expect(donutData[2].key).toBe('etf')
  })
})
