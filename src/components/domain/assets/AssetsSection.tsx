import { AnimatePresence, motion } from 'framer-motion'
import type { ChangeEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'

import { Button, Card, Modal, Skeleton, SkeletonCard } from '@/components/ui'
import {
  type AssetAlert,
  type AssetMaintenanceEntry,
  type PhysicalAsset,
  useAssetsStore,
  type VaultDocument,
} from '@/stores/assetsStore'
import { formatCurrency } from '@/utils/formatters'

import { AssetCard } from './AssetCard'
import { AssetDetailModal } from './AssetDetailModal'
import { AssetFilters } from './AssetFilters'
import { AssetForm, type AssetFormData } from './AssetForm'
import styles from './Assets.module.css'
import { MaintenanceEntryForm, type MaintenanceEntryFormData } from './MaintenanceEntryForm'
import { PdfPreviewModal } from './PdfPreviewModal'
import { VaultDocumentList } from './VaultDocumentList'
import { VaultFilters } from './VaultFilters'
import { type VaultUploadData, VaultUploader } from './VaultUploader'

type SectionTab = 'physical' | 'vault'
type DeleteTarget =
  | { kind: 'asset'; asset: PhysicalAsset }
  | { kind: 'maintenance'; entry: AssetMaintenanceEntry; assetName: string }
  | { kind: 'document'; document: VaultDocument }
  | null

function countBySeverity(alerts: AssetAlert[], severity: AssetAlert['severity']): number {
  return alerts.filter((alert) => alert.severity === severity).length
}

function formatTypeSummary(assets: PhysicalAsset[]): string {
  const counts = {
    property: assets.filter((asset) => asset.type === 'property').length,
    vehicle: assets.filter((asset) => asset.type === 'vehicle').length,
    electronics: assets.filter((asset) => asset.type === 'electronics').length,
  }

  return [
    `${String(counts.property)} propiedades`,
    `${String(counts.vehicle)} vehículos`,
    `${String(counts.electronics)} electrónicos`,
  ].join(' · ')
}

function summaryColor(alert: AssetAlert['severity']): string {
  if (alert === 'critical') return styles.chipCritical
  if (alert === 'warning') return styles.chipWarning
  return styles.chipInfo
}

export function AssetsSection() {
  const [tab, setTab] = useState<SectionTab>('physical')
  const [assetFormOpen, setAssetFormOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<PhysicalAsset | null>(null)
  const [detailAssetId, setDetailAssetId] = useState<string | null>(null)
  const [maintenanceFormOpen, setMaintenanceFormOpen] = useState(false)
  const [editingMaintenance, setEditingMaintenance] = useState<AssetMaintenanceEntry | null>(null)
  const [vaultUploadOpen, setVaultUploadOpen] = useState(false)
  const [previewDocument, setPreviewDocument] = useState<VaultDocument | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)
  const [busy, setBusy] = useState(false)

  const bootstrap = useAssetsStore((state) => state.bootstrap)
  const hydrated = useAssetsStore((state) => state.hydrated)
  const assets = useAssetsStore((state) => state.assets)
  const vaultDocuments = useAssetsStore((state) => state.vaultDocuments)
  const prefs = useAssetsStore((state) => state.prefs)
  const assetFilters = useAssetsStore((state) => state.assetFilters)
  const vaultFilters = useAssetsStore((state) => state.vaultFilters)
  const setPrefs = useAssetsStore((state) => state.setPrefs)
  const setAssetFilters = useAssetsStore((state) => state.setAssetFilters)
  const resetAssetFilters = useAssetsStore((state) => state.resetAssetFilters)
  const setVaultFilters = useAssetsStore((state) => state.setVaultFilters)
  const resetVaultFilters = useAssetsStore((state) => state.resetVaultFilters)
  const createAsset = useAssetsStore((state) => state.createAsset)
  const updateAsset = useAssetsStore((state) => state.updateAsset)
  const deleteAsset = useAssetsStore((state) => state.deleteAsset)
  const uploadAssetPhoto = useAssetsStore((state) => state.uploadAssetPhoto)
  const createMaintenanceEntry = useAssetsStore((state) => state.createMaintenanceEntry)
  const updateMaintenanceEntry = useAssetsStore((state) => state.updateMaintenanceEntry)
  const deleteMaintenanceEntry = useAssetsStore((state) => state.deleteMaintenanceEntry)
  const uploadVaultDocument = useAssetsStore((state) => state.uploadVaultDocument)
  const deleteVaultDocument = useAssetsStore((state) => state.deleteVaultDocument)
  const filteredAssetsSelector = useAssetsStore((state) => state.filteredAssets)
  const assetMaintenanceSelector = useAssetsStore((state) => state.assetMaintenance)
  const filteredVaultDocumentsSelector = useAssetsStore((state) => state.filteredVaultDocuments)
  const alertsSelector = useAssetsStore((state) => state.alerts)

  useEffect(() => {
    const unsub = bootstrap()
    return unsub
  }, [bootstrap])

  const filteredAssets = filteredAssetsSelector()
  const filteredVaultDocuments = filteredVaultDocumentsSelector()
  const alerts = alertsSelector()
  const detailAsset = useMemo(
    () => assets.find((asset) => asset.id === detailAssetId) ?? null,
    [assets, detailAssetId],
  )
  const detailAlerts = useMemo(
    () => alerts.filter((alert) => alert.assetId === detailAsset?.id),
    [alerts, detailAsset?.id],
  )
  const detailMaintenance = useMemo(
    () => (detailAsset ? assetMaintenanceSelector(detailAsset.id) : []),
    [assetMaintenanceSelector, detailAsset],
  )
  const totalCurrentValue = assets.reduce((sum, asset) => sum + asset.currentValue, 0)
  const totalPurchaseValue = assets.reduce((sum, asset) => sum + asset.purchasePrice, 0)
  const maintenanceAlerts = alerts.filter((alert) => alert.kind === 'maintenance')
  const warrantyAlerts = alerts.filter((alert) => alert.kind === 'warranty')
  const criticalCount = countBySeverity(alerts, 'critical')
  const warningCount = countBySeverity(alerts, 'warning')

  function handleWarrantyDaysChange(event: ChangeEvent<HTMLInputElement>) {
    setPrefs({ warrantyDaysAhead: Number.parseInt(event.target.value || '0', 10) })
  }

  function handleMaintenanceDaysChange(event: ChangeEvent<HTMLInputElement>) {
    setPrefs({ maintenanceDaysAhead: Number.parseInt(event.target.value || '0', 10) })
  }

  function handlePhysicalTab() {
    setTab('physical')
  }

  function handleVaultTab() {
    setTab('vault')
  }

  function handleAddAsset() {
    setEditingAsset(null)
    setAssetFormOpen(true)
  }

  function handleOpenAsset(item: PhysicalAsset) {
    setDetailAssetId(item.id)
  }

  function handleEditAsset(item: PhysicalAsset) {
    setEditingAsset(item)
    setAssetFormOpen(true)
  }

  function handleDeleteAsset(item: PhysicalAsset) {
    setDeleteTarget({ kind: 'asset', asset: item })
  }

  function handleOpenVaultUpload() {
    setVaultUploadOpen(true)
  }

  function handleVaultPreview(document: VaultDocument) {
    setPreviewDocument(document)
  }

  function handleDeleteDocument(document: VaultDocument) {
    setDeleteTarget({ kind: 'document', document })
  }

  function handleCloseAssetForm() {
    setAssetFormOpen(false)
    setEditingAsset(null)
  }

  function handleCloseMaintenanceForm() {
    setMaintenanceFormOpen(false)
    setEditingMaintenance(null)
  }

  function handleCloseVaultUpload() {
    setVaultUploadOpen(false)
  }

  function handleClosePreview() {
    setPreviewDocument(null)
  }

  function handleCloseDetail() {
    setDetailAssetId(null)
  }

  function handleCloseDelete() {
    setDeleteTarget(null)
  }

  function handleCancelDelete() {
    setDeleteTarget(null)
  }

  function handleMaintenanceDelete(entry: AssetMaintenanceEntry) {
    setDeleteTarget({ kind: 'maintenance', entry, assetName: selectedMaintenanceAssetName })
  }

  function handleAddMaintenance() {
    setEditingMaintenance(null)
    setMaintenanceFormOpen(true)
  }

  function handleEditMaintenance(entry: AssetMaintenanceEntry) {
    setEditingMaintenance(entry)
    setMaintenanceFormOpen(true)
  }

  function handleDeleteConfirmClick() {
    void confirmDelete()
  }

  async function handleUploadAssetPhoto(file: File) {
    if (!detailAsset) return
    setBusy(true)
    try {
      await uploadAssetPhoto(detailAsset.id, file)
    } finally {
      setBusy(false)
    }
  }

  async function handleAssetSubmit(data: AssetFormData) {
    setBusy(true)
    try {
      if (editingAsset) {
        await updateAsset(editingAsset.id, data)
      } else {
        await createAsset(data)
      }
      setAssetFormOpen(false)
      setEditingAsset(null)
    } finally {
      setBusy(false)
    }
  }

  async function handleMaintenanceSubmit(data: MaintenanceEntryFormData) {
    if (!detailAsset) return
    setBusy(true)
    try {
      if (editingMaintenance) {
        await updateMaintenanceEntry(editingMaintenance.id, data)
      } else {
        await createMaintenanceEntry({ ...data, assetId: detailAsset.id })
      }
      setMaintenanceFormOpen(false)
      setEditingMaintenance(null)
    } finally {
      setBusy(false)
    }
  }

  async function handleVaultSubmit(data: VaultUploadData) {
    setBusy(true)
    try {
      await uploadVaultDocument(data)
      setVaultUploadOpen(false)
    } finally {
      setBusy(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setBusy(true)
    try {
      if (deleteTarget.kind === 'asset') {
        await deleteAsset(deleteTarget.asset.id)
        if (detailAssetId === deleteTarget.asset.id) setDetailAssetId(null)
      } else if (deleteTarget.kind === 'maintenance') {
        await deleteMaintenanceEntry(deleteTarget.entry.id)
      } else {
        await deleteVaultDocument(deleteTarget.document.id)
        if (previewDocument?.id === deleteTarget.document.id) setPreviewDocument(null)
      }
      setDeleteTarget(null)
    } finally {
      setBusy(false)
    }
  }

  const summaryAlerts = alerts.slice(0, 3)
  const selectedMaintenanceAssetName = detailAsset?.name ?? ''

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h2>Activos</h2>
          <p>Gestiona propiedades, vehículos, electrónica y la bóveda documental del hogar.</p>
        </div>
        <div className={styles.headerActions}>
          {tab === 'physical' ? (
            <Button
              onClick={() => {
                setEditingAsset(null)
                setAssetFormOpen(true)
              }}
            >
              Nuevo activo
            </Button>
          ) : (
            <Button
              onClick={() => {
                setVaultUploadOpen(true)
              }}
            >
              Subir documento
            </Button>
          )}
        </div>
      </div>

      <div className={styles.kpiGrid}>
        <Card className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Activos</span>
          <span className={styles.kpiValue}>{assets.length}</span>
          <span className={styles.kpiHint}>{formatTypeSummary(assets)}</span>
        </Card>
        <Card className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Valor actual</span>
          <span className={styles.kpiValue}>{formatCurrency(totalCurrentValue)}</span>
          <span className={styles.kpiHint}>Valor de compra {formatCurrency(totalPurchaseValue)}</span>
        </Card>
        <Card className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Alertas</span>
          <span className={styles.kpiValue}>{alerts.length}</span>
          <span className={styles.kpiHint}>{criticalCount} críticas · {warningCount} avisos</span>
        </Card>
        <Card className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Documentos</span>
          <span className={styles.kpiValue}>{vaultDocuments.length}</span>
          <span className={styles.kpiHint}>{maintenanceAlerts.length} mantenimientos · {warrantyAlerts.length} garantías</span>
        </Card>
      </div>

      <Card className={styles.prefsCard}>
        <div className={styles.prefsTop}>
          <div>
            <div className={styles.prefsTitle}>Umbrales de alerta</div>
            <div className={styles.prefsDesc}>Solo se usan para alertas derivadas en frontend. Puedes ajustarlos aquí sin tocar Settings.</div>
          </div>
          <div className={styles.toolbarMeta}>
            <span className={styles.toolbarPill}>Garantía: {prefs.warrantyDaysAhead} días</span>
            <span className={styles.toolbarPill}>Mantenimiento: {prefs.maintenanceDaysAhead} días</span>
          </div>
        </div>

        <div className={styles.prefsGrid}>
          <label className={styles.prefsField}>
            <span className={styles.prefsLabel}>Garantía dentro de cuántos días</span>
            <input
              className={styles.miniInput}
              type="number"
              min="0"
              value={prefs.warrantyDaysAhead}
              onChange={handleWarrantyDaysChange}
            />
          </label>
          <label className={styles.prefsField}>
            <span className={styles.prefsLabel}>Mantenimiento dentro de cuántos días</span>
            <input
              className={styles.miniInput}
              type="number"
              min="0"
              value={prefs.maintenanceDaysAhead}
              onChange={handleMaintenanceDaysChange}
            />
          </label>
        </div>
      </Card>

      <div className={styles.tabsRow}>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'physical' ? styles.tabActive : ''}`}
          onClick={handlePhysicalTab}
        >
          🧰 Activos físicos
          <span className={styles.tabBadge}>{assets.length}</span>
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'vault' ? styles.tabActive : ''}`}
          onClick={handleVaultTab}
        >
          🗂️ Document Vault
          <span className={styles.tabBadge}>{vaultDocuments.length}</span>
        </button>
      </div>

      {alerts.length > 0 && tab === 'physical' && (
        <div className={styles.alertStrip}>
          <div className={styles.alertHeader}>
            <div className={styles.alertTitle}>Alertas derivadas</div>
            <div className={styles.alertCount}>{alerts.length} activa{alerts.length === 1 ? '' : 's'}</div>
          </div>
          <div className={styles.alertList}>
            {summaryAlerts.map((alert) => (
              <span key={alert.id} className={`${styles.alertItem} ${summaryColor(alert.severity)}`}>
                <strong>{alert.assetName}</strong>
                <span>{alert.title}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className={styles.content}>
        <AnimatePresence mode="wait">
          {tab === 'physical' ? (
            <motion.div key="physical" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className={styles.section}>
              <div className={styles.sectionHeader}>
                <div>
                  <div className={styles.sectionTitle}>Activos físicos</div>
                  <div className={styles.sectionDesc}>Lista filtrable con ficha técnica, foto, mantenimiento y alertas derivadas.</div>
                </div>
                <div className={styles.sectionActions}>
                  <Button variant="secondary" onClick={handleAddAsset}>
                    Añadir activo
                  </Button>
                </div>
              </div>

              <AssetFilters
                filters={assetFilters}
                onFilterChange={(updates) => {
                  setAssetFilters(updates)
                }}
                onReset={resetAssetFilters}
              />

              {!hydrated ? (
                <div className={styles.skeletonGrid}>
                  <SkeletonCard className={styles.skeletonCard} />
                  <SkeletonCard className={styles.skeletonCard} />
                  <SkeletonCard className={styles.skeletonCard} />
                  <SkeletonCard className={styles.skeletonCard} />
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className={styles.emptyState}>
                  <div className={styles.emptyIcon}>📦</div>
                  <div className={styles.emptyTitle}>Sin activos</div>
                  <div className={styles.emptyDesc}>
                    Crea propiedades, vehículos o electrónica para empezar a registrar su ficha técnica y mantenimiento.
                  </div>
                  <Button onClick={handleAddAsset}>
                    Crear activo
                  </Button>
                </div>
              ) : (
                <div className={styles.assetGrid}>
                  {filteredAssets.map((asset) => (
                    <AssetCard
                      key={asset.id}
                      asset={asset}
                      alerts={alerts.filter((alert) => alert.assetId === asset.id)}
                      onOpen={handleOpenAsset}
                      onEdit={handleEditAsset}
                      onDelete={handleDeleteAsset}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div key="vault" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className={styles.section}>
              <div className={styles.sectionHeader}>
                <div>
                  <div className={styles.sectionTitle}>Document Vault</div>
                  <div className={styles.sectionDesc}>Sube PDFs e imágenes, categorízalos y vincúlalos a un activo si quieres.</div>
                </div>
                <div className={styles.sectionActions}>
                  <Button onClick={handleOpenVaultUpload}>
                    Subir documento
                  </Button>
                </div>
              </div>

              <VaultFilters
                filters={vaultFilters}
                assets={assets}
                onFilterChange={(updates) => {
                  setVaultFilters(updates)
                }}
                onReset={resetVaultFilters}
              />

              {!hydrated ? (
                <div className={styles.skeletonGrid}>
                  <Skeleton className={styles.skeletonCard} />
                  <Skeleton className={styles.skeletonCard} />
                  <Skeleton className={styles.skeletonCard} />
                </div>
              ) : (
                <VaultDocumentList
                  documents={filteredVaultDocuments}
                  assets={assets}
                  onPreview={handleVaultPreview}
                  onDelete={handleDeleteDocument}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Modal
        open={assetFormOpen}
        onClose={() => {
          setAssetFormOpen(false)
          setEditingAsset(null)
        }}
        title={editingAsset ? 'Editar activo' : 'Nuevo activo'}
        maxWidth={760}
      >
        <AssetForm
          key={editingAsset?.id ?? 'new'}
          asset={editingAsset}
          onSubmit={(data) => {
            void handleAssetSubmit(data)
          }}
          onCancel={handleCloseAssetForm}
          loading={busy}
        />
      </Modal>

      <AssetDetailModal
        asset={detailAsset}
        alerts={detailAlerts}
        maintenanceEntries={detailMaintenance}
        preferences={prefs}
        open={detailAssetId !== null}
        onClose={handleCloseDetail}
        onEditAsset={handleEditAsset}
        onDeleteAsset={handleDeleteAsset}
        onAddMaintenance={handleAddMaintenance}
        onEditMaintenance={handleEditMaintenance}
        onDeleteMaintenance={handleMaintenanceDelete}
        onUploadPhoto={(file) => {
          void handleUploadAssetPhoto(file)
        }}
      />

      <Modal
        open={maintenanceFormOpen}
        onClose={() => {
          setMaintenanceFormOpen(false)
          setEditingMaintenance(null)
        }}
        title={editingMaintenance ? 'Editar revisión' : 'Nueva revisión'}
        maxWidth={760}
      >
        {detailAsset ? (
          <MaintenanceEntryForm
            key={editingMaintenance?.id ?? 'new'}
            assetName={detailAsset.name}
            entry={editingMaintenance}
            onSubmit={(data) => {
              void handleMaintenanceSubmit(data)
            }}
            onCancel={handleCloseMaintenanceForm}
            loading={busy}
          />
        ) : (
          <div className={styles.helpText}>Selecciona un activo primero.</div>
        )}
      </Modal>

      <Modal
        open={vaultUploadOpen}
        onClose={() => { setVaultUploadOpen(false); }}
        title="Subir documento"
        maxWidth={760}
      >
        <VaultUploader
          key={vaultUploadOpen ? 'open' : 'closed'}
          assets={assets}
          onSubmit={(data) => {
            void handleVaultSubmit(data)
          }}
          onCancel={handleCloseVaultUpload}
          loading={busy}
        />
      </Modal>

      <PdfPreviewModal
        document={previewDocument}
        open={previewDocument !== null}
        onClose={handleClosePreview}
      />

      <Modal
        open={deleteTarget !== null}
        onClose={handleCloseDelete}
        title="Confirmar eliminación"
        maxWidth={420}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, width: '100%' }}>
            <Button variant="ghost" onClick={handleCancelDelete}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirmClick} loading={busy}>
              Eliminar
            </Button>
          </div>
        }
      >
        <div className={styles.helpText}>
          {deleteTarget?.kind === 'asset' && (
            <>
              Vas a eliminar <strong>{deleteTarget.asset.name}</strong>. Las revisiones asociadas y el vínculo de documentos se conservarán en la vista, pero el activo desaparecerá de la lista.
            </>
          )}
          {deleteTarget?.kind === 'maintenance' && (
            <>
              Vas a eliminar la revisión <strong>{deleteTarget.entry.title}</strong> de <strong>{deleteTarget.assetName}</strong>.
            </>
          )}
          {deleteTarget?.kind === 'document' && (
            <>
              Vas a eliminar <strong>{deleteTarget.document.title}</strong> de la bóveda documental.
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
