'use client'

import type { JSX } from 'react'
import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function DashboardError({ error, reset }: ErrorProps): JSX.Element {
  useEffect(() => {
    // L-1: Report to Sentry instead of console.error (see apps/web/src/app/error.tsx)
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-xl font-bold text-gray-900">Something went wrong</h2>
      <p className="max-w-sm text-sm text-gray-500">
        {error.message ?? 'An unexpected error occurred. Please try again.'}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
      >
        Try again
      </button>
    </div>
  )
}
