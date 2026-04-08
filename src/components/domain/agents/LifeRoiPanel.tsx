import { useState } from 'react'

import {
  analyzeLifeRoi,
  type BreakdownItem,
  type LifeRoiResponse,
} from '@/services/aiAgentsService'

import styles from './Agents.module.css'

const EXAMPLE_QUERIES = [
  '¿Me sale rentable mantener el coche?',
  '¿Debo cancelar mis suscripciones de streaming?',
  '¿Comprar o alquilar vivienda en mi situación?',
  '¿Vale la pena el gimnasio con lo que gasto?',
  '¿Invierto el ahorro o pago deuda?',
]

function BreakdownRow({ item }: { item: BreakdownItem }) {
  const rowClass =
    item.type === 'cost'
      ? styles.breakdownCost
      : item.type === 'benefit'
        ? styles.breakdownBenefit
        : styles.breakdownOpportunity

  const amountClass =
    item.type === 'cost'
      ? styles.breakdownAmountCost
      : item.type === 'benefit'
        ? styles.breakdownAmountBenefit
        : styles.breakdownAmountOpportunity

  const prefix = item.type === 'benefit' ? '+' : item.type === 'cost' ? '–' : '≈'

  return (
    <div className={`${styles.breakdownRow} ${rowClass}`}>
      <span className={styles.breakdownConcept}>{item.concept}</span>
      <span className={`${styles.breakdownAmount} ${amountClass}`}>
        {prefix}{Math.abs(item.amount).toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}€/año
      </span>
    </div>
  )
}

function RoiScoreColor(score: number): string {
  if (score >= 7) return 'var(--success)'
  if (score >= 4) return 'var(--warning)'
  return 'var(--error)'
}

