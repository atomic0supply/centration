import { create } from 'zustand'

import type { UserFinance } from '@/services/userFinanceService'
import {
  DEFAULT_USER_FINANCE,
  getUserFinance,
  saveUserFinance,
} from '@/services/userFinanceService'

interface UserFinanceState {
  liquidCash: number
  debts: number
  loading: boolean
  saving: boolean
  error: string | null
  init: () => Promise<void>
  save: (input: UserFinance) => Promise<void>
}

export const useUserFinanceStore = create<UserFinanceState>((set) => ({
  liquidCash: DEFAULT_USER_FINANCE.liquidCash,
  debts: DEFAULT_USER_FINANCE.debts,
  loading: false,
  saving: false,
  error: null,

  init: async () => {
    set({ loading: true, error: null })
    try {
      const data = await getUserFinance()
      set({
        liquidCash: data.liquidCash,
        debts: data.debts,
        loading: false,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar finanzas'
      set({ loading: false, error: message })
    }
  },

  save: async (input) => {
    set({ saving: true, error: null })
    try {
      const saved = await saveUserFinance(input)
      set({
        liquidCash: saved.liquidCash,
        debts: saved.debts,
        saving: false,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar finanzas'
      set({ saving: false, error: message })
      throw err
    }
  },
}))
