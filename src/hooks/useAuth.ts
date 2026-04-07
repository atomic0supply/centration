import { useAuthStore } from '@/stores/authStore'

/**
 * Convenience hook that exposes the full auth state and actions.
 * Components should prefer this over importing useAuthStore directly.
 */
export function useAuth() {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)
  const initialized = useAuthStore((s) => s.initialized)
  const signIn = useAuthStore((s) => s.signIn)
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle)
  const signUp = useAuthStore((s) => s.signUp)
  const signOut = useAuthStore((s) => s.signOut)
  const resetPassword = useAuthStore((s) => s.resetPassword)

  return { user, loading, initialized, signIn, signInWithGoogle, signUp, signOut, resetPassword }
}
