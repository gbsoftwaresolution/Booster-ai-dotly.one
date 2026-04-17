'use client'

import { useEffect, useState } from 'react'
import type { JSX } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiPost } from '@/lib/api'

export default function ConfirmEmailChangePage(): JSX.Element {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Confirming your new email address...')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('This email change link is invalid.')
      return
    }

    void (async () => {
      try {
        await apiPost('/auth/confirm-email-change', { token })
        setStatus('success')
        setMessage('Your email address has been updated successfully.')
      } catch (err) {
        setStatus('error')
        setMessage(err instanceof Error ? err.message : 'Could not confirm your new email.')
      }
    })()
  }, [token])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-sm text-center">
        <h1 className="text-2xl font-semibold text-gray-950">Confirm email change</h1>
        <p className="mt-4 text-sm text-gray-600">{message}</p>
        {status !== 'loading' ? (
          <button
            type="button"
            onClick={() => {
              router.push(status === 'success' ? '/settings' : '/auth')
              router.refresh()
            }}
            className="mt-6 w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white"
          >
            {status === 'success' ? 'Go to settings' : 'Back to sign in'}
          </button>
        ) : null}
      </div>
    </div>
  )
}
