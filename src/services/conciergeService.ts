import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Unsubscribe,
} from 'firebase/firestore'

import { auth, db, functions } from '@/services/firebase'
import { httpsCallable } from 'firebase/functions'

/* ── Types ── */

export interface RichCard {
  type: 'chart' | 'table' | 'alert' | 'list'
  title?: string
  data: unknown
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  richCard: RichCard | null
}

export interface ConciergeChatResponse {
  text: string
  richCard: RichCard | null
}

/* ── Subscribe to chat history (real-time) ── */

export function subscribeChatMessages(
  onMessages: (messages: ChatMessage[]) => void,
  onError: (err: Error) => void,
  maxMessages = 50,
): Unsubscribe {
  const uid = auth.currentUser?.uid
  if (!uid) {
    onError(new Error('No autenticado'))
    return () => undefined
  }

  const q = query(
    collection(db, 'chat_history', uid, 'messages'),
    orderBy('timestamp', 'asc'),
    limit(maxMessages),
  )

  return onSnapshot(
    q,
    (snap) => {
      const messages: ChatMessage[] = snap.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          role: data.role as 'user' | 'assistant',
          content: typeof data.content === 'string' ? data.content : '',
          timestamp: data.timestamp?.toDate() ?? new Date(),
          richCard: (data.richCard as RichCard | null) ?? null,
        }
      })
      onMessages(messages)
    },
    (err) => onError(err),
  )
}

/* ── Send a message via the Cloud Function ── */

export async function sendConciergeMessage(message: string): Promise<ConciergeChatResponse> {
  const user = auth.currentUser
  if (!user) throw new Error('No autenticado')

  const conciergeChat = httpsCallable<{ message: string }, ConciergeChatResponse>(
    functions,
    'conciergeChat',
  )

  const response = await conciergeChat({ message })
  return response.data
}
