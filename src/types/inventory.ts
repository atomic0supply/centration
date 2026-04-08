import type { Timestamp } from 'firebase/firestore'

import type { ExpenseCategory } from './expense'

/* ── Units ── */
export type InventoryUnit = 'ud' | 'kg' | 'g' | 'l' | 'ml'

export const INVENTORY_UNIT_LABELS: Record<InventoryUnit, string> = {
  ud: 'Unidades',
  kg: 'Kilogramos',
  g: 'Gramos',
  l: 'Litros',
  ml: 'Mililitros',
}

export const INVENTORY_UNIT_SHORT: Record<InventoryUnit, string> = {
  ud: 'ud',
  kg: 'kg',
  g: 'g',
  l: 'L',
  ml: 'ml',
}

/* ── Price history ── */
export interface PriceHistoryEntry {
  price: number
  date: Timestamp
  provider: string
}

/* ── Main inventory item ── */
export interface InventoryItem {
  id: string
  uid: string
  name: string
  normalizedName: string
  qty: number
  unit: InventoryUnit
  category: ExpenseCategory
  minimumQty: number
  lastPrice: number | null
  priceHistory: PriceHistoryEntry[]
  lastPurchased: Timestamp | null
  expiryDate: Timestamp | null
  dataOrigin: 'voice' | 'camera' | 'manual'
  createdAt: Timestamp
  updatedAt: Timestamp
}

/* ── Expiry status ── */
export type ExpiryStatus = 'ok' | 'warning' | 'critical' | 'expired'

export function getExpiryStatus(expiryDate: Timestamp | null): ExpiryStatus | null {
  if (!expiryDate) return null
  const now = Date.now()
  const expMs = expiryDate.toMillis()
  const daysLeft = (expMs - now) / 86_400_000

  if (daysLeft < 0) return 'expired'
  if (daysLeft <= 3) return 'critical'
  if (daysLeft <= 7) return 'warning'
  return 'ok'
}

export function getDaysUntilExpiry(expiryDate: Timestamp | null): number | null {
  if (!expiryDate) return null
  const days = (expiryDate.toMillis() - Date.now()) / 86_400_000
  return Math.ceil(days)
}

/* ── Stock status ── */
export type StockStatus = 'ok' | 'low' | 'empty'

export function getStockStatus(item: InventoryItem): StockStatus {
  if (item.qty <= 0) return 'empty'
  if (item.qty <= item.minimumQty) return 'low'
  return 'ok'
}

export function getStockRingColor(stockPct: number): string {
  if (stockPct >= 100) return '#4ade80'
  if (stockPct >= 40) return '#fbbf24'
  return '#f87171'
}

/* ── Filters ── */
export type InventoryStatusFilter = 'all' | 'low_stock' | 'expiring_soon'
export type InventorySortBy = 'name' | 'qty_asc' | 'qty_desc' | 'expiry'

export interface InventoryFiltersState {
  search: string
  category: ExpenseCategory | 'all'
  status: InventoryStatusFilter
  sortBy: InventorySortBy
}

export const DEFAULT_INVENTORY_FILTERS: InventoryFiltersState = {
  search: '',
  category: 'all',
  status: 'all',
  sortBy: 'name',
}
