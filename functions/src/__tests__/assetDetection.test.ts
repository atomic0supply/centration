import assert from 'node:assert/strict'
import test from 'node:test'

import { ASSET_PRICE_THRESHOLD, isPotentialAsset, parseTicketDate } from '../lib/assetDetection'

/* ── isPotentialAsset ── */

test('isPotentialAsset: tech + above threshold → true', () => {
  assert.equal(isPotentialAsset('tech', ASSET_PRICE_THRESHOLD + 1), true)
})

test('isPotentialAsset: home + above threshold → true', () => {
  assert.equal(isPotentialAsset('home', 200), true)
})

test('isPotentialAsset: food + above threshold → false', () => {
  assert.equal(isPotentialAsset('food', 200), false)
})

test('isPotentialAsset: tech + exactly at threshold → false (must exceed)', () => {
  assert.equal(isPotentialAsset('tech', ASSET_PRICE_THRESHOLD), false)
})

test('isPotentialAsset: tech + below threshold → false', () => {
  assert.equal(isPotentialAsset('tech', 50), false)
})

test('isPotentialAsset: undefined category → false', () => {
  assert.equal(isPotentialAsset(undefined, 999), false)
})

test('isPotentialAsset: undefined total → false', () => {
  assert.equal(isPotentialAsset('tech', undefined), false)
})

/* ── parseTicketDate ── */

test('parseTicketDate: valid ISO date string', () => {
  const d = parseTicketDate('2026-01-15')
  assert.ok(d instanceof Date)
  assert.equal(d!.getUTCFullYear(), 2026)
  assert.equal(d!.getUTCMonth(), 0) // January
  assert.equal(d!.getUTCDate(), 15)
})

test('parseTicketDate: null input → null', () => {
  assert.equal(parseTicketDate(null), null)
})

test('parseTicketDate: undefined input → null', () => {
  assert.equal(parseTicketDate(undefined), null)
})

test('parseTicketDate: malformed string → null', () => {
  assert.equal(parseTicketDate('not-a-date'), null)
})

test('parseTicketDate: empty string → null', () => {
  assert.equal(parseTicketDate(''), null)
})
