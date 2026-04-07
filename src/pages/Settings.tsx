import { updateProfile } from 'firebase/auth'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button, Card, Input } from '@/components/ui'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'
import { auth } from '@/services/firebase'

const profileSchema = z.object({
  displayName: z.string().min(1, 'El nombre no puede estar vacío').max(50, 'Máximo 50 caracteres'),
  photoURL: z.string().url('URL inválida').or(z.literal('')),
})
type ProfileData = z.infer<typeof profileSchema>

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
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

export function Settings() {
  const { user } = useAuth()
  const { success, error } = useToast()
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<ProfileData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName ?? '',
      photoURL: user?.photoURL ?? '',
    },
  })

  const handleSaveProfile = async (data: ProfileData) => {
    if (!auth.currentUser) return
    setSaving(true)
    try {
      await updateProfile(auth.currentUser, {
        displayName: data.displayName,
        photoURL: data.photoURL || null,
      })
      // Refresh the store state so the header/avatar updates
      useAuthStore.setState({ user: auth.currentUser })
      success('Perfil actualizado', 'Los cambios se guardaron correctamente')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al actualizar perfil'
      error('Error', msg.replace('Firebase: ', ''))
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    const signOut = useAuthStore.getState().signOut
    await signOut()
  }

  const initials = getInitials(user?.displayName, user?.email)
  const hasAvatar = Boolean(user?.photoURL)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', maxWidth: 520 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
          Ajustes
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Preferencias y configuración de la cuenta.
        </p>
      </div>

      {/* Avatar + name preview */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
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
                src={user!.photoURL!}
                alt="Avatar"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              initials
            )}
          </div>
          <div>
            <p style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>
              {user?.displayName || '—'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {user?.email}
            </p>
          </div>
        </div>
      </Card>

      {/* Profile form */}
      <Card>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 'var(--space-5)', color: 'var(--text-primary)' }}>
          Datos del perfil
        </h2>
        <form
          onSubmit={handleSubmit(handleSaveProfile)}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
        >
          <Input
            label="Nombre"
            placeholder="Tu nombre"
            error={errors.displayName?.message}
            {...register('displayName')}
          />
          <Input
            label="URL de avatar"
            placeholder="https://example.com/avatar.png"
            hint="Opcional — deja en blanco para usar iniciales"
            error={errors.photoURL?.message}
            {...register('photoURL')}
          />
          <Button
            type="submit"
            loading={saving}
            disabled={!isDirty}
            style={{ alignSelf: 'flex-start' }}
          >
            Guardar cambios
          </Button>
        </form>
      </Card>

      {/* Account */}
      <Card>
        <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 'var(--space-4)', color: 'var(--text-primary)' }}>
          Cuenta
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
          Proveedor: {user?.providerData?.[0]?.providerId ?? '—'}
        </p>
        <Button variant="danger" size="sm" onClick={() => void handleSignOut()}>
          Cerrar sesión
        </Button>
      </Card>
    </div>
  )
}
