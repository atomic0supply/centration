import { zodResolver } from '@hookform/resolvers/zod'
import { updateProfile } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { Button, Card, Input } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'
import { auth } from '@/services/firebase'
import { getUserNotificationPrefs, saveUserNotificationPrefs } from '@/services/userPrefsService'
import { useAuthStore } from '@/stores/authStore'
import { useUserFinanceStore } from '@/stores/userFinanceStore'

const profileSchema = z.object({
  displayName: z
    .string()
    .min(1, 'El nombre no puede estar vacío')
    .max(50, 'Máximo 50 caracteres'),
  photoURL: z.string().trim().refine((value) => value === '' || isValidUrl(value), 'URL inválida'),
})

type ProfileData = z.infer<typeof profileSchema>

const userFinanceSchema = z.object({
  liquidCash: z.number().min(0, 'No puede ser negativo'),
  debts: z.number().min(0, 'No puede ser negativo'),
})

type UserFinanceForm = z.infer<typeof userFinanceSchema>

const notificationPrefsSchema = z.object({
  maintenanceDaysAhead: z.number().int().min(0, 'No puede ser negativo'),
  warrantyDaysAhead: z.number().int().min(0, 'No puede ser negativo'),
})

type NotificationPrefsForm = z.infer<typeof notificationPrefsSchema>

const DEFAULT_NOTIFICATION_PREFS_STATE: NotificationPrefsForm = {
  maintenanceDaysAhead: 14,
  warrantyDaysAhead: 30,
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

function getInitials(
  name: string | null | undefined,
  email: string | null | undefined,
): string {
  if (name) {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }
  return (email?.[0] ?? '?').toUpperCase()
}

function parseDaysInput(value: string): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.trunc(parsed))
}

