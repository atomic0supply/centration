import { create } from 'zustand'

import { subscribeBudget } from '@/services/budgetService'
import type { Budget, BudgetProgressData, BudgetStatus } from '@/types/budget'
import type { ExpenseCategory } from '@/types/expense'
import { toDate } from '@/utils/formatters'

import { useExpensesStore } from './expensesStore'
import { useSubscriptionsStore } from './subscriptionsStore'

interface BudgetState {
  budget: Budget | null
  loading: boolean
  error: string | null

  /* Actions */
  init: () => () => void

  /* Computed */
  spentByCategory: () => Partial<Record<ExpenseCategory, number>>
  adjustedGlobal: () => number | null
  globalProgress: () => BudgetProgressData | null
  categoryProgress: (cat: ExpenseCategory) => BudgetProgressData | null
  activeAlerts: () => Array<{ type: 'global' | ExpenseCategory; threshold: 80 | 100 }>
}

function statusFromPct(pct: number): BudgetStatus {
  if (pct >= 100) return 'exceeded'
  if (pct >= 80) return 'warning'
  return 'ok'
}

export const useBudgetStore = create<BudgetState>((set, get) => ({
  budget: null,
  loading: true,
  error: null,

  init: () => {
    set({ loading: true, error: null })
    const unsub = subscribeBudget(
      (budget) => set({ budget, loading: false, error: null }),
      (err) => set({ error: err.message, loading: false }),
    )
    return unsub
  },

  spentByCategory: () => {
    const expenses = useExpensesStore.getState().expenses
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()

    const result: Partial<Record<ExpenseCategory, number>> = {}
    for (const e of expenses) {
      const d = toDate(e.date)
      if (d.getFullYear() !== year || d.getMonth() !== month) continue
      result[e.category] = (result[e.category] ?? 0) + e.amount
    }
    return result
  },

  adjustedGlobal: () => {
    const { budget } = get()
    if (!budget || !budget.global) return null
    const fixedCosts = useSubscriptionsStore.getState().totalMonthlyCost()
    return budget.global - fixedCosts
  },

  globalProgress: () => {
    const { budget } = get()
    if (!budget || !budget.global) return null
    const spent = useExpensesStore.getState().totalThisMonth()
    const limit = budget.global
    const pct = limit > 0 ? (spent / limit) * 100 : 0
    const adjusted = get().adjustedGlobal()
    return {
      spent,
      limit,
      pct,
      status: statusFromPct(pct),
      adjustedLimit: adjusted ?? undefined,
    }
  },

  categoryProgress: (cat: ExpenseCategory) => {
    const { budget } = get()
    if (!budget) return null
    const limit = budget.byCategory[cat]
    if (!limit) return null
    const spent = get().spentByCategory()[cat] ?? 0
    const pct = limit > 0 ? (spent / limit) * 100 : 0
    return { spent, limit, pct, status: statusFromPct(pct) }
  },

  activeAlerts: () => {
    const { budget } = get()
    if (!budget) return []

    const alerts: Array<{ type: 'global' | ExpenseCategory; threshold: 80 | 100 }> = []

    const gp = get().globalProgress()
    if (gp) {
      if (gp.pct >= 100) alerts.push({ type: 'global', threshold: 100 })
      else if (gp.pct >= 80) alerts.push({ type: 'global', threshold: 80 })
    }

    const spent = get().spentByCategory()
    for (const [cat, limit] of Object.entries(budget.byCategory)) {
      if (!limit) continue
      const s = spent[cat as ExpenseCategory] ?? 0
      const pct = (s / limit) * 100
      if (pct >= 100) alerts.push({ type: cat as ExpenseCategory, threshold: 100 })
      else if (pct >= 80) alerts.push({ type: cat as ExpenseCategory, threshold: 80 })
    }

    return alerts
  },
}))
