import { useMemo } from 'react'
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Modal } from '@/components/ui'
import type { InventoryItem, PriceHistoryEntry } from '@/types/inventory'
import { formatCurrency, toDate } from '@/utils/formatters'

import styles from './PriceHistoryModal.module.css'

/* ── Inflation monitor helpers ── */

function calcInflation(history: PriceHistoryEntry[]): {
  avgRecent: number
  avgPrevious: number
  deltaPct: number
} | null {
  if (history.length < 2) return null

  const now = Date.now()
  const t30 = now - 30 * 86_400_000
  const t60 = now - 60 * 86_400_000

  const recent = history.filter((e) => {
    const ms = toDate(e.date).getTime()
    return ms >= t30 && ms <= now
  })
  const previous = history.filter((e) => {
    const ms = toDate(e.date).getTime()
    return ms >= t60 && ms < t30
  })

  if (recent.length === 0 || previous.length === 0) return null

  const avgRecent = recent.reduce((s, e) => s + e.price, 0) / recent.length
  const avgPrevious = previous.reduce((s, e) => s + e.price, 0) / previous.length
  const deltaPct = ((avgRecent - avgPrevious) / avgPrevious) * 100

  return { avgRecent, avgPrevious, deltaPct }
}

/* ── Chart data ── */

function useChartData(history: PriceHistoryEntry[]) {
  return useMemo(() => {
    return [...history]
      .sort((a, b) => toDate(a.date).getTime() - toDate(b.date).getTime())
      .map((e) => ({
        date: toDate(e.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
        price: e.price,
        provider: e.provider,
      }))
  }, [history])
}

/* ── Component ── */

interface PriceHistoryModalProps {
  item: InventoryItem | null
  onClose: () => void
}

export function PriceHistoryModal({ item, onClose }: PriceHistoryModalProps) {
  const history = item?.priceHistory ?? []
  const chartData = useChartData(history)
  const inflation = calcInflation(history)
  const sortedHistory = [...history].sort(
    (a, b) => toDate(b.date).getTime() - toDate(a.date).getTime(),
  )

  return (
    <Modal
      open={item !== null}
      onClose={onClose}
      title={item ? `Historial: ${item.name}` : ''}
      maxWidth={560}
    >
      {item && (
        <div className={styles.body}>
          {history.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>📊</div>
              <div className={styles.emptyTitle}>Sin historial</div>
              <div className={styles.emptyDesc}>
                Los precios se registran automáticamente al escanear tickets.
              </div>
            </div>
          ) : (
            <>
              {/* Line chart */}
              {chartData.length > 1 && (
                <div className={styles.chartSection}>
                  <div className={styles.sectionTitle}>Evolución del precio</div>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <XAxis
                        dataKey="date"
                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: number) => `${v}€`}
                        width={46}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null
                          const d = payload[0].payload as typeof chartData[0]
                          return (
                            <div style={{
                              background: 'var(--bg-elevated)',
                              border: '1px solid var(--border)',
                              borderRadius: 'var(--radius-md)',
                              padding: '8px 12px',
                              fontSize: 12,
                            }}>
                              <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
                              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-light)' }}>
                                {formatCurrency(payload[0].value as number)}
                              </div>
                              <div style={{ color: 'var(--text-muted)' }}>{d.provider}</div>
                            </div>
                          )
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="price"
                        stroke="var(--accent-light)"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: 'var(--accent-light)', strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: 'var(--accent-light)', stroke: 'var(--accent)', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Inflation monitor (4.1.7) */}
              {inflation !== null && (
                <div className={styles.inflationSection}>
                  <div className={styles.sectionTitle}>Monitor de inflación personal</div>
                  <div className={styles.inflationRow}>
                    <div className={styles.inflationCard}>
                      <div className={styles.inflationLabel}>Últimos 30 días</div>
                      <div className={styles.inflationValue}>{formatCurrency(inflation.avgRecent)}</div>
                    </div>
                    <div className={styles.inflationArrow}>→</div>
                    <div className={styles.inflationCard}>
                      <div className={styles.inflationLabel}>30 días anteriores</div>
                      <div className={styles.inflationValue}>{formatCurrency(inflation.avgPrevious)}</div>
                    </div>
                    <div className={`${styles.deltaBadge} ${
                      inflation.deltaPct > 0 ? styles.deltaUp :
                      inflation.deltaPct < 0 ? styles.deltaDown : styles.deltaFlat
                    }`}>
                      {inflation.deltaPct > 0 ? '🔴' : inflation.deltaPct < 0 ? '🟢' : '⚪'}
                      {' '}
                      {inflation.deltaPct > 0 ? '+' : ''}{inflation.deltaPct.toFixed(1)}%
                    </div>
                  </div>
                  <p className={styles.inflationNote}>
                    Comparativa de precio promedio entre periodos de 30 días.
                  </p>
                </div>
              )}

              {/* History table */}
              <div className={styles.tableSection}>
                <div className={styles.sectionTitle}>Registro completo</div>
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Proveedor</th>
                        <th className={styles.right}>Precio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedHistory.map((entry, i) => (
                        <tr key={i}>
                          <td>{toDate(entry.date).toLocaleDateString('es-ES')}</td>
                          <td>{entry.provider}</td>
                          <td className={`${styles.right} ${styles.mono}`}>{formatCurrency(entry.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  )
}
