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

import type { Subscription, SubscriptionCategory, SubscriptionStatus } from '@/types/expense'

import { auth, db } from './firebase'

const COLLECTION = 'subscriptions'

/* ── Helpers ── */

function isMissingIndexError(error: unknown): error is FirestoreError {
  if (!error || typeof error !== 'object') return false
  const maybeError = error as { code?: string; message?: string }
  return maybeError.code === 'failed-precondition' && maybeError.message?.includes('requires an index') === true
}

function subscriptionFromDoc(docSnap: { id: string; data: () => Record<string, unknown> }): Subscription {
  const d = docSnap.data()
  return {
    id: docSnap.id,
    uid: (d.uid as string) ?? '',
    name: (d.name as string) ?? '',
    logo: (d.logo as string) ?? null,
    amount: (d.amount as number) ?? 0,
    currency: (d.currency as string) ?? 'EUR',
    billingCycle: (d.billingCycle as 'monthly' | 'yearly') ?? 'monthly',
    nextPaymentDate: (d.nextPaymentDate as Timestamp) ?? Timestamp.now(),
    category: (d.category as SubscriptionCategory) ?? 'other',
    status: (d.status as SubscriptionStatus) ?? 'active',
    trialEndsAt: (d.trialEndsAt as Timestamp) ?? null,
    sharedWith: (d.sharedWith as string[]) ?? [],
    createdAt: (d.createdAt as Timestamp) ?? Timestamp.now(),
  }
}

/* ── Subscribe (realtime) ── */

export function subscribeSubscriptions(
  callback: (subscriptions: Subscription[]) => void,
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
    orderBy('nextPaymentDate', 'asc'),
  )

  let fallbackUnsubscribe: Unsubscribe | null = null

  const orderedUnsubscribe = onSnapshot(
    orderedQuery,
    (snap) => {
      const subs = snap.docs.map((d) => subscriptionFromDoc(d as unknown as { id: string; data: () => Record<string, unknown> }))
      callback(subs)
    },
    (err) => {
      if (isMissingIndexError(err) && !fallbackUnsubscribe) {
        console.warn(
          '[subscriptionService] Missing index, falling back to client-side sorting. Deploy firestore indexes to fix permanently.',
        )
        fallbackUnsubscribe = onSnapshot(
          baseQuery,
          (fallbackSnap) => {
            const subs = fallbackSnap.docs
              .map((d) => subscriptionFromDoc(d as unknown as { id: string; data: () => Record<string, unknown> }))
              .sort((a, b) => a.nextPaymentDate.toMillis() - b.nextPaymentDate.toMillis())
            callback(subs)
          },
          (fallbackErr) => {
            console.error('[subscriptionService] fallback onSnapshot error:', fallbackErr)
            onError?.(fallbackErr)
          },
        )
        return
      }

      console.error('[subscriptionService] onSnapshot error:', err)
      onError?.(err)
    },
  )

  return () => {
    orderedUnsubscribe()
    fallbackUnsubscribe?.()
  }
}

/* ── Create ── */

export interface CreateSubscriptionInput {
  name: string
  amount: number
  currency?: string
  billingCycle: 'monthly' | 'yearly'
  nextPaymentDate: Date
  category: SubscriptionCategory
  status?: SubscriptionStatus
  logo?: string | null
  trialEndsAt?: Date | null
  sharedWith?: string[]
}

export async function createSubscription(input: CreateSubscriptionInput): Promise<string> {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Usuario no autenticado')

  const ref = await addDoc(collection(db, COLLECTION), {
    uid,
    name: input.name,
    logo: input.logo ?? null,
    amount: input.amount,
    currency: input.currency ?? 'EUR',
    billingCycle: input.billingCycle,
    nextPaymentDate: Timestamp.fromDate(input.nextPaymentDate),
    category: input.category,
    status: input.status ?? 'active',
    trialEndsAt: input.trialEndsAt ? Timestamp.fromDate(input.trialEndsAt) : null,
    sharedWith: input.sharedWith ?? [],
    createdAt: serverTimestamp(),
  })

  return ref.id
}

/* ── Update ── */

export async function updateSubscription(
  subscriptionId: string,
  updates: Partial<CreateSubscriptionInput>,
): Promise<void> {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Usuario no autenticado')

  const data: Record<string, unknown> = {}

  if (updates.name !== undefined) data.name = updates.name
  if (updates.amount !== undefined) data.amount = updates.amount
  if (updates.currency !== undefined) data.currency = updates.currency
  if (updates.billingCycle !== undefined) data.billingCycle = updates.billingCycle
  if (updates.nextPaymentDate !== undefined) data.nextPaymentDate = Timestamp.fromDate(updates.nextPaymentDate)
  if (updates.category !== undefined) data.category = updates.category
  if (updates.status !== undefined) data.status = updates.status
  if (updates.logo !== undefined) data.logo = updates.logo
  if (updates.trialEndsAt !== undefined) data.trialEndsAt = updates.trialEndsAt ? Timestamp.fromDate(updates.trialEndsAt) : null
  if (updates.sharedWith !== undefined) data.sharedWith = updates.sharedWith

  await updateDoc(doc(db, COLLECTION, subscriptionId), data)
}

/* ── Delete ── */

export async function deleteSubscription(subscriptionId: string): Promise<void> {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Usuario no autenticado')

  await deleteDoc(doc(db, COLLECTION, subscriptionId))
}

/* ── Utilities ── */

/** Calculate monthly cost of a subscription (normalizes yearly to monthly). */
export function getMonthlyAmount(sub: Subscription): number {
  if (sub.billingCycle === 'yearly') return sub.amount / 12
  return sub.amount
}

/** Calculate yearly cost of a subscription (normalizes monthly to yearly). */
export function getYearlyAmount(sub: Subscription): number {
  if (sub.billingCycle === 'monthly') return sub.amount * 12
  return sub.amount
}
