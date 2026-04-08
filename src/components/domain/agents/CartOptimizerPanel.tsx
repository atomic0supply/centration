import { useState } from 'react'

import {
  optimizeCart,
  type CartItem,
  type CartOptimizerResponse,
} from '@/services/aiAgentsService'

import styles from './Agents.module.css'

const QUICK_ITEMS = [
  'Leche', 'Pan', 'Huevos', 'Pollo', 'Arroz', 'Pasta', 'Aceite de oliva',
  'Tomates', 'Lechuga', 'Jabón', 'Detergente',
]

function CartItemRow({ item }: { item: CartItem }) {
  return (
    <div className={styles.cartItemRow}>
      <div className={styles.cartItemTop}>
        <span className={styles.cartItemName}>{item.item}</span>
        <span className={styles.cartItemPrice}>{item.estimatedPrice.toFixed(2)}€</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className={styles.cartItemStore}>🏪 {item.bestStore}</span>
        {item.savingVsAvg > 0 && (
          <span className={styles.cartItemSaving}>Ahorras {item.savingVsAvg.toFixed(2)}€</span>
        )}
      </div>
      {item.alternatives.length > 0 && (
        <div className={styles.altPrices}>
          {item.alternatives.map((alt, i) => (
            <span key={i} className={styles.altPrice}>
              {alt.store}: {alt.price.toFixed(2)}€
            </span>
          ))}
        </div>
      )}
      {item.tip && (
        <div style={{ fontSize: 12, color: 'var(--accent-light)', marginTop: 4 }}>
          💡 {item.tip}
        </div>
      )}
    </div>
  )
}

export function CartOptimizerPanel() {
  const [input, setInput] = useState('')
  const [items, setItems] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CartOptimizerResponse | null>(null)

  function addItem(name: string) {
    const trimmed = name.trim()
    if (!trimmed || items.includes(trimmed)) return
    setItems((prev) => [...prev, trimmed])
    setInput('')
  }

  function removeItem(name: string) {
    setItems((prev) => prev.filter((i) => i !== name))
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addItem(input)
    }
    if (e.key === 'Backspace' && input === '' && items.length > 0) {
      setItems((prev) => prev.slice(0, -1))
    }
  }

  async function optimize() {
    if (items.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const data = await optimizeCart(items)
      setResult(data)
    } catch (e) {
      setError('No se pudo optimizar el carrito. Inténtalo de nuevo.')
      console.error('[CartOptimizer]', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <span className={styles.agentIcon}>🛒</span>
          <div>
            <div className={styles.panelName}>Optimizador de Carrito</div>
            <div className={styles.panelDesc}>
              Mejores precios entre supermercados españoles
            </div>
          </div>
        </div>
        <button
          className={styles.generateBtn}
          onClick={optimize}
          disabled={loading || items.length === 0}
        >
          {loading ? <span className={styles.spinner} /> : '🔍'}
          {loading ? 'Comparando…' : 'Comparar precios'}
        </button>
      </div>

      {/* Item input */}
      <div className={styles.cartInputArea}>
        <div className={styles.cartItemsTag}>
          {items.map((item) => (
            <span key={item} className={styles.cartTag}>
              {item}
              <button
                className={styles.cartTagRemove}
                onClick={() => removeItem(item)}
                aria-label={`Eliminar ${item}`}
              >
                ×
              </button>
            </span>
          ))}
          <input
            className={styles.cartInput}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => addItem(input)}
            placeholder={items.length === 0 ? 'Escribe un producto y pulsa Enter…' : '+ Añadir…'}
          />
        </div>

        {/* Quick add pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {QUICK_ITEMS.filter((q) => !items.includes(q)).map((q) => (
            <button key={q} className={styles.queryExample} onClick={() => addItem(q)}>
              + {q}
            </button>
          ))}
        </div>
      </div>

      {error && <div className={styles.errorBox}>⚠ {error}</div>}

      {!result && !loading && (
        <div className={styles.placeholder}>
          <span className={styles.placeholderIcon}>🏷️</span>
          <span className={styles.placeholderText}>
            Añade productos al carrito para comparar precios
          </span>
        </div>
      )}

      {result && (
        <>
          {/* Store recommendation */}
          <div className={styles.storeRecoCard}>
            <span className={styles.storeRecoIcon}>🏆</span>
            <div className={styles.storeRecoInfo}>
              <div className={styles.storeRecoMain}>
                Mejor opción: {result.storeRecommendation.primary}
              </div>
              <div className={styles.storeRecoSub}>
                Complementar en {result.storeRecommendation.secondary} · {result.storeRecommendation.reason}
              </div>
            </div>
          </div>

          {/* Savings summary */}
          <div className={styles.savingsBanner}>
            <span className={styles.savingsLabel}>
              Total estimado: <strong style={{ color: 'var(--text-primary)' }}>{result.totalEstimate.toFixed(2)}€</strong>
            </span>
            <div style={{ textAlign: 'right' }}>
              <div className={styles.savingsLabel}>Ahorro total</div>
              <div className={styles.savingsAmount}>–{result.totalSavings.toFixed(2)}€</div>
            </div>
          </div>

          {/* Per-item list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {result.optimizedList.map((item, i) => (
              <CartItemRow key={i} item={item} />
            ))}
          </div>

          {/* General tips */}
          {result.generalTips.length > 0 && (
            <div>
              <div className={styles.sectionLabel}>Consejos de compra</div>
              <div className={styles.tipsList}>
                {result.generalTips.map((tip, i) => (
                  <div key={i} className={styles.tipsItem}>
                    <span className={styles.tipsIcon}>→</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
