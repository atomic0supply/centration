import { Button, Card } from '@/components/ui'
import {
  getVaultCategoryLabel,
  type PhysicalAsset,
  type VaultDocument,
} from '@/stores/assetsStore'
import { formatRelativeDate } from '@/utils/formatters'

import styles from './Assets.module.css'

interface VaultDocumentListProps {
  documents: VaultDocument[]
  assets: PhysicalAsset[]
  onPreview: (document: VaultDocument) => void
  onDelete: (document: VaultDocument) => void
}

function bytesLabel(size: number): string {
  if (size < 1024) return `${String(size)} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function documentIcon(mimeType: string): string {
  if (mimeType.includes('pdf')) return 'PDF'
  if (mimeType.startsWith('image/')) return 'IMG'
  return 'DOC'
}

export function VaultDocumentList({ documents, assets, onPreview, onDelete }: VaultDocumentListProps) {
  const assetNameById = new Map(assets.map((asset) => [asset.id, asset.name]))

  if (documents.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>🗂️</div>
        <div className={styles.emptyTitle}>Sin documentos</div>
        <div className={styles.emptyDesc}>
          Sube facturas, garantías, seguros o manuales para centralizarlos en la bóveda.
        </div>
      </div>
    )
  }

  return (
    <div className={styles.vaultDocList}>
      {documents.map((document) => {
        const assetName = document.assetId ? assetNameById.get(document.assetId) ?? 'Activo eliminado' : 'Sin vincular'
        function handlePreviewClick() {
          onPreview(document)
        }

        function handleDeleteClick() {
          onDelete(document)
        }

        return (
          <Card key={document.id} className={styles.vaultDocItem}>
            <div className={styles.vaultDocMain}>
              <div className={styles.vaultDocIcon}>{documentIcon(document.mimeType)}</div>
              <div className={styles.vaultDocBody}>
                <div className={styles.vaultDocTitle}>{document.title}</div>
                <div className={styles.vaultDocMeta}>
                  <span className={`${styles.chip} ${styles.chipNeutral}`}>{getVaultCategoryLabel(document.category)}</span>
                  <span>{assetName}</span>
                  <span>{bytesLabel(document.sizeBytes)}</span>
                  <span>{formatRelativeDate(document.uploadedAt)}</span>
                  <span className={`${styles.chip} ${styles.chipSuccess}`}>encrypted=true</span>
                </div>
                <div className={styles.detailSectionMeta}>{document.storagePath}</div>
              </div>
            </div>

            <div className={styles.vaultDocActions}>
              <Button size="sm" variant="secondary" onClick={handlePreviewClick}>
                Previsualizar
              </Button>
              <Button size="sm" variant="ghost" onClick={handleDeleteClick}>
                Eliminar
              </Button>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
