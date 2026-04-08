import { useCallback, useEffect, useState } from 'react'
import { Reorder } from 'framer-motion'

import { CriticalAlertsWidget } from '@/components/domain/dashboard/CriticalAlertsWidget'
import { DailyExpensesWidget } from '@/components/domain/dashboard/DailyExpensesWidget'
import { InventoryStatusWidget } from '@/components/domain/dashboard/InventoryStatusWidget'
import { InvestmentsWidget } from '@/components/domain/dashboard/InvestmentsWidget'
import { MonthlyFlowWidget } from '@/components/domain/dashboard/MonthlyFlowWidget'
import { NetWorthWidget } from '@/components/domain/dashboard/NetWorthWidget'
import { useAssetsStore } from '@/stores/assetsStore'
import { useBudgetStore } from '@/stores/budgetStore'
import { useExpensesStore } from '@/stores/expensesStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useInvestmentsStore } from '@/stores/investmentsStore'
import { useSubscriptionsStore } from '@/stores/subscriptionsStore'

import styles from './Dashboard.module.css'

/* ── Widget registry ── */

interface WidgetDef {
  id: string
  label: string
  icon: string
  /** Bento column span class */
  colSpan: 'w3' | 'w4' | 'w6' | 'w8' | 'w12'
}

const WIDGET_DEFS: WidgetDef[] = [
  { id: 'networth', label: 'Patrimonio Neto', icon: '🏛️', colSpan: 'w4' },
  { id: 'alerts', label: 'Alertas Críticas', icon: '🔔', colSpan: 'w4' },
  { id: 'daily', label: 'Gastos Hoy', icon: '💸', colSpan: 'w4' },
  { id: 'flow', label: 'Flujo Mensual', icon: '📈', colSpan: 'w6' },
  { id: 'inventory', label: 'Inventario', icon: '🏠', colSpan: 'w3' },
  { id: 'investments', label: 'Inversiones', icon: '📊', colSpan: 'w3' },
]

const DEFAULT_ORDER = WIDGET_DEFS.map((w) => w.id)
const STORAGE_KEY = 'dashboard:config'

interface DashboardConfig {
  order: string[]
  hidden: string[]
}

function loadConfig(): DashboardConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as DashboardConfig
  } catch {
    // ignore
  }
  return { order: DEFAULT_ORDER, hidden: [] }
}

function saveConfig(config: DashboardConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

function renderWidget(id: string) {
  switch (id) {
    case 'networth':
      return <NetWorthWidget />
    case 'alerts':
      return <CriticalAlertsWidget />
    case 'daily':
      return <DailyExpensesWidget />
    case 'flow':
      return <MonthlyFlowWidget />
    case 'inventory':
      return <InventoryStatusWidget />
    case 'investments':
      return <InvestmentsWidget />
    default:
      return null
  }
}

export function Dashboard() {
  const [config, setConfig] = useState<DashboardConfig>(loadConfig)
  const [editing, setEditing] = useState(false)

  // Initialize all stores on mount
  const initExpenses = useExpensesStore((s) => s.init)
  const initSubscriptions = useSubscriptionsStore((s) => s.init)
  const initInventory = useInventoryStore((s) => s.init)
  const initBudget = useBudgetStore((s) => s.init)
  const initInvestments = useInvestmentsStore((s) => s.init)
  const bootstrapAssets = useAssetsStore((s) => s.bootstrap)

  useEffect(() => {
    const unsubs = [
      initExpenses(),
      initSubscriptions(),
      initInventory(),
      initBudget(),
      initInvestments(),
      bootstrapAssets(),
    ]
    return () => unsubs.forEach((u) => u())
  }, [initExpenses, initSubscriptions, initInventory, initBudget, initInvestments, bootstrapAssets])

  const persist = useCallback((next: DashboardConfig) => {
    setConfig(next)
    saveConfig(next)
  }, [])

  const toggleVisibility = useCallback(
    (id: string) => {
      const hidden = new Set(config.hidden)
      if (hidden.has(id)) {
        hidden.delete(id)
      } else {
        hidden.add(id)
      }
      persist({ ...config, hidden: Array.from(hidden) })
    },
    [config, persist],
  )

  const hiddenSet = new Set(config.hidden)

  // Ensure order contains all widget ids
  const orderedIds = [
    ...config.order.filter((id) => WIDGET_DEFS.some((w) => w.id === id)),
    ...WIDGET_DEFS.filter((w) => !config.order.includes(w.id)).map((w) => w.id),
  ]

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 13) return 'Buenos días'
    if (h < 20) return 'Buenas tardes'
    return 'Buenas noches'
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerText}>
          <h1>Control Room</h1>
          <p>{greeting()} — aquí tienes tu resumen del día.</p>
        </div>
        <button
          className={`${styles.editBtn} ${editing ? styles.active : ''}`}
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? '✓ Listo' : '⚙ Personalizar'}
        </button>
      </div>

      {/* Visibility toggles (edit mode) */}
      {editing && (
        <div className={styles.visibilityChips}>
          {WIDGET_DEFS.map((w) => (
            <button
              key={w.id}
              className={`${styles.visibilityChip} ${!hiddenSet.has(w.id) ? styles.visible : ''}`}
              onClick={() => toggleVisibility(w.id)}
            >
              {w.icon} {w.label}
            </button>
          ))}
        </div>
      )}

      {/* Bento Grid */}
      <Reorder.Group
        axis="x"
        values={orderedIds}
        onReorder={(newOrder) => persist({ ...config, order: newOrder })}
        className={styles.bento}
        as="div"
      >
        {orderedIds.map((id) => {
          const def = WIDGET_DEFS.find((w) => w.id === id)
          if (!def) return null
          const isHidden = hiddenSet.has(id)

          return (
            <Reorder.Item
              key={id}
              value={id}
              drag={editing}
              className={`${styles[def.colSpan]} ${styles.widget} ${isHidden ? styles.hiddenWidget : ''} ${editing ? styles.editOverlay : ''}`}
              whileDrag={{ scale: 1.02, zIndex: 50, boxShadow: 'var(--shadow-lg)' }}
              transition={{ duration: 0.15 }}
            >
              {renderWidget(id)}
            </Reorder.Item>
          )
        })}
      </Reorder.Group>
    </div>
  )
}
