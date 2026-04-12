'use client'

import type { JSX } from 'react'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getPublicApiUrl } from '@/lib/public-env'
import { XCircle, CheckCircle, AlertCircle } from 'lucide-react'

const API_URL = getPublicApiUrl()

// ── Types ─────────────────────────────────────────────────────────────────────

interface BookingInfo {
  id: string
  startAt: string
  endAt: string
  guestName: string
  guestEmail: string
  token: string
  status: string
  appointmentType: {
    id: string
    name: string
    durationMins: number
    color: string
    location: string | null
    timezone: string
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDateTime(iso: string, tz: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: tz || 'UTC',
  })
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CancelBookingPage(): JSX.Element {
  const params = useParams() as { token: string }
  const { token } = params

  const guestTz = Intl.DateTimeFormat().resolvedOptions().timeZone

  // Booking info state
  const [bookingInfo, setBookingInfo] = useState<BookingInfo | null>(null)
  const [infoLoading, setInfoLoading] = useState(true)
  const [alreadyCancelled, setAlreadyCancelled] = useState(false)
  const [infoError, setInfoError] = useState<string | null>(null)
  const [infoReloadToken, setInfoReloadToken] = useState(0)

  // Cancellation form state
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch booking info on mount
  useEffect(() => {
    async function loadInfo() {
      setInfoLoading(true)
      setInfoError(null)
      setAlreadyCancelled(false)
      setBookingInfo(null)
      try {
        const res = await fetch(`${API_URL}/scheduling/bookings/${token}/info`)
        if (!res.ok) throw new Error(`Could not load booking (${res.status})`)
        const data = (await res.json()) as BookingInfo
        if (data.status === 'CANCELLED') {
          setAlreadyCancelled(true)
        } else {
          setBookingInfo(data)
        }
      } catch (e) {
        setInfoError(e instanceof Error ? e.message : 'Failed to load booking')
      } finally {
        setInfoLoading(false)
      }
    }
    void loadInfo()
  }, [infoReloadToken, token])

  async function handleCancel(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`${API_URL}/scheduling/bookings/${token}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as Record<string, unknown>
        throw new Error(typeof err['message'] === 'string' ? err['message'] : `Error ${res.status}`)
      }
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cancellation failed')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render: loading ───────────────────────────────────────────────────────────

  if (infoLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-200 border-t-red-500" />
      </div>
    )
  }

  // ── Render: info fetch error ──────────────────────────────────────────────────

  if (infoError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8 text-center">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h2 className="text-xl font-bold text-gray-900">Unable to load booking</h2>
          <p className="mt-2 text-sm text-gray-500">{infoError}</p>
          <button
            type="button"
            onClick={() => setInfoReloadToken((current) => current + 1)}
            className="mt-6 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
        <p className="mt-6 text-xs text-gray-400">
          Powered by{' '}
          <a href="https://dotly.one" className="hover:underline">
            Dotly.one
          </a>
        </p>
      </div>
    )
  }

  // ── Render: already cancelled ─────────────────────────────────────────────────

  if (alreadyCancelled) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8 text-center">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
              <AlertCircle className="h-10 w-10 text-amber-500" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Already Cancelled</h2>
          <p className="mt-2 text-sm text-gray-500">
            This booking has already been cancelled. No further action is needed.
          </p>
        </div>
        <p className="mt-6 text-xs text-gray-400">
          Powered by{' '}
          <a href="https://dotly.one" className="hover:underline">
            Dotly.one
          </a>
        </p>
      </div>
    )
  }

  // ── Render: success ───────────────────────────────────────────────────────────

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8 text-center">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Booking Cancelled</h2>
          <p className="mt-2 text-gray-500">
            Your booking has been cancelled successfully. The host has been notified.
          </p>
        </div>
        <p className="mt-6 text-xs text-gray-400">
          Powered by{' '}
          <a href="https://dotly.one" className="hover:underline">
            Dotly.one
          </a>
        </p>
      </div>
    )
  }

  // ── Render: cancellation form ─────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
        <div className="mb-6 flex flex-col items-center text-center">
          <XCircle className="mb-3 h-12 w-12 text-red-500" />
          <h2 className="text-xl font-bold text-gray-900">Cancel Booking</h2>
          <p className="mt-1 text-sm text-gray-500">
            Are you sure you want to cancel this appointment?
          </p>
        </div>

        {/* Booking context */}
        {bookingInfo && (
          <div className="mb-5 rounded-xl bg-gray-50 px-4 py-3 text-sm ring-1 ring-gray-100">
            <p className="font-semibold text-gray-800">{bookingInfo.appointmentType.name}</p>
            <p className="mt-0.5 text-gray-500">
              {bookingInfo.appointmentType.durationMins} min
              {bookingInfo.appointmentType.location
                ? ` · ${bookingInfo.appointmentType.location}`
                : ''}
            </p>
            <p className="mt-1 text-gray-600">{formatDateTime(bookingInfo.startAt, guestTz)}</p>
            <p className="mt-0.5 text-gray-500">Guest: {bookingInfo.guestName}</p>
          </div>
        )}

        <form onSubmit={(e) => void handleCancel(e)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Reason (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-red-400 focus:outline-none"
              placeholder="Let your host know why you're cancelling…"
            />
          </div>
          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
            </div>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {submitting ? 'Cancelling…' : 'Yes, Cancel Booking'}
          </button>
          {/* LOW-2: Use a button that calls history.back() rather than
              an <a href="/"> which sends the user to the homepage. */}
          <button
            type="button"
            onClick={() => window.history.back()}
            className="block w-full rounded-xl border border-gray-200 py-3 text-center text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Keep my booking
          </button>
        </form>
      </div>
      <p className="mt-6 text-xs text-gray-400">
        Powered by{' '}
        <a href="https://dotly.one" className="hover:underline">
          Dotly.one
        </a>
      </p>
    </div>
  )
}
