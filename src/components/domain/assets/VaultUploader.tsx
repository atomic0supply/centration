import type { ChangeEvent, SyntheticEvent } from 'react'
import { useState } from 'react'

import { Button, Input } from '@/components/ui'
import { type PhysicalAsset, VAULT_CATEGORY_OPTIONS, type VaultCategory } from '@/stores/assetsStore'

import styles from './Assets.module.css'

export interface VaultUploadData {
  title: string
  category: VaultCategory
  assetId: string | null
  file: File
}

interface VaultUploaderProps {
  assets: PhysicalAsset[]
  onSubmit: (data: VaultUploadData) => void
  onCancel: () => void
  loading?: boolean
}

export function VaultUploader({ assets, onSubmit, onCancel, loading = false }: VaultUploaderProps) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<VaultCategory>('factura')
  const [assetId, setAssetId] = useState('all')
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate(): boolean {
    const nextErrors: Record<string, string> = {}
    if (!title.trim()) nextErrors.title = 'El título es obligatorio'
    if (!file) nextErrors.file = 'Selecciona un archivo'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!validate() || !file) return

    onSubmit({
      title: title.trim(),
      category,
      assetId: assetId === 'all' ? null : assetId,
      file,
    })
  }

  function handleTitleChange(event: ChangeEvent<HTMLInputElement>) {
    setTitle(event.target.value)
  }

  function handleCategoryChange(event: ChangeEvent<HTMLSelectElement>) {
    setCategory(event.target.value as VaultCategory)
  }

  function handleAssetChange(event: ChangeEvent<HTMLSelectElement>) {
    setAssetId(event.target.value)
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null)
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.helpText}>
        El documento se guardará con metadata cifrada (`encrypted=true`) y se podrá previsualizar si es PDF o imagen.
      </div>

      <div className={styles.formGrid}>
        <Input
          label="Título *"
          value={title}
          onChange={handleTitleChange}
          error={errors.title}
          placeholder="Factura, garantía, seguro..."
          autoFocus
        />

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Categoría</label>
          <select className={styles.select} value={category} onChange={handleCategoryChange}>
            {VAULT_CATEGORY_OPTIONS.filter((option) => option.value !== 'all').map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Vincular a activo</label>
          <select className={styles.select} value={assetId} onChange={handleAssetChange}>
            <option value="all">Sin vincular</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
              </option>
            ))}
          </select>
        </div>

        <Input
          label="Archivo *"
          type="file"
          accept="application/pdf,image/*"
          onChange={handleFileChange}
          error={errors.file}
          className={styles.formFull}
        />
      </div>

      <div className={styles.footer}>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          Subir documento
        </Button>
      </div>
    </form>
  )
}
