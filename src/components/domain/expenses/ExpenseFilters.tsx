import { useState } from 'react'

import { Input } from '@/components/ui'
import type { ExpenseCategory, ExpenseFiltersState } from '@/types/expense'

import { CategoryChip } from './CategoryChip'
import styles from './ExpenseFilters.module.css'

const ALL_CATEGORIES: ExpenseCategory[] = ['food', 'tech', 'health', 'leisure', 'transport', 'home', 'other']

interface ExpenseFiltersProps {
  filters: ExpenseFiltersState
  onFilterChange: (updates: Partial<ExpenseFiltersState>) => void
  onReset: () => void
  providers: string[]
}

export function ExpenseFilters({ filters, onFilterChange, onReset, providers }: ExpenseFiltersProps) {
  const [expanded, setExpanded] = useState(false)

  const hasActiveFilters =
    filters.category !== 'all' ||
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.provider !== '' ||
    filters.search !== ''

  return (
    <div className={styles.filters}>
      <div className={styles.searchRow}>
        <div className={styles.searchField}>
          <Input
            placeholder="Buscar gastos..."
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            iconLeft={
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            }
          />
        </div>
        <button
          className={`${styles.toggleBtn} ${expanded ? styles.active : ''}`}
          onClick={() => setExpanded(!expanded)}
          title="Filtros avanzados"
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="21" x2="4" y2="14" />
            <line x1="4" y1="10" x2="4" y2="3" />
            <line x1="12" y1="21" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12" y2="3" />
            <line x1="20" y1="21" x2="20" y2="16" />
            <line x1="20" y1="12" x2="20" y2="3" />
            <line x1="1" y1="14" x2="7" y2="14" />
            <line x1="9" y1="8" x2="15" y2="8" />
            <line x1="17" y1="16" x2="23" y2="16" />
          </svg>
        </button>
      </div>

      {/* Category chips */}
      <div className={styles.categories}>
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

      {/* Expanded filters */}
      {expanded && (
        <div className={styles.expandedFilters}>
          <div>
            <label>Desde</label>
            <input
              type="date"
              className={styles.filterInput}
              value={filters.dateFrom}
              onChange={(e) => onFilterChange({ dateFrom: e.target.value })}
            />
          </div>
          <div>
            <label>Hasta</label>
            <input
              type="date"
              className={styles.filterInput}
              value={filters.dateTo}
              onChange={(e) => onFilterChange({ dateTo: e.target.value })}
            />
          </div>
          <div>
            <label>Proveedor</label>
            <select
              className={styles.filterSelect}
              value={filters.provider}
              onChange={(e) => onFilterChange({ provider: e.target.value })}
            >
              <option value="">Todos</option>
              {providers.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Ordenar</label>
            <select
              className={styles.filterSelect}
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-') as ['date' | 'amount', 'asc' | 'desc']
                onFilterChange({ sortBy, sortOrder })
              }}
            >
              <option value="date-desc">Más recientes</option>
              <option value="date-asc">Más antiguos</option>
              <option value="amount-desc">Mayor importe</option>
              <option value="amount-asc">Menor importe</option>
            </select>
          </div>

          {hasActiveFilters && (
            <div className={styles.filterActions}>
              <button className={styles.clearBtn} onClick={onReset} type="button">
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
