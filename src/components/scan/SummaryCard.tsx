import { motion } from 'framer-motion'
import { useState } from 'react'

import { Button } from '@/components/ui'
import { CATEGORY_EMOJIS, CATEGORY_LABELS, type ExtractedTicket } from '@/types/ticket'

import { AutoConfirmTimer } from './AutoConfirmTimer'
import { DataOriginBadge } from './DataOriginBadge'
import styles from './SummaryCard.module.css'

interface SummaryCardProps {
  ticket: ExtractedTicket
  onConfirm: () => void
  onEdit: () => void
}

const PREVIEW_ITEMS = 3

export function SummaryCard({ ticket, onConfirm, onEdit }: SummaryCardProps) {
  const [autoConfirm, setAutoConfirm] = useState(true)

  const formattedDate = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(ticket.date + 'T12:00:00'))

  const previewItems = ticket.items.slice(0, PREVIEW_ITEMS)
  const remaining = ticket.items.length - PREVIEW_ITEMS

  const confidenceColor =
    ticket.confidence >= 0.85
      ? 'var(--success)'
      : ticket.confidence >= 0.65
        ? 'var(--warning)'
        : 'var(--error)'

  const confidenceBg =
    ticket.confidence >= 0.85
      ? 'var(--success-bg)'
      : ticket.confidence >= 0.65
        ? 'var(--warning-bg)'
        : 'var(--error-bg)'

  return (
    <motion.div
      className={styles.card}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
    >
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.storeInfo}>
          <h2 className={styles.storeName}>{ticket.store}</h2>
          <p className={styles.storeDate}>{formattedDate}</p>
        </div>

        <span
          className={styles.confidenceBadge}
          style={{ color: confidenceColor, background: confidenceBg, border: `1px solid ${confidenceColor}30` }}
        >
          <DataOriginBadge origin={ticket.origin} />
          <span>{Math.round(ticket.confidence * 100)}%</span>
        </span>
      </div>

      {/* ── Metrics ── */}
      <div className={styles.metrics}>
        {/* Total */}
        <div className={styles.metricRow}>
          <span className={styles.metricLabel}>Total</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <span className={styles.totalValue}>
              {ticket.total.toLocaleString('es-ES', {
                style: 'currency',
                currency: ticket.currency,
              })}
            </span>
            <DataOriginBadge origin={ticket.origin} />
          </div>
        </div>

        {/* Items count */}
        <div className={styles.metricRow}>
          <span className={styles.metricLabel}>Artículos</span>
          <div className={styles.metricValue}>
            <span>{ticket.items.length}</span>
            <DataOriginBadge origin={ticket.origin} />
          </div>
        </div>

        {/* Category */}
        <div className={styles.metricRow}>
          <span className={styles.metricLabel}>Categoría</span>
          <div className={styles.metricValue}>
            <span>
              {CATEGORY_EMOJIS[ticket.category]} {CATEGORY_LABELS[ticket.category]}
            </span>
            <DataOriginBadge origin={ticket.origin} />
          </div>
        </div>
      </div>

      {/* ── Items preview ── */}
      {ticket.items.length > 0 && (
        <div className={styles.itemsSection}>
          <p className={styles.itemsTitle}>Artículos</p>
          {previewItems.map((item) => (
            <div key={item.id} className={styles.itemRow}>
              <span className={styles.itemName}>
                {item.quantity > 1 && (
                  <span style={{ color: 'var(--accent-light)', marginRight: 4, fontSize: 12 }}>
                    ×{item.quantity}
                  </span>
                )}
                {item.name}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className={styles.itemTotal}>
                  {item.total.toLocaleString('es-ES', { style: 'currency', currency: ticket.currency })}
                </span>
                <DataOriginBadge origin={item.origin} />
              </div>
            </div>
          ))}
          {remaining > 0 && (
            <p className={styles.moreItems}>+ {remaining} artículo{remaining !== 1 ? 's' : ''} más</p>
          )}
        </div>
      )}

      {/* ── Actions ── */}
      <div className={styles.actions}>
        <Button variant="ghost" size="md" onClick={onEdit} style={{ flex: 1 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Editar
        </Button>
        <Button
          variant="primary"
          size="md"
          onClick={() => { setAutoConfirm(false); onConfirm() }}
          style={{ flex: 2 }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Confirmar
        </Button>
      </div>

      {/* ── Auto-confirm countdown ── */}
      {autoConfirm && (
        <AutoConfirmTimer
          seconds={5}
          onConfirm={onConfirm}
          onCancel={() => { setAutoConfirm(false) }}
        />
      )}
    </motion.div>
  )
}
