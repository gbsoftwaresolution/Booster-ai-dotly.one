'use client'

import { useState, useEffect, useRef } from 'react'
import { CardRenderer } from '@dotly/ui'
import type {
  CardRendererProps,
  CardActionConfig,
  CardActionsConfig,
  CardActionType,
  CardServiceOffer,
  CardStoreProduct,
} from '@dotly/types'
import Link from 'next/link'
import { getAccessToken } from '@/lib/auth/client'
import { apiPost } from '@/lib/api'
import { sanitizeNextPath } from '@/lib/app-url'
import { getPublicApiUrl } from '@/lib/public-env'
import { cn } from '@/lib/cn'
import { AnalyticsBeacon } from './AnalyticsBeacon'
import { LeadCaptureModal } from './LeadCaptureModal'
import { ShareBar } from './ShareBar'
import { CardInteractionBar } from './CardInteractionBar'
import { ServiceCheckoutSheet } from './components/ServiceCheckoutSheet'

interface CardViewProps extends CardRendererProps {
  cardHandle: string
  ownerName: string
  vcardPolicy?: 'PUBLIC' | 'MEMBERS_ONLY'
  bookableAppointment?: {
    slug: string
    name: string
    durationMins: number
  } | null
}

const API_URL = getPublicApiUrl()
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dotly.one'

const DEFAULT_WHATSAPP_MESSAGE = 'Hi, I saw your Dotly and want to know more about your service.'

function actionDefaultLabel(type: CardActionType): string {
  switch (type) {
    case 'BOOK':
      return 'Book call'
    case 'WHATSAPP_CHAT':
      return 'Chat now'
    case 'LEAD_CAPTURE':
      return 'Leave details'
  }
}

function normalizeConfiguredActions(
  actions: CardActionsConfig | undefined,
  hasBooking: boolean,
  hasWhatsapp: boolean,
): CardActionConfig[] {
  const fromConfig = [actions?.primary, ...(actions?.secondary ?? [])].filter(
    (action): action is CardActionConfig => !!action?.type,
  )

  const uniqueConfigured = fromConfig.filter(
    (action, index, all) =>
      action.enabled !== false &&
      all.findIndex((item) => item.type === action.type) === index &&
      (action.type !== 'BOOK' || hasBooking) &&
      (action.type !== 'WHATSAPP_CHAT' || hasWhatsapp),
  )

  if (uniqueConfigured.length > 0) {
    return uniqueConfigured.slice(0, 3).map((action) => ({
      ...action,
      label: action.label?.trim() || actionDefaultLabel(action.type),
    }))
  }

  const fallback: CardActionConfig[] = []
  if (hasBooking) fallback.push({ type: 'BOOK', label: actionDefaultLabel('BOOK') })
  if (hasWhatsapp) {
    fallback.push({
      type: 'WHATSAPP_CHAT',
      label: actionDefaultLabel('WHATSAPP_CHAT'),
      whatsappMessage: DEFAULT_WHATSAPP_MESSAGE,
    })
  }
  fallback.push({ type: 'LEAD_CAPTURE', label: actionDefaultLabel('LEAD_CAPTURE') })
  return fallback.slice(0, 3)
}

function normalizeWhatsappNumber(value: string): string {
  return value.replace(/[^\d]/g, '')
}

