import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  user: {
    displayName: 'Ana García',
    email: 'ana@example.com',
    photoURL: '',
    providerData: [{ providerId: 'password' }],
  },
  success: vi.fn(),
  error: vi.fn(),
  getUserNotificationPrefs: vi.fn(),
  saveUserNotificationPrefs: vi.fn(),
  updateProfile: vi.fn(),
  signOut: vi.fn(),
  initFinance: vi.fn(),
  saveFinance: vi.fn(),
}))

interface UserFinanceMockState {
  init: typeof mocks.initFinance
  save: typeof mocks.saveFinance
  liquidCash: number
  debts: number
  loading: boolean
  saving: boolean
}

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mocks.user,
    loading: false,
    initialized: true,
    signIn: vi.fn(),
    signInWithGoogle: vi.fn(),
    signUp: vi.fn(),
    signOut: mocks.signOut,
    resetPassword: vi.fn(),
  }),
}))

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({
    success: mocks.success,
    error: mocks.error,
  }),
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: {
    getState: () => ({
      signOut: mocks.signOut,
    }),
    setState: vi.fn(),
  },
}))

vi.mock('@/stores/userFinanceStore', () => ({
  useUserFinanceStore: (selector?: (state: UserFinanceMockState) => unknown) => {
    const state: UserFinanceMockState = {
      init: mocks.initFinance,
      save: mocks.saveFinance,
      liquidCash: 250,
      debts: 75,
      loading: false,
      saving: false,
    }

    return selector ? selector(state) : state
  },
}))

vi.mock('@/services/userPrefsService', () => ({
  DEFAULT_NOTIFICATION_PREFS: {
    maintenanceDaysAhead: 14,
    warrantyDaysAhead: 30,
  },
  getUserNotificationPrefs: mocks.getUserNotificationPrefs,
  saveUserNotificationPrefs: mocks.saveUserNotificationPrefs,
}))

vi.mock('firebase/auth', () => ({
  updateProfile: mocks.updateProfile,
}))

vi.mock('@/services/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'user-1',
      displayName: 'Ana García',
      email: 'ana@example.com',
      photoURL: '',
    },
  },
  db: {},
  storage: {},
}))

import { Settings } from '@/pages/Settings'

describe('Settings asset notification prefs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUserNotificationPrefs.mockResolvedValue({
      maintenanceDaysAhead: 21,
      warrantyDaysAhead: 45,
    })
    mocks.saveUserNotificationPrefs.mockResolvedValue({
      maintenanceDaysAhead: 10,
      warrantyDaysAhead: 20,
    })
  })

  it('loads and saves maintenance/warranty alert thresholds', async () => {
    render(<Settings />)

    await waitFor(() => {
      expect(screen.getByLabelText('Mantenimiento (días antes)')).toHaveValue(21)
      expect(screen.getByLabelText('Garantía (días antes)')).toHaveValue(45)
    })

    fireEvent.change(screen.getByLabelText('Mantenimiento (días antes)'), {
      target: { value: '10' },
    })
    fireEvent.change(screen.getByLabelText('Garantía (días antes)'), {
      target: { value: '20' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar alertas' }))

    await waitFor(() => {
      expect(mocks.saveUserNotificationPrefs).toHaveBeenCalledWith({
        maintenanceDaysAhead: 10,
        warrantyDaysAhead: 20,
      })
    })

    expect(mocks.success).toHaveBeenCalledWith(
      'Preferencias de alertas actualizadas',
      expect.stringContaining('mantenimiento y garantía'),
    )
  })
})
