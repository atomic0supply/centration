import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  type FirestoreError,
  getDoc,
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
  computePositionMetrics,
  type Investment,
  type InvestmentCurrency,
  type InvestmentTransaction,
  type InvestmentType,
  type PortfolioSnapshot,
  type PositionMetrics,
  type PriceAlertRule,
  toSafeNumber,
  type TransactionType,
} from '@/types/investment'

import { auth, db } from './firebase'

const INVESTMENTS_COLLECTION = 'investments'
const SNAPSHOTS_COLLECTION = 'portfolio_snapshots'

function isMissingIndexError(error: unknown): error is FirestoreError {
  if (!error || typeof error !== 'object') return false
  const maybe = error as { code?: string; message?: string }
  return maybe.code === 'failed-precondition' && maybe.message?.includes('requires an index') === true
}

function tsOrNow(value: unknown): Timestamp {
  return value instanceof Timestamp ? value : Timestamp.now()
}

function asCurrency(value: unknown): InvestmentCurrency {
  return value === 'EUR' ? 'EUR' : 'USD'
}

function asType(value: unknown): InvestmentType {
  if (value === 'crypto' || value === 'etf') return value
  return 'stock'
}

function asTxType(value: unknown): TransactionType {
  return value === 'sell' ? 'sell' : 'buy'
}

function mapTransaction(raw: unknown): InvestmentTransaction | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>

  const qty = toSafeNumber(row.qty)
  const price = toSafeNumber(row.price)
  if (qty <= 0 || price <= 0) return null

  return {
    txId:
      typeof row.txId === 'string' && row.txId.length > 0
        ? row.txId
        : `tx-${crypto.randomUUID()}`,
    type: asTxType(row.type),
    date: tsOrNow(row.date),
    qty,
    price,
    fee: toSafeNumber(row.fee),
  }
}

function mapAlert(raw: unknown): PriceAlertRule | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>

  const type = row.type === 'above' || row.type === 'below' ? row.type : null
  const price = toSafeNumber(row.price)
  if (!type || price <= 0) return null

  return {
    id:
      typeof row.id === 'string' && row.id.length > 0
        ? row.id
        : `alert-${crypto.randomUUID()}`,
    type,
    price,
    active: row.active !== false,
    lastTriggeredAt: row.lastTriggeredAt instanceof Timestamp ? row.lastTriggeredAt : null,
  }
}

function investmentFromDoc(docSnap: { id: string; data: () => Record<string, unknown> }): Investment {
  const data = docSnap.data()

  const transactions = Array.isArray(data.transactions)
    ? data.transactions
        .map((tx) => mapTransaction(tx))
        .filter((tx): tx is InvestmentTransaction => tx !== null)
    : []

  const alerts = Array.isArray(data.alerts)
    ? data.alerts
        .map((row) => mapAlert(row))
        .filter((row): row is PriceAlertRule => row !== null)
    : []

  const currentPrice = typeof data.currentPrice === 'number' ? data.currentPrice : null
  const computed = computePositionMetrics(transactions, currentPrice)

  return {
    id: docSnap.id,
    uid: typeof data.uid === 'string' ? data.uid : '',
    symbol: typeof data.symbol === 'string' ? data.symbol : '',
    displayTicker:
      typeof data.displayTicker === 'string' && data.displayTicker.length > 0
        ? data.displayTicker
        : typeof data.symbol === 'string'
            ? data.symbol
            : '',
    type: asType(data.type),
    market: typeof data.market === 'string' ? data.market : 'UNKNOWN',
    currency: asCurrency(data.currency),
    transactions,
    alerts,
    currentPrice,
    priceUpdatedAt: data.priceUpdatedAt instanceof Timestamp ? data.priceUpdatedAt : null,
    stalePrice: data.stalePrice === true || data.stale === true,
    quantity:
      typeof data.quantity === 'number' ? data.quantity : computed.quantity,
    avgBuyPrice:
      typeof data.avgBuyPrice === 'number' ? data.avgBuyPrice : computed.avgBuyPrice,
    costBasis:
      typeof data.costBasis === 'number' ? data.costBasis : computed.costBasis,
    realizedPnl:
      typeof data.realizedPnl === 'number' ? data.realizedPnl : computed.realizedPnl,
    unrealizedPnl:
      typeof data.unrealizedPnl === 'number' ? data.unrealizedPnl : computed.unrealizedPnl,
    totalPnl:
      typeof data.totalPnl === 'number' ? data.totalPnl : computed.totalPnl,
    roiPct: typeof data.roiPct === 'number' ? data.roiPct : computed.roiPct,
    totalFees:
      typeof data.totalFees === 'number' ? data.totalFees : computed.totalFees,
    currentValue:
      typeof data.currentValue === 'number' ? data.currentValue : computed.currentValue,
    createdAt: tsOrNow(data.createdAt),
    updatedAt: tsOrNow(data.updatedAt),
  }
}

