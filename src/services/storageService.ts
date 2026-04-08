import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage'

import { auth, storage } from './firebase'

export interface UploadResult {
  url: string
  path: string
}

function getCurrentUid(): string {
  const uid = auth.currentUser?.uid
  if (!uid) {
    throw new Error('Usuario no autenticado')
  }
  return uid
}

function sanitizeFileName(fileName: string): string {
  return fileName
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
}

function uploadBlobToStorage(
  path: string,
  blob: Blob,
  metadata: { contentType: string; customMetadata: Record<string, string> },
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  const storageRef = ref(storage, path)

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, blob, metadata)

    task.on(
      'state_changed',
      (snapshot) => {
        const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
        onProgress?.(percent)
      },
      reject,
      () => {
        getDownloadURL(task.snapshot.ref).then((url) => {
          resolve({ url, path })
        }, reject)
      },
    )
  })
}

/**
 * Uploads a compressed ticket image to Firebase Storage.
 * Path: tickets/{uid}/{timestamp}.webp
 */
export function uploadTicketImage(
  blob: Blob,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  const uid = getCurrentUid()
  const timestamp = Date.now()
  const path = `tickets/${uid}/${String(timestamp)}.webp`

  return uploadBlobToStorage(
    path,
    blob,
    {
      contentType: 'image/webp',
      customMetadata: {
        uid,
        uploadedAt: new Date().toISOString(),
        source: 'scan',
      },
    },
    onProgress,
  )
}

export function uploadAssetPhoto(
  blob: Blob,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  const uid = getCurrentUid()
  const maybeFile = blob as File & { name?: string }
  const originalName = typeof maybeFile.name === 'string' && maybeFile.name.length > 0
    ? maybeFile.name
    : 'asset-photo.jpg'
  const safeName = `${String(Date.now())}-${sanitizeFileName(originalName)}`
  const path = `asset-photos/${uid}/${safeName}`
  const contentType = blob.type || maybeFile.type || 'image/jpeg'

  return uploadBlobToStorage(
    path,
    blob,
    {
      contentType,
      customMetadata: {
        uid,
        uploadedAt: new Date().toISOString(),
        source: 'asset',
      },
    },
    onProgress,
  )
}
