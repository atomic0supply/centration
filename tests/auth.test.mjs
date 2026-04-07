/**
 * 1.3.7 — Auth tests
 *
 * These tests run with `node --test` (no transpiler, no DOM).
 * They validate the structural contracts of the auth layer:
 * file existence, exported APIs, schema rules, and route guard logic.
 */

import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = new URL('../', import.meta.url)
const src = (rel) => fileURLToPath(new URL(`src/${rel}`, root))
const read = (rel) => readFileSync(src(rel), 'utf8')

/* ── File existence ── */
test('auth files exist', () => {
  const required = [
    'stores/authStore.ts',
    'hooks/useAuth.ts',
    'hooks/useToast.ts',
    'pages/Login.tsx',
    'pages/Settings.tsx',
    'components/layout/ProtectedRoute.tsx',
    'services/firebase.ts',
  ]
  for (const file of required) {
    assert.ok(existsSync(src(file)), `Missing: src/${file}`)
  }
})

/* ── authStore contract ── */
test('authStore exports signIn, signUp, signOut, resetPassword, signInWithGoogle', () => {
  const store = read('stores/authStore.ts')
  for (const fn of ['signIn', 'signUp', 'signOut', 'resetPassword', 'signInWithGoogle']) {
    assert.match(store, new RegExp(fn), `authStore missing: ${fn}`)
  }
})

test('authStore tracks user, loading, initialized', () => {
  const store = read('stores/authStore.ts')
  assert.match(store, /user/, 'authStore missing: user')
  assert.match(store, /loading/, 'authStore missing: loading')
  assert.match(store, /initialized/, 'authStore missing: initialized')
})

test('authStore uses onAuthStateChanged for persistence', () => {
  const store = read('stores/authStore.ts')
  assert.match(store, /onAuthStateChanged/, 'authStore missing onAuthStateChanged listener')
})

/* ── useAuth hook ── */
test('useAuth hook re-exports all auth actions and state', () => {
  const hook = read('hooks/useAuth.ts')
  for (const token of ['user', 'loading', 'initialized', 'signIn', 'signUp', 'signOut', 'resetPassword', 'signInWithGoogle']) {
    assert.match(hook, new RegExp(token), `useAuth missing: ${token}`)
  }
})

test('useAuth hook uses useAuthStore', () => {
  const hook = read('hooks/useAuth.ts')
  assert.match(hook, /useAuthStore/, 'useAuth should delegate to useAuthStore')
})

/* ── ProtectedRoute (route guard) ── */
test('ProtectedRoute redirects unauthenticated users to /login', () => {
  const route = read('components/layout/ProtectedRoute.tsx')
  assert.match(route, /\/login/, 'ProtectedRoute should redirect to /login')
  assert.match(route, /Navigate/, 'ProtectedRoute should use Navigate for redirect')
})

test('ProtectedRoute waits for auth initialization before redirecting', () => {
  const route = read('components/layout/ProtectedRoute.tsx')
  assert.match(route, /initialized/, 'ProtectedRoute should check initialized state')
})

test('ProtectedRoute renders Outlet when user is authenticated', () => {
  const route = read('components/layout/ProtectedRoute.tsx')
  assert.match(route, /Outlet/, 'ProtectedRoute should render Outlet for authenticated users')
})

/* ── Login page ── */
test('Login page has email + password form with Zod validation', () => {
  const login = read('pages/Login.tsx')
  assert.match(login, /z\.object/, 'Login should use Zod schemas')
  assert.match(login, /zodResolver/, 'Login should use zodResolver with react-hook-form')
  assert.match(login, /email/, 'Login form should have email field')
  assert.match(login, /password/, 'Login form should have password field')
})

test('Login page handles register tab with confirmPassword validation', () => {
  const login = read('pages/Login.tsx')
  assert.match(login, /confirmPassword/, 'Register form should validate confirmPassword')
  assert.match(login, /refine/, 'Register schema should use .refine() for password match')
})

test('Login page handles password reset via sendPasswordResetEmail', () => {
  const login = read('pages/Login.tsx')
  assert.match(login, /resetPassword/, 'Login should expose password reset flow')
})

test('Login page redirects authenticated users to dashboard', () => {
  const login = read('pages/Login.tsx')
  assert.match(login, /Navigate/, 'Login should redirect authenticated users')
  assert.match(login, /dashboard/, 'Login redirect target should be /dashboard')
})

test('Login page includes Google sign-in', () => {
  const login = read('pages/Login.tsx')
  assert.match(login, /signInWithGoogle/, 'Login should support Google OAuth')
})

/* ── Settings / profile page ── */
test('Settings page renders profile editing form', () => {
  const settings = read('pages/Settings.tsx')
  assert.match(settings, /displayName/, 'Settings should allow editing displayName')
  assert.match(settings, /updateProfile/, 'Settings should call Firebase updateProfile')
})

test('Settings page has sign-out action', () => {
  const settings = read('pages/Settings.tsx')
  assert.match(settings, /signOut/, 'Settings should expose signOut action')
})

/* ── Firebase service ── */
test('firebase service configures auth with local persistence', () => {
  const firebase = read('services/firebase.ts')
  assert.match(firebase, /browserLocalPersistence/, 'Auth should use local persistence')
  assert.match(firebase, /ensureAuthPersistence/, 'Should export ensureAuthPersistence')
})

/* ── Router ── */
test('App router protects all app routes under ProtectedRoute', () => {
  const app = read('App.tsx')
  assert.match(app, /ProtectedRoute/, 'App should use ProtectedRoute')
  assert.match(app, /\/login/, 'App should define public /login route')
  assert.match(app, /\/dashboard/, 'App should define /dashboard route')
})
