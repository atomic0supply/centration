import { useState } from 'react'

import { updateInventoryItem } from '@/services/inventoryService'
import { useInventoryStore } from '@/stores/inventoryStore'

import {
  EXPENSE_CATEGORY_EMOJIS,
  EXPENSE_CATEGORY_LABELS,
} from '@/types/expense'
import {
  INVENTORY_UNIT_SHORT,
  type InventoryItem,
} from '@/types/inventory'

import styles from './ShoppingList.module.css'

export function ShoppingList() {
  const shoppingListItems = useInventoryStore((s) => s.shoppingListItems)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState<Set<string>>(new Set())

  const items = shoppingListItems()

  async function handleCheck(item: InventoryItem) {
    if (saving.has(item.id)) return
    setSaving((prev) => new Set([...prev, item.id]))
    try {
      // Restock to minimumQty + 1
      await updateInventoryItem(item.id, { qty: item.minimumQty + 1 })
      setChecked((prev) => new Set([...prev, item.id]))
    } catch (err) {
      console.error('[ShoppingList] restock error:', err)
    } finally {
      setSaving((prev) => {
        const next = new Set(prev)
        next.delete(item.id)
        return next
      })
    }
  }

  function clearChecked() {
    setChecked(new Set())
  }

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon}>🎉</div>
        <div className={styles.emptyTitle}>Todo en orden</div>
        <div className={styles.emptyDesc}>
          No hay productos por debajo del stock mínimo.
        </div>
      </div>
    )
  }

  const pendingItems = items.filter((i) => !checked.has(i.id))
  const doneItems = items.filter((i) => checked.has(i.id))

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.count}>
          {pendingItems.length} {pendingItems.length === 1 ? 'producto' : 'productos'} por comprar
        </span>
        {checked.size > 0 && (
          <button className={styles.clearBtn} onClick={clearChecked} type="button">
            Vaciar comprados
          </button>
        )}
      </div>

      {/* Pending */}
      {pendingItems.map((item) => (
        <div key={item.id} className={styles.row}>
          <button
            className={`${styles.checkbox} ${saving.has(item.id) ? styles.loading : ''}`}
            onClick={() => void handleCheck(item)}
            type="button"
            aria-label={`Marcar ${item.name} como comprado`}
            disabled={saving.has(item.id)}
          >
            {saving.has(item.id) ? (
              <svg className={styles.spinner} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
              </svg>
            ) : null}
          </button>
          <div className={styles.itemInfo}>
            <span className={styles.itemName}>{item.name}</span>
            <span className={styles.itemMeta}>
              {EXPENSE_CATEGORY_EMOJIS[item.category]} {EXPENSE_CATEGORY_LABELS[item.category]}
            </span>
          </div>
          <div className={styles.stockInfo}>
            <span className={styles.stockBadge}>
              {item.qty}{INVENTORY_UNIT_SHORT[item.unit]} / mín {item.minimumQty}{INVENTORY_UNIT_SHORT[item.unit]}
            </span>
          </div>
        </div>
      ))}

      {/* Done */}
      {doneItems.length > 0 && (
        <>
          <div className={styles.doneSep}>Comprados ({doneItems.length})</div>
          {doneItems.map((item) => (
            <div key={item.id} className={`${styles.row} ${styles.rowDone}`}>
              <div className={`${styles.checkbox} ${styles.checked}`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div className={styles.itemInfo}>
                <span className={`${styles.itemName} ${styles.strikethrough}`}>{item.name}</span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
