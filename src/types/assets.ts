import type { Timestamp } from 'firebase/firestore'

export type PhysicalAssetType = 'property' | 'vehicle' | 'electronics'

export const PHYSICAL_ASSET_TYPE_LABELS: Record<PhysicalAssetType, string> = {
  property: 'Propiedad',
  vehicle: 'Vehículo',
  electronics: 'Electrónica',
}

export type MaintenanceKind = 'itv' | 'service' | 'repair' | 'warranty_check' | 'other'

export const MAINTENANCE_KIND_LABELS: Record<MaintenanceKind, string> = {
  itv: 'ITV',
  service: 'Revisión',
  repair: 'Reparación',
  warranty_check: 'Garantía',
  other: 'Otro',
}

export type VaultDocumentCategory = 'factura' | 'garantia' | 'seguro' | 'itv' | 'manual' | 'otro'

export const VAULT_DOCUMENT_CATEGORY_LABELS: Record<VaultDocumentCategory, string> = {
  factura: 'Factura',
  garantia: 'Garantía',
  seguro: 'Seguro',
  itv: 'ITV',
  manual: 'Manual',
  otro: 'Otro',
}

export interface PhysicalAsset {
  id: string
  uid: string
  type: PhysicalAssetType
  name: string
  identifier: string | null
  purchasePrice: number
  purchaseDate: Timestamp
  currentValue: number
  currency: string
  warrantyExpiry: Timestamp | null
  photoPath: string | null
  photoUrl: string | null
  notes: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface MaintenanceEntry {
  id: string
  uid: string
  assetId: string
  kind: MaintenanceKind
  title: string
  description: string | null
  performedAt: Timestamp
  nextDueDate: Timestamp | null
  cost: number | null
  mileageKm: number | null
  completed: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface VaultDocument {
  id: string
  uid: string
  assetId: string | null
  title: string
  category: VaultDocumentCategory
  storagePath: string
  downloadUrl: string
  mimeType: string
  sizeBytes: number
  encrypted: true
  uploadedAt: Timestamp
  createdAt: Timestamp
}

export interface AssetAlertPreferences {
  maintenanceDaysAhead: number
  warrantyDaysAhead: number
}

export const DEFAULT_ASSET_ALERT_PREFERENCES: AssetAlertPreferences = {
  maintenanceDaysAhead: 14,
  warrantyDaysAhead: 30,
}

export type AssetAlertKind = 'maintenance' | 'warranty'
export type AssetAlertSeverity = 'info' | 'warning' | 'critical'

export interface AssetAlert {
  id: string
  assetId: string
  assetName: string
  kind: AssetAlertKind
  severity: AssetAlertSeverity
  title: string
  body: string
  daysLeft: number
  dueAt: Timestamp
  sourceId: string | null
}

function sanitizeDays(value: number | null | undefined, fallback: number): number {
  return Number.isFinite(value) && value !== undefined && value !== null && value >= 0
    ? Math.floor(value)
    : fallback
}

export function daysUntil(date: Timestamp | null | undefined, now = Date.now()): number | null {
  if (!date) return null
  return Math.ceil((date.toMillis() - now) / 86_400_000)
}

function severityForDays(daysLeft: number): AssetAlertSeverity {
  if (daysLeft <= 0) return 'critical'
  if (daysLeft <= 3) return 'critical'
  return 'warning'
}

function describeDaysLeft(daysLeft: number): string {
  if (daysLeft < 0) {
    return `Hace ${String(Math.abs(daysLeft))} día${Math.abs(daysLeft) === 1 ? '' : 's'}`
  }

  if (daysLeft === 0) {
    return 'Hoy'
  }

  return `En ${String(daysLeft)} día${daysLeft === 1 ? '' : 's'}`
}

export function computeAssetAlerts(
  asset: PhysicalAsset,
  maintenanceEntries: MaintenanceEntry[],
  preferences: AssetAlertPreferences = DEFAULT_ASSET_ALERT_PREFERENCES,
  now = Date.now(),
): AssetAlert[] {
  const maintenanceDaysAhead = sanitizeDays(preferences.maintenanceDaysAhead, DEFAULT_ASSET_ALERT_PREFERENCES.maintenanceDaysAhead)
  const warrantyDaysAhead = sanitizeDays(preferences.warrantyDaysAhead, DEFAULT_ASSET_ALERT_PREFERENCES.warrantyDaysAhead)
  const alerts: AssetAlert[] = []

  const warrantyDays = daysUntil(asset.warrantyExpiry, now)
  if (asset.warrantyExpiry && warrantyDays !== null && warrantyDays <= warrantyDaysAhead) {
    alerts.push({
      id: `${asset.id}:warranty`,
      assetId: asset.id,
      assetName: asset.name,
      kind: 'warranty',
      severity: severityForDays(warrantyDays),
      title: `Garantía de ${asset.name}`,
      body:
        warrantyDays < 0
          ? `La garantía venció hace ${String(Math.abs(warrantyDays))} día${Math.abs(warrantyDays) === 1 ? '' : 's'}.`
          : `La garantía vence ${describeDaysLeft(warrantyDays)}.`,
      daysLeft: warrantyDays,
      dueAt: asset.warrantyExpiry,
      sourceId: null,
    })
  }

  const maintenanceAlerts = maintenanceEntries.flatMap((entry) => {
    if (entry.assetId !== asset.id || !entry.nextDueDate) {
      return []
    }

    const daysLeft = daysUntil(entry.nextDueDate, now)
    if (daysLeft === null || daysLeft > maintenanceDaysAhead) {
      return []
    }

    return [
      {
        id: `${asset.id}:maintenance:${entry.id}`,
        assetId: asset.id,
        assetName: asset.name,
        kind: 'maintenance' as const,
        severity: severityForDays(daysLeft),
        title: entry.title || `${MAINTENANCE_KIND_LABELS[entry.kind]} pendiente`,
        body:
          daysLeft < 0
            ? `La cita de mantenimiento venció hace ${String(Math.abs(daysLeft))} día${Math.abs(daysLeft) === 1 ? '' : 's'}.`
            : `La cita está ${describeDaysLeft(daysLeft).toLowerCase()}.`,
        daysLeft,
        dueAt: entry.nextDueDate,
        sourceId: entry.id,
      } satisfies AssetAlert,
    ]
  })

  return [...alerts, ...maintenanceAlerts].sort((a, b) => a.daysLeft - b.daysLeft)
}
