'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import type { JSX } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { sanitizeNextPath } from '@/lib/app-url'
import { getAccessToken } from '@/lib/auth/client'
import { getOnboardingNextStep, getOnboardingState } from '@/lib/onboarding'

function shouldResolvePostAuthDestination(next: string): boolean {
  return next === '/' || next === '/dashboard' || next === '/onboarding'
}

export default function AuthContinuePage(): JSX.Element {
  return (
    <Suspense fallback={<AuthContinueFallback />}>
      <AuthContinuePageContent />
    </Suspense>
  )
}

function AuthContinuePageContent(): JSX.Element {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedNext = useMemo(
    () => sanitizeNextPath(searchParams.get('next'), '/dashboard'),
    [searchParams],
  )
  const [statusText, setStatusText] = useState('Checking your workspace…')

  useEffect(() => {
    let cancelled = false

    async function resolveDestination() {
      const token = await getAccessToken()
      if (!token) {
        if (!cancelled) {
          router.replace(`/auth?next=${encodeURIComponent(requestedNext)}`)
          router.refresh()
        }
        return
      }

      if (!shouldResolvePostAuthDestination(requestedNext)) {
        if (!cancelled) {
          router.replace(requestedNext)
          router.refresh()
        }
        return
      }

      try {
        if (!cancelled) {
          setStatusText('Preparing your next step…')
        }
        const state = await getOnboardingState(token)
        const destination = getOnboardingNextStep(state) ? '/onboarding' : '/dashboard'
        if (!cancelled) {
          router.replace(destination)
          router.refresh()
        }
      } catch {
        if (!cancelled) {
          router.replace('/dashboard')
          router.refresh()
        }
      }
    }

    void resolveDestination()

    return () => {
      cancelled = true
    }
  }, [requestedNext, router])

  return (
    <LoadingScreen statusText={statusText} />
  )
}

function AuthContinueFallback(): JSX.Element {
  return <LoadingScreen statusText="Preparing your next step…" />
}

function LoadingScreen({ statusText }: { statusText: string }): JSX.Element {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.14),transparent_28%)] px-6 py-12">
      <div className="app-shell-surface w-full max-w-lg rounded-[36px] px-8 py-10 text-center shadow-[0_24px_80px_-32px_rgba(15,23,42,0.28)]">
        <div className="mx-auto h-12 w-12 rounded-2xl bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-100">
          <div className="flex h-full items-center justify-center text-xl">...</div>
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-950">Opening your workspace</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{statusText}</p>
        <div className="mt-8 overflow-hidden rounded-full bg-slate-100">
          <div className="h-2 w-full animate-[loadingSweep_1.4s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-cyan-400" />
        </div>
      </div>
      <style jsx>{`
        @keyframes loadingSweep {
          0% {
            transform: translateX(-72%);
          }
          50% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(72%);
          }
        }
      `}</style>
    </div>
  )
}