'use client'

import type { JSX } from 'react'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { getPublicApiUrl } from '@/lib/public-env'
import { SelectField } from '@/components/ui/SelectField'
import {
  ARBITRUM_CHAIN_ID,
  ensureWalletChain,
  waitForReceipt,
} from '@/app/(dashboard)/settings/billing/helpers'
import {
  Calendar,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle,
  AlertCircle,
  User,
  Mail,
  FileText,
} from 'lucide-react'

const ERC20_TRANSFER_SELECTOR = '0xa9059cbb'

// ── Types ─────────────────────────────────────────────────────────────────────

type BookingQuestionType = 'TEXT' | 'TEXTAREA' | 'EMAIL' | 'PHONE' | 'SELECT' | 'CHECKBOX'

interface BookingQuestion {
  id: string
  label: string
  type: BookingQuestionType
  options: string[]
  required: boolean
  position: number
}

interface AptType {
  id: string
  cardId: string | null
  cardHandle: string | null
  name: string
  description: string | null
  durationMins: number
  color: string
  location: string | null
  timezone: string
  depositEnabled?: boolean
  depositAmountUsdt?: string | null
  owner: { name: string | null; avatarUrl: string | null }
  questions: BookingQuestion[]
}

interface BookingDepositIntentResponse {
  depositPaymentId: string
  amountUsdt: string
  amountRaw: string
  tokenAddress: string
  recipientAddress: string
  chainId: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const API_URL = getPublicApiUrl()

function postAnalytics(body: Record<string, unknown>) {
  fetch(`${API_URL}/public/analytics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {})
}

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
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function isValidQuestionAnswer(question: BookingQuestion, value: string): string | null {
  const trimmed = value.trim()

  if (question.required && question.type !== 'CHECKBOX' && !trimmed) {
    return `${question.label} is required.`
  }

  if (question.type === 'CHECKBOX') {
    if (question.required && value !== 'true') {
      return `${question.label} is required.`
    }
    return null
  }

  if (!trimmed) return null

  if (trimmed.length > 5000) {
    return `${question.label} must be 5000 characters or less.`
  }

  if (question.type === 'EMAIL' && !EMAIL_REGEX.test(trimmed)) {
    return `Enter a valid ${question.label.toLowerCase()}.`
  }

  if (
    question.type === 'SELECT' &&
    question.options.length > 0 &&
    !question.options.includes(trimmed)
  ) {
    return `Select a valid ${question.label.toLowerCase()}.`
  }

  return null
}

function clearErrorKey(errors: Record<string, string>, key: string): Record<string, string> {
  if (!errors[key]) return errors
  const next = { ...errors }
  delete next[key]
  return next
}

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

function StepIndicator({ step }: { step: Step }): JSX.Element {
  const steps = [
    { key: 'date', label: 'Pick a time' },
    { key: 'form', label: 'Your details' },
    { key: 'deposit', label: 'Deposit' },
    { key: 'confirmed', label: 'Confirmed' },
  ]
  const idx = steps.findIndex((s) => s.key === step)
  return (
    <div className="app-panel mb-6 flex items-center justify-center gap-0 rounded-[28px] px-4 py-4">
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
              {i < idx ? <Check className="h-3.5 w-3.5" /> : i + 1}
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
    <div className="app-panel rounded-[28px] p-4">
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

type Step = 'date' | 'form' | 'deposit' | 'confirmed'

interface PreparedBookingSubmission {
  guestName: string
  guestEmail: string
  guestNotes?: string
  answers: { questionId: string; value: string }[]
}

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
  const slotRequestIdRef = useRef(0)
  const guestTz = Intl.DateTimeFormat().resolvedOptions().timeZone

  const [step, setStep] = useState<Step>('date')
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [guestNotes, setGuestNotes] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [confirmedBooking, setConfirmedBooking] = useState<{ startAt: string } | null>(null)
  const [preparedBooking, setPreparedBooking] = useState<PreparedBookingSubmission | null>(null)
  const [depositIntent, setDepositIntent] = useState<BookingDepositIntentResponse | null>(null)
  const [depositTxHash, setDepositTxHash] = useState<string | null>(null)
  const [depositing, setDepositing] = useState(false)
  const [depositError, setDepositError] = useState<string | null>(null)
  const [depositStep, setDepositStep] = useState<string | null>(null)

  const resetDepositState = useCallback(() => {
    setPreparedBooking(null)
    setDepositIntent(null)
    setDepositTxHash(null)
    setDepositError(null)
    setDepositStep(null)
  }, [])

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
        setApt({ ...data, questions: data.questions ?? [] })
        if (data.cardId) {
          postAnalytics({
            cardId: data.cardId,
            type: 'CLICK',
            metadata: {
              surface: 'booking_page',
              action: 'booking_page_view',
              status: slug,
            },
          })
        }
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
      const requestId = ++slotRequestIdRef.current
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
        if (slotRequestIdRef.current !== requestId) return
        setSlots(data.slots)
        if (data.ownerTimezone) setOwnerTz(data.ownerTimezone)
      } catch (e) {
        if (slotRequestIdRef.current !== requestId) return
        // MED-3: Distinguish network/API errors from genuinely empty days
        setSlotError(e instanceof Error ? e.message : 'Failed to load available times')
        setSlots([])
      } finally {
        if (slotRequestIdRef.current !== requestId) return
        setLoadingSlots(false)
      }
    },
    [handle, slug],
  )

  function handleDateSelect(date: Date) {
    setSelectedDate(date)
    resetDepositState()
    void loadSlots(date)
  }

  async function submitBooking(prepared: PreparedBookingSubmission) {
    if (!selectedSlot) return

    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch(`${API_URL}/scheduling/public/${handle}/${slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startAt: selectedSlot,
          guestName: prepared.guestName,
          guestEmail: prepared.guestEmail,
          guestNotes: prepared.guestNotes,
          depositPaymentId: apt?.depositEnabled ? depositIntent?.depositPaymentId : undefined,
          depositTxHash: apt?.depositEnabled ? (depositTxHash ?? undefined) : undefined,
          answers: prepared.answers,
        }),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as Record<string, unknown>
        throw new Error(typeof err['message'] === 'string' ? err['message'] : `Error ${res.status}`)
      }
      const booking = (await res.json()) as { startAt: string }
      if (apt?.cardId) {
        postAnalytics({
          cardId: apt.cardId,
          type: 'SAVE',
          metadata: {
            surface: 'booking_page',
            action: 'booking_completed',
            ctaType: 'BOOK',
            source: 'booking_page',
            status: slug,
          },
        })
      }
      setConfirmedBooking(booking)
      setStep('confirmed')
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Booking failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmitBooking(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSlot) return

