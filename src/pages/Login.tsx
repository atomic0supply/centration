import { zodResolver } from '@hookform/resolvers/zod'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate } from 'react-router-dom'
import { z } from 'zod'

import { IconGoogle } from '@/components/icons/Icons'
import { Button, GlassmorphismCard, Input, PasswordInput } from '@/components/ui'
import { useToast } from '@/hooks/useToast'
import { useAuthStore } from '@/stores/authStore'

/* ── Schemas ── */
const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})
const registerSchema = loginSchema.extend({
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
})
const resetSchema = z.object({ email: z.string().email('Email inválido') })

type LoginData = z.infer<typeof loginSchema>
type RegisterData = z.infer<typeof registerSchema>
type ResetData = z.infer<typeof resetSchema>
type Tab = 'login' | 'register' | 'reset'

export function Login() {
  const { user, signIn, signUp, signInWithGoogle, resetPassword } = useAuthStore()
  const { success, error } = useToast()
  const [tab, setTab] = useState<Tab>('login')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/dashboard" replace />

  const handleLogin = async (data: LoginData) => {
    setLoading(true)
    try {
      await signIn(data.email, data.password)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al iniciar sesión'
      error('Error al iniciar sesión', msg.replace('Firebase: ', ''))
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (data: RegisterData) => {
    setLoading(true)
    try {
      await signUp(data.email, data.password)
      success('Cuenta creada', 'Bienvenido a Centration')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error al crear cuenta'
      error('Error al crear cuenta', msg.replace('Firebase: ', ''))
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (data: ResetData) => {
    setLoading(true)
    try {
      await resetPassword(data.email)
      success('Correo enviado', 'Revisa tu bandeja de entrada')
      setTab('login')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error'
      error('Error', msg.replace('Firebase: ', ''))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error con Google'
      error('Error con Google', msg.replace('Firebase: ', ''))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100svh',
        background: 'var(--bg-primary)',
        padding: 'var(--space-4)',
      }}
    >
      {/* Background glow */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          top: '20%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(98,0,238,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <GlassmorphismCard
        intensity="medium"
        accentBorder
        style={{ width: '100%', maxWidth: 420, padding: 'var(--space-8)' }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div
            style={{
              display: 'inline-flex',
              width: 48,
              height: 48,
              background: 'var(--accent)',
              borderRadius: 'var(--radius-lg)',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              color: 'white',
              boxShadow: 'var(--shadow-accent)',
              marginBottom: 'var(--space-3)',
            }}
          >
            C
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Centration
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            Tu espacio de vida organizada
          </p>
        </div>

        {/* Tabs */}
        {tab !== 'reset' && (
          <div
            style={{
              display: 'flex',
              background: 'var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              padding: 3,
              marginBottom: 'var(--space-6)',
              gap: 2,
            }}
          >
            {(['login', 'register'] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); }}
                style={{
                  flex: 1,
                  height: 36,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: tab === t ? 'var(--surface)' : 'transparent',
                  color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all var(--transition-base)',
                  boxShadow: tab === t ? 'var(--shadow-sm)' : 'none',
                }}
              >
                {t === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {tab === 'login' && (
            <motion.div key="login" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
              <LoginForm onSubmit={handleLogin} loading={loading} />
              <p style={{ textAlign: 'center', marginTop: 'var(--space-4)', fontSize: 13, color: 'var(--text-muted)' }}>
                <button
                  onClick={() => { setTab('reset'); }}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-light)', cursor: 'pointer', fontSize: 13 }}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </p>
            </motion.div>
          )}
          {tab === 'register' && (
            <motion.div key="register" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
              <RegisterForm onSubmit={handleRegister} loading={loading} />
            </motion.div>
          )}
          {tab === 'reset' && (
            <motion.div key="reset" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 'var(--space-5)' }}>
                Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
              </p>
              <ResetForm onSubmit={handleReset} loading={loading} />
              <p style={{ textAlign: 'center', marginTop: 'var(--space-4)', fontSize: 13, color: 'var(--text-muted)' }}>
                <button
                  onClick={() => { setTab('login'); }}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-light)', cursor: 'pointer', fontSize: 13 }}
                >
                  ← Volver al inicio de sesión
                </button>
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Divider + Google */}
        {tab !== 'reset' && (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                margin: 'var(--space-5) 0',
              }}
            >
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>o continúa con</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            <Button
              variant="ghost"
              fullWidth
              onClick={() => void handleGoogle()}
              loading={loading}
              style={{ gap: 'var(--space-3)' }}
            >
              <IconGoogle size={18} />
              Google
            </Button>
          </>
        )}
      </GlassmorphismCard>
    </div>
  )
}

/* ── Sub-forms ── */
function LoginForm({ onSubmit, loading }: { onSubmit: (d: LoginData) => void; loading: boolean }) {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  })
  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <Input label="Email" type="email" placeholder="tu@email.com" error={errors.email?.message} {...register('email')} />
      <PasswordInput label="Contraseña" placeholder="••••••••" error={errors.password?.message} {...register('password')} />
      <Button type="submit" fullWidth loading={loading} style={{ marginTop: 4 }}>
        Iniciar sesión
      </Button>
    </form>
  )
}

function RegisterForm({ onSubmit, loading }: { onSubmit: (d: RegisterData) => void; loading: boolean }) {
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
  })
  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <Input label="Email" type="email" placeholder="tu@email.com" error={errors.email?.message} {...register('email')} />
      <PasswordInput label="Contraseña" placeholder="••••••••" error={errors.password?.message} {...register('password')} />
      <PasswordInput label="Confirmar contraseña" placeholder="••••••••" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
      <Button type="submit" fullWidth loading={loading} style={{ marginTop: 4 }}>
        Crear cuenta
      </Button>
    </form>
  )
}

function ResetForm({ onSubmit, loading }: { onSubmit: (d: ResetData) => void; loading: boolean }) {
  const { register, handleSubmit, formState: { errors } } = useForm<ResetData>({
    resolver: zodResolver(resetSchema),
  })
  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <Input label="Email" type="email" placeholder="tu@email.com" error={errors.email?.message} {...register('email')} />
      <Button type="submit" fullWidth loading={loading}>
        Enviar enlace
      </Button>
    </form>
  )
}
