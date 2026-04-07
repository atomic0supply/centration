import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { create } from 'zustand'

import { auth } from '@/services/firebase'

interface AuthState {
  user: User | null
  loading: boolean
  initialized: boolean
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => {
  onAuthStateChanged(auth, (user) => {
    set({ user, loading: false, initialized: true })
  })

  return {
    user: null,
    loading: true,
    initialized: false,

    signIn: async (email, password) => {
      await signInWithEmailAndPassword(auth, email, password)
    },

    signInWithGoogle: async () => {
      const provider = new GoogleAuthProvider()
      await signInWithPopup(auth, provider)
    },

    signUp: async (email, password) => {
      await createUserWithEmailAndPassword(auth, email, password)
    },

    signOut: async () => {
      await firebaseSignOut(auth)
    },

    resetPassword: async (email) => {
      await sendPasswordResetEmail(auth, email)
    },
  }
})
