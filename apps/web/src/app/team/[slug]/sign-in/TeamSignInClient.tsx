'use client'

import { useState } from 'react'
import type { JSX } from 'react'
import Image from 'next/image'
import { getAuthCallbackUrl } from '@/lib/app-url'
import { apiGet } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface TeamBrandData {
  id: string
  name: string
  slug: string
  brandName: string | null
  brandLogoUrl: string | null
  brandColor: string | null
}

interface TeamSignInClientProps {
  team: TeamBrandData
}

export function TeamSignInClient({ team }: TeamSignInClientProps): JSX.Element {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const brandColor = team.brandColor ?? '#0ea5e9'
  const displayName = team.brandName ?? team.name
  const teamNext = `/team/${team.slug}/sign-in`

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return

    const trimmedEmail = email.trim().toLowerCase()
    const nextFieldErrors: { email?: string; password?: string } = {}

    if (!trimmedEmail) {
      nextFieldErrors.email = 'Email address is required.'
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      nextFieldErrors.email = 'Enter a valid email address.'
    }

    if (!password) {
      nextFieldErrors.password = 'Password is required.'
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      setError('Fix the highlighted fields before continuing.')
      return
    }

    setFieldErrors({})
    setError(null)
    setLoading(true)
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      })
      if (authError) throw authError
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      await apiGet(`/teams/${team.id}`, token)
      router.push(teamNext)
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleAuth() {
    setError(null)
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${getAuthCallbackUrl()}?next=${encodeURIComponent(teamNext)}`,
      },
    })
    if (authError) setError(authError.message)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Team branding */}
        <div className="text-center">
          {team.brandLogoUrl ? (
            <Image
              src={team.brandLogoUrl}
              alt={`${displayName} logo`}
              width={200}
              height={48}
              className="mx-auto mb-4 h-12 w-auto object-contain"
            />
          ) : (
            <div
              className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-white font-bold text-xl"
              style={{ backgroundColor: brandColor }}
            >
              {displayName[0]?.toUpperCase() ?? 'T'}
            </div>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Sign in to {displayName}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Use your account to access {displayName} workspace
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          {/* Color accent bar */}
          <div className="mb-6 h-1 rounded-full" style={{ backgroundColor: brandColor }} />

          {/* Google OAuth */}
          <button
            type="button"
            onClick={() => void handleGoogleAuth()}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
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
              <span className="bg-white px-2 text-gray-400">or continue with email</span>
            </div>
          </div>

          {/* Email/password form */}
          <form onSubmit={(e) => void handleSignIn(e)} className="space-y-4">
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
                onChange={(e) => {
                  setEmail(e.target.value)
                  setFieldErrors((prev) => ({ ...prev, email: undefined }))
                }}
                aria-invalid={fieldErrors.email ? 'true' : 'false'}
                aria-describedby={fieldErrors.email ? 'team-signin-email-error' : undefined}
                className={`mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 ${fieldErrors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-300 focus:border-sky-500 focus:ring-sky-500'}`}
                placeholder="you@example.com"
              />
              {fieldErrors.email && (
                <p id="team-signin-email-error" className="mt-1 text-xs text-red-600">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setFieldErrors((prev) => ({ ...prev, password: undefined }))
                }}
                aria-invalid={fieldErrors.password ? 'true' : 'false'}
                aria-describedby={fieldErrors.password ? 'team-signin-password-error' : undefined}
                className={`mt-1 block w-full rounded-lg border px-3 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-1 ${fieldErrors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-300 focus:border-sky-500 focus:ring-sky-500'}`}
                placeholder="••••••••"
              />
              {fieldErrors.password && (
                <p id="team-signin-password-error" className="mt-1 text-xs text-red-600">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50 transition-opacity"
              style={{ backgroundColor: brandColor }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Not a member of {displayName}?{' '}
            <a
              href={`/auth?next=${encodeURIComponent(teamNext)}`}
              className="font-medium text-sky-500 hover:text-sky-600"
            >
              Sign in with your account
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
