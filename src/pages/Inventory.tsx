import { Card } from '@/components/ui'
import { useVoiceInventory } from '@/hooks/useVoiceInventory'

import styles from './Inventory.module.css'

function formatQty(value: number | null): string {
  if (value === null) return '-'
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

function describeResult(state: ReturnType<typeof useVoiceInventory>['response']): string {
  if (!state) return ''
  if (!state.ok && state.reason === 'LOW_CONFIDENCE') {
    return 'No se aplicaron cambios por baja confianza.'
  }
  if (!state.result) return 'Sin resultado.'

  const { status, itemName, remainingQuantity, unit } = state.result
  const quantity = formatQty(remainingQuantity)
  const unitText = unit ? ` ${unit}` : ''

  switch (status) {
    case 'created':
      return `Añadido: ${itemName}. Stock actual ${quantity}${unitText}.`
    case 'updated':
      return `Stock actualizado: ${itemName}. Ahora tienes ${quantity}${unitText}.`
    case 'consumed':
      return `Consumo registrado: ${itemName}. Quedan ${quantity}${unitText}.`
    case 'depleted':
      return `${itemName} quedó en cero.`
    case 'deleted':
      return `Eliminado: ${itemName}.`
    case 'found':
      return `${itemName}: ${quantity}${unitText}.`
    case 'not_found':
      return `No encontré "${itemName}" en el inventario.`
    default:
      return 'Comando procesado.'
  }
}

function describeAction(action: string): string {
  switch (action) {
    case 'add':
      return 'Añadir'
    case 'consume':
      return 'Consumir'
    case 'delete':
      return 'Eliminar'
    case 'query':
      return 'Consultar'
    default:
      return action
  }
}

export function Inventory() {
  const voice = useVoiceInventory('es-ES')

  const statusLabel =
    voice.state === 'listening'
      ? 'Escuchando'
      : voice.state === 'processing'
        ? 'Procesando'
        : voice.state === 'success'
          ? 'Completado'
          : voice.state === 'error'
            ? 'Error'
            : 'Listo'

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Hogar</h1>
        <p className={styles.subtitle}>Inventario y gestión del hogar.</p>
      </div>

      <Card className={styles.voiceCard}>
        <div className={styles.voiceTop}>
          <div>
            <h2 className={styles.voiceTitle}>Entrada por voz</h2>
            <p className={styles.voiceDescription}>
              Di algo como "He terminado el café" o "Añade 2 litros de leche".
            </p>
          </div>
          <button
            type="button"
            className={[
              styles.micButton,
              voice.state === 'listening' ? styles.micButtonListening : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={voice.toggleListening}
            disabled={!voice.isSupported || voice.state === 'processing'}
            aria-pressed={voice.state === 'listening'}
            aria-label={
              voice.state === 'listening'
                ? 'Detener grabación'
                : 'Iniciar grabación de voz'
            }
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3z" />
              <path d="M19 11a7 7 0 0 1-14 0" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="8" y1="22" x2="16" y2="22" />
            </svg>
          </button>
        </div>

        <div className={styles.statusRow}>
          <span className={styles.statusPill}>{statusLabel}</span>
          {!voice.isSupported && (
            <span className={styles.unsupported}>
              Tu navegador no soporta Web Speech API.
            </span>
          )}
        </div>

        <div
          className={[
            styles.wave,
            voice.state === 'listening' ? styles.waveActive : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-hidden="true"
        >
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>

        <div className={styles.transcriptBlock}>
          <p className={styles.label}>Transcripción</p>
          <p className={styles.transcriptText}>
            {voice.transcript || 'Esperando comando de voz...'}
          </p>
        </div>

        {voice.response && (
          <div className={styles.resultBlock}>
            <p className={styles.label}>Interpretación Gemini</p>
            <div className={styles.resultMeta}>
              <span>
                Acción: <strong>{describeAction(voice.response.command.action)}</strong>
              </span>
              <span>
                Item: <strong>{voice.response.command.item}</strong>
              </span>
              <span>
                Cantidad: <strong>{voice.response.command.quantity}</strong>
              </span>
              <span>
                Confianza: <strong>{Math.round(voice.response.command.confidence * 100)}%</strong>
              </span>
            </div>
            <p className={styles.resultText}>{describeResult(voice.response)}</p>
          </div>
        )}

        {(voice.state === 'success' || voice.state === 'error') && (
          <button
            type="button"
            className={styles.resetButton}
            onClick={voice.reset}
          >
            Limpiar
          </button>
        )}
      </Card>
    </div>
  )
}
