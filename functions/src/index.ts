import { type GoogleGenAI, GoogleGenAI as GoogleGenAIClass } from '@google/genai'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import * as logger from 'firebase-functions/logger'
import { defineSecret } from 'firebase-functions/params'
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https'
import { setGlobalOptions } from 'firebase-functions/v2/options'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onObjectFinalized } from 'firebase-functions/v2/storage'
import { z } from 'zod'

import { isPotentialAsset, parseTicketDate } from './lib/assetDetection'
import { findBestMatch, normalizeName, type InventoryCandidate } from './lib/normalize'

initializeApp()

setGlobalOptions({
  region: 'europe-west1',
  maxInstances: 10,
})

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY')
const FINNHUB_API_KEY = defineSecret('FINNHUB_API_KEY')
const GEMINI_MODEL = 'gemini-2.5-flash'

/* ── Schemas ── */

const conciergeRequestSchema = z.object({
  message: z.string().min(1).max(4000),
})

const voiceInventoryRequestSchema = z.object({
  transcript: z.string().min(1).max(500),
  locale: z.string().min(2).max(16).optional().default('es-ES'),
})

export const voiceInventoryCommandSchema = z.object({
  action: z.enum(['add', 'consume', 'delete', 'query']),
  item: z.string().min(1).max(120),
  quantity: z.number().min(0.01).max(500).optional().default(1),
  unit: z.enum(['ud', 'kg', 'g', 'l', 'ml']).nullable().optional(),
  confidence: z.number().min(0).max(1),
})

export type VoiceInventoryCommand = z.infer<typeof voiceInventoryCommandSchema>

export const ticketExtractionSchema = z.object({
  total: z.number().nullable().optional(),
  date: z.string().nullable().optional(),
  provider: z.string().nullable().optional(),
  category: z
    .enum(['food', 'tech', 'health', 'leisure', 'transport', 'home', 'other'])
    .optional(),
  items: z
    .array(
      z.object({
        name: z.string(),
        qty: z.number().optional().default(1),
        unit: z.string().optional().default('ud'),
        price: z.number().optional(),
      }),
    )
    .optional(),
  confidence: z.number().min(0).max(1).optional(),
  error: z.enum(['ILLEGIBLE', 'NO_TICKET', 'PARTIAL']).nullable().optional(),
})

export type TicketExtraction = z.infer<typeof ticketExtractionSchema>

export const investmentTransactionSchema = z.object({
  txId: z.string().min(1).max(120),
  type: z.enum(['buy', 'sell']),
  date: z.string().min(8).max(40),
  qty: z.number().positive(),
  price: z.number().positive(),
  fee: z.number().min(0).optional().default(0),
})

export type InvestmentTransactionInput = z.infer<typeof investmentTransactionSchema>

const investmentAlertSchema = z.object({
  id: z.string().min(1).max(120).optional(),
  type: z.enum(['above', 'below']),
  price: z.number().positive(),
  active: z.boolean().optional().default(true),
  lastTriggeredAt: z
    .custom<Timestamp | null>(
      (value) => value === null || value === undefined || value instanceof Timestamp,
    )
    .optional()
    .nullable(),
})

export type InvestmentAlert = z.infer<typeof investmentAlertSchema>

const upsertInvestmentTransactionRequestSchema = z.object({
  investmentId: z.string().min(1).max(120).optional(),
  symbol: z.string().min(1).max(64),
  displayTicker: z.string().min(1).max(32),
  type: z.enum(['crypto', 'stock', 'etf']),
  market: z.string().min(1).max(48),
  currency: z.enum(['EUR', 'USD']),
  transaction: investmentTransactionSchema,
})

const refreshPortfolioQuotesRequestSchema = z.object({
  investmentIds: z.array(z.string().min(1).max(120)).optional(),
  force: z.boolean().optional().default(false),
})

/* ── Gemini system prompt ── */

const TICKET_EXTRACTION_PROMPT = `
Eres un sistema experto en extracción de datos de tickets de compra españoles.
Analiza la imagen y devuelve ÚNICAMENTE un JSON válido con esta estructura:
{
  "total": <number en EUR o null>,
  "date": <"YYYY-MM-DD" o null>,
  "provider": <nombre del comercio o null>,
  "category": <"food"|"tech"|"health"|"leisure"|"transport"|"home"|"other">,
  "items": [
    { "name": <string>, "qty": <number>, "unit": <"ud"|"kg"|"g"|"l"|"ml">, "price": <number en EUR> }
  ],
  "confidence": <número 0.0 a 1.0>,
  "error": <"ILLEGIBLE"|"NO_TICKET"|"PARTIAL" o null>
}
Supermercados conocidos: Mercadona, Carrefour, Lidl, Aldi, Dia, El Corte Inglés, Amazon.
Si la imagen no es un ticket: confidence < 0.5, error = "NO_TICKET".
Si es ilegible: confidence < 0.5, error = "ILLEGIBLE".
Si es parcialmente legible: 0.5 ≤ confidence < 0.7, error = "PARTIAL".
Responde SOLO con el JSON, sin texto adicional ni bloques de código.
`.trim()

const LOW_CONFIDENCE_THRESHOLD = 0.7
const VOICE_COMMAND_MIN_CONFIDENCE = 0.6
const FINNHUB_TTL_MS = 15 * 60 * 1000
const FINNHUB_LIMIT_PER_MIN = 60
const PRICE_ALERT_DEDUPE_MS = 24 * 60 * 60 * 1000

const VOICE_TO_INVENTORY_PROMPT = `
Eres un parser de comandos de voz para inventario doméstico.
Debes devolver SOLO un JSON válido con este esquema exacto:
{
  "action": "add" | "consume" | "delete" | "query",
  "item": "string",
  "quantity": number,
  "unit": "ud" | "kg" | "g" | "l" | "ml" | null,
  "confidence": number
}
Reglas:
- Frases como "he terminado", "se acabó", "ya no queda" implican action="consume".
- Frases como "añade", "agrega", "compra", "sumar" implican action="add".
- Frases como "borra", "elimina", "quitar del inventario" implican action="delete".
- Preguntas como "cuánto queda" o "tengo" implican action="query".
- Si no se especifica cantidad, usa 1.
- Si no se puede inferir unidad, usa "ud".
- confidence debe estar entre 0 y 1.
- No incluyas texto fuera del JSON.
`.trim()

/* ── Auth helper ── */

async function verifyUidFromBearerHeader(authHeader?: string): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null
  const idToken = authHeader.slice('Bearer '.length).trim()
  if (!idToken) return null
  try {
    const decoded = await getAuth().verifyIdToken(idToken)
    return decoded.uid
  } catch (error) {
    logger.warn('Invalid auth token in request', error)
    return null
  }
}

/* ── Gemini client ── */

function buildGeminiClient(): GoogleGenAI {
  return new GoogleGenAIClass({ apiKey: GEMINI_API_KEY.value() })
}

/* ── Investments helpers ── */

interface StoredInvestmentTransaction {
  txId: string
  type: 'buy' | 'sell'
  date: Timestamp
  qty: number
  price: number
  fee: number
}

interface InvestmentDocData {
  uid: string
  symbol: string
  displayTicker: string
  type: 'crypto' | 'stock' | 'etf'
  market: string
  currency: 'EUR' | 'USD'
  transactions: StoredInvestmentTransaction[]
  alerts: InvestmentAlert[]
  currentPrice: number | null
  priceUpdatedAt: Timestamp | null
  stalePrice: boolean
  quantity: number
  avgBuyPrice: number
  costBasis: number
  realizedPnl: number
  unrealizedPnl: number
  totalPnl: number
  roiPct: number
  totalFees: number
  currentValue: number
}

interface InvestmentMetrics {
  quantity: number
  avgBuyPrice: number
  costBasis: number
  realizedPnl: number
  unrealizedPnl: number
  totalPnl: number
  roiPct: number
  totalFees: number
  currentValue: number
}

interface RateLimitInfo {
  used: number
  remaining: number
  windowKey: string
  allowed: boolean
}

