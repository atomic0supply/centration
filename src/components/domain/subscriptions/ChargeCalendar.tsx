import { useMemo, useState } from 'react'

import type { Subscription } from '@/types/expense'
import { SUBSCRIPTION_CATEGORY_COLORS } from '@/types/expense'
import { formatCurrency, toDate } from '@/utils/formatters'

import styles from './ChargeCalendar.module.css'

interface ChargeCalendarProps {
  subscriptions: Subscription[]
}

const WEEKDAY_NAMES = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

interface DayCell {
  date: Date
  day: number
  isOtherMonth: boolean
  isToday: boolean
  charges: Subscription[]
}

function getCalendarDays(year: number, month: number, subs: Subscription[]): DayCell[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const firstDay = new Date(year, month, 1)

  // Start from Monday of the week containing the first day
  let startDay = firstDay.getDay() - 1 // 0=Mon, 6=Sun
  if (startDay < 0) startDay = 6
  const start = new Date(year, month, 1 - startDay)

  const days: DayCell[] = []
  const current = new Date(start)

  // Generate 6 weeks of days (42 cells)
  for (let i = 0; i < 42; i++) {
    const d = new Date(current)
    const isOtherMonth = d.getMonth() !== month

    const charges = subs.filter((sub) => {
      const subDate = toDate(sub.nextPaymentDate)
      return subDate.getDate() === d.getDate() && subDate.getMonth() === d.getMonth() && subDate.getFullYear() === d.getFullYear()
    })

    days.push({
      date: d,
      day: d.getDate(),
      isOtherMonth,
      isToday: d.getTime() === today.getTime(),
      charges,
    })

    current.setDate(current.getDate() + 1)
  }

  return days
}

export function ChargeCalendar({ subscriptions }: ChargeCalendarProps) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const activeSubs = subscriptions.filter((s) => s.status !== 'cancelled')

  const days = useMemo(() => getCalendarDays(viewYear, viewMonth, activeSubs), [viewYear, viewMonth, activeSubs])

  // Upcoming charges (this month)
  const upcomingCharges = useMemo(() => {
    return activeSubs
      .filter((s) => {
        const d = toDate(s.nextPaymentDate)
        return d.getMonth() === viewMonth && d.getFullYear() === viewYear
      })
      .sort((a, b) => toDate(a.nextPaymentDate).getTime() - toDate(b.nextPaymentDate).getTime())
  }, [activeSubs, viewMonth, viewYear])

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  return (
    <div className={styles.calendar}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </div>
        <div className={styles.navBtns}>
          <button className={styles.navBtn} onClick={prevMonth} type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button className={styles.navBtn} onClick={nextMonth} type="button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      <div className={styles.weekdays}>
        {WEEKDAY_NAMES.map((d) => (
          <div key={d} className={styles.weekday}>{d}</div>
        ))}
      </div>

      <div className={styles.grid}>
        {days.map((cell, i) => (
          <div
            key={i}
            className={[
              styles.day,
              cell.isOtherMonth ? styles.dayOtherMonth : '',
              cell.isToday ? styles.dayToday : '',
              cell.charges.length > 0 ? styles.dayHasCharge : '',
            ].filter(Boolean).join(' ')}
            title={cell.charges.map((c) => `${c.name}: ${formatCurrency(c.amount)}`).join('\n') || undefined}
          >
            {cell.day}
            {cell.charges.length > 0 && (
              <div className={styles.dots}>
                {cell.charges.slice(0, 3).map((c, j) => (
                  <div
                    key={j}
                    className={styles.dot}
                    style={{ background: SUBSCRIPTION_CATEGORY_COLORS[c.category] }}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {upcomingCharges.length > 0 && (
        <div className={styles.chargeList}>
          <div className={styles.chargeListTitle}>
            Cobros este mes ({upcomingCharges.length})
          </div>
          {upcomingCharges.map((sub) => (
            <div key={sub.id} className={styles.chargeItem}>
              <div
                className={styles.chargeDot}
                style={{ background: SUBSCRIPTION_CATEGORY_COLORS[sub.category] }}
              />
              <span className={styles.chargeName}>{sub.name}</span>
              <span className={styles.chargeDate}>
                {toDate(sub.nextPaymentDate).getDate()} {MONTH_NAMES[viewMonth].slice(0, 3)}
              </span>
              <span className={styles.chargeAmount}>
                {formatCurrency(sub.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
