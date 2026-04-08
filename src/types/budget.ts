import type { Timestamp } from 'firebase/firestore'

import type { ExpenseCategory } from './expense'

export interface Budget {
  uid: string
  global: number
  byCategory: Partial<Record<ExpenseCategory, number>>
  updatedAt: Timestamp
}

export type BudgetStatus = 'ok' | 'warning' | 'exceeded'

export interface BudgetProgressData {
  spent: number
  limit: number
  pct: number
  status: BudgetStatus
  adjustedLimit?: number
}
