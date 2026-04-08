import { useState } from 'react'

import {
  getZeroWasteRecipes,
  type AiChefResponse,
  type ChefRecipe,
} from '@/services/aiAgentsService'

import styles from './Agents.module.css'

function RecipeCard({ recipe }: { recipe: ChefRecipe }) {
  const [open, setOpen] = useState(false)
  const scoreClass =
    recipe.zeroWasteScore >= 7 ? styles.zeroWasteHigh : styles.zeroWasteMid

  return (
    <div className={styles.recipeCard}>
      <div className={styles.recipeHeader} onClick={() => setOpen((v) => !v)}>
        <span className={styles.recipeEmoji}>{recipe.emoji}</span>
        <div className={styles.recipeMeta}>
          <div className={styles.recipeName}>{recipe.name}</div>
          <div className={styles.recipeStats}>
            <span className={styles.stat}>⏱ {recipe.time}</span>
            <span className={styles.stat}>👥 {recipe.servings} pers.</span>
            <span className={`${styles.zeroWasteScore} ${scoreClass}`}>
              ♻ {recipe.zeroWasteScore}/10
            </span>
          </div>
        </div>
        <span className={`${styles.recipeChevron} ${open ? styles.recipeChevronOpen : ''}`}>
          ▼
        </span>
      </div>

      {open && (
        <div className={styles.recipeBody}>
          {recipe.expiringUsed.length > 0 && (
            <div>
              <div className={styles.sectionLabel}>Aprovecha antes de que caduque</div>
              <div className={styles.expiringBadges}>
                {recipe.expiringUsed.map((name) => (
                  <span key={name} className={styles.expiringBadge}>
                    ⚠ {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className={styles.sectionLabel}>Ingredientes</div>
            <div className={styles.ingredientList}>
              {recipe.ingredients.map((ing, i) => (
                <div key={i} className={styles.ingredient}>
                  {ing.fromInventory && <span className={styles.inventoryDot} />}
                  <span className={styles.ingredientQty}>{ing.qty}</span>
                  <span>{ing.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className={styles.sectionLabel}>Preparación</div>
            <div className={styles.stepList}>
              {recipe.steps.map((step, i) => (
                <div key={i} className={styles.step}>
                  <span className={styles.stepNum}>{i + 1}</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {recipe.tip && (
            <div className={styles.tipBox}>
              <span>💡</span>
              <span>{recipe.tip}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function AiChefPanel() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AiChefResponse | null>(null)
  const [maxRecipes, setMaxRecipes] = useState(3)

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const data = await getZeroWasteRecipes(maxRecipes)
      setResult(data)
    } catch (e) {
      setError('No se pudo generar las recetas. Inténtalo de nuevo.')
      console.error('[AiChef]', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <span className={styles.agentIcon}>👨‍🍳</span>
          <div>
            <div className={styles.panelName}>Cocinero IA</div>
            <div className={styles.panelDesc}>
              Recetas Zero Waste priorizando lo que caduca pronto
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <select
            value={maxRecipes}
            onChange={(e) => setMaxRecipes(Number(e.target.value))}
            style={{
              padding: '6px 10px',
              borderRadius: 8,
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-primary)',
              fontSize: 13,
            }}
          >
            <option value={1}>1 receta</option>
            <option value={2}>2 recetas</option>
            <option value={3}>3 recetas</option>
            <option value={5}>5 recetas</option>
          </select>
          <button className={styles.generateBtn} onClick={generate} disabled={loading}>
            {loading ? <span className={styles.spinner} /> : '✨'}
            {loading ? 'Generando…' : 'Generar recetas'}
          </button>
        </div>
      </div>

      {error && <div className={styles.errorBox}>⚠ {error}</div>}

      {!result && !loading && (
        <div className={styles.placeholder}>
          <span className={styles.placeholderIcon}>🥦</span>
          <span className={styles.placeholderText}>
            Pulsa «Generar recetas» para aprovechar tu inventario al máximo
          </span>
        </div>
      )}

      {result && (
        <>
          {result.expiringItems.length > 0 && (
            <div className={styles.errorBox} style={{ borderColor: 'var(--warning-border)', background: 'var(--warning-bg)', color: 'var(--warning)' }}>
              ⚠ Caducan pronto: {result.expiringItems.join(', ')}
            </div>
          )}
          {result.recipes.length === 0 ? (
            <div className={styles.placeholder}>
              <span className={styles.placeholderIcon}>😔</span>
              <span className={styles.placeholderText}>
                {result.note ?? 'No hay suficientes productos en el inventario.'}
              </span>
            </div>
          ) : (
            <div className={styles.recipeGrid}>
              {result.recipes.map((recipe, i) => (
                <RecipeCard key={i} recipe={recipe} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
