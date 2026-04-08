import { useNavigate } from 'react-router-dom'

import { useInventoryStore } from '@/stores/inventoryStore'
import { formatDate } from '@/utils/formatters'

import styles from './widgets.module.css'

export function InventoryStatusWidget() {
  const navigate = useNavigate()
  const { lowStockItems, expiringItems } = useInventoryStore()
  const lowStock = lowStockItems()
  const expiring = expiringItems()

  const total = lowStock.length + expiring.length
  const hasIssues = total > 0

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <span className={styles.title}>Inventario</span>
        <span className={styles.icon}>🏠</span>
      </div>

      {!hasIssues ? (
        <div className={styles.emptyState}>
          <span style={{ fontSize: 28 }}>✅</span>
          <span>Stock en orden</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {lowStock.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--warning)',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Stock bajo ({lowStock.length})
              </div>
              <div className={styles.tagCloud}>
                {lowStock.slice(0, 6).map((item) => (
                  <button
                    key={item.id}
                    className={styles.tag}
                    style={{
                      borderColor: 'var(--warning-border)',
                      color: 'var(--warning)',
                      background: 'var(--warning-bg)',
                    }}
                    onClick={() => navigate('/inventory')}
                  >
                    {item.name} · {item.qty} {item.unit}
                  </button>
                ))}
                {lowStock.length > 6 && (
                  <span className={styles.more}>+{lowStock.length - 6} más</span>
                )}
              </div>
            </div>
          )}

          {expiring.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--error)',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Caducidad próxima ({expiring.length})
              </div>
              <div className={styles.alertList} style={{ gap: 4 }}>
                {expiring.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    className={`${styles.alertRow} ${styles.critical}`}
                    onClick={() => navigate('/inventory')}
                    style={{ padding: '6px 10px' }}
                  >
                    <span className={styles.alertIcon}>🥫</span>
                    <div className={styles.alertText}>
                      <span className={styles.alertTitle}>{item.name}</span>
                      <span className={styles.alertBody}>
                        Caduca{' '}
                        {item.expiryDate
                          ? formatDate(item.expiryDate.toDate(), { day: 'numeric', month: 'short' })
                          : '—'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
