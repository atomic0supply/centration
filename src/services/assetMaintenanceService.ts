import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
  updateDoc,
  where,
} from 'firebase/firestore'

import type { MaintenanceEntry, MaintenanceKind } from '@/types/assets'

import { auth, db } from './firebase'
import { isMissingIndexError, requireAuthenticatedUid, toTimestampOrNull } from './firestoreUtils'

const COLLECTION = 'asset_maintenance'

export interface MaintenanceFilters {
  assetId?: string
}

export interface CreateMaintenanceEntryInput {
  assetId: string
  kind: MaintenanceKind
  title: string
  description?: string | null
  performedAt: Date
  nextDueDate?: Date | null
  cost?: number | null
  mileageKm?: number | null
  completed?: boolean
}

export interface UpdateMaintenanceEntryInput {
  assetId?: string
  kind?: MaintenanceKind
  title?: string
  description?: string | null
  performedAt?: Date | null
  nextDueDate?: Date | null
  cost?: number | null
  mileageKm?: number | null
  completed?: boolean
}

function maintenanceFromDoc(docSnap: { id: string; data: () => Record<string, unknown> }): MaintenanceEntry {
  const d = docSnap.data()

  return {
    id: docSnap.id,
    uid: typeof d.uid === 'string' ? d.uid : '',
    assetId: typeof d.assetId === 'string' ? d.assetId : '',
    kind: (d.kind as MaintenanceKind | undefined) ?? 'other',
    title: typeof d.title === 'string' ? d.title : 'Mantenimiento',
    description: typeof d.description === 'string' ? d.description : null,
    performedAt: toTimestampOrNull(d.performedAt) ?? Timestamp.now(),
    nextDueDate: toTimestampOrNull(d.nextDueDate),
    cost: typeof d.cost === 'number' ? d.cost : null,
    mileageKm: typeof d.mileageKm === 'number' ? d.mileageKm : null,
    completed: typeof d.completed === 'boolean' ? d.completed : false,
    createdAt: toTimestampOrNull(d.createdAt) ?? Timestamp.now(),
    updatedAt: toTimestampOrNull(d.updatedAt) ?? Timestamp.now(),
  }
}

function sortByPerformedAtDesc(a: MaintenanceEntry, b: MaintenanceEntry): number {
  return b.performedAt.toMillis() - a.performedAt.toMillis()
}

export function subscribeAssetMaintenance(
  callback: (entries: MaintenanceEntry[]) => void,
  onError?: (error: Error) => void,
  filters?: MaintenanceFilters,
): Unsubscribe {
  const uid = auth.currentUser?.uid
  if (!uid) {
    callback([])
    return () => undefined
  }

  const assetIdFilter = filters?.assetId
  const hasAssetFilter = typeof assetIdFilter === 'string' && assetIdFilter.length > 0
  const baseQuery = query(collection(db, COLLECTION), where('uid', '==', uid))
  const liveQuery = hasAssetFilter
    ? query(
        collection(db, COLLECTION),
        where('uid', '==', uid),
        where('assetId', '==', assetIdFilter),
        orderBy('performedAt', 'desc'),
      )
    : query(collection(db, COLLECTION), where('uid', '==', uid), orderBy('performedAt', 'desc'))

  let fallbackUnsub: Unsubscribe | null = null

  const orderedUnsub = onSnapshot(
    liveQuery,
    (snap) => {
      const entries = snap.docs.map((d) =>
        maintenanceFromDoc(d as unknown as { id: string; data: () => Record<string, unknown> }),
      )
      callback(entries)
    },
    (err) => {
      if (isMissingIndexError(err) && !fallbackUnsub) {
        console.warn('[assetMaintenanceService] Missing index, falling back to client-side sort.')
        fallbackUnsub = onSnapshot(
          baseQuery,
          (fallbackSnap) => {
            const entries = fallbackSnap.docs
              .map((d) =>
                maintenanceFromDoc(d as unknown as { id: string; data: () => Record<string, unknown> }),
              )
              .filter((entry) => !hasAssetFilter || entry.assetId === assetIdFilter)
              .sort(sortByPerformedAtDesc)
            callback(entries)
          },
          (fallbackErr) => {
            console.error('[assetMaintenanceService] fallback error:', fallbackErr)
            onError?.(fallbackErr)
          },
        )
        return
      }

      console.error('[assetMaintenanceService] onSnapshot error:', err)
      onError?.(err)
    },
  )

  return () => {
    orderedUnsub()
    fallbackUnsub?.()
  }
}

export async function createMaintenanceEntry(input: CreateMaintenanceEntryInput): Promise<string> {
  const uid = requireAuthenticatedUid(auth.currentUser?.uid)

  const ref = await addDoc(collection(db, COLLECTION), {
    uid,
    assetId: input.assetId,
    kind: input.kind,
    title: input.title.trim(),
    description: (() => {
      const value = input.description?.trim()
      return value && value.length > 0 ? value : null
    })(),
    performedAt: Timestamp.fromDate(input.performedAt),
    nextDueDate: input.nextDueDate ? Timestamp.fromDate(input.nextDueDate) : null,
    cost: input.cost ?? null,
    mileageKm: input.mileageKm ?? null,
    completed: input.completed ?? false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return ref.id
}

export async function updateMaintenanceEntry(
  entryId: string,
  updates: UpdateMaintenanceEntryInput,
): Promise<void> {
  requireAuthenticatedUid(auth.currentUser?.uid)

  const data: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  }

  if (updates.assetId !== undefined) data.assetId = updates.assetId
  if (updates.kind !== undefined) data.kind = updates.kind
  if (updates.title !== undefined) data.title = updates.title.trim()
  if (updates.description !== undefined) {
    const value = updates.description?.trim()
    data.description = value && value.length > 0 ? value : null
  }
  if ('performedAt' in updates) {
    data.performedAt = updates.performedAt ? Timestamp.fromDate(updates.performedAt) : null
  }
  if ('nextDueDate' in updates) {
    data.nextDueDate = updates.nextDueDate ? Timestamp.fromDate(updates.nextDueDate) : null
  }
  if (updates.cost !== undefined) data.cost = updates.cost
  if (updates.mileageKm !== undefined) data.mileageKm = updates.mileageKm
  if (updates.completed !== undefined) data.completed = updates.completed

  await updateDoc(doc(db, COLLECTION, entryId), data)
}

export async function deleteMaintenanceEntry(entryId: string): Promise<void> {
  requireAuthenticatedUid(auth.currentUser?.uid)
  await deleteDoc(doc(db, COLLECTION, entryId))
}
