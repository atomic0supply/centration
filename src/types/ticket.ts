export type DataOrigin = 'ai' | 'manual' | 'scanned'

export type TicketCategory =
  | 'alimentacion'
  | 'transporte'
  | 'salud'
  | 'hogar'
  | 'entretenimiento'
  | 'ropa'
  | 'otros'

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  alimentacion: 'Alimentación',
  transporte: 'Transporte',
  salud: 'Salud',
  hogar: 'Hogar',
  entretenimiento: 'Entretenimiento',
  ropa: 'Ropa',
  otros: 'Otros',
}

export const CATEGORY_EMOJIS: Record<TicketCategory, string> = {
  alimentacion: '🛒',
  transporte: '🚗',
  salud: '💊',
  hogar: '🏠',
  entretenimiento: '🎬',
  ropa: '👗',
  otros: '📦',
}

export interface TicketItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
  total: number
  origin: DataOrigin
}

export interface ExtractedTicket {
  store: string
  date: string          // YYYY-MM-DD
  total: number
  currency: string
  category: TicketCategory
  items: TicketItem[]
  notes?: string
  confidence: number    // 0–1, AI confidence score
  origin: DataOrigin
  imageUrl?: string
  imagePath?: string
}
