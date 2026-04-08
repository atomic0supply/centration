import type { Timestamp } from 'firebase/firestore'

/**
 * Format a number as currency (EUR by default).
 */
export function formatCurrency(amount: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Format a Firestore Timestamp or Date to a locale string.
 */
export function formatDate(
  date: Timestamp | Date | string,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' },
): string {
  const d = toDate(date)
  return d.toLocaleDateString('es-ES', options)
}

/**
 * Format a Firestore Timestamp or Date to a short date string (DD/MM/YYYY).
 */
export function formatShortDate(date: Timestamp | Date | string): string {
  const d = toDate(date)
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Format relative time ("hace 2 horas", "ayer", etc.)
 */
export function formatRelativeDate(date: Timestamp | Date | string): string {
  const d = toDate(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 30) return formatDate(d)
  if (days > 1) return `hace ${days} días`
  if (days === 1) return 'ayer'
  if (hours > 1) return `hace ${hours}h`
  if (minutes > 1) return `hace ${minutes}min`
  return 'ahora'
}

/**
 * Days until a future date (negative if past).
 */
export function daysUntil(date: Timestamp | Date | string): number {
  const d = toDate(date)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Convert Firestore Timestamp, Date, or ISO string to a JS Date.
 */
export function toDate(date: Timestamp | Date | string): Date {
  if (date instanceof Date) return date
  if (typeof date === 'string') return new Date(date)
  if (typeof date === 'object' && 'toDate' in date) return date.toDate()
  return new Date()
}

/**
 * Get YYYY-MM-DD from a Timestamp or Date.
 */
export function toISODateString(date: Timestamp | Date | string): string {
  const d = toDate(date)
  return d.toISOString().split('T')[0]
}

/**
 * Get month name from a month index (0–11).
 */
export function monthName(month: number): string {
  const names = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return names[month] ?? ''
}
