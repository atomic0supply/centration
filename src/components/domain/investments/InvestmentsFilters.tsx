import { Input } from '@/components/ui'
import type { InvestmentFiltersState, InvestmentType } from '@/types/investment'

import styles from './InvestmentsFilters.module.css'

interface InvestmentsFiltersProps {
  filters: InvestmentFiltersState
  onChange: (updates: Partial<InvestmentFiltersState>) => void
  onReset: () => void
}

export function InvestmentsFilters({ filters, onChange, onReset }: InvestmentsFiltersProps) {
  return (
    <div className={styles.filters}>
      <Input
        label="Buscar"
        placeholder="Símbolo o mercado..."
        value={filters.search}
        onChange={(e) => { onChange({ search: e.target.value }); }}
      />

      <label className={styles.field}>
        <span>Tipo</span>
        <select
          value={filters.type}
          onChange={(e) => { onChange({ type: e.target.value as InvestmentType | 'all' }); }}
        >
          <option value="all">Todos</option>
          <option value="crypto">Crypto</option>
          <option value="stock">Acciones</option>
          <option value="etf">ETF</option>
        </select>
      </label>

      <Input
        label="Mercado"
        placeholder="US, BINANCE..."
        value={filters.market}
        onChange={(e) => { onChange({ market: e.target.value }); }}
      />

      <label className={styles.field}>
        <span>Ordenar por</span>
        <select
          value={filters.sortBy}
          onChange={(e) =>
            { onChange({
              sortBy: e.target.value as 'value' | 'roi' | 'pnl' | 'updated',
            }); }
          }
        >
          <option value="value">Valor</option>
          <option value="roi">ROI</option>
          <option value="pnl">P&L</option>
          <option value="updated">Actualizado</option>
        </select>
      </label>

      <button className={styles.reset} onClick={onReset} type="button">
        Reset
      </button>
    </div>
  )
}
