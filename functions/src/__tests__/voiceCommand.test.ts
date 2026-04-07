import assert from 'node:assert/strict'
import test from 'node:test'

import type { GoogleGenAI } from '@google/genai'

import { callGeminiForVoiceCommand, voiceInventoryCommandSchema } from '../index'

function makeMockGemini(jsonResponse: object): GoogleGenAI {
  return {
    models: {
      generateContent: async () => ({
        text: JSON.stringify(jsonResponse),
      }),
    },
  } as unknown as GoogleGenAI
}

test('callGeminiForVoiceCommand: parsea comando válido', async () => {
  const client = makeMockGemini({
    action: 'consume',
    item: 'cafe',
    quantity: 1,
    unit: 'ud',
    confidence: 0.94,
  })

  const result = await callGeminiForVoiceCommand(client, 'He terminado el cafe', 'es-ES')

  assert.equal(result.action, 'consume')
  assert.equal(result.item, 'cafe')
  assert.equal(result.quantity, 1)
  assert.equal(result.unit, 'ud')
  assert.equal(result.confidence, 0.94)
})

test('callGeminiForVoiceCommand: aplica defaults de schema', async () => {
  const client = makeMockGemini({
    action: 'query',
    item: 'leche',
    confidence: 0.81,
  })

  const result = await callGeminiForVoiceCommand(client, 'Cuanta leche queda', 'es-ES')

  assert.equal(result.quantity, 1)
  assert.equal(result.unit, undefined)
})

test('callGeminiForVoiceCommand: falla si Gemini responde JSON malformado', async () => {
  const client = {
    models: {
      generateContent: async () => ({ text: '{not_json}' }),
    },
  } as unknown as GoogleGenAI

  await assert.rejects(() => callGeminiForVoiceCommand(client, 'texto', 'es-ES'))
})

test('voiceInventoryCommandSchema: rechaza acciones no soportadas', () => {
  const parsed = voiceInventoryCommandSchema.safeParse({
    action: 'update',
    item: 'leche',
    quantity: 2,
    unit: 'ud',
    confidence: 0.9,
  })

  assert.equal(parsed.success, false)
})