function snapshotFromDoc(docSnap: { id: string; data: () => Record<string, unknown> }): PortfolioSnapshot {
  const data = docSnap.data()

  return {
    id: docSnap.id,
    uid: typeof data.uid === 'string' ? data.uid : '',
    timestamp: tsOrNow(data.timestamp),
    totalValue: toSafeNumber(data.totalValue),
    totalCostBasis: toSafeNumber(data.totalCostBasis),
    unrealizedPnl: toSafeNumber(data.unrealizedPnl),
    realizedPnl: toSafeNumber(data.realizedPnl),
    totalPnl: toSafeNumber(data.totalPnl),
    roiPct: toSafeNumber(data.roiPct),
    byType: {
      crypto: toSafeNumber((data.byType as { crypto?: unknown } | undefined)?.crypto),
      stock: toSafeNumber((data.byType as { stock?: unknown } | undefined)?.stock),
      etf: toSafeNumber((data.byType as { etf?: unknown } | undefined)?.etf),
    },
    createdAt: tsOrNow(data.createdAt),
  }
}

export function subscribeInvestments(
  callback: (investments: Investment[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const uid = auth.currentUser?.uid
  if (!uid) {
    callback([])
    return () => undefined
  }

  const baseQuery = query(
    collection(db, INVESTMENTS_COLLECTION),
    where('uid', '==', uid),
  )

  const orderedQuery = query(
    collection(db, INVESTMENTS_COLLECTION),
    where('uid', '==', uid),
    orderBy('updatedAt', 'desc'),
  )

  let fallbackUnsubscribe: Unsubscribe | null = null

  const orderedUnsubscribe = onSnapshot(
    orderedQuery,
    (snapshot) => {
      callback(snapshot.docs.map((row) => investmentFromDoc(row as unknown as { id: string; data: () => Record<string, unknown> })))
    },
    (err) => {
      if (isMissingIndexError(err) && !fallbackUnsubscribe) {
        fallbackUnsubscribe = onSnapshot(
          baseQuery,
          (fallbackSnapshot) => {
            const ordered = fallbackSnapshot.docs
              .map((row) => investmentFromDoc(row as unknown as { id: string; data: () => Record<string, unknown> }))
              .sort((a, b) => b.updatedAt.toMillis() - a.updatedAt.toMillis())
            callback(ordered)
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
    orderedUnsubscribe()
    fallbackUnsubscribe?.()
  }
}

export function subscribePortfolioSnapshots(
  callback: (snapshots: PortfolioSnapshot[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const uid = auth.currentUser?.uid
  if (!uid) {
    callback([])
    return () => undefined
  }

  const baseQuery = query(
    collection(db, SNAPSHOTS_COLLECTION),
    where('uid', '==', uid),
  )

  const orderedQuery = query(
    collection(db, SNAPSHOTS_COLLECTION),
    where('uid', '==', uid),
    orderBy('timestamp', 'asc'),
  )

  let fallbackUnsubscribe: Unsubscribe | null = null

  const orderedUnsubscribe = onSnapshot(
    orderedQuery,
    (snapshot) => {
      callback(snapshot.docs.map((row) => snapshotFromDoc(row as unknown as { id: string; data: () => Record<string, unknown> })))
    },
    (err) => {
      if (isMissingIndexError(err) && !fallbackUnsubscribe) {
        fallbackUnsubscribe = onSnapshot(
          baseQuery,
          (fallbackSnapshot) => {
            const ordered = fallbackSnapshot.docs
              .map((row) => snapshotFromDoc(row as unknown as { id: string; data: () => Record<string, unknown> }))
              .sort((a, b) => a.timestamp.toMillis() - b.timestamp.toMillis())
            callback(ordered)
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
    orderedUnsubscribe()
    fallbackUnsubscribe?.()
  }
}

export interface CreateInvestmentInput {
  symbol: string
  displayTicker: string
  type: InvestmentType
  market: string
  currency: InvestmentCurrency
}

export async function createInvestment(input: CreateInvestmentInput): Promise<string> {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Usuario no autenticado')

  const symbol = input.symbol.trim().toUpperCase()
  const displayTicker = input.displayTicker.trim().toUpperCase()

  const ref = await addDoc(collection(db, INVESTMENTS_COLLECTION), {
    uid,
    symbol,
    displayTicker,
    type: input.type,
    market: input.market.trim().toUpperCase(),
    currency: input.currency,
    transactions: [],
    alerts: [],
    currentPrice: null,
    priceUpdatedAt: null,
    stalePrice: true,
    quantity: 0,
    avgBuyPrice: 0,
    costBasis: 0,
    realizedPnl: 0,
    unrealizedPnl: 0,
    totalPnl: 0,
    roiPct: 0,
    totalFees: 0,
    currentValue: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return ref.id
}

export interface AppendTransactionInput {
  txId: string
  type: TransactionType
  date: Date
  qty: number
  price: number
  fee?: number
}

export async function appendTransaction(
  investmentId: string,
  input: AppendTransactionInput,
): Promise<PositionMetrics> {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Usuario no autenticado')

  if (input.qty <= 0 || input.price <= 0) {
    throw new Error('Cantidad y precio deben ser mayores a 0')
  }

  const ref = doc(db, INVESTMENTS_COLLECTION, investmentId)
  const snap = await getDoc(ref)

  if (!snap.exists()) {
    throw new Error('Posicion no encontrada')
  }

  const current = investmentFromDoc(
    snap as unknown as { id: string; data: () => Record<string, unknown> },
  )

  if (current.uid !== uid) {
    throw new Error('No autorizado')
  }

  if (current.transactions.some((tx) => tx.txId === input.txId)) {
    return computePositionMetrics(current.transactions, current.currentPrice)
  }

  const tx: InvestmentTransaction = {
    txId: input.txId,
    type: input.type,
    date: Timestamp.fromDate(input.date),
    qty: input.qty,
    price: input.price,
    fee: input.fee ?? 0,
  }

  const transactions = [...current.transactions, tx]
  const metrics = computePositionMetrics(transactions, current.currentPrice)

  await updateDoc(ref, {
    transactions,
    quantity: metrics.quantity,
    avgBuyPrice: metrics.avgBuyPrice,
    costBasis: metrics.costBasis,
    realizedPnl: metrics.realizedPnl,
    unrealizedPnl: metrics.unrealizedPnl,
    totalPnl: metrics.totalPnl,
    roiPct: metrics.roiPct,
    totalFees: metrics.totalFees,
    currentValue: metrics.currentValue,
    updatedAt: serverTimestamp(),
  })

  return metrics
}

export async function updateInvestmentAlerts(
  investmentId: string,
  alerts: PriceAlertRule[],
): Promise<void> {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Usuario no autenticado')

  const sanitized = alerts
    .filter((alert) => alert.price > 0)
    .map((alert) => ({
      id: alert.id || `alert-${crypto.randomUUID()}`,
      type: alert.type,
      price: alert.price,
      active: alert.active,
      lastTriggeredAt: alert.lastTriggeredAt ?? null,
    }))

  await updateDoc(doc(db, INVESTMENTS_COLLECTION, investmentId), {
    alerts: sanitized,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteInvestment(investmentId: string): Promise<void> {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Usuario no autenticado')

  await deleteDoc(doc(db, INVESTMENTS_COLLECTION, investmentId))
}
