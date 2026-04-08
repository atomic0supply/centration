import { useMemo, useState } from 'react'

import { Button, Input } from '@/components/ui'

import styles from './TransactionForm.module.css'

export interface TransactionFormData {
  type: 'buy' | 'sell'
  date: Date
  qty: number
  price: number
  fee?: number
}

interface TransactionFormProps {
  symbol: string
  onSubmit: (data: TransactionFormData) => Promise<void> | void
  onCancel: () => void
  loading?: boolean
}

export function TransactionForm({ symbol, onSubmit, onCancel, loading }: TransactionFormProps) {
  const [type, setType] = useState<'buy' | 'sell'>('buy')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [qty, setQty] = useState('')
  const [price, setPrice] = useState('')
  const [fee, setFee] = useState('')

  const qtyNumber = useMemo(() => Number(qty.replace(',', '.')), [qty])
  const priceNumber = useMemo(() => Number(price.replace(',', '.')), [price])
  const feeNumber = useMemo(() => Number(fee.replace(',', '.')), [fee])

  const valid =
    qtyNumber > 0 &&
    priceNumber > 0 &&
    !Number.isNaN(qtyNumber) &&
    !Number.isNaN(priceNumber)

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        void onSubmit({
          type,
          date: new Date(date),
          qty: qtyNumber,
          price: priceNumber,
          fee: fee ? feeNumber : undefined,
        })
      }}
    >
      <div className={styles.title}>Nueva transacción · {symbol}</div>

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Tipo</span>
          <select value={type} onChange={(e) => { setType(e.target.value as 'buy' | 'sell'); }}>
            <option value="buy">Compra</option>
            <option value="sell">Venta</option>
          </select>
        </label>

        <Input label="Fecha" type="date" value={date} onChange={(e) => { setDate(e.target.value); }} />
      </div>

      <div className={styles.row}>
        <Input
          label="Cantidad"
          placeholder="0"
          value={qty}
          onChange={(e) => { setQty(e.target.value); }}
        />
        <Input
          label="Precio unitario"
          placeholder="0.00"
          value={price}
          onChange={(e) => { setPrice(e.target.value); }}
        />
      </div>

      <Input
        label="Fee (opcional)"
        placeholder="0.00"
        value={fee}
        onChange={(e) => { setFee(e.target.value); }}
      />

      <div className={styles.actions}>
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading} disabled={!valid}>
          Guardar transacción
        </Button>
      </div>
    </form>
  )
}
