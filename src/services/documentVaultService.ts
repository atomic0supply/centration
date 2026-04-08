import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  type Unsubscribe,
  where,
} from 'firebase/firestore'
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage'

import type { VaultDocument, VaultDocumentCategory } from '@/types/assets'

import { auth, db, storage } from './firebase'
import { isMissingIndexError, requireAuthenticatedUid, toTimestampOrNull } from './firestoreUtils'

const COLLECTION = 'vault_documents'
const VAULT_FOLDER = 'vault'

export interface VaultDocumentFilters {
  assetId?: string | null
  category?: VaultDocumentCategory | 'all'
}

export interface UploadVaultDocumentInput {
  title: string
  category: VaultDocumentCategory
  assetId?: string | null
  onProgress?: (percent: number) => void
}

export interface UploadVaultDocumentResult {
  id: string
  url: string
  path: string
}

function sanitizeFileName(fileName: string): string {
  const normalized = fileName
    .trim()
    .replace(/\s+/g, '_')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '')

  return normalized || 'archivo'
}

function storageFileName(file: File | Blob, fallbackExtension: string): string {
  const maybeFile = file as File & { name?: string }
  const extension = fallbackExtension.startsWith('.') ? fallbackExtension : `.${fallbackExtension}`
  const originalName = typeof maybeFile.name === 'string' && maybeFile.name.length > 0
    ? maybeFile.name
    : `documento${extension}`
  const sanitized = sanitizeFileName(originalName)

  return `${String(Date.now())}-${sanitized}`
}

function vaultDocumentFromDoc(docSnap: { id: string; data: () => Record<string, unknown> }): VaultDocument {
  const d = docSnap.data()

  return {
    id: docSnap.id,
    uid: typeof d.uid === 'string' ? d.uid : '',
    assetId: typeof d.assetId === 'string' ? d.assetId : null,
    title: typeof d.title === 'string' ? d.title : 'Documento',
    category: (d.category as VaultDocumentCategory | undefined) ?? 'otro',
    storagePath: typeof d.storagePath === 'string' ? d.storagePath : '',
    downloadUrl: typeof d.downloadUrl === 'string' ? d.downloadUrl : '',
    mimeType: typeof d.mimeType === 'string' ? d.mimeType : 'application/octet-stream',
    sizeBytes: typeof d.sizeBytes === 'number' ? d.sizeBytes : 0,
    encrypted: true,
    uploadedAt: toTimestampOrNull(d.uploadedAt) ?? Timestamp.now(),
    createdAt: toTimestampOrNull(d.createdAt) ?? Timestamp.now(),
  }
}

function sortByCreatedAtDesc(a: VaultDocument, b: VaultDocument): number {
  return b.createdAt.toMillis() - a.createdAt.toMillis()
}

export function subscribeVaultDocuments(
  callback: (documents: VaultDocument[]) => void,
  onError?: (error: Error) => void,
  filters?: VaultDocumentFilters,
): Unsubscribe {
  const uid = auth.currentUser?.uid
  if (!uid) {
    callback([])
    return () => undefined
  }

  const assetIdFilter = filters?.assetId
  const categoryFilter = filters?.category
  const hasAssetFilter = typeof assetIdFilter === 'string' && assetIdFilter.length > 0
  const hasCategoryFilter = typeof categoryFilter === 'string' && categoryFilter !== 'all'
  const baseQuery = query(collection(db, COLLECTION), where('uid', '==', uid))
  const liveQuery = query(
    collection(db, COLLECTION),
    where('uid', '==', uid),
    ...(hasAssetFilter ? [where('assetId', '==', assetIdFilter)] : []),
    ...(hasCategoryFilter ? [where('category', '==', categoryFilter)] : []),
    orderBy('createdAt', 'desc'),
  )

  let fallbackUnsub: Unsubscribe | null = null

  const orderedUnsub = onSnapshot(
    liveQuery,
    (snap) => {
      const documents = snap.docs.map((d) =>
        vaultDocumentFromDoc(d as unknown as { id: string; data: () => Record<string, unknown> }),
      )
      callback(documents)
    },
    (err) => {
      if (isMissingIndexError(err) && !fallbackUnsub) {
        console.warn('[documentVaultService] Missing index, falling back to client-side sort.')
        fallbackUnsub = onSnapshot(
          baseQuery,
          (fallbackSnap) => {
            const documents = fallbackSnap.docs
              .map((d) =>
                vaultDocumentFromDoc(d as unknown as { id: string; data: () => Record<string, unknown> }),
              )
              .filter((document) => {
                const assetMatches = !hasAssetFilter || document.assetId === assetIdFilter
                const categoryMatches = !hasCategoryFilter || document.category === categoryFilter
                return assetMatches && categoryMatches
              })
              .sort(sortByCreatedAtDesc)
            callback(documents)
          },
          (fallbackErr) => {
            console.error('[documentVaultService] fallback error:', fallbackErr)
            onError?.(fallbackErr)
          },
        )
        return
      }

      console.error('[documentVaultService] onSnapshot error:', err)
      onError?.(err)
    },
  )

  return () => {
    orderedUnsub()
    fallbackUnsub?.()
  }
}

export async function uploadVaultDocument(
  file: File | Blob,
  input: UploadVaultDocumentInput,
): Promise<UploadVaultDocumentResult> {
  const uid = requireAuthenticatedUid(auth.currentUser?.uid)
  const maybeFile = file as File & { name?: string }
  const mimeType = file.type || maybeFile.type || 'application/octet-stream'
  const extension = mimeType === 'application/pdf'
    ? '.pdf'
    : mimeType.startsWith('image/')
      ? `.${mimeType.split('/')[1] ?? 'bin'}`
      : '.bin'
  const fileName = storageFileName(file, extension)
  const storagePath = `${VAULT_FOLDER}/${uid}/${fileName}`
  const storageRef = ref(storage, storagePath)

  const metadata = {
    contentType: mimeType,
    customMetadata: {
      uid,
      title: input.title.trim(),
      category: input.category,
      assetId: input.assetId ?? '',
      uploadedAt: new Date().toISOString(),
      encrypted: 'true',
      source: 'vault',
    },
  }

  const uploadResult = await new Promise<{ path: string; url: string }>((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, metadata)

    task.on(
      'state_changed',
      (snapshot) => {
        const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
        input.onProgress?.(percent)
      },
      reject,
      () => {
        getDownloadURL(task.snapshot.ref).then(
          (url) => {
            resolve({ path: storagePath, url })
          },
          reject,
        )
      },
    )
  })

  const refDoc = await addDoc(collection(db, COLLECTION), {
    uid,
    assetId: input.assetId ?? null,
    title: input.title.trim(),
    category: input.category,
    storagePath: uploadResult.path,
    downloadUrl: uploadResult.url,
    mimeType,
    sizeBytes: typeof (file as Blob).size === 'number' ? (file as Blob).size : 0,
    encrypted: true,
    uploadedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  })

  return {
    id: refDoc.id,
    url: uploadResult.url,
    path: uploadResult.path,
  }
}

export async function deleteVaultDocument(documentId: string): Promise<void> {
  requireAuthenticatedUid(auth.currentUser?.uid)

  const docRef = doc(db, COLLECTION, documentId)
  const snap = await getDoc(docRef)
  if (snap.exists()) {
    const data = snap.data() as Record<string, unknown>
    const storagePath = typeof data.storagePath === 'string' ? data.storagePath : ''
    if (storagePath) {
      await deleteObject(ref(storage, storagePath))
    }
  }

  await deleteDoc(docRef)
}
