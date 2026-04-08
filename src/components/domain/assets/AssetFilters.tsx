import type { ChangeEvent } from 'react'

import { Input } from '@/components/ui'
import { ASSET_FILTER_OPTIONS, type AssetFiltersState } from '@/stores/assetsStore'

import styles from './Assets.module.css'

interface AssetFiltersProps {
  filters: AssetFiltersState
  onFilterChange: (updates: Partial<AssetFiltersState>) => void
  onReset: () => void
}

const SORT_OPTIONS: { value: AssetFiltersState['sortBy']; label: string }[] = [
  { value: 'name', label: 'Nombre A-Z' },
  { value: 'purchaseDate', label: 'Compra reciente' },
  { value: 'value', label: 'Valor actual' },
]

export function AssetFilters({ filters, onFilterChange, onReset }: AssetFiltersProps) {
  const hasActive =
    filters.search !== '' ||
    filters.type !== 'all' ||
    filters.sortBy !== 'name'

  function handleSearch(event: ChangeEvent<HTMLInputElement>) {
    onFilterChange({ search: event.target.value })
  }

  function handleTypeChange(event: ChangeEvent<HTMLSelectElement>) {
    onFilterChange({ type: event.target.value as AssetFiltersState['type'] })
  }

  function handleSortChange(event: ChangeEvent<HTMLSelectElement>) {
    onFilterChange({ sortBy: event.target.value as AssetFiltersState['sortBy'] })
  }

  function handleReset() {
    onReset()
  }

  return (
    <div className={styles.filterCard}>
      <div className={styles.filterRow}>
        <Input
          label="Buscar"
          placeholder="Buscar por nombre, matrícula, dirección..."
          value={filters.search}
          onChange={handleSearch}
          iconLeft={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          }
        />

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Tipo</label>
          <select
            className={styles.select}
            value={filters.type}
            onChange={handleTypeChange}
          >
            {ASSET_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Orden</label>
          <select
            className={styles.select}
            value={filters.sortBy}
            onChange={handleSortChange}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          {hasActive && (
            <button className={styles.select} onClick={handleReset} type="button" style={{ width: 'auto', paddingInline: 16, cursor: 'pointer' }}>
              Limpiar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
