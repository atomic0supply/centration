import { Modal } from '@/components/ui'
import type { VaultDocument } from '@/stores/assetsStore'

import styles from './Assets.module.css'

interface PdfPreviewModalProps {
  document: VaultDocument | null
  open: boolean
  onClose: () => void
}

export function PdfPreviewModal({ document, open, onClose }: PdfPreviewModalProps) {
  if (!document) {
    return null
  }

  const isImage = document.mimeType.startsWith('image/')

  return (
    <Modal open={open} onClose={onClose} title={document.title} maxWidth={1040}>
      <div className={styles.detailSectionMeta} style={{ marginBottom: 12 }}>
        {document.storagePath} · {document.mimeType}
      </div>
      {isImage ? (
        <img className={styles.previewImage} src={document.downloadUrl} alt={document.title} />
      ) : (
        <object className={styles.previewFrame} data={document.downloadUrl} type={document.mimeType}>
          <iframe className={styles.previewFrame} src={document.downloadUrl} title={document.title} />
        </object>
      )}
    </Modal>
  )
}
