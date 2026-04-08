import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

import {
  InventoryCard,
  InventoryFilters,
  InventoryForm,
  type InventoryFormData,
  PriceHistoryModal,
  ShoppingList,
} from '@/components/domain/inventory'
import { Button, Modal, Skeleton } from '@/components/ui'
import { useVoiceInventory } from '@/hooks/useVoiceInventory'
import {
  createInventoryItem,
  deleteInventoryItem,
  updateInventoryItem,
} from '@/services/inventoryService'
import { useInventoryStore } from '@/stores/inventoryStore'
import type { InventoryItem } from '@/types/inventory'

import styles from './Inventory.module.css'

type Tab = 'pantry' | 'shopping' | 'voice'

function formatQty(value: number | null): string {
  if (value === null) return '-'
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function describeVoiceResult(state: ReturnType<typeof useVoiceInventory>['response']): string {
  if (!state) return ''
  if (!state.ok && state.reason === 'LOW_CONFIDENCE') return 'No se aplicaron cambios por baja confianza.'
  if (!state.result) return 'Sin resultado.'
  const { status, itemName, remainingQuantity, unit } = state.result
  const qty = formatQty(remainingQuantity)
  const u = unit ? ` ${unit}` : ''
  switch (status) {
    case 'created': return `Añadido: ${itemName}. Stock actual ${qty}${u}.`
    case 'updated': return `Stock actualizado: ${itemName}. Ahora tienes ${qty}${u}.`
    case 'consumed': return `Consumo registrado: ${itemName}. Quedan ${qty}${u}.`
    case 'depleted': return `${itemName} quedó en cero.`
    case 'deleted': return `Eliminado: ${itemName}.`
    case 'found': return `${itemName}: ${qty}${u}.`
    case 'not_found': return `No encontré "${itemName}" en el inventario.`
    default: return 'Comando procesado.'
  }
}

export function Inventory() {
  const [tab, setTab] = useState<Tab>('pantry')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<InventoryItem | null>(null)

  // Store
  const initInventory = useInventoryStore((s) => s.init)
  const loading = useInventoryStore((s) => s.loading)
  const filters = useInventoryStore((s) => s.filters)
  const setFilters = useInventoryStore((s) => s.setFilters)
  const resetFilters = useInventoryStore((s) => s.resetFilters)
  const filteredItems = useInventoryStore((s) => s.filteredItems)
  const expiringItems = useInventoryStore((s) => s.expiringItems)
  const shoppingListItems = useInventoryStore((s) => s.shoppingListItems)

  // Voice
  const voice = useVoiceInventory('es-ES')

  useEffect(() => {
    const unsub = initInventory()
    return unsub
  }, [initInventory])

  const items = filteredItems()
  const expiring = expiringItems()
  const shoppingCount = shoppingListItems().length

  // CRUD handlers
  const handleFormSubmit = useCallback(async (data: InventoryFormData) => {
    setSaving(true)
    try {
      if (editingItem) {
        await updateInventoryItem(editingItem.id, {
          name: data.name,
          qty: data.qty,
          unit: data.unit,
          category: data.category,
          minimumQty: data.minimumQty,
          lastPrice: data.lastPrice,
          expiryDate: data.expiryDate,
        })
      } else {
        await createInventoryItem({
          name: data.name,
          qty: data.qty,
          unit: data.unit,
          category: data.category,
          minimumQty: data.minimumQty,
          lastPrice: data.lastPrice,
          expiryDate: data.expiryDate,
          dataOrigin: 'manual',
        })
      }
      setShowForm(false)
      setEditingItem(null)
    } catch (err) {
      console.error('[Inventory] save error:', err)
    } finally {
      setSaving(false)
    }
  }, [editingItem])

  const handleEdit = useCallback((item: InventoryItem) => {
    setEditingItem(item)
    setShowForm(true)
  }, [])

  const handleDeleteConfirmed = useCallback(async () => {
    if (!deleteConfirm) return
    setSaving(true)
    try {
      await deleteInventoryItem(deleteConfirm.id)
      setDeleteConfirm(null)
    } catch (err) {
      console.error('[Inventory] delete error:', err)
    } finally {
      setSaving(false)
    }
  }, [deleteConfirm])

  const voiceStatusLabel =
    voice.state === 'listening' ? 'Escuchando' :
    voice.state === 'processing' ? 'Procesando' :
    voice.state === 'success' ? 'Completado' :
    voice.state === 'error' ? 'Error' : 'Listo'

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h1>Hogar</h1>
          <p>Inventario y gestión del hogar</p>
        </div>
        {tab === 'pantry' && (
          <Button
            size="sm"
            onClick={() => { setEditingItem(null); setShowForm(true) }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ marginRight: 4 }}>
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Añadir producto
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === 'pantry' ? styles.active : ''}`} onClick={() => setTab('pantry')} type="button">
          🏠 Despensa
        </button>
        <button className={`${styles.tab} ${tab === 'shopping' ? styles.active : ''}`} onClick={() => setTab('shopping')} type="button">
          🛒 Lista de la compra
          {shoppingCount > 0 && <span className={styles.badge}>{shoppingCount}</span>}
        </button>
        <button className={`${styles.tab} ${tab === 'voice' ? styles.active : ''}`} onClick={() => setTab('voice')} type="button">
          🎙 Voz
        </button>
      </div>

      {/* ── DESPENSA ── */}
      {tab === 'pantry' && (
        <AnimatePresence mode="wait">
          <motion.div key="pantry" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            {expiring.length > 0 && (
              <div className={styles.expiryAlert}>
                <span>⏱</span>
                <span>
                  {expiring.length === 1
                    ? `${expiring[0].name} caduca pronto`
                    : `${expiring.length} productos caducan en los próximos 7 días`}
                </span>
              </div>
            )}

            <InventoryFilters filters={filters} onFilterChange={setFilters} onReset={resetFilters} />

            {loading ? (
              <div className={styles.list}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} style={{ height: 72, borderRadius: 'var(--radius-lg)' }} />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📦</div>
                <div className={styles.emptyTitle}>Sin productos</div>
                <div className={styles.emptyDesc}>
                  Añade productos manualmente o escanea un ticket para poblar tu despensa.
                </div>
                <Button onClick={() => { setEditingItem(null); setShowForm(true) }}>
                  Añadir producto
                </Button>
              </div>
            ) : (
              <div className={styles.list}>
                <div className={styles.listHeader}>
                  <span className={styles.listCount}>{items.length} {items.length === 1 ? 'producto' : 'productos'}</span>
                  <span className={styles.swipeHint}>← desliza →</span>
                </div>
                {items.map((item) => (
                  <InventoryCard key={item.id} item={item} onEdit={handleEdit} onShowHistory={setHistoryItem} />
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* ── SHOPPING ── */}
      {tab === 'shopping' && (
        <AnimatePresence mode="wait">
          <motion.div key="shopping" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <ShoppingList />
          </motion.div>
        </AnimatePresence>
      )}

      {/* ── VOICE ── */}
      {tab === 'voice' && (
        <AnimatePresence mode="wait">
          <motion.div key="voice" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
            <div className={styles.voicePanel}>
              <div className={styles.voiceTop}>
                <div>
                  <h2 className={styles.voiceTitle}>Entrada por voz</h2>
                  <p className={styles.voiceDesc}>Di algo como "He terminado el café" o "Añade 2 litros de leche".</p>
                </div>
                <button
                  type="button"
                  className={`${styles.micBtn} ${voice.state === 'listening' ? styles.micBtnActive : ''}`}
                  onClick={voice.toggleListening}
                  disabled={!voice.isSupported || voice.state === 'processing'}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3z" />
                    <path d="M19 11a7 7 0 0 1-14 0" />
                    <line x1="12" y1="18" x2="12" y2="22" />
                    <line x1="8" y1="22" x2="16" y2="22" />
                  </svg>
                </button>
              </div>

              <div className={styles.statusRow}>
                <span className={styles.statusPill}>{voiceStatusLabel}</span>
                {!voice.isSupported && <span className={styles.unsupported}>Tu navegador no soporta Web Speech API.</span>}
              </div>

              <div className={`${styles.wave} ${voice.state === 'listening' ? styles.waveActive : ''}`} aria-hidden="true">
                <span /><span /><span /><span /><span />
              </div>

              <div className={styles.block}>
                <p className={styles.blockLabel}>Transcripción</p>
                <p className={styles.blockText}>{voice.transcript || 'Esperando comando de voz...'}</p>
              </div>

              {voice.response && (
                <div className={styles.block}>
                  <p className={styles.blockLabel}>Interpretación</p>
                  <div className={styles.resultMeta}>
                    <span>Acción: <strong>{voice.response.command.action}</strong></span>
                    <span>Item: <strong>{voice.response.command.item}</strong></span>
                    <span>Cantidad: <strong>{voice.response.command.quantity}</strong></span>
                    <span>Confianza: <strong>{Math.round(voice.response.command.confidence * 100)}%</strong></span>
                  </div>
                  <p className={styles.blockText}>{describeVoiceResult(voice.response)}</p>
                </div>
              )}

              {(voice.state === 'success' || voice.state === 'error') && (
                <button type="button" className={styles.resetBtn} onClick={voice.reset}>Limpiar</button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* ── MODALS ── */}

      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditingItem(null) }}
        title={editingItem ? 'Editar producto' : 'Añadir producto'}
        maxWidth={520}
      >
        <InventoryForm
          item={editingItem}
          onSubmit={handleFormSubmit}
          onCancel={() => { setShowForm(false); setEditingItem(null) }}
          loading={saving}
        />
        {editingItem && (
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <Button variant="danger" size="sm" onClick={() => { setDeleteConfirm(editingItem); setShowForm(false) }}>
              Eliminar producto
            </Button>
          </div>
        )}
      </Modal>

      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirmar eliminación"
        maxWidth={380}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDeleteConfirmed} loading={saving}>Eliminar</Button>
          </div>
        }
      >
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          ¿Eliminar <strong>{deleteConfirm?.name}</strong>? Esta acción no se puede deshacer.
        </p>
      </Modal>

      <PriceHistoryModal item={historyItem} onClose={() => setHistoryItem(null)} />
    </div>
  )
}
