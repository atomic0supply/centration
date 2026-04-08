import { create } from 'zustand'

import type { Subscription } from '@/types/expense'
import { subscribeSubscriptions, getMonthlyAmount, getYearlyAmount } from '@/services/subscriptionService'
import { toDate } from '@/utils/formatters'

interface SubscriptionsState {
  subscriptions: Subscription[]
  loading: boolean
  error: string | null

  /* Actions */
  init: () => () => void

  /* Computed */
  activeSubscriptions: () => Subscription[]
  totalMonthlyCost: () => number
  totalYearlyCost: () => number
  upcomingCharges: (days?: number) => Subscription[]
  chargesByMonth: () => Map<string, Subscription[]>
}

export const useSubscriptionsStore = create<SubscriptionsState>((set, get) => ({
  subscriptions: [],
  loading: true,
  error: null,

  init: () => {
    set({ loading: true, error: null })
    const unsub = subscribeSubscriptions(
      (subscriptions) => {
        set({ subscriptions, loading: false, error: null })
      },
      (err) => {
        set({ error: err.message, loading: false })
      },
    )
    return unsub
  },

  activeSubscriptions: () => {
    return get().subscriptions.filter((s) => s.status !== 'cancelled')
  },

  totalMonthlyCost: () => {
    return get()
      .activeSubscriptions()
      .reduce((sum, s) => sum + getMonthlyAmount(s), 0)
  },

  totalYearlyCost: () => {
    return get()
      .activeSubscriptions()
      .reduce((sum, s) => sum + getYearlyAmount(s), 0)
  },

  upcomingCharges: (days = 30) => {
    const now = new Date()
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + days)

    return get()
      .activeSubscriptions()
      .filter((s) => {
        const d = toDate(s.nextPaymentDate)
        return d >= now && d <= cutoff
      })
      .sort((a, b) => toDate(a.nextPaymentDate).getTime() - toDate(b.nextPaymentDate).getTime())
  },

  chargesByMonth: () => {
    const map = new Map<string, Subscription[]>()
    const active = get().activeSubscriptions()

    for (const sub of active) {
      const d = toDate(sub.nextPaymentDate)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const arr = map.get(key) ?? []
      arr.push(sub)
      map.set(key, arr)
    }

    return map
  },
}))
