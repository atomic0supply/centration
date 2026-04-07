import { GoogleGenAI, type GenerateContentResponse } from '@google/genai'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import { defineSecret } from 'firebase-functions/params'
import { onRequest } from 'firebase-functions/v2/https'
import { setGlobalOptions } from 'firebase-functions/v2/options'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onObjectFinalized } from 'firebase-functions/v2/storage'
import { z } from 'zod'

initializeApp()

setGlobalOptions({
  region: 'europe-west1',
  maxInstances: 10,
})

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY')
const FINNHUB_API_KEY = defineSecret('FINNHUB_API_KEY')

const conciergeRequestSchema = z.object({
  message: z.string().min(1).max(4000),
})

const ticketExtractionSchema = z.object({
  total: z.number().optional(),
  date: z.string().optional(),
  provider: z.string().optional(),
  category: z
    .enum(['food', 'tech', 'health', 'leisure', 'transport', 'home', 'other'])
    .optional(),
  items: z
    .array(
      z.object({
        name: z.string(),
        qty: z.number().optional(),
        unit: z.string().optional(),
        price: z.number().optional(),
      }),
    )
    .optional(),
  isAsset: z.boolean().optional(),
  potentialAsset: z.boolean().optional(),
  confidence: z.number().min(0).max(1).optional(),
  error: z.string().optional(),
})

async function verifyUidFromBearerHeader(authHeader?: string): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const idToken = authHeader.slice('Bearer '.length).trim()
  if (!idToken) {
    return null
  }

  try {
    const decoded = await getAuth().verifyIdToken(idToken)
    return decoded.uid
  } catch (error) {
    logger.warn('Invalid auth token in request', error)
    return null
  }
}

function buildGeminiClient(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() })
}

export const healthCheck = onRequest(
  {
    cors: true,
    secrets: [FINNHUB_API_KEY],
  },
  (_req, res) => {
    const hasPriceProvider = Boolean(FINNHUB_API_KEY.value())

    res.status(200).json({
      ok: true,
      service: 'centrate-functions',
      priceProvider: 'finnhub',
      hasPriceProvider,
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
      const response: GenerateContentResponse = await buildGeminiClient().models.generateContent({
        model: 'gemini-1.5-flash',
        contents:
          'Eres el Conserje de Concentrate. Responde SIEMPRE como JSON con {"text":"...","richCard":null}. Pregunta del usuario: ' +
          message,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      })

      assistantText = response.text ?? 'No he podido generar respuesta ahora.'
    } catch (error) {
      logger.error('Gemini request failed', error)
    }

    await db.collection('chat_history').doc(uid).collection('messages').add({
      role: 'assistant',
      content: assistantText,
      timestamp: FieldValue.serverTimestamp(),
      richCard: null,
    })

    res.status(200).json({
      text: assistantText,
      richCard: null,
    })
  },
)

export const processTicketUpload = onObjectFinalized(
  {
    secrets: [GEMINI_API_KEY],
    timeoutSeconds: 120,
    memory: '1GiB',
  },
  async (event) => {
    const object = event.data

    if (!object.name.startsWith('tickets/')) {
      return
    }

    const pathParts = object.name.split('/')
    if (pathParts.length < 3) {
      logger.warn('Unexpected ticket path format', { objectName: object.name })
      return
    }

    const uid = pathParts[1]
    const contentType = object.contentType ?? ''

    if (!contentType.startsWith('image/')) {
      logger.warn('Skipping non-image ticket upload', { objectName: object.name, contentType })
      return
    }

    const db = getFirestore()

    // Base scaffold for the ingestion pipeline. Full OCR + parser is implemented in Phase 2.
    await db.collection('alerts').add({
      uid,
      type: 'custom',
      title: 'Ticket subido',
      body: `Archivo ${object.name} recibido y en cola de procesamiento IA.`,
      relatedId: object.name,
      severity: 'info',
      read: false,
      scheduledFor: Timestamp.now(),
      createdAt: FieldValue.serverTimestamp(),
    })

    const maybeStub = {
      total: 0,
      confidence: 0,
      error: 'PENDING_PIPELINE',
    }

    ticketExtractionSchema.parse(maybeStub)
    logger.info('Ticket ingestion scaffold triggered', { uid, objectName: object.name })
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
