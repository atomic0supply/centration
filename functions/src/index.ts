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
    model: 'gemini-1.5-flash',
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
    model: 'gemini-1.5-flash',
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

export const conciergeChat = onRequest(
  {
    cors: true,
    secrets: [GEMINI_API_KEY],
    timeoutSeconds: 60,
    memory: '512MiB',
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
      return
    }

    const uid = await verifyUidFromBearerHeader(req.headers.authorization)
    if (!uid) {
      res.status(401).json({ error: 'UNAUTHORIZED' })
      return
    }

    const parseResult = conciergeRequestSchema.safeParse(req.body)
    if (!parseResult.success) {
      res.status(400).json({ error: 'INVALID_PAYLOAD', details: parseResult.error.issues })
      return
    }

    const { message } = parseResult.data
    const db = getFirestore()

    await db.collection('chat_history').doc(uid).collection('messages').add({
      role: 'user',
      content: message,
      timestamp: FieldValue.serverTimestamp(),
      richCard: null,
    })

    let assistantText = 'No he podido procesar tu solicitud en este momento.'

    try {
      const response = await buildGeminiClient().models.generateContent({
        model: 'gemini-1.5-flash',
        contents:
          'Eres el Conserje de Concentrate. Responde SIEMPRE como JSON con {"text":"...","richCard":null}. Pregunta del usuario: ' +
          message,
        config: { responseMimeType: 'application/json', temperature: 0.2 },
      })
      assistantText = response.text ?? assistantText
    } catch (error) {
      logger.error('Gemini request failed', error)
    }

    await db.collection('chat_history').doc(uid).collection('messages').add({
      role: 'assistant',
      content: assistantText,
      timestamp: FieldValue.serverTimestamp(),
      richCard: null,
    })

    res.status(200).json({ text: assistantText, richCard: null })
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

    // 2.2.1 — Only process files under tickets/{uid}/...
    if (!objectName.startsWith('tickets/')) return

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
  () => {
    logger.info('Monthly net worth snapshot schedule triggered')
    // TODO: implement aggregate net worth snapshot write in Phase 3.
  },
)
