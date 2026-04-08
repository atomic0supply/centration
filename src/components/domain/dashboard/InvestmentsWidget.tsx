import { Line, LineChart, ResponsiveContainer, Tooltip } from 'recharts'

import { useInvestmentsStore } from '@/stores/investmentsStore'
import { formatCurrency } from '@/utils/formatters'

import styles from './widgets.module.css'

export function InvestmentsWidget() {
  const { totals, lineSeries } = useInvestmentsStore()
  const totalsSummary = totals()
  const lineSeriesData = lineSeries()

  const { totalValue, totalPnl, unrealizedPnl, roiPct, staleCount } = totalsSummary
  const isGain = totalPnl >= 0

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <span className={styles.title}>
          Inversiones
          {staleCount > 0 && (
            <span
              style={{
                marginLeft: 6,
                fontSize: 10,
                color: 'var(--warning)',
                fontWeight: 600,
              }}
            >
              ({staleCount} precio desactualizado)
            </span>
          )}
        </span>
        <span className={styles.icon}>📊</span>
      </div>

      <div className={styles.bigValue}>{formatCurrency(totalValue)}</div>

      <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
        <div>
          <div
            className={isGain ? styles.positive : styles.negative}
            style={{ fontSize: 15, fontWeight: 700 }}
          >
            {isGain ? '+' : ''}
            {formatCurrency(totalPnl)}
          </div>
          <div className={styles.sub} style={{ fontSize: 12 }}>
            P&L total · ROI {roiPct >= 0 ? '+' : ''}
            {roiPct.toFixed(2)}%
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 50 }}>
          {lineSeriesData.length > 1 ? (
            <ResponsiveContainer width="100%" height={54}>
              <LineChart data={lineSeriesData}>
                <Line
                  type="monotone"
                  dataKey="value"
                  dot={false}
                  strokeWidth={2}
                  stroke={isGain ? 'var(--success)' : 'var(--error)'}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  formatter={(value) => [
                    formatCurrency(typeof value === 'number' ? value : 0),
                    'Valor',
                  ]}
                  labelStyle={{ display: 'none' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div
              style={{
                height: 54,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                fontSize: 12,
              }}
            >
              Sin historial aún
            </div>
          )}
        </div>
      </div>

      <div className={styles.rows}>
        <div className={styles.row}>
          <span className={styles.rowLabel}>No realizado</span>
          <span
            className={`${styles.rowValue} ${unrealizedPnl >= 0 ? styles.positive : styles.negative}`}
          >
            {unrealizedPnl >= 0 ? '+' : ''}
            {formatCurrency(unrealizedPnl)}
          </span>
        </div>
      </div>
    </div>
  )
}
