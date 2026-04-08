import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { CategoryChip } from '@/components/domain/expenses/CategoryChip'
import { Button, Skeleton } from '@/components/ui'
import { useExpensesStore } from '@/stores/expensesStore'
import {
  EXPENSE_CATEGORY_COLORS,
  EXPENSE_CATEGORY_EMOJIS,
} from '@/types/expense'
import { formatCurrency, formatDate, formatRelativeDate } from '@/utils/formatters'

import styles from './ExpenseDetail.module.css'

export function ExpenseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const initExpenses = useExpensesStore((s) => s.init)
  const expenses = useExpensesStore((s) => s.expenses)
  const loading = useExpensesStore((s) => s.loading)

  useEffect(() => {
    const unsub = initExpenses()
    return unsub
  }, [initExpenses])

  const expense = useMemo(() => expenses.find((e) => e.id === id), [expenses, id])

  if (loading) {
    return (
      <div className={styles.page}>
        <Skeleton style={{ width: 80, height: 32, borderRadius: 'var(--radius-sm)' }} />
        <Skeleton style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />
        <Skeleton style={{ height: 300, borderRadius: 'var(--radius-lg)' }} />
      </div>
    )
  }

  if (!expense) {
    return (
      <div className={styles.page}>
        <button className={styles.backBtn} onClick={() => navigate('/ledger')} type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Volver al Ledger
        </button>
        <div style={{ textAlign: 'center', padding: 'var(--space-16)', color: 'var(--text-muted)' }}>
          Gasto no encontrado
        </div>
      </div>
    )
  }

  const color = EXPENSE_CATEGORY_COLORS[expense.category]

  return (
    <div className={styles.page}>
      <button className={styles.backBtn} onClick={() => navigate('/ledger')} type="button">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Volver al Ledger
      </button>

      <div className={styles.mainCard}>
        <div className={styles.cardHeader}>
          <div className={styles.categoryBadge} style={{ background: `${color}18`, color }}>
            {EXPENSE_CATEGORY_EMOJIS[expense.category]}
          </div>
          <div className={styles.headerInfo}>
            <div className={styles.provider}>
              {expense.provider}
            </div>
            <div className={styles.dateLine}>
              {formatDate(expense.date)} · {formatRelativeDate(expense.date)}
            </div>
          </div>
          <div className={styles.totalAmount}>
            -{formatCurrency(expense.amount, expense.currency)}
          </div>
        </div>

        <div className={styles.cardBody}>
          {/* Items */}
          {expense.items.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>
                Desglose ({expense.items.length} items)
              </div>
              <table className={styles.itemsTable}>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cant.</th>
                    <th>Precio</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {expense.items.map((item, i) => (
                    <tr key={i}>
                      <td>{item.name}</td>
                      <td className={styles.monoCell}>{item.qty} {item.unit ?? ''}</td>
                      <td className={styles.monoCell}>{formatCurrency(item.price)}</td>
                      <td className={styles.monoCell}>{formatCurrency(item.qty * item.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Meta info */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Información</div>
            <div className={styles.metaGrid}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Categoría</span>
                <span className={styles.metaValue}>
                  <CategoryChip category={expense.category} active size="sm" />
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Origen del dato</span>
                <span className={styles.metaValue}>
                  {expense.dataOrigin === 'camera' ? '📷 Escaneado' : expense.dataOrigin === 'ai' ? '🤖 IA' : '✏️ Manual'}
                </span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Moneda</span>
                <span className={styles.metaValue}>{expense.currency}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Registrado</span>
                <span className={styles.metaValue}>{formatDate(expense.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {expense.notes && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Notas</div>
              <div className={styles.notes}>{expense.notes}</div>
            </div>
          )}

          {/* Actions */}
          <div className={styles.section}>
            <div className={styles.actions}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/ledger')}
              >
                Volver
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
