import { type FirestoreError,Timestamp } from 'firebase/firestore'

export function isMissingIndexError(error: unknown): error is FirestoreError {
  if (!error || typeof error !== 'object') return false

  const maybeError = error as { code?: string; message?: string }
  return maybeError.code === 'failed-precondition' && maybeError.message?.includes('requires an index') === true
}

export function requireAuthenticatedUid(uid: string | null | undefined): string {
  if (!uid) {
    throw new Error('Usuario no autenticado')
  }

  return uid
}

export function toTimestampOrNull(value: unknown): Timestamp | null {
  return value instanceof Timestamp ? value : null
}
