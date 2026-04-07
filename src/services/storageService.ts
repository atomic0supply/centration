import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage'

import { auth, storage } from './firebase'

export interface UploadResult {
  url: string
  path: string
}

/**
 * Uploads a compressed ticket image to Firebase Storage.
 * Path: tickets/{uid}/{timestamp}.webp
 */
export function uploadTicketImage(
  blob: Blob,
  onProgress?: (percent: number) => void,
): Promise<UploadResult> {
  const uid = auth.currentUser?.uid
  if (!uid) return Promise.reject(new Error('Usuario no autenticado'))

  const timestamp = Date.now()
  const path = `tickets/${uid}/${timestamp}.webp`
  const storageRef = ref(storage, path)

  const metadata = {
    contentType: 'image/webp',
    customMetadata: {
      uid,
      uploadedAt: new Date().toISOString(),
      source: 'scan',
    },
  }

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, blob, metadata)

    task.on(
      'state_changed',
      (snapshot) => {
        const percent = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100,
        )
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
