import type { Subscription } from '@/types/expense'
import { SUBSCRIPTION_CATEGORY_COLORS } from '@/types/expense'
import { formatCurrency, formatDate, daysUntil } from '@/utils/formatters'

import styles from './SubscriptionCard.module.css'

interface SubscriptionCardProps {
  subscription: Subscription
  onClick?: (sub: Subscription) => void
}

function getStatusClass(status: string): string {
  switch (status) {
    case 'active': return styles.statusActive
    case 'trial': return styles.statusTrial
    case 'cancelled': return styles.statusCancelled
    default: return ''
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'active': return 'Activa'
    case 'trial': return 'Prueba'
    case 'cancelled': return 'Cancelada'
    default: return status
  }
}

export function SubscriptionCard({ subscription: sub, onClick }: SubscriptionCardProps) {
  const color = SUBSCRIPTION_CATEGORY_COLORS[sub.category]
  const days = daysUntil(sub.nextPaymentDate)

  const nextPaymentClass = [
    styles.nextPayment,
    days <= 3 && days >= 0 ? styles.nextPaymentSoon : '',
    days < 0 ? styles.nextPaymentPast : '',
  ].filter(Boolean).join(' ')

  const nextPaymentText = days < 0
    ? `Cobro pendiente (${Math.abs(days)} días atrás)`
    : days === 0
      ? 'Hoy'
      : days === 1
        ? 'Mañana'
        : `${formatDate(sub.nextPaymentDate)}`

  return (
    <div
      className={styles.card}
      onClick={() => onClick?.(sub)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.(sub)}
    >
      <div className={styles.logo} style={{ background: `${color}30`, color }}>
        {sub.logo ? (
          <img src={sub.logo} alt={sub.name} style={{ width: 28, height: 28, borderRadius: 4 }} />
        ) : (
          sub.name.charAt(0).toUpperCase()
        )}
      </div>

      <div className={styles.info}>
        <div className={styles.name}>
          {sub.name}
          <span className={`${styles.statusBadge} ${getStatusClass(sub.status)}`}>
            {getStatusLabel(sub.status)}
          </span>
        </div>
        <div className={nextPaymentClass}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Próximo cobro: {nextPaymentText}
        </div>
        {sub.sharedWith.length > 0 && (
          <span className={styles.sharedBadge}>
            Compartida ({sub.sharedWith.length})
          </span>
        )}
      </div>

      <div className={styles.pricing}>
        <div className={styles.amount}>
          {formatCurrency(sub.amount, sub.currency)}
        </div>
        <div className={styles.cycle}>
          /{sub.billingCycle === 'monthly' ? 'mes' : 'año'}
        </div>
      </div>
    </div>
  )
}
