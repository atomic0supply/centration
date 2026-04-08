import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore'

import { auth, db } from './firebase'

const USERS_COLLECTION = 'users'
export interface UserFinance {
  liquidCash: number
  debts: number
}

export const DEFAULT_USER_FINANCE: UserFinance = {
  liquidCash: 0,
  debts: 0,
}

function toSafeAmount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

export async function getUserFinance(): Promise<UserFinance> {
  const uid = auth.currentUser?.uid
  if (!uid) {
    return DEFAULT_USER_FINANCE
  }

  const ref = doc(db, USERS_COLLECTION, uid)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    return DEFAULT_USER_FINANCE
  }

  const data = snap.data()
  return {
    liquidCash: toSafeAmount(data.liquidCash),
    debts: toSafeAmount(data.debts),
  }
}

export async function saveUserFinance(input: UserFinance): Promise<UserFinance> {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Usuario no autenticado')

  const payload: UserFinance = {
    liquidCash: toSafeAmount(input.liquidCash),
    debts: toSafeAmount(input.debts),
  }

  const ref = doc(db, USERS_COLLECTION, uid)
  await setDoc(
    ref,
    {
      uid,
      liquidCash: payload.liquidCash,
      debts: payload.debts,
      updatedAt: Timestamp.now(),
    },
    { merge: true },
  )

  return payload
}
