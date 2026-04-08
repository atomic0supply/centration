import { useEffect, useState } from 'react'

import { Button, Input, Modal } from '@/components/ui'
import { saveBudget } from '@/services/budgetService'
import { useBudgetStore } from '@/stores/budgetStore'
import {
  EXPENSE_CATEGORY_EMOJIS,
  EXPENSE_CATEGORY_LABELS,
  type ExpenseCategory,
} from '@/types/expense'

import styles from './BudgetConfigModal.module.css'

const ALL_CATEGORIES: ExpenseCategory[] = [
  'food', 'tech', 'health', 'leisure', 'transport', 'home', 'other',
]

interface BudgetConfigModalProps {
  open: boolean
  onClose: () => void
}

export function BudgetConfigModal({ open, onClose }: BudgetConfigModalProps) {
  const budget = useBudgetStore((s) => s.budget)

  const [globalValue, setGlobalValue] = useState('')
  const [categoryValues, setCategoryValues] = useState<Partial<Record<ExpenseCategory, string>>>({})
  const [enabledCategories, setEnabledCategories] = useState<Set<ExpenseCategory>>(new Set())
  const [saving, setSaving] = useState(false)

  // Sync form state when modal opens or budget changes
  useEffect(() => {
    if (!open) return
    setGlobalValue(budget?.global ? String(budget.global) : '')

    const vals: Partial<Record<ExpenseCategory, string>> = {}
    const enabled = new Set<ExpenseCategory>()
    for (const cat of ALL_CATEGORIES) {
      const v = budget?.byCategory[cat]
      if (v) {
        vals[cat] = String(v)
        enabled.add(cat)
      }
    }
    setCategoryValues(vals)
    setEnabledCategories(enabled)
  }, [open, budget])

  function toggleCategory(cat: ExpenseCategory) {
    setEnabledCategories((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) {
        next.delete(cat)
      } else {
        next.add(cat)
      }
      return next
    })
  }

  function setCategoryValue(cat: ExpenseCategory, value: string) {
    setCategoryValues((prev) => ({ ...prev, [cat]: value }))
  }

  async function handleSave() {
    const uid = budget?.uid
    if (!uid) {
      // Budget doesn't exist yet — need uid from auth
      const { auth } = await import('@/services/firebase')
      const currentUid = auth.currentUser?.uid
      if (!currentUid) return
      await persist(currentUid)
    } else {
      await persist(uid)
    }
  }

  async function persist(uid: string) {
    setSaving(true)
    try {
      const globalNum = parseFloat(globalValue.replace(',', '.')) || 0

      const byCategory: Partial<Record<ExpenseCategory, number>> = {}
      for (const cat of ALL_CATEGORIES) {
        if (enabledCategories.has(cat)) {
          const v = parseFloat((categoryValues[cat] ?? '').replace(',', '.'))
          if (v > 0) byCategory[cat] = v
        } else {
          // Explicitly set to 0 to clear a previously set value
          byCategory[cat] = 0
        }
      }

      await saveBudget(uid, { global: globalNum, byCategory })
      onClose()
    } catch (err) {
      console.error('[BudgetConfigModal] save error:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Configurar presupuesto"
      maxWidth={500}
      footer={
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%' }}>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Guardar
          </Button>
        </div>
      }
    >
      <div className={styles.body}>
        {/* Global budget */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Presupuesto global mensual</div>
          <Input
            type="number"
            placeholder="0.00"
            value={globalValue}
            onChange={(e) => setGlobalValue(e.target.value)}
            iconLeft={<span style={{ fontSize: 13, color: 'var(--text-muted)' }}>€</span>}
            min={0}
            step={10}
          />
          <p className={styles.hint}>
            Límite total de gastos para el mes en curso.
          </p>
        </div>

        {/* Per-category limits */}
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Límites por categoría</div>
          <p className={styles.hint}>Activa las categorías que quieras controlar individualmente.</p>
          <div className={styles.categoryList}>
            {ALL_CATEGORIES.map((cat) => {
              const enabled = enabledCategories.has(cat)
              return (
                <div key={cat} className={`${styles.categoryRow} ${enabled ? styles.enabled : ''}`}>
                  <button
                    type="button"
                    className={styles.categoryToggle}
                    onClick={() => toggleCategory(cat)}
                  >
                    <span className={styles.categoryCheck}>
                      {enabled ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : null}
                    </span>
                    <span className={styles.categoryLabel}>
                      {EXPENSE_CATEGORY_EMOJIS[cat]} {EXPENSE_CATEGORY_LABELS[cat]}
                    </span>
                  </button>

                  {enabled && (
                    <div className={styles.categoryInput}>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={categoryValues[cat] ?? ''}
                        onChange={(e) => setCategoryValue(cat, e.target.value)}
                        iconLeft={<span style={{ fontSize: 13, color: 'var(--text-muted)' }}>€</span>}
                        min={0}
                        step={10}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Modal>
  )
}
