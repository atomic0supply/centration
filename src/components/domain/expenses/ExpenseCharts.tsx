import { useMemo, useState } from 'react'
import {
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { Expense, ExpenseCategory } from '@/types/expense'
import {
  EXPENSE_CATEGORY_COLORS,
  EXPENSE_CATEGORY_LABELS,
} from '@/types/expense'
import { formatCurrency, monthName, toDate } from '@/utils/formatters'

import styles from './ExpenseCharts.module.css'

interface ExpenseChartsProps {
  expenses: Expense[]
}

/* ── Donut chart: expenses by category ── */

interface CategoryData {
  name: string
  value: number
  color: string
  category: ExpenseCategory
  percent: number
}

function useCategoryData(expenses: Expense[]): CategoryData[] {
  return useMemo(() => {
    const map = new Map<ExpenseCategory, number>()
    for (const e of expenses) {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount)
    }
    const total = Array.from(map.values()).reduce((s, v) => s + v, 0)
    return Array.from(map.entries())
      .map(([cat, value]) => ({
        name: EXPENSE_CATEGORY_LABELS[cat],
        value,
        color: EXPENSE_CATEGORY_COLORS[cat],
        category: cat,
        percent: total > 0 ? (value / total) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value)
  }, [expenses])
}

function CategoryDonutChart({ expenses }: { expenses: Expense[] }) {
  const data = useCategoryData(expenses)
  const total = data.reduce((s, d) => s + d.value, 0)

  if (data.length === 0) {
    return <div className={styles.emptyChart}>Sin datos de gastos</div>
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry) => (
              <Cell key={entry.category} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload as CategoryData
              return (
                <div style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 12px',
                  fontSize: 13,
                }}>
                  <div style={{ fontWeight: 600 }}>{d.name}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', color: d.color }}>
                    {formatCurrency(d.value)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {d.percent.toFixed(1)}%
                  </div>
                </div>
              )
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className={styles.legendList}>
        {data.map((d) => (
          <div key={d.category} className={styles.legendItem}>
            <div className={styles.legendDot} style={{ background: d.color }} />
            <span className={styles.legendLabel}>{d.name}</span>
            <span className={styles.legendValue}>{formatCurrency(d.value)}</span>
            <span className={styles.legendPercent}>{d.percent.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Line chart: expenses over time ── */

type TimeRange = 'weekly' | 'monthly'

interface TimeDataPoint {
  label: string
  total: number
}

function useTimeSeriesData(expenses: Expense[], range: TimeRange): TimeDataPoint[] {
  return useMemo(() => {
    if (expenses.length === 0) return []

    const now = new Date()
    const map = new Map<string, number>()

    if (range === 'monthly') {
      // Last 12 months
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        map.set(key, 0)
      }
      for (const e of expenses) {
        const d = toDate(e.date)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (map.has(key)) {
          map.set(key, (map.get(key) ?? 0) + e.amount)
        }
      }
      return Array.from(map.entries()).map(([key, total]) => ({
        label: monthName(parseInt(key.split('-')[1]) - 1),
        total,
      }))
    } else {
      // Last 8 weeks
      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date(now)
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() - i * 7)
        const key = weekStart.toISOString().split('T')[0]
        map.set(key, 0)
      }
      for (const e of expenses) {
        const d = toDate(e.date)
        const weekStart = new Date(d)
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        const key = weekStart.toISOString().split('T')[0]
        if (map.has(key)) {
          map.set(key, (map.get(key) ?? 0) + e.amount)
        }
      }
      return Array.from(map.entries()).map(([key, total]) => {
        const d = new Date(key)
        return {
          label: `${d.getDate()}/${d.getMonth() + 1}`,
          total,
        }
      })
    }
  }, [expenses, range])
}

function TimeLineChart({ expenses }: { expenses: Expense[] }) {
  const [range, setRange] = useState<TimeRange>('monthly')
  const data = useTimeSeriesData(expenses, range)

  if (data.length === 0) {
    return <div className={styles.emptyChart}>Sin datos de gastos</div>
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}€`}
            width={50}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              return (
                <div style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 12px',
                  fontSize: 13,
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-light)' }}>
                    {formatCurrency(payload[0].value as number)}
                  </div>
                </div>
              )
            }}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke="var(--accent-light)"
            strokeWidth={2.5}
            dot={{ r: 3, fill: 'var(--accent-light)', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: 'var(--accent-light)', stroke: 'var(--accent)', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ── Main charts container ── */

export function ExpenseCharts({ expenses }: ExpenseChartsProps) {
  const total = expenses.reduce((s, e) => s + e.amount, 0)

  return (
    <div className={styles.chartsContainer}>
      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div>
            <div className={styles.chartTitle}>Gastos por categoría</div>
            <div className={styles.chartSubtitle}>Distribución del gasto</div>
          </div>
          <div className={styles.chartTotal}>{formatCurrency(total)}</div>
        </div>
        <CategoryDonutChart expenses={expenses} />
      </div>

      <div className={styles.chartCard}>
        <div className={styles.chartHeader}>
          <div>
            <div className={styles.chartTitle}>Evolución temporal</div>
            <div className={styles.chartSubtitle}>Gasto mensual</div>
          </div>
        </div>
        <TimeLineChart expenses={expenses} />
      </div>
    </div>
  )
}