export function Settings() {
  const { user } = useAuth()
  const { success, error } = useToast()
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingNotificationPrefs, setSavingNotificationPrefs] = useState(false)
  const [notificationPrefsLoaded, setNotificationPrefsLoaded] = useState(false)
  const [notificationPrefs, setNotificationPrefs] = useState(DEFAULT_NOTIFICATION_PREFS_STATE)

  const {
    init: initUserFinance,
    save: saveUserFinance,
    liquidCash,
    debts,
    loading: userFinanceLoading,
    saving: userFinanceSaving,
  } = useUserFinanceStore()

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isDirty: profileDirty },
  } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName ?? '',
      photoURL: user?.photoURL ?? '',
    },
  })

  const {
    register: registerFinance,
    handleSubmit: handleFinanceSubmit,
    formState: { errors: financeErrors, isDirty: financeDirty },
    reset: resetFinance,
  } = useForm<UserFinanceForm>({
    resolver: zodResolver(userFinanceSchema),
    defaultValues: {
      liquidCash,
      debts,
    },
  })

  useEffect(() => {
    void initUserFinance()
  }, [initUserFinance])

  useEffect(() => {
    let active = true

    async function loadNotificationPrefs() {
      try {
        const prefs = await getUserNotificationPrefs()
        if (!active) return
        setNotificationPrefs(prefs)
      } catch {
        if (!active) return
        setNotificationPrefs(DEFAULT_NOTIFICATION_PREFS_STATE)
      } finally {
        if (active) {
          setNotificationPrefsLoaded(true)
        }
      }
    }

    void loadNotificationPrefs()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    resetFinance({ liquidCash, debts })
  }, [liquidCash, debts, resetFinance])

  const handleSaveProfile = async (data: ProfileData) => {
    if (!auth.currentUser) return

    setSavingProfile(true)
    try {
      const photoURL = data.photoURL.trim()

      await updateProfile(auth.currentUser, {
        displayName: data.displayName,
        photoURL: photoURL === '' ? null : photoURL,
      })

      useAuthStore.setState({ user: auth.currentUser })
      success('Perfil actualizado', 'Los cambios se guardaron correctamente')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al actualizar perfil'
      error('Error', msg.replace('Firebase: ', ''))
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSaveUserFinance = async (data: UserFinanceForm) => {
    try {
      await saveUserFinance(data)
      success('Finanzas actualizadas', 'Liquidez y deuda guardadas correctamente')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al guardar finanzas'
      error('Error', msg)
    }
  }

  const handleSaveNotificationPrefs = async () => {
    setSavingNotificationPrefs(true)

    try {
      const parsedPrefs = notificationPrefsSchema.parse(notificationPrefs)
      const savedPrefs = await saveUserNotificationPrefs(parsedPrefs)
      setNotificationPrefs(savedPrefs)
      success(
        'Preferencias de alertas actualizadas',
        'Los avisos de mantenimiento y garantía se guardaron correctamente',
      )
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al guardar preferencias'
      error('Error', msg)
    } finally {
      setSavingNotificationPrefs(false)
    }
  }

  const handleSignOut = async () => {
    const signOut = useAuthStore.getState().signOut
    await signOut()
  }

  const initials = getInitials(user?.displayName, user?.email)
  const hasAvatar = Boolean(user?.photoURL)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
        maxWidth: 520,
      }}
    >
      <div>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            marginBottom: 4,
          }}
        >
          Ajustes
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Preferencias y configuración de la cuenta.
        </p>
      </div>

      {/* Avatar + name preview */}
      <Card>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-4)',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              overflow: 'hidden',
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              fontWeight: 700,
              color: 'white',
              flexShrink: 0,
              boxShadow: 'var(--shadow-accent)',
            }}
          >
            {hasAvatar ? (
              <img
                src={user?.photoURL ?? ''}
                alt="Avatar"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              initials
            )}
          </div>
          <div>
            <p
              style={{
                fontWeight: 600,
                fontSize: 15,
                color: 'var(--text-primary)',
              }}
            >
              {user?.displayName ?? '—'}
            </p>
            <p
              style={{
                fontSize: 13,
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {user?.email}
            </p>
          </div>
        </div>
      </Card>

      {/* Profile form */}
      <Card>
        <h2
          style={{
            fontSize: 15,
            fontWeight: 600,
            marginBottom: 'var(--space-5)',
            color: 'var(--text-primary)',
          }}
        >
          Datos del perfil
        </h2>
        <form
          onSubmit={(event) => {
            void handleProfileSubmit(handleSaveProfile)(event)
          }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
          }}
        >
          <Input
            label="Nombre"
            placeholder="Tu nombre"
            error={profileErrors.displayName?.message}
            {...registerProfile('displayName')}
          />
          <Input
            label="URL de avatar"
            placeholder="https://example.com/avatar.png"
            hint="Opcional — deja en blanco para usar iniciales"
            error={profileErrors.photoURL?.message}
            {...registerProfile('photoURL')}
          />
          <Button
            type="submit"
            loading={savingProfile}
            disabled={!profileDirty}
            style={{ alignSelf: 'flex-start' }}
          >
            Guardar cambios
          </Button>
        </form>
      </Card>

      {/* Finance form */}
      <Card>
        <h2
          style={{
            fontSize: 15,
            fontWeight: 600,
            marginBottom: 'var(--space-5)',
            color: 'var(--text-primary)',
          }}
        >
          Liquidez y Deuda
        </h2>
        <form
          onSubmit={(event) => {
            void handleFinanceSubmit(handleSaveUserFinance)(event)
          }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
          }}
        >
          <Input
            type="number"
            step="0.01"
            min="0"
            label="Liquidez disponible (€)"
            placeholder="0"
            error={financeErrors.liquidCash?.message}
            disabled={userFinanceLoading}
            {...registerFinance('liquidCash', { valueAsNumber: true })}
          />
          <Input
            type="number"
            step="0.01"
            min="0"
            label="Deuda total (€)"
            placeholder="0"
            error={financeErrors.debts?.message}
            disabled={userFinanceLoading}
            {...registerFinance('debts', { valueAsNumber: true })}
          />
          <Button
            type="submit"
            loading={userFinanceSaving}
            disabled={userFinanceLoading || !financeDirty}
            style={{ alignSelf: 'flex-start' }}
          >
            Guardar finanzas
          </Button>
        </form>
      </Card>

      <Card>
        <h2
          style={{
            fontSize: 15,
            fontWeight: 600,
            marginBottom: 'var(--space-5)',
            color: 'var(--text-primary)',
          }}
        >
          Alertas de activos
        </h2>
        <p
          style={{
            fontSize: 13,
            color: 'var(--text-muted)',
            marginBottom: 'var(--space-4)',
          }}
        >
          Configura cuántos días antes quieres recibir avisos de mantenimiento y garantía.
        </p>
        <div
          style={{
            display: 'grid',
            gap: 'var(--space-4)',
          }}
        >
          <Input
            type="number"
            min="0"
            step="1"
            label="Mantenimiento (días antes)"
            hint="Valor por defecto: 14"
            disabled={!notificationPrefsLoaded || savingNotificationPrefs}
            value={notificationPrefs.maintenanceDaysAhead}
            onChange={(event) => {
              setNotificationPrefs((current) => ({
                ...current,
                maintenanceDaysAhead: parseDaysInput(event.target.value),
              }))
            }}
          />
          <Input
            type="number"
            min="0"
            step="1"
            label="Garantía (días antes)"
            hint="Valor por defecto: 30"
            disabled={!notificationPrefsLoaded || savingNotificationPrefs}
            value={notificationPrefs.warrantyDaysAhead}
            onChange={(event) => {
              setNotificationPrefs((current) => ({
                ...current,
                warrantyDaysAhead: parseDaysInput(event.target.value),
              }))
            }}
          />
          <Button
            type="button"
            loading={savingNotificationPrefs}
            disabled={!notificationPrefsLoaded}
            onClick={() => {
              void handleSaveNotificationPrefs()
            }}
            style={{ alignSelf: 'flex-start' }}
          >
            Guardar alertas
          </Button>
        </div>
      </Card>

      {/* Account */}
      <Card>
        <h2
          style={{
            fontSize: 15,
            fontWeight: 600,
            marginBottom: 'var(--space-4)',
            color: 'var(--text-primary)',
          }}
        >
          Cuenta
        </h2>
        <p
          style={{
            fontSize: 13,
            color: 'var(--text-muted)',
            marginBottom: 'var(--space-4)',
          }}
        >
          Proveedor: {user?.providerData[0]?.providerId ?? '—'}
        </p>
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            void handleSignOut()
          }}
        >
          Cerrar sesión
        </Button>
      </Card>
    </div>
  )
}
