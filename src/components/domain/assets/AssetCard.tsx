import type { MouseEvent } from 'react'

import { Button, Card } from '@/components/ui'
import {
  type AssetAlert,
  daysUntilIso,
  getAssetDisplayValue,
  getAssetPurchaseValue,
  getAssetTypeLabel,
  type PhysicalAsset,
} from '@/stores/assetsStore'
import { formatShortDate } from '@/utils/formatters'

import styles from './Assets.module.css'

interface AssetCardProps {
  asset: PhysicalAsset
  alerts: AssetAlert[]
  onOpen: (asset: PhysicalAsset) => void
  onEdit: (asset: PhysicalAsset) => void
  onDelete: (asset: PhysicalAsset) => void
}

function warrantyChipClass(daysLeft: number | null): string {
  if (daysLeft === null) return styles.chipNeutral
  if (daysLeft < 0) return styles.chipCritical
  if (daysLeft <= 30) return styles.chipWarning
  return styles.chipInfo
}

function dueLabel(daysLeft: number | null): string {
  if (daysLeft === null) return 'Sin garantía'
  if (daysLeft < 0) return `Vencida hace ${String(Math.abs(daysLeft))} día${Math.abs(daysLeft) === 1 ? '' : 's'}`
  if (daysLeft === 0) return 'Vence hoy'
  return `Vence en ${String(daysLeft)} día${daysLeft === 1 ? '' : 's'}`
}

export function AssetCard({ asset, alerts, onOpen, onEdit, onDelete }: AssetCardProps) {
  const warrantyDays = daysUntilIso(asset.warrantyExpiry)
  const warningAlerts = alerts.filter((alert) => alert.severity !== 'info')

  function handleOpen() {
    onOpen(asset)
  }

  function handleEdit(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    onEdit(asset)
  }

  function handleDelete(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    onDelete(asset)
  }

  return (
    <Card className={`${styles.assetCard} ${styles.assetCardClickable}`} hoverable onClick={handleOpen}>
      <div className={styles.assetMedia}>
        {asset.photoDataUrl ? (
          <img className={styles.assetMediaImg} src={asset.photoDataUrl} alt={asset.name} />
        ) : (
          <div className={styles.assetMediaPlaceholder}>
            {asset.type === 'property' ? '🏠' : asset.type === 'vehicle' ? '🚗' : '💻'}
          </div>
        )}
        <span className={styles.assetBadge}>{getAssetTypeLabel(asset.type)}</span>
      </div>

      <div className={styles.assetBody}>
        <div className={styles.assetTitleRow}>
          <div className={styles.assetTitleBlock}>
            <div className={styles.assetTitle}>{asset.name}</div>
            <div className={styles.assetIdentifier}>{asset.identifier || 'Sin identificador'}</div>
          </div>
          {warningAlerts.length > 0 && (
            <span className={`${styles.chip} ${styles.chipWarning}`}>
              {warningAlerts.length} alerta{warningAlerts.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <div className={styles.assetMeta}>
          <span className={`${styles.chip} ${styles.chipNeutral}`}>
            Compra: {formatShortDate(asset.purchaseDate)}
          </span>
          <span className={`${styles.chip} ${warrantyChipClass(warrantyDays)}`}>
            {dueLabel(warrantyDays)}
          </span>
        </div>

        <div className={styles.assetValues}>
          <div className={styles.assetValue}>
            <span className={styles.assetValueLabel}>Compra</span>
            <span className={styles.assetValueNumber}>{getAssetPurchaseValue(asset)}</span>
          </div>
          <div className={styles.assetValue}>
            <span className={styles.assetValueLabel}>Actual</span>
            <span className={styles.assetValueNumber}>{getAssetDisplayValue(asset)}</span>
          </div>
        </div>

        <div className={styles.assetFoot}>
          <div className={styles.assetMeta}>
            <span className={`${styles.chip} ${styles.chipInfo}`}>Garantía</span>
            <span className={styles.assetIdentifier}>{asset.warrantyExpiry ? formatShortDate(asset.warrantyExpiry) : 'No registrada'}</span>
          </div>
          <div className={styles.assetActions}>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleEdit}
            >
              Editar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
            >
              Eliminar
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
