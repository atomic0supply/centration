import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useExpensesStore } from '@/stores/expensesStore'
import { useSubscriptionsStore } from '@/stores/subscriptionsStore'
import { formatCurrency, monthName, toDate } from '@/utils/formatters'

import styles from './widgets.module.css'

interface MonthData {
  label: string
  gastos: number
  suscripciones: number
}

export function MonthlyFlowWidget() {
  const expenses = useExpensesStore((s) => s.expenses)
  const { totalMonthlyCost } = useSubscriptionsStore()
  const totalMonthlySubs = totalMonthlyCost()

  // Build last 6 months
  const now = new Date()
  const data: MonthData[] = []

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = d.getMonth()

    const monthExpenses = expenses
      .filter((e) => {
        const ed = toDate(e.date)
        return ed.getFullYear() === y && ed.getMonth() === m
      })
      .reduce((sum, e) => sum + e.amount, 0)

    data.push({
      label: monthName(m),
      gastos: monthExpenses,
      suscripciones: i === 0 ? totalMonthlySubs : 0,
    })
  }

  const currentMonth = data[data.length - 1]
  const prevMonth = data[data.length - 2]
  const diff =
    prevMonth && prevMonth.gastos > 0
      ? ((currentMonth.gastos - prevMonth.gastos) / prevMonth.gastos) * 100
      : 0

  return (
    <div className={styles.widget} style={{ minHeight: 220 }}>
      <div className={styles.header}>
        <span className={styles.title}>Flujo Mensual</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 12,
              color: diff > 0 ? 'var(--error)' : 'var(--success)',
            }}
          >
            {diff > 0 ? '▲' : '▼'} {Math.abs(diff).toFixed(0)}%
          </span>
          <span className={styles.icon}>📈</span>
        </div>
      </div>

      <div className={styles.bigValue} style={{ fontSize: 22 }}>
        {formatCurrency(currentMonth.gastos)}
        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>
          este mes
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 100 }}>
        <ResponsiveContainer width="100%" height={110}>
          <BarChart data={data} barSize={18} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `€${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value) => [
                formatCurrency(typeof value === 'number' ? value : 0),
                'Gastos',
              ]}
              labelStyle={{ color: 'var(--text-secondary)' }}
            />
            <Bar dataKey="gastos" radius={[4, 4, 0, 0]}>
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={i === data.length - 1 ? 'var(--accent-light)' : 'var(--border-strong)'}
                  opacity={i === data.length - 1 ? 1 : 0.6}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
