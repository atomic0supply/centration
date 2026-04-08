import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { RichCard } from '@/services/conciergeService'
import { formatCurrency } from '@/utils/formatters'

import styles from './Concierge.module.css'

interface Props {
  card: RichCard
}

export function RichCardRenderer({ card }: Props) {
  switch (card.type) {
    case 'chart':
      return <ChartCard card={card} />
    case 'table':
      return <TableCard card={card} />
    case 'alert':
      return <AlertCard card={card} />
    case 'list':
      return <ListCard card={card} />
    default:
      return null
  }
}

/* ── Chart ── */

interface ChartData {
  label: string
  value: number
}

function ChartCard({ card }: Props) {
  const data = Array.isArray(card.data) ? (card.data as ChartData[]) : []

  return (
    <div className={styles.richCard}>
      {card.title && <div className={styles.richCardTitle}>{card.title}</div>}
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ left: -20, right: 4, top: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
            formatter={(value) => [formatCurrency(typeof value === 'number' ? value : 0), '']}
          />
          <Bar dataKey="value" fill="var(--accent-light)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ── Table ── */

interface TableData {
  headers: string[]
  rows: (string | number)[][]
}

function TableCard({ card }: Props) {
  const data = card.data as TableData
  if (!data?.headers || !data?.rows) return null

  return (
    <div className={styles.richCard}>
      {card.title && <div className={styles.richCardTitle}>{card.title}</div>}
      <div style={{ overflowX: 'auto' }}>
        <table className={styles.richTable}>
          <thead>
            <tr>
              {data.headers.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j}>{String(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Alert ── */

interface AlertData {
  severity: 'info' | 'warning' | 'critical'
  body: string
}

function AlertCard({ card }: Props) {
  const data = card.data as AlertData
  const colorMap = {
    info: { bg: 'var(--info-bg)', border: 'var(--info-border)', color: 'var(--info)' },
    warning: { bg: 'var(--warning-bg)', border: 'var(--warning-border)', color: 'var(--warning)' },
    critical: { bg: 'var(--error-bg)', border: 'var(--error-border)', color: 'var(--error)' },
  }
  const c = colorMap[data?.severity ?? 'info']

  return (
    <div
      className={styles.richCard}
      style={{ background: c.bg, borderColor: c.border }}
    >
      {card.title && (
        <div className={styles.richCardTitle} style={{ color: c.color }}>
          {card.title}
        </div>
      )}
      <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>{data?.body}</p>
    </div>
  )
}

/* ── List ── */

interface ListItem {
  label: string
  value?: string
  icon?: string
}

function ListCard({ card }: Props) {
  const items = Array.isArray(card.data) ? (card.data as ListItem[]) : []

  return (
    <div className={styles.richCard}>
      {card.title && <div className={styles.richCardTitle}>{card.title}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 13,
            }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>
              {item.icon && <span style={{ marginRight: 6 }}>{item.icon}</span>}
              {item.label}
            </span>
            {item.value && (
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.value}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
