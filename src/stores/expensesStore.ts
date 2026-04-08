import { create } from 'zustand'

import type { Expense, ExpenseFiltersState } from '@/types/expense'
import { DEFAULT_EXPENSE_FILTERS } from '@/types/expense'
import { subscribeExpenses } from '@/services/expenseService'
import { toDate } from '@/utils/formatters'

interface ExpensesState {
  expenses: Expense[]
  loading: boolean
  error: string | null
  filters: ExpenseFiltersState

  /* Actions */
  init: () => () => void
  setFilters: (filters: Partial<ExpenseFiltersState>) => void
  resetFilters: () => void

  /* Computed (derived) */
  filteredExpenses: () => Expense[]
  totalThisMonth: () => number
  uniqueProviders: () => string[]
}

export const useExpensesStore = create<ExpensesState>((set, get) => ({
  expenses: [],
  loading: true,
  error: null,
  filters: { ...DEFAULT_EXPENSE_FILTERS },

  init: () => {
    set({ loading: true, error: null })
    const unsub = subscribeExpenses(
      (expenses) => {
        set({ expenses, loading: false, error: null })
      },
      (err) => {
        set({ error: err.message, loading: false })
      },
    )
    return unsub
  },

  setFilters: (updates) => {
    set((state) => ({
      filters: { ...state.filters, ...updates },
    }))
  },

  resetFilters: () => {
    set({ filters: { ...DEFAULT_EXPENSE_FILTERS } })
  },

  filteredExpenses: () => {
    const { expenses, filters } = get()

    let result = [...expenses]

    // Search filter
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (e) =>
          e.provider.toLowerCase().includes(q) ||
          e.notes.toLowerCase().includes(q) ||
          e.items.some((i) => i.name.toLowerCase().includes(q)),
      )
    }

    // Category filter
    if (filters.category !== 'all') {
      result = result.filter((e) => e.category === filters.category)
    }

    // Provider filter
    if (filters.provider) {
      result = result.filter((e) => e.provider === filters.provider)
    }

    // Date range filters
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom)
      from.setHours(0, 0, 0, 0)
      result = result.filter((e) => toDate(e.date) >= from)
    }

    if (filters.dateTo) {
      const to = new Date(filters.dateTo)
      to.setHours(23, 59, 59, 999)
      result = result.filter((e) => toDate(e.date) <= to)
    }

    // Sort
    result.sort((a, b) => {
      let cmp: number
      if (filters.sortBy === 'amount') {
        cmp = a.amount - b.amount
      } else {
        cmp = toDate(a.date).getTime() - toDate(b.date).getTime()
      }
      return filters.sortOrder === 'desc' ? -cmp : cmp
    })

    return result
  },

  totalThisMonth: () => {
    const { expenses } = get()
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()

    return expenses
      .filter((e) => {
        const d = toDate(e.date)
        return d.getFullYear() === year && d.getMonth() === month
      })
      .reduce((sum, e) => sum + e.amount, 0)
  },

  uniqueProviders: () => {
    const { expenses } = get()
    const set = new Set(expenses.map((e) => e.provider))
    return Array.from(set).sort()
  },
}))
