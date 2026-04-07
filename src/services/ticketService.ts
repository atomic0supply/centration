import { addDoc, collection, serverTimestamp } from 'firebase/firestore'

import type { ExtractedTicket } from '@/types/ticket'

import { auth, db } from './firebase'

/* ── Save confirmed ticket to Firestore ── */
export async function saveTicket(ticket: ExtractedTicket): Promise<string> {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Usuario no autenticado')

  const ref = collection(db, 'users', uid, 'tickets')
  const docRef = await addDoc(ref, {
    ...ticket,
    uid,
    savedAt: serverTimestamp(),
  })

  return docRef.id
}

/* ── Mock AI extraction (placeholder until Gemini integration) ── */
export async function mockExtractTicket(imageUrl: string): Promise<ExtractedTicket> {
  // Simulate network + AI latency
  await new Promise((r) => setTimeout(r, 2200))

  return {
    store: 'Mercadona',
    date: new Date().toISOString().split('T')[0],
    total: 22.5,
    currency: 'EUR',
    category: 'alimentacion',
    confidence: 0.92,
    origin: 'ai',
    imageUrl,
    items: [
      { id: '1', name: 'Leche entera 1L', quantity: 2, unitPrice: 0.89, total: 1.78, origin: 'ai' },
      { id: '2', name: 'Pan de molde integral', quantity: 1, unitPrice: 1.45, total: 1.45, origin: 'ai' },
      { id: '3', name: 'Tomates rama 500g', quantity: 1, unitPrice: 1.2, total: 1.2, origin: 'ai' },
      { id: '4', name: 'Yogur natural pack x4', quantity: 2, unitPrice: 1.05, total: 2.1, origin: 'ai' },
      { id: '5', name: 'Pechuga de pollo 500g', quantity: 1, unitPrice: 3.8, total: 3.8, origin: 'ai' },
      { id: '6', name: 'Aceite oliva 1L', quantity: 1, unitPrice: 5.49, total: 5.49, origin: 'ai' },
      { id: '7', name: 'Pasta espaguetis 500g', quantity: 2, unitPrice: 0.79, total: 1.58, origin: 'ai' },
      { id: '8', name: 'Papel higiénico 12u', quantity: 1, unitPrice: 5.1, total: 5.1, origin: 'ai' },
    ],
  }
}
