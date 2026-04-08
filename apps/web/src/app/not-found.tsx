import Link from 'next/link'
import type { JSX } from 'react'

export default function NotFound(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 text-center">
      <div className="space-y-4">
        <h1 className="text-6xl font-bold text-brand-500">404</h1>
        <h2 className="text-2xl font-semibold text-gray-900">Page not found</h2>
        <p className="text-gray-500">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
