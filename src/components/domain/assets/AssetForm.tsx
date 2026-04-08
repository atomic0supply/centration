import type { ChangeEvent, SyntheticEvent } from 'react'
import { useState } from 'react'

import { Button, Input } from '@/components/ui'
import type { AssetType, PhysicalAsset } from '@/stores/assetsStore'
import { toISODateString } from '@/utils/formatters'

import styles from './Assets.module.css'

export interface AssetFormData {
  name: string
  type: AssetType
  identifier: string
  purchasePrice: number
  purchaseDate: string
  currentValue: number
  currency: string
  warrantyExpiry: string | null
  notes: string
}

interface AssetFormProps {
  asset?: PhysicalAsset | null
  onSubmit: (data: AssetFormData) => void
  onCancel: () => void
  loading?: boolean
}

const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: 'property', label: 'Propiedad' },
  { value: 'vehicle', label: 'Vehículo' },
  { value: 'electronics', label: 'Electrónica' },
]

const CURRENCIES = ['EUR', 'USD', 'GBP']

export function AssetForm({ asset, onSubmit, onCancel, loading = false }: AssetFormProps) {
  const [name, setName] = useState(() => asset?.name ?? '')
  const [type, setType] = useState<AssetType>(() => asset?.type ?? 'property')
  const [identifier, setIdentifier] = useState(() => asset?.identifier ?? '')
  const [purchasePrice, setPurchasePrice] = useState(() => asset?.purchasePrice.toString() ?? '')
  const [purchaseDate, setPurchaseDate] = useState(() => (asset?.purchaseDate ? toISODateString(asset.purchaseDate) : ''))
  const [currentValue, setCurrentValue] = useState(() => asset?.currentValue.toString() ?? '')
  const [currency, setCurrency] = useState(() => asset?.currency ?? 'EUR')
  const [warrantyExpiry, setWarrantyExpiry] = useState(() => (asset?.warrantyExpiry ? toISODateString(asset.warrantyExpiry) : ''))
  const [notes, setNotes] = useState(() => asset?.notes ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const nextErrors: Record<string, string> = {}
    if (!name.trim()) nextErrors.name = 'El nombre es obligatorio'
    if (!purchaseDate) nextErrors.purchaseDate = 'La fecha de compra es obligatoria'
    const purchase = Number.parseFloat(purchasePrice.replace(',', '.'))
    const current = Number.parseFloat(currentValue.replace(',', '.'))
    if (!Number.isFinite(purchase) || purchase < 0) nextErrors.purchasePrice = 'Importe inválido'
    if (!Number.isFinite(current) || current < 0) nextErrors.currentValue = 'Importe inválido'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!validate()) return

    const nextPurchase = Number.parseFloat(purchasePrice.replace(',', '.'))
    const nextCurrent = Number.parseFloat(currentValue.replace(',', '.'))

    onSubmit({
      name: name.trim(),
      type,
      identifier: identifier.trim(),
      purchasePrice: nextPurchase,
      purchaseDate,
      currentValue: nextCurrent,
      currency,
      warrantyExpiry: warrantyExpiry || null,
      notes: notes.trim(),
    })
  }

  function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
    setName(event.target.value)
  }

  function handleTypeChange(event: ChangeEvent<HTMLSelectElement>) {
    setType(event.target.value as AssetType)
  }

  function handleIdentifierChange(event: ChangeEvent<HTMLInputElement>) {
    setIdentifier(event.target.value)
  }

  function handlePurchaseDateChange(event: ChangeEvent<HTMLInputElement>) {
    setPurchaseDate(event.target.value)
  }

  function handlePurchasePriceChange(event: ChangeEvent<HTMLInputElement>) {
    setPurchasePrice(event.target.value)
  }

  function handleCurrentValueChange(event: ChangeEvent<HTMLInputElement>) {
    setCurrentValue(event.target.value)
  }

  function handleCurrencyChange(event: ChangeEvent<HTMLSelectElement>) {
    setCurrency(event.target.value)
  }

  function handleWarrantyChange(event: ChangeEvent<HTMLInputElement>) {
    setWarrantyExpiry(event.target.value)
  }

  function handleNotesChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setNotes(event.target.value)
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.formGrid}>
        <Input
          label="Nombre *"
          value={name}
          onChange={handleNameChange}
          error={errors.name}
          placeholder="Piso principal, coche, portátil..."
          autoFocus
        />

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Tipo *</label>
          <select className={styles.select} value={type} onChange={handleTypeChange}>
            {ASSET_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Identificador"
          value={identifier}
          onChange={handleIdentifierChange}
          placeholder="Matrícula, referencia catastral, serie..."
          className={styles.formFull}
        />

        <Input
          label="Fecha de compra *"
          type="date"
          value={purchaseDate}
          onChange={handlePurchaseDateChange}
          error={errors.purchaseDate}
        />

        <Input
          label="Precio de compra (€) *"
          type="number"
          min="0"
          step="0.01"
          value={purchasePrice}
          onChange={handlePurchasePriceChange}
          error={errors.purchasePrice}
        />

        <Input
          label="Valor actual (€) *"
          type="number"
          min="0"
          step="0.01"
          value={currentValue}
          onChange={handleCurrentValueChange}
          error={errors.currentValue}
        />

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Moneda</label>
          <select className={styles.select} value={currency} onChange={handleCurrencyChange}>
            {CURRENCIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Garantía hasta"
          type="date"
          value={warrantyExpiry}
          onChange={handleWarrantyChange}
        />

        <div className={`${styles.field} ${styles.formFull}`}>
          <label className={styles.fieldLabel}>Notas</label>
          <textarea
            className={styles.textarea}
            value={notes}
            onChange={handleNotesChange}
            placeholder="Observaciones, proveedores, mantenimiento recomendado..."
          />
        </div>
      </div>

      <div className={styles.footer}>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          {asset ? 'Guardar cambios' : 'Crear activo'}
        </Button>
      </div>
    </form>
  )
}
