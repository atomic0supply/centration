import { useCallback, useState } from 'react'

import { Button, Input } from '@/components/ui'
import type { Expense, ExpenseCategory, ExpenseItem } from '@/types/expense'
import { toDate, toISODateString } from '@/utils/formatters'

import { CategoryChip } from './CategoryChip'
import styles from './ExpenseForm.module.css'

const ALL_CATEGORIES: ExpenseCategory[] = ['food', 'tech', 'health', 'leisure', 'transport', 'home', 'other']

interface ExpenseFormProps {
  expense?: Expense | null
  onSubmit: (data: ExpenseFormData) => void
  onCancel: () => void
  loading?: boolean
}

export interface ExpenseFormData {
  amount: number
  date: Date
  category: ExpenseCategory
  provider: string
  notes: string
  items: ExpenseItem[]
}

export function ExpenseForm({ expense, onSubmit, onCancel, loading = false }: ExpenseFormProps) {
  const [amount, setAmount] = useState(expense?.amount?.toString() ?? '')
  const [date, setDate] = useState(expense ? toISODateString(expense.date) : new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState<ExpenseCategory>(expense?.category ?? 'other')
  const [provider, setProvider] = useState(expense?.provider ?? '')
  const [notes, setNotes] = useState(expense?.notes ?? '')
  const [items, setItems] = useState<ExpenseItem[]>(expense?.items ?? [])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = useCallback((): boolean => {
    const e: Record<string, string> = {}
    const amt = parseFloat(amount)
    if (!amount || isNaN(amt) || amt <= 0) e.amount = 'Importe requerido'
    if (!provider.trim()) e.provider = 'Proveedor requerido'
    if (!date) e.date = 'Fecha requerida'
    setErrors(e)
    return Object.keys(e).length === 0
  }, [amount, provider, date])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      amount: parseFloat(amount),
      date: new Date(date),
      category,
      provider: provider.trim(),
      notes: notes.trim(),
      items,
    })
  }

  const addItem = () => {
    setItems([...items, { name: '', qty: 1, price: 0, unit: 'ud' }])
  }

  const updateItem = (index: number, field: keyof ExpenseItem, value: string | number) => {
    setItems(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)))
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.row}>
        <Input
          label="Importe (€)"
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={errors.amount}
          className={styles.amount}
          placeholder="0.00"
        />
        <Input
          label="Fecha"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          error={errors.date}
        />
      </div>

      <Input
        label="Proveedor / Comercio"
        value={provider}
        onChange={(e) => setProvider(e.target.value)}
        error={errors.provider}
        placeholder="Ej: Mercadona, Amazon, Transferencia..."
      />

      <div>
        <div className={styles.categoriesLabel}>Categoría</div>
        <div className={styles.categories}>
          {ALL_CATEGORIES.map((cat) => (
            <CategoryChip
              key={cat}
              category={cat}
              active={category === cat}
              onClick={() => setCategory(cat)}
            />
          ))}
        </div>
      </div>

      <Input
        label="Notas (opcional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Observaciones..."
      />

      {/* Items section */}
      <div className={styles.itemsSection}>
        <div className={styles.itemsSectionTitle}>
          <h3>Desglose de items ({items.length})</h3>
          <button type="button" className={styles.addItemBtn} onClick={addItem}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Añadir item
          </button>
        </div>

        {items.map((item, i) => (
          <div key={i} className={styles.itemRow}>
            <input
              className={styles.itemInput}
              placeholder="Nombre del producto"
              value={item.name}
              onChange={(e) => updateItem(i, 'name', e.target.value)}
            />
            <input
              className={styles.itemInput}
              type="number"
              step="1"
              min="1"
              placeholder="Cant."
              value={item.qty}
              onChange={(e) => updateItem(i, 'qty', parseInt(e.target.value) || 1)}
            />
            <input
              className={styles.itemInput}
              type="number"
              step="0.01"
              min="0"
              placeholder="Precio"
              value={item.price || ''}
              onChange={(e) => updateItem(i, 'price', parseFloat(e.target.value) || 0)}
            />
            <button type="button" className={styles.removeItemBtn} onClick={() => removeItem(i)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" loading={loading}>
          {expense ? 'Guardar cambios' : 'Registrar gasto'}
        </Button>
      </div>
    </form>
  )
}
