import type { ChangeEvent, SyntheticEvent } from 'react'
import { useState } from 'react'

import { Button, Input } from '@/components/ui'
import { type AssetMaintenanceEntry, MAINTENANCE_KIND_OPTIONS, type MaintenanceKind } from '@/stores/assetsStore'
import { toISODateString } from '@/utils/formatters'

import styles from './Assets.module.css'

export interface MaintenanceEntryFormData {
  kind: MaintenanceKind
  title: string
  description: string
  performedAt: string
  nextDueDate: string | null
  cost: number | null
  mileageKm: number | null
  completed: boolean
}

interface MaintenanceEntryFormProps {
  assetName: string
  entry?: AssetMaintenanceEntry | null
  onSubmit: (data: MaintenanceEntryFormData) => void
  onCancel: () => void
  loading?: boolean
}

export function MaintenanceEntryForm({ assetName, entry, onSubmit, onCancel, loading = false }: MaintenanceEntryFormProps) {
  const [kind, setKind] = useState<MaintenanceKind>(() => entry?.kind ?? 'service')
  const [title, setTitle] = useState(() => entry?.title ?? '')
  const [description, setDescription] = useState(() => entry?.description ?? '')
  const [performedAt, setPerformedAt] = useState(() => (entry?.performedAt ? toISODateString(entry.performedAt) : ''))
  const [nextDueDate, setNextDueDate] = useState(() => (entry?.nextDueDate ? toISODateString(entry.nextDueDate) : ''))
  const [cost, setCost] = useState(() => entry?.cost?.toString() ?? '')
  const [mileageKm, setMileageKm] = useState(() => entry?.mileageKm?.toString() ?? '')
  const [completed, setCompleted] = useState(() => entry?.completed ?? false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const nextErrors: Record<string, string> = {}
    if (!title.trim()) nextErrors.title = 'El título es obligatorio'
    if (!performedAt) nextErrors.performedAt = 'La fecha de revisión es obligatoria'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!validate()) return

    const parsedCost = cost.trim() === '' ? null : Number.parseFloat(cost.replace(',', '.'))
    const parsedMileage = mileageKm.trim() === '' ? null : Number.parseFloat(mileageKm.replace(',', '.'))

    onSubmit({
      kind,
      title: title.trim(),
      description: description.trim(),
      performedAt,
      nextDueDate: nextDueDate || null,
      cost: Number.isFinite(parsedCost) ? parsedCost : null,
      mileageKm: Number.isFinite(parsedMileage) ? parsedMileage : null,
      completed,
    })
  }

  function handleKindChange(event: ChangeEvent<HTMLSelectElement>) {
    setKind(event.target.value as MaintenanceKind)
  }

  function handlePerformedAtChange(event: ChangeEvent<HTMLInputElement>) {
    setPerformedAt(event.target.value)
  }

  function handleTitleChange(event: ChangeEvent<HTMLInputElement>) {
    setTitle(event.target.value)
  }

  function handleNextDueChange(event: ChangeEvent<HTMLInputElement>) {
    setNextDueDate(event.target.value)
  }

  function handleCostChange(event: ChangeEvent<HTMLInputElement>) {
    setCost(event.target.value)
  }

  function handleMileageChange(event: ChangeEvent<HTMLInputElement>) {
    setMileageKm(event.target.value)
  }

  function handleDescriptionChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setDescription(event.target.value)
  }

  function handleCompletedChange(event: ChangeEvent<HTMLInputElement>) {
    setCompleted(event.target.checked)
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.helpText}>Activo: <strong>{assetName}</strong></div>

      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Tipo</label>
          <select className={styles.select} value={kind} onChange={handleKindChange}>
            {MAINTENANCE_KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Fecha realizada *"
          type="date"
          value={performedAt}
          onChange={handlePerformedAtChange}
          error={errors.performedAt}
        />

        <Input
          label="Título *"
          value={title}
          onChange={handleTitleChange}
          error={errors.title}
          placeholder="ITV, cambio de aceite, revisión anual..."
          className={styles.formFull}
        />

        <Input
          label="Próxima cita"
          type="date"
          value={nextDueDate}
          onChange={handleNextDueChange}
        />

        <Input
          label="Coste (€)"
          type="number"
          min="0"
          step="0.01"
          value={cost}
          onChange={handleCostChange}
          placeholder="0,00"
        />

        <Input
          label="Kilometraje"
          type="number"
          min="0"
          step="1"
          value={mileageKm}
          onChange={handleMileageChange}
          placeholder="0"
        />

        <div className={`${styles.field} ${styles.formFull}`}>
          <label className={styles.fieldLabel}>Descripción</label>
          <textarea
            className={styles.textarea}
            value={description}
            onChange={handleDescriptionChange}
            placeholder="Observaciones de la revisión, piezas cambiadas, proveedor..."
          />
        </div>

        <label className={`${styles.toolbarPill} ${styles.formFull}`} style={{ justifyContent: 'space-between', cursor: 'pointer' }}>
          <span>Marcar como completada</span>
          <input
            type="checkbox"
            checked={completed}
            onChange={handleCompletedChange}
          />
        </label>
      </div>

      <div className={styles.footer}>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          {entry ? 'Guardar revisión' : 'Añadir revisión'}
        </Button>
      </div>
    </form>
  )
}
