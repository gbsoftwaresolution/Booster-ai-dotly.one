'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getPublicApiUrl } from '@/lib/public-env'
import { createRequestId } from '@/lib/request-id'

const API_URL = getPublicApiUrl()
const CTA_VARIANTS = ['Chat Now', 'Get Help on WhatsApp', 'Message Me Instantly'] as const
const SERVICE_CTA_VARIANT = 'Ask About Services'

interface SalesLinkProfile {
  username: string
  name: string | null
  pitch: string | null
  phone: string | null
  showBranding: boolean
}

type LeadAction = 'view' | 'whatsapp' | 'booking' | 'payment'
type WhatsappIntent = 'general' | 'service'
type BookingState = 'idle' | 'loading' | 'success' | 'error'
const SALES_LINK_PAYMENT_AMOUNT = 5000

async function createLead(username: string): Promise<string | null> {
  try {
    const response = await fetch(`${API_URL}/lead/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-request-id': createRequestId() },
      body: JSON.stringify({ username }),
    })

    if (!response.ok) return null

    const data = (await response.json()) as { leadId?: string }
    return data.leadId ?? null
  } catch {
    return null
  }
}

async function parseJsonResponse<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T
  } catch {
    return null
  }
}

async function createLeadWithState(
  username: string,
): Promise<{ leadId: string | null; code: string | null; message: string | null }> {
  try {
    const response = await fetch(`${API_URL}/lead/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-request-id': createRequestId() },
      body: JSON.stringify({ username }),
    })

    if (response.ok) {
      const data = (await response.json()) as { leadId?: string }
      return { leadId: data.leadId ?? null, code: null, message: null }
    }

    const error = await parseJsonResponse<{ code?: string; message?: string }>(response)
    return {
      leadId: null,
      code: error?.code ?? null,
      message: error?.message ?? 'This user has reached their limit.',
    }
  } catch {
    return { leadId: null, code: null, message: null }
  }
}

async function getBookingSlots(username: string): Promise<string[]> {
  try {
    const response = await fetch(`${API_URL}/booking/slots/${encodeURIComponent(username)}`, {
      cache: 'no-store',
      headers: { 'x-request-id': createRequestId() },
    })
    if (!response.ok) return []

    const data = (await response.json()) as { slots?: string[] }
    return Array.isArray(data.slots) ? data.slots : []
  } catch {
    return []
  }
}

async function createBooking(
  username: string,
  leadId: string,
  slot: string,
): Promise<{ success: boolean; code: string | null; message: string | null }> {
  try {
    const response = await fetch(`${API_URL}/booking/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-request-id': createRequestId() },
      body: JSON.stringify({ username, leadId, slot }),
    })

    if (response.ok) return { success: true, code: null, message: null }

    const error = await parseJsonResponse<{ code?: string; message?: string }>(response)
    return {
      success: false,
      code: error?.code ?? null,
      message: error?.message ?? null,
    }
  } catch {
    return { success: false, code: null, message: null }
  }
}

async function createPaymentSession(
  username: string,
  leadId: string,
): Promise<{ url: string | null; code: string | null; message: string | null }> {
  try {
    const response = await fetch(`${API_URL}/payment/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-request-id': createRequestId() },
      body: JSON.stringify({
        username,
        leadId,
        amount: SALES_LINK_PAYMENT_AMOUNT,
      }),
    })

    if (!response.ok) {
      const error = await parseJsonResponse<{ code?: string; message?: string }>(response)
      return {
        url: null,
        code: error?.code ?? null,
        message: error?.message ?? null,
      }
    }

    const data = (await response.json()) as { url?: string | null }
    return { url: data.url ?? null, code: null, message: null }
  } catch {
    return { url: null, code: null, message: null }
  }
}

