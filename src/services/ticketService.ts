import { getFunctions, httpsCallable } from 'firebase/functions'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

import type { ExtractedTicket, TicketCategory } from '@/types/ticket'

import { auth, db, app } from './firebase'

/* ── Mapeos de categorías entre Backend e UI ── */
const categoryMapToEs: Record<string, TicketCategory> = {
  food: 'alimentacion',
  tech: 'otros', // No existe en UI
  health: 'salud',
  leisure: 'entretenimiento',
  transport: 'transporte',
  home: 'hogar',
  other: 'otros'
}

const categoryMapToEn: Record<TicketCategory, string> = {
  alimentacion: 'food',
  transporte: 'transport',
  salud: 'health',
  hogar: 'home',
  entretenimiento: 'leisure',
  ropa: 'other',
  otros: 'other'
}

function getCallableErrorMessage(err: unknown): string {
  const e = err as { code?: string; message?: string; details?: unknown }
  const detailMessage =
    typeof e.details === 'string'
      ? e.details
      : typeof e.details === 'object' &&
          e.details !== null &&
          'message' in e.details &&
          typeof (e.details as { message?: unknown }).message === 'string'
        ? ((e.details as { message: string }).message)
        : null

  const code = typeof e.code === 'string' ? e.code : 'functions/internal'
  const message =
    detailMessage ??
    (typeof e.message === 'string' && e.message.length > 0
      ? e.message
      : 'Error interno en extractTicket')

  return `Análisis falló (${code}): ${message}`
}

/* ── Extraer ticket con IA real (Sincrónico) ── */
export async function analyzeTicketReal(storagePath: string, imageUrl: string): Promise<ExtractedTicket> {
  const functions = getFunctions(app, 'europe-west1')
  const extractTicketOnCall = httpsCallable(functions, 'extractTicket')

  let resultData: any
  try {
    const response = await extractTicketOnCall({ path: storagePath })
    resultData = response.data
  } catch (err: unknown) {
    throw new Error(getCallableErrorMessage(err))
  }

  if (!resultData?.ok || !resultData?.data) {
    throw new Error('Error de la IA al analizar el ticket')
  }
  
  const data = resultData.data
  return {
    store: data.provider || 'Desconocido',
    date: data.date || new Date().toISOString().split('T')[0],
    total: data.total || 0,
    currency: 'EUR',
    category: categoryMapToEs[data.category] || 'otros',
    confidence: data.confidence || 0,
    origin: 'ai',
    imageUrl,
    imagePath: storagePath,
    items: (data.items || []).map((i: any, index: number) => ({
      id: String(index),
      name: i.name,
      quantity: i.qty || 1,
      unitPrice: i.price || 0,
      total: (i.qty || 1) * (i.price || 0),
      origin: 'ai'
    })),
  }
}

/* ── Guardar ticket validado ── */
export async function saveTicket(ticket: ExtractedTicket): Promise<string> {
  const uid = auth.currentUser?.uid
  if (!uid) throw new Error('Usuario no autenticado')

  const functions = getFunctions(app, 'europe-west1')
  const confirmTicketOnCall = httpsCallable(functions, 'confirmTicket')
  
  const extraction = {
     provider: ticket.store,
     date: ticket.date,
     total: ticket.total,
     category: categoryMapToEn[ticket.category] || 'other',
     confidence: ticket.confidence || 1.0,
     items: ticket.items.map(i => ({
        name: i.name,
        qty: i.quantity,
        price: i.unitPrice,
        unit: 'ud'
     }))
  }

  // Confirm and create expense & inventory via Backend
  const res = await confirmTicketOnCall({ extraction, sourcePath: ticket.imagePath })
  const resData = res.data as any
  if (!resData.ok) throw new Error('Error detectado al guardar el ticket')
    
  // Guardamos también una copia simple en la subcolección de este usuario (opcional, por si la UI lo necesita).
  // Ya que solucionamos antes los problemas de permisos para esta ruta.
  const ref = collection(db, 'users', uid, 'tickets')
  await addDoc(ref, {
    ...ticket,
    uid,
    savedAt: serverTimestamp(),
  })
  
  return resData.expenseId
}
