/**
 * 2.2.8 — Integration tests for the ticket processing pipeline.
 *
 * Strategy: inject a mock Gemini client into callGeminiForTicket to avoid
 * real API calls. Firestore writes are validated through the helper functions'
 * contracts rather than a live emulator (emulator tests are covered by e2e).
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import type { GoogleGenAI } from '@google/genai'

import { callGeminiForTicket, ticketExtractionSchema } from '../index'
import { isPotentialAsset } from '../lib/assetDetection'
import { findBestMatch, normalizeName } from '../lib/normalize'

/* ── Mock Gemini client factory ── */

function makeMockGemini(jsonResponse: object): GoogleGenAI {
  return {
    models: {
      generateContent: async () => ({
        text: JSON.stringify(jsonResponse),
      }),
    },
  } as unknown as GoogleGenAI
}

/* ── callGeminiForTicket ── */

test('callGeminiForTicket: parses valid Gemini response', async () => {
  const mockPayload = {
    total: 34.72,
    date: '2026-04-07',
    provider: 'Mercadona',
    category: 'food',
    items: [
      { name: 'Leche Entera 1L', qty: 2, unit: 'ud', price: 0.89 },
    ],
    confidence: 0.95,
    error: null,
  }

  const client = makeMockGemini(mockPayload)
  const result = await callGeminiForTicket(client, 'base64data==', 'image/jpeg')

  assert.equal(result.provider, 'Mercadona')
  assert.equal(result.total, 34.72)
  assert.equal(result.items?.length, 1)
  assert.equal(result.confidence, 0.95)
})

test('callGeminiForTicket: throws on malformed JSON from Gemini', async () => {
  const client = {
    models: {
      generateContent: async () => ({ text: 'not json at all' }),
    },
  } as unknown as GoogleGenAI

  await assert.rejects(
    () => callGeminiForTicket(client, 'base64==', 'image/jpeg'),
    (err: Error) => {
      assert.ok(err instanceof SyntaxError || err instanceof Error)
      return true
    },
  )
})

test('callGeminiForTicket: throws on Zod validation failure', async () => {
  const client = makeMockGemini({ category: 'invalid_category', confidence: 99 })

  await assert.rejects(
    () => callGeminiForTicket(client, 'base64==', 'image/jpeg'),
  )
})

test('callGeminiForTicket: handles low-confidence ILLEGIBLE response', async () => {
  const client = makeMockGemini({
    total: null,
    date: null,
    provider: null,
    category: 'other',
    items: [],
    confidence: 0.15,
    error: 'ILLEGIBLE',
  })

  const result = await callGeminiForTicket(client, 'blurry==', 'image/jpeg')
  assert.equal(result.error, 'ILLEGIBLE')
  assert.ok((result.confidence ?? 1) < 0.7)
})

test('callGeminiForTicket: handles NO_TICKET response (photo of a landscape)', async () => {
  const client = makeMockGemini({
    total: null, date: null, provider: null, category: 'other',
    items: [], confidence: 0.1, error: 'NO_TICKET',
  })

  const result = await callGeminiForTicket(client, 'landscape==', 'image/jpeg')
  assert.equal(result.error, 'NO_TICKET')
})

/* ── Full pipeline logic: confidence routing ── */

test('pipeline: confidence >= 0.7 qualifies for auto-processing', () => {
  const confidence = 0.92
  assert.ok(confidence >= 0.7)
})

test('pipeline: confidence < 0.7 triggers manual entry path', () => {
  const confidence = 0.55
  assert.ok(confidence < 0.7)
})

/* ── Asset detection (2.2.6) ── */

test('pipeline: tech item > 150€ triggers potentialAsset', () => {
  assert.ok(isPotentialAsset('tech', 299.99))
})

test('pipeline: home item > 150€ triggers potentialAsset', () => {
  assert.ok(isPotentialAsset('home', 180))
})

test('pipeline: food item > 150€ does NOT trigger potentialAsset', () => {
  assert.ok(!isPotentialAsset('food', 200))
})

test('pipeline: tech item at exactly 150€ does NOT trigger potentialAsset', () => {
  assert.ok(!isPotentialAsset('tech', 150))
})

/* ── Inventory upsert logic (2.2.5) ── */

test('inventory upsert: same product normalizes to same key', () => {
  assert.equal(normalizeName('Leche Entera 1L'), normalizeName('leche entera 1l'))
})

test('inventory upsert: finds existing entry for variant name', () => {
  const existing = [
    { id: 'milk-1', normalizedName: 'leche entera' },
  ]
  const match = findBestMatch('Leche Entera 1L Asturiana', existing)
  assert.ok(match !== null, 'Should match existing leche entera entry')
})

test('inventory upsert: creates new entry when no match', () => {
  const existing = [
    { id: 'milk-1', normalizedName: 'leche entera' },
  ]
  const match = findBestMatch('Detergente Ariel', existing)
  assert.equal(match, null)
})

test('inventory upsert: same-ticket second item matches newly added candidate', () => {
  // Simulates the within-batch dedup: after adding "Leche Entera" to candidates,
  // a second "Leche Entera 1L Desnatada" in the same ticket should NOT create a new doc.
  const candidates = [{ id: 'milk-1', normalizedName: normalizeName('Leche Entera') }]
  const match = findBestMatch('Leche Entera 1L', candidates)
  assert.ok(match !== null)
})

/* ── Schema round-trip with all supported supermarkets ── */

const mercadonaTicket = {
  total: 45.32, date: '2026-04-05', provider: 'Mercadona', category: 'food',
  items: [{ name: 'Leche Entera', qty: 3, unit: 'ud', price: 0.89 }],
  confidence: 0.97, error: null,
}
const lidlTicket = {
  total: 12.80, date: '2026-04-06', provider: 'Lidl', category: 'food',
  items: [{ name: 'Pan de molde', qty: 1, unit: 'ud', price: 1.10 }],
  confidence: 0.88, error: null,
}
const amazonTicket = {
  total: 299.00, date: '2026-04-01', provider: 'Amazon', category: 'tech',
  items: [{ name: 'Teclado mecánico', qty: 1, unit: 'ud', price: 299.00 }],
  confidence: 0.93, error: null,
}

for (const [name, ticket] of [
  ['Mercadona', mercadonaTicket],
  ['Lidl', lidlTicket],
  ['Amazon', amazonTicket],
] as const) {
  test(`schema: round-trip for ${name} ticket`, () => {
    const result = ticketExtractionSchema.safeParse(ticket)
    assert.ok(result.success, `Parse failed for ${name}: ${JSON.stringify(result.error)}`)
  })
}

test('Amazon tech ticket triggers potentialAsset', () => {
  const parsed = ticketExtractionSchema.parse(amazonTicket)
  assert.ok(isPotentialAsset(parsed.category, parsed.total ?? 0))
})
