import { create } from 'zustand'

import {
  type ChatMessage,
  sendConciergeMessage,
  subscribeChatMessages,
} from '@/services/conciergeService'

interface ConciergeState {
  messages: ChatMessage[]
  loading: boolean
  sending: boolean
  error: string | null

  /* Actions */
  init: () => () => void
  send: (message: string) => Promise<void>
  clearError: () => void

  /* Optimistic local message (before server echo) */
  _pendingUserMsg: string | null
}

export const useConciergeStore = create<ConciergeState>((set, get) => ({
  messages: [],
  loading: true,
  sending: false,
  error: null,
  _pendingUserMsg: null,

  init: () => {
    set({ loading: true, error: null })
    const unsub = subscribeChatMessages(
      (messages) => set({ messages, loading: false }),
      (err) => set({ error: err.message, loading: false }),
    )
    return unsub
  },

  send: async (message: string) => {
    if (get().sending) return
    set({ sending: true, error: null, _pendingUserMsg: message })

    try {
      await sendConciergeMessage(message)
      // Firestore listener will pick up both user + assistant messages
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al enviar mensaje'
      set({ error: msg })
    } finally {
      set({ sending: false, _pendingUserMsg: null })
    }
  },

  clearError: () => set({ error: null }),
}))
