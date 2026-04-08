import type { ChangeEvent } from 'react'

import { Input } from '@/components/ui'
import { type PhysicalAsset, VAULT_CATEGORY_OPTIONS, type VaultFiltersState } from '@/stores/assetsStore'

import styles from './Assets.module.css'

interface VaultFiltersProps {
  filters: VaultFiltersState
  assets: PhysicalAsset[]
  onFilterChange: (updates: Partial<VaultFiltersState>) => void
  onReset: () => void
}

export function VaultFilters({ filters, assets, onFilterChange, onReset }: VaultFiltersProps) {
  const hasActive =
    filters.search !== '' ||
    filters.category !== 'all' ||
    filters.assetId !== 'all'

  function handleSearch(event: ChangeEvent<HTMLInputElement>) {
    onFilterChange({ search: event.target.value })
  }

  function handleCategoryChange(event: ChangeEvent<HTMLSelectElement>) {
    onFilterChange({ category: event.target.value as VaultFiltersState['category'] })
  }

  function handleAssetChange(event: ChangeEvent<HTMLSelectElement>) {
    onFilterChange({ assetId: event.target.value })
  }

  function handleReset() {
    onReset()
  }

  return (
    <div className={styles.filterCard}>
      <div className={`${styles.filterRow} ${styles.filterRowVault}`}>
        <Input
          label="Buscar"
          placeholder="Buscar documento, ruta o activo..."
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
          <label className={styles.fieldLabel}>Categoría</label>
          <select
            className={styles.select}
            value={filters.category}
            onChange={handleCategoryChange}
          >
            {VAULT_CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Activo vinculado</label>
          <select
            className={styles.select}
            value={filters.assetId}
            onChange={handleAssetChange}
          >
            <option value="all">Todos</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
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
