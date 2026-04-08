import type { Expense } from '@/types/expense'
import {
  EXPENSE_CATEGORY_EMOJIS,
  EXPENSE_CATEGORY_COLORS,
  EXPENSE_CATEGORY_LABELS,
} from '@/types/expense'
import { formatCurrency, formatDate } from '@/utils/formatters'

import styles from './ExpenseCard.module.css'

interface ExpenseCardProps {
  expense: Expense
  onClick?: (expense: Expense) => void
  compact?: boolean
}

function DataOriginSVG({ origin }: { origin: string }) {
  if (origin === 'camera') {
    return (
      <svg className={styles.originIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    )
  }
  if (origin === 'ai') {
    return (
      <svg className={styles.originIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="11" width="18" height="10" rx="2" />
        <circle cx="9" cy="16" r="1" />
        <circle cx="15" cy="16" r="1" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
    )
  }
  return (
    <svg className={styles.originIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

export function ExpenseCard({ expense, onClick, compact = false }: ExpenseCardProps) {
  const color = EXPENSE_CATEGORY_COLORS[expense.category]

  return (
    <div
      className={`${styles.card} ${compact ? styles.compact : ''}`}
      onClick={() => onClick?.(expense)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.(expense)}
      style={{ '--card-accent': color } as React.CSSProperties}
    >
      <div
        className={styles.categoryIcon}
        style={{ background: `${color}18`, color }}
      >
        {EXPENSE_CATEGORY_EMOJIS[expense.category]}
      </div>

      <div className={styles.info}>
        <div className={styles.providerRow}>
          <span className={styles.provider}>{expense.provider}</span>
          <DataOriginSVG origin={expense.dataOrigin} />
        </div>
        <div className={styles.meta}>
          <span className={styles.date}>{formatDate(expense.date)}</span>
          {expense.items.length > 0 && (
            <>
              <span className={styles.dot}>●</span>
              <span className={styles.itemCount}>{expense.items.length} items</span>
            </>
          )}
        </div>
      </div>

      <div className={styles.amountSection}>
        <span className={styles.amount}>
          -{formatCurrency(expense.amount, expense.currency)}
        </span>
        <div className={styles.category}>
          {EXPENSE_CATEGORY_LABELS[expense.category]}
        </div>
      </div>
    </div>
  )
}
