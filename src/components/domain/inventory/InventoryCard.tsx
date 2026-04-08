import { useRef, useState } from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion'

import { ProgressRing } from '@/components/ui/ProgressRing'
import { updateInventoryItem, deleteInventoryItem } from '@/services/inventoryService'
import { Button, Modal } from '@/components/ui'
import {
  EXPENSE_CATEGORY_EMOJIS,
  EXPENSE_CATEGORY_LABELS,
} from '@/types/expense'
import {
  getDaysUntilExpiry,
  getExpiryStatus,
  getStockRingColor,
  INVENTORY_UNIT_SHORT,
  type InventoryItem,
} from '@/types/inventory'

import styles from './InventoryCard.module.css'

const SWIPE_THRESHOLD = 80

interface InventoryCardProps {
  item: InventoryItem
  onEdit: (item: InventoryItem) => void
  onShowHistory: (item: InventoryItem) => void
}

export function InventoryCard({ item, onEdit, onShowHistory }: InventoryCardProps) {
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const x = useMotionValue(0)

  // Background indicators opacity
  const consumeOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1])
  const deleteOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0])

  const stockPct = item.minimumQty > 0
    ? Math.min(100, (item.qty / item.minimumQty) * 100)
    : 100
  const ringColor = getStockRingColor(stockPct)

  const expiryDays = getDaysUntilExpiry(item.expiryDate)
  const expiryStatus = getExpiryStatus(item.expiryDate)

  async function handleConsume() {
    setSaving(true)
    try {
      await updateInventoryItem(item.id, { qty: Math.max(0, item.qty - 1) })
    } catch (err) {
      console.error('[InventoryCard] consume error:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleIncrement() {
    setSaving(true)
    try {
      await updateInventoryItem(item.id, { qty: item.qty + 1 })
    } catch (err) {
      console.error('[InventoryCard] increment error:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setSaving(true)
    try {
      await deleteInventoryItem(item.id)
      setDeleteConfirm(false)
    } catch (err) {
      console.error('[InventoryCard] delete error:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className={styles.wrapper}>
        {/* Swipe hint backgrounds */}
        <motion.div className={styles.swipeHintRight} style={{ opacity: consumeOpacity }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Consumido</span>
        </motion.div>
        <motion.div className={styles.swipeHintLeft} style={{ opacity: deleteOpacity }}>
          <span>Eliminar</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" /><path d="M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </motion.div>

        {/* Card */}
        <motion.div
          className={styles.card}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={{ left: 0.3, right: 0.3 }}
          style={{ x }}
          onDragEnd={(_, info) => {
            if (info.offset.x > SWIPE_THRESHOLD) {
              void handleConsume()
            } else if (info.offset.x < -SWIPE_THRESHOLD) {
              setDeleteConfirm(true)
            }
          }}
          whileTap={{ cursor: 'grabbing' }}
        >
          {/* Left: ProgressRing */}
          <div className={styles.ringArea} onClick={() => onEdit(item)}>
            <ProgressRing
              value={stockPct}
              size={54}
              strokeWidth={5}
              color={ringColor}
              showLabel={true}
              label={`${item.qty}${INVENTORY_UNIT_SHORT[item.unit]}`}
              animated={false}
            />
          </div>

          {/* Center: Info */}
          <div className={styles.info} onClick={() => onEdit(item)}>
            <div className={styles.name}>{item.name}</div>
            <div className={styles.meta}>
              <span className={styles.categoryChip}>
                {EXPENSE_CATEGORY_EMOJIS[item.category]} {EXPENSE_CATEGORY_LABELS[item.category]}
              </span>
              {item.lastPrice != null && (
                <span className={styles.price}>{item.lastPrice.toFixed(2)} €/ud</span>
              )}
            </div>

            {/* Expiry badge */}
            {expiryStatus !== null && expiryDays !== null && (
              <div className={`${styles.expiryBadge} ${styles[`expiry_${expiryStatus}`]}`}>
                {expiryStatus === 'expired'
                  ? '⚠ Caducado'
                  : expiryDays === 0
                    ? '⚠ Caduca hoy'
                    : `Caduca en ${expiryDays}d`}
              </div>
            )}
          </div>

          {/* Right: Quick actions */}
          <div className={styles.actions}>
            <button
              className={styles.qtyBtn}
              onClick={handleIncrement}
              disabled={saving}
              type="button"
              aria-label="Añadir unidad"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button
              className={styles.qtyBtn}
              onClick={handleConsume}
              disabled={saving || item.qty <= 0}
              type="button"
              aria-label="Consumir unidad"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button
              className={styles.historyBtn}
              onClick={() => onShowHistory(item)}
              type="button"
              aria-label="Ver historial de precios"
              title="Historial de precios"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Delete confirmation */}
      <Modal
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        title="Eliminar producto"
        maxWidth={380}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="ghost" onClick={() => setDeleteConfirm(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete} loading={saving}>Eliminar</Button>
          </div>
        }
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          ¿Eliminar <strong>{item.name}</strong> del inventario? Esta acción no se puede deshacer.
        </p>
      </Modal>
    </>
  )
}
