import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  type FirestoreError,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'

import type { Expense, ExpenseCategory, ExpenseItem, DataOrigin, BillingCycle } from '@/types/expense'

import { auth, db } from './firebase'

const COLLECTION = 'expenses'

/* ── Helpers ── */

function isMissingIndexError(error: unknown): error is FirestoreError {
  if (!error || typeof error !== 'object') return false
  const maybeError = error as { code?: string; message?: string }
  return maybeError.code === 'failed-precondition' && maybeError.message?.includes('requires an index') === true
}

function expenseFromDoc(docSnap: { id: string; data: () => Record<string, unknown> }): Expense {
  const d = docSnap.data()
  return {
    id: docSnap.id,
    uid: (d.uid as string) ?? '',
    amount: (d.amount as number) ?? (d.total as number) ?? 0,
    currency: (d.currency as string) ?? 'EUR',
    date: (d.date as Timestamp) ?? Timestamp.now(),
    category: (d.category as ExpenseCategory) ?? 'other',
    provider: (d.provider as string) ?? 'Desconocido',
    isSubscription: (d.isSubscription as boolean) ?? false,
    billingCycle: (d.billingCycle as BillingCycle) ?? 'once',
    ticketRef: (d.ticketRef as string) ?? (d.sourceFile as string) ?? null,
    items: (d.items as ExpenseItem[]) ?? [],
    dataOrigin: (d.dataOrigin as DataOrigin) ?? 'manual',
    potentialAsset: (d.potentialAsset as boolean) ?? false,
    notes: (d.notes as string) ?? '',
    createdAt: (d.createdAt as Timestamp) ?? Timestamp.now(),
  }
}

/* ── Subscribe (realtime) ── */

export function subscribeExpenses(
  callback: (expenses: Expense[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const uid = auth.currentUser?.uid
  if (!uid) {
    callback([])
    return () => {}
  }

  const baseQuery = query(
    collection(db, COLLECTION),
    where('uid', '==', uid),
  )
  const orderedQuery = query(
    collection(db, COLLECTION),
    where('uid', '==', uid),
    orderBy('date', 'desc'),
  )

  let fallbackUnsubscribe: Unsubscribe | null = null

  const orderedUnsubscribe = onSnapshot(
    orderedQuery,
    (snap) => {
      const expenses = snap.docs.map((d) => expenseFromDoc(d as unknown as { id: string; data: () => Record<string, unknown> }))
      callback(expenses)
    },
    (err) => {
      if (isMissingIndexError(err) && !fallbackUnsubscribe) {
        console.warn(
          '[expenseService] Missing index, falling back to client-side sorting. Deploy firestore indexes to fix permanently.',
        )
        fallbackUnsubscribe = onSnapshot(
          baseQuery,
          (fallbackSnap) => {
            const expenses = fallbackSnap.docs
              .map((d) => expenseFromDoc(d as unknown as { id: string; data: () => Record<string, unknown> }))
              .sort((a, b) => b.date.toMillis() - a.date.toMillis())
            callback(expenses)
          },
          (fallbackErr) => {
            console.error('[expenseService] fallback onSnapshot error:', fallbackErr)
            onError?.(fallbackErr)
          },
        )
        return
      }

      console.error('[expenseService] onSnapshot error:', err)
      onError?.(err)
    },
  )

  return () => {
    orderedUnsubscribe()
    fallbackUnsubscribe?.()
  }
}

/* ── Create ── */

export interface CreateExpenseInput {
  amount: number
  currency?: string
  date: Date
  category: ExpenseCategory
  provider: string
  items?: ExpenseItem[]
  notes?: string
  dataOrigin?: DataOrigin
  billingCycle?: BillingCycle
  isSubscription?: boolean
  ticketRef?: string | null
}

export async function createExpense(input: CreateExpenseInput): Promise<string> {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Usuario no autenticado')

  const ref = await addDoc(collection(db, COLLECTION), {
    uid,
    amount: input.amount,
    currency: input.currency ?? 'EUR',
    date: Timestamp.fromDate(input.date),
    category: input.category,
    provider: input.provider,
    isSubscription: input.isSubscription ?? false,
    billingCycle: input.billingCycle ?? 'once',
    ticketRef: input.ticketRef ?? null,
    items: input.items ?? [],
    dataOrigin: input.dataOrigin ?? 'manual',
    potentialAsset: false,
    notes: input.notes ?? '',
    createdAt: serverTimestamp(),
  })

  return ref.id
}

/* ── Update ── */

export async function updateExpense(
  expenseId: string,
  updates: Partial<CreateExpenseInput>,
): Promise<void> {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Usuario no autenticado')

  const data: Record<string, unknown> = {}

  if (updates.amount !== undefined) data.amount = updates.amount
  if (updates.currency !== undefined) data.currency = updates.currency
  if (updates.date !== undefined) data.date = Timestamp.fromDate(updates.date)
  if (updates.category !== undefined) data.category = updates.category
  if (updates.provider !== undefined) data.provider = updates.provider
  if (updates.items !== undefined) data.items = updates.items
  if (updates.notes !== undefined) data.notes = updates.notes
  if (updates.dataOrigin !== undefined) data.dataOrigin = updates.dataOrigin
  if (updates.billingCycle !== undefined) data.billingCycle = updates.billingCycle
  if (updates.isSubscription !== undefined) data.isSubscription = updates.isSubscription

  await updateDoc(doc(db, COLLECTION, expenseId), data)
}

/* ── Delete ── */

export async function deleteExpense(expenseId: string): Promise<void> {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Usuario no autenticado')

  await deleteDoc(doc(db, COLLECTION, expenseId))
}
