import assert from 'node:assert/strict'
import test from 'node:test'

import { ticketExtractionSchema } from '../index'

/* ── Valid payloads ── */

test('schema: accepts a complete valid Mercadona ticket payload', () => {
  const payload = {
    total: 34.72,
    date: '2026-04-07',
    provider: 'Mercadona',
    category: 'food',
    items: [
      { name: 'Leche Entera 1L', qty: 2, unit: 'ud', price: 0.89 },
      { name: 'Pan de molde', qty: 1, unit: 'ud', price: 1.25 },
    ],
    confidence: 0.95,
    error: null,
  }
  const result = ticketExtractionSchema.safeParse(payload)
  assert.ok(result.success, `Unexpected parse error: ${JSON.stringify(result.error)}`)
})

test('schema: accepts payload with all optional fields missing', () => {
  const result = ticketExtractionSchema.safeParse({})
  assert.ok(result.success)
})

test('schema: accepts partial ticket with PARTIAL error flag', () => {
  const result = ticketExtractionSchema.safeParse({
    confidence: 0.55,
    error: 'PARTIAL',
    provider: 'Lidl',
  })
  assert.ok(result.success)
})

test('schema: accepts tech category for asset detection', () => {
  const result = ticketExtractionSchema.safeParse({
    total: 299.99,
    category: 'tech',
    provider: 'MediaMarkt',
    confidence: 0.9,
    error: null,
    items: [{ name: 'Auriculares Sony', qty: 1, unit: 'ud', price: 299.99 }],
  })
  assert.ok(result.success)
})

/* ── Default values ── */

test('schema: item qty defaults to 1 when absent', () => {
  const result = ticketExtractionSchema.safeParse({
    items: [{ name: 'Yogur' }],
  })
  assert.ok(result.success)
  assert.equal(result.data?.items?.[0].qty, 1)
})

test('schema: item unit defaults to "ud" when absent', () => {
  const result = ticketExtractionSchema.safeParse({
    items: [{ name: 'Yogur' }],
  })
  assert.ok(result.success)
  assert.equal(result.data?.items?.[0].unit, 'ud')
})

/* ── Invalid payloads ── */

test('schema: rejects invalid category', () => {
  const result = ticketExtractionSchema.safeParse({ category: 'supermarket' })
  assert.ok(!result.success)
})

test('schema: rejects confidence out of range', () => {
  const result = ticketExtractionSchema.safeParse({ confidence: 1.5 })
  assert.ok(!result.success)
})

test('schema: rejects invalid error enum value', () => {
  const result = ticketExtractionSchema.safeParse({ error: 'NETWORK_ERROR' })
  assert.ok(!result.success)
})

test('schema: rejects item without name', () => {
  const result = ticketExtractionSchema.safeParse({
    items: [{ qty: 2, unit: 'kg', price: 3.5 }],
  })
  assert.ok(!result.success)
})

/* ── Gemini mock response simulation ── */

test('schema: parses realistic Gemini JSON output (Carrefour ticket)', () => {
  // Simulates what Gemini 1.5 Flash returns for a Carrefour ticket image
  const geminiOutput = JSON.stringify({
    total: 22.45,
    date: '2026-03-28',
    provider: 'Carrefour',
    category: 'food',
    items: [
      { name: 'Huevos camperos 12ud', qty: 1, unit: 'ud', price: 2.99 },
      { name: 'Pechuga de pollo', qty: 0.8, unit: 'kg', price: 7.20 },
      { name: 'Tomates rama', qty: 0.5, unit: 'kg', price: 1.80 },
      { name: 'Leche semidesnatada Carrefour 6x1L', qty: 1, unit: 'ud', price: 5.45 },
    ],
    confidence: 0.92,
    error: null,
  })

  const parsed = ticketExtractionSchema.safeParse(JSON.parse(geminiOutput))
  assert.ok(parsed.success)
  assert.equal(parsed.data?.provider, 'Carrefour')
  assert.equal(parsed.data?.items?.length, 4)
  assert.equal(parsed.data?.confidence, 0.92)
})

test('schema: parses Gemini output for illegible ticket', () => {
  const geminiOutput = JSON.stringify({
    total: null,
    date: null,
    provider: null,
    category: 'other',
    items: [],
    confidence: 0.2,
    error: 'ILLEGIBLE',
  })

  const parsed = ticketExtractionSchema.safeParse(JSON.parse(geminiOutput))
  assert.ok(parsed.success)
  assert.equal(parsed.data?.error, 'ILLEGIBLE')
  assert.ok((parsed.data?.confidence ?? 1) < 0.7)
})
