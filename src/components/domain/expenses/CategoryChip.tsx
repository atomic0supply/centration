import type { ExpenseCategory } from '@/types/expense'
import {
  EXPENSE_CATEGORY_LABELS,
  EXPENSE_CATEGORY_EMOJIS,
  EXPENSE_CATEGORY_COLORS,
} from '@/types/expense'

import styles from './CategoryChip.module.css'

interface CategoryChipProps {
  category: ExpenseCategory | 'all'
  active?: boolean
  onClick?: () => void
  size?: 'sm' | 'md'
}

export function CategoryChip({ category, active = false, onClick, size = 'md' }: CategoryChipProps) {
  if (category === 'all') {
    return (
      <button
        className={`${styles.chip} ${styles.chipAll} ${active ? styles.active : ''}`}
        onClick={onClick}
        type="button"
        style={{ fontSize: size === 'sm' ? 11 : 12, padding: size === 'sm' ? '3px 8px' : undefined }}
      >
        Todas
      </button>
    )
  }

  const color = EXPENSE_CATEGORY_COLORS[category]
  const bgColor = `${color}18`
  const borderColor = `${color}40`

  return (
    <button
      className={`${styles.chip} ${active ? styles.active : ''}`}
      onClick={onClick}
      type="button"
      style={{
        background: active ? `${color}25` : bgColor,
        color: active ? color : `${color}cc`,
        borderColor: active ? color : borderColor,
        fontSize: size === 'sm' ? 11 : 12,
        padding: size === 'sm' ? '3px 8px' : undefined,
      }}
    >
      <span className={styles.emoji}>{EXPENSE_CATEGORY_EMOJIS[category]}</span>
      {EXPENSE_CATEGORY_LABELS[category]}
    </button>
  )
}
