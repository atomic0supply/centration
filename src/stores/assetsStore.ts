import type { Timestamp } from 'firebase/firestore'
import { create } from 'zustand'

import {
  createMaintenanceEntry as createMaintenanceEntryDoc,
  deleteMaintenanceEntry as deleteMaintenanceEntryDoc,
  subscribeAssetMaintenance,
  updateMaintenanceEntry as updateMaintenanceEntryDoc,
} from '@/services/assetMaintenanceService'
import {
  createAsset as createAssetDoc,
  deleteAsset as deleteAssetDoc,
  subscribeAssets,
  updateAsset as updateAssetDoc,
} from '@/services/assetsService'
import {
  deleteVaultDocument as deleteVaultDocumentDoc,
  subscribeVaultDocuments,
  uploadVaultDocument as uploadVaultDocumentDoc,
} from '@/services/documentVaultService'
import { auth } from '@/services/firebase'
import { uploadAssetPhoto as uploadAssetPhotoBlob } from '@/services/storageService'
import { getUserNotificationPrefs, saveUserNotificationPrefs } from '@/services/userPrefsService'
import {
  DEFAULT_ASSET_ALERT_PREFERENCES as DOMAIN_DEFAULT_ASSET_ALERT_PREFERENCES,
  MAINTENANCE_KIND_LABELS,
  type MaintenanceEntry as ServiceMaintenanceEntry,
  PHYSICAL_ASSET_TYPE_LABELS,
  type PhysicalAsset as ServicePhysicalAsset,
  VAULT_DOCUMENT_CATEGORY_LABELS,
  type VaultDocument as ServiceVaultDocument,
} from '@/types/assets'
import { daysUntil, formatCurrency } from '@/utils/formatters'

export type AssetType = 'property' | 'vehicle' | 'electronics'
export type MaintenanceKind = 'itv' | 'service' | 'repair' | 'warranty_check' | 'other'
export type VaultCategory = 'factura' | 'garantia' | 'seguro' | 'itv' | 'manual' | 'otro'

export interface AssetAlertPreferences {
  maintenanceDaysAhead: number
  warrantyDaysAhead: number
}

export interface AssetFiltersState {
  search: string
  type: AssetType | 'all'
  sortBy: 'name' | 'purchaseDate' | 'value'
}

export interface VaultFiltersState {
  search: string
  category: VaultCategory | 'all'
  assetId: string
}

export interface PhysicalAsset {
  id: string
  uid: string
  type: AssetType
  name: string
  identifier: string
  purchasePrice: number
  purchaseDate: string
  currentValue: number
  currency: string
  warrantyExpiry: string | null
  photoDataUrl: string | null
  photoName: string | null
  notes: string
  createdAt: string
  updatedAt: string
}

export interface AssetMaintenanceEntry {
  id: string
  uid: string
  assetId: string
  kind: MaintenanceKind
  title: string
  description: string
  performedAt: string
  nextDueDate: string | null
  cost: number | null
  mileageKm: number | null
  completed: boolean
  createdAt: string
  updatedAt: string
}

export interface VaultDocument {
  id: string
  uid: string
  assetId: string | null
  title: string
  category: VaultCategory
  storagePath: string
  downloadUrl: string
  mimeType: string
  sizeBytes: number
  encrypted: true
  uploadedAt: string
  createdAt: string
}

export interface AssetAlert {
  id: string
  assetId: string
  assetName: string
  kind: 'maintenance' | 'warranty'
  severity: 'info' | 'warning' | 'critical'
  title: string
  body: string
  dueDate: string
  daysLeft: number
}