async function recordPublicContactEvent(body: Record<string, unknown>) {
  try {
    await fetch(`${API_URL}/public/contact-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    // Best effort only.
  }
}

function postAnalytics(body: Record<string, unknown>) {
  fetch(`${API_URL}/public/analytics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {})
}

/** Download a vCard using fetch() + createObjectURL() so that the
 *  Authorization header can be sent — the vCard endpoint only accepts
 *  Bearer tokens, not ?token= query params (stripped for security).
 */
async function downloadVcardFetch(cardHandle: string, token?: string | null) {
  const url = `${API_URL}/public/cards/${cardHandle}/vcard`
  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
  const res = await fetch(url, { headers })
  if (!res.ok) {
    throw new Error(
      res.status === 403 ? 'Sign in to save this contact.' : 'Failed to download contact.',
    )
  }

  const blob = await res.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = `${cardHandle}.vcf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(objectUrl)
}

export function CardView({
  cardHandle,
  ownerName,
  vcardPolicy = 'PUBLIC',
  bookableAppointment = null,
  ...rendererProps
}: CardViewProps) {
  const [leadModalOpen, setLeadModalOpen] = useState(false)
  const [selectedService, setSelectedService] = useState<CardServiceOffer | null>(null)
  const [capturedContactId, setCapturedContactId] = useState<string | null>(null)
  const [isAuth, setIsAuth] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [vcardBlocked, setVcardBlocked] = useState(false) // shown when MEMBERS_ONLY + not auth
  const [vcardError, setVcardError] = useState<string | null>(null)
  const tokenRef = useRef<string | null>(null)
  const allowAnonymousExport = vcardPolicy !== 'MEMBERS_ONLY'
  const normalizedWhatsapp = normalizeWhatsappNumber(rendererProps.card.fields.whatsapp ?? '')
  const configuredActions = normalizeConfiguredActions(
    rendererProps.card.fields.actions,
    !!bookableAppointment,
    normalizedWhatsapp.length > 0,
  )

  // Resolve auth token once on mount and cache it.
  // tokenRef is used as a fast-path cache; handleSaveContact always calls
  // getAccessToken() directly to avoid acting on a stale null before the
  // effect has settled (race condition on fast taps).
  useEffect(() => {
    getAccessToken()
      .then((token) => {
        tokenRef.current = token ?? null
        setIsAuth(!!token)
        setAuthChecked(true)
      })
      .catch(() => setAuthChecked(true))
  }, [])

  function trackInteraction(type: 'CLICK' | 'SAVE', metadata: Record<string, unknown>) {
    postAnalytics({
      cardId: rendererProps.card.id,
      type,
      metadata,
    })
  }

  function handleSocialLinkClick(platform: string, url: string) {
    trackInteraction('CLICK', {
      surface: 'card',
      action: 'social_link_click',
      linkPlatform: platform,
      linkUrl: url,
    })
  }

  async function handleSaveContact() {
    setVcardError(null)
    trackInteraction('SAVE', {
      surface: 'card',
      action: 'save_contact_attempt',
    })

    // Always await the live token — avoids a race where tokenRef.current is
    // still null because the mount effect hasn't resolved yet.
    const token = await getAccessToken().catch(() => null)
    // Keep the ref in sync for other consumers (e.g. LeadCaptureModal)
    tokenRef.current = token ?? null

    // Policy gate: if MEMBERS_ONLY and not authenticated, show prompt
    if (vcardPolicy === 'MEMBERS_ONLY' && !token) {
      trackInteraction('CLICK', {
        surface: 'card',
        action: 'members_only_gate_shown',
        status: 'blocked',
      })
      setVcardBlocked(true)
      return
    }

    // Download the vCard — token sent as Authorization header (Bearer),
    // which is the only method the server accepts for MEMBERS_ONLY cards.
    try {
      await downloadVcardFetch(cardHandle, token)
    } catch (error) {
      setVcardError(error instanceof Error ? error.message : 'Failed to download contact.')
      return
    }

    trackInteraction('SAVE', {
      surface: 'card',
      action: 'vcard_downloaded',
      status: token ? 'authenticated' : 'public',
    })

    // If authenticated: also save to their Dotly CRM
    if (token) {
      try {
        await apiPost(
          '/contacts',
          {
            name: ownerName,
            sourceCardId: rendererProps.card.id,
            sourceHandle: cardHandle,
          },
          token,
        )
      } catch {
        // CRM save failure is non-blocking — vCard already downloaded
      }
    }
  }

  return (
    <>
      <CardRenderer
        {...rendererProps}
        onLeadCapture={() => setLeadModalOpen(true)}
        onSocialLinkClick={handleSocialLinkClick}
        onSaveContact={() => void handleSaveContact()}
      />

      {vcardError && (
        <div className="px-4 pt-3">
          <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {vcardError}
          </p>
        </div>
      )}

      {configuredActions.length > 0 && (
        <PrimaryActionStack
          actions={configuredActions}
          cardHandle={cardHandle}
          bookableAppointment={bookableAppointment}
          whatsappNumber={normalizedWhatsapp}
          capturedContactId={capturedContactId}
          onLeadCapture={() => setLeadModalOpen(true)}
          onAnalytics={trackInteraction}
        />
      )}

      {(rendererProps.card.fields.services?.length ?? 0) > 0 && (
        <ServiceOffersSection
          cardHandle={cardHandle}
          services={rendererProps.card.fields.services ?? []}
          onSelectService={setSelectedService}
          onAnalytics={trackInteraction}
        />
      )}

      {(rendererProps.card.fields.products?.length ?? 0) > 0 && (
        <StoreTeaserSection
          cardHandle={cardHandle}
          products={rendererProps.card.fields.products ?? []}
          onAnalytics={trackInteraction}
        />
      )}

      {/* Share bar — shown below the card */}
      <ShareBar
        handle={cardHandle}
        ownerName={ownerName}
        allowAnonymousExport={allowAnonymousExport}
        onAnalytics={trackInteraction}
      />

      {/* LeadCaptureModal — unauthenticated visitors get the contact form
          authenticated Dotly users get the direct "Connect" flow */}
      {leadModalOpen && (
        <LeadCaptureModal
          cardId={rendererProps.card.id}
          cardHandle={cardHandle}
          ownerName={ownerName}
          isAuth={isAuth && authChecked}
          authToken={tokenRef.current}
          onAnalytics={trackInteraction}
          onLeadCaptured={setCapturedContactId}
          onClose={() => setLeadModalOpen(false)}
        />
      )}

      {selectedService && (
        <ServiceCheckoutSheet
          cardHandle={cardHandle}
          service={selectedService}
          onClose={() => setSelectedService(null)}
          onAnalytics={trackInteraction}
        />
      )}

      {/* Members-only vCard gate — shown when policy is MEMBERS_ONLY and visitor is not logged in */}
      {vcardBlocked && (
        <MembersOnlySheet ownerName={ownerName} onClose={() => setVcardBlocked(false)} />
      )}

      {/* Card interaction bar — shown to authenticated Dotly users only */}
      <CardInteractionBar
        cardId={rendererProps.card.id}
        cardHandle={cardHandle}
        ownerName={ownerName}
        onAnalytics={trackInteraction}
      />

      <AnalyticsBeacon cardId={rendererProps.card.id} />
    </>
  )
}

function StoreTeaserSection({
  cardHandle,
  products,
  onAnalytics,
}: {
  cardHandle: string
  products: CardStoreProduct[]
  onAnalytics: (type: 'CLICK' | 'SAVE', metadata: Record<string, unknown>) => void
}) {
  const featured = products.find((product) => product.highlighted) ?? products[0] ?? null
  if (!featured) return null

  return (
    <div className="px-4 pb-3">
      <div className="rounded-[28px] border border-fuchsia-100 bg-white/90 p-4 shadow-sm backdrop-blur">
        <div className="mb-3 px-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-fuchsia-600">
            Store
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Open the storefront to browse products without cluttering the main card.
          </p>
        </div>
        <div className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-900">{featured.name}</p>
              {featured.description && (
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                  {featured.description}
                </p>
              )}
            </div>
            <div className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white">
              {featured.priceUsdt} USDT
            </div>
          </div>
        </div>
        <Link
          href={`/card/${encodeURIComponent(cardHandle)}/store`}
          onClick={() => {
            onAnalytics('CLICK', {
              surface: 'store_teaser',
              action: 'product_checkout_started',
              source: 'card_public_page',
              status: featured.id,
              offerId: featured.id,
            })
          }}
          className="mt-4 block rounded-2xl bg-fuchsia-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-fuchsia-700"
        >
          Open store
        </Link>
      </div>
    </div>
  )
}

function ServiceOffersSection({
  cardHandle,
  services,
  onSelectService,
  onAnalytics,
}: {
  cardHandle: string
  services: CardServiceOffer[]
  onSelectService: (service: CardServiceOffer) => void
  onAnalytics: (type: 'CLICK' | 'SAVE', metadata: Record<string, unknown>) => void
}) {
  return (
    <div className="px-4 pb-3">
      <div className="rounded-[28px] border border-indigo-100 bg-white/90 p-4 shadow-sm backdrop-blur">
        <div className="mb-3 px-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-indigo-600">
            Fixed-price services
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Keep your main card focused and send buyers to a dedicated offers surface.
          </p>
        </div>
        <div className="space-y-2">
          {services.slice(0, 3).map((service) => (
            <div
              key={service.id}
              className={cn(
                'rounded-2xl border px-4 py-3',
                service.highlighted
                  ? 'border-indigo-300 bg-indigo-50'
                  : 'border-slate-200 bg-white',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">{service.name}</p>
                  {service.description && (
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                      {service.description}
                    </p>
                  )}
                </div>
                <div className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white">
                  {service.priceUsdt} USDT
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-3">
          <Link
            href={`/card/${encodeURIComponent(cardHandle)}/services`}
            onClick={() => {
              onAnalytics('CLICK', {
                surface: 'service_offer_teaser',
                action: 'service_checkout_started',
                source: 'card_public_page',
                status: services[0]?.id ?? 'services_page',
                offerId: services[0]?.id,
              })
            }}
            className="flex-1 rounded-2xl bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            View services
          </Link>
          {services[0] && (
            <button
              type="button"
              onClick={() => onSelectService(services[0]!)}
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Quick buy
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function PrimaryActionStack({
  actions,
  cardHandle,
  bookableAppointment,
  whatsappNumber,
  capturedContactId,
  onLeadCapture,
  onAnalytics,
}: {
  actions: CardActionConfig[]
  cardHandle: string
  bookableAppointment: CardViewProps['bookableAppointment']
  whatsappNumber: string
  capturedContactId: string | null
  onLeadCapture: () => void
  onAnalytics: (type: 'CLICK' | 'SAVE', metadata: Record<string, unknown>) => void
}) {
  return (
    <div className="px-4 pb-3 pt-3">
      <div className="rounded-[28px] border border-sky-100 bg-white/90 p-3 shadow-sm backdrop-blur">
        <div className="mb-3 px-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-sky-600">
            Contact to customer
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Choose the fastest next step from this card.
          </p>
        </div>
        <div className="space-y-2">
          {actions.map((action, index) => (
            <ActionButton
              key={`${action.type}-${index}`}
              action={action}
              cardHandle={cardHandle}
              bookableAppointment={bookableAppointment}
              whatsappNumber={whatsappNumber}
              capturedContactId={capturedContactId}
              primary={index === 0}
              onLeadCapture={onLeadCapture}
              onAnalytics={onAnalytics}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ActionButton({
  action,
  cardHandle,
  bookableAppointment,
  whatsappNumber,
  capturedContactId,
  primary,
  onLeadCapture,
  onAnalytics,
}: {
  action: CardActionConfig
  cardHandle: string
  bookableAppointment: CardViewProps['bookableAppointment']
  whatsappNumber: string
  capturedContactId: string | null
  primary: boolean
  onLeadCapture: () => void
  onAnalytics: (type: 'CLICK' | 'SAVE', metadata: Record<string, unknown>) => void
}) {
  const label = action.label?.trim() || actionDefaultLabel(action.type)

  if (action.type === 'BOOK' && bookableAppointment) {
    const bookingUrl = `${SITE_URL}/book/${encodeURIComponent(cardHandle)}/${encodeURIComponent(bookableAppointment.slug)}`
    return (
      <a
        href={bookingUrl}
        onClick={() => {
          onAnalytics('CLICK', {
            surface: 'primary_cta',
            action: 'open_booking_page',
            ctaType: 'BOOK',
            source: 'card_public_page',
            status: bookableAppointment.slug,
            appointmentTypeId: bookableAppointment.slug,
          })
        }}
        className={ctaClassName(primary)}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{label}</p>
          <p className={cn('truncate text-xs', primary ? 'text-sky-100/85' : 'text-slate-500')}>
            {bookableAppointment.name} · {bookableAppointment.durationMins} min
          </p>
        </div>
        <span
          className={cn(
            'rounded-xl px-3 py-2 text-xs font-bold',
            primary ? 'bg-white/15 text-white' : 'bg-sky-500 text-white',
          )}
        >
          Book
        </span>
      </a>
    )
  }

  if (action.type === 'WHATSAPP_CHAT' && whatsappNumber) {
    const whatsappMessage = action.whatsappMessage?.trim() || DEFAULT_WHATSAPP_MESSAGE
    return (
      <button
        type="button"
        onClick={() => {
          void (async () => {
            let generatedMessage = whatsappMessage
            let automationEnabled = false
            let nextStep: string | undefined
            try {
              const res = await fetch(`${API_URL}/public/cards/${cardHandle}/whatsapp-handoff`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contactId: capturedContactId ?? undefined }),
              })
              if (res.ok) {
                const data = (await res.json()) as {
                  enabled: boolean
                  generatedMessage: string
                  nextStep?: string
                }
                generatedMessage = data.generatedMessage || generatedMessage
                automationEnabled = data.enabled
                nextStep = data.nextStep
              }
            } catch {
              // fall back to the static WhatsApp message
            }

            onAnalytics('CLICK', {
              surface: 'primary_cta',
              action: 'whatsapp_clicked',
              ctaType: 'WHATSAPP_CHAT',
              source: 'card_public_page',
              status: automationEnabled ? 'automated' : 'outbound',
              ...(nextStep ? { campaign: nextStep } : {}),
              ...(capturedContactId ? { contactId: capturedContactId } : {}),
            })
            if (capturedContactId) {
              void recordPublicContactEvent({
                contactId: capturedContactId,
                event: 'WHATSAPP_CLICKED',
                metadata: {
                  source: 'card_public_page',
                  cardHandle,
                  ctaType: 'WHATSAPP_CHAT',
                  automationEnabled,
                  ...(nextStep ? { nextStep } : {}),
                },
              })
            }
            window.open(
              `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(generatedMessage)}`,
              '_blank',
              'noreferrer',
            )
          })()
        }}
        className={ctaClassName(primary)}
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{label}</p>
          <p className={cn('truncate text-xs', primary ? 'text-sky-100/85' : 'text-slate-500')}>
            Starts a prefilled WhatsApp conversation
          </p>
        </div>
        <span
          className={cn(
            'rounded-xl px-3 py-2 text-xs font-bold',
            primary ? 'bg-white/15 text-white' : 'bg-emerald-500 text-white',
          )}
        >
          WhatsApp
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        onAnalytics('CLICK', {
          surface: 'primary_cta',
          action: 'open_lead_capture',
          ctaType: 'LEAD_CAPTURE',
          source: 'card_public_page',
          status: 'modal',
        })
        onLeadCapture()
      }}
      className={ctaClassName(primary)}
    >
      <div className="min-w-0 text-left">
        <p className="truncate text-sm font-bold">{label}</p>
        <p className={cn('truncate text-xs', primary ? 'text-sky-100/85' : 'text-slate-500')}>
          Leave your details and continue the conversation later
        </p>
      </div>
      <span
        className={cn(
          'rounded-xl px-3 py-2 text-xs font-bold',
          primary ? 'bg-white/15 text-white' : 'bg-slate-900 text-white',
        )}
      >
        Capture
      </span>
    </button>
  )
}

function ctaClassName(primary: boolean): string {
  return primary
    ? 'flex items-center justify-between rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-3 text-white shadow-[0_18px_40px_-24px_rgba(14,165,233,0.65)]'
    : 'flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm'
}

// ─── Members-only gate sheet ──────────────────────────────────────────────────

function MembersOnlySheet({ ownerName, onClose }: { ownerName: string; onClose: () => void }) {
  const firstName = ownerName.split(' ')[0] ?? ownerName
  const next = encodeURIComponent(
    sanitizeNextPath(typeof window !== 'undefined' ? window.location.pathname : '/dashboard'),
  )

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-5 shadow-2xl"
        style={{ maxWidth: 480, margin: '0 auto' }}
      >
        <div className="mb-4 h-1 w-10 rounded-full bg-gray-200 mx-auto" />
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
            <svg
              className="h-7 w-7 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <p className="text-base font-bold text-gray-900">Sign in to save {firstName}</p>
          <p className="text-sm text-gray-500">
            {firstName} has enabled member-only contact saving. Create a free Dotly account to
            download their contact and exchange details.
          </p>
          <Link
            href={`/auth?mode=signup&next=${next}`}
            className="mt-2 w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white text-center block"
          >
            Create free account
          </Link>
          <Link
            href={`/auth?mode=signin&next=${next}`}
            className="w-full rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 text-center block"
          >
            Sign in
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-gray-400 hover:text-gray-600 mt-1"
          >
            Maybe later
          </button>
        </div>
      </div>
    </>
  )
}
