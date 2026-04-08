import { beforeEach, describe, expect, it, vi } from 'vitest'

type AssetType = 'property' | 'vehicle' | 'electronics'

interface AssetDoc {
  id: string
  data: () => Record<string, unknown>
}

interface HarnessOptions {
  uid?: string | null
  assetDocs?: AssetDoc[]
  maintenanceDocs?: AssetDoc[]
  vaultDocs?: AssetDoc[]
}

function makeDoc(id: string, data: Record<string, unknown>): AssetDoc {
  return {
    id,
    data: () => data,
  }
}

async function createHarness(options: HarnessOptions = {}) {
  const assetDocs = options.assetDocs ?? []
  const maintenanceDocs = options.maintenanceDocs ?? []
  const vaultDocs = options.vaultDocs ?? []

  const addDoc = vi.fn((_collectionRef: { path: string }, _data: Record<string, unknown>) =>
    Promise.resolve({ id: 'doc-created' }),
  )
  const deleteDoc = vi.fn(() => Promise.resolve(undefined))
  const updateDoc = vi.fn(() => Promise.resolve(undefined))
  const getDoc = vi.fn(() =>
    Promise.resolve({
      exists: () => true,
      data: () => ({}),
    }),
  )
  const getDocs = vi.fn((queryRef: { path: string }) => {
    if (queryRef.path === 'assets') return Promise.resolve({ docs: assetDocs })
    if (queryRef.path === 'asset_maintenance') return Promise.resolve({ docs: maintenanceDocs })
    if (queryRef.path === 'vault_documents') return Promise.resolve({ docs: vaultDocs })
    return Promise.resolve({ docs: [] })
  })
  const collection = vi.fn((...args: [unknown, string]) => ({ path: args[1] }))
  const doc = vi.fn((...args: [unknown, string, string]) => ({ path: `${args[1]}/${args[2]}` }))
  const query = vi.fn((collectionRef: { path: string }, ..._parts: unknown[]) => collectionRef)
  const where = vi.fn((...args: unknown[]) => ({ kind: 'where', args }))
  const orderBy = vi.fn((...args: unknown[]) => ({ kind: 'orderBy', args }))
  const serverTimestamp = vi.fn(() => 'SERVER_TIMESTAMP')

  const ref = vi.fn((_storage: unknown, path: string) => ({ fullPath: path }))
  const getDownloadURL = vi.fn((storageRef: { fullPath: string }) =>
    Promise.resolve(`https://cdn.example/${storageRef.fullPath}`),
  )
  const deleteObject = vi.fn(() => Promise.resolve(undefined))
  const uploadBytesResumable = vi.fn(
    (_storageRef: { fullPath: string }, blob: Blob, metadata: Record<string, unknown>) => {
      return {
        snapshot: { ref: { fullPath: _storageRef.fullPath } },
        on: (
          _event: string,
          onProgress?: (snapshot: { bytesTransferred: number; totalBytes: number }) => void,
          _onError?: (error: Error) => void,
          onComplete?: () => void,
          ) => {
          onProgress?.({
            bytesTransferred: blob.size,
            totalBytes: blob.size,
          })
          onComplete?.()
        },
        metadata,
      }
    },
  )

  vi.doMock('firebase/firestore', () => ({
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    Timestamp: {
      fromDate: (date: Date) => ({ toDate: () => date }),
    },
    updateDoc,
    where,
  }))

  vi.doMock('firebase/storage', () => ({
    deleteObject,
    getDownloadURL,
    ref,
    uploadBytesResumable,
  }))

  vi.doMock('@/services/firebase', () => ({
    auth: {
      currentUser: options.uid === null ? null : { uid: options.uid ?? 'user-1' },
    },
    db: {},
    storage: {},
  }))

  const firestore = await import('firebase/firestore')
  const storage = await import('firebase/storage')
  const firebase = await import('@/services/firebase')

  async function createPhysicalAsset(input: {
    name: string
    type: AssetType
    purchaseDate: Date
    value: number
    warrantyEndsAt?: Date | null
  }) {
    const uid = firebase.auth.currentUser?.uid
    if (!uid) throw new Error('Usuario no autenticado')

    const refDoc = await firestore.addDoc(firestore.collection(firebase.db, 'assets'), {
      uid,
      name: input.name,
      type: input.type,
      purchaseDate: firestore.Timestamp.fromDate(input.purchaseDate),
      value: input.value,
      warrantyEndsAt:
        input.warrantyEndsAt === undefined || input.warrantyEndsAt === null
          ? null
          : firestore.Timestamp.fromDate(input.warrantyEndsAt),
    })

    return refDoc.id
  }

  async function updatePhysicalAsset(
    assetId: string,
    updates: Partial<{
      name: string
      type: AssetType
      value: number
      warrantyEndsAt: Date | null
    }>,
  ) {
    const uid = firebase.auth.currentUser?.uid
    if (!uid) throw new Error('Usuario no autenticado')

    const data: Record<string, unknown> = {}
    if (updates.name !== undefined) data.name = updates.name
    if (updates.type !== undefined) data.type = updates.type
    if (updates.value !== undefined) data.value = updates.value
    if (updates.warrantyEndsAt !== undefined) {
      data.warrantyEndsAt =
        updates.warrantyEndsAt === null
          ? null
          : firestore.Timestamp.fromDate(updates.warrantyEndsAt)
    }

    await firestore.updateDoc(firestore.doc(firebase.db, 'assets', assetId), data)
  }

  async function deletePhysicalAsset(assetId: string) {
    const uid = firebase.auth.currentUser?.uid
    if (!uid) throw new Error('Usuario no autenticado')

    await firestore.deleteDoc(firestore.doc(firebase.db, 'assets', assetId))
  }

  async function listPhysicalAssets() {
    const uid = firebase.auth.currentUser?.uid
    if (!uid) throw new Error('Usuario no autenticado')

    const snap = await firestore.getDocs(
      firestore.query(
        firestore.collection(firebase.db, 'assets'),
        firestore.where('uid', '==', uid),
        firestore.orderBy('name', 'asc'),
      ),
    )

    return snap.docs.map((item) => ({
      id: item.id,
      ...(item.data() as Record<string, unknown>),
    }))
  }

  async function createMaintenanceEntry(
    assetId: string,
    input: {
      kind: 'itv' | 'repair' | 'review'
      scheduledFor: Date
      notes?: string
    },
  ) {
    const uid = firebase.auth.currentUser?.uid
    if (!uid) throw new Error('Usuario no autenticado')

    const refDoc = await firestore.addDoc(firestore.collection(firebase.db, 'asset_maintenance'), {
      uid,
      assetId,
      kind: input.kind,
      scheduledFor: firestore.Timestamp.fromDate(input.scheduledFor),
      notes: input.notes ?? '',
    })

    return refDoc.id
  }

  async function updateMaintenanceEntry(
    entryId: string,
    updates: Partial<{
      kind: 'itv' | 'repair' | 'review'
      scheduledFor: Date
      notes: string
    }>,
  ) {
    const uid = firebase.auth.currentUser?.uid
    if (!uid) throw new Error('Usuario no autenticado')

    const data: Record<string, unknown> = {}
    if (updates.kind !== undefined) data.kind = updates.kind
    if (updates.scheduledFor !== undefined) {
      data.scheduledFor = firestore.Timestamp.fromDate(updates.scheduledFor)
    }
    if (updates.notes !== undefined) data.notes = updates.notes

    await firestore.updateDoc(firestore.doc(firebase.db, 'asset_maintenance', entryId), data)
  }

  async function deleteMaintenanceEntry(entryId: string) {
    const uid = firebase.auth.currentUser?.uid
    if (!uid) throw new Error('Usuario no autenticado')

    await firestore.deleteDoc(firestore.doc(firebase.db, 'asset_maintenance', entryId))
  }

  async function listMaintenanceEntries(assetId: string) {
    const uid = firebase.auth.currentUser?.uid
    if (!uid) throw new Error('Usuario no autenticado')

    const snap = await firestore.getDocs(
      firestore.query(
        firestore.collection(firebase.db, 'asset_maintenance'),
        firestore.where('uid', '==', uid),
        firestore.where('assetId', '==', assetId),
        firestore.orderBy('scheduledFor', 'asc'),
      ),
    )

    return snap.docs.map((item) => ({
      id: item.id,
      ...(item.data() as Record<string, unknown>),
    }))
  }

  async function uploadVaultDocument(
    input: {
      fileName: string
      category: 'factura' | 'garantia' | 'seguro' | 'itv' | 'manual' | 'otro'
      assetId?: string | null
      mimeType: string
    },
    file: Blob,
  ) {
    const uid = firebase.auth.currentUser?.uid
    if (!uid) throw new Error('Usuario no autenticado')

    const storagePath = `vault/${uid}/${input.fileName}`
    const storageRef = storage.ref(firebase.storage, storagePath)
    const uploadTask = storage.uploadBytesResumable(storageRef, file, {
      contentType: input.mimeType,
      customMetadata: {
        uid,
        encrypted: 'true',
        assetId: input.assetId ?? '',
        category: input.category,
      },
    })

    await new Promise<void>((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        () => undefined,
        reject,
        () => {
          resolve()
        },
      )
    })

    const downloadUrl = await storage.getDownloadURL(uploadTask.snapshot.ref)
    const refDoc = await firestore.addDoc(firestore.collection(firebase.db, 'vault_documents'), {
      uid,
      assetId: input.assetId ?? null,
      category: input.category,
      fileName: input.fileName,
      mimeType: input.mimeType,
      storagePath,
      downloadUrl,
      encrypted: true,
    })

    return {
      id: refDoc.id,
      storagePath,
      downloadUrl,
    }
  }

  async function deleteVaultDocument(docId: string, storagePath: string) {
    const uid = firebase.auth.currentUser?.uid
    if (!uid) throw new Error('Usuario no autenticado')

    await storage.deleteObject(storage.ref(firebase.storage, storagePath))
    await firestore.deleteDoc(firestore.doc(firebase.db, 'vault_documents', docId))
  }

  async function listVaultDocuments() {
    const uid = firebase.auth.currentUser?.uid
    if (!uid) throw new Error('Usuario no autenticado')

    const snap = await firestore.getDocs(
      firestore.query(
        firestore.collection(firebase.db, 'vault_documents'),
        firestore.where('uid', '==', uid),
        firestore.orderBy('fileName', 'asc'),
      ),
    )

    return snap.docs.map((item) => ({
      id: item.id,
      ...(item.data() as Record<string, unknown>),
    }))
  }

  return {
    addDoc,
    collection,
    deleteDoc,
    deleteObject,
    deletePhysicalAsset,
    deleteMaintenanceEntry,
    deleteVaultDocument,
    getDoc,
    getDocs,
    getDownloadURL,
    listMaintenanceEntries,
    listPhysicalAssets,
    listVaultDocuments,
    orderBy,
    query,
    ref,
    serverTimestamp,
    storage,
    updateDoc,
    updateMaintenanceEntry,
    updatePhysicalAsset,
    uploadBytesResumable,
    uploadVaultDocument,
    where,
    createMaintenanceEntry,
    createPhysicalAsset,
  }
}

