'use client'

import { getPublicApiUrl } from '@/lib/public-env'

const API_URL = getPublicApiUrl()

interface SalesLinkProfile {
  name: string | null
  pitch: string | null
  phone: string | null
}

async function trackClick(action: 'whatsapp' | 'booking' | 'payment') {
  try {
    await fetch(`${API_URL}/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        timestamp: Date.now(),
      }),
      keepalive: true,
    })
  } catch {
    // Click tracking should never block the CTA.
  }
}

function normalizePhone(phone: string | null): string {
  return (phone ?? '').replace(/[^\d]/g, '')
}

export function SalesLinkClient({ profile }: { profile: SalesLinkProfile }) {
  const name = profile.name?.trim() || 'Dotly seller'
  const pitch = profile.pitch?.trim() || 'Helping buyers move faster with one clear next step.'
  const description =
    'Start the conversation, book a quick call, or request payment details in seconds.'

  async function handleWhatsApp() {
    await trackClick('whatsapp')

    const msg = encodeURIComponent(
      `Hi ${name}, I saw your Dotly and I'm interested in your service.`,
    )
    const phone = normalizePhone(profile.phone)

    if (!phone) return
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank', 'noopener,noreferrer')
  }

  async function handlePlaceholder(action: 'booking' | 'payment') {
    await trackClick(action)
  }

  const whatsappDisabled = !normalizePhone(profile.phone)

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_55%,#ffffff_100%)] px-4 py-6 text-slate-950 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md items-center">
        <section className="w-full rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur sm:p-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
            Sales Link
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{name}</h1>
          <p className="mt-3 text-base leading-7 text-slate-600">{pitch}</p>

          <div className="mt-8 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => void handleWhatsApp()}
              disabled={whatsappDisabled}
              className="min-h-14 rounded-2xl bg-slate-950 px-5 py-4 text-base font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Chat on WhatsApp
            </button>

            <button
              type="button"
              onClick={() => void handlePlaceholder('booking')}
              className="min-h-14 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Book Call
            </button>

            <button
              type="button"
              onClick={() => void handlePlaceholder('payment')}
              className="min-h-14 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base font-semibold text-slate-900 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Pay Now
            </button>
          </div>

          <p className="mt-6 text-sm leading-6 text-slate-500">{description}</p>
        </section>
      </div>
    </main>
  )
}