interface QuoteResolution {
  symbol: string
  price: number | null
  currency: 'USD' | 'EUR'
  stale: boolean
  source: 'cache' | 'finnhub' | 'stale-fallback'
  priceUpdatedAt: Timestamp | null
  error?: 'NOT_FOUND' | 'RATE_LIMIT' | 'UPSTREAM_ERROR'
  rateLimit?: RateLimitInfo
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function ensureTimestamp(value: unknown): Timestamp {
  if (value instanceof Timestamp) return value
  return Timestamp.now()
}

function normalizeCurrency(value: unknown): 'EUR' | 'USD' {
  return value === 'EUR' ? 'EUR' : 'USD'
}

function normalizeInvestmentType(value: unknown): 'crypto' | 'stock' | 'etf' {
  if (value === 'crypto' || value === 'stock' || value === 'etf') return value
  return 'stock'
}

function normalizeAlert(data: unknown): InvestmentAlert | null {
  const parsed = investmentAlertSchema.safeParse(data)
  if (!parsed.success) return null
  return parsed.data
}

function normalizeStoredTransactions(data: unknown): StoredInvestmentTransaction[] {
  if (!Array.isArray(data)) return []
  const transactions: StoredInvestmentTransaction[] = []
  for (const raw of data) {
    if (!raw || typeof raw !== 'object') continue
    const row = raw as Record<string, unknown>
    const txId = typeof row.txId === 'string' ? row.txId : ''
    const type = row.type === 'sell' ? 'sell' : row.type === 'buy' ? 'buy' : null
    if (!txId || !type) continue
    const qty = asNumber(row.qty, 0)
    const price = asNumber(row.price, 0)
    if (qty <= 0 || price <= 0) continue
    transactions.push({
      txId,
      type,
      date: ensureTimestamp(row.date),
      qty,
      price,
      fee: asNumber(row.fee, 0),
    })
  }
  return transactions.sort((a, b) => a.date.toMillis() - b.date.toMillis())
}

function parseInvestmentDoc(
  uid: string,
  symbol: string,
  displayTicker: string,
  type: 'crypto' | 'stock' | 'etf',
  market: string,
  currency: 'EUR' | 'USD',
  data?: FirebaseFirestore.DocumentData,
): InvestmentDocData {
  const row = data ?? {}
  const alertsRaw = Array.isArray(row.alerts) ? row.alerts : []
  const alerts = alertsRaw
    .map((alert) => normalizeAlert(alert))
    .filter((alert): alert is InvestmentAlert => alert !== null)

  return {
    uid,
    symbol,
    displayTicker,
    type,
    market,
    currency,
    transactions: normalizeStoredTransactions(row.transactions),
    alerts,
    currentPrice: typeof row.currentPrice === 'number' ? row.currentPrice : null,
    priceUpdatedAt: row.priceUpdatedAt instanceof Timestamp ? row.priceUpdatedAt : null,
    stalePrice: row.stalePrice === true,
    quantity: asNumber(row.quantity),
    avgBuyPrice: asNumber(row.avgBuyPrice),
    costBasis: asNumber(row.costBasis),
    realizedPnl: asNumber(row.realizedPnl),
    unrealizedPnl: asNumber(row.unrealizedPnl),
    totalPnl: asNumber(row.totalPnl),
    roiPct: asNumber(row.roiPct),
    totalFees: asNumber(row.totalFees),
    currentValue: asNumber(row.currentValue),
  }
}

export function buildRateLimitWindowKey(now: Date = new Date()): string {
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  const h = String(now.getUTCHours()).padStart(2, '0')
  const min = String(now.getUTCMinutes()).padStart(2, '0')
  return `${y}${m}${d}${h}${min}`
}

export function isRateLimitExceeded(used: number): boolean {
  return used > FINNHUB_LIMIT_PER_MIN
}

export function isQuoteCacheFresh(fetchedAt: Timestamp, nowMs = Date.now()): boolean {
  return nowMs - fetchedAt.toMillis() < FINNHUB_TTL_MS
}

export function buildStaleFallbackQuote(input: {
  symbol: string
  price: number | null
  currency: 'EUR' | 'USD'
  priceUpdatedAt: Timestamp | null
  error?: 'NOT_FOUND' | 'RATE_LIMIT' | 'UPSTREAM_ERROR'
  rateLimit?: RateLimitInfo
}): QuoteResolution {
  return {
    symbol: input.symbol,
    price: input.price,
    currency: input.currency,
    stale: true,
    source: 'stale-fallback',
    priceUpdatedAt: input.priceUpdatedAt,
    error: input.error,
    rateLimit: input.rateLimit,
  }
}

export function buildRateLimitedFallbackQuote(input: {
  symbol: string
  price: number | null
  currency: 'EUR' | 'USD'
  priceUpdatedAt: Timestamp | null
  rateLimit: RateLimitInfo
}): QuoteResolution {
  return buildStaleFallbackQuote({
    symbol: input.symbol,
    price: input.price,
    currency: input.currency,
    priceUpdatedAt: input.priceUpdatedAt,
    error: 'RATE_LIMIT',
    rateLimit: input.rateLimit,
  })
}

export function buildSymbolKey(symbol: string): string {
  const normalized = symbol.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  return normalized || 'unknown'
}

export function computeInvestmentMetrics(
  transactions: StoredInvestmentTransaction[],
  currentPrice: number | null,
): InvestmentMetrics {
  let quantity = 0
  let costBasis = 0
  let realizedPnl = 0
  let totalFees = 0
  let buyCapital = 0

  for (const tx of [...transactions].sort((a, b) => a.date.toMillis() - b.date.toMillis())) {
    const fee = tx.fee ?? 0
    totalFees += fee

    if (tx.type === 'buy') {
      const txCost = tx.qty * tx.price + fee
      quantity += tx.qty
      costBasis += txCost
      buyCapital += txCost
      continue
    }

    if (tx.qty > quantity + 1e-9) {
      throw new Error('SELL_EXCEEDS_POSITION')
    }

    const avgCost = quantity > 0 ? costBasis / quantity : 0
    const soldCost = avgCost * tx.qty
    const proceeds = tx.qty * tx.price - fee
    realizedPnl += proceeds - soldCost
    quantity -= tx.qty
    costBasis -= soldCost

    if (quantity <= 1e-9) {
      quantity = 0
      costBasis = 0
    }
  }

  const avgBuyPrice = quantity > 0 ? costBasis / quantity : 0
  const currentValue = currentPrice !== null ? quantity * currentPrice : 0
  const unrealizedPnl = currentPrice !== null ? currentValue - costBasis : 0
  const totalPnl = realizedPnl + unrealizedPnl
  const roiPct = buyCapital > 0 ? (totalPnl / buyCapital) * 100 : 0

  return {
    quantity,
    avgBuyPrice,
    costBasis,
    realizedPnl,
    unrealizedPnl,
    totalPnl,
    roiPct,
    totalFees,
    currentValue,
  }
}

export function appendTransactionIfMissing(
  transactions: StoredInvestmentTransaction[],
  next: StoredInvestmentTransaction,
): { transactions: StoredInvestmentTransaction[]; added: boolean } {
  if (transactions.some((tx) => tx.txId === next.txId)) {
    return { transactions: [...transactions], added: false }
  }
  return {
    transactions: [...transactions, next].sort((a, b) => a.date.toMillis() - b.date.toMillis()),
    added: true,
  }
}

export function calculateNetworthTotals(input: {
  investments: number
  assets: number
  liquidCash: number
  debts: number
}): { totalValue: number; breakdown: { liquid: number; investments: number; physicalAssets: number; debts: number } } {
  const totalValue = input.investments + input.assets + input.liquidCash - input.debts
  return {
    totalValue,
    breakdown: {
      liquid: input.liquidCash,
      investments: input.investments,
      physicalAssets: input.assets,
      debts: input.debts,
    },
  }
}

async function consumeFinnhubRateLimit(
  db: FirebaseFirestore.Firestore,
): Promise<RateLimitInfo> {
  const now = new Date()
  const windowKey = buildRateLimitWindowKey(now)
  const ref = db.collection('_sys_rate_limits').doc(`finnhub_${windowKey}`)

  let used = 0
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const current = snap.exists ? asNumber(snap.data()?.used, 0) : 0
    used = current + 1
    tx.set(
      ref,
      {
        provider: 'finnhub',
        windowKey,
        used,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: snap.exists ? snap.data()?.createdAt ?? FieldValue.serverTimestamp() : FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
  })

  return {
    used,
    remaining: Math.max(0, FINNHUB_LIMIT_PER_MIN - used),
    windowKey,
    allowed: !isRateLimitExceeded(used),
  }
}

async function fetchFinnhubPrice(symbol: string): Promise<{ price: number | null; error?: 'NOT_FOUND' | 'RATE_LIMIT' | 'UPSTREAM_ERROR'; status?: number }> {
  try {
    const token = FINNHUB_API_KEY.value()
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(token)}`
    const response = await fetch(url)
    if (!response.ok) {
      return {
        price: null,
        error:
          response.status === 404
            ? 'NOT_FOUND'
            : response.status === 429
              ? 'RATE_LIMIT'
              : 'UPSTREAM_ERROR',
        status: response.status,
      }
    }

    const payload = (await response.json()) as { c?: unknown }
    const current = asNumber(payload.c, NaN)
    if (!Number.isFinite(current) || current <= 0) {
      return { price: null, error: 'NOT_FOUND', status: response.status }
    }

    return { price: current }
  } catch {
    return { price: null, error: 'UPSTREAM_ERROR', status: undefined }
  }
}

async function resolveQuoteForSymbol(
  db: FirebaseFirestore.Firestore,
  symbol: string,
  force: boolean,
): Promise<QuoteResolution> {
  const symbolKey = buildSymbolKey(symbol)
  const cacheRef = db.collection('market_quotes').doc(symbolKey)
  const cacheSnap = await cacheRef.get()
  const cacheData = cacheSnap.data()
  const cachePrice = cacheData && typeof cacheData.price === 'number' ? cacheData.price : null
  const cacheFetchedAt = cacheData?.fetchedAt instanceof Timestamp ? cacheData.fetchedAt : null
  const cacheCurrency = normalizeCurrency(cacheData?.currency)

  if (!force && cachePrice !== null && cacheFetchedAt && isQuoteCacheFresh(cacheFetchedAt)) {
    return {
      symbol,
      price: cachePrice,
      currency: cacheCurrency,
      stale: false,
      source: 'cache',
      priceUpdatedAt: cacheFetchedAt,
    }
  }

  const rateLimit = await consumeFinnhubRateLimit(db)
  if (!rateLimit.allowed) {
    return buildRateLimitedFallbackQuote({
      symbol,
      price: cachePrice,
      currency: cacheCurrency,
      priceUpdatedAt: cacheFetchedAt,
      rateLimit,
    })
  }

  const upstream = await fetchFinnhubPrice(symbol)
  if (upstream.price !== null) {
    const fetchedAt = Timestamp.now()
    await cacheRef.set(
      {
        symbol,
        symbolKey,
        price: upstream.price,
        currency: 'USD',
        fetchedAt,
        source: 'finnhub',
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
    return {
      symbol,
      price: upstream.price,
      currency: 'USD',
      stale: false,
      source: 'finnhub',
      priceUpdatedAt: fetchedAt,
      rateLimit,
    }
  }

  if (cachePrice !== null) {
    return buildStaleFallbackQuote({
      symbol,
      price: cachePrice,
      currency: cacheCurrency,
      priceUpdatedAt: cacheFetchedAt,
      error: upstream.error,
      rateLimit,
    })
  }

  return buildStaleFallbackQuote({
    symbol,
    price: null,
    currency: cacheCurrency,
    priceUpdatedAt: cacheFetchedAt,
    error: upstream.error,
    rateLimit,
  })
}

function shouldTriggerPriceAlert(
  alert: InvestmentAlert,
  price: number,
  nowMs: number,
): boolean {
  if (!alert.active) return false
  if (alert.type === 'above' && price < alert.price) return false
  if (alert.type === 'below' && price > alert.price) return false
  if (alert.lastTriggeredAt instanceof Timestamp) {
    if (nowMs - alert.lastTriggeredAt.toMillis() < PRICE_ALERT_DEDUPE_MS) return false
  }
  return true
}

/* ── Ticket pipeline helpers ── */

/**
 * Calls Gemini Vision with the image and returns a parsed TicketExtraction.
 * Throws on network/API failure so callers can write an error alert.
 */
export async function callGeminiForTicket(
  client: GoogleGenAI,
  imageBase64: string,
  mimeType: string,
): Promise<TicketExtraction> {
  const response = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: imageBase64 } },
          { text: TICKET_EXTRACTION_PROMPT },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      temperature: 0.1,
    },
  })

  const raw = response.text ?? ''
  const parsed: unknown = JSON.parse(raw)
  return ticketExtractionSchema.parse(parsed)
}

/**
 * Parses one natural-language voice command into a structured inventory intent.
 */
export async function callGeminiForVoiceCommand(
  client: GoogleGenAI,
  transcript: string,
  locale: string,
): Promise<VoiceInventoryCommand> {
  const response = await client.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          {
            text:
              `${VOICE_TO_INVENTORY_PROMPT}\n` +
              `Locale: ${locale}\n` +
              `Comando del usuario: ${transcript}`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      temperature: 0.1,
    },
  })

  const raw = response.text ?? ''
  const parsed: unknown = JSON.parse(raw)
  return voiceInventoryCommandSchema.parse(parsed)
}

function readInventoryQty(data: FirebaseFirestore.DocumentData): number {
  const raw =
    typeof data.qty === 'number'
      ? data.qty
      : typeof data.quantity === 'number'
        ? data.quantity
        : 0

  return Number.isFinite(raw) && raw > 0 ? raw : 0
}

interface VoiceInventoryResult {
  status:
    | 'created'
    | 'updated'
    | 'consumed'
    | 'depleted'
    | 'deleted'
    | 'found'
    | 'not_found'
  itemName: string
  remainingQuantity: number | null
  unit: string | null
}

/**
 * Applies a parsed voice command over the user's inventory.
 */
async function applyVoiceCommandToInventory(
  db: FirebaseFirestore.Firestore,
  uid: string,
  command: VoiceInventoryCommand,
): Promise<VoiceInventoryResult> {
  const itemQuery = await db.collection('inventory').where('uid', '==', uid).limit(500).get()

  const candidates: InventoryCandidate[] = itemQuery.docs.map((doc) => ({
    id: doc.id,
    normalizedName: (doc.data().normalizedName as string) ?? normalizeName(doc.data().name as string),
  }))

  const match = findBestMatch(command.item, candidates)
  const qty = command.quantity ?? 1

  if (command.action === 'add') {
    if (match) {
      const docRef = db.collection('inventory').doc(match.id)
      const snap = await docRef.get()
      const data = snap.data() ?? {}
      const currentUnit =
        typeof data.unit === 'string' && data.unit.length > 0 ? (data.unit as string) : null
      const finalUnit = command.unit ?? currentUnit
      const newQty = readInventoryQty(data) + qty

      await docRef.update({
        qty: FieldValue.increment(qty),
        quantity: FieldValue.increment(qty),
        ...(finalUnit ? { unit: finalUnit } : {}),
        dataOrigin: 'voice',
        updatedAt: FieldValue.serverTimestamp(),
      })

      return {
        status: 'updated',
        itemName: (data.name as string) ?? command.item,
        remainingQuantity: newQty,
        unit: finalUnit,
      }
    }

    const normalizedName = normalizeName(command.item)
    const unit = command.unit ?? 'ud'

    await db.collection('inventory').add({
      uid,
      name: command.item,
      normalizedName,
      qty,
      quantity: qty,
      unit,
      dataOrigin: 'voice',
      category: 'other',
      lastPrice: null,
      priceHistory: [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    return {
      status: 'created',
      itemName: command.item,
      remainingQuantity: qty,
      unit,
    }
  }

  if (!match) {
    return {
      status: 'not_found',
      itemName: command.item,
      remainingQuantity: null,
      unit: command.unit ?? null,
    }
  }

  const docRef = db.collection('inventory').doc(match.id)
  const snap = await docRef.get()
  const data = snap.data() ?? {}
  const itemName = (data.name as string) ?? command.item
  const unit = (data.unit as string | undefined) ?? command.unit ?? null

  if (command.action === 'delete') {
    await docRef.delete()
    return {
      status: 'deleted',
      itemName,
      remainingQuantity: null,
      unit,
    }
  }

  const currentQty = readInventoryQty(data)

  if (command.action === 'query') {
    return {
      status: 'found',
      itemName,
      remainingQuantity: currentQty,
      unit,
    }
  }

  const newQty = Math.max(0, currentQty - qty)
  await docRef.update({
    qty: newQty,
    quantity: newQty,
    dataOrigin: 'voice',
    updatedAt: FieldValue.serverTimestamp(),
  })

  return {
    status: newQty === 0 ? 'depleted' : 'consumed',
    itemName,
    remainingQuantity: newQty,
    unit,
  }
}

/**
 * Writes a MANUAL_ENTRY_NEEDED alert so the user can fill in the ticket manually.
 */
async function writeManualEntryAlert(
  db: FirebaseFirestore.Firestore,
  uid: string,
  sourcePath: string,
  reason: string,
): Promise<void> {
  await db.collection('alerts').add({
    uid,
    type: 'manual_entry',
    title: 'Ticket requiere revisión manual',
    body: reason,
    relatedId: sourcePath,
    severity: 'warning',
    read: false,
    scheduledFor: Timestamp.now(),
    createdAt: FieldValue.serverTimestamp(),
  })
}

/**
 * Writes one expense document from a validated TicketExtraction.
 */
async function writeExpense(
  db: FirebaseFirestore.Firestore,
  uid: string,
  data: TicketExtraction,
  sourcePath: string,
): Promise<string> {
  const ticketDate = parseTicketDate(data.date ?? null)
  const ref = await db.collection('expenses').add({
    uid,
    provider: data.provider ?? 'Desconocido',
    category: data.category ?? 'other',
    total: data.total ?? 0,
    date: ticketDate ? Timestamp.fromDate(ticketDate) : Timestamp.now(),
    items: data.items ?? [],
    dataOrigin: 'camera',
    confidence: data.confidence ?? 0,
    sourceFile: sourcePath,
    potentialAsset: isPotentialAsset(data.category, data.total ?? undefined),
    createdAt: FieldValue.serverTimestamp(),
  })
  return ref.id
}

/**
 * Upserts each extracted item into the user's inventory.
 * Uses fuzzy name matching to avoid duplicates.
 */
async function upsertInventoryItems(
  db: FirebaseFirestore.Firestore,
  uid: string,
  data: TicketExtraction,
): Promise<void> {
  const items = data.items ?? []
  if (items.length === 0) return

  // Fetch all existing inventory entries for this user (up to 500).
  const snap = await db
    .collection('inventory')
    .where('uid', '==', uid)
    .limit(500)
    .get()

  const candidates: InventoryCandidate[] = snap.docs.map((doc) => ({
    id: doc.id,
    normalizedName: (doc.data().normalizedName as string) ?? normalizeName(doc.data().name as string),
  }))

  const priceHistory = {
    price: data.total ?? 0,
    date: Timestamp.now(),
    provider: data.provider ?? 'Desconocido',
  }

  for (const item of items) {
    const match = findBestMatch(item.name, candidates)

    if (match) {
      // Update existing: increment qty, update last price and history
      await db
        .collection('inventory')
        .doc(match.id)
        .update({
          qty: FieldValue.increment(item.qty ?? 1),
          lastPrice: item.price ?? FieldValue.delete(),
          priceHistory: FieldValue.arrayUnion(priceHistory),
          lastPurchased: Timestamp.now(),
          updatedAt: FieldValue.serverTimestamp(),
        })
    } else {
      // Create new inventory entry
      const normalized = normalizeName(item.name)
      const newDoc = await db.collection('inventory').add({
        uid,
        name: item.name,
        normalizedName: normalized,
        qty: item.qty ?? 1,
        unit: item.unit ?? 'ud',
        lastPrice: item.price ?? null,
        priceHistory: [priceHistory],
        lastPurchased: Timestamp.now(),
        category: data.category ?? 'other',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      // Add to candidates so subsequent items in the same ticket can match
      candidates.push({ id: newDoc.id, normalizedName: normalized })
    }
  }
}

/**
 * Writes a potential-asset alert when a high-value tech/home item is detected.
 */
async function writePotentialAssetAlert(
  db: FirebaseFirestore.Firestore,
  uid: string,
  data: TicketExtraction,
  expenseId: string,
): Promise<void> {
  await db.collection('alerts').add({
    uid,
    type: 'potential_asset',
    title: '¿Registrar como activo patrimonial?',
    body: `Se detectó un gasto de ${data.total?.toFixed(2) ?? '?'} € en ${data.provider ?? 'un comercio'} (${data.category}). ¿Quieres registrarlo como activo?`,
    relatedId: expenseId,
    severity: 'info',
    read: false,
    scheduledFor: Timestamp.now(),
    createdAt: FieldValue.serverTimestamp(),
  })
}

/* ─────────────────────────────────────────────────────────────────────────
   Cloud Functions
   ───────────────────────────────────────────────────────────────────────── */

export const healthCheck = onRequest(
  { cors: true, secrets: [FINNHUB_API_KEY] },
  (_req, res) => {
    res.status(200).json({
      ok: true,
      service: 'centrate-functions',
      priceProvider: 'finnhub',
      hasPriceProvider: Boolean(FINNHUB_API_KEY.value()),
      timestamp: new Date().toISOString(),
    })
  },
)

export const upsertInvestmentTransaction = onCall(
  { timeoutSeconds: 60, memory: '512MiB' },
  async (request) => {
    const uid = request.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'UNAUTHORIZED')

    const parsed = upsertInvestmentTransactionRequestSchema.safeParse(request.data)
    if (!parsed.success) {
      throw new HttpsError('invalid-argument', 'INVALID_PAYLOAD', {
        issues: parsed.error.issues,
      })
    }

    const payload = parsed.data
    const db = getFirestore()
    const investmentsCol = db.collection('investments')

    let existingDoc: FirebaseFirestore.DocumentSnapshot | FirebaseFirestore.QueryDocumentSnapshot | null = null
    if (payload.investmentId) {
      existingDoc = await investmentsCol.doc(payload.investmentId).get()
    } else {
      const bySymbol = await investmentsCol
        .where('uid', '==', uid)
        .where('symbol', '==', payload.symbol)
        .limit(1)
        .get()
      existingDoc = bySymbol.empty ? null : bySymbol.docs[0]
    }
    const existingRow = existingDoc?.data()
    if (existingRow?.uid && existingRow.uid !== uid) {
      throw new HttpsError('permission-denied', 'FORBIDDEN')
    }

    const investmentRef =
      existingDoc
        ? investmentsCol.doc(existingDoc.id)
        : investmentsCol.doc()

    const existingData = parseInvestmentDoc(
      uid,
      payload.symbol,
      payload.displayTicker,
      payload.type,
      payload.market,
      payload.currency,
      existingRow,
    )

    const txDate = new Date(payload.transaction.date)
    if (!Number.isFinite(txDate.getTime())) {
      throw new HttpsError('invalid-argument', 'INVALID_TRANSACTION_DATE')
    }

    const appendResult = appendTransactionIfMissing(existingData.transactions, {
      txId: payload.transaction.txId,
      type: payload.transaction.type,
      date: Timestamp.fromDate(txDate),
      qty: payload.transaction.qty,
      price: payload.transaction.price,
      fee: payload.transaction.fee ?? 0,
    })
    const nextTransactions = appendResult.transactions

    let metrics: InvestmentMetrics
    try {
      metrics = computeInvestmentMetrics(nextTransactions, existingData.currentPrice)
    } catch (error) {
      const err = error as Error
      if (err.message === 'SELL_EXCEEDS_POSITION') {
        throw new HttpsError('failed-precondition', 'SELL_EXCEEDS_POSITION')
      }
      throw new HttpsError('internal', 'METRICS_FAILED')
    }

    await investmentRef.set(
      {
        uid,
        symbol: payload.symbol,
        displayTicker: payload.displayTicker,
        type: payload.type,
        market: payload.market,
        currency: payload.currency,
        transactions: nextTransactions,
        alerts: existingData.alerts,
        currentPrice: existingData.currentPrice,
        priceUpdatedAt: existingData.priceUpdatedAt,
        stalePrice: existingData.stalePrice,
        quantity: metrics.quantity,
        avgBuyPrice: metrics.avgBuyPrice,
        costBasis: metrics.costBasis,
        realizedPnl: metrics.realizedPnl,
        unrealizedPnl: metrics.unrealizedPnl,
        totalPnl: metrics.totalPnl,
        roiPct: metrics.roiPct,
        totalFees: metrics.totalFees,
        currentValue: metrics.currentValue,
        createdAt: existingRow?.createdAt ?? FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )

    logger.info('Investment transaction upserted', {
      uid,
      investmentId: investmentRef.id,
      txId: payload.transaction.txId,
      txType: payload.transaction.type,
      added: appendResult.added,
    })

    return {
      ok: true,
      investmentId: investmentRef.id,
      position: {
        quantity: metrics.quantity,
        avgBuyPrice: metrics.avgBuyPrice,
        costBasis: metrics.costBasis,
        realizedPnl: metrics.realizedPnl,
        unrealizedPnl: metrics.unrealizedPnl,
        totalPnl: metrics.totalPnl,
        roiPct: metrics.roiPct,
      },
    }
  },
)

export const refreshPortfolioQuotes = onCall(
  { secrets: [FINNHUB_API_KEY], timeoutSeconds: 120, memory: '1GiB' },
  async (request) => {
    const uid = request.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'UNAUTHORIZED')

    const parsed = refreshPortfolioQuotesRequestSchema.safeParse(request.data)
    if (!parsed.success) {
      throw new HttpsError('invalid-argument', 'INVALID_PAYLOAD', {
        issues: parsed.error.issues,
      })
    }

    const { investmentIds, force } = parsed.data
    const db = getFirestore()
    let investmentsSnap: FirebaseFirestore.QuerySnapshot

    if (investmentIds && investmentIds.length > 0) {
      const docs = await Promise.all(
        investmentIds.map((id) => db.collection('investments').doc(id).get()),
      )
      const validDocs = docs.filter((doc) => doc.exists && doc.data()?.uid === uid)
      investmentsSnap = {
        docs: validDocs,
      } as unknown as FirebaseFirestore.QuerySnapshot
    } else {
      investmentsSnap = await db.collection('investments').where('uid', '==', uid).get()
    }

    if (investmentsSnap.docs.length === 0) {
      return {
        ok: true,
        refreshedAt: new Date().toISOString(),
        rateLimit: { used: 0, remaining: FINNHUB_LIMIT_PER_MIN, windowKey: buildRateLimitWindowKey() },
        quotes: [],
        alertsTriggered: [],
      }
    }

    const uniqueSymbols = new Set<string>()
    for (const doc of investmentsSnap.docs) {
      const symbol = doc.data().symbol
      if (typeof symbol === 'string' && symbol.length > 0) {
        uniqueSymbols.add(symbol)
      }
    }

    const quoteMap = new Map<string, QuoteResolution>()
    let latestRateLimit: RateLimitInfo = {
      used: 0,
      remaining: FINNHUB_LIMIT_PER_MIN,
      windowKey: buildRateLimitWindowKey(),
      allowed: true,
    }

    for (const symbol of uniqueSymbols) {
      const resolution = await resolveQuoteForSymbol(db, symbol, force ?? false)
      quoteMap.set(symbol, resolution)
      if (resolution.rateLimit && resolution.rateLimit.used >= latestRateLimit.used) {
        latestRateLimit = resolution.rateLimit
      }
    }

    const now = Timestamp.now()
    const nowMs = Date.now()
    const quotes: Array<{
      investmentId: string
      symbol: string
      price: number | null
      currency: 'EUR' | 'USD'
      stale: boolean
      source: 'cache' | 'finnhub' | 'stale-fallback'
      priceUpdatedAt: string | null
      error?: 'NOT_FOUND' | 'RATE_LIMIT' | 'UPSTREAM_ERROR'
    }> = []
    const alertsTriggered: Array<{ investmentId: string; type: 'above' | 'below'; threshold: number }> = []

    let totalValue = 0
    let totalCostBasis = 0
    let totalUnrealized = 0
    let totalRealized = 0
    const byType: Record<'crypto' | 'stock' | 'etf', number> = {
      crypto: 0,
      stock: 0,
      etf: 0,
    }

    for (const doc of investmentsSnap.docs) {
      const data = doc.data()
      const symbol = typeof data.symbol === 'string' ? data.symbol : ''
      if (!symbol) continue

      const quote = quoteMap.get(symbol)
      if (!quote) continue

      const parsedInvestment = parseInvestmentDoc(
        uid,
        symbol,
        typeof data.displayTicker === 'string' ? data.displayTicker : symbol,
        normalizeInvestmentType(data.type),
        typeof data.market === 'string' ? data.market : 'UNKNOWN',
        normalizeCurrency(data.currency),
        data,
      )

      let metrics: InvestmentMetrics
      try {
        metrics = computeInvestmentMetrics(parsedInvestment.transactions, quote.price)
      } catch (error) {
        const err = error as Error
        if (err.message === 'SELL_EXCEEDS_POSITION') {
          logger.warn('Skipping invalid investment due oversell state', {
            uid,
            investmentId: doc.id,
          })
          continue
        }
        throw error
      }

      const nextAlerts: InvestmentAlert[] = parsedInvestment.alerts.map((alert) => ({ ...alert }))
      if (quote.price !== null) {
        for (let i = 0; i < nextAlerts.length; i += 1) {
          const alert = nextAlerts[i]
          if (!shouldTriggerPriceAlert(alert, quote.price, nowMs)) continue

          nextAlerts[i] = {
            ...alert,
            lastTriggeredAt: now,
          }

          alertsTriggered.push({
            investmentId: doc.id,
            type: alert.type,
            threshold: alert.price,
          })

          await db.collection('alerts').add({
            uid,
            type: 'price',
            title:
              alert.type === 'above'
                ? `${parsedInvestment.displayTicker} superó ${alert.price}`
                : `${parsedInvestment.displayTicker} cayó por debajo de ${alert.price}`,
            body: `Precio actual: ${quote.price.toFixed(2)} ${parsedInvestment.currency}.`,
            relatedId: doc.id,
            severity: 'info',
            read: false,
            scheduledFor: now,
            createdAt: FieldValue.serverTimestamp(),
            thresholdType: alert.type,
            thresholdValue: alert.price,
            symbol,
          })
        }
      }

      await db.collection('investments').doc(doc.id).set(
        {
          currentPrice: quote.price,
          priceUpdatedAt: quote.priceUpdatedAt ?? parsedInvestment.priceUpdatedAt ?? now,
          stalePrice: quote.stale,
          quantity: metrics.quantity,
          avgBuyPrice: metrics.avgBuyPrice,
          costBasis: metrics.costBasis,
          realizedPnl: metrics.realizedPnl,
          unrealizedPnl: metrics.unrealizedPnl,
          totalPnl: metrics.totalPnl,
          roiPct: metrics.roiPct,
          totalFees: metrics.totalFees,
          currentValue: metrics.currentValue,
          alerts: nextAlerts,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )

      totalValue += metrics.currentValue
      totalCostBasis += metrics.costBasis
      totalUnrealized += metrics.unrealizedPnl
      totalRealized += metrics.realizedPnl
      byType[parsedInvestment.type] += metrics.currentValue

      quotes.push({
        investmentId: doc.id,
        symbol,
        price: quote.price,
        currency: parsedInvestment.currency,
        stale: quote.stale,
        source: quote.source,
        priceUpdatedAt: quote.priceUpdatedAt ? quote.priceUpdatedAt.toDate().toISOString() : null,
        error: quote.error,
      })
    }

    const roiPct = totalCostBasis > 0 ? ((totalRealized + totalUnrealized) / totalCostBasis) * 100 : 0
    await db.collection('portfolio_snapshots').add({
      uid,
      timestamp: now,
      totalValue,
      totalCostBasis,
      unrealizedPnl: totalUnrealized,
      realizedPnl: totalRealized,
      roiPct,
      byType,
      createdAt: FieldValue.serverTimestamp(),
    })

    return {
      ok: true,
      refreshedAt: new Date().toISOString(),
      rateLimit: {
        used: latestRateLimit.used,
        remaining: latestRateLimit.remaining,
        windowKey: latestRateLimit.windowKey,
      },
      quotes,
      alertsTriggered,
    }
  },
)

/* ── Concierge context builder ── */

interface ConciergeSummary {
  expensesThisMonth: number
  expenseCount: number
  topCategories: Array<{ category: string; total: number }>
  subscriptionsMonthly: number
  subscriptionsCount: number
  upcomingCharges: Array<{ provider: string; amount: number; daysLeft: number }>
  inventoryLowStock: Array<{ name: string; qty: number; unit: string }>
  inventoryExpiring: Array<{ name: string; expiryDate: string }>
  assetAlerts: Array<{ title: string; body: string; severity: string }>
  investmentsTotalValue: number
  investmentsPnl: number
  investmentsRoiPct: number
  netWorthApprox: number
}

async function buildUserContext(uid: string, db: FirebaseFirestore.Firestore): Promise<ConciergeSummary> {
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  // Parallel fetches
  const [expensesSnap, subscriptionsSnap, inventorySnap, assetsSnap, maintenanceSnap, investmentsSnap] =
    await Promise.all([
      db
        .collection('expenses')
        .where('uid', '==', uid)
        .where('date', '>=', Timestamp.fromDate(firstOfMonth))
        .limit(200)
        .get(),
      db.collection('expenses').where('uid', '==', uid).where('isSubscription', '==', true).limit(50).get(),
      db.collection('inventory').where('uid', '==', uid).limit(100).get(),
      db.collection('assets').where('uid', '==', uid).limit(50).get(),
      db.collection('asset_maintenance').where('uid', '==', uid).limit(100).get(),
      db.collection('investments').where('uid', '==', uid).limit(30).get(),
    ])

  // ── Expenses ──
  let expensesThisMonth = 0
  const catTotals: Record<string, number> = {}
  for (const doc of expensesSnap.docs) {
    const d = doc.data()
    const amount = asNumber(d.amount, 0)
    expensesThisMonth += amount
    const cat = typeof d.category === 'string' ? d.category : 'other'
    catTotals[cat] = (catTotals[cat] ?? 0) + amount
  }
  const topCategories = Object.entries(catTotals)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 4)

  // ── Subscriptions ──
  let subscriptionsMonthly = 0
  const upcomingCharges: ConciergeSummary['upcomingCharges'] = []
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
  for (const doc of subscriptionsSnap.docs) {
    const d = doc.data()
    if (d.status === 'cancelled') continue
    const amount = asNumber(d.amount, 0)
    const freq = typeof d.billingCycle === 'string' ? d.billingCycle : 'monthly'
    const monthly = freq === 'yearly' ? amount / 12 : freq === 'weekly' ? amount * 4.33 : amount
    subscriptionsMonthly += monthly
    if (d.nextPaymentDate) {
      const dueMs = d.nextPaymentDate.toDate().getTime() - Date.now()
      if (dueMs >= 0 && dueMs <= sevenDaysMs) {
        upcomingCharges.push({
          provider: typeof d.provider === 'string' ? d.provider : 'Suscripción',
          amount,
          daysLeft: Math.ceil(dueMs / 86400000),
        })
      }
    }
  }

  // ── Inventory ──
  const inventoryLowStock: ConciergeSummary['inventoryLowStock'] = []
  const inventoryExpiring: ConciergeSummary['inventoryExpiring'] = []
  const cutoff7d = Date.now() + 7 * 86400000
  for (const doc of inventorySnap.docs) {
    const d = doc.data()
    const qty = asNumber(d.qty, 0)
    const minQty = asNumber(d.minimumQty, 0)
    if (qty <= minQty) {
      inventoryLowStock.push({
        name: typeof d.name === 'string' ? d.name : '?',
        qty,
        unit: typeof d.unit === 'string' ? d.unit : 'ud',
      })
    }
    if (d.expiryDate) {
      const expiryMs = d.expiryDate.toDate().getTime()
      if (expiryMs <= cutoff7d) {
        inventoryExpiring.push({
          name: typeof d.name === 'string' ? d.name : '?',
          expiryDate: d.expiryDate.toDate().toISOString().split('T')[0],
        })
      }
    }
  }

  // ── Asset alerts ──
  const assetAlerts: ConciergeSummary['assetAlerts'] = []
  const assetMap = new Map<string, string>()
  for (const doc of assetsSnap.docs) {
    const d = doc.data()
    assetMap.set(doc.id, typeof d.name === 'string' ? d.name : '?')
    if (d.warrantyExpiry) {
      const daysLeft = Math.ceil((d.warrantyExpiry.toDate().getTime() - Date.now()) / 86400000)
      if (daysLeft <= 30) {
        assetAlerts.push({
          title: daysLeft < 0 ? 'Garantía vencida' : 'Garantía próxima',
          body: `${assetMap.get(doc.id)} — ${daysLeft < 0 ? 'vencida' : `${daysLeft}d`}`,
          severity: daysLeft < 0 ? 'critical' : 'warning',
        })
      }
    }
  }
  for (const doc of maintenanceSnap.docs) {
    const d = doc.data()
    if (!d.nextDueDate) continue
    const daysLeft = Math.ceil((d.nextDueDate.toDate().getTime() - Date.now()) / 86400000)
    if (daysLeft <= 14) {
      const assetName = assetMap.get(typeof d.assetId === 'string' ? d.assetId : '') ?? 'Activo'
      assetAlerts.push({
        title: typeof d.title === 'string' ? d.title : 'Mantenimiento',
        body: `${assetName} — ${daysLeft < 0 ? 'vencido' : `en ${daysLeft}d`}`,
        severity: daysLeft < 0 ? 'critical' : 'warning',
      })
    }
  }

  // ── Investments ──
  let investmentsTotalValue = 0
  let investmentsCostBasis = 0
  let investmentsRealizedPnl = 0
  for (const doc of investmentsSnap.docs) {
    const d = doc.data()
    investmentsTotalValue += asNumber(d.currentValue, 0)
    investmentsCostBasis += asNumber(d.costBasis, 0)
    investmentsRealizedPnl += asNumber(d.realizedPnl, 0)
  }
  const investmentsPnl = investmentsTotalValue - investmentsCostBasis + investmentsRealizedPnl
  const investmentsRoiPct = investmentsCostBasis > 0
    ? (investmentsPnl / investmentsCostBasis) * 100
    : 0
  const netWorthApprox = investmentsTotalValue

  return {
    expensesThisMonth,
    expenseCount: expensesSnap.size,
    topCategories,
    subscriptionsMonthly,
    subscriptionsCount: subscriptionsSnap.size,
    upcomingCharges,
    inventoryLowStock: inventoryLowStock.slice(0, 10),
    inventoryExpiring: inventoryExpiring.slice(0, 10),
    assetAlerts: assetAlerts.slice(0, 5),
    investmentsTotalValue,
    investmentsPnl,
    investmentsRoiPct,
    netWorthApprox,
  }
}

function buildConciergeSystemPrompt(ctx: ConciergeSummary): string {
  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const topCatStr = ctx.topCategories
    .map((c) => `${c.category}: €${c.total.toFixed(2)}`)
    .join(', ')

  const lowStockStr = ctx.inventoryLowStock
    .map((i) => `${i.name} (${i.qty} ${i.unit})`)
    .join(', ') || 'ninguno'

  const expiringStr = ctx.inventoryExpiring
    .map((i) => `${i.name} (caduca ${i.expiryDate})`)
    .join(', ') || 'ninguno'

  const upcomingStr = ctx.upcomingCharges
    .map((c) => `${c.provider} €${c.amount} en ${c.daysLeft}d`)
    .join(', ') || 'ninguno'

  const alertsStr = ctx.assetAlerts
    .map((a) => `[${a.severity}] ${a.title}: ${a.body}`)
    .join(' | ') || 'ninguna'

  return `Eres el Conserje IA de Centration, asistente personal financiero y doméstico inteligente.
Hoy es ${today}.

## DATOS DEL USUARIO (ACTUALIZADOS EN TIEMPO REAL)
- Gastos este mes: €${ctx.expensesThisMonth.toFixed(2)} (${ctx.expenseCount} transacciones)
- Top categorías: ${topCatStr}
- Suscripciones activas: ${ctx.subscriptionsCount} → €${ctx.subscriptionsMonthly.toFixed(2)}/mes
- Cargos próximos (7 días): ${upcomingStr}
- Inventario stock bajo: ${lowStockStr}
- Items por caducar (7 días): ${expiringStr}
- Alertas de activos: ${alertsStr}
- Portfolio inversiones: €${ctx.investmentsTotalValue.toFixed(2)} | P&L: €${ctx.investmentsPnl.toFixed(2)} (${ctx.investmentsRoiPct.toFixed(2)}%)

## INSTRUCCIONES
1. Responde SIEMPRE en español con JSON válido siguiendo el esquema exacto:
   {"text":"respuesta en texto natural","richCard":null}

2. Para respuestas con datos, usa richCard. Los tipos disponibles son:
   - chart: {"type":"chart","title":"...","data":[{"label":"...","value":0},...]}
   - table: {"type":"table","title":"...","data":{"headers":["Col1","Col2"],"rows":[["v1","v2"]]}}
   - list:  {"type":"list","title":"...","data":[{"label":"...","value":"...","icon":"..."},...]}
   - alert: {"type":"alert","title":"...","data":{"severity":"info|warning|critical","body":"..."}}

3. Cuando el usuario pregunte sobre gastos, inversiones, inventario o alertas, usa los datos de arriba.
4. Sé conciso, amable y proactivo. Menciona alertas críticas si las hay.
5. Responde SOLO con el JSON, sin texto extra ni bloques de código.`.trim()
}

export const conciergeChat = onCall(
  {
    secrets: [GEMINI_API_KEY],
    timeoutSeconds: 90,
    memory: '512MiB',
  },
  async (request) => {
    const uid = request.auth?.uid
    if (!uid) {
      throw new HttpsError('unauthenticated', 'UNAUTHORIZED')
    }

    const parseResult = conciergeRequestSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'INVALID_PAYLOAD', {
        issues: parseResult.error.issues,
      })
    }

    const { message } = parseResult.data
    const db = getFirestore()

    await db.collection('chat_history').doc(uid).collection('messages').add({
      role: 'user',
      content: message,
      timestamp: FieldValue.serverTimestamp(),
      richCard: null,
    })

    const historySnap = await db
      .collection('chat_history')
      .doc(uid)
      .collection('messages')
      .orderBy('timestamp', 'desc')
      .limit(7)
      .get()

    const history = historySnap.docs
      .reverse()
      .slice(0, 6)
      .map((doc) => {
        const d = doc.data()
        return {
          role: d.role as 'user' | 'assistant',
          content: typeof d.content === 'string' ? d.content : '',
        }
      })

    let userContext: ConciergeSummary | null = null
    try {
      userContext = await buildUserContext(uid, db)
    } catch (err) {
      logger.warn('Could not build user context', err)
    }

    const systemPrompt = userContext
      ? buildConciergeSystemPrompt(userContext)
      : 'Eres el Conserje IA de Centration. Responde SIEMPRE en JSON: {"text":"...","richCard":null}.'

    const conversationParts = [
      { role: 'user', parts: [{ text: systemPrompt + '\n\n---\n' }] },
      { role: 'model', parts: [{ text: '{"text":"Entendido. Estoy listo para ayudarte.","richCard":null}' }] },
      ...history.map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ]

    let assistantContent = JSON.stringify({
      text: 'No he podido procesar tu solicitud en este momento. Inténtalo de nuevo.',
      richCard: null,
    })

    try {
      const response = await buildGeminiClient().models.generateContent({
        model: GEMINI_MODEL,
        contents: conversationParts,
        config: { responseMimeType: 'application/json', temperature: 0.3 },
      })
      assistantContent = response.text ?? assistantContent
    } catch (error) {
      logger.error('Gemini concierge request failed', error)
    }

    let parsedText = assistantContent
    let richCard: unknown = null
    try {
      const parsed = JSON.parse(assistantContent) as { text?: string; richCard?: unknown }
      parsedText = parsed.text ?? assistantContent
      richCard = parsed.richCard ?? null
    } catch {
      // Keep raw content if Gemini returned invalid JSON.
    }

    await db.collection('chat_history').doc(uid).collection('messages').add({
      role: 'assistant',
      content: assistantContent,
      timestamp: FieldValue.serverTimestamp(),
      richCard,
    })

    return { text: parsedText, richCard }
  },
)

export const voiceToInventory = onCall(
  {
    secrets: [GEMINI_API_KEY],
    timeoutSeconds: 60,
    memory: '512MiB',
  },
  async (request) => {
    const uid = request.auth?.uid
    if (!uid) {
      throw new HttpsError('unauthenticated', 'UNAUTHORIZED')
    }

    const parseResult = voiceInventoryRequestSchema.safeParse(request.data)
    if (!parseResult.success) {
      throw new HttpsError('invalid-argument', 'INVALID_PAYLOAD', {
        issues: parseResult.error.issues,
      })
    }

    const { transcript, locale } = parseResult.data
    let command: VoiceInventoryCommand

    try {
      command = await callGeminiForVoiceCommand(buildGeminiClient(), transcript, locale)
    } catch (error) {
      logger.error('Voice command parse failed', { uid, transcript, error })
      throw new HttpsError('internal', 'GEMINI_PARSE_FAILED')
    }

    if (command.confidence < VOICE_COMMAND_MIN_CONFIDENCE) {
      return {
        ok: false,
        reason: 'LOW_CONFIDENCE',
        transcript,
        command,
        result: null,
      }
    }

    try {
      const result = await applyVoiceCommandToInventory(getFirestore(), uid, command)
      return {
        ok: true,
        transcript,
        command,
        result,
      }
    } catch (error) {
      logger.error('Failed to apply voice inventory command', {
        uid,
        command,
        error,
      })
      throw new HttpsError('internal', 'INVENTORY_WRITE_FAILED')
    }
  },
)

/* ── 2.2.1 — Storage trigger ── */
export const processTicketUpload = onObjectFinalized(
  {
    secrets: [GEMINI_API_KEY],
    timeoutSeconds: 120,
    memory: '1GiB',
  },
  async (event) => {
    const object = event.data
    const objectName: string = object.name

    // 2.2.1 — Only process files under background-tickets/{uid}/... (disabled for interactive flow)
    if (!objectName.startsWith('background-tickets/')) return

    const pathParts = objectName.split('/')
    if (pathParts.length < 3) {
      logger.warn('Unexpected ticket path format', { objectName })
      return
    }

    const uid = pathParts[1]
    const contentType = object.contentType ?? ''

    if (!contentType.startsWith('image/')) {
      logger.warn('Skipping non-image ticket upload', { objectName, contentType })
      return
    }

    const db = getFirestore()
    logger.info('Processing ticket upload', { uid, objectName })

    // Download image from Storage
    let imageBase64: string
    try {
      const bucket = getStorage().bucket(object.bucket)
      const [buffer] = await bucket.file(objectName).download()
      imageBase64 = buffer.toString('base64')
    } catch (err) {
      logger.error('Failed to download ticket image', { objectName, err })
      await writeManualEntryAlert(db, uid, objectName, 'No se pudo descargar la imagen del ticket.')
      return
    }

    // 2.2.2 — Call Gemini Vision
    let extraction: TicketExtraction
    try {
      extraction = await callGeminiForTicket(buildGeminiClient(), imageBase64, contentType)
    } catch (err) {
      logger.error('Gemini extraction failed', { objectName, err })
      // 2.2.7 — AI error: notify user for manual entry
      await writeManualEntryAlert(
        db,
        uid,
        objectName,
        'La IA no pudo procesar el ticket (error de conexión o tiempo de espera). Por favor, introduce los datos manualmente.',
      )
      return
    }

    // 2.2.3 — Validate Gemini response with Zod (already done in callGeminiForTicket,
    // but confidence/error fields drive the manual-entry path below)

    const confidence = extraction.confidence ?? 0
    const hasError = Boolean(extraction.error)

    // 2.2.7 — Low confidence or explicit error → manual entry
    if (confidence < LOW_CONFIDENCE_THRESHOLD || hasError) {
      const reason =
        extraction.error === 'ILLEGIBLE'
          ? 'El ticket es ilegible. Por favor, introduce los datos manualmente.'
          : extraction.error === 'NO_TICKET'
            ? 'La imagen no parece un ticket de compra.'
            : `La extracción automática tuvo baja confianza (${Math.round(confidence * 100)}%). Por favor, revisa y completa los datos.`

      logger.warn('Low-confidence extraction — requesting manual entry', { uid, objectName, confidence, error: extraction.error })
      await writeManualEntryAlert(db, uid, objectName, reason)
      return
    }

    // 2.2.4 — Write expense document
    let expenseId: string
    try {
      expenseId = await writeExpense(db, uid, extraction, objectName)
      logger.info('Expense created', { uid, expenseId })
    } catch (err) {
      logger.error('Failed to write expense', { uid, objectName, err })
      await writeManualEntryAlert(db, uid, objectName, 'Error al guardar el gasto. Por favor, introduce los datos manualmente.')
      return
    }

    // 2.2.5 — Upsert inventory items
    try {
      await upsertInventoryItems(db, uid, extraction)
      logger.info('Inventory upserted', { uid, itemCount: extraction.items?.length ?? 0 })
    } catch (err) {
      // Non-fatal: expense is already saved; log and continue
      logger.error('Failed to upsert inventory', { uid, objectName, err })
    }

    // 2.2.6 — Detect potential asset
    if (isPotentialAsset(extraction.category, extraction.total ?? undefined)) {
      try {
        await writePotentialAssetAlert(db, uid, extraction, expenseId)
        logger.info('Potential asset alert created', { uid, expenseId, total: extraction.total })
      } catch (err) {
        logger.error('Failed to write asset alert', { uid, err })
      }
    }

    logger.info('Ticket processing complete', { uid, objectName, expenseId })
  },
)

export const monthlyNetworthSnapshot = onSchedule(
  {
    schedule: '0 1 1 * *',
    timeZone: 'Europe/Madrid',
  },
  async () => {
    logger.info('Monthly net worth snapshot schedule triggered')
    const db = getFirestore()
    const users = await db.collection('users').get()
    const now = Timestamp.now()

    for (const userDoc of users.docs) {
      const uid = userDoc.id
      const userData = userDoc.data()

      let investmentsTotal = 0
      let assetsTotal = 0

      const [investmentsSnap, assetsSnap] = await Promise.all([
        db.collection('investments').where('uid', '==', uid).get(),
        db.collection('assets').where('uid', '==', uid).get(),
      ])

      for (const inv of investmentsSnap.docs) {
        investmentsTotal += asNumber(inv.data().currentValue, 0)
      }
      for (const asset of assetsSnap.docs) {
        assetsTotal += asNumber(asset.data().currentValue, 0)
      }

      const liquidCash = asNumber(userData.liquidCash, 0)
      const debts = asNumber(userData.debts, 0)
      const summary = calculateNetworthTotals({
        investments: investmentsTotal,
        assets: assetsTotal,
        liquidCash,
        debts,
      })

      await db.collection('networth_snapshots').add({
        uid,
        date: now,
        totalValue: summary.totalValue,
        breakdown: summary.breakdown,
        createdAt: FieldValue.serverTimestamp(),
      })
    }
  },
)

export const extractTicket = onCall(
  { secrets: [GEMINI_API_KEY], timeoutSeconds: 60, memory: '1GiB' },
  async (request) => {
    const uid = request.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'UNAUTHORIZED')

    const path = request.data?.path
    if (!path) throw new HttpsError('invalid-argument', 'MISSING_PATH')

    const db = getFirestore()

    let imageBase64: string
    let contentType = 'image/webp'
    try {
      const bucket = getStorage().bucket()
      const file = bucket.file(path)
      const [metadata] = await file.getMetadata()
      contentType = metadata.contentType || contentType
      const [buffer] = await file.download()
      imageBase64 = buffer.toString('base64')
    } catch (err) {
      const storageErr = err as { message?: string }
      logger.error('Failed to download ticket image from storage', { path, err })
      throw new HttpsError('internal', 'COULD_NOT_READ_IMAGE', {
        message: storageErr.message ?? String(err),
      })
    }

    try {
      const extraction = await callGeminiForTicket(buildGeminiClient(), imageBase64, contentType)
      return { ok: true, data: extraction }
    } catch (err) {
      const apiErr = err as { status?: number; message?: string }
      logger.error('Gemini extraction failed', {
        status: apiErr.status ?? null,
        message: apiErr.message ?? String(err),
      })
      throw new HttpsError('internal', 'EXTRACTION_FAILED', {
        status: apiErr.status ?? null,
        message: apiErr.message ?? String(err),
      })
    }
  }
)

export const confirmTicket = onCall(
  { timeoutSeconds: 60, memory: '512MiB' },
  async (request) => {
    const uid = request.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'UNAUTHORIZED')

    const { extraction, sourcePath } = request.data
    const db = getFirestore()

    try {
      const expenseId = await writeExpense(db, uid, extraction, sourcePath || '')
      await upsertInventoryItems(db, uid, extraction)
      
      if (isPotentialAsset(extraction.category, extraction.total ?? undefined)) {
        await writePotentialAssetAlert(db, uid, extraction, expenseId)
      }
      
      return { ok: true, expenseId }
    } catch (err) {
      logger.error('Failed to confirm ticket', { err })
      throw new HttpsError('internal', 'FAILED_TO_SAVE')
    }
  }
)

/* ── 3.2.3 — Detect subscriptions from recurring expenses ── */
export const detectSubscriptions = onSchedule(
  {
    schedule: '0 3 * * *', // Daily at 3am
    timeZone: 'Europe/Madrid',
  },
  async () => {
    const db = getFirestore()
    logger.info('Starting subscription detection scan')

    // Get all unique UIDs from expenses
    const allExpenses = await db.collection('expenses').get()
    const uidSet = new Set<string>()
    allExpenses.docs.forEach((doc) => {
      const uid = doc.data().uid as string
      if (uid) uidSet.add(uid)
    })

    for (const uid of uidSet) {
      try {
        // Fetch expenses for this user from the last 90 days
        const ninetyDaysAgo = new Date()
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

        const expSnapshot = await db
          .collection('expenses')
          .where('uid', '==', uid)
          .where('date', '>=', Timestamp.fromDate(ninetyDaysAgo))
          .get()

        // Group by provider (normalized)
        const providerCharges = new Map<string, { dates: Date[]; amounts: number[]; category: string }>()

        for (const doc of expSnapshot.docs) {
          const data = doc.data()
          const provider = ((data.provider as string) ?? '').trim().toLowerCase()
          if (!provider || provider === 'desconocido') continue

          const date = data.date instanceof Timestamp ? data.date.toDate() : new Date()
          const amount = (data.amount as number) ?? (data.total as number) ?? 0

          const entry = providerCharges.get(provider) ?? { dates: [], amounts: [], category: (data.category as string) ?? 'other' }
          entry.dates.push(date)
          entry.amounts.push(amount)
          providerCharges.set(provider, entry)
        }

        // Detect recurring: ≥2 charges with similar amounts in consecutive months
        const existingSubs = await db.collection('subscriptions').where('uid', '==', uid).get()
        const existingNames = new Set(
          existingSubs.docs.map((d) => ((d.data().name as string) ?? '').trim().toLowerCase()),
        )

        for (const [provider, data] of providerCharges) {
          if (data.dates.length < 2) continue
          if (existingNames.has(provider)) continue

          // Check if amounts are similar (within 20% tolerance)
          const avgAmount = data.amounts.reduce((a, b) => a + b, 0) / data.amounts.length
          const allSimilar = data.amounts.every(
            (a) => Math.abs(a - avgAmount) / avgAmount < 0.2,
          )

          if (!allSimilar) continue

          // Check if they appear in different months
          const months = new Set(
            data.dates.map((d) => `${d.getFullYear()}-${d.getMonth()}`),
          )
          if (months.size < 2) continue

          // Detected a recurring subscription! Create it.
          const lastDate = data.dates.sort((a, b) => b.getTime() - a.getTime())[0]
          const nextPayment = new Date(lastDate)
          nextPayment.setMonth(nextPayment.getMonth() + 1)

          const categoryMap: Record<string, string> = {
            leisure: 'streaming',
            tech: 'saas',
            health: 'gym',
            other: 'other',
          }

          await db.collection('subscriptions').add({
            uid,
            name: provider.charAt(0).toUpperCase() + provider.slice(1),
            logo: null,
            amount: Math.round(avgAmount * 100) / 100,
            currency: 'EUR',
            billingCycle: 'monthly',
            nextPaymentDate: Timestamp.fromDate(nextPayment),
            category: categoryMap[data.category] ?? 'other',
            status: 'active',
            trialEndsAt: null,
            sharedWith: [],
            autoDetected: true,
            createdAt: FieldValue.serverTimestamp(),
          })

          // Create an alert to notify the user
          await db.collection('alerts').add({
            uid,
            type: 'subscription_detected',
            title: `Suscripción detectada: ${provider.charAt(0).toUpperCase() + provider.slice(1)}`,
            body: `Se detectaron ${data.dates.length} cobros recurrentes de ~${avgAmount.toFixed(2)}€/mes. Revisa en Suscripciones.`,
            severity: 'info',
            read: false,
            scheduledFor: Timestamp.now(),
            createdAt: FieldValue.serverTimestamp(),
          })

          logger.info('Auto-detected subscription', { uid, provider, avgAmount, charges: data.dates.length })
        }
      } catch (err) {
        logger.error('Subscription detection failed for user', { uid, err })
      }
    }

    logger.info('Subscription detection scan complete')
  },
)

/* ── 3.2.5 — Renewal alerts for upcoming subscription charges ── */
export const subscriptionRenewalAlerts = onSchedule(
  {
    schedule: '0 9 * * *', // Daily at 9am
    timeZone: 'Europe/Madrid',
  },
  async () => {
    const db = getFirestore()
    logger.info('Starting subscription renewal alert scan')

    const allSubs = await db
      .collection('subscriptions')
      .where('status', 'in', ['active', 'trial'])
      .get()

    const now = new Date()

    for (const subDoc of allSubs.docs) {
      const data = subDoc.data()
      const uid = data.uid as string
      const name = data.name as string
      const amount = data.amount as number
      const nextPayment = data.nextPaymentDate instanceof Timestamp
        ? data.nextPaymentDate.toDate()
        : null

      if (!nextPayment || !uid) continue

      // Get user's notification preferences (default: 7 days for renewal)
      let renewalDaysAhead = 7
      try {
        const userDoc = await db.collection('users').doc(uid).get()
        if (userDoc.exists) {
          const prefs = userDoc.data()?.notificationPrefs as { renewalDaysAhead?: number } | undefined
          if (prefs?.renewalDaysAhead) {
            renewalDaysAhead = prefs.renewalDaysAhead
          }
        }
      } catch {
        // Use default
      }

      const daysUntil = Math.ceil((nextPayment.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      // Check if trial is ending
      if (data.status === 'trial' && data.trialEndsAt) {
        const trialEnd = data.trialEndsAt instanceof Timestamp ? data.trialEndsAt.toDate() : null
        if (trialEnd) {
          const trialDaysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          if (trialDaysLeft <= renewalDaysAhead && trialDaysLeft >= 0) {
            // Check if we already sent an alert for this
            const existingAlert = await db
              .collection('alerts')
              .where('uid', '==', uid)
              .where('type', '==', 'trial_ending')
              .where('relatedId', '==', subDoc.id)
              .where('read', '==', false)
              .limit(1)
              .get()

            if (existingAlert.empty) {
              await db.collection('alerts').add({
                uid,
                type: 'trial_ending',
                title: `Prueba de ${name} termina pronto`,
                body: `Tu periodo de prueba de ${name} termina en ${trialDaysLeft} días. Se te cobrará ${amount.toFixed(2)}€/${data.billingCycle === 'monthly' ? 'mes' : 'año'}.`,
                relatedId: subDoc.id,
                severity: 'warning',
                read: false,
                scheduledFor: Timestamp.now(),
                createdAt: FieldValue.serverTimestamp(),
              })
              logger.info('Trial ending alert created', { uid, name, trialDaysLeft })
            }
          }
        }
      }

      // Check upcoming renewal
      if (daysUntil <= renewalDaysAhead && daysUntil >= 0) {
        // Check if we already sent an alert for this renewal
        const existingAlert = await db
          .collection('alerts')
          .where('uid', '==', uid)
          .where('type', '==', 'renewal')
          .where('relatedId', '==', subDoc.id)
          .where('read', '==', false)
          .limit(1)
          .get()

        if (existingAlert.empty) {
          await db.collection('alerts').add({
            uid,
            type: 'renewal',
            title: `Cobro próximo: ${name}`,
            body: `${name} se cobra en ${daysUntil} día${daysUntil !== 1 ? 's' : ''} (${amount.toFixed(2)}€/${data.billingCycle === 'monthly' ? 'mes' : 'año'}).`,
            relatedId: subDoc.id,
            severity: daysUntil <= 1 ? 'warning' : 'info',
            read: false,
            scheduledFor: Timestamp.now(),
            createdAt: FieldValue.serverTimestamp(),
          })
          logger.info('Renewal alert created', { uid, name, daysUntil })
        }
      }
    }

    logger.info('Subscription renewal alert scan complete')
  },
)

/* ════════════════════════════════════════════════════════
   §6.3  SPECIALIZED AI AGENTS
   ════════════════════════════════════════════════════════ */

/* ── Schemas ── */

const aiChefRequestSchema = z.object({
  maxRecipes: z.number().int().min(1).max(5).optional().default(3),
})

const nutritionalPlannerRequestSchema = z.object({
  goal: z.enum(['health', 'savings', 'sport']),
  days: z.number().int().min(3).max(7).optional().default(7),
})

const cartOptimizerRequestSchema = z.object({
  itemNames: z.array(z.string().min(1).max(120)).min(1).max(50),
})

const lifeRoiRequestSchema = z.object({
  query: z.string().min(5).max(2000),
})

/* ── 6.3.1  Cocinero AI — Zero Waste recipe agent ── */

export const aiChef = onCall(
  {
    secrets: [GEMINI_API_KEY],
    timeoutSeconds: 90,
    memory: '512MiB',
  },
  async (request) => {
    const uid = request.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'Login required')

    const parsed = aiChefRequestSchema.safeParse(request.data)
    if (!parsed.success) throw new HttpsError('invalid-argument', 'Bad request')

    const { maxRecipes } = parsed.data
    const db = getFirestore()

    // Fetch inventory sorted by expiry (soonest first)
    const inventorySnap = await db
      .collection('inventory')
      .where('uid', '==', uid)
      .where('qty', '>', 0)
      .get()

    if (inventorySnap.empty) {
      return { recipes: [], note: 'No hay productos en el inventario.' }
    }

    const now = Date.now()
    const items = inventorySnap.docs
      .map((d) => {
        const data = d.data()
        const expiryMs = data.expiryDate instanceof Timestamp ? data.expiryDate.toMillis() : null
        const daysLeft = expiryMs !== null ? Math.ceil((expiryMs - now) / 86_400_000) : null
        return {
          name: data.name as string,
          qty: data.qty as number,
          unit: (data.unit as string) ?? 'ud',
          category: (data.category as string) ?? 'other',
          daysLeft,
        }
      })
      .sort((a, b) => {
        // Near-expiry items first; null (no expiry) goes last
        if (a.daysLeft === null && b.daysLeft === null) return 0
        if (a.daysLeft === null) return 1
        if (b.daysLeft === null) return -1
        return a.daysLeft - b.daysLeft
      })

    const expiringItems = items.filter((i) => i.daysLeft !== null && i.daysLeft <= 7)
    const inventoryLines = items
      .slice(0, 40) // cap context size
      .map((i) => {
        const expTag = i.daysLeft !== null ? ` [caduca en ${i.daysLeft}d]` : ''
        return `- ${i.name}: ${i.qty} ${i.unit}${expTag}`
      })
      .join('\n')

    const prompt = `
Eres un chef experto en cocina Zero Waste española.
Tienes este inventario doméstico:
${inventoryLines}

${expiringItems.length > 0 ? `⚠️ PRIORIDAD CADUCIDADES: ${expiringItems.map((i) => i.name).join(', ')}` : ''}

Genera exactamente ${maxRecipes} receta(s) que:
1. Usen principalmente ingredientes del inventario
2. Prioricen los productos próximos a caducar
3. Minimicen el desperdicio
4. Sean prácticas y sencillas

Responde SOLO con JSON válido con este esquema exacto (sin texto adicional):
{
  "recipes": [
    {
      "name": "string",
      "emoji": "string (un único emoji)",
      "time": "string (ej: '30 min')",
      "servings": number,
      "zeroWasteScore": number (0-10),
      "expiringUsed": ["nombre ingrediente caducante utilizado"],
      "ingredients": [
        { "name": "string", "qty": "string", "fromInventory": boolean }
      ],
      "steps": ["string"],
      "tip": "string (consejo zero waste)"
    }
  ]
}
`.trim()

    try {
      const response = await buildGeminiClient().models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: { responseMimeType: 'application/json', temperature: 0.7 },
      })
      const raw = response.text ?? '{}'
      let parsed: unknown
      try {
        parsed = JSON.parse(raw)
      } catch {
        logger.error('[aiChef] JSON parse error', { raw })
        throw new HttpsError('internal', 'Gemini returned invalid JSON')
      }
      const result = parsed as { recipes: unknown[] }
      return { recipes: result.recipes ?? [], expiringItems: expiringItems.map((i) => i.name) }
    } catch (err) {
      logger.error('[aiChef] Gemini error', err)
      throw new HttpsError('internal', 'AI chef unavailable')
    }
  },
)

/* ── 6.3.2  Planificador Nutricional ── */

export const nutritionalPlanner = onCall(
  {
    secrets: [GEMINI_API_KEY],
    timeoutSeconds: 90,
    memory: '512MiB',
  },
  async (request) => {
    const uid = request.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'Login required')

    const parsed = nutritionalPlannerRequestSchema.safeParse(request.data)
    if (!parsed.success) throw new HttpsError('invalid-argument', 'Bad request')

    const { goal, days } = parsed.data
    const db = getFirestore()

    // Last 30 days of food expenses
    const since = Timestamp.fromMillis(Date.now() - 30 * 86_400_000)
    const expensesSnap = await db
      .collection('expenses')
      .where('uid', '==', uid)
      .where('category', '==', 'food')
      .where('createdAt', '>=', since)
      .orderBy('createdAt', 'desc')
      .limit(60)
      .get()

    // Current inventory for context
    const inventorySnap = await db
      .collection('inventory')
      .where('uid', '==', uid)
      .where('qty', '>', 0)
      .get()

    const purchaseLines = expensesSnap.docs
      .map((d) => {
        const data = d.data()
        const items = Array.isArray(data.items) ? data.items : []
        return items.map((it: { name?: string; qty?: number; price?: number }) =>
          `- ${it.name ?? 'Desconocido'}: ${it.qty ?? 1}ud @ ${(it.price ?? 0).toFixed(2)}€`,
        )
      })
      .flat()
      .slice(0, 60)
      .join('\n')

    const inventoryLines = inventorySnap.docs
      .slice(0, 30)
      .map((d) => `- ${d.data().name}: ${d.data().qty} ${d.data().unit}`)
      .join('\n')

    const goalDescriptions: Record<string, string> = {
      health: 'mejorar la salud general, dieta equilibrada y rica en nutrientes',
      savings: 'reducir el gasto alimentario al máximo aprovechando lo que hay en casa',
      sport: 'optimizar el rendimiento deportivo con proteínas y carbohidratos adecuados',
    }

    const prompt = `
Eres un dietista-nutricionista experto.

Objetivo del usuario: ${goalDescriptions[goal]}

Compras alimentarias recientes (últimos 30 días):
${purchaseLines || '(sin datos)'}

Inventario actual:
${inventoryLines || '(sin datos)'}

Genera un plan nutricional de ${days} días adaptado al objetivo.

Responde SOLO con JSON válido con este esquema (sin texto adicional):
{
  "goal": "${goal}",
  "analysis": {
    "summary": "string",
    "strengths": ["string"],
    "improvements": ["string"],
    "monthlyFoodSpend": number
  },
  "weekPlan": [
    {
      "day": "string (Lunes, Martes…)",
      "breakfast": "string",
      "lunch": "string",
      "dinner": "string",
      "snack": "string",
      "estimatedCost": number,
      "proteinG": number,
      "carbsG": number,
      "fatG": number,
      "kcal": number
    }
  ],
  "shoppingNeeds": ["string (producto que falta para el plan)"],
  "tips": ["string"]
}
`.trim()

    try {
      const response = await buildGeminiClient().models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: { responseMimeType: 'application/json', temperature: 0.5 },
      })
      const raw = response.text ?? '{}'
      let result: unknown
      try {
        result = JSON.parse(raw)
      } catch {
        logger.error('[nutritionalPlanner] JSON parse error', { raw })
        throw new HttpsError('internal', 'Gemini returned invalid JSON')
      }
      return result
    } catch (err) {
      logger.error('[nutritionalPlanner] Gemini error', err)
      throw new HttpsError('internal', 'Nutritional planner unavailable')
    }
  },
)

/* ── 6.3.3  Optimizador de Carrito ── */

export const cartOptimizer = onCall(
  {
    secrets: [GEMINI_API_KEY],
    timeoutSeconds: 90,
    memory: '512MiB',
  },
  async (request) => {
    const uid = request.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'Login required')

    const parsed = cartOptimizerRequestSchema.safeParse(request.data)
    if (!parsed.success) throw new HttpsError('invalid-argument', 'Bad request')

    const { itemNames } = parsed.data
    const db = getFirestore()

    // Fetch price history from inventory for the requested items
    const inventorySnap = await db
      .collection('inventory')
      .where('uid', '==', uid)
      .get()

    // Build a price-history map: normalizedName → [{provider, price}]
    const priceMap: Record<string, Array<{ provider: string; price: number }>> = {}
    for (const doc of inventorySnap.docs) {
      const data = doc.data()
      const name = (data.normalizedName ?? data.name ?? '') as string
      const history = Array.isArray(data.priceHistory) ? data.priceHistory : []
      if (history.length === 0 && data.lastPrice) {
        priceMap[name] = [{ provider: data.lastProvider ?? 'Desconocido', price: data.lastPrice as number }]
      } else {
        priceMap[name] = history.map((h: { provider?: string; price?: number }) => ({
          provider: h.provider ?? 'Desconocido',
          price: h.price ?? 0,
        }))
      }
    }

    const priceContext = itemNames
      .map((item) => {
        const key = item.toLowerCase().replace(/\s+/g, ' ').trim()
        // fuzzy: find partial match
        const matched = Object.keys(priceMap).find((k) => k.includes(key) || key.includes(k))
        if (!matched || priceMap[matched].length === 0) {
          return `- ${item}: sin historial de precios`
        }
        const byProvider = priceMap[matched]
          .map((h) => `${h.provider}: ${h.price.toFixed(2)}€`)
          .join(', ')
        return `- ${item}: ${byProvider}`
      })
      .join('\n')

    const prompt = `
Eres un experto en optimización de compras para el mercado español.

El usuario quiere comprar estos productos:
${itemNames.map((i) => `- ${i}`).join('\n')}

Historial de precios disponible en su inventario:
${priceContext}

Supermercados de referencia en España: Mercadona, Carrefour, Lidl, Aldi, Dia, El Corte Inglés, Alcampo.

Genera un análisis de optimización de carrito.

Responde SOLO con JSON válido con este esquema (sin texto adicional):
{
  "optimizedList": [
    {
      "item": "string",
      "bestStore": "string",
      "estimatedPrice": number,
      "alternatives": [{ "store": "string", "price": number }],
      "savingVsAvg": number,
      "tip": "string"
    }
  ],
  "storeRecommendation": {
    "primary": "string",
    "secondary": "string",
    "reason": "string"
  },
  "totalEstimate": number,
  "totalSavings": number,
  "generalTips": ["string"]
}
`.trim()

    try {
      const response = await buildGeminiClient().models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: { responseMimeType: 'application/json', temperature: 0.3 },
      })
      const raw = response.text ?? '{}'
      let result: unknown
      try {
        result = JSON.parse(raw)
      } catch {
        logger.error('[cartOptimizer] JSON parse error', { raw })
        throw new HttpsError('internal', 'Gemini returned invalid JSON')
      }
      return result
    } catch (err) {
      logger.error('[cartOptimizer] Gemini error', err)
      throw new HttpsError('internal', 'Cart optimizer unavailable')
    }
  },
)

/* ── 6.3.4  Análisis ROI de Vida ── */

export const lifeRoiAnalyst = onCall(
  {
    secrets: [GEMINI_API_KEY],
    timeoutSeconds: 120,
    memory: '1GiB',
  },
  async (request) => {
    const uid = request.auth?.uid
    if (!uid) throw new HttpsError('unauthenticated', 'Login required')

    const parsed = lifeRoiRequestSchema.safeParse(request.data)
    if (!parsed.success) throw new HttpsError('invalid-argument', 'Bad request')

    const { query } = parsed.data
    const db = getFirestore()

    // Collect full financial context in parallel
    const [expensesSnap, assetsSnap, subscriptionsSnap, investmentsSnap, inventorySnap] =
      await Promise.all([
        db.collection('expenses').where('uid', '==', uid)
          .orderBy('createdAt', 'desc').limit(100).get(),
        db.collection('assets').where('uid', '==', uid).get(),
        db.collection('subscriptions').where('uid', '==', uid)
          .where('status', 'in', ['active', 'trial']).get(),
        db.collection('investments').where('uid', '==', uid).get(),
        db.collection('inventory').where('uid', '==', uid).get(),
      ])

    // Build context summaries
    const totalExpenses = expensesSnap.docs.reduce((s, d) => s + asNumber(d.data().total), 0)
    const expensesByCategory: Record<string, number> = {}
    for (const d of expensesSnap.docs) {
      const cat = (d.data().category as string) ?? 'other'
      expensesByCategory[cat] = (expensesByCategory[cat] ?? 0) + asNumber(d.data().total)
    }

    const assetsContext = assetsSnap.docs.map((d) => {
      const data = d.data()
      return `  - ${data.name} (${data.type}): valor ${data.currentValue ?? data.purchasePrice ?? 0}€, mantenimiento ${data.yearlyMaintenanceCost ?? 0}€/año`
    }).join('\n') || '  (ninguno)'

    const subscriptionsContext = subscriptionsSnap.docs.map((d) => {
      const data = d.data()
      return `  - ${data.name}: ${data.amount}€/${data.billingCycle === 'monthly' ? 'mes' : 'año'}`
    }).join('\n') || '  (ninguna)'

    const totalSubscriptionMonthly = subscriptionsSnap.docs.reduce((s, d) => {
      const data = d.data()
      const amount = asNumber(data.amount)
      return s + (data.billingCycle === 'yearly' ? amount / 12 : amount)
    }, 0)

    const investmentsContext = investmentsSnap.docs.map((d) => {
      const data = d.data()
      return `  - ${data.symbol}: valor ${asNumber(data.currentValue)}€, ROI ${asNumber(data.roiPct).toFixed(1)}%`
    }).join('\n') || '  (ninguno)'

    const totalInvestmentValue = investmentsSnap.docs.reduce((s, d) => s + asNumber(d.data().currentValue), 0)

    const inventoryValue = inventorySnap.docs.reduce((s, d) => {
      const data = d.data()
      return s + asNumber(data.qty) * asNumber(data.lastPrice)
    }, 0)

    const prompt = `
Eres un asesor financiero personal experto en análisis coste-beneficio y ROI de vida (Life ROI).
Tienes acceso al perfil financiero COMPLETO del usuario.

═══ PERFIL FINANCIERO ═══

Gastos (últimas 100 transacciones, total ${totalExpenses.toFixed(2)}€):
${Object.entries(expensesByCategory).map(([k, v]) => `  - ${k}: ${v.toFixed(2)}€`).join('\n') || '  (sin datos)'}

Activos físicos:
${assetsContext}

Suscripciones activas (total ~${totalSubscriptionMonthly.toFixed(2)}€/mes):
${subscriptionsContext}

Inversiones (valor total ${totalInvestmentValue.toFixed(2)}€):
${investmentsContext}

Inventario doméstico (valor estimado ${inventoryValue.toFixed(2)}€)

═══ CONSULTA DEL USUARIO ═══
${query}

═══ INSTRUCCIONES ═══
Analiza la consulta en profundidad usando los datos financieros reales del usuario.
Sé específico con números. Si faltan datos, indícalo y da rangos estimados.

Responde SOLO con JSON válido con este esquema (sin texto adicional):
{
  "verdict": "string (respuesta directa en 1-2 frases)",
  "verdictEmoji": "string (emoji que resume la recomendación)",
  "roiScore": number (0-10, donde 10 es máximo ROI),
  "financialImpact": {
    "currentAnnualCost": number,
    "estimatedAnnualBenefit": number,
    "netRoi": number,
    "paybackMonths": number | null
  },
  "breakdown": [
    { "concept": "string", "amount": number, "type": "cost" | "benefit" | "opportunity_cost" }
  ],
  "alternatives": [
    { "option": "string", "estimatedSaving": number, "pros": ["string"], "cons": ["string"] }
  ],
  "recommendation": "string (párrafo detallado con consejo final)",
  "dataGaps": ["string (dato que faltaría para análisis más preciso)"]
}
`.trim()

    try {
      const response = await buildGeminiClient().models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: { responseMimeType: 'application/json', temperature: 0.2 },
      })
      const raw = response.text ?? '{}'
      let result: unknown
      try {
        result = JSON.parse(raw)
      } catch {
        logger.error('[lifeRoiAnalyst] JSON parse error', { raw })
        throw new HttpsError('internal', 'Gemini returned invalid JSON')
      }
      return result
    } catch (err) {
      logger.error('[lifeRoiAnalyst] Gemini error', err)
      throw new HttpsError('internal', 'Life ROI analyst unavailable')
    }
  },
)