    const trimmedGuestName = guestName.trim()
    const trimmedGuestEmail = guestEmail.trim().toLowerCase()
    const trimmedGuestNotes = guestNotes.trim()
    const nextFieldErrors: Record<string, string> = {}
    const nextAnswers: Record<string, string> = {}

    if (!trimmedGuestName) {
      nextFieldErrors.guestName = 'Full name is required.'
    } else if (trimmedGuestName.length > 120) {
      nextFieldErrors.guestName = 'Full name must be 120 characters or less.'
    }

    if (!trimmedGuestEmail) {
      nextFieldErrors.guestEmail = 'Email address is required.'
    } else if (!EMAIL_REGEX.test(trimmedGuestEmail)) {
      nextFieldErrors.guestEmail = 'Enter a valid email address.'
    } else if (trimmedGuestEmail.length > 254) {
      nextFieldErrors.guestEmail = 'Email address must be 254 characters or less.'
    }

    if (trimmedGuestNotes.length > 1000) {
      nextFieldErrors.guestNotes = 'Notes must be 1000 characters or less.'
    }

    for (const question of apt?.questions ?? []) {
      const normalizedValue =
        question.type === 'CHECKBOX'
          ? (answers[question.id] ?? 'false')
          : (answers[question.id] ?? '').trim()
      nextAnswers[question.id] = normalizedValue
      const validationError = isValidQuestionAnswer(question, normalizedValue)
      if (validationError) {
        nextFieldErrors[question.id] = validationError
      }
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      setGuestName(trimmedGuestName)
      setGuestEmail(trimmedGuestEmail)
      setGuestNotes(trimmedGuestNotes)
      setAnswers((prev) => ({ ...prev, ...nextAnswers }))
      setSubmitError('Fix the highlighted fields before confirming your booking.')
      return
    }

