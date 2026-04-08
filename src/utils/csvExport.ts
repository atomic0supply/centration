import type { Expense } from '@/types/expense'
import { EXPENSE_CATEGORY_LABELS } from '@/types/expense'
import { toDate, formatCurrency } from '@/utils/formatters'

/**
 * Exports an array of expenses to a CSV file and triggers a download.
 */
export function exportExpensesToCSV(expenses: Expense[], filename?: string): void {
  const headers = [
    'Fecha',
    'Proveedor',
    'Categoría',
    'Importe',
    'Moneda',
    'Items',
    'Origen',
    'Notas',
  ]

  const rows = expenses.map((e) => [
    toDate(e.date).toISOString().split('T')[0],
    escapeCsvField(e.provider),
    EXPENSE_CATEGORY_LABELS[e.category] ?? e.category,
    e.amount.toFixed(2),
    e.currency,
    escapeCsvField(e.items.map((i) => `${i.name} x${i.qty} (${formatCurrency(i.price)})`).join('; ')),
    e.dataOrigin,
    escapeCsvField(e.notes),
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.join(',')),
  ].join('\n')

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const defaultFilename = `gastos_${new Date().toISOString().split('T')[0]}.csv`
  const link = document.createElement('a')
  link.href = url
  link.download = filename ?? defaultFilename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
