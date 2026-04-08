import { useCallback, useEffect, useState } from 'react'

import { BudgetOverview } from '@/components/domain/budget'
import { ExpenseCard, ExpenseCharts, ExpenseFilters, ExpenseForm, type ExpenseFormData } from '@/components/domain/expenses'
import { ChargeCalendar, SubscriptionCard, SubscriptionForm, type SubscriptionFormData } from '@/components/domain/subscriptions'
import { Button, Modal, Skeleton } from '@/components/ui'
import { createExpense, deleteExpense, updateExpense } from '@/services/expenseService'
import { createSubscription, deleteSubscription, updateSubscription } from '@/services/subscriptionService'
import { useBudgetStore } from '@/stores/budgetStore'
import { useExpensesStore } from '@/stores/expensesStore'
import { useSubscriptionsStore } from '@/stores/subscriptionsStore'
import type { Expense, Subscription } from '@/types/expense'
import { exportExpensesToCSV } from '@/utils/csvExport'
import { formatCurrency } from '@/utils/formatters'

import styles from './Ledger.module.css'

type Tab = 'expenses' | 'subscriptions'

export function Ledger() {
  const [tab, setTab] = useState<Tab>('expenses')
  const [showCharts, setShowCharts] = useState(true)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showSubModal, setShowSubModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [editingSub, setEditingSub] = useState<Subscription | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'expense' | 'subscription'; id: string; name: string } | null>(null)

  // Initialize stores
  const initExpenses = useExpensesStore((s) => s.init)
  const initSubs = useSubscriptionsStore((s) => s.init)
  const initBudget = useBudgetStore((s) => s.init)

  useEffect(() => {
    const unsubExpenses = initExpenses()
    const unsubSubs = initSubs()
    const unsubBudget = initBudget()
    return () => {
      unsubExpenses()
      unsubSubs()
      unsubBudget()
    }
  }, [initExpenses, initSubs, initBudget])

  // Expenses state
  const expenses = useExpensesStore((s) => s.expenses)
  const loadingExpenses = useExpensesStore((s) => s.loading)
  const filters = useExpensesStore((s) => s.filters)
  const setFilters = useExpensesStore((s) => s.setFilters)
  const resetFilters = useExpensesStore((s) => s.resetFilters)
  const filteredExpenses = useExpensesStore((s) => s.filteredExpenses)
  const totalThisMonth = useExpensesStore((s) => s.totalThisMonth)
  const uniqueProviders = useExpensesStore((s) => s.uniqueProviders)

  // Subscriptions state
  const subscriptions = useSubscriptionsStore((s) => s.subscriptions)
  const loadingSubs = useSubscriptionsStore((s) => s.loading)
  const activeSubscriptions = useSubscriptionsStore((s) => s.activeSubscriptions)
  const totalMonthlyCost = useSubscriptionsStore((s) => s.totalMonthlyCost)
  const totalYearlyCost = useSubscriptionsStore((s) => s.totalYearlyCost)

  const filtered = filteredExpenses()

  // Expense CRUD handlers
  const handleExpenseSubmit = useCallback(async (data: ExpenseFormData) => {
    setSaving(true)
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, data)
      } else {
        await createExpense(data)
      }
      setShowExpenseModal(false)
      setEditingExpense(null)
    } catch (err) {
      console.error('Error saving expense:', err)
    } finally {
      setSaving(false)
    }
  }, [editingExpense])

  const handleEditExpense = useCallback((expense: Expense) => {
    setEditingExpense(expense)
    setShowExpenseModal(true)
  }, [])

  // Subscription CRUD handlers
  const handleSubSubmit = useCallback(async (data: SubscriptionFormData) => {
    setSaving(true)
    try {
      if (editingSub) {
        await updateSubscription(editingSub.id, data)
      } else {
        await createSubscription(data)
      }
      setShowSubModal(false)
      setEditingSub(null)
    } catch (err) {
      console.error('Error saving subscription:', err)
    } finally {
      setSaving(false)
    }
  }, [editingSub])

  const handleEditSub = useCallback((sub: Subscription) => {
    setEditingSub(sub)
    setShowSubModal(true)
  }, [])

  // Delete handler
  const handleDelete = useCallback(async () => {
    if (!deleteConfirm) return
    setSaving(true)
    try {
      if (deleteConfirm.type === 'expense') {
        await deleteExpense(deleteConfirm.id)
      } else {
        await deleteSubscription(deleteConfirm.id)
      }
      setDeleteConfirm(null)
    } catch (err) {
      console.error('Error deleting:', err)
    } finally {
      setSaving(false)
    }
  }, [deleteConfirm])

  const loading = tab === 'expenses' ? loadingExpenses : loadingSubs

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1>Ledger</h1>
          <p>Control de gastos y suscripciones</p>
        </div>
        <div className={styles.headerActions}>
          {tab === 'expenses' && (
            <>
              <button
                className={`${styles.chartsToggle} ${showCharts ? styles.active : ''}`}
                onClick={() => setShowCharts(!showCharts)}
                type="button"
                title="Mostrar gráficos"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
                Gráficos
              </button>
              <button
                className={styles.iconBtn}
                onClick={() => exportExpensesToCSV(filtered)}
                title="Exportar CSV"
                type="button"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </button>
            </>
          )}
          <Button
            size="sm"
            onClick={() => {
              if (tab === 'expenses') {
                setEditingExpense(null)
                setShowExpenseModal(true)
              } else {
                setEditingSub(null)
                setShowSubModal(true)
              }
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ marginRight: 4 }}>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {tab === 'expenses' ? 'Nuevo gasto' : 'Nueva suscripción'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'expenses' ? styles.active : ''}`}
          onClick={() => setTab('expenses')}
          type="button"
        >
          💸 Gastos
          <span className={styles.tabBadge}>{expenses.length}</span>
        </button>
        <button
          className={`${styles.tab} ${tab === 'subscriptions' ? styles.active : ''}`}
          onClick={() => setTab('subscriptions')}
          type="button"
        >
          🔄 Suscripciones
          <span className={styles.tabBadge}>{activeSubscriptions().length}</span>
        </button>
      </div>

      {/* ────── EXPENSES TAB ────── */}
      {tab === 'expenses' && (
        <>
          {/* Summary row */}
          <div className={styles.summaryRow}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryLabel}>Gastos este mes</div>
              <div className={`${styles.summaryValue} ${styles.summaryValueAccent}`}>
                {formatCurrency(totalThisMonth())}
              </div>
              <div className={styles.summarySub}>{filtered.length} transacciones</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryLabel}>Total mostrado</div>
              <div className={styles.summaryValue}>
                {formatCurrency(filtered.reduce((s, e) => s + e.amount, 0))}
              </div>
              <div className={styles.summarySub}>{filtered.length} gastos</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryLabel}>Ticket promedio</div>
              <div className={styles.summaryValue}>
                {filtered.length > 0
                  ? formatCurrency(filtered.reduce((s, e) => s + e.amount, 0) / filtered.length)
                  : '—'
                }
              </div>
              <div className={styles.summarySub}>Media por gasto</div>
            </div>
          </div>

          {/* Budget overview */}
          <BudgetOverview />

          {/* Charts */}
          {showCharts && expenses.length > 0 && (
            <ExpenseCharts expenses={expenses} />
          )}

          {/* Filters */}
          <ExpenseFilters
            filters={filters}
            onFilterChange={setFilters}
            onReset={resetFilters}
            providers={uniqueProviders()}
          />

          {/* Expense list */}
          {loading ? (
            <div className={styles.expenseList}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} style={{ height: 68, borderRadius: 'var(--radius-lg)' }} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>📒</div>
              <div className={styles.emptyTitle}>Sin gastos</div>
              <div className={styles.emptyDesc}>
                Los gastos aparecerán aquí al escanear tickets o registrarlos manualmente.
              </div>
              <Button
                onClick={() => {
                  setEditingExpense(null)
                  setShowExpenseModal(true)
                }}
              >
                Registrar gasto manual
              </Button>
            </div>
          ) : (
            <div className={styles.expenseList}>
              <div className={styles.listHeader}>
                <span className={styles.listCount}>
                  {filtered.length} {filtered.length === 1 ? 'gasto' : 'gastos'}
                </span>
              </div>
              {filtered.map((e) => (
                <ExpenseCard key={e.id} expense={e} onClick={handleEditExpense} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ────── SUBSCRIPTIONS TAB ────── */}
      {tab === 'subscriptions' && (
        <>
          {/* Stats */}
          <div className={styles.summaryRow}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryLabel}>Coste mensual</div>
              <div className={`${styles.summaryValue} ${styles.summaryValueAccent}`}>
                {formatCurrency(totalMonthlyCost())}
              </div>
              <div className={styles.summarySub}>{activeSubscriptions().length} activas</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryLabel}>Coste anual</div>
              <div className={styles.summaryValue}>
                {formatCurrency(totalYearlyCost())}
              </div>
              <div className={styles.summarySub}>Proyección 12 meses</div>
            </div>
            <div className={styles.summaryCard}>
              <div className={styles.summaryLabel}>Total suscripciones</div>
              <div className={styles.summaryValue}>{subscriptions.length}</div>
              <div className={styles.summarySub}>
                {subscriptions.filter((s) => s.status === 'cancelled').length} canceladas
              </div>
            </div>
          </div>

          {/* Charge Calendar */}
          {activeSubscriptions().length > 0 && (
            <ChargeCalendar subscriptions={subscriptions} />
          )}

          {/* Subscription list */}
          {loadingSubs ? (
            <div className={styles.subsList}>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} style={{ height: 72, borderRadius: 'var(--radius-lg)' }} />
              ))}
            </div>
          ) : subscriptions.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🔄</div>
              <div className={styles.emptyTitle}>Sin suscripciones</div>
              <div className={styles.emptyDesc}>
                Registra tus suscripciones para controlar los cobros recurrentes.
              </div>
              <Button
                onClick={() => {
                  setEditingSub(null)
                  setShowSubModal(true)
                }}
              >
                Añadir suscripción
              </Button>
            </div>
          ) : (
            <div className={styles.subsList}>
              <div className={styles.subsHeader}>
                <span className={styles.listCount}>
                  {subscriptions.length} {subscriptions.length === 1 ? 'suscripción' : 'suscripciones'}
                </span>
              </div>
              {subscriptions.map((sub) => (
                <SubscriptionCard key={sub.id} subscription={sub} onClick={handleEditSub} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ────── MODALS ────── */}

      {/* Expense Modal */}
      <Modal
        open={showExpenseModal}
        onClose={() => { setShowExpenseModal(false); setEditingExpense(null) }}
        title={editingExpense ? 'Editar gasto' : 'Nuevo gasto manual'}
        maxWidth={540}
      >
        <ExpenseForm
          expense={editingExpense}
          onSubmit={handleExpenseSubmit}
          onCancel={() => { setShowExpenseModal(false); setEditingExpense(null) }}
          loading={saving}
        />
        {editingExpense && (
          <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setDeleteConfirm({ type: 'expense', id: editingExpense.id, name: editingExpense.provider })}
            >
              Eliminar gasto
            </Button>
          </div>
        )}
      </Modal>

      {/* Subscription Modal */}
      <Modal
        open={showSubModal}
        onClose={() => { setShowSubModal(false); setEditingSub(null) }}
        title={editingSub ? 'Editar suscripción' : 'Nueva suscripción'}
        maxWidth={480}
      >
        <SubscriptionForm
          subscription={editingSub}
          onSubmit={handleSubSubmit}
          onCancel={() => { setShowSubModal(false); setEditingSub(null) }}
          loading={saving}
        />
        {editingSub && (
          <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setDeleteConfirm({ type: 'subscription', id: editingSub.id, name: editingSub.name })}
            >
              Eliminar suscripción
            </Button>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirmar eliminación"
        maxWidth={400}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={saving}>
              Eliminar
            </Button>
          </div>
        }
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          ¿Estás seguro de que quieres eliminar <strong>{deleteConfirm?.name}</strong>? Esta acción no se puede deshacer.
        </p>
      </Modal>
    </div>
  )
}
