import {
  type ChangeEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import { AnimatePresence, motion } from 'framer-motion'

import { RichCardRenderer } from '@/components/domain/concierge/RichCardRenderer'
import { SuggestedQuestions } from '@/components/domain/concierge/SuggestedQuestions'
import { useConciergeStore } from '@/stores/conciergeStore'
import { formatRelativeDate } from '@/utils/formatters'

import styles from './Agents.module.css'

/* ── Typing indicator ── */

function TypingIndicator() {
  return (
    <motion.div
      className={`${styles.chatMsg} ${styles.chatMsgAssistant}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ padding: '12px 16px' }}
    >
      <div className={styles.typingDots}>
        <span />
        <span />
        <span />
      </div>
    </motion.div>
  )
}

/* ── Main component ── */

export function ConciergeChat() {
  const { messages, loading, sending, error, init, send, clearError } = useConciergeStore()
  const [draft, setDraft] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // Subscribe to chat history (Firestore real-time)
  useEffect(() => {
    const unsub = init()
    return unsub
  }, [init])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  // Hide suggestions after first message
  useEffect(() => {
    if (messages.length > 0) setShowSuggestions(false)
  }, [messages.length])

  const handleSend = useCallback(async () => {
    const text = draft.trim()
    if (!text || sending) return
    setDraft('')
    setShowSuggestions(false)
    await send(text)
  }, [draft, sending, send])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        void handleSend()
      }
    },
    [handleSend],
  )

  const handleSuggest = useCallback((question: string) => {
    setDraft(question)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }, [])

  const toggleVoice = useCallback(() => {
    if (isRecording) {
      recognitionRef.current?.stop()
      setIsRecording(false)
      return
    }

    const SpeechRecognitionAPI =
      window.SpeechRecognition ??
      (
        window as unknown as {
          webkitSpeechRecognition?: typeof window.SpeechRecognition
        }
      ).webkitSpeechRecognition

    if (!SpeechRecognitionAPI) {
      alert('Tu navegador no soporta reconocimiento de voz.')
      return
    }

    const recognition = new SpeechRecognitionAPI()
    recognition.lang = 'es-ES'
    recognition.continuous = false
    recognition.interimResults = false

    recognition.onresult = (ev: SpeechRecognitionEvent) => {
      const transcript = ev.results[0]?.[0]?.transcript ?? ''
      setDraft((prev) => (prev ? `${prev} ${transcript}` : transcript))
      setIsRecording(false)
    }
    recognition.onerror = () => setIsRecording(false)
    recognition.onend = () => setIsRecording(false)

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
  }, [isRecording])

  const canSend = draft.trim().length > 0 && !sending

  return (
    <div className={styles.chatWrapper} style={{ height: 580 }}>
      {/* Messages list */}
      <div className={styles.chatMessages}>
        {loading && messages.length === 0 ? (
          <div className={styles.chatLoadingState}>
            <span className={styles.spinner} style={{ borderTopColor: 'var(--accent-light)' }} />
            <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 8 }}>
              Cargando historial…
            </span>
          </div>
        ) : messages.length === 0 ? (
          <div className={styles.chatWelcome}>
            <span style={{ fontSize: 36 }}>🤖</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Hola, soy tu Conserje
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 280 }}>
              Tengo acceso a tus finanzas, inventario, inversiones y activos. Pregúntame lo que necesites.
            </span>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isUser = msg.role === 'user'

              // Parse assistant JSON wrapper if present
              let displayText = msg.content
              if (!isUser) {
                try {
                  const parsed = JSON.parse(msg.content) as { text?: string }
                  if (parsed.text) displayText = parsed.text
                } catch {
                  /* plain text */
                }
              }

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div className={`${styles.chatMsg} ${isUser ? styles.chatMsgUser : styles.chatMsgAssistant}`}>
                    {displayText}
                  </div>
                  {msg.richCard && <RichCardRenderer card={msg.richCard} />}
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '0 4px' }}>
                    {formatRelativeDate(msg.timestamp)}
                  </span>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}

        {sending && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Suggested questions */}
      {showSuggestions && messages.length === 0 && (
        <div style={{ padding: '0 var(--space-4)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-3)' }}>
          <SuggestedQuestions onSelect={handleSuggest} disabled={sending} />
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className={styles.chatErrorBanner}>
          <span>⚠️ {error}</span>
          <button onClick={clearError}>✕</button>
        </div>
      )}

      {/* Input row */}
      <div className={styles.chatInputRow}>
        {/* Voice button */}
        <button
          className={`${styles.chatVoiceBtn} ${isRecording ? styles.chatVoiceBtnRecording : ''}`}
          onClick={toggleVoice}
          disabled={sending}
          title={isRecording ? 'Detener' : 'Hablar (es-ES)'}
        >
          {isRecording ? '⏹' : '🎤'}
        </button>

        <input
          ref={inputRef}
          className={styles.chatInput}
          value={draft}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe o habla con tu Conserje…"
          disabled={sending}
        />
        <button
          className={styles.chatSendBtn}
          onClick={() => void handleSend()}
          disabled={!canSend}
        >
          {sending ? <span className={styles.spinner} style={{ borderTopColor: '#fff', width: 14, height: 14 }} /> : '↑'}
        </button>
      </div>
    </div>
  )
}
