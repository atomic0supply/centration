import { useState } from 'react'

import { useBudgetStore } from '@/stores/budgetStore'
import { useSubscriptionsStore } from '@/stores/subscriptionsStore'
import {
  EXPENSE_CATEGORY_EMOJIS,
  EXPENSE_CATEGORY_LABELS,
  type ExpenseCategory,
} from '@/types/expense'
import { formatCurrency } from '@/utils/formatters'

import { BudgetConfigModal } from './BudgetConfigModal'
import { BudgetProgress } from './BudgetProgress'
import styles from './BudgetOverview.module.css'

const ALL_CATEGORIES: ExpenseCategory[] = [
  'food', 'tech', 'health', 'leisure', 'transport', 'home', 'other',
]

export function BudgetOverview() {
  const [showConfig, setShowConfig] = useState(false)

  const budget = useBudgetStore((s) => s.budget)
  const loading = useBudgetStore((s) => s.loading)
  const globalProgress = useBudgetStore((s) => s.globalProgress)
  const categoryProgress = useBudgetStore((s) => s.categoryProgress)
  const activeAlerts = useBudgetStore((s) => s.activeAlerts)
  const adjustedGlobal = useBudgetStore((s) => s.adjustedGlobal)

  const totalMonthlyCost = useSubscriptionsStore((s) => s.totalMonthlyCost)

  if (loading) return null

  // No budget configured: show an empty-state prompt
  if (!budget || !budget.global) {
    return (
      <div className={styles.emptyBudget}>
        <span className={styles.emptyIcon}>🎯</span>
        <div>
          <div className={styles.emptyTitle}>Sin presupuesto configurado</div>
          <div className={styles.emptyDesc}>Configura un límite mensual para controlar tus gastos</div>
        </div>
        <button className={styles.configBtn} onClick={() => setShowConfig(true)} type="button">
          Configurar
        </button>
        <BudgetConfigModal open={showConfig} onClose={() => setShowConfig(false)} />
      </div>
    )
  }

  const gp = globalProgress()
  const alerts = activeAlerts()
  const adjustedLimit = adjustedGlobal()
  const subsMonthly = totalMonthlyCost()
  const configuredCategories = ALL_CATEGORIES.filter(
    (cat) => (budget.byCategory[cat] ?? 0) > 0,
  )

  return (
    <div className={styles.container}>
      {/* Alert banners */}
      {alerts.map((alert) => (
        <div
          key={`${alert.type}-${alert.threshold}`}
          className={`${styles.alert} ${alert.threshold === 100 ? styles.alertExceeded : styles.alertWarning}`}
        >
          <span>{alert.threshold === 100 ? '🚨' : '⚠️'}</span>
          <span>
            {alert.type === 'global'
              ? alert.threshold === 100
                ? 'Has superado tu presupuesto mensual'
                : 'Llevas el 80% del presupuesto mensual'
              : alert.threshold === 100
                ? `Has superado el presupuesto de ${EXPENSE_CATEGORY_LABELS[alert.type as ExpenseCategory]}`
                : `Llevas el 80% del presupuesto de ${EXPENSE_CATEGORY_LABELS[alert.type as ExpenseCategory]}`}
          </span>
        </div>
      ))}

      {/* Global progress */}
      {gp && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>Presupuesto mensual</span>
            <button className={styles.configBtn} onClick={() => setShowConfig(true)} type="button">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Configurar
            </button>
          </div>

          <BudgetProgress
            label="Global"
            spent={gp.spent}
            limit={gp.limit}
            pct={gp.pct}
            status={gp.status}
          />

          {/* Adjusted breakdown (3.3.4) */}
          {subsMonthly > 0 && adjustedLimit !== null && (
            <div className={styles.adjustedRow}>
              <div className={styles.adjustedItem}>
                <span className={styles.adjustedItemLabel}>Presupuesto</span>
                <span className={styles.adjustedItemValue}>{formatCurrency(budget.global)}</span>
              </div>
              <div className={styles.adjustedSep}>−</div>
              <div className={styles.adjustedItem}>
                <span className={styles.adjustedItemLabel}>Fijo (suscripciones)</span>
                <span className={styles.adjustedItemValue}>{formatCurrency(subsMonthly)}</span>
              </div>
              <div className={styles.adjustedSep}>=</div>
              <div className={styles.adjustedItem}>
                <span className={styles.adjustedItemLabel}>Disponible</span>
                <span className={`${styles.adjustedItemValue} ${adjustedLimit > 0 ? styles.available : styles.negative}`}>
                  {formatCurrency(Math.max(0, adjustedLimit))}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Per-category progress */}
      {configuredCategories.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Por categoría</div>
          <div className={styles.categoryGrid}>
            {configuredCategories.map((cat) => {
              const cp = categoryProgress(cat)
              if (!cp) return null
              return (
                <BudgetProgress
                  key={cat}
                  label={`${EXPENSE_CATEGORY_EMOJIS[cat]} ${EXPENSE_CATEGORY_LABELS[cat]}`}
                  spent={cp.spent}
                  limit={cp.limit}
                  pct={cp.pct}
                  status={cp.status}
                />
              )
            })}
          </div>
        </div>
      )}

      <BudgetConfigModal open={showConfig} onClose={() => setShowConfig(false)} />
    </div>
  )
}
