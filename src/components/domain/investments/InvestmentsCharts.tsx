import {
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { DiversificationPoint, PortfolioLinePoint } from '@/types/investment'
import { formatCurrency } from '@/utils/formatters'

import styles from './InvestmentsCharts.module.css'

interface InvestmentsChartsProps {
  lineData: PortfolioLinePoint[]
  diversification: DiversificationPoint[]
}

export function InvestmentsCharts({ lineData, diversification }: InvestmentsChartsProps) {
  const pieData = diversification.map((row) => ({
    ...row,
    fill: row.color,
  }))

  return (
    <div className={styles.grid}>
      <div className={styles.card}>
        <div className={styles.title}>Rendimiento portfolio</div>
        {lineData.length === 0 ? (
          <div className={styles.empty}>Sin snapshots todavía</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={lineData}>
              <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                tickFormatter={(value) => `${String(value)}€`}
                width={60}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || payload.length === 0) return null
                  const value = Number(payload[0].value)
                  return (
                    <div className={styles.tooltip}>
                      <div>{label}</div>
                      <div>{formatCurrency(value)}</div>
                    </div>
                  )
                }}
              />
              <Line dataKey="totalValue" type="monotone" stroke="var(--accent-light)" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.title}>Diversificación</div>
        {diversification.length === 0 ? (
          <div className={styles.empty}>Sin posiciones con valor</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={84}
                paddingAngle={3}
                strokeWidth={0}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || payload.length === 0) return null
                  const d = payload[0].payload as DiversificationPoint
                  return (
                    <div className={styles.tooltip}>
                      <div>{d.label}</div>
                      <div>{formatCurrency(d.value)}</div>
                    </div>
                  )
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
