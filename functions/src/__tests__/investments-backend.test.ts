import assert from 'node:assert/strict'
import test from 'node:test'

import { Timestamp } from 'firebase-admin/firestore'

import {
  appendTransactionIfMissing,
  buildRateLimitedFallbackQuote,
  buildRateLimitWindowKey,
  buildStaleFallbackQuote,
  buildSymbolKey,
  calculateNetworthTotals,
  computeInvestmentMetrics,
  isQuoteCacheFresh,
  isRateLimitExceeded,
} from '../index'

function tx(input: {
  txId: string
  type: 'buy' | 'sell'
  qty: number
  price: number
  fee?: number
  date?: string
}) {
  return {
    txId: input.txId,
    type: input.type,
    qty: input.qty,
    price: input.price,
    fee: input.fee ?? 0,
    date: Timestamp.fromDate(new Date(input.date ?? '2026-01-01T00:00:00Z')),
  }
}

test('buy inicial calcula métricas base y DCA', () => {
  const metrics = computeInvestmentMetrics(
    [tx({ txId: 't1', type: 'buy', qty: 2, price: 10, fee: 1 })],
    12,
  )

  assert.equal(metrics.quantity, 2)
  assert.equal(metrics.costBasis, 21)
  assert.equal(metrics.avgBuyPrice, 10.5)
  assert.equal(metrics.realizedPnl, 0)
  assert.equal(metrics.unrealizedPnl, 3)
  assert.equal(metrics.totalPnl, 3)
})

test('múltiples buys recalculan DCA correctamente', () => {
  const metrics = computeInvestmentMetrics(
    [
      tx({ txId: 't1', type: 'buy', qty: 1, price: 10 }),
      tx({ txId: 't2', type: 'buy', qty: 1, price: 20 }),
    ],
    20,
  )

  assert.equal(metrics.quantity, 2)
  assert.equal(metrics.costBasis, 30)
  assert.equal(metrics.avgBuyPrice, 15)
  assert.equal(metrics.currentValue, 40)
})

test('sell parcial actualiza realized/unrealized', () => {
  const metrics = computeInvestmentMetrics(
    [
      tx({ txId: 'b1', type: 'buy', qty: 2, price: 10 }),
      tx({ txId: 's1', type: 'sell', qty: 1, price: 15 }),
    ],
    14,
  )

  assert.equal(metrics.quantity, 1)
  assert.equal(metrics.costBasis, 10)
  assert.equal(metrics.realizedPnl, 5)
  assert.equal(metrics.unrealizedPnl, 4)
  assert.equal(metrics.totalPnl, 9)
})

test('sell mayor que posición falla', () => {
  assert.throws(
    () =>
      computeInvestmentMetrics(
        [
          tx({ txId: 'b1', type: 'buy', qty: 1, price: 10 }),
          tx({ txId: 's1', type: 'sell', qty: 2, price: 10 }),
        ],
        10,
      ),
    /SELL_EXCEEDS_POSITION/,
  )
})

test('txId repetido es idempotente en append helper', () => {
  const base = [tx({ txId: 'same', type: 'buy', qty: 1, price: 10 })]
  const result = appendTransactionIfMissing(
    base,
    tx({ txId: 'same', type: 'buy', qty: 9, price: 99 }),
  )

  assert.equal(result.added, false)
  assert.equal(result.transactions.length, 1)
  assert.equal(result.transactions[0].qty, 1)
})

test('cache hit/miss helper para TTL 15m', () => {
  const now = Date.now()
  const fresh = Timestamp.fromMillis(now - 5 * 60 * 1000)
  const stale = Timestamp.fromMillis(now - 20 * 60 * 1000)

  assert.equal(isQuoteCacheFresh(fresh, now), true)
  assert.equal(isQuoteCacheFresh(stale, now), false)
})

test('rate limit detecta cuando se supera 60/min', () => {
  assert.equal(isRateLimitExceeded(60), false)
  assert.equal(isRateLimitExceeded(61), true)
})

test('limit exceeded path devuelve stale fallback con RATE_LIMIT', () => {
  const rateLimit = {
    used: 61,
    remaining: 0,
    windowKey: '202604081234',
    allowed: false,
  }
  const quote = buildRateLimitedFallbackQuote({
    symbol: 'AAPL',
    price: 150,
    currency: 'USD',
    priceUpdatedAt: Timestamp.fromMillis(1_700_000_000_000),
    rateLimit,
  })

  assert.equal(quote.stale, true)
  assert.equal(quote.source, 'stale-fallback')
  assert.equal(quote.error, 'RATE_LIMIT')
  assert.equal(quote.price, 150)
  assert.equal(quote.rateLimit?.remaining, 0)
})

test('stale fallback helper marca source/stale correctamente', () => {
  const fallback = buildStaleFallbackQuote({
    symbol: 'AAPL',
    price: 123,
    currency: 'USD',
    priceUpdatedAt: null,
    error: 'UPSTREAM_ERROR',
  })

  assert.equal(fallback.stale, true)
  assert.equal(fallback.source, 'stale-fallback')
  assert.equal(fallback.error, 'UPSTREAM_ERROR')
})

test('networth helper aplica fórmula inversiones + activos + liquidez - deudas', () => {
  const result = calculateNetworthTotals({
    investments: 1000,
    assets: 2500,
    liquidCash: 400,
    debts: 300,
  })

  assert.equal(result.totalValue, 3600)
  assert.equal(result.breakdown.investments, 1000)
  assert.equal(result.breakdown.physicalAssets, 2500)
  assert.equal(result.breakdown.liquid, 400)
  assert.equal(result.breakdown.debts, 300)
})

test('window key y symbol key tienen formato estable', () => {
  const key = buildRateLimitWindowKey(new Date('2026-04-08T12:34:56.000Z'))
  assert.equal(key, '202604081234')

  assert.equal(buildSymbolKey('BINANCE:BTCUSDT'), 'binance_btcusdt')
  assert.equal(buildSymbolKey('AAPL'), 'aapl')
})
