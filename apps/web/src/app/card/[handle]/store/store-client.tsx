'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import type { CardStoreProduct } from '@dotly/types'
import { cn } from '@/lib/cn'
import { getPublicApiUrl } from '@/lib/public-env'
import { ProductCheckoutSheet } from '../components/ProductCheckoutSheet'

const API_URL = getPublicApiUrl()

function postAnalytics(body: Record<string, unknown>) {
  fetch(`${API_URL}/public/analytics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {})
}

export function StoreClientPage({
  cardId,
  cardHandle,
  ownerName,
  products,
}: {
  cardId: string
  cardHandle: string
  ownerName: string
  products: CardStoreProduct[]
}) {
  const [selectedProduct, setSelectedProduct] = useState<CardStoreProduct | null>(null)

  useEffect(() => {
    postAnalytics({
      cardId,
      type: 'VIEW',
      metadata: {
        surface: 'store_page',
        action: 'store_page_viewed',
        source: 'card_store_page',
        status: products[0]?.id ?? 'store_page',
      },
    })
  }, [cardId, products])

  function onAnalytics(type: 'CLICK' | 'SAVE', metadata: Record<string, unknown>) {
    postAnalytics({ cardId, type, metadata })
  }

  const featured = products.find((product) => product.highlighted) ?? products[0] ?? null
  const rest = products.filter((product) => product.id !== featured?.id)

  return (
    <>
      {featured && (
        <div className="overflow-hidden rounded-[34px] border border-fuchsia-200 bg-white/90 shadow-[0_34px_90px_-34px_rgba(217,70,239,0.32)] md:grid md:grid-cols-[1.15fr,0.85fr]">
          <div className="p-7">
            <span className="inline-flex rounded-full bg-fuchsia-600 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-white">
              Featured product
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
              {featured.name}
            </h2>
            {featured.description && (
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                {featured.description}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
              {featured.variantLabel && (
                <span className="rounded-full bg-slate-100 px-3 py-1">{featured.variantLabel}</span>
              )}
              {featured.inventoryCount !== undefined && (
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  {featured.inventoryCount} in stock
                </span>
              )}
              {featured.shippingNote && (
                <span className="rounded-full bg-slate-100 px-3 py-1">{featured.shippingNote}</span>
              )}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                Sold by {ownerName}
              </p>
              <button
                type="button"
                onClick={() => {
                  onAnalytics('CLICK', {
                    surface: 'store_page',
                    action: 'product_checkout_started',
                    source: 'card_store_page',
                    status: featured.id,
                    offerId: featured.id,
                    amount: Number(featured.priceUsdt),
                    currency: 'USDT',
                  })
                  setSelectedProduct(featured)
                }}
                className="rounded-2xl bg-fuchsia-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-fuchsia-700"
              >
                Buy featured product
              </button>
            </div>
          </div>
          <div className="relative min-h-[280px] bg-[linear-gradient(135deg,#fdf2f8_0%,#eff6ff_100%)]">
            {featured.imageUrl ? (
              <Image src={featured.imageUrl} alt={featured.name} fill className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-center text-sm font-semibold uppercase tracking-[0.22em] text-fuchsia-400">
                {featured.priceUsdt} USDT
              </div>
            )}
          </div>
        </div>
      )}

      {rest.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rest.map((product) => (
            <div
              key={product.id}
              className="overflow-hidden rounded-[30px] border border-white/70 bg-white/90 shadow-sm backdrop-blur transition-all hover:shadow-md"
            >
              <div className="relative h-44 bg-[linear-gradient(135deg,#faf5ff_0%,#eff6ff_100%)]">
                {product.imageUrl ? (
                  <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm font-semibold uppercase tracking-[0.2em] text-fuchsia-300">
                    {product.priceUsdt} USDT
                  </div>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-lg font-bold text-slate-950">{product.name}</p>
                  <div className="rounded-2xl bg-slate-950 px-3 py-2 text-sm font-bold text-white">
                    {product.priceUsdt} USDT
                  </div>
                </div>
                {product.description && (
                  <p className="mt-3 text-sm leading-6 text-slate-600">{product.description}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
                  {product.variantLabel && (
                    <span className="rounded-full bg-slate-100 px-3 py-1">
                      {product.variantLabel}
                    </span>
                  )}
                  {product.inventoryCount !== undefined && (
                    <span className="rounded-full bg-slate-100 px-3 py-1">
                      {product.inventoryCount} in stock
                    </span>
                  )}
                  {product.shippingNote && (
                    <span className="rounded-full bg-slate-100 px-3 py-1">
                      {product.shippingNote}
                    </span>
                  )}
                </div>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Store item</p>
                  <button
                    type="button"
                    onClick={() => {
                      onAnalytics('CLICK', {
                        surface: 'store_page',
                        action: 'product_checkout_started',
                        source: 'card_store_page',
                        status: product.id,
                        offerId: product.id,
                        amount: Number(product.priceUsdt),
                        currency: 'USDT',
                      })
                      setSelectedProduct(product)
                    }}
                    className="rounded-2xl bg-fuchsia-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-fuchsia-700"
                  >
                    Buy now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedProduct && (
        <ProductCheckoutSheet
          cardHandle={cardHandle}
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAnalytics={onAnalytics}
        />
      )}
    </>
  )
}
