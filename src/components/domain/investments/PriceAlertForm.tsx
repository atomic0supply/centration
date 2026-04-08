import { useEffect, useState } from 'react'

import { Button, Input } from '@/components/ui'
import type { PriceAlertRule } from '@/types/investment'

import styles from './PriceAlertForm.module.css'

interface PriceAlertFormProps {
  symbol: string
  alerts: PriceAlertRule[]
  onSubmit: (alerts: PriceAlertRule[]) => Promise<void> | void
  onCancel: () => void
  loading?: boolean
}

export function PriceAlertForm({ symbol, alerts, onSubmit, onCancel, loading }: PriceAlertFormProps) {
  const [localAlerts, setLocalAlerts] = useState(alerts)
  const [kind, setKind] = useState<'above' | 'below'>('above')
  const [price, setPrice] = useState('')

  useEffect(() => {
    setLocalAlerts(alerts)
  }, [alerts])

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>Alertas · {symbol}</div>

      <div className={styles.creator}>
        <select value={kind} onChange={(e) => { setKind(e.target.value as 'above' | 'below'); }}>
          <option value="above">Por encima de</option>
          <option value="below">Por debajo de</option>
        </select>
        <Input
          label="Precio"
          placeholder="0.00"
          value={price}
          onChange={(e) => { setPrice(e.target.value); }}
        />
        <Button
          type="button"
          onClick={() => {
            const parsed = Number(price.replace(',', '.'))
            if (!parsed || Number.isNaN(parsed)) return
            setLocalAlerts((prev) => [
              ...prev,
              {
                id: `${kind}-${String(Date.now())}`,
                type: kind,
                price: parsed,
                active: true,
                lastTriggeredAt: null,
              },
            ])
            setPrice('')
          }}
        >
          Añadir
        </Button>
      </div>

      <div className={styles.list}>
        {localAlerts.length === 0 ? (
          <div className={styles.empty}>Sin alertas configuradas</div>
        ) : (
          localAlerts.map((alert) => (
            <div key={alert.id} className={styles.item}>
              <label>
                <input
                  type="checkbox"
                  checked={alert.active}
                  onChange={(e) => {
                    const active = e.target.checked
                    setLocalAlerts((prev) =>
                      prev.map((row) =>
                        row.id === alert.id ? { ...row, active } : row,
                      ),
                    )
                  }}
                />
                {alert.type === 'above' ? '↑' : '↓'} {alert.price.toFixed(2)}
              </label>

              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  setLocalAlerts((prev) => prev.filter((row) => row.id !== alert.id))
                }}
              >
                Borrar
              </Button>
            </div>
          ))
        )}
      </div>

      <div className={styles.actions}>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button loading={loading} onClick={() => void onSubmit(localAlerts)}>
          Guardar alertas
        </Button>
      </div>
    </div>
  )
}
