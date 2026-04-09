'use client'

import type { JSX } from 'react'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
  Calendar,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  User,
  Mail,
  FileText,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AptType {
  id: string
  name: string
  description: string | null
  durationMins: number
  color: string
  location: string | null
  timezone: string
  owner: { name: string | null; avatarUrl: string | null }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function isoDate(d: Date): string {
  // HIGH-4: Calendar cells are built as local-midnight Dates (new Date(y, m, d)).
  // Using UTC getters would shift the date for users in UTC+ zones — e.g. a cell
  // for "April 1" created as local midnight in UTC+5:30 is actually 18:30 UTC on
  // March 31, so getUTCDate() would return 31 and send date=2026-03-31 to the API.
  // Use local getters here so the string matches the date visible on screen.
  const y = d.getFullYear()
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  const da = String(d.getDate()).padStart(2, '0')
  return `${y}-${mo}-${da}`
}

function formatSlotTime(iso: string, tz?: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: tz || undefined,
  })
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/** Build a Google Calendar add-to-calendar URL */
function googleCalUrl(apt: AptType, startAt: string): string {
  const start = new Date(startAt)
  const end = new Date(start.getTime() + apt.durationMins * 60_000)
  const fmt = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '')
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: apt.name,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: apt.description ?? '',
    location: apt.location ?? '',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

// ── Step Indicator ─────────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: 'date' | 'form' | 'confirmed' }): JSX.Element {
  const steps = [
    { key: 'date', label: 'Pick a time' },
    { key: 'form', label: 'Your details' },
    { key: 'confirmed', label: 'Confirmed' },
  ]
  const idx = steps.findIndex((s) => s.key === step)
  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                i < idx
                  ? 'bg-sky-600 text-white'
                  : i === idx
                    ? 'bg-sky-600 text-white ring-4 ring-sky-100'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {i < idx ? '✓' : i + 1}
            </div>
            <span
              className={`mt-1 text-[10px] font-medium whitespace-nowrap ${i === idx ? 'text-sky-700' : 'text-gray-400'}`}
            >
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`h-0.5 w-10 sm:w-16 mx-1 mt-[-10px] transition-colors ${i < idx ? 'bg-sky-500' : 'bg-gray-200'}`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Calendar Picker ───────────────────────────────────────────────────────────

interface CalendarPickerProps {
  selected: Date | null
  onSelect: (d: Date) => void
}

