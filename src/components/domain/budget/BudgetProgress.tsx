import type { BudgetStatus } from '@/types/budget'
import { formatCurrency } from '@/utils/formatters'

import styles from './BudgetProgress.module.css'

interface BudgetProgressProps {
  label: string
  spent: number
  limit: number
  pct: number
  status: BudgetStatus
  adjustedLimit?: number
}

export function BudgetProgress({ label, spent, limit, pct, status, adjustedLimit }: BudgetProgressProps) {
  const cappedPct = Math.min(pct, 100)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.label}>{label}</span>
        <span className={`${styles.amounts} ${styles[status]}`}>
          {formatCurrency(spent)} / {formatCurrency(limit)}
        </span>
      </div>

      <div className={styles.track}>
        <div
          className={`${styles.fill} ${styles[status]}`}
          style={{ width: `${cappedPct}%` }}
        />
        {/* 80% threshold marker */}
        <div className={styles.marker} style={{ left: '80%' }} />
      </div>

      <div className={styles.footer}>
        <span className={`${styles.pct} ${styles[status]}`}>
          {pct.toFixed(0)}%
        </span>
        {adjustedLimit !== undefined && (
          <span className={styles.adjusted}>
            Disponible tras fijos: {formatCurrency(Math.max(0, adjustedLimit - spent))}
          </span>
        )}
      </div>
    </div>
  )
}
