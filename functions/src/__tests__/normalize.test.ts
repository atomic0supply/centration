import assert from 'node:assert/strict'
import test from 'node:test'

import { findBestMatch, FUZZY_THRESHOLD, normalizeName, similarity } from '../lib/normalize'

test('normalizeName: strips accents', () => {
  assert.equal(normalizeName('Leché Èntera'), 'leche entera')
})

test('normalizeName: lowercases', () => {
  assert.equal(normalizeName('ZUMO NARANJA'), 'zumo naranja')
})

test('normalizeName: removes special chars', () => {
  assert.equal(normalizeName('Coca-Cola 2L (pack)'), 'cocacola 2l pack')
})

test('normalizeName: collapses whitespace', () => {
  assert.equal(normalizeName('  leche   entera  '), 'leche entera')
})

test('similarity: identical strings → 1.0', () => {
  assert.equal(similarity('leche entera', 'leche entera'), 1.0)
})

test('similarity: substring match → 0.85', () => {
  assert.equal(similarity('Leche Entera 1L', 'Leche Entera'), 0.85)
})

test('similarity: partial word overlap', () => {
  const score = similarity('Leche Entera Asturiana', 'Leche Entera')
  assert.ok(score > FUZZY_THRESHOLD, `Expected score > ${FUZZY_THRESHOLD}, got ${score}`)
})

test('similarity: completely different → near 0', () => {
  const score = similarity('Papel higiénico', 'Zumo naranja')
  assert.ok(score < FUZZY_THRESHOLD, `Expected score < ${FUZZY_THRESHOLD}, got ${score}`)
})

test('findBestMatch: returns null when no candidates', () => {
  assert.equal(findBestMatch('leche', []), null)
})

test('findBestMatch: returns best match above threshold', () => {
  const candidates = [
    { id: 'a', normalizedName: 'zumo naranja' },
    { id: 'b', normalizedName: 'leche entera' },
  ]
  const result = findBestMatch('Leche Entera 1L', candidates)
  assert.equal(result?.id, 'b')
})

test('findBestMatch: returns null when best is below threshold', () => {
  const candidates = [{ id: 'x', normalizedName: 'papel higienico' }]
  const result = findBestMatch('Zumo naranja', candidates)
  assert.equal(result, null)
})

test('findBestMatch: deduplicates same product with different size variant', () => {
  const candidates = [{ id: 'milk', normalizedName: 'leche entera' }]
  const result = findBestMatch('Leche entera 1l', candidates)
  assert.equal(result?.id, 'milk')
})
