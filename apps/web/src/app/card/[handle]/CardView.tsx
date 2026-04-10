'use client'

import { useState, useEffect, useRef } from 'react'
import { CardRenderer } from '@dotly/ui'
import type { CardRendererProps } from '@dotly/types'
import { getAccessToken } from '@/lib/supabase/client'
import { apiPost } from '@/lib/api'
import { AnalyticsBeacon } from './AnalyticsBeacon'
import { LeadCaptureModal } from './LeadCaptureModal'
import { ShareBar } from './ShareBar'
import { CardInteractionBar } from './CardInteractionBar'

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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dotly.one'

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
  try {
    const res = await fetch(url, { headers })
    if (!res.ok) return
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = `${cardHandle}.vcf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(objectUrl)
  } catch {
    /* non-blocking */
  }
}

export function CardView({
  cardHandle,
  ownerName,
  vcardPolicy = 'PUBLIC',
  bookableAppointment = null,
  ...rendererProps
}: CardViewProps) {
  const [leadModalOpen, setLeadModalOpen] = useState(false)
  const [isAuth, setIsAuth] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [vcardBlocked, setVcardBlocked] = useState(false) // shown when MEMBERS_ONLY + not auth
  const tokenRef = useRef<string | null>(null)
  const allowAnonymousExport = vcardPolicy !== 'MEMBERS_ONLY'

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
    await downloadVcardFetch(cardHandle, token)
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

      {bookableAppointment && (
        <BookMeetingBar
          cardHandle={cardHandle}
          appointmentName={bookableAppointment.name}
          appointmentSlug={bookableAppointment.slug}
          durationMins={bookableAppointment.durationMins}
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
          onClose={() => setLeadModalOpen(false)}
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

function BookMeetingBar({
  cardHandle,
  appointmentName,
  appointmentSlug,
  durationMins,
  onAnalytics,
}: {
  cardHandle: string
  appointmentName: string
  appointmentSlug: string
  durationMins: number
  onAnalytics: (type: 'CLICK' | 'SAVE', metadata: Record<string, unknown>) => void
}) {
  const bookingUrl = `${SITE_URL}/book/${encodeURIComponent(cardHandle)}/${encodeURIComponent(appointmentSlug)}`

  return (
    <div className="px-4 pb-3 pt-3">
      <a
        href={bookingUrl}
        onClick={() => {
          onAnalytics('CLICK', {
            surface: 'booking_bar',
            action: 'open_booking_page',
            status: appointmentSlug,
          })
        }}
        className="flex items-center justify-between rounded-2xl border border-sky-100 bg-white/90 px-4 py-3 shadow-sm backdrop-blur"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">Book a meeting</p>
          <p className="truncate text-xs text-slate-500">
            {appointmentName} · {durationMins} min
          </p>
        </div>
        <span className="rounded-xl bg-sky-500 px-3 py-2 text-xs font-bold text-white">
          Book now
        </span>
      </a>
    </div>
  )
}

// ─── Members-only gate sheet ──────────────────────────────────────────────────

function MembersOnlySheet({ ownerName, onClose }: { ownerName: string; onClose: () => void }) {
  const firstName = ownerName.split(' ')[0] ?? ownerName
  const SITE_URL_LOCAL = SITE_URL

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
          <a
            href={`${SITE_URL_LOCAL}/auth?mode=signup`}
            className="mt-2 w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white text-center block"
          >
            Create free account
          </a>
          <a
            href={`${SITE_URL_LOCAL}/auth?mode=login`}
            className="w-full rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 text-center block"
          >
            Sign in
          </a>
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
