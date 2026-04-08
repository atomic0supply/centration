import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'

import type { AssetAlertPreferences } from '@/types/assets'
import { DEFAULT_ASSET_ALERT_PREFERENCES } from '@/types/assets'

import { auth, db } from './firebase'

const USERS_COLLECTION = 'users'

function getCurrentUid(): string {
  const uid = auth.currentUser?.uid
  if (!uid) {
    throw new Error('Usuario no autenticado')
  }
  return uid
}

function normalizeDays(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  return value >= 0 ? Math.floor(value) : fallback
}

function normalizeAssetAlertPreferences(data: Record<string, unknown> | undefined): AssetAlertPreferences {
  return {
    maintenanceDaysAhead: normalizeDays(
      data?.maintenanceDaysAhead,
      DEFAULT_ASSET_ALERT_PREFERENCES.maintenanceDaysAhead,
    ),
    warrantyDaysAhead: normalizeDays(
      data?.warrantyDaysAhead,
      DEFAULT_ASSET_ALERT_PREFERENCES.warrantyDaysAhead,
    ),
  }
}

export async function getAssetAlertPreferences(): Promise<AssetAlertPreferences> {
  const uid = getCurrentUid()
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid))

  if (!snap.exists()) {
    return { ...DEFAULT_ASSET_ALERT_PREFERENCES }
  }

  const data = snap.data() as Record<string, unknown>
  const notificationPrefs = data.notificationPrefs as Record<string, unknown> | undefined
  return normalizeAssetAlertPreferences(notificationPrefs)
}

export async function saveAssetAlertPreferences(
  input: Partial<AssetAlertPreferences>,
): Promise<AssetAlertPreferences> {
  const uid = getCurrentUid()
  const current = await getAssetAlertPreferences()
  const next: AssetAlertPreferences = {
    maintenanceDaysAhead: normalizeDays(
      input.maintenanceDaysAhead ?? current.maintenanceDaysAhead,
      DEFAULT_ASSET_ALERT_PREFERENCES.maintenanceDaysAhead,
    ),
    warrantyDaysAhead: normalizeDays(
      input.warrantyDaysAhead ?? current.warrantyDaysAhead,
      DEFAULT_ASSET_ALERT_PREFERENCES.warrantyDaysAhead,
    ),
  }

  await setDoc(
    doc(db, USERS_COLLECTION, uid),
    {
      notificationPrefs: next,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )

  return next
}

export {
  getAssetAlertPreferences as getUserNotificationPrefs,
  saveAssetAlertPreferences as saveUserNotificationPrefs,
}
