/**
 * Tests for Phase 6.1 — Dashboard Bento Grid & Widgets
 * Pattern: file-content assertions (no DOM), matching the project's test convention.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

// ── Helpers ──

function readSrc(rel) {
  return readFileSync(new URL(`../src/${rel}`, import.meta.url), 'utf8')
}

function readTest(rel) {
  return readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8')
}

// ── Dashboard page ──

describe('Dashboard page', () => {
  const src = readSrc('pages/Dashboard.tsx')

  it('imports Reorder from framer-motion for drag-drop', () => {
    assert.ok(src.includes("from 'framer-motion'"), 'Reorder import missing')
    assert.ok(src.includes('Reorder.Group'), 'Reorder.Group usage missing')
    assert.ok(src.includes('Reorder.Item'), 'Reorder.Item usage missing')
  })

  it('defines WIDGET_DEFS with 6 widgets', () => {
    const matches = src.match(/id:\s*'[a-z]+'/g) ?? []
    // At least 6 id entries in widget defs
    assert.ok(matches.length >= 6, `Expected ≥6 widget ids, got ${matches.length}`)
  })

  it('persists config to localStorage', () => {
    assert.ok(src.includes('localStorage'), 'localStorage usage missing')
    assert.ok(src.includes('STORAGE_KEY'), 'STORAGE_KEY constant missing')
    assert.ok(src.includes('saveConfig'), 'saveConfig function missing')
    assert.ok(src.includes('loadConfig'), 'loadConfig function missing')
  })

  it('initialises all required stores', () => {
    assert.ok(src.includes('useExpensesStore'), 'expensesStore init missing')
    assert.ok(src.includes('useSubscriptionsStore'), 'subscriptionsStore init missing')
    assert.ok(src.includes('useInventoryStore'), 'inventoryStore init missing')
    assert.ok(src.includes('useBudgetStore'), 'budgetStore init missing')
    assert.ok(src.includes('useInvestmentsStore'), 'investmentsStore init missing')
    assert.ok(src.includes('useAssetsStore'), 'assetsStore init missing')
  })

  it('renders greeting based on time of day', () => {
    assert.ok(src.includes('Buenos días'), 'Morning greeting missing')
    assert.ok(src.includes('Buenas tardes'), 'Afternoon greeting missing')
    assert.ok(src.includes('Buenas noches'), 'Evening greeting missing')
  })
})

// ── Dashboard CSS ──

describe('Dashboard CSS module', () => {
  const css = readSrc('pages/Dashboard.module.css')

  it('defines bento grid with 12 columns', () => {
    assert.ok(css.includes('repeat(12, 1fr)'), '12-column grid missing')
  })

  it('has responsive breakpoints', () => {
    assert.ok(css.includes('@media (max-width: 960px)'), '960px breakpoint missing')
    assert.ok(css.includes('@media (max-width: 600px)'), '600px mobile breakpoint missing')
  })

  it('has all column-span classes', () => {
    for (const cls of ['w3', 'w4', 'w6', 'w8', 'w12']) {
      assert.ok(css.includes(`.${cls}`), `.${cls} span class missing`)
    }
  })

  it('has edit overlay and visibility chip styles', () => {
    assert.ok(css.includes('.editOverlay'), 'editOverlay class missing')
    assert.ok(css.includes('.visibilityChip'), 'visibilityChip class missing')
    assert.ok(css.includes('.hiddenWidget'), 'hiddenWidget class missing')
  })
})

// ── Widget: NetWorth ──

describe('NetWorthWidget', () => {
  const src = readSrc('components/domain/dashboard/NetWorthWidget.tsx')

  it('connects to investments, assets and userFinance stores', () => {
    assert.ok(src.includes('useInvestmentsStore'), 'investments store missing')
    assert.ok(src.includes('useAssetsStore'), 'assets store missing')
    assert.ok(src.includes('useUserFinanceStore'), 'userFinance store missing')
  })

  it('computes netWorth = investments + assets + cash - debts', () => {
    assert.ok(src.includes('totalValue + assetsValue + liquidCash - debts'), 'netWorth formula missing')
  })
})

// ── Widget: CriticalAlerts ──

describe('CriticalAlertsWidget', () => {
  const src = readSrc('components/domain/dashboard/CriticalAlertsWidget.tsx')

  it('aggregates alerts from 4 sources', () => {
    assert.ok(src.includes('useAssetsStore'), 'assetAlerts source missing')
    assert.ok(src.includes('useInventoryStore'), 'inventoryExpiring source missing')
    assert.ok(src.includes('useSubscriptionsStore'), 'upcomingCharges source missing')
    assert.ok(src.includes('useBudgetStore'), 'budgetAlerts source missing')
  })

  it('sorts alerts by severity (critical → warning → info)', () => {
    assert.ok(src.includes("severity === 'critical'"), 'critical filter missing')
    assert.ok(src.includes("severity === 'warning'"), 'warning filter missing')
    assert.ok(src.includes("severity === 'info'"), 'info filter missing')
    // sorted: [...critical, ...warning, ...info]
    assert.ok(src.includes('...critical'), 'critical spread missing')
    assert.ok(src.includes('...warning'), 'warning spread missing')
    assert.ok(src.includes('...info'), 'info spread missing')
  })

  it('shows empty state when no alerts', () => {
    assert.ok(src.includes('Todo en orden'), 'empty state text missing')
  })
})

// ── Widget: DailyExpenses ──

describe('DailyExpensesWidget', () => {
  const src = readSrc('components/domain/dashboard/DailyExpensesWidget.tsx')

  it('calculates daily average for current month', () => {
    assert.ok(src.includes('daysElapsed'), 'daysElapsed calculation missing')
    assert.ok(src.includes('dailyAvg'), 'dailyAvg variable missing')
  })

  it('renders 7-day sparkline', () => {
    assert.ok(src.includes('sparkData'), 'sparkData array missing')
    assert.ok(src.includes('sparkBar'), 'sparkBar class missing')
  })
})

// ── Widget: MonthlyFlow ──

describe('MonthlyFlowWidget', () => {
  const src = readSrc('components/domain/dashboard/MonthlyFlowWidget.tsx')

  it('imports recharts BarChart', () => {
    assert.ok(src.includes("from 'recharts'"), 'recharts import missing')
    assert.ok(src.includes('BarChart'), 'BarChart usage missing')
  })

  it('builds last 6 months data', () => {
    assert.ok(src.includes('for (let i = 5; i >= 0; i--)'), '6-month loop missing')
  })
})

// ── Widget: Investments ──

describe('InvestmentsWidget', () => {
  const src = readSrc('components/domain/dashboard/InvestmentsWidget.tsx')

  it('shows totals from investmentsStore', () => {
    assert.ok(src.includes('totals()'), 'totals() call missing')
    assert.ok(src.includes('totalPnl'), 'totalPnl missing')
    assert.ok(src.includes('roiPct'), 'roiPct missing')
  })

  it('renders LineChart from lineSeries', () => {
    assert.ok(src.includes('lineSeries'), 'lineSeries missing')
    assert.ok(src.includes('LineChart'), 'LineChart missing')
  })
})

// ── Shared widget styles ──

describe('Widget shared CSS (widgets.module.css)', () => {
  const css = readSrc('components/domain/dashboard/widgets.module.css')

  it('defines .widget, .header, .title, .bigValue', () => {
    for (const cls of ['.widget', '.header', '.title', '.bigValue']) {
      assert.ok(css.includes(cls), `${cls} class missing`)
    }
  })

  it('has alert row severity classes', () => {
    for (const cls of ['.critical', '.warning', '.info']) {
      assert.ok(css.includes(cls), `${cls} alert class missing`)
    }
  })

  it('has sparkline classes', () => {
    assert.ok(css.includes('.sparkline'), '.sparkline missing')
    assert.ok(css.includes('.sparkBar'), '.sparkBar missing')
  })
})
