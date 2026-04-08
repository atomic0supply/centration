import { motion } from 'framer-motion'

import type { ChatMessage } from '@/services/conciergeService'
import { formatRelativeDate } from '@/utils/formatters'

import { RichCardRenderer } from './RichCardRenderer'
import styles from './Concierge.module.css'

interface ChatBubbleProps {
  message: ChatMessage
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user'

  // Parse assistant content — may be a JSON wrapper {"text":"...","richCard":...}
  let displayText = message.content
  if (!isUser) {
    try {
      const parsed = JSON.parse(message.content) as { text?: string; richCard?: unknown }
      if (parsed.text) displayText = parsed.text
    } catch {
      // content is plain text
    }
  }

  return (
    <motion.div
      className={`${styles.bubbleRow} ${isUser ? styles.userRow : styles.assistantRow}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {!isUser && (
        <div className={styles.avatar} aria-label="Conserje">
          🤖
        </div>
      )}

      <div className={styles.bubbleGroup}>
        <div className={`${styles.bubble} ${isUser ? styles.userBubble : styles.assistantBubble}`}>
          <p className={styles.bubbleText}>{displayText}</p>
        </div>

        {message.richCard && <RichCardRenderer card={message.richCard} />}

        <span className={styles.bubbleTime}>{formatRelativeDate(message.timestamp)}</span>
      </div>

      {isUser && (
        <div className={styles.avatar} aria-label="Tú">
          👤
        </div>
      )}
    </motion.div>
  )
}

/* ── Typing indicator ── */

export function TypingIndicator() {
  return (
    <motion.div
      className={`${styles.bubbleRow} ${styles.assistantRow}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className={styles.avatar}>🤖</div>
      <div className={styles.bubble} style={{ padding: '12px 16px' }}>
        <div className={styles.typingDots}>
          <span />
          <span />
          <span />
        </div>
      </div>
    </motion.div>
  )
}
