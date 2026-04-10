'use client'

import { useState } from 'react'
import type { JSX } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react'

const DOTLY_AUTH_CALLBACK_URL = 'https://dotly.one/auth/callback'

export default function AuthPage(): JSX.Element {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()
  const next = (() => {
    const raw =
      typeof window !== 'undefined'
        ? (new URLSearchParams(window.location.search).get('next') ?? '/dashboard')
        : '/dashboard'
    return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/dashboard'
  })()

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)
    setLoading(true)

    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${DOTLY_AUTH_CALLBACK_URL}?next=${encodeURIComponent('/settings')}`,
        })
        if (error) throw error
        setSuccessMessage('Password reset link sent — check your email.')
      } else if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push(next)
        router.refresh()
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${DOTLY_AUTH_CALLBACK_URL}?next=${encodeURIComponent(next)}`,
          },
        })
        if (error) throw error
        setSuccessMessage('Check your email to confirm your account.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleAuth() {
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${DOTLY_AUTH_CALLBACK_URL}?next=${encodeURIComponent(next)}`,
      },
    })
    if (error) setError(error.message)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10 sm:px-6 lg:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14),transparent_28%)]"
      />

      <div className="relative grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,460px)] lg:items-center">
        <div className="hidden lg:block">
          <div className="max-w-xl">
            <div className="app-shell-surface inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-sky-700">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
              Premium digital identity for modern teams
            </div>
            <h1 className="mt-6 text-5xl font-extrabold tracking-[-0.04em] text-gray-950 xl:text-6xl">
              Sign in to the cleanest way to share who you are.
            </h1>
            <p className="mt-5 text-lg leading-8 text-gray-600">
              Dotly gives your team polished digital cards, richer follow-up, and better lead
              capture in one workspace that feels fast on desktop and mobile.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                ['Share instantly', 'NFC tap, QR, and branded public cards'],
                ['Track intent', 'See views, saves, clicks, and lead capture'],
                ['Close faster', 'Cards, CRM, scheduling, and follow-up in one place'],
              ].map(([title, desc]) => (
                <div key={title} className="app-panel rounded-[24px] p-4">
                  <p className="text-sm font-semibold text-gray-900">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-gray-500">{desc}</p>
                </div>
              ))}

              <div className="app-panel mt-6 rounded-[28px] p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Everything synced in one place
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Cards, CRM, scheduling, and follow-up stay visually clean and operationally
                      connected.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-md justify-self-center space-y-6">
          <div className="text-center lg:text-left">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-gray-500 backdrop-blur-sm lg:hidden">
              <Sparkles className="h-3.5 w-3.5 text-sky-500" />
              Polished workspace access
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Dotly.one</h2>
            <p className="mt-2 text-sm text-gray-500">
              {mode === 'signin'
                ? 'Sign in to your account'
                : mode === 'signup'
                  ? 'Create a new account'
                  : 'Reset your password'}
            </p>
          </div>

          <div className="app-shell-surface rounded-[32px] p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-2 rounded-2xl bg-slate-50/80 px-4 py-3 text-xs font-medium text-slate-500">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Secure sign-in with Google or email-based authentication
            </div>

            {/* Google OAuth — not shown in reset mode */}
            {mode !== 'reset' && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.32)] transition-all hover:-translate-y-0.5 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                    <path
                      d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
                      fill="#4285F4"
                    />
                    <path
                      d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
                      fill="#34A853"
                    />
                    <path
                      d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-white/90 px-2 text-gray-400">or continue with email</span>
                  </div>
                </div>
              </>
            )}

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="you@example.com"
                />
              </div>

              {mode !== 'reset' && (
                <div>
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    {mode === 'signin' && (
                      <button
                        type="button"
                        onClick={() => {
                          setMode('reset')
                          setError(null)
                          setSuccessMessage(null)
                        }}
                        className="text-xs font-medium text-brand-500 hover:text-brand-600"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input
                    id="password"
                    type="password"
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    required
                    minLength={mode === 'signup' ? 8 : undefined}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'}
                  />
                </div>
              )}

              {error && (
                <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </p>
              )}
              {successMessage && (
                <p className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-600">
                  {successMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-b from-sky-500 to-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_22px_45px_-24px_rgba(14,165,233,0.72)] hover:-translate-y-0.5 hover:brightness-[1.03] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? mode === 'reset'
                    ? 'Sending…'
                    : mode === 'signin'
                      ? 'Signing in…'
                      : 'Creating account…'
                  : mode === 'reset'
                    ? 'Send reset link'
                    : mode === 'signin'
                      ? 'Sign in'
                      : 'Create account'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              {mode === 'reset' ? (
                <>
                  Remembered your password?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin')
                      setError(null)
                      setSuccessMessage(null)
                    }}
                    className="font-medium text-brand-500 hover:text-brand-600"
                  >
                    Sign in
                  </button>
                </>
              ) : mode === 'signin' ? (
                <>
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signup')
                      setError(null)
                      setSuccessMessage(null)
                    }}
                    className="font-medium text-brand-500 hover:text-brand-600"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('signin')
                      setError(null)
                      setSuccessMessage(null)
                    }}
                    className="font-medium text-brand-500 hover:text-brand-600"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
