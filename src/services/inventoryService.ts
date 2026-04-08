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

import type { InventoryItem, InventoryUnit, PriceHistoryEntry } from '@/types/inventory'
import type { ExpenseCategory } from '@/types/expense'

import { auth, db } from './firebase'

const COLLECTION = 'inventory'

/* ── Helpers ── */

function isMissingIndexError(error: unknown): error is FirestoreError {
  if (!error || typeof error !== 'object') return false
  const e = error as { code?: string; message?: string }
  return e.code === 'failed-precondition' && e.message?.includes('requires an index') === true
}

function itemFromDoc(docSnap: { id: string; data: () => Record<string, unknown> }): InventoryItem {
  const d = docSnap.data()
  // Support both 'qty' and legacy 'quantity' fields
  const qty =
    typeof d.qty === 'number' ? d.qty : typeof d.quantity === 'number' ? d.quantity : 0

  return {
    id: docSnap.id,
    uid: (d.uid as string) ?? '',
    name: (d.name as string) ?? 'Desconocido',
    normalizedName: (d.normalizedName as string) ?? '',
    qty: Number.isFinite(qty) && qty >= 0 ? qty : 0,
    unit: (d.unit as InventoryUnit) ?? 'ud',
    category: (d.category as ExpenseCategory) ?? 'other',
    minimumQty: (d.minimumQty as number) ?? 1,
    lastPrice: (d.lastPrice as number) ?? null,
    priceHistory: (d.priceHistory as PriceHistoryEntry[]) ?? [],
    lastPurchased: (d.lastPurchased as Timestamp) ?? null,
    expiryDate: (d.expiryDate as Timestamp) ?? null,
    dataOrigin: (d.dataOrigin as InventoryItem['dataOrigin']) ?? 'manual',
    createdAt: (d.createdAt as Timestamp) ?? Timestamp.now(),
    updatedAt: (d.updatedAt as Timestamp) ?? Timestamp.now(),
  }
}

/* ── Subscribe (realtime) ── */

export function subscribeInventory(
  callback: (items: InventoryItem[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const uid = auth.currentUser?.uid
  if (!uid) {
    callback([])
    return () => {}
  }

  const baseQuery = query(collection(db, COLLECTION), where('uid', '==', uid))
  const orderedQuery = query(
    collection(db, COLLECTION),
    where('uid', '==', uid),
    orderBy('updatedAt', 'desc'),
  )

  let fallbackUnsub: Unsubscribe | null = null

  const orderedUnsub = onSnapshot(
    orderedQuery,
    (snap) => {
      const items = snap.docs.map((d) =>
        itemFromDoc(d as unknown as { id: string; data: () => Record<string, unknown> }),
      )
      callback(items)
    },
    (err) => {
      if (isMissingIndexError(err) && !fallbackUnsub) {
        console.warn('[inventoryService] Missing index, falling back to client-side sort.')
        fallbackUnsub = onSnapshot(
          baseQuery,
          (snap) => {
            const items = snap.docs
              .map((d) =>
                itemFromDoc(d as unknown as { id: string; data: () => Record<string, unknown> }),
              )
              .sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis())
            callback(items)
          },
          (fbErr) => {
            console.error('[inventoryService] fallback error:', fbErr)
            onError?.(fbErr)
          },
        )
        return
      }
      console.error('[inventoryService] onSnapshot error:', err)
      onError?.(err)
    },
  )

  return () => {
    orderedUnsub()
    fallbackUnsub?.()
  }
}

/* ── Create ── */

export interface CreateInventoryInput {
  name: string
  qty: number
  unit?: InventoryUnit
  category?: ExpenseCategory
  minimumQty?: number
  lastPrice?: number | null
  expiryDate?: Date | null
  dataOrigin?: InventoryItem['dataOrigin']
}

export async function createInventoryItem(input: CreateInventoryInput): Promise<string> {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Usuario no autenticado')

  const normalizedName = input.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  const ref = await addDoc(collection(db, COLLECTION), {
    uid,
    name: input.name.trim(),
    normalizedName,
    qty: input.qty,
    unit: input.unit ?? 'ud',
    category: input.category ?? 'other',
    minimumQty: input.minimumQty ?? 1,
    lastPrice: input.lastPrice ?? null,
    priceHistory: [],
    lastPurchased: null,
    expiryDate: input.expiryDate ? Timestamp.fromDate(input.expiryDate) : null,
    dataOrigin: input.dataOrigin ?? 'manual',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return ref.id
}

/* ── Update ── */

export interface UpdateInventoryInput {
  name?: string
  qty?: number
  unit?: InventoryUnit
  category?: ExpenseCategory
  minimumQty?: number
  lastPrice?: number | null
  expiryDate?: Date | null
}

export async function updateInventoryItem(
  itemId: string,
  updates: UpdateInventoryInput,
): Promise<void> {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Usuario no autenticado')

  const data: Record<string, unknown> = { updatedAt: serverTimestamp() }

  if (updates.name !== undefined) {
    data.name = updates.name.trim()
    data.normalizedName = updates.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }
  if (updates.qty !== undefined) data.qty = Math.max(0, updates.qty)
  if (updates.unit !== undefined) data.unit = updates.unit
  if (updates.category !== undefined) data.category = updates.category
  if (updates.minimumQty !== undefined) data.minimumQty = updates.minimumQty
  if (updates.lastPrice !== undefined) data.lastPrice = updates.lastPrice
  if ('expiryDate' in updates) {
    data.expiryDate = updates.expiryDate ? Timestamp.fromDate(updates.expiryDate) : null
  }

  await updateDoc(doc(db, COLLECTION, itemId), data)
}

/* ── Delete ── */

export async function deleteInventoryItem(itemId: string): Promise<void> {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Usuario no autenticado')
  await deleteDoc(doc(db, COLLECTION, itemId))
}
