import { useState } from 'react'

import {
  getNutritionalPlan,
  type DayPlan,
  type NutritionalGoal,
  type NutritionalPlanResponse,
} from '@/services/aiAgentsService'

import styles from './Agents.module.css'

const GOALS: Array<{ key: NutritionalGoal; label: string; emoji: string; desc: string }> = [
  { key: 'health', label: 'Salud', emoji: '🥗', desc: 'Dieta equilibrada y nutritiva' },
  { key: 'savings', label: 'Ahorro', emoji: '💰', desc: 'Máximo aprovechamiento, mínimo gasto' },
  { key: 'sport', label: 'Deporte', emoji: '🏋️', desc: 'Alto rendimiento y recuperación' },
]

function DayCard({ day }: { day: DayPlan }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={styles.dayCard}>
      <div className={styles.dayHeader} onClick={() => setOpen((v) => !v)}>
        <span className={styles.dayName}>{day.day}</span>
        <div className={styles.dayMacros}>
          <span>{day.kcal} kcal</span>
          <span>P:{day.proteinG}g</span>
          <span>H:{day.carbsG}g</span>
          <span>G:{day.fatG}g</span>
          <span>{day.estimatedCost.toFixed(2)}€</span>
          <span style={{ color: 'var(--text-muted)' }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && (
        <div className={styles.dayBody}>
          <div className={styles.mealSlot}>
            <div className={styles.mealLabel}>Desayuno</div>
            <div className={styles.mealText}>{day.breakfast}</div>
          </div>
          <div className={styles.mealSlot}>
            <div className={styles.mealLabel}>Comida</div>
            <div className={styles.mealText}>{day.lunch}</div>
          </div>
          <div className={styles.mealSlot}>
            <div className={styles.mealLabel}>Cena</div>
            <div className={styles.mealText}>{day.dinner}</div>
          </div>
          <div className={styles.mealSlot}>
            <div className={styles.mealLabel}>Snack</div>
            <div className={styles.mealText}>{day.snack}</div>
          </div>
        </div>
      )}
    </div>
  )
}

export function NutritionalPlannerPanel() {
  const [goal, setGoal] = useState<NutritionalGoal>('health')
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<NutritionalPlanResponse | null>(null)

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const data = await getNutritionalPlan(goal, days)
      setResult(data)
    } catch (e) {
      setError('No se pudo generar el plan. Inténtalo de nuevo.')
      console.error('[NutritionalPlanner]', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <span className={styles.agentIcon}>🥗</span>
          <div>
            <div className={styles.panelName}>Planificador Nutricional</div>
            <div className={styles.panelDesc}>
              Plan semanal personalizado basado en tus compras reales
            </div>
          </div>
        </div>
        <button className={styles.generateBtn} onClick={generate} disabled={loading}>
          {loading ? <span className={styles.spinner} /> : '✨'}
          {loading ? 'Planificando…' : 'Generar plan'}
        </button>
      </div>

      {/* Goal & duration selectors */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className={styles.goalSelector}>
          {GOALS.map((g) => (
            <button
              key={g.key}
              className={`${styles.goalBtn} ${goal === g.key ? styles.goalBtnActive : ''}`}
              onClick={() => setGoal(g.key)}
            >
              {g.emoji} {g.label}
            </button>
          ))}
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          style={{
            padding: '6px 10px',
            borderRadius: 8,
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-strong)',
            color: 'var(--text-primary)',
            fontSize: 13,
          }}
        >
          <option value={3}>3 días</option>
          <option value={5}>5 días</option>
          <option value={7}>7 días</option>
        </select>
      </div>

      {error && <div className={styles.errorBox}>⚠ {error}</div>}

      {!result && !loading && (
        <div className={styles.placeholder}>
          <span className={styles.placeholderIcon}>📋</span>
          <span className={styles.placeholderText}>
            Selecciona tu objetivo y pulsa «Generar plan»
          </span>
        </div>
      )}

      {result && (
        <>
          {/* Analysis */}
          <div className={styles.analysisCard}>
            <div className={styles.analysisSummary}>{result.analysis.summary}</div>
            <div style={{ marginBottom: 8 }}>
              <div className={styles.sectionLabel}>Puntos fuertes</div>
              <div className={styles.pillRow}>
                {result.analysis.strengths.map((s, i) => (
                  <span key={i} className={styles.pillGreen}>{s}</span>
                ))}
              </div>
            </div>
            <div>
              <div className={styles.sectionLabel}>Áreas de mejora</div>
              <div className={styles.pillRow}>
                {result.analysis.improvements.map((s, i) => (
                  <span key={i} className={styles.pillOrange}>{s}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Day plans */}
          <div className={styles.dayPlanGrid}>
            {result.weekPlan.map((day, i) => (
              <DayCard key={i} day={day} />
            ))}
          </div>

          {/* Shopping needs */}
          {result.shoppingNeeds.length > 0 && (
            <div className={styles.analysisCard}>
              <div className={styles.sectionLabel}>Necesitas comprar</div>
              <div className={styles.pillRow}>
                {result.shoppingNeeds.map((item, i) => (
                  <span key={i} className={styles.pillOrange}>🛒 {item}</span>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          {result.tips.length > 0 && (
            <div>
              <div className={styles.sectionLabel}>Consejos</div>
              <div className={styles.tipsList}>
                {result.tips.map((tip, i) => (
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
