import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { CardServiceOffer } from '@dotly/types'
import { getServerApiUrl } from '@/lib/server-api'
import { ServicesClientPage } from './services-client'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dotly.one'

interface RawCard {
  id: string
  handle: string
  fields: Record<string, unknown>
}

function stringField(fields: Record<string, unknown>, key: string): string {
  const value = fields[key]
  return typeof value === 'string' ? value : ''
}

async function getCard(handle: string): Promise<RawCard | null> {
  const apiUrl = getServerApiUrl()
  const res = await fetch(`${apiUrl}/public/cards/${handle}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Failed to load card (${res.status})`)
  return (await res.json()) as RawCard
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>
}): Promise<Metadata> {
  const { handle } = await params
  const card = await getCard(handle)
  if (!card) return { title: 'Services Not Found' }

  const name = stringField(card.fields, 'name') || handle
  return {
    title: `${name} Services — Dotly.one`,
    description: `Browse and buy fixed-price offers from ${name} on Dotly.one.`,
    alternates: { canonical: `${SITE_URL}/card/${encodeURIComponent(handle)}/services` },
  }
}

export default async function CardServicesPage({
  params,
}: {
  params: Promise<{ handle: string }>
}) {
  const { handle } = await params
  const card = await getCard(handle)
  if (!card) notFound()

  const services = Array.isArray(card.fields.services)
    ? (card.fields.services as CardServiceOffer[])
    : []
  const ownerName = stringField(card.fields, 'name') || handle

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(160deg,#f8fafc_0%,#eef2ff_48%,#e0f2fe_100%)] px-4 py-10">
      <div className="pointer-events-none absolute left-[-8%] top-[-6%] h-64 w-64 rounded-full bg-indigo-300/30 blur-[110px]" />
      <div className="pointer-events-none absolute bottom-[-8%] right-[-6%] h-72 w-72 rounded-full bg-sky-300/30 blur-[120px]" />
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href={`/card/${encodeURIComponent(handle)}`}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to card
          </Link>
          <span className="rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white">
            Services
          </span>
        </div>

        <div className="rounded-[34px] border border-white/70 bg-white/85 p-6 shadow-[0_34px_90px_-34px_rgba(79,70,229,0.28)] backdrop-blur-xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-500">
                Offers surface
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
                Buy a fixed-price offer from {ownerName}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                Browse clearly packaged services without cluttering the main card. Checkout stays
                focused on one clear payment flow.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-[28px] bg-slate-950 p-4 text-white shadow-[0_20px_50px_-20px_rgba(15,23,42,0.55)]">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Offers</p>
                <p className="mt-2 text-2xl font-bold">{services.length}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Payment</p>
                <p className="mt-2 text-2xl font-bold">Available</p>
              </div>
            </div>
          </div>
        </div>

        {services.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500">
            No service offers are published on this card yet.
          </div>
        ) : (
          <ServicesClientPage
            cardId={card.id}
            cardHandle={handle}
            ownerName={ownerName}
            services={services}
          />
        )}
      </div>
    </main>
  )
}