    setFieldErrors({})
    const prepared: PreparedBookingSubmission = {
      guestName: trimmedGuestName,
      guestEmail: trimmedGuestEmail,
      guestNotes: trimmedGuestNotes || undefined,
      answers:
        apt?.questions
          ?.map((q) => ({
            questionId: q.id,
            value: nextAnswers[q.id] ?? (q.type === 'CHECKBOX' ? 'false' : ''),
          }))
          .filter((a) => a.value !== '' && a.value !== 'false') ?? [],
    }

    setPreparedBooking(prepared)
    if (apt?.depositEnabled && (!depositIntent?.depositPaymentId || !depositTxHash)) {
      setStep('deposit')
      return
    }

    await submitBooking(prepared)
  }

  async function handleCryptoDeposit() {
    if (!apt || !selectedSlot) return
    if (!window.ethereum) {
      setDepositError('Open this page inside a wallet browser such as MetaMask or Trust Wallet.')
      return
    }

    setDepositing(true)
    setDepositError(null)
    try {
      const accounts = (await window.ethereum.request({
        method: 'eth_requestAccounts',
      })) as string[]
      const walletAddress = accounts[0]
      if (!walletAddress) throw new Error('No wallet account was returned.')
      if (!preparedBooking) throw new Error('Enter your booking details before paying the deposit.')

      setDepositStep('Preparing crypto deposit…')
      const intent = await fetch(`${API_URL}/scheduling/public/${handle}/${slug}/deposit-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: preparedBooking.guestName,
          guestEmail: preparedBooking.guestEmail,
          walletAddress,
          startAt: selectedSlot,
        }),
      }).then(async (res) => {
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as Record<string, unknown>
          throw new Error(
            typeof err['message'] === 'string' ? err['message'] : `Error ${res.status}`,
          )
        }
        return (await res.json()) as BookingDepositIntentResponse
      })
      setDepositIntent(intent)

      if (apt.cardId) {
        postAnalytics({
          cardId: apt.cardId,
          type: 'CLICK',
          metadata: {
            surface: 'booking_page',
            action: 'deposit_started',
            ctaType: 'BOOK',
            source: 'booking_page',
            status: slug,
            amount: Number(intent.amountUsdt),
            currency: 'USDT',
          },
        })
      }

      await ensureWalletChain(intent.chainId || ARBITRUM_CHAIN_ID)
      setDepositStep('Sending USDT deposit…')

      const transferData =
        ERC20_TRANSFER_SELECTOR +
        intent.recipientAddress.slice(2).padStart(64, '0') +
        BigInt(intent.amountRaw).toString(16).padStart(64, '0')

      const txHash = (await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from: walletAddress, to: intent.tokenAddress, data: transferData }],
      })) as string

      setDepositTxHash(txHash)
      setDepositStep('Waiting for on-chain confirmation…')
      await waitForReceipt(txHash)

      setDepositStep('Verifying deposit with Dotly…')
      const activateRes = await fetch(
        `${API_URL}/scheduling/public/${handle}/${slug}/deposit-activate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ depositPaymentId: intent.depositPaymentId, txHash }),
        },
      )
      if (!activateRes.ok) {
        const err = (await activateRes.json().catch(() => ({}))) as Record<string, unknown>
        throw new Error(
          typeof err['message'] === 'string' ? err['message'] : `Error ${activateRes.status}`,
        )
      }

      if (apt.cardId) {
        postAnalytics({
          cardId: apt.cardId,
          type: 'SAVE',
          metadata: {
            surface: 'booking_page',
            action: 'deposit_completed',
            ctaType: 'BOOK',
            source: 'booking_page',
            status: slug,
            amount: Number(intent.amountUsdt),
            currency: 'USDT',
          },
        })
      }

      setDepositStep('Confirming booking…')
      await submitBooking(preparedBooking)
    } catch (e) {
      setDepositError(e instanceof Error ? e.message : 'Crypto deposit failed')
    } finally {
      setDepositing(false)
      setDepositStep(null)
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
        <div className="app-panel w-full max-w-md rounded-[30px] p-8 text-center">
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
        <div className="app-panel mb-6 rounded-[30px] p-6">
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
                <div className="app-panel-subtle flex flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-gray-200 py-16 text-center">
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
                <div className="rounded-[28px] border-2 border-dashed border-red-100 bg-red-50 py-10 text-center shadow-[0_20px_48px_-34px_rgba(239,68,68,0.3)]">
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
                <div className="app-panel-subtle rounded-[28px] border-2 border-dashed border-gray-200 py-10 text-center">
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
                        className={`rounded-2xl border px-4 py-3 text-sm font-medium transition-all ${
                          selectedSlot === slot
                            ? 'border-sky-600 bg-sky-600 text-white shadow-[0_18px_38px_-24px_rgba(2,132,199,0.75)]'
                            : 'border-white/70 bg-white/88 text-gray-700 hover:border-sky-400 hover:text-sky-700 hover:shadow-[0_18px_38px_-28px_rgba(15,23,42,0.22)]'
                        }`}
                      >
                        {formatSlotTime(slot, guestTz)}
                      </button>
                    ))}
                  </div>
                  {selectedSlot && (
                    <button
                      onClick={() => {
                        if (apt?.cardId && selectedSlot) {
                          postAnalytics({
                            cardId: apt.cardId,
                            type: 'CLICK',
                            metadata: {
                              surface: 'booking_page',
                              action: 'booking_started',
                              ctaType: 'BOOK',
                              source: 'booking_page',
                              status: slug,
                            },
                          })
                        }
                        if (apt?.depositEnabled) {
                          setStep('form')
                        } else {
                          setStep('form')
                        }
                      }}
                      className="mt-4 w-full rounded-2xl bg-sky-600 py-3 text-sm font-semibold text-white hover:bg-sky-700 transition-colors shadow-[0_20px_44px_-26px_rgba(2,132,199,0.72)]"
                    >
                      Next: Your details
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {step === 'deposit' && (
          <div className="mx-auto flex w-full max-w-3xl flex-col px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-xl">
              <div className="app-panel rounded-[30px] p-6">
                <h2 className="text-2xl font-bold text-gray-900">Pay your booking deposit</h2>
                <p className="mt-2 text-sm text-gray-600">
                  This booking requires a crypto deposit of{' '}
                  <strong>{apt.depositAmountUsdt} USDT</strong> on Arbitrum before we confirm your
                  slot.
                </p>
                <div className="mt-4 rounded-2xl bg-sky-50 p-4 text-sm text-sky-900">
                  <p>
                    Booking: <strong>{apt.name}</strong>
                  </p>
                  <p className="mt-1">
                    Slot:{' '}
                    <strong>
                      {selectedSlot
                        ? new Date(selectedSlot).toLocaleString(undefined, {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            timeZone: guestTz,
                          })
                        : 'Not selected'}
                    </strong>
                  </p>
                </div>
                {depositStep && (
                  <p className="mt-4 text-sm font-medium text-sky-700">{depositStep}</p>
                )}
                {depositError && (
                  <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {depositError}
                  </div>
                )}
                {depositTxHash && (
                  <p className="mt-4 break-all rounded-xl bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600">
                    Deposit tx: {depositTxHash}
                  </p>
                )}
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setStep('form')}
                    className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCryptoDeposit()}
                    disabled={depositing}
                    className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {depositing ? 'Processing…' : `Pay ${apt.depositAmountUsdt} USDT`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'form' && (
          <div className="app-panel mx-auto max-w-lg rounded-[30px] p-6">
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
                  onChange={(e) => {
                    resetDepositState()
                    setGuestName(e.target.value)
                    setFieldErrors((prev) => clearErrorKey(prev, 'guestName'))
                  }}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  placeholder="Your full name"
                  autoComplete="name"
                  maxLength={120}
                  aria-invalid={fieldErrors.guestName ? 'true' : 'false'}
                  aria-describedby={fieldErrors.guestName ? 'booking-name-error' : undefined}
                />
                {fieldErrors.guestName && (
                  <p id="booking-name-error" className="mt-1 text-xs text-red-600">
                    {fieldErrors.guestName}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <Mail className="h-4 w-4" /> Email address
                </label>
                <input
                  required
                  type="email"
                  value={guestEmail}
                  onChange={(e) => {
                    resetDepositState()
                    setGuestEmail(e.target.value)
                    setFieldErrors((prev) => clearErrorKey(prev, 'guestEmail'))
                  }}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  placeholder="you@example.com"
                  autoComplete="email"
                  maxLength={254}
                  aria-invalid={fieldErrors.guestEmail ? 'true' : 'false'}
                  aria-describedby={fieldErrors.guestEmail ? 'booking-email-error' : undefined}
                />
                {fieldErrors.guestEmail && (
                  <p id="booking-email-error" className="mt-1 text-xs text-red-600">
                    {fieldErrors.guestEmail}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <FileText className="h-4 w-4" /> Notes{' '}
                  <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={guestNotes}
                  onChange={(e) => {
                    resetDepositState()
                    setGuestNotes(e.target.value)
                    setFieldErrors((prev) => clearErrorKey(prev, 'guestNotes'))
                  }}
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  placeholder="Anything you'd like to share before the meeting…"
                  maxLength={1000}
                  aria-invalid={fieldErrors.guestNotes ? 'true' : 'false'}
                  aria-describedby={fieldErrors.guestNotes ? 'booking-notes-error' : undefined}
                />
                {fieldErrors.guestNotes && (
                  <p id="booking-notes-error" className="mt-1 text-xs text-red-600">
                    {fieldErrors.guestNotes}
                  </p>
                )}
              </div>
              {/* Custom questions */}
              {apt.questions &&
                apt.questions.length > 0 &&
                apt.questions.map((q) => (
                  <div key={q.id}>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      {q.label}
                      {q.required && <span className="ml-1 text-red-500">*</span>}
                    </label>
                    {q.type === 'TEXTAREA' ? (
                      <textarea
                        required={q.required}
                        value={answers[q.id] ?? ''}
                        onChange={(e) => {
                          resetDepositState()
                          setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                          setFieldErrors((prev) => clearErrorKey(prev, q.id))
                        }}
                        rows={3}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                        maxLength={5000}
                        aria-invalid={fieldErrors[q.id] ? 'true' : 'false'}
                        aria-describedby={fieldErrors[q.id] ? `${q.id}-error` : undefined}
                      />
                    ) : q.type === 'SELECT' ? (
                      <SelectField
                        required={q.required}
                        value={answers[q.id] ?? ''}
                        onChange={(e) => {
                          resetDepositState()
                          setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                          setFieldErrors((prev) => clearErrorKey(prev, q.id))
                        }}
                        className="rounded-xl px-4 py-3 pr-10 focus:border-sky-500 focus:ring-sky-100"
                        aria-invalid={fieldErrors[q.id] ? 'true' : 'false'}
                        aria-describedby={fieldErrors[q.id] ? `${q.id}-error` : undefined}
                      >
                        <option value="">Select an option…</option>
                        {q.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </SelectField>
                    ) : q.type === 'CHECKBOX' ? (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          required={q.required}
                          checked={answers[q.id] === 'true'}
                          onChange={(e) => {
                            resetDepositState()
                            setAnswers((prev) => ({
                              ...prev,
                              [q.id]: e.target.checked ? 'true' : 'false',
                            }))
                            setFieldErrors((prev) => clearErrorKey(prev, q.id))
                          }}
                          className="rounded border-gray-300"
                          aria-invalid={fieldErrors[q.id] ? 'true' : 'false'}
                          aria-describedby={fieldErrors[q.id] ? `${q.id}-error` : undefined}
                        />
                        <span className="text-sm text-gray-600">{q.label}</span>
                      </label>
                    ) : (
                      <input
                        type={q.type === 'EMAIL' ? 'email' : q.type === 'PHONE' ? 'tel' : 'text'}
                        required={q.required}
                        value={answers[q.id] ?? ''}
                        onChange={(e) => {
                          resetDepositState()
                          setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                          setFieldErrors((prev) => clearErrorKey(prev, q.id))
                        }}
                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                        maxLength={5000}
                        aria-invalid={fieldErrors[q.id] ? 'true' : 'false'}
                        aria-describedby={fieldErrors[q.id] ? `${q.id}-error` : undefined}
                      />
                    )}
                    {fieldErrors[q.id] && (
                      <p id={`${q.id}-error`} className="mt-1 text-xs text-red-600">
                        {fieldErrors[q.id]}
                      </p>
                    )}
                  </div>
                ))}

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
