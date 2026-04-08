import { useEffect, useState } from 'react'

import { CategoryChip } from '@/components/domain/expenses/CategoryChip'
import { Button, Input } from '@/components/ui'
import type { ExpenseCategory } from '@/types/expense'
import {
  INVENTORY_UNIT_LABELS,
  type InventoryItem,
  type InventoryUnit,
} from '@/types/inventory'
import { toDate } from '@/utils/formatters'

import styles from './InventoryForm.module.css'

const ALL_CATEGORIES: ExpenseCategory[] = ['food', 'tech', 'health', 'leisure', 'transport', 'home', 'other']
const ALL_UNITS: InventoryUnit[] = ['ud', 'kg', 'g', 'l', 'ml']

export interface InventoryFormData {
  name: string
  qty: number
  unit: InventoryUnit
  category: ExpenseCategory
  minimumQty: number
  lastPrice: number | null
  expiryDate: Date | null
}

interface InventoryFormProps {
  item?: InventoryItem | null
  onSubmit: (data: InventoryFormData) => void
  onCancel: () => void
  loading?: boolean
}

export function InventoryForm({ item, onSubmit, onCancel, loading = false }: InventoryFormProps) {
  const [name, setName] = useState(item?.name ?? '')
  const [qty, setQty] = useState(item?.qty?.toString() ?? '1')
  const [unit, setUnit] = useState<InventoryUnit>(item?.unit ?? 'ud')
  const [category, setCategory] = useState<ExpenseCategory>(item?.category ?? 'food')
  const [minimumQty, setMinimumQty] = useState(item?.minimumQty?.toString() ?? '1')
  const [lastPrice, setLastPrice] = useState(item?.lastPrice?.toString() ?? '')
  const [expiryDateStr, setExpiryDateStr] = useState(() => {
    if (!item?.expiryDate) return ''
    const d = toDate(item.expiryDate)
    return d.toISOString().split('T')[0]
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Sync when item changes (modal re-use)
  useEffect(() => {
    setName(item?.name ?? '')
    setQty(item?.qty?.toString() ?? '1')
    setUnit(item?.unit ?? 'ud')
    setCategory(item?.category ?? 'food')
    setMinimumQty(item?.minimumQty?.toString() ?? '1')
    setLastPrice(item?.lastPrice?.toString() ?? '')
    if (item?.expiryDate) {
      const d = toDate(item.expiryDate)
      setExpiryDateStr(d.toISOString().split('T')[0])
    } else {
      setExpiryDateStr('')
    }
    setErrors({})
  }, [item])

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!name.trim()) errs.name = 'Nombre requerido'
    const qtyNum = parseFloat(qty)
    if (isNaN(qtyNum) || qtyNum < 0) errs.qty = 'Cantidad inválida'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const price = parseFloat(lastPrice.replace(',', '.'))
    const expiry = expiryDateStr ? new Date(expiryDateStr) : null

    onSubmit({
      name: name.trim(),
      qty: parseFloat(qty) || 0,
      unit,
      category,
      minimumQty: parseFloat(minimumQty) || 1,
      lastPrice: isNaN(price) ? null : price,
      expiryDate: expiry,
    })
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Input
        label="Nombre del producto *"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        placeholder="Ej: Leche, Pasta, Detergente..."
        autoFocus
      />

      <div className={styles.row}>
        <Input
          label="Cantidad *"
          type="number"
          min="0"
          step="0.1"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          error={errors.qty}
          placeholder="0"
        />
        <div className={styles.fieldGroup}>
          <label className={styles.label}>Unidad</label>
          <select
            className={styles.select}
            value={unit}
            onChange={(e) => setUnit(e.target.value as InventoryUnit)}
          >
            {ALL_UNITS.map((u) => (
              <option key={u} value={u}>{INVENTORY_UNIT_LABELS[u]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.row}>
        <Input
          label="Cantidad mínima"
          type="number"
          min="0"
          step="0.1"
          value={minimumQty}
          onChange={(e) => setMinimumQty(e.target.value)}
          placeholder="1"
        />
        <Input
          label="Precio unitario (€)"
          type="number"
          min="0"
          step="0.01"
          value={lastPrice}
          onChange={(e) => setLastPrice(e.target.value)}
          placeholder="0.00"
        />
      </div>

      <div>
        <div className={styles.label}>Categoría</div>
        <div className={styles.chips}>
          {ALL_CATEGORIES.map((cat) => (
            <CategoryChip
              key={cat}
              category={cat}
              active={category === cat}
              onClick={() => setCategory(cat)}
              size="sm"
            />
          ))}
        </div>
      </div>

      <Input
        label="Fecha de caducidad (opcional)"
        type="date"
        value={expiryDateStr}
        onChange={(e) => setExpiryDateStr(e.target.value)}
      />

      <div className={styles.footer}>
        <Button variant="ghost" type="button" onClick={onCancel}>Cancelar</Button>
        <Button variant="primary" type="submit" loading={loading}>
          {item ? 'Guardar cambios' : 'Añadir producto'}
        </Button>
      </div>
    </form>
  )
}
