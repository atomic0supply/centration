import type { Timestamp } from 'firebase/firestore'

/* ── Expense Categories ── */
export type ExpenseCategory =
  | 'food'
  | 'tech'
  | 'health'
  | 'leisure'
  | 'transport'
  | 'home'
  | 'other'

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  food: 'Alimentación',
  tech: 'Tecnología',
  health: 'Salud',
  leisure: 'Ocio',
  transport: 'Transporte',
  home: 'Hogar',
  other: 'Otros',
}

export const EXPENSE_CATEGORY_EMOJIS: Record<ExpenseCategory, string> = {
  food: '🛒',
  tech: '💻',
  health: '💊',
  leisure: '🎬',
  transport: '🚗',
  home: '🏠',
  other: '📦',
}

export const EXPENSE_CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  food: '#4ade80',
  tech: '#818cf8',
  health: '#f472b6',
  leisure: '#fb923c',
  transport: '#22d3ee',
  home: '#a78bfa',
  other: '#94a3b8',
}

export type DataOrigin = 'camera' | 'ai' | 'manual'
export type BillingCycle = 'monthly' | 'yearly' | 'once'

export interface ExpenseItem {
  name: string
  qty: number
  price: number
  unit: string
}

export interface Expense {
  id: string
  uid: string
  amount: number
  currency: string
  date: Timestamp
  category: ExpenseCategory
  provider: string
  isSubscription: boolean
  billingCycle: BillingCycle
  ticketRef: string | null
  items: ExpenseItem[]
  dataOrigin: DataOrigin
  potentialAsset: boolean
  notes: string
  createdAt: Timestamp
}

/* ── Subscription Types ── */
export type SubscriptionCategory =
  | 'streaming'
  | 'saas'
  | 'gym'
  | 'insurance'
  | 'other'

export const SUBSCRIPTION_CATEGORY_LABELS: Record<SubscriptionCategory, string> = {
  streaming: 'Streaming',
  saas: 'Software',
  gym: 'Deporte',
  insurance: 'Seguros',
  other: 'Otros',
}

export const SUBSCRIPTION_CATEGORY_EMOJIS: Record<SubscriptionCategory, string> = {
  streaming: '🎬',
  saas: '💻',
  gym: '🏋️',
  insurance: '🛡️',
  other: '📦',
}

export const SUBSCRIPTION_CATEGORY_COLORS: Record<SubscriptionCategory, string> = {
  streaming: '#f472b6',
  saas: '#818cf8',
  gym: '#4ade80',
  insurance: '#fb923c',
  other: '#94a3b8',
}

export type SubscriptionStatus = 'active' | 'trial' | 'cancelled'

export interface Subscription {
  id: string
  uid: string
  name: string
  logo: string | null
  amount: number
  currency: string
  billingCycle: 'monthly' | 'yearly'
  nextPaymentDate: Timestamp
  category: SubscriptionCategory
  status: SubscriptionStatus
  trialEndsAt: Timestamp | null
  sharedWith: string[]
  createdAt: Timestamp
}

/* ── Filter types ── */
export interface ExpenseFiltersState {
  search: string
  category: ExpenseCategory | 'all'
  dateFrom: string
  dateTo: string
  provider: string
  sortBy: 'date' | 'amount'
  sortOrder: 'asc' | 'desc'
}

export const DEFAULT_EXPENSE_FILTERS: ExpenseFiltersState = {
  search: '',
  category: 'all',
  dateFrom: '',
  dateTo: '',
  provider: '',
  sortBy: 'date',
  sortOrder: 'desc',
}