describe('asset service contracts', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('creates, updates, deletes and lists physical assets', async () => {
    const harness = await createHarness({
      assetDocs: [
        makeDoc('asset-2', {
          uid: 'user-1',
          name: 'Piso',
          type: 'property',
          value: 250000,
        }),
      ],
    })

    await expect(
      harness.createPhysicalAsset({
        name: 'Coche',
        type: 'vehicle',
        purchaseDate: new Date('2026-03-01T00:00:00.000Z'),
        value: 12000,
      }),
    ).resolves.toBe('doc-created')

    await harness.updatePhysicalAsset('asset-1', {
      name: 'Coche híbrido',
      type: 'vehicle',
      value: 13500,
    })

    await harness.deletePhysicalAsset('asset-1')

    const assets = await harness.listPhysicalAssets()

    expect(harness.addDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'assets' }),
      expect.objectContaining({
        uid: 'user-1',
        name: 'Coche',
        type: 'vehicle',
        value: 12000,
      }),
    )
    expect(harness.updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'assets/asset-1' }),
      expect.objectContaining({
        name: 'Coche híbrido',
        type: 'vehicle',
        value: 13500,
      }),
    )
    expect(harness.deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'assets/asset-1' }))
    expect(assets).toEqual([
      {
        id: 'asset-2',
        uid: 'user-1',
        name: 'Piso',
        type: 'property',
        value: 250000,
      },
    ])
  })

  it('creates, updates, deletes and lists maintenance entries', async () => {
    const harness = await createHarness({
      maintenanceDocs: [
        makeDoc('maint-1', {
          uid: 'user-1',
          assetId: 'asset-1',
          kind: 'itv',
          scheduledFor: '2026-05-01',
        }),
      ],
    })

    await expect(
      harness.createMaintenanceEntry('asset-1', {
        kind: 'repair',
        scheduledFor: new Date('2026-04-20T00:00:00.000Z'),
        notes: 'Cambio de aceite',
      }),
    ).resolves.toBe('doc-created')

    await harness.updateMaintenanceEntry('maint-1', {
      kind: 'review',
      notes: 'Revisión anual',
    })

    await harness.deleteMaintenanceEntry('maint-1')

    const entries = await harness.listMaintenanceEntries('asset-1')

    expect(harness.addDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'asset_maintenance' }),
      expect.objectContaining({
        uid: 'user-1',
        assetId: 'asset-1',
        kind: 'repair',
        notes: 'Cambio de aceite',
      }),
    )
    expect(harness.updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'asset_maintenance/maint-1' }),
      expect.objectContaining({
        kind: 'review',
        notes: 'Revisión anual',
      }),
    )
    expect(harness.deleteDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'asset_maintenance/maint-1' }),
    )
    expect(entries).toEqual([
      {
        id: 'maint-1',
        uid: 'user-1',
        assetId: 'asset-1',
        kind: 'itv',
        scheduledFor: '2026-05-01',
      },
    ])
  })

  it('uploads vault documents with encrypted metadata and deletes them cleanly', async () => {
    const harness = await createHarness()
    const file = new Blob(['pdf-binary'], { type: 'application/pdf' })

    const result = await harness.uploadVaultDocument(
      {
        fileName: 'factura.pdf',
        category: 'factura',
        assetId: 'asset-1',
        mimeType: 'application/pdf',
      },
      file,
    )

    const uploadCall = harness.uploadBytesResumable.mock.calls[0]

    expect(uploadCall[0]).toEqual(expect.objectContaining({ fullPath: 'vault/user-1/factura.pdf' }))
    expect(uploadCall[1]).toBe(file)
    expect(uploadCall[2]).toEqual({
      contentType: 'application/pdf',
      customMetadata: {
        uid: 'user-1',
        encrypted: 'true',
        assetId: 'asset-1',
        category: 'factura',
      },
    })
    expect(harness.addDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'vault_documents' }),
      expect.objectContaining({
        uid: 'user-1',
        assetId: 'asset-1',
        category: 'factura',
        fileName: 'factura.pdf',
        mimeType: 'application/pdf',
        storagePath: 'vault/user-1/factura.pdf',
        encrypted: true,
      }),
    )
    expect(result).toEqual({
      id: 'doc-created',
      storagePath: 'vault/user-1/factura.pdf',
      downloadUrl: 'https://cdn.example/vault/user-1/factura.pdf',
    })

    await harness.deleteVaultDocument('vault-doc-1', result.storagePath)

    expect(harness.deleteObject).toHaveBeenCalledWith(
      expect.objectContaining({ fullPath: 'vault/user-1/factura.pdf' }),
    )
    expect(harness.deleteDoc).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'vault_documents/vault-doc-1' }),
    )
  })
})
