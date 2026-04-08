/**
 * Tests for Phase 6.2 — Modo Conserje (Chat con Gemini)
 * Pattern: file-content assertions (no DOM), matching the project's test convention.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

function readSrc(rel) {
  return readFileSync(new URL(`../src/${rel}`, import.meta.url), 'utf8')
}

function readFn(rel) {
  return readFileSync(new URL(`../functions/src/${rel}`, import.meta.url), 'utf8')
}

// ── Concierge service ──

describe('conciergeService', () => {
  const src = readSrc('services/conciergeService.ts')

  it('exports subscribeChatMessages', () => {
    assert.ok(src.includes('export function subscribeChatMessages'), 'subscribeChatMessages missing')
  })

  it('exports sendConciergeMessage', () => {
    assert.ok(src.includes('export async function sendConciergeMessage'), 'sendConciergeMessage missing')
  })

  it('subscribes to chat_history/{uid}/messages ordered by timestamp', () => {
    assert.ok(src.includes("'chat_history'"), 'collection path missing')
    assert.ok(src.includes("orderBy('timestamp', 'asc')"), 'orderBy timestamp asc missing')
  })

  it('sends Bearer token in Authorization header', () => {
    assert.ok(src.includes('Authorization'), 'Authorization header missing')
    assert.ok(src.includes('Bearer'), 'Bearer token missing')
    assert.ok(src.includes('getIdToken'), 'getIdToken call missing')
  })

  it('exports RichCard and ChatMessage types', () => {
    assert.ok(src.includes('export interface RichCard'), 'RichCard interface missing')
    assert.ok(src.includes('export interface ChatMessage'), 'ChatMessage interface missing')
  })
})

// ── Concierge store ──

describe('conciergeStore', () => {
  const src = readSrc('stores/conciergeStore.ts')

  it('exposes messages, loading, sending, error state', () => {
    assert.ok(src.includes('messages:'), 'messages state missing')
    assert.ok(src.includes('loading:'), 'loading state missing')
    assert.ok(src.includes('sending:'), 'sending state missing')
    assert.ok(src.includes('error:'), 'error state missing')
  })

  it('exposes init, send, clearError actions', () => {
    assert.ok(src.includes('init:'), 'init action missing')
    assert.ok(src.includes('send:'), 'send action missing')
    assert.ok(src.includes('clearError:'), 'clearError action missing')
  })

  it('calls subscribeChatMessages in init', () => {
    assert.ok(src.includes('subscribeChatMessages'), 'subscribeChatMessages call missing')
  })

  it('calls sendConciergeMessage in send', () => {
    assert.ok(src.includes('sendConciergeMessage'), 'sendConciergeMessage call missing')
  })

  it('prevents concurrent sends with guard', () => {
    assert.ok(src.includes('get().sending'), 'sending guard missing')
  })
})

// ── ConciergeChat component ──

describe('ConciergeChat component', () => {
  const src = readSrc('components/domain/agents/ConciergeChat.tsx')

  it('uses useConciergeStore (Firestore persistence)', () => {
    assert.ok(src.includes('useConciergeStore'), 'useConciergeStore missing')
  })

  it('has voice input via SpeechRecognition', () => {
    assert.ok(src.includes('SpeechRecognition'), 'SpeechRecognition missing')
    assert.ok(src.includes('recognition.lang'), 'recognition.lang missing')
    assert.ok(src.includes('isRecording'), 'isRecording state missing')
  })

  it('uses framer-motion AnimatePresence for message animations', () => {
    assert.ok(src.includes('AnimatePresence'), 'AnimatePresence missing')
    assert.ok(src.includes("from 'framer-motion'"), 'framer-motion import missing')
  })

  it('parses assistant JSON wrapper to extract text', () => {
    assert.ok(src.includes('JSON.parse'), 'JSON.parse for assistant content missing')
    assert.ok(src.includes('parsed.text'), 'text extraction missing')
  })

  it('renders RichCardRenderer for rich cards', () => {
    assert.ok(src.includes('RichCardRenderer'), 'RichCardRenderer missing')
  })
})

// ── SuggestedQuestions ──

describe('SuggestedQuestions component', () => {
  const src = readSrc('components/domain/concierge/SuggestedQuestions.tsx')

  it('has at least 6 suggestion chips', () => {
    const chips = src.match(/text:/g) ?? []
    assert.ok(chips.length >= 6, `Expected ≥6 suggestion chips, got ${chips.length}`)
  })

  it('calls onSelect when a chip is clicked', () => {
    assert.ok(src.includes('onSelect'), 'onSelect prop missing')
    assert.ok(src.includes('onClick'), 'onClick handler missing')
  })

  it('disables chips when disabled prop is true', () => {
    assert.ok(src.includes('disabled={disabled}'), 'disabled prop missing')
  })
})

// ── RichCardRenderer ──

describe('RichCardRenderer', () => {
  const src = readSrc('components/domain/concierge/RichCardRenderer.tsx')

  it('handles all 4 rich card types', () => {
    assert.ok(src.includes("case 'chart'"), 'chart case missing')
    assert.ok(src.includes("case 'table'"), 'table case missing')
    assert.ok(src.includes("case 'alert'"), 'alert case missing')
    assert.ok(src.includes("case 'list'"), 'list case missing')
  })

  it('renders recharts BarChart for chart cards', () => {
    assert.ok(src.includes('BarChart'), 'BarChart missing for chart cards')
  })

  it('renders HTML table for table cards', () => {
    assert.ok(src.includes('<table'), 'table element missing')
    assert.ok(src.includes('<thead>'), 'thead missing')
    assert.ok(src.includes('<tbody>'), 'tbody missing')
  })
})

// ── Cloud Function: conciergeChat ──

describe('conciergeChat Cloud Function', () => {
  const src = readFn('index.ts')

  // Find the section between buildConciergeSystemPrompt and voiceToInventory
  const conciergeSection = (() => {
    const start = src.indexOf('buildConciergeSystemPrompt')
    const end = src.indexOf('export const voiceToInventory')
    return start >= 0 && end >= 0 ? src.slice(start, end) : src
  })()

  it('has buildUserContext function that queries 5+ Firestore collections', () => {
    assert.ok(src.includes('buildUserContext'), 'buildUserContext function missing')
    assert.ok(src.includes("'expenses'"), 'expenses collection missing')
    assert.ok(src.includes("'inventory'"), 'inventory collection missing')
    assert.ok(src.includes("'assets'"), 'assets collection missing')
    assert.ok(src.includes("'investments'"), 'investments collection missing')
  })

  it('has buildConciergeSystemPrompt that injects financial context', () => {
    assert.ok(src.includes('buildConciergeSystemPrompt'), 'buildConciergeSystemPrompt missing')
    assert.ok(src.includes('expensesThisMonth'), 'expenses context missing')
    assert.ok(src.includes('subscriptionsMonthly'), 'subscriptions context missing')
    assert.ok(src.includes('inventoryLowStock'), 'inventory context missing')
    assert.ok(src.includes('assetAlerts'), 'asset alerts context missing')
  })

  it('sends conversation history to Gemini (multi-turn)', () => {
    const fnStart = src.indexOf('export const conciergeChat')
    const fnSection = src.slice(fnStart, fnStart + 5000)
    assert.ok(fnSection.includes('history'), 'conversation history missing')
    assert.ok(fnSection.includes('conversationParts'), 'conversationParts array missing')
  })

  it('stores richCard separately in Firestore', () => {
    const fnStart = src.indexOf('export const conciergeChat')
    const fnSection = src.slice(fnStart, fnStart + 5000)
    assert.ok(fnSection.includes('richCard'), 'richCard field missing in stored message')
  })

  it('increases timeout to 90s for context building + Gemini', () => {
    const fnStart = src.indexOf('export const conciergeChat')
    const fnSection = src.slice(fnStart, fnStart + 500)
    assert.ok(fnSection.includes('timeoutSeconds: 90'), 'timeout should be 90s')
  })
})

// ── Firestore schema: chat_history ──

describe('chat_history Firestore schema', () => {
  const conciergeServiceSrc = readSrc('services/conciergeService.ts')

  it('ChatMessage has role, content, timestamp, richCard fields', () => {
    assert.ok(conciergeServiceSrc.includes("role: data.role as 'user' | 'assistant'"), 'role field missing')
    assert.ok(conciergeServiceSrc.includes('content:'), 'content field missing')
    assert.ok(conciergeServiceSrc.includes('timestamp:'), 'timestamp field missing')
    assert.ok(conciergeServiceSrc.includes('richCard:'), 'richCard field missing')
  })
})