async function trackEvent(
  action: LeadAction,
  leadId: string,
  intent?: WhatsappIntent,
  ctaVariant?: string,
) {
  try {
    await fetch(`${API_URL}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-request-id': createRequestId() },
      body: JSON.stringify({
        action,
        leadId,
        ...(intent ? { intent } : {}),
        ...(ctaVariant ? { ctaVariant } : {}),
      }),
      keepalive: true,
    })
  } catch {
    // Tracking should never block the user action.
  }
}

function getStoredCtaVariant(username: string): string | null {
  if (typeof window === 'undefined') return null

  const storedVariant = window.sessionStorage.getItem(`dotly:cta:${username}`)
  return storedVariant && CTA_VARIANTS.includes(storedVariant as (typeof CTA_VARIANTS)[number])
    ? storedVariant
    : null
}

function pickSessionCtaVariant(username: string): string {
  const storedVariant = getStoredCtaVariant(username)
  if (storedVariant) return storedVariant

  const variant = CTA_VARIANTS[Math.floor(Math.random() * CTA_VARIANTS.length)] ?? CTA_VARIANTS[0]
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(`dotly:cta:${username}`, variant)
  }
  return variant
}

function normalizePhone(phone: string | null): string {
  return (phone ?? '').replace(/[^\d]/g, '')
}

function getWhatsappMessage(name: string, intent: WhatsappIntent): string {
  switch (intent) {
    case 'service':
      return `Hi ${name}, I saw your Dotly and I'm interested in your service. Can you share details?`
    default:
      return `Hi ${name}, I came across your Dotly profile.`
  }
}

export function SalesLinkClient({
  profile,
  username,
  stripeEnabled,
  paymentProvider,
  paymentCountry,
  paymentUpgradeRequired,
  paymentUpgradeMessage,
}: {
  profile: SalesLinkProfile
  username: string
  stripeEnabled: boolean
  paymentProvider: string | null
  paymentCountry: string | null
  paymentUpgradeRequired: boolean
  paymentUpgradeMessage: string | null
}) {
  const leadIdRef = useRef<string | null>(null)
  const leadPromiseRef = useRef<Promise<string | null> | null>(null)
  const leadIssueRef = useRef<{ code: string | null; message: string | null }>({
    code: null,
    message: null,
  })
  const [showBooking, setShowBooking] = useState(false)
  const [slots, setSlots] = useState<string[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [bookingState, setBookingState] = useState<BookingState>('idle')
  const [bookingMessage, setBookingMessage] = useState<string | null>(null)
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [ctaVariant, setCtaVariant] = useState<string>(CTA_VARIANTS[0])
  const [showHint, setShowHint] = useState(false)
  const [limitMessage, setLimitMessage] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const name = profile.name?.trim() || 'Dotly seller'
  const pitch = profile.pitch?.trim() || 'Helping buyers move faster with one clear next step.'
  const description = 'Choose one fast next step and keep the conversation moving.'
  const interactionStartedRef = useRef(false)

  const ensureLeadId = useCallback((): Promise<string | null> => {
    if (leadIdRef.current) {
      return Promise.resolve(leadIdRef.current)
    }

    if (!leadPromiseRef.current) {
      leadPromiseRef.current = createLeadWithState(username).then((result) => {
        leadIdRef.current = result.leadId
        leadIssueRef.current = { code: result.code, message: result.message }
        if (result.code === 'PLAN_LIMIT_REACHED' && result.message) {
          setLimitMessage(result.message)
        }
        return result.leadId
      })
    }

    return leadPromiseRef.current
  }, [username])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    setCtaVariant(pickSessionCtaVariant(username))
  }, [username])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const leadId = await ensureLeadId()
      if (cancelled || !leadId) return

      void trackEvent('view', leadId)
    })()

    return () => {
      cancelled = true
    }
  }, [ensureLeadId])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!interactionStartedRef.current) {
        setShowHint(true)
      }
    }, 3000)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [])

  function markInteractionStarted() {
    interactionStartedRef.current = true
    setShowHint(false)
  }

  function handleWhatsApp(intent: WhatsappIntent, variant: string) {
    const phone = normalizePhone(profile.phone)
    if (!phone) return

    markInteractionStarted()

    const message = encodeURIComponent(getWhatsappMessage(name, intent))
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank', 'noopener,noreferrer')

    void ensureLeadId().then((leadId) => {
      if (leadId) {
        void trackEvent('whatsapp', leadId, intent, variant)
      }
    })
  }

  async function openBooking() {
    markInteractionStarted()
    setShowBooking((current) => !current)
    if (showBooking || slots.length > 0 || slotsLoading) return

    setSlotsLoading(true)
    const availableSlots = await getBookingSlots(username)
    setSlots(availableSlots)
    setSlotsLoading(false)
  }

  async function handleBooking(slot: string) {
    markInteractionStarted()
    setBookingState('loading')
    setBookingMessage(null)

    const leadId = await ensureLeadId()
    if (!leadId) {
      setBookingState('error')
      setBookingMessage(leadIssueRef.current.message ?? 'Could not create booking right now.')
      return
    }

    await trackEvent('booking', leadId)
    const result = await createBooking(username, leadId, slot)

    if (!result.success) {
      setBookingState('error')
      setBookingMessage(result.message ?? 'That slot is no longer available. Try another one.')
      return
    }

    setBookingState('success')
    setBookingMessage('Call booked successfully.')
  }

  async function handlePayment() {
    markInteractionStarted()
    if (paymentUpgradeRequired) {
      setPaymentMessage(paymentUpgradeMessage ?? 'Start earning by upgrading to Pro.')
      return
    }

    if (!paymentProvider) {
      setPaymentMessage('Payments are not live yet for this sales link.')
      return
    }

    setPaymentLoading(true)
    setPaymentMessage(null)

    const leadId = await ensureLeadId()
    if (!leadId) {
      setPaymentMessage(leadIssueRef.current.message ?? 'Could not start payment right now.')
      setPaymentLoading(false)
      return
    }

    await trackEvent('payment', leadId)
    const result = await createPaymentSession(username, leadId)
    if (!result.url) {
      setPaymentMessage(result.message ?? 'Could not open checkout right now.')
      setPaymentLoading(false)
      return
    }

    window.location.href = result.url
  }

  const whatsappDisabled = !normalizePhone(profile.phone)
  const actionsDisabled = !mounted

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eff6ff_22%,#f8fafc_48%,#ffffff_100%)] px-4 py-4 text-slate-950 sm:px-6 sm:py-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-md items-center justify-center sm:min-h-[calc(100vh-3rem)]">
        <section className="w-full rounded-[32px] border border-white/80 bg-white/92 p-5 shadow-[0_30px_80px_-42px_rgba(15,23,42,0.42)] backdrop-blur sm:p-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">
            Sales Link
          </p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-[2.1rem]">
            {name}
          </h1>
          <p className="mt-3 max-w-sm text-base leading-7 text-slate-600">{pitch}</p>

          <div className="mt-6 rounded-3xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm font-medium text-emerald-900">
            Best response time comes from WhatsApp.
          </div>

          {showHint ? (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Tap chat to get a quick response.
            </div>
          ) : null}

          {limitMessage ? (
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {limitMessage}
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => handleWhatsApp('general', ctaVariant)}
              disabled={actionsDisabled || whatsappDisabled}
              className="min-h-16 w-full rounded-[20px] bg-emerald-600 px-5 py-4 text-base font-semibold text-white shadow-[0_16px_32px_-18px_rgba(5,150,105,0.8)] transition hover:scale-[1.01] hover:bg-emerald-500 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {ctaVariant}
            </button>

            <button
              type="button"
              onClick={() => handleWhatsApp('service', SERVICE_CTA_VARIANT)}
              disabled={actionsDisabled || whatsappDisabled}
              className="min-h-16 w-full rounded-[20px] border border-slate-200 bg-white px-5 py-4 text-base font-semibold text-slate-900 transition hover:scale-[1.01] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
            >
              {SERVICE_CTA_VARIANT}
            </button>

            <button
              type="button"
              onClick={() => void openBooking()}
              disabled={actionsDisabled}
              className="min-h-16 w-full rounded-[20px] border border-slate-200 bg-white px-5 py-4 text-base font-semibold text-slate-900 transition hover:scale-[1.01] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99]"
            >
              {showBooking ? 'Hide Time Slots' : 'Book Call'}
            </button>

            <button
              type="button"
              onClick={() => void handlePayment()}
              disabled={
                actionsDisabled || paymentLoading || (!paymentProvider && !paymentUpgradeRequired)
              }
              className="min-h-16 w-full rounded-[20px] border border-slate-200 bg-white px-5 py-4 text-base font-semibold text-slate-900 transition hover:scale-[1.01] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {paymentLoading
                ? 'Processing...'
                : paymentUpgradeRequired
                  ? 'Upgrade to Accept Payments'
                  : paymentProvider === 'cash_on_delivery'
                    ? 'Confirm Order'
                    : 'Pay Now'}
            </button>
          </div>

          {paymentUpgradeRequired ? (
            <p className="mt-3 text-sm text-slate-500">{paymentUpgradeMessage}</p>
          ) : !paymentProvider ? (
            <p className="mt-3 text-sm text-slate-500">
              Payments will be enabled once Stripe approval is ready.
            </p>
          ) : paymentProvider ? (
            <p className="mt-3 text-sm text-slate-500">
              Payments powered by {paymentProvider.replace('_', ' ')}
              {paymentCountry ? ` in ${paymentCountry}` : ''}.
            </p>
          ) : null}

          {paymentMessage ? <p className="mt-3 text-sm text-red-600">{paymentMessage}</p> : null}

          {showBooking ? (
            <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">Pick a time slot</p>
              <div className="mt-3 flex flex-col gap-2">
                {slotsLoading ? <p className="text-sm text-slate-500">Loading slots...</p> : null}
                {!slotsLoading && slots.length === 0 ? (
                  <p className="text-sm text-slate-500">No slots available right now.</p>
                ) : null}
                {slots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => void handleBooking(slot)}
                    disabled={bookingState === 'loading'}
                    className="min-h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-900 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {bookingState === 'loading' ? 'Booking...' : slot}
                  </button>
                ))}
              </div>
              {bookingMessage ? (
                <p
                  className={`mt-3 text-sm ${
                    bookingState === 'success' ? 'text-emerald-700' : 'text-red-600'
                  }`}
                >
                  {bookingMessage}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-6 flex items-center justify-between gap-4 text-xs text-slate-500">
            <p className="leading-5">{description}</p>
            {profile.showBranding ? (
              <p className="shrink-0 font-medium text-slate-400">Powered by Dotly</p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  )
}
