import { CategoryChip } from '@/components/domain/expenses/CategoryChip'
import { Input } from '@/components/ui'
import type { ExpenseCategory } from '@/types/expense'
import {
  type InventoryFiltersState,
  type InventoryStatusFilter,
  type InventorySortBy,
} from '@/types/inventory'

import styles from './InventoryFilters.module.css'

const ALL_CATEGORIES: ExpenseCategory[] = ['food', 'tech', 'health', 'leisure', 'transport', 'home', 'other']

interface InventoryFiltersProps {
  filters: InventoryFiltersState
  onFilterChange: (updates: Partial<InventoryFiltersState>) => void
  onReset: () => void
}

const STATUS_OPTIONS: { value: InventoryStatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'low_stock', label: '⚠ Stock bajo' },
  { value: 'expiring_soon', label: '⏱ Próxima caducidad' },
]

const SORT_OPTIONS: { value: InventorySortBy; label: string }[] = [
  { value: 'name', label: 'Nombre A-Z' },
  { value: 'qty_asc', label: 'Stock ↑' },
  { value: 'qty_desc', label: 'Stock ↓' },
  { value: 'expiry', label: 'Caducidad' },
]

export function InventoryFilters({ filters, onFilterChange, onReset }: InventoryFiltersProps) {
  const hasActive =
    filters.search !== '' ||
    filters.category !== 'all' ||
    filters.status !== 'all' ||
    filters.sortBy !== 'name'

  return (
    <div className={styles.container}>
      {/* Search row */}
      <div className={styles.searchRow}>
        <Input
          placeholder="Buscar producto..."
          value={filters.search}
          onChange={(e) => onFilterChange({ search: e.target.value })}
          iconLeft={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          }
        />
        <div className={styles.controls}>
          <select
            className={styles.select}
            value={filters.status}
            onChange={(e) => onFilterChange({ status: e.target.value as InventoryStatusFilter })}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            className={styles.select}
            value={filters.sortBy}
            onChange={(e) => onFilterChange({ sortBy: e.target.value as InventorySortBy })}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {hasActive && (
            <button className={styles.resetBtn} onClick={onReset} type="button">
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Category chips */}
      <div className={styles.chips}>
        <CategoryChip
          category="all"
          active={filters.category === 'all'}
          onClick={() => onFilterChange({ category: 'all' })}
          size="sm"
        />
        {ALL_CATEGORIES.map((cat) => (
          <CategoryChip
            key={cat}
            category={cat}
            active={filters.category === cat}
            onClick={() => onFilterChange({ category: cat })}
            size="sm"
          />
        ))}
      </div>
    </div>
  )
}