function CalendarPicker({ selected, onSelect }: CalendarPickerProps): JSX.Element {
  // HIGH-4: Use local-time today (not UTC) to match local-midnight calendar cells.
  // Cells are new Date(year, month, d) — local midnight — so isPast comparisons
  // must use the same local-date string to avoid off-by-one near midnight.
  const todayLocal = new Date()
  const todayIso = isoDate(todayLocal)
  const [view, setView] = useState(new Date(todayLocal.getFullYear(), todayLocal.getMonth(), 1))

  const year = view.getFullYear()
  const month = view.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDow = new Date(year, month, 1).getDay()

  const cells: (Date | null)[] = Array(firstDow).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => setView((v) => addMonths(v, -1))}
          className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4 text-gray-500" />
        </button>
        <span className="text-sm font-semibold text-gray-900">
          {MONTHS[month]} {year}
        </span>
        <button
          onClick={() => setView((v) => addMonths(v, 1))}
          className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4 text-gray-500" />
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-1">
        {DAYS_SHORT.map((d) => (
          <div key={d} className="py-1 text-center text-xs font-medium text-gray-400">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />
          const isPast = isoDate(day) < todayIso
          const isSelected = selected ? isoDate(day) === isoDate(selected) : false
          const isToday = isoDate(day) === todayIso
          return (
            <button
              key={isoDate(day)}
              disabled={isPast}
              onClick={() => onSelect(day)}
              className={`relative rounded-lg py-2 text-sm transition-colors ${
                isPast
                  ? 'cursor-not-allowed text-gray-200'
                  : isSelected
                    ? 'bg-sky-600 font-semibold text-white shadow-sm'
                    : isToday
                      ? 'font-semibold text-sky-600 ring-1 ring-sky-200 hover:bg-sky-50'
                      : 'text-gray-700 hover:bg-sky-50 hover:text-sky-700'
              }`}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Step = 'date' | 'form' | 'confirmed'

export default function BookingPage(): JSX.Element {
  const params = useParams() as { handle: string; slug: string }
  const { handle, slug } = params

  const [apt, setApt] = useState<AptType | null>(null)
  const [loadingApt, setLoadingApt] = useState(true)
  const [aptError, setAptError] = useState<string | null>(null)

  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotError, setSlotError] = useState<string | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [ownerTz, setOwnerTz] = useState('UTC')
  const guestTz = Intl.DateTimeFormat().resolvedOptions().timeZone

  const [step, setStep] = useState<Step>('date')
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestNotes, setGuestNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [confirmedBooking, setConfirmedBooking] = useState<{ startAt: string } | null>(null)

  // Load appointment type
  useEffect(() => {
    async function loadApt() {
      try {
        const res = await fetch(`${API_URL}/scheduling/public/${handle}/${slug}`)
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as Record<string, unknown>
          throw new Error(
            typeof err['message'] === 'string' ? err['message'] : `Error ${res.status}`,
          )
        }
        const data = (await res.json()) as AptType
        setApt(data)
      } catch (e) {
        setAptError(e instanceof Error ? e.message : 'Not found')
      } finally {
        setLoadingApt(false)
      }
    }
    void loadApt()
  }, [handle, slug])

  // Load slots when date selected
  const loadSlots = useCallback(
    async (date: Date) => {
      setLoadingSlots(true)
      setSlots([])
      setSlotError(null)
      setSelectedSlot(null)
      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
        const res = await fetch(
          `${API_URL}/scheduling/public/${handle}/${slug}/slots?date=${isoDate(date)}&tz=${encodeURIComponent(tz)}`,
        )
        if (!res.ok) throw new Error(`Error ${res.status}`)
        const data = (await res.json()) as { slots: string[]; ownerTimezone?: string }
        setSlots(data.slots)
        if (data.ownerTimezone) setOwnerTz(data.ownerTimezone)
      } catch (e) {
        // MED-3: Distinguish network/API errors from genuinely empty days
        setSlotError(e instanceof Error ? e.message : 'Failed to load available times')
        setSlots([])
      } finally {
        setLoadingSlots(false)
      }
    },
    [handle, slug],
  )

  function handleDateSelect(date: Date) {
    setSelectedDate(date)
    void loadSlots(date)
  }

  async function handleSubmitBooking(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSlot) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch(`${API_URL}/scheduling/public/${handle}/${slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startAt: selectedSlot, guestName, guestEmail, guestNotes }),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as Record<string, unknown>
        throw new Error(typeof err['message'] === 'string' ? err['message'] : `Error ${res.status}`)
      }
      const booking = (await res.json()) as { startAt: string }
      setConfirmedBooking(booking)
      setStep('confirmed')
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Booking failed')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loadingApt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
      </div>
    )
  }

  if (aptError || !apt) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-red-400" />
        <h2 className="text-xl font-semibold text-gray-900">Booking page not found</h2>
        <p className="mt-2 text-gray-500">
          {aptError ?? 'This booking page does not exist or is no longer active.'}
        </p>
      </div>
    )
  }

  if (step === 'confirmed' && confirmedBooking) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
              <CheckCircle className="h-10 w-10 text-green-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">You&apos;re booked!</h2>
          <p className="mt-2 text-gray-600">
            Your <strong>{apt.name}</strong> with <strong>{apt.owner.name ?? 'your host'}</strong>{' '}
            is confirmed.
          </p>
          <div className="mt-4 rounded-xl bg-sky-50 p-4 text-left">
            <div className="flex items-center gap-2 text-sm text-sky-800">
              <Calendar className="h-4 w-4 flex-shrink-0" />
              <span>
                {new Date(confirmedBooking.startAt).toLocaleString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  timeZone: guestTz,
                })}
              </span>
            </div>
            {apt.location && (
              <div className="mt-1.5 flex items-center gap-2 text-sm text-sky-800">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span>{apt.location}</span>
              </div>
            )}
          </div>
          <p className="mt-4 text-sm text-gray-400">
            A confirmation email has been sent to {guestEmail}.
          </p>
          <a
            href={googleCalUrl(apt, confirmedBooking.startAt)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Calendar className="h-4 w-4" />
            Add to Google Calendar
          </a>
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
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-10">
        {/* Header card */}
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <div className="flex items-start gap-4">
            <div
              className="h-14 w-14 flex-shrink-0 rounded-2xl"
              style={{ background: apt.color }}
            />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900">{apt.name}</h1>
              {apt.owner.name && (
                <div className="mt-1 flex items-center gap-2">
                  {apt.owner.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={apt.owner.avatarUrl}
                      alt={apt.owner.name}
                      className="h-5 w-5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200">
                      <User className="h-3 w-3 text-gray-500" />
                    </div>
                  )}
                  <p className="text-sm text-gray-500">with {apt.owner.name}</p>
                </div>
              )}
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {apt.durationMins} min
                </span>
                {apt.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    <span className="truncate max-w-[200px]">{apt.location}</span>
                  </span>
                )}
              </div>
              {apt.description && <p className="mt-2 text-sm text-gray-600">{apt.description}</p>}
            </div>
          </div>
        </div>

        {/* Step indicator */}
        <StepIndicator step={step} />

        {step === 'date' && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Calendar */}
            <div>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Select a Date
              </h2>
              <CalendarPicker selected={selectedDate} onSelect={handleDateSelect} />
            </div>

            {/* Time slots */}
            <div>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                {selectedDate
                  ? selectedDate.toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'Select a date to see times'}
              </h2>
              {!selectedDate && (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
                  <Calendar className="mb-2 h-8 w-8 text-gray-300" />
                  <p className="text-sm text-gray-400">Pick a date on the left</p>
                </div>
              )}
              {loadingSlots && (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
                </div>
              )}
              {!loadingSlots && selectedDate && slotError && (
                <div className="rounded-2xl border-2 border-dashed border-red-100 bg-red-50 py-10 text-center">
                  <AlertCircle className="mx-auto mb-2 h-7 w-7 text-red-400" />
                  <p className="text-sm text-red-600">Failed to load available times.</p>
                  <button
                    onClick={() => void loadSlots(selectedDate)}
                    className="mt-2 text-xs font-medium text-sky-600 underline hover:text-sky-800"
                  >
                    Retry
                  </button>
                </div>
              )}
              {!loadingSlots && selectedDate && !slotError && slots.length === 0 && (
                <div className="rounded-2xl border-2 border-dashed border-gray-200 py-10 text-center">
                  <Calendar className="mx-auto mb-2 h-7 w-7 text-gray-300" />
                  <p className="text-sm text-gray-400">No available times on this day.</p>
                  <p className="mt-1 text-xs text-gray-400">Try a different date.</p>
                </div>
              )}
              {!loadingSlots && slots.length > 0 && (
                <>
                  <p className="mb-2 text-xs text-gray-400">
                    Times shown in <span className="font-medium text-gray-600">{guestTz}</span>
                    {ownerTz !== guestTz && (
                      <span className="text-gray-400"> · Host timezone: {ownerTz}</span>
                    )}
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
                    {slots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                          selectedSlot === slot
                            ? 'border-sky-600 bg-sky-600 text-white shadow-sm'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-sky-400 hover:text-sky-700 hover:shadow-sm'
                        }`}
                      >
                        {formatSlotTime(slot, guestTz)}
                      </button>
                    ))}
                  </div>
                  {selectedSlot && (
                    <button
                      onClick={() => setStep('form')}
                      className="mt-4 w-full rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white hover:bg-sky-700 transition-colors shadow-sm"
                    >
                      Next: Your details →
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {step === 'form' && (
          <div className="mx-auto max-w-lg rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <div className="mb-5 flex items-center gap-3">
              <button
                onClick={() => setStep('date')}
                className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors"
                aria-label="Go back"
              >
                <ChevronLeft className="h-5 w-5 text-gray-500" />
              </button>
              <div>
                <h2 className="font-semibold text-gray-900">Your details</h2>
                {selectedSlot && (
                  <p className="text-sm text-sky-600 font-medium">
                    {new Date(selectedSlot).toLocaleString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                    {' · '}
                    {apt.durationMins} min
                  </p>
                )}
              </div>
            </div>
            <form onSubmit={(e) => void handleSubmitBooking(e)} className="space-y-4">
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <User className="h-4 w-4" /> Full name
                </label>
                <input
                  required
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  placeholder="Your full name"
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <Mail className="h-4 w-4" /> Email address
                </label>
                <input
                  required
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <FileText className="h-4 w-4" /> Notes{' '}
                  <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={guestNotes}
                  onChange={(e) => setGuestNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  placeholder="Anything you'd like to share before the meeting…"
                />
              </div>
              {submitError && (
                <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" /> {submitError}
                </div>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60 transition-colors shadow-sm"
              >
                {submitting ? 'Confirming…' : 'Confirm Booking'}
              </button>
              <p className="text-center text-xs text-gray-400">
                A confirmation email will be sent to your address.
              </p>
            </form>
          </div>
        )}
      </div>

      <footer className="mt-8 pb-8 text-center text-xs text-gray-400">
        Powered by{' '}
        <a href="https://dotly.one" className="hover:underline">
          Dotly.one
        </a>
      </footer>
    </div>
  )
}
