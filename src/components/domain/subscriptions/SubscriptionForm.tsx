import { useCallback, useState } from 'react'

import { Button, Input } from '@/components/ui'
import type { Subscription, SubscriptionCategory, SubscriptionStatus } from '@/types/expense'
import {
  SUBSCRIPTION_CATEGORY_COLORS,
  SUBSCRIPTION_CATEGORY_EMOJIS,
  SUBSCRIPTION_CATEGORY_LABELS,
} from '@/types/expense'
import { toISODateString } from '@/utils/formatters'

import styles from './SubscriptionForm.module.css'

const ALL_CATEGORIES: SubscriptionCategory[] = ['streaming', 'saas', 'gym', 'insurance', 'other']
const ALL_STATUSES: SubscriptionStatus[] = ['active', 'trial', 'cancelled']
const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: 'Activa',
  trial: 'Prueba',
  cancelled: 'Cancelada',
}

interface SubscriptionFormProps {
  subscription?: Subscription | null
  onSubmit: (data: SubscriptionFormData) => void
  onCancel: () => void
  loading?: boolean
}

export interface SubscriptionFormData {
  name: string
  amount: number
  billingCycle: 'monthly' | 'yearly'
  nextPaymentDate: Date
  category: SubscriptionCategory
  status: SubscriptionStatus
}

export function SubscriptionForm({ subscription, onSubmit, onCancel, loading = false }: SubscriptionFormProps) {
  const [name, setName] = useState(subscription?.name ?? '')
  const [amount, setAmount] = useState(subscription?.amount?.toString() ?? '')
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>(subscription?.billingCycle ?? 'monthly')
  const [nextDate, setNextDate] = useState(
    subscription ? toISODateString(subscription.nextPaymentDate) : new Date().toISOString().split('T')[0],
  )
  const [category, setCategory] = useState<SubscriptionCategory>(subscription?.category ?? 'other')
  const [status, setStatus] = useState<SubscriptionStatus>(subscription?.status ?? 'active')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {}
    if (!name.trim()) e.name = 'Nombre requerido'
    const amt = parseFloat(amount)
    if (!amount || isNaN(amt) || amt <= 0) e.amount = 'Precio requerido'
    if (!nextDate) e.nextDate = 'Fecha requerida'
    setErrors(e)
    return Object.keys(e).length === 0
  }, [name, amount, nextDate])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      name: name.trim(),
      amount: parseFloat(amount),
      billingCycle: cycle,
      nextPaymentDate: new Date(nextDate),
      category,
      status,
    })
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Input
        label="Nombre del servicio"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        placeholder="Ej: Netflix, Spotify, Adobe..."
      />

      <div className={styles.row}>
        <Input
          label="Precio (€)"
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={errors.amount}
          placeholder="0.00"
        />
        <div>
          <div className={styles.categoriesLabel}>Ciclo de facturación</div>
          <div className={styles.statusRow}>
            <button
              type="button"
              className={`${styles.statusOption} ${cycle === 'monthly' ? styles.active : ''}`}
              onClick={() => setCycle('monthly')}
            >
              Mensual
            </button>
            <button
              type="button"
              className={`${styles.statusOption} ${cycle === 'yearly' ? styles.active : ''}`}
              onClick={() => setCycle('yearly')}
            >
              Anual
            </button>
          </div>
        </div>
      </div>

      <Input
        label="Próximo cobro"
        type="date"
        value={nextDate}
        onChange={(e) => setNextDate(e.target.value)}
        error={errors.nextDate}
      />

      <div>
        <div className={styles.categoriesLabel}>Categoría</div>
        <div className={styles.categories}>
          {ALL_CATEGORIES.map((cat) => {
            const color = SUBSCRIPTION_CATEGORY_COLORS[cat]
            return (
              <button
                key={cat}
                type="button"
                className={styles.catChip}
                onClick={() => setCategory(cat)}
                style={{
                  background: category === cat ? `${color}25` : `${color}10`,
                  color: category === cat ? color : `${color}aa`,
                  borderColor: category === cat ? color : `${color}30`,
                }}
              >
                <span>{SUBSCRIPTION_CATEGORY_EMOJIS[cat]}</span>
                {SUBSCRIPTION_CATEGORY_LABELS[cat]}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <div className={styles.categoriesLabel}>Estado</div>
        <div className={styles.statusRow}>
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              className={`${styles.statusOption} ${status === s ? styles.active : ''}`}
              onClick={() => setStatus(s)}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.footer}>
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" loading={loading}>
          {subscription ? 'Guardar cambios' : 'Añadir suscripción'}
        </Button>
      </div>
    </form>
  )
}
