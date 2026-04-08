/**
 * 4.1.9 – Inventory Tests
 * Run with: npm run test:voice (vitest)
 */

import { describe, it, expect } from 'vitest'
import { Timestamp } from 'firebase/firestore'

import {
  getExpiryStatus,
  getDaysUntilExpiry,
  getStockStatus,
  getStockRingColor,
  DEFAULT_INVENTORY_FILTERS,
  type InventoryItem,
} from '../types/inventory'

/* ── Helpers ── */

function makeItem(overrides: Partial<InventoryItem> = {}): InventoryItem {
  const now = Timestamp.now()
  return {
    id: 'test-1',
    uid: 'user-1',
    name: 'Leche',
    normalizedName: 'leche',
    qty: 3,
    unit: 'l',
    category: 'food',
    minimumQty: 2,
    lastPrice: 1.2,
    priceHistory: [],
    lastPurchased: now,
    expiryDate: null,
    dataOrigin: 'manual',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function tsFromDaysOffset(days: number): Timestamp {
  const d = new Date(Date.now() + days * 86_400_000)
  return Timestamp.fromDate(d)
}

/* ══════════════════════════════════════════
   4.1.5 – Expiry Status
══════════════════════════════════════════ */

describe('getExpiryStatus', () => {
  it('returns null when expiryDate is null', () => {
    expect(getExpiryStatus(null)).toBeNull()
  })

  it('returns "expired" when date is in the past', () => {
    expect(getExpiryStatus(tsFromDaysOffset(-1))).toBe('expired')
  })

  it('returns "critical" for 0-3 days remaining', () => {
    expect(getExpiryStatus(tsFromDaysOffset(0))).toBe('critical')
    expect(getExpiryStatus(tsFromDaysOffset(1))).toBe('critical')
    expect(getExpiryStatus(tsFromDaysOffset(3))).toBe('critical')
  })

  it('returns "warning" for 4-7 days remaining', () => {
    expect(getExpiryStatus(tsFromDaysOffset(4))).toBe('warning')
    expect(getExpiryStatus(tsFromDaysOffset(7))).toBe('warning')
  })

  it('returns "ok" for more than 7 days remaining', () => {
    expect(getExpiryStatus(tsFromDaysOffset(8))).toBe('ok')
    expect(getExpiryStatus(tsFromDaysOffset(30))).toBe('ok')
  })
})

describe('getDaysUntilExpiry', () => {
  it('returns null when expiryDate is null', () => {
    expect(getDaysUntilExpiry(null)).toBeNull()
  })

  it('returns positive number for future dates', () => {
    const days = getDaysUntilExpiry(tsFromDaysOffset(5))
    expect(days).toBeGreaterThan(0)
    expect(days).toBeLessThanOrEqual(6)
  })

  it('returns negative number for past dates', () => {
    const days = getDaysUntilExpiry(tsFromDaysOffset(-3))
    expect(days).toBeLessThan(0)
  })
})

/* ══════════════════════════════════════════
   4.1.2 – Stock Status
══════════════════════════════════════════ */

describe('getStockStatus', () => {
  it('returns "empty" when qty is 0', () => {
    expect(getStockStatus(makeItem({ qty: 0 }))).toBe('empty')
  })

  it('returns "low" when qty equals minimumQty', () => {
    expect(getStockStatus(makeItem({ qty: 2, minimumQty: 2 }))).toBe('low')
  })

  it('returns "low" when qty is below minimumQty', () => {
    expect(getStockStatus(makeItem({ qty: 1, minimumQty: 2 }))).toBe('low')
  })

  it('returns "ok" when qty is above minimumQty', () => {
    expect(getStockStatus(makeItem({ qty: 5, minimumQty: 2 }))).toBe('ok')
  })
})

describe('getStockRingColor', () => {
  it('returns green for ≥100%', () => {
    expect(getStockRingColor(100)).toBe('#4ade80')
    expect(getStockRingColor(150)).toBe('#4ade80')
  })

  it('returns yellow for 40-99%', () => {
    expect(getStockRingColor(40)).toBe('#fbbf24')
    expect(getStockRingColor(80)).toBe('#fbbf24')
    expect(getStockRingColor(99)).toBe('#fbbf24')
  })

  it('returns red for <40%', () => {
    expect(getStockRingColor(0)).toBe('#f87171')
    expect(getStockRingColor(39)).toBe('#f87171')
  })
})

/* ══════════════════════════════════════════
   4.1.1 – Default filters
══════════════════════════════════════════ */

describe('DEFAULT_INVENTORY_FILTERS', () => {
  it('has expected default values', () => {
    expect(DEFAULT_INVENTORY_FILTERS.search).toBe('')
    expect(DEFAULT_INVENTORY_FILTERS.category).toBe('all')
    expect(DEFAULT_INVENTORY_FILTERS.status).toBe('all')
    expect(DEFAULT_INVENTORY_FILTERS.sortBy).toBe('name')
  })
})

/* ══════════════════════════════════════════
   4.1.8 – Shopping list logic
   (pure filter, no store needed)
══════════════════════════════════════════ */

describe('Shopping list logic (qty <= minimumQty)', () => {
  const items: InventoryItem[] = [
    makeItem({ id: '1', name: 'Leche', qty: 3, minimumQty: 2 }),     // ok
    makeItem({ id: '2', name: 'Pan', qty: 1, minimumQty: 2 }),       // low
    makeItem({ id: '3', name: 'Café', qty: 0, minimumQty: 1 }),      // empty = low
    makeItem({ id: '4', name: 'Aceite', qty: 2, minimumQty: 2 }),    // equal = low
  ]

  it('correctly identifies items needing restock', () => {
    const needsRestock = items.filter((i) => i.qty <= i.minimumQty)
    expect(needsRestock).toHaveLength(3)
    expect(needsRestock.map((i) => i.name)).toContain('Pan')
    expect(needsRestock.map((i) => i.name)).toContain('Café')
    expect(needsRestock.map((i) => i.name)).toContain('Aceite')
    expect(needsRestock.map((i) => i.name)).not.toContain('Leche')
  })
})

/* ══════════════════════════════════════════
   4.1.7 – Inflation calc (pure)
══════════════════════════════════════════ */

describe('Inflation monitor calculation', () => {
  function calcInflationPure(
    history: Array<{ price: number; date: Date }>,
  ): { deltaPct: number } | null {
    const now = Date.now()
    const t30 = now - 30 * 86_400_000
    const t60 = now - 60 * 86_400_000

    const recent = history.filter((e) => e.date.getTime() >= t30)
    const previous = history.filter((e) => e.date.getTime() >= t60 && e.date.getTime() < t30)

    if (recent.length === 0 || previous.length === 0) return null

    const avgRecent = recent.reduce((s, e) => s + e.price, 0) / recent.length
    const avgPrevious = previous.reduce((s, e) => s + e.price, 0) / previous.length
    const deltaPct = ((avgRecent - avgPrevious) / avgPrevious) * 100

    return { deltaPct }
  }

  it('returns null when no entries in one period', () => {
    const history = [{ price: 1.2, date: new Date(Date.now() - 10 * 86_400_000) }]
    expect(calcInflationPure(history)).toBeNull()
  })

  it('detects price increase', () => {
    const oldDate = new Date(Date.now() - 45 * 86_400_000)
    const newDate = new Date(Date.now() - 5 * 86_400_000)
    const result = calcInflationPure([
      { price: 1.0, date: oldDate },
      { price: 1.5, date: newDate },
    ])
    expect(result).not.toBeNull()
    expect(result!.deltaPct).toBeGreaterThan(0)
  })

  it('detects price decrease', () => {
    const oldDate = new Date(Date.now() - 45 * 86_400_000)
    const newDate = new Date(Date.now() - 5 * 86_400_000)
    const result = calcInflationPure([
      { price: 2.0, date: oldDate },
      { price: 1.0, date: newDate },
    ])
    expect(result).not.toBeNull()
    expect(result!.deltaPct).toBeLessThan(0)
  })
})