interface AssetDraft {
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

interface MaintenanceDraft {
  assetId: string
  kind: MaintenanceKind
  title: string
  description: string
  performedAt: string
  nextDueDate: string | null
  cost: number | null
  mileageKm: number | null
  completed: boolean
}

interface VaultUploadDraft {
  assetId: string | null
  title: string
  category: VaultCategory
  file: File
}

interface AssetsState {
  hydrated: boolean
  loadedUid: string | null
  assets: PhysicalAsset[]
  maintenance: AssetMaintenanceEntry[]
  vaultDocuments: VaultDocument[]
  prefs: AssetAlertPreferences
  assetFilters: AssetFiltersState
  vaultFilters: VaultFiltersState
  bootstrap: () => () => void
  setPrefs: (prefs: Partial<AssetAlertPreferences>) => void
  setAssetFilters: (filters: Partial<AssetFiltersState>) => void
  resetAssetFilters: () => void
  setVaultFilters: (filters: Partial<VaultFiltersState>) => void
  resetVaultFilters: () => void
  createAsset: (draft: AssetDraft) => Promise<string>
  updateAsset: (assetId: string, draft: Partial<AssetDraft>) => Promise<void>
  deleteAsset: (assetId: string) => Promise<void>
  uploadAssetPhoto: (assetId: string, file: File) => Promise<void>
  createMaintenanceEntry: (draft: MaintenanceDraft) => Promise<string>
  updateMaintenanceEntry: (entryId: string, draft: Partial<MaintenanceDraft>) => Promise<void>
  deleteMaintenanceEntry: (entryId: string) => Promise<void>
  uploadVaultDocument: (draft: VaultUploadDraft) => Promise<string>
  deleteVaultDocument: (documentId: string) => Promise<void>
  filteredAssets: () => PhysicalAsset[]
  assetMaintenance: (assetId: string) => AssetMaintenanceEntry[]
  assetVaultDocuments: (assetId: string) => VaultDocument[]
  filteredVaultDocuments: () => VaultDocument[]
  alerts: () => AssetAlert[]
}

const DEFAULT_PREFS: AssetAlertPreferences = {
  maintenanceDaysAhead: DOMAIN_DEFAULT_ASSET_ALERT_PREFERENCES.maintenanceDaysAhead,
  warrantyDaysAhead: DOMAIN_DEFAULT_ASSET_ALERT_PREFERENCES.warrantyDaysAhead,
}

const DEFAULT_ASSET_FILTERS: AssetFiltersState = {
  search: '',
  type: 'all',
  sortBy: 'name',
}

const DEFAULT_VAULT_FILTERS: VaultFiltersState = {
  search: '',
  category: 'all',
  assetId: 'all',
}

interface BootstrapFlags {
  assets: boolean
  maintenance: boolean
  prefs: boolean
  vault: boolean
}

let bootstrapToken = 0
let activeSubscriptions: (() => void) | null = null

function toDateOnlyIso(value: Timestamp | null | undefined): string | null {
  if (!value) return null
  return value.toDate().toISOString().split('T')[0]
}

function toDateTimeIso(value: Timestamp | null | undefined): string {
  if (!value) return new Date().toISOString()
  return value.toDate().toISOString()
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function parseDateInput(value: string | null | undefined): Date | null {
  if (!value) return null

  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed
}

function fileNameFromPath(path: string | null | undefined): string | null {
  if (!path) return null
  const segments = path.split('/')
  return segments[segments.length - 1] ?? null
}

function normalizePrefs(prefs: Partial<AssetAlertPreferences>): AssetAlertPreferences {
  return {
    maintenanceDaysAhead:
      typeof prefs.maintenanceDaysAhead === 'number' && Number.isFinite(prefs.maintenanceDaysAhead)
        ? Math.max(0, Math.floor(prefs.maintenanceDaysAhead))
        : DEFAULT_PREFS.maintenanceDaysAhead,
    warrantyDaysAhead:
      typeof prefs.warrantyDaysAhead === 'number' && Number.isFinite(prefs.warrantyDaysAhead)
        ? Math.max(0, Math.floor(prefs.warrantyDaysAhead))
        : DEFAULT_PREFS.warrantyDaysAhead,
  }
}

function mapPhysicalAsset(asset: ServicePhysicalAsset): PhysicalAsset {
  return {
    id: asset.id,
    uid: asset.uid,
    type: asset.type,
    name: asset.name,
    identifier: asset.identifier ?? '',
    purchasePrice: asset.purchasePrice,
    purchaseDate: toDateOnlyIso(asset.purchaseDate) ?? new Date().toISOString().split('T')[0],
    currentValue: asset.currentValue,
    currency: asset.currency,
    warrantyExpiry: toDateOnlyIso(asset.warrantyExpiry),
    photoDataUrl: asset.photoUrl,
    photoName: fileNameFromPath(asset.photoPath),
    notes: asset.notes,
    createdAt: toDateTimeIso(asset.createdAt),
    updatedAt: toDateTimeIso(asset.updatedAt),
  }
}

function mapMaintenanceEntry(entry: ServiceMaintenanceEntry): AssetMaintenanceEntry {
  return {
    id: entry.id,
    uid: entry.uid,
    assetId: entry.assetId,
    kind: entry.kind,
    title: entry.title,
    description: entry.description ?? '',
    performedAt: toDateOnlyIso(entry.performedAt) ?? new Date().toISOString().split('T')[0],
    nextDueDate: toDateOnlyIso(entry.nextDueDate),
    cost: entry.cost,
    mileageKm: entry.mileageKm,
    completed: entry.completed,
    createdAt: toDateTimeIso(entry.createdAt),
    updatedAt: toDateTimeIso(entry.updatedAt),
  }
}

function mapVaultDocument(document: ServiceVaultDocument): VaultDocument {
  return {
    id: document.id,
    uid: document.uid,
    assetId: document.assetId,
    title: document.title,
    category: document.category,
    storagePath: document.storagePath,
    downloadUrl: document.downloadUrl,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    encrypted: true,
    uploadedAt: toDateTimeIso(document.uploadedAt),
    createdAt: toDateTimeIso(document.createdAt),
  }
}

function markBootstrapComplete(
  token: number,
  flags: BootstrapFlags,
  set: (partial: Partial<AssetsState>) => void,
): void {
  if (token !== bootstrapToken) {
    return
  }

  if (flags.assets && flags.maintenance && flags.vault && flags.prefs) {
    set({ hydrated: true })
  }
}

function maintenanceSeverity(daysLeft: number): AssetAlert['severity'] {
  if (daysLeft < 0) return 'critical'
  if (daysLeft <= 7) return 'warning'
  return 'info'
}

function warrantySeverity(daysLeft: number): AssetAlert['severity'] {
  if (daysLeft < 0) return 'critical'
  if (daysLeft <= 14) return 'warning'
  return 'info'
}

export function daysUntilIso(isoDate: string | null | undefined): number | null {
  if (!isoDate) return null
  return daysUntil(isoDate)
}

export function computeAssetAlerts(
  assets: PhysicalAsset[],
  maintenance: AssetMaintenanceEntry[],
  prefs: AssetAlertPreferences,
): AssetAlert[] {
  const alerts: AssetAlert[] = []

  for (const asset of assets) {
    if (asset.warrantyExpiry) {
      const daysLeft = daysUntilIso(asset.warrantyExpiry)
      if (daysLeft !== null && daysLeft <= prefs.warrantyDaysAhead) {
        alerts.push({
          id: `${asset.id}-warranty`,
          assetId: asset.id,
          assetName: asset.name,
          kind: 'warranty',
          severity: warrantySeverity(daysLeft),
          title: daysLeft < 0 ? 'Garantía vencida' : 'Garantía próxima',
          body:
            daysLeft < 0
              ? `${asset.name} tiene la garantía vencida.`
              : `La garantía de ${asset.name} vence en ${String(daysLeft)} día${daysLeft === 1 ? '' : 's'}.`,
          dueDate: asset.warrantyExpiry,
          daysLeft,
        })
      }
    }

    const nextEntries = maintenance
      .filter((entry) => entry.assetId === asset.id && entry.nextDueDate)
      .sort((a, b) => {
        const aDays = daysUntilIso(a.nextDueDate)
        const bDays = daysUntilIso(b.nextDueDate)
        return (aDays ?? Number.POSITIVE_INFINITY) - (bDays ?? Number.POSITIVE_INFINITY)
      })

    for (const entry of nextEntries) {
      const dueDate = entry.nextDueDate
      if (!dueDate) continue

      const daysLeft = daysUntilIso(dueDate)
      if (daysLeft === null || daysLeft > prefs.maintenanceDaysAhead) continue

      alerts.push({
        id: `${entry.id}-maintenance`,
        assetId: asset.id,
        assetName: asset.name,
        kind: 'maintenance',
        severity: maintenanceSeverity(daysLeft),
        title: entry.kind === 'itv' ? 'ITV próxima' : 'Mantenimiento próximo',
        body:
          daysLeft < 0
            ? `${entry.title} está vencida para ${asset.name}.`
            : `${entry.title} para ${asset.name} vence en ${String(daysLeft)} día${daysLeft === 1 ? '' : 's'}.`,
        dueDate,
        daysLeft,
      })
    }
  }

  return alerts.sort((a, b) => a.daysLeft - b.daysLeft)
}

function filterAssets(items: PhysicalAsset[], filters: AssetFiltersState): PhysicalAsset[] {
  const search = normalizeText(filters.search.trim())

  const filtered = items.filter((asset) => {
    const matchesType = filters.type === 'all' || asset.type === filters.type
    const matchesSearch =
      search.length === 0 ||
      normalizeText(asset.name).includes(search) ||
      normalizeText(asset.identifier).includes(search) ||
      normalizeText(asset.notes).includes(search)

    return matchesType && matchesSearch
  })

  return filtered.sort((a, b) => {
    if (filters.sortBy === 'purchaseDate') {
      return b.purchaseDate.localeCompare(a.purchaseDate)
    }

    if (filters.sortBy === 'value') {
      return b.currentValue - a.currentValue
    }

    return a.name.localeCompare(b.name, 'es')
  })
}

function filterVaultDocuments(
  documents: VaultDocument[],
  filters: VaultFiltersState,
  assets: PhysicalAsset[],
): VaultDocument[] {
  const search = normalizeText(filters.search.trim())
  const assetMap = new Map(assets.map((asset) => [asset.id, asset.name]))

  return documents
    .filter((document) => {
      const assetName = document.assetId ? assetMap.get(document.assetId) ?? '' : ''
      const matchesCategory = filters.category === 'all' || document.category === filters.category
      const matchesAsset = filters.assetId === 'all' || document.assetId === filters.assetId
      const matchesSearch =
        search.length === 0 ||
        normalizeText(document.title).includes(search) ||
        normalizeText(document.storagePath).includes(search) ||
        normalizeText(assetName).includes(search)

      return matchesCategory && matchesAsset && matchesSearch
    })
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
}

function assetMaintenanceList(assetId: string, maintenance: AssetMaintenanceEntry[]): AssetMaintenanceEntry[] {
  return maintenance
    .filter((entry) => entry.assetId === assetId)
    .sort((a, b) => b.performedAt.localeCompare(a.performedAt))
}

function assetVaultDocumentsList(assetId: string, vaultDocuments: VaultDocument[]): VaultDocument[] {
  return vaultDocuments.filter((document) => document.assetId === assetId)
}

export const useAssetsStore = create<AssetsState>((set, get) => ({
  hydrated: false,
  loadedUid: null,
  assets: [],
  maintenance: [],
  vaultDocuments: [],
  prefs: { ...DEFAULT_PREFS },
  assetFilters: { ...DEFAULT_ASSET_FILTERS },
  vaultFilters: { ...DEFAULT_VAULT_FILTERS },

  bootstrap: () => {
    bootstrapToken += 1
    const token = bootstrapToken

    activeSubscriptions?.()
    activeSubscriptions = null

    const flags: BootstrapFlags = {
      assets: false,
      maintenance: false,
      prefs: false,
      vault: false,
    }

    set({
      hydrated: false,
      loadedUid: auth.currentUser?.uid ?? null,
      assets: [],
      maintenance: [],
      vaultDocuments: [],
      prefs: { ...DEFAULT_PREFS },
    })

    const unsubscribeAssets = subscribeAssets(
      (items) => {
        if (token !== bootstrapToken) return
        flags.assets = true
        set({ assets: items.map(mapPhysicalAsset), loadedUid: auth.currentUser?.uid ?? null })
        markBootstrapComplete(token, flags, set)
      },
      (error) => {
        console.error('[assetsStore] subscribeAssets error:', error)
        if (token !== bootstrapToken) return
        flags.assets = true
        set({ assets: [] })
        markBootstrapComplete(token, flags, set)
      },
      { type: 'all' },
    )

    const unsubscribeMaintenance = subscribeAssetMaintenance(
      (entries) => {
        if (token !== bootstrapToken) return
        flags.maintenance = true
        set({ maintenance: entries.map(mapMaintenanceEntry) })
        markBootstrapComplete(token, flags, set)
      },
      (error) => {
        console.error('[assetsStore] subscribeAssetMaintenance error:', error)
        if (token !== bootstrapToken) return
        flags.maintenance = true
        set({ maintenance: [] })
        markBootstrapComplete(token, flags, set)
      },
    )

    const unsubscribeVault = subscribeVaultDocuments(
      (documents) => {
        if (token !== bootstrapToken) return
        flags.vault = true
        set({ vaultDocuments: documents.map(mapVaultDocument) })
        markBootstrapComplete(token, flags, set)
      },
      (error) => {
        console.error('[assetsStore] subscribeVaultDocuments error:', error)
        if (token !== bootstrapToken) return
        flags.vault = true
        set({ vaultDocuments: [] })
        markBootstrapComplete(token, flags, set)
      },
    )

    void getUserNotificationPrefs()
      .then((prefs) => {
        if (token !== bootstrapToken) return
        flags.prefs = true
        set({ prefs: normalizePrefs(prefs) })
        markBootstrapComplete(token, flags, set)
      })
      .catch((error: unknown) => {
        console.error('[assetsStore] getUserNotificationPrefs error:', error)
        if (token !== bootstrapToken) return
        flags.prefs = true
        set({ prefs: { ...DEFAULT_PREFS } })
        markBootstrapComplete(token, flags, set)
      })

    const cleanup = () => {
      unsubscribeAssets()
      unsubscribeMaintenance()
      unsubscribeVault()
    }

    activeSubscriptions = cleanup
    return cleanup
  },

  setPrefs: (prefs) => {
    const next = normalizePrefs({ ...get().prefs, ...prefs })
    set({ prefs: next })

    void saveUserNotificationPrefs(next).catch((error: unknown) => {
      console.error('[assetsStore] saveUserNotificationPrefs error:', error)
    })
  },

  setAssetFilters: (filters) => {
    set((state) => ({
      assetFilters: {
        ...state.assetFilters,
        ...filters,
      },
    }))
  },

  resetAssetFilters: () => {
    set({ assetFilters: { ...DEFAULT_ASSET_FILTERS } })
  },

  setVaultFilters: (filters) => {
    set((state) => ({
      vaultFilters: {
        ...state.vaultFilters,
        ...filters,
      },
    }))
  },

  resetVaultFilters: () => {
    set({ vaultFilters: { ...DEFAULT_VAULT_FILTERS } })
  },

  createAsset: async (draft) => {
    const purchaseDate = parseDateInput(draft.purchaseDate)
    if (!purchaseDate) {
      throw new Error('Fecha de compra inválida')
    }

    return createAssetDoc({
      type: draft.type,
      name: draft.name,
      identifier: draft.identifier,
      purchasePrice: draft.purchasePrice,
      purchaseDate,
      currentValue: draft.currentValue,
      currency: draft.currency,
      warrantyExpiry: parseDateInput(draft.warrantyExpiry),
      notes: draft.notes,
    })
  },

  updateAsset: async (assetId, draft) => {
    const updates: {
      currentValue?: number
      currency?: string
      identifier?: string | null
      name?: string
      notes?: string
      purchaseDate?: Date | null
      purchasePrice?: number
      type?: AssetType
      warrantyExpiry?: Date | null
    } = {}

    if (draft.type !== undefined) updates.type = draft.type
    if (draft.name !== undefined) updates.name = draft.name
    if (draft.identifier !== undefined) updates.identifier = draft.identifier
    if (draft.purchasePrice !== undefined) updates.purchasePrice = draft.purchasePrice
    if (draft.purchaseDate !== undefined) updates.purchaseDate = parseDateInput(draft.purchaseDate)
    if (draft.currentValue !== undefined) updates.currentValue = draft.currentValue
    if (draft.currency !== undefined) updates.currency = draft.currency
    if (draft.warrantyExpiry !== undefined) {
      updates.warrantyExpiry = parseDateInput(draft.warrantyExpiry)
    }
    if (draft.notes !== undefined) updates.notes = draft.notes

    await updateAssetDoc(assetId, updates)
  },

  deleteAsset: async (assetId) => {
    await deleteAssetDoc(assetId)
  },

  uploadAssetPhoto: async (assetId, file) => {
    const uploaded = await uploadAssetPhotoBlob(file)
    await updateAssetDoc(assetId, {
      photoPath: uploaded.path,
      photoUrl: uploaded.url,
    })
  },

  createMaintenanceEntry: async (draft) => {
    const performedAt = parseDateInput(draft.performedAt)
    if (!performedAt) {
      throw new Error('Fecha de revisión inválida')
    }

    return createMaintenanceEntryDoc({
      assetId: draft.assetId,
      kind: draft.kind,
      title: draft.title,
      description: draft.description,
      performedAt,
      nextDueDate: parseDateInput(draft.nextDueDate),
      cost: draft.cost,
      mileageKm: draft.mileageKm,
      completed: draft.completed,
    })
  },

  updateMaintenanceEntry: async (entryId, draft) => {
    const updates: {
      assetId?: string
      completed?: boolean
      cost?: number | null
      description?: string | null
      kind?: MaintenanceKind
      mileageKm?: number | null
      nextDueDate?: Date | null
      performedAt?: Date | null
      title?: string
    } = {}

    if (draft.assetId !== undefined) updates.assetId = draft.assetId
    if (draft.kind !== undefined) updates.kind = draft.kind
    if (draft.title !== undefined) updates.title = draft.title
    if (draft.description !== undefined) updates.description = draft.description
    if (draft.performedAt !== undefined) updates.performedAt = parseDateInput(draft.performedAt)
    if (draft.nextDueDate !== undefined) updates.nextDueDate = parseDateInput(draft.nextDueDate)
    if (draft.cost !== undefined) updates.cost = draft.cost
    if (draft.mileageKm !== undefined) updates.mileageKm = draft.mileageKm
    if (draft.completed !== undefined) updates.completed = draft.completed

    await updateMaintenanceEntryDoc(entryId, updates)
  },

  deleteMaintenanceEntry: async (entryId) => {
    await deleteMaintenanceEntryDoc(entryId)
  },

  uploadVaultDocument: async (draft) => {
    const uploaded = await uploadVaultDocumentDoc(draft.file, {
      title: draft.title,
      category: draft.category,
      assetId: draft.assetId,
    })

    return uploaded.id
  },

  deleteVaultDocument: async (documentId) => {
    await deleteVaultDocumentDoc(documentId)
  },

  filteredAssets: () => {
    const state = get()
    return filterAssets(state.assets, state.assetFilters)
  },

  assetMaintenance: (assetId) => {
    return assetMaintenanceList(assetId, get().maintenance)
  },

  assetVaultDocuments: (assetId) => {
    return assetVaultDocumentsList(assetId, get().vaultDocuments)
  },

  filteredVaultDocuments: () => {
    const state = get()
    return filterVaultDocuments(state.vaultDocuments, state.vaultFilters, state.assets)
  },

  alerts: () => {
    const state = get()
    return computeAssetAlerts(state.assets, state.maintenance, state.prefs)
  },
}))

export function getAssetDisplayValue(asset: PhysicalAsset): string {
  return formatCurrency(asset.currentValue, asset.currency)
}

export function getAssetPurchaseValue(asset: PhysicalAsset): string {
  return formatCurrency(asset.purchasePrice, asset.currency)
}

export function getAssetTypeLabel(type: AssetType): string {
  return PHYSICAL_ASSET_TYPE_LABELS[type]
}

export function getMaintenanceKindLabel(kind: MaintenanceKind): string {
  return MAINTENANCE_KIND_LABELS[kind]
}

export function getVaultCategoryLabel(category: VaultCategory): string {
  return VAULT_DOCUMENT_CATEGORY_LABELS[category]
}

export const ASSET_FILTER_OPTIONS: { value: AssetFiltersState['type']; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'property', label: 'Propiedades' },
  { value: 'vehicle', label: 'Vehículos' },
  { value: 'electronics', label: 'Electrónica' },
]

export const VAULT_CATEGORY_OPTIONS: { value: VaultCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'factura', label: 'Facturas' },
  { value: 'garantia', label: 'Garantías' },
  { value: 'seguro', label: 'Seguros' },
  { value: 'itv', label: 'ITV' },
  { value: 'manual', label: 'Manuales' },
  { value: 'otro', label: 'Otros' },
]

export const MAINTENANCE_KIND_OPTIONS: { value: MaintenanceKind; label: string }[] = [
  { value: 'itv', label: 'ITV' },
  { value: 'service', label: 'Servicio' },
  { value: 'repair', label: 'Reparación' },
  { value: 'warranty_check', label: 'Garantía' },
  { value: 'other', label: 'Otro' },
]

export { DEFAULT_PREFS as DEFAULT_ASSET_ALERT_PREFERENCES, DEFAULT_ASSET_FILTERS, DEFAULT_VAULT_FILTERS }
