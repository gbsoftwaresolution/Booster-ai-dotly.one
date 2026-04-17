import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { CardStoreProduct } from '@dotly/types'
import { getServerApiUrl } from '@/lib/server-api'
import { StoreClientPage } from './store-client'

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
  if (!card) return { title: 'Store Not Found' }

  const name = stringField(card.fields, 'name') || handle
  return {
    title: `${name} Store — Dotly.one`,
    description: `Browse and buy products from ${name}'s crypto storefront on Dotly.one.`,
    alternates: { canonical: `${SITE_URL}/card/${encodeURIComponent(handle)}/store` },
  }
}

export default async function CardStorePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  const card = await getCard(handle)
  if (!card) notFound()

  const products = Array.isArray(card.fields.products)
    ? (card.fields.products as CardStoreProduct[])
    : []
  const ownerName = stringField(card.fields, 'name') || handle

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(160deg,#fdf2f8_0%,#faf5ff_42%,#eff6ff_100%)] px-4 py-10">
      <div className="pointer-events-none absolute left-[-8%] top-[-6%] h-64 w-64 rounded-full bg-fuchsia-300/30 blur-[110px]" />
      <div className="pointer-events-none absolute bottom-[-8%] right-[-6%] h-72 w-72 rounded-full bg-cyan-300/30 blur-[120px]" />
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href={`/card/${encodeURIComponent(handle)}`}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/70 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to card
          </Link>
          <span className="rounded-full bg-fuchsia-600 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white">
            Store
          </span>
        </div>

        <div className="rounded-[34px] border border-white/70 bg-white/85 p-6 shadow-[0_34px_90px_-34px_rgba(217,70,239,0.28)] backdrop-blur-xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-fuchsia-500">
                Store surface
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
                Shop products from {ownerName}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                A lightweight crypto storefront for products, bundles, and packaged goods, separate
                from the main card and the services page.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-[28px] bg-slate-950 p-4 text-white shadow-[0_20px_50px_-20px_rgba(15,23,42,0.55)]">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Products</p>
                <p className="mt-2 text-2xl font-bold">{products.length}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Payment</p>
                <p className="mt-2 text-2xl font-bold">USDT</p>
              </div>
            </div>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500">
            No products are published in this store yet.
          </div>
        ) : (
          <StoreClientPage
            cardId={card.id}
            cardHandle={handle}
            ownerName={ownerName}
            products={products}
          />
        )}
      </div>
    </main>
  )
}
