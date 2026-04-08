import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('userFinanceService', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('returns defaults when there is no authenticated user', async () => {
    const getDoc = vi.fn()

    vi.doMock('firebase/firestore', () => ({
      doc: vi.fn(),
      getDoc,
      setDoc: vi.fn(),
      Timestamp: { now: vi.fn(() => 'NOW_TS') },
    }))

    vi.doMock('@/services/firebase', () => ({
      auth: { currentUser: null },
      db: {},
    }))

    const { DEFAULT_USER_FINANCE, getUserFinance } = await import('@/services/userFinanceService')
    const result = await getUserFinance()

    expect(result).toEqual(DEFAULT_USER_FINANCE)
    expect(getDoc).not.toHaveBeenCalled()
  })

  it('returns defaults when user document has missing/invalid values', async () => {
    const getDoc = vi.fn().mockResolvedValue({
      exists: () => true,
      data: () => ({ liquidCash: 'abc', debts: Number.NaN }),
    })

    vi.doMock('firebase/firestore', () => ({
      doc: vi.fn(() => ({ path: 'users/user-1' })),
      getDoc,
      setDoc: vi.fn(),
      Timestamp: { now: vi.fn(() => 'NOW_TS') },
    }))

    vi.doMock('@/services/firebase', () => ({
      auth: { currentUser: { uid: 'user-1' } },
      db: {},
    }))

    const { getUserFinance } = await import('@/services/userFinanceService')
    const result = await getUserFinance()

    expect(result).toEqual({ liquidCash: 0, debts: 0 })
    expect(getDoc).toHaveBeenCalledTimes(1)
  })

  it('persists liquidCash/debts using merge=true and returns sanitized values', async () => {
    const docRef = { path: 'users/user-1' }
    const doc = vi.fn(() => docRef)
    const setDoc = vi.fn().mockResolvedValue(undefined)
    const now = vi.fn(() => 'NOW_TS')

    vi.doMock('firebase/firestore', () => ({
      doc,
      getDoc: vi.fn(),
      setDoc,
      Timestamp: { now },
    }))

    vi.doMock('@/services/firebase', () => ({
      auth: { currentUser: { uid: 'user-1' } },
      db: {},
    }))

    const { saveUserFinance } = await import('@/services/userFinanceService')
    const result = await saveUserFinance({ liquidCash: 350.5, debts: Number.NaN })

    expect(result).toEqual({ liquidCash: 350.5, debts: 0 })
    expect(doc).toHaveBeenCalledWith(expect.anything(), 'users', 'user-1')
    expect(now).toHaveBeenCalledTimes(1)
    expect(setDoc).toHaveBeenCalledWith(
      docRef,
      expect.objectContaining({
        uid: 'user-1',
        liquidCash: 350.5,
        debts: 0,
        updatedAt: 'NOW_TS',
      }),
      { merge: true },
    )
  })
})

describe('userFinanceStore', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('init loads defaults and save updates local state using service response', async () => {
    const getUserFinance = vi.fn().mockResolvedValue({ liquidCash: 0, debts: 0 })
    const saveUserFinance = vi.fn().mockResolvedValue({ liquidCash: 500, debts: 120 })

    vi.doMock('@/services/userFinanceService', () => ({
      DEFAULT_USER_FINANCE: { liquidCash: 0, debts: 0 },
      getUserFinance,
      saveUserFinance,
    }))

    const { useUserFinanceStore } = await import('@/stores/userFinanceStore')

    expect(useUserFinanceStore.getState().liquidCash).toBe(0)
    expect(useUserFinanceStore.getState().debts).toBe(0)

    await useUserFinanceStore.getState().init()
    expect(getUserFinance).toHaveBeenCalledTimes(1)
    expect(useUserFinanceStore.getState().liquidCash).toBe(0)
    expect(useUserFinanceStore.getState().debts).toBe(0)

    await useUserFinanceStore.getState().save({ liquidCash: 500, debts: 120 })
    expect(saveUserFinance).toHaveBeenCalledWith({ liquidCash: 500, debts: 120 })
    expect(useUserFinanceStore.getState().liquidCash).toBe(500)
    expect(useUserFinanceStore.getState().debts).toBe(120)
  })
})
