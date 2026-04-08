import { useNavigate } from 'react-router-dom'

import { useAssetsStore } from '@/stores/assetsStore'
import { useBudgetStore } from '@/stores/budgetStore'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useSubscriptionsStore } from '@/stores/subscriptionsStore'
import { formatCurrency, formatDate } from '@/utils/formatters'

import styles from './widgets.module.css'

interface AlertItem {
  id: string
  severity: 'critical' | 'warning' | 'info'
  icon: string
  title: string
  body: string
  link: string
}

export function CriticalAlertsWidget() {
  const navigate = useNavigate()
  const { alerts: getAssetAlerts } = useAssetsStore()
  const { expiringItems } = useInventoryStore()
  const { upcomingCharges } = useSubscriptionsStore()
  const { activeAlerts } = useBudgetStore()
  const assetAlerts = getAssetAlerts()
  const expiringItemsList = expiringItems()
  const upcomingChargesList = upcomingCharges(7)
  const budgetAlerts = activeAlerts()

  const alerts: AlertItem[] = []

  // Asset alerts — only critical/warning
  for (const a of assetAlerts) {
    if (a.severity === 'info') continue
    alerts.push({
      id: `asset-${a.id}`,
      severity: a.severity,
      icon: a.kind === 'warranty' ? '🛡️' : '🔧',
      title: a.title,
      body: a.body,
      link: '/ledger',
    })
  }

  // Inventory expiring in next 3 days
  for (const item of expiringItemsList) {
    if (!item.expiryDate) continue
    const ms = item.expiryDate.toMillis()
    const severity: AlertItem['severity'] = ms <= Date.now() ? 'critical' : 'warning'
    alerts.push({
      id: `inv-${item.id}`,
      severity,
      icon: '🥫',
      title: ms <= Date.now() ? 'Caducado' : 'Caduca pronto',
      body: `${item.name} — ${formatDate(item.expiryDate.toDate(), { day: 'numeric', month: 'short' })}`,
      link: '/inventory',
    })
    if (alerts.length >= 5) break
  }

  // Subscriptions due in 7 days
  for (const sub of upcomingChargesList.slice(0, 2)) {
    alerts.push({
      id: `sub-${sub.id}`,
      severity: 'info',
      icon: '💳',
      title: `Cargo en ${formatDate(sub.nextPaymentDate, { day: 'numeric', month: 'short' })}`,
      body: `${sub.name} — ${formatCurrency(sub.amount)}`,
      link: '/ledger',
    })
  }

  // Budget exceeded
  for (const ba of budgetAlerts) {
    if (ba.threshold === 100) {
      alerts.push({
        id: `budget-${ba.type}`,
        severity: 'critical',
        icon: '📊',
        title: ba.type === 'global' ? 'Presupuesto superado' : `Categoría superada`,
        body: ba.type === 'global' ? 'Has superado tu límite mensual' : `Categoría: ${ba.type}`,
        link: '/ledger',
      })
    }
  }

  const critical = alerts.filter((a) => a.severity === 'critical')
  const warning = alerts.filter((a) => a.severity === 'warning')
  const info = alerts.filter((a) => a.severity === 'info')
  const sorted = [...critical, ...warning, ...info].slice(0, 5)

  if (sorted.length === 0) {
    return (
      <div className={styles.widget}>
        <div className={styles.header}>
          <span className={styles.title}>Alertas Críticas</span>
          <span className={styles.icon}>🔔</span>
        </div>
        <div className={styles.emptyState}>
          <span style={{ fontSize: 32 }}>✅</span>
          <span>Todo en orden</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <span className={styles.title}>
          Alertas Críticas
          {critical.length > 0 && (
            <span
              style={{
                marginLeft: 6,
                fontSize: 11,
                fontWeight: 700,
                background: 'var(--error-bg)',
                color: 'var(--error)',
                border: '1px solid var(--error-border)',
                borderRadius: 'var(--radius-full)',
                padding: '1px 7px',
              }}
            >
              {critical.length}
            </span>
          )}
        </span>
        <span className={styles.icon}>🔔</span>
      </div>

      <div className={styles.alertList}>
        {sorted.map((alert) => (
          <button
            key={alert.id}
            className={`${styles.alertRow} ${styles[alert.severity]}`}
            onClick={() => navigate(alert.link)}
          >
            <span className={styles.alertIcon}>{alert.icon}</span>
            <div className={styles.alertText}>
              <span className={styles.alertTitle}>{alert.title}</span>
              <span className={styles.alertBody}>{alert.body}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
