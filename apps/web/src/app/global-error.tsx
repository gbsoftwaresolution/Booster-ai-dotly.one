'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps): JSX.Element {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Something went wrong</h2>
          <p className="max-w-md text-sm text-gray-500">
            An unexpected error occurred. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
