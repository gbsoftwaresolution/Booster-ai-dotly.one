'use client'

import type { JSX } from 'react'
import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, Handshake, X } from 'lucide-react'
import { getAccessToken } from '@/lib/supabase/client'
import { apiPost, isApiError } from '@/lib/api'

export const dynamic = 'force-dynamic'

function AcceptInviteContent(): JSX.Element {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<
    'loading' | 'accepting' | 'success' | 'error' | 'unauthenticated'
  >('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('No invite token provided.')
      return
    }

    const checkAuth = async () => {
      const accessToken = await getAccessToken()

      if (!accessToken) {
        setStatus('unauthenticated')
        return
      }

      setStatus('accepting')
      try {
        await apiPost<{ teamId: string }>('/teams/accept-invite', { token }, accessToken)
        setStatus('success')
        setMessage('You have joined the team!')
        setTimeout(() => router.push('/team'), 2000)
      } catch (error: unknown) {
        setStatus('error')
        if (isApiError(error)) {
          if (error.statusCode === 401 || error.statusCode === 403) {
            setStatus('unauthenticated')
            return
          }
          if (error.statusCode === 404 || error.statusCode === 410) {
            setMessage('This invite is invalid or has expired.')
            return
          }
          setMessage(
            error.message || 'We could not accept this invitation right now. Please retry.',
          )
          return
        }
        setMessage('We could not accept this invitation right now. Please retry.')
      }
    }

    void checkAuth()
  }, [token, router])

  if (status === 'loading' || status === 'accepting') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <p className="mt-4 text-sm text-gray-500">
            {status === 'accepting' ? 'Accepting invitation...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    const next = encodeURIComponent(`/team/accept?token=${token ?? ''}`)
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="app-panel w-full max-w-md rounded-[28px] p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50">
            <Handshake className="h-6 w-6 text-brand-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Team Invitation</h1>
          <p className="mt-2 text-sm text-gray-500">
            Sign in or create an account to accept this invitation and join the team.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href={`/auth?next=${next}`}
              className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 text-center"
            >
              Sign In
            </Link>
            <Link
              href={`/auth?mode=signup&next=${next}`}
              className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 text-center"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="app-panel w-full max-w-md rounded-[28px] p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <Check className="h-6 w-6 text-green-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Welcome to the team!</h1>
          <p className="mt-2 text-sm text-gray-500">{message}</p>
          <p className="mt-1 text-xs text-gray-400">Redirecting to your team dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="app-panel w-full max-w-md rounded-[28px] p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
          <X className="h-6 w-6 text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Invalid Invitation</h1>
        <p className="mt-2 text-sm text-gray-500">{message}</p>
        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => router.refresh()}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Retry
          </button>
          <Link
            href="/dashboard"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function AcceptInvitePage(): JSX.Element {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  )
}