export function LifeRoiPanel() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<LifeRoiResponse | null>(null)

  async function analyze() {
    const q = query.trim()
    if (q.length < 5) return
    setLoading(true)
    setError(null)
    try {
      const data = await analyzeLifeRoi(q)
      setResult(data)
    } catch (e) {
      setError('No se pudo completar el análisis. Inténtalo de nuevo.')
      console.error('[LifeRoi]', e)
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      analyze()
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitle}>
          <span className={styles.agentIcon}>📊</span>
          <div>
            <div className={styles.panelName}>Análisis ROI de Vida</div>
            <div className={styles.panelDesc}>
              Consultas financieras complejas con tus datos reales
            </div>
          </div>
        </div>
      </div>

      {/* Query area */}
      <div className={styles.queryArea}>
        <div className={styles.queryExamples}>
          {EXAMPLE_QUERIES.map((q) => (
            <button key={q} className={styles.queryExample} onClick={() => setQuery(q)}>
              {q}
            </button>
          ))}
        </div>
        <textarea
          className={styles.queryTextarea}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu consulta financiera… (Ctrl+Enter para analizar)"
          rows={3}
        />
        <button
          className={styles.generateBtn}
          onClick={analyze}
          disabled={loading || query.trim().length < 5}
          style={{ alignSelf: 'flex-start' }}
        >
          {loading ? <span className={styles.spinner} /> : '📊'}
          {loading ? 'Analizando…' : 'Analizar'}
        </button>
      </div>

      {error && <div className={styles.errorBox}>⚠ {error}</div>}

      {!result && !loading && (
        <div className={styles.placeholder}>
          <span className={styles.placeholderIcon}>💭</span>
          <span className={styles.placeholderText}>
            Escribe una pregunta financiera compleja y obtén un análisis basado en tus datos reales
          </span>
        </div>
      )}

      {result && (
        <>
          {/* Verdict card */}
          <div className={styles.roiVerdictCard}>
            <span className={styles.roiVerdictEmoji}>{result.verdictEmoji}</span>
            <div className={styles.roiVerdictText}>
              <div className={styles.roiVerdictTitle}>{result.verdict}</div>
              <div className={styles.roiScoreRow}>
                <span className={styles.roiScoreLabel}>ROI Score</span>
                <div className={styles.roiScoreBar}>
                  <div
                    className={styles.roiScoreFill}
                    style={{
                      width: `${result.roiScore * 10}%`,
                      background: RoiScoreColor(result.roiScore),
                    }}
                  />
                </div>
                <span
                  className={styles.roiScoreValue}
                  style={{ color: RoiScoreColor(result.roiScore) }}
                >
                  {result.roiScore}/10
                </span>
              </div>
            </div>
          </div>

          {/* Financial impact tiles */}
          <div>
            <div className={styles.sectionLabel}>Impacto financiero anual</div>
            <div className={styles.financialGrid}>
              <div className={styles.financialTile}>
                <div className={styles.financialTileLabel}>Coste actual</div>
                <div className={`${styles.financialTileValue} ${styles.financialTileNegative}`}>
                  {result.financialImpact.currentAnnualCost.toLocaleString('es-ES', { maximumFractionDigits: 0 })}€
                </div>
              </div>
              <div className={styles.financialTile}>
                <div className={styles.financialTileLabel}>Beneficio estimado</div>
                <div className={`${styles.financialTileValue} ${styles.financialTilePositive}`}>
                  {result.financialImpact.estimatedAnnualBenefit.toLocaleString('es-ES', { maximumFractionDigits: 0 })}€
                </div>
              </div>
              <div className={styles.financialTile}>
                <div className={styles.financialTileLabel}>ROI neto</div>
                <div
                  className={styles.financialTileValue}
                  style={{ color: result.financialImpact.netRoi >= 0 ? 'var(--success)' : 'var(--error)' }}
                >
                  {result.financialImpact.netRoi >= 0 ? '+' : ''}
                  {result.financialImpact.netRoi.toLocaleString('es-ES', { maximumFractionDigits: 0 })}€
                </div>
              </div>
              <div className={styles.financialTile}>
                <div className={styles.financialTileLabel}>Amortización</div>
                <div className={styles.financialTileValue}>
                  {result.financialImpact.paybackMonths !== null
                    ? `${result.financialImpact.paybackMonths} meses`
                    : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          {result.breakdown.length > 0 && (
            <div>
              <div className={styles.sectionLabel}>Desglose</div>
              <div className={styles.breakdownList}>
                {result.breakdown.map((item, i) => (
                  <BreakdownRow key={i} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* Recommendation */}
          <div>
            <div className={styles.sectionLabel}>Recomendación</div>
            <div className={styles.recommendationBox}>{result.recommendation}</div>
          </div>

          {/* Alternatives */}
          {result.alternatives.length > 0 && (
            <div>
              <div className={styles.sectionLabel}>Alternativas</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {result.alternatives.map((alt, i) => (
                  <div key={i} className={styles.alternativeCard}>
                    <div className={styles.alternativeTitle}>{alt.option}</div>
                    {alt.estimatedSaving > 0 && (
                      <div className={styles.alternativeSaving}>
                        Ahorro estimado: {alt.estimatedSaving.toLocaleString('es-ES', { maximumFractionDigits: 0 })}€/año
                      </div>
                    )}
                    <div className={styles.prosConsList}>
                      <div className={styles.prosList}>
                        {alt.pros.map((p, j) => (
                          <span key={j} className={styles.proItem}>✓ {p}</span>
                        ))}
                      </div>
                      <div className={styles.consList}>
                        {alt.cons.map((c, j) => (
                          <span key={j} className={styles.conItem}>✗ {c}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data gaps */}
          {result.dataGaps.length > 0 && (
            <div className={styles.errorBox} style={{ borderColor: 'var(--info-border)', background: 'var(--info-bg)', color: 'var(--info)' }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Para mayor precisión, añade:</div>
                {result.dataGaps.map((gap, i) => (
                  <div key={i} style={{ fontSize: 12, marginTop: 2 }}>· {gap}</div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
