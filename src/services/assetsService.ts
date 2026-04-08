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

import {
  type AssetAlertPreferences,
  DEFAULT_ASSET_ALERT_PREFERENCES,
  type PhysicalAsset,
  type PhysicalAssetType,
} from '@/types/assets'

import { auth, db } from './firebase'
import { isMissingIndexError, requireAuthenticatedUid, toTimestampOrNull } from './firestoreUtils'

const COLLECTION = 'assets'

export interface CreateAssetInput {
  type: PhysicalAssetType
  name: string
  identifier?: string | null
  purchasePrice: number
  purchaseDate: Date
  currentValue: number
  currency?: string
  warrantyExpiry?: Date | null
  photoPath?: string | null
  photoUrl?: string | null
  notes?: string
}

export interface UpdateAssetInput {
  type?: PhysicalAssetType
  name?: string
  identifier?: string | null
  purchasePrice?: number
  purchaseDate?: Date | null
  currentValue?: number
  currency?: string
  warrantyExpiry?: Date | null
  photoPath?: string | null
  photoUrl?: string | null
  notes?: string
}

export interface AssetFilters {
  type?: PhysicalAssetType | 'all'
}

function assetFromDoc(docSnap: { id: string; data: () => Record<string, unknown> }): PhysicalAsset {
  const d = docSnap.data()

  return {
    id: docSnap.id,
    uid: typeof d.uid === 'string' ? d.uid : '',
    type: (d.type as PhysicalAssetType | undefined) ?? 'electronics',
    name: typeof d.name === 'string' ? d.name : 'Sin nombre',
    identifier: typeof d.identifier === 'string' ? d.identifier : null,
    purchasePrice: typeof d.purchasePrice === 'number' ? d.purchasePrice : 0,
    purchaseDate: toTimestampOrNull(d.purchaseDate) ?? Timestamp.now(),
    currentValue: typeof d.currentValue === 'number' ? d.currentValue : 0,
    currency: typeof d.currency === 'string' ? d.currency : 'EUR',
    warrantyExpiry: toTimestampOrNull(d.warrantyExpiry),
    photoPath: typeof d.photoPath === 'string' ? d.photoPath : null,
    photoUrl: typeof d.photoUrl === 'string' ? d.photoUrl : null,
    notes: typeof d.notes === 'string' ? d.notes : '',
    createdAt: toTimestampOrNull(d.createdAt) ?? Timestamp.now(),
    updatedAt: toTimestampOrNull(d.updatedAt) ?? Timestamp.now(),
  }
}

function sortAssetsByUpdatedAtDesc(a: PhysicalAsset, b: PhysicalAsset): number {
  return b.updatedAt.toMillis() - a.updatedAt.toMillis()
}

export function subscribeAssets(
  callback: (assets: PhysicalAsset[]) => void,
  onError?: (error: Error) => void,
  filters?: AssetFilters,
): Unsubscribe {
  const uid = auth.currentUser?.uid
  if (!uid) {
    callback([])
    return () => undefined
  }

  const typeFilter = filters?.type
  const hasTypeFilter = typeFilter !== undefined && typeFilter !== 'all'
  const baseQuery = query(collection(db, COLLECTION), where('uid', '==', uid))
  const liveQuery = hasTypeFilter
    ? query(
        collection(db, COLLECTION),
        where('uid', '==', uid),
        where('type', '==', typeFilter),
        orderBy('updatedAt', 'desc'),
      )
    : query(collection(db, COLLECTION), where('uid', '==', uid), orderBy('updatedAt', 'desc'))

  let fallbackUnsub: Unsubscribe | null = null

  const orderedUnsub = onSnapshot(
    liveQuery,
    (snap) => {
      const assets = snap.docs.map((d) => assetFromDoc(d as unknown as { id: string; data: () => Record<string, unknown> }))
      callback(assets)
    },
    (err) => {
      if (isMissingIndexError(err) && !fallbackUnsub) {
        fallbackUnsub = onSnapshot(
          baseQuery,
          (fallbackSnap) => {
            const assets = fallbackSnap.docs
              .map((d) => assetFromDoc(d as unknown as { id: string; data: () => Record<string, unknown> }))
              .filter((asset) => !hasTypeFilter || asset.type === typeFilter)
              .sort(sortAssetsByUpdatedAtDesc)
            callback(assets)
          },
          (fallbackErr) => {
            onError?.(fallbackErr)
          },
        )
        return
      }

      onError?.(err)
    },
  )

  return () => {
    orderedUnsub()
    fallbackUnsub?.()
  }
}

export async function createAsset(input: CreateAssetInput): Promise<string> {
  const uid = requireAuthenticatedUid(auth.currentUser?.uid)

  const ref = await addDoc(collection(db, COLLECTION), {
    uid,
    type: input.type,
    name: input.name.trim(),
    identifier: (() => {
      const value = input.identifier?.trim()
      return value && value.length > 0 ? value : null
    })(),
    purchasePrice: input.purchasePrice,
    purchaseDate: Timestamp.fromDate(input.purchaseDate),
    currentValue: input.currentValue,
    currency: input.currency ?? 'EUR',
    warrantyExpiry: input.warrantyExpiry ? Timestamp.fromDate(input.warrantyExpiry) : null,
    photoPath: input.photoPath ?? null,
    photoUrl: input.photoUrl ?? null,
    notes: input.notes ?? '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return ref.id
}

export async function updateAsset(assetId: string, updates: UpdateAssetInput): Promise<void> {
  requireAuthenticatedUid(auth.currentUser?.uid)

  const data: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  }

  if (updates.type !== undefined) data.type = updates.type
  if (updates.name !== undefined) data.name = updates.name.trim()
  if (updates.identifier !== undefined) {
    const value = updates.identifier?.trim()
    data.identifier = value && value.length > 0 ? value : null
  }
  if (updates.purchasePrice !== undefined) data.purchasePrice = updates.purchasePrice
  if ('purchaseDate' in updates) {
    data.purchaseDate = updates.purchaseDate ? Timestamp.fromDate(updates.purchaseDate) : null
  }
  if (updates.currentValue !== undefined) data.currentValue = updates.currentValue
  if (updates.currency !== undefined) data.currency = updates.currency
  if ('warrantyExpiry' in updates) {
    data.warrantyExpiry = updates.warrantyExpiry ? Timestamp.fromDate(updates.warrantyExpiry) : null
  }
  if ('photoPath' in updates) data.photoPath = updates.photoPath ?? null
  if ('photoUrl' in updates) data.photoUrl = updates.photoUrl ?? null
  if (updates.notes !== undefined) data.notes = updates.notes

  await updateDoc(doc(db, COLLECTION, assetId), data)
}

export async function deleteAsset(assetId: string): Promise<void> {
  requireAuthenticatedUid(auth.currentUser?.uid)
  await deleteDoc(doc(db, COLLECTION, assetId))
}

export function getAssetAlertPreferencesDefaults(): AssetAlertPreferences {
  return { ...DEFAULT_ASSET_ALERT_PREFERENCES }
}
