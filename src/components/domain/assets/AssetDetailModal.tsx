import type { ChangeEvent } from 'react'
import { useMemo, useRef } from 'react'

import { Button, Modal } from '@/components/ui'
import {
  type AssetAlert,
  type AssetAlertPreferences,
  type AssetMaintenanceEntry,
  daysUntilIso,
  getAssetDisplayValue,
  getAssetPurchaseValue,
  getAssetTypeLabel,
  type PhysicalAsset,
} from '@/stores/assetsStore'
import { formatShortDate } from '@/utils/formatters'

import styles from './Assets.module.css'
import { MaintenanceLog } from './MaintenanceLog'

interface AssetDetailModalProps {
  asset: PhysicalAsset | null
  alerts: AssetAlert[]
  maintenanceEntries: AssetMaintenanceEntry[]
  preferences: AssetAlertPreferences
  open: boolean
  onClose: () => void
  onEditAsset: (asset: PhysicalAsset) => void
  onDeleteAsset: (asset: PhysicalAsset) => void
  onAddMaintenance: () => void
  onEditMaintenance: (entry: AssetMaintenanceEntry) => void
  onDeleteMaintenance: (entry: AssetMaintenanceEntry) => void
  onUploadPhoto: (file: File) => void
}

function dueLabel(daysLeft: number | null): string {
  if (daysLeft === null) return 'Sin garantía'
  if (daysLeft < 0) return `Vencida hace ${String(Math.abs(daysLeft))} día${Math.abs(daysLeft) === 1 ? '' : 's'}`
  if (daysLeft === 0) return 'Hoy'
  return `En ${String(daysLeft)} día${daysLeft === 1 ? '' : 's'}`
}

function severityClass(daysLeft: number | null): string {
  if (daysLeft === null) return styles.chipNeutral
  if (daysLeft < 0) return styles.chipCritical
  if (daysLeft <= 30) return styles.chipWarning
  return styles.chipInfo
}

export function AssetDetailModal({
  asset,
  alerts,
  maintenanceEntries,
  preferences,
  open,
  onClose,
  onEditAsset,
  onDeleteAsset,
  onAddMaintenance,
  onEditMaintenance,
  onDeleteMaintenance,
  onUploadPhoto,
}: AssetDetailModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const warrantyDays = useMemo(() => daysUntilIso(asset?.warrantyExpiry ?? null), [asset?.warrantyExpiry])

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      onUploadPhoto(file)
    }
    event.currentTarget.value = ''
  }

  function handleUploadClick() {
    fileInputRef.current?.click()
  }

  function handleEditClick() {
    if (asset) onEditAsset(asset)
  }

  function handleDeleteClick() {
    if (asset) onDeleteAsset(asset)
  }

  if (!asset) {
    return (
      <Modal open={open} onClose={onClose} title="Ficha técnica" maxWidth={920}>
        <div className={styles.helpText}>Selecciona un activo para ver su ficha técnica.</div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Ficha técnica" maxWidth={1040}>
      <div className={styles.detailLayout}>
        <div className={styles.detailMedia}>
          <div className={styles.detailPhoto}>
            {asset.photoDataUrl ? (
              <img className={styles.detailPhotoImg} src={asset.photoDataUrl} alt={asset.name} />
            ) : (
              <div className={styles.detailPhotoPlaceholder}>
                {asset.type === 'property' ? '🏠' : asset.type === 'vehicle' ? '🚗' : '💻'}
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleFileChange}
          />

          <div className={styles.detailActions}>
            <Button size="sm" variant="secondary" onClick={handleUploadClick}>
              Subir foto
            </Button>
            <Button size="sm" variant="secondary" onClick={handleEditClick}>
              Editar
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDeleteClick}>
              Eliminar
            </Button>
          </div>
        </div>

        <div className={styles.detailInfo}>
          <div className={styles.detailTop}>
            <div className={styles.detailHeading}>
              <div className={styles.detailTitle}>{asset.name}</div>
              <div className={styles.detailSubtitle}>
                {getAssetTypeLabel(asset.type)} · {asset.identifier || 'Sin identificador'}
              </div>
              <div className={styles.assetMeta}>
                <span className={`${styles.chip} ${styles.chipNeutral}`}>Compra {formatShortDate(asset.purchaseDate)}</span>
                <span className={`${styles.chip} ${severityClass(warrantyDays)}`}>
                  Garantía {dueLabel(warrantyDays)}
                </span>
                {alerts.length > 0 && (
                  <span className={`${styles.chip} ${styles.chipWarning}`}>
                    {alerts.length} alerta{alerts.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className={styles.detailStats}>
            <div className={styles.detailStat}>
              <span className={styles.detailStatLabel}>Precio de compra</span>
              <span className={styles.detailStatValue}>{getAssetPurchaseValue(asset)}</span>
            </div>
            <div className={styles.detailStat}>
              <span className={styles.detailStatLabel}>Valor actual</span>
              <span className={styles.detailStatValue}>{getAssetDisplayValue(asset)}</span>
            </div>
            <div className={styles.detailStat}>
              <span className={styles.detailStatLabel}>Garantía</span>
              <span className={styles.detailStatValue}>{asset.warrantyExpiry ? formatShortDate(asset.warrantyExpiry) : 'No registrada'}</span>
            </div>
            <div className={styles.detailStat}>
              <span className={styles.detailStatLabel}>Identificador</span>
              <span className={styles.detailStatValue}>{asset.identifier || 'Sin dato'}</span>
            </div>
          </div>

          {asset.notes && (
            <div className={styles.detailSection}>
              <div className={styles.detailSectionHeader}>
                <div className={styles.detailSectionTitle}>Notas</div>
              </div>
              <div className={styles.detailNotes}>{asset.notes}</div>
            </div>
          )}

          {alerts.length > 0 && (
            <div className={styles.detailSection}>
              <div className={styles.detailSectionHeader}>
                <div className={styles.detailSectionTitle}>Alertas derivadas</div>
                <div className={styles.detailSectionMeta}>
                  {String(preferences.warrantyDaysAhead)} días de garantía · {String(preferences.maintenanceDaysAhead)} días de mantenimiento
                </div>
              </div>
              <div className={styles.alertList}>
                {alerts.map((alert) => (
                  <span
                    key={alert.id}
                    className={`${styles.alertItem} ${
                      alert.severity === 'critical'
                        ? styles.alertCritical
                        : alert.severity === 'warning'
                          ? styles.alertWarning
                          : styles.alertInfo
                    }`}
                  >
                    <strong>{alert.title}</strong>
                    <span>{alert.body}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <MaintenanceLog
            assetName={asset.name}
            entries={maintenanceEntries}
            preferences={preferences}
            onAdd={onAddMaintenance}
            onEdit={onEditMaintenance}
            onDelete={onDeleteMaintenance}
          />
        </div>
      </div>
    </Modal>
  )
}
