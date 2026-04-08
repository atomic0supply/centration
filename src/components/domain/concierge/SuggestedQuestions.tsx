import styles from './Concierge.module.css'

const QUESTIONS = [
  { icon: '📈', text: '¿Cómo van mis inversiones?' },
  { icon: '💰', text: '¿Cuánto he gastado este mes?' },
  { icon: '🍽️', text: '¿Qué puedo cocinar hoy?' },
  { icon: '⚠️', text: '¿Qué alertas tengo pendientes?' },
  { icon: '📦', text: '¿Qué me falta en el inventario?' },
  { icon: '💳', text: '¿Qué suscripciones vencen pronto?' },
]

interface Props {
  onSelect: (question: string) => void
  disabled?: boolean
}

export function SuggestedQuestions({ onSelect, disabled }: Props) {
  return (
    <div className={styles.suggestions}>
      {QUESTIONS.map((q) => (
        <button
          key={q.text}
          className={styles.suggestionChip}
          onClick={() => onSelect(q.text)}
          disabled={disabled}
        >
          <span>{q.icon}</span>
          <span>{q.text}</span>
        </button>
      ))}
    </div>
  )
}
