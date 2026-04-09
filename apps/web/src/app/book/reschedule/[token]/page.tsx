'use client'

import type { JSX } from 'react'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Calendar, Clock, CheckCircle, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

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

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(iso: string, tz: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: tz || 'UTC',
  })
}

function isoDate(d: Date): string {
  // HIGH-4: Calendar cells are built as local-midnight Dates (new Date(y, m, d)).
  // Use local getters so the string matches the date visible on screen.
  // UTC getters would shift the date for UTC+ users (e.g. April 1 local midnight
  // in UTC+5:30 = March 31 18:30 UTC → getUTCDate() returns 31).
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}

export default function ReschedulePage(): JSX.Element {
  const params = useParams() as { token: string }
  const { token } = params

  // Step 1: pick slot  Step 2: confirmed
  const [step, setStep] = useState<'pick' | 'done' | 'error'>('pick')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Booking info (to display name / apt name)
  const [bookingInfo, setBookingInfo] = useState<BookingInfo | null>(null)
  const [infoLoading, setInfoLoading] = useState(true)

  // HIGH-4: Use local-time today to match local-midnight calendar cells.
  const todayLocal = new Date()
  const todayIso = isoDate(todayLocal)
  const [selectedDate, setSelectedDate] = useState<Date>(
    new Date(todayLocal.getFullYear(), todayLocal.getMonth(), todayLocal.getDate()),
  )
  const [calOffset, setCalOffset] = useState(0) // months offset from today
  const [slots, setSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState<string | null>(null)
  const [slotRetry, setSlotRetry] = useState(0)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [ownerTz, setOwnerTz] = useState('UTC')
  const guestTz = Intl.DateTimeFormat().resolvedOptions().timeZone

  // Fetch booking info via a public endpoint that returns booking details by token
  useEffect(() => {
    async function loadInfo() {
      setInfoLoading(true)
      try {
        const res = await fetch(`${API_URL}/scheduling/bookings/${token}/info`)
        if (!res.ok) throw new Error(`Could not load booking (${res.status})`)
        const data = (await res.json()) as BookingInfo
        // Guard: don't allow rescheduling a cancelled booking
        if (data.status === 'CANCELLED') {
          setErrorMsg('This booking has already been cancelled and cannot be rescheduled.')
          setStep('error')
          return
        }
        setBookingInfo(data)
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : 'Failed to load booking')
        setStep('error')
      } finally {
        setInfoLoading(false)
      }
    }
    void loadInfo()
  }, [token])

  // Load slots when date changes
  useEffect(() => {
    if (!bookingInfo) return
    void (async () => {
      setSlotsLoading(true)
      setSlots([])
      setSlotsError(null)
      setSelectedSlot(null)
      try {
        const dateStr = isoDate(selectedDate)
        // FIX-A: use token-based slot endpoint — avoids exposing ownerUserId/aptId
        const res = await fetch(
          `${API_URL}/scheduling/bookings/${token}/slots?date=${dateStr}&tz=${encodeURIComponent(guestTz)}`,
        )
        if (!res.ok) throw new Error(`Error ${res.status}`)
        const data = (await res.json()) as { slots: string[]; ownerTimezone: string }
        setSlots(data.slots ?? [])
        setOwnerTz(data.ownerTimezone ?? bookingInfo.appointmentType.timezone ?? 'UTC')
      } catch (e) {
        // MED-3: Surface the error instead of silently showing empty state
        setSlotsError(e instanceof Error ? e.message : 'Failed to load available times')
      } finally {
        setSlotsLoading(false)
      }
    })()
  }, [selectedDate, bookingInfo, guestTz, token, slotRetry])

  async function handleConfirm() {
    if (!selectedSlot) return
    setSubmitting(true)
    setErrorMsg(null)
    try {
      const res = await fetch(`${API_URL}/scheduling/bookings/${token}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startAt: selectedSlot }),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as Record<string, unknown>
        throw new Error(typeof err['message'] === 'string' ? err['message'] : `Error ${res.status}`)
      }
      setStep('done')
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to reschedule')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Calendar header ──────────────────────────────────────────────────────────

  const viewMonth = new Date(todayLocal.getFullYear(), todayLocal.getMonth() + calOffset, 1)
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate()
  const firstDow = viewMonth.getDay() // 0=Sun

  function handleDayClick(day: number) {
    const d = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)
    // HIGH-4: compare ISO strings (local-based) not Date objects to avoid off-by-one
    if (isoDate(d) < todayIso) return
    setSelectedDate(d)
  }

  // ── Render guards ─────────────────────────────────────────────────────────────

  if (infoLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
      </div>
    )
  }

  if (step === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8 text-center">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h2 className="text-xl font-bold text-gray-900">Unable to load booking</h2>
          <p className="mt-2 text-sm text-gray-500">{errorMsg}</p>
        </div>
      </div>
    )
  }

  if (step === 'done') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8 text-center">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Booking Rescheduled!</h2>
          <p className="mt-2 text-gray-500">
            Your appointment has been moved to{' '}
            <strong>{selectedSlot ? formatTime(selectedSlot, guestTz) : ''}</strong> on{' '}
            <strong>{formatDate(selectedDate)}</strong>. A confirmation email with an updated
            calendar invite has been sent.
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

  return (
    <div className="flex min-h-screen flex-col items-center bg-gray-50 p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 mb-3">
            <Calendar className="h-6 w-6 text-sky-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Reschedule Appointment</h1>
          {bookingInfo && (
            <p className="mt-1 text-gray-500">
              <span className="font-medium text-gray-700">{bookingInfo.appointmentType.name}</span>
              {' · '}
              {bookingInfo.appointmentType.durationMins} min
            </p>
          )}
          {bookingInfo && (
            <p className="mt-1 text-sm text-gray-400">
              Current time:{' '}
              {new Date(bookingInfo.startAt).toLocaleString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                timeZone: guestTz,
              })}
            </p>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Calendar */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={() => setCalOffset((o) => o - 1)}
                disabled={calOffset <= 0}
                className="rounded-lg p-1.5 hover:bg-gray-100 disabled:opacity-40"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-5 w-5 text-gray-500" />
              </button>
              <span className="text-sm font-semibold text-gray-900">
                {viewMonth.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
              </span>
              <button
                onClick={() => setCalOffset((o) => o + 1)}
                className="rounded-lg p-1.5 hover:bg-gray-100"
                aria-label="Next month"
              >
                <ChevronRight className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="grid grid-cols-7 text-center">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <div key={d} className="py-1 text-xs font-medium text-gray-400">
                  {d}
                </div>
              ))}
              {Array.from({ length: firstDow }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const thisDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day)
                const isPast = isoDate(thisDate) < todayIso
                const isSelected = isoDate(thisDate) === isoDate(selectedDate)
                const isToday = isoDate(thisDate) === todayIso
                return (
                  <button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    disabled={isPast}
                    className={`mx-auto my-0.5 flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors
                      ${isPast ? 'cursor-not-allowed text-gray-300' : 'cursor-pointer hover:bg-sky-50'}
                      ${isSelected ? 'bg-sky-600 text-white hover:bg-sky-700' : ''}
                      ${isToday && !isSelected ? 'font-bold text-sky-600 ring-1 ring-sky-400' : ''}
                    `}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
            <p className="mt-3 text-center text-xs text-gray-400">
              Showing times in <span className="font-medium text-gray-600">{guestTz}</span>
              {ownerTz !== guestTz && <span> · Host: {ownerTz}</span>}
            </p>
          </div>

          {/* Time slots */}
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">{formatDate(selectedDate)}</h3>
            {slotsLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
              </div>
            ) : slotsError ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="mb-2 h-8 w-8 text-red-400" />
                <p className="text-sm text-red-600">Failed to load available times.</p>
                <button
                  onClick={() => setSlotRetry((n) => n + 1)}
                  className="mt-2 text-xs font-medium text-sky-600 underline hover:text-sky-800"
                >
                  Retry
                </button>
              </div>
            ) : slots.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-400">No available slots on this day</p>
                <p className="mt-1 text-xs text-gray-400">Try a different date.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {slots.map((slot) => {
                  const isSelected = slot === selectedSlot
                  return (
                    <button
                      key={slot}
                      onClick={() => setSelectedSlot(slot)}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors
                        ${isSelected ? 'border-sky-500 bg-sky-600 text-white' : 'border-gray-200 text-gray-700 hover:border-sky-300 hover:bg-sky-50'}`}
                    >
                      {formatTime(slot, guestTz)}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Confirm button */}
        {selectedSlot && (
          <div className="mt-6">
            {errorMsg && (
              <div className="mb-3 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 flex-shrink-0" /> {errorMsg}
              </div>
            )}
            <button
              onClick={() => void handleConfirm()}
              disabled={submitting}
              className="w-full rounded-2xl bg-sky-600 py-3.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60 transition-colors"
            >
              {submitting
                ? 'Rescheduling…'
                : `Confirm — ${formatTime(selectedSlot, guestTz)}, ${formatDate(selectedDate)}`}
            </button>
          </div>
        )}
      </div>

      <p className="mt-8 text-xs text-gray-400">
        Powered by{' '}
        <a href="https://dotly.one" className="hover:underline">
          Dotly.one
        </a>
      </p>
    </div>
  )
}
