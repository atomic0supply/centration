import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore'

import type { Budget } from '@/types/budget'
import type { ExpenseCategory } from '@/types/expense'

import { auth, db } from './firebase'

const COLLECTION = 'budgets'

/* ── Subscribe (realtime) ── */

export function subscribeBudget(
  callback: (budget: Budget | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const uid = auth.currentUser?.uid
  if (!uid) {
    callback(null)
    return () => {}
  }

  const docRef = doc(db, COLLECTION, uid)

  return onSnapshot(
    docRef,
    (snap) => {
      if (!snap.exists()) {
        callback(null)
        return
      }
      const d = snap.data()
      callback({
        uid,
        global: (d.global as number) ?? 0,
        byCategory: (d.byCategory as Partial<Record<ExpenseCategory, number>>) ?? {},
        updatedAt: d.updatedAt,
      })
    },
    (err) => {
      console.error('[budgetService] onSnapshot error:', err)
      onError?.(err)
    },
  )
}

/* ── Save ── */

export async function saveBudget(
  uid: string,
  data: { global?: number; byCategory?: Partial<Record<ExpenseCategory, number>> },
): Promise<void> {
  const docRef = doc(db, COLLECTION, uid)
  await setDoc(
    docRef,
    { ...data, uid, updatedAt: serverTimestamp() },
    { merge: true },
  )
}
