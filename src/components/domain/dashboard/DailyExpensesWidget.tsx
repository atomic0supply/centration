import { useExpensesStore } from '@/stores/expensesStore'
import { formatCurrency, toDate } from '@/utils/formatters'

import styles from './widgets.module.css'

export function DailyExpensesWidget() {
  const expenses = useExpensesStore((s) => s.expenses)

  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]

  const todayTotal = expenses
    .filter((e) => toDate(e.date).toISOString().split('T')[0] === todayStr)
    .reduce((sum, e) => sum + e.amount, 0)

  // Daily average for this month
  const year = now.getFullYear()
  const month = now.getMonth()
  const daysElapsed = Math.max(now.getDate(), 1)

  const monthTotal = expenses
    .filter((e) => {
      const d = toDate(e.date)
      return d.getFullYear() === year && d.getMonth() === month
    })
    .reduce((sum, e) => sum + e.amount, 0)

  const dailyAvg = monthTotal / daysElapsed

  const diff = todayTotal - dailyAvg
  const diffPct = dailyAvg > 0 ? (diff / dailyAvg) * 100 : 0
  const isOver = diff > 0

  // Last 7 days sparkline data
  const sparkData: number[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const ds = d.toISOString().split('T')[0]
    const total = expenses
      .filter((e) => toDate(e.date).toISOString().split('T')[0] === ds)
      .reduce((sum, e) => sum + e.amount, 0)
    sparkData.push(total)
  }

  const maxVal = Math.max(...sparkData, 1)

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <span className={styles.title}>Gastos Hoy</span>
        <span className={styles.icon}>💸</span>
      </div>

      <div className={styles.bigValue}>{formatCurrency(todayTotal)}</div>

      <div className={styles.sub}>
        <span className={isOver ? styles.negative : styles.positive}>
          {isOver ? '▲' : '▼'} {Math.abs(diffPct).toFixed(0)}%
        </span>{' '}
        vs media diaria ({formatCurrency(dailyAvg)})
      </div>

      {/* Mini sparkline */}
      <div className={styles.sparkline}>
        {sparkData.map((v, i) => {
          const isToday = i === 6
          const h = Math.max((v / maxVal) * 40, 3)
          return (
            <div
              key={i}
              className={styles.sparkBar}
              style={{
                height: h,
                background: isToday
                  ? 'var(--accent-light)'
                  : 'var(--border-strong)',
                opacity: isToday ? 1 : 0.5,
              }}
              title={`${formatCurrency(v)}`}
            />
          )
        })}
      </div>

      <div className={styles.sparkLabel}>
        <span>hace 6 días</span>
        <span>hoy</span>
      </div>
    </div>
  )
}
