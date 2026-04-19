'use client'

import { useEffect, useState } from 'react'
import type { CardServiceOffer } from '@dotly/types'
import { cn } from '@/lib/cn'
import { getPublicApiUrl } from '@/lib/public-env'
import { ServiceCheckoutSheet } from '../components/ServiceCheckoutSheet'

const API_URL = getPublicApiUrl()

function postAnalytics(body: Record<string, unknown>) {
  fetch(`${API_URL}/public/analytics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).catch(() => {})
}

export function ServicesClientPage({
  cardId,
  cardHandle,
  ownerName,
  services,
}: {
  cardId: string
  cardHandle: string
  ownerName: string
  services: CardServiceOffer[]
}) {
  const [selectedService, setSelectedService] = useState<CardServiceOffer | null>(null)

  useEffect(() => {
    postAnalytics({
      cardId,
      type: 'VIEW',
      metadata: {
        surface: 'services_page',
        action: 'services_page_viewed',
        source: 'card_services_page',
        status: services[0]?.id ?? 'services_page',
      },
    })
  }, [cardId, services])

  function onAnalytics(type: 'CLICK' | 'SAVE', metadata: Record<string, unknown>) {
    postAnalytics({ cardId, type, metadata })
  }

  const featuredService = services.find((service) => service.highlighted) ?? services[0] ?? null
  const remainingServices = services.filter((service) => service.id !== featuredService?.id)

  return (
    <>
      {featuredService && (
        <div className="rounded-[34px] border border-indigo-300 bg-[linear-gradient(135deg,#312e81_0%,#4338ca_45%,#0f172a_100%)] p-7 text-white shadow-[0_34px_90px_-34px_rgba(49,46,129,0.55)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.22em] text-indigo-100">
                Featured offer
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight">{featuredService.name}</h2>
              {featuredService.description && (
                <p className="mt-3 max-w-xl text-sm leading-6 text-indigo-100/90">
                  {featuredService.description}
                </p>
              )}
            </div>
            <div className="rounded-[26px] bg-white/10 px-5 py-4 text-right backdrop-blur">
              <p className="text-xs uppercase tracking-[0.22em] text-indigo-100/80">Price</p>
              <p className="mt-2 text-2xl font-bold">{featuredService.priceUsdt}</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs uppercase tracking-[0.2em] text-indigo-100/80">
              Fulfilled by {ownerName}
            </p>
            <button
              type="button"
              onClick={() => {
                onAnalytics('CLICK', {
                  surface: 'services_page',
                  action: 'service_checkout_started',
                  source: 'card_services_page',
                  status: featuredService.id,
                  offerId: featuredService.id,
                  amount: Number(featuredService.priceUsdt),
                  currency: 'USDT',
                })
                setSelectedService(featuredService)
              }}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-indigo-50"
            >
              Buy featured offer
            </button>
          </div>
        </div>
      )}

      {remainingServices.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {remainingServices.map((service) => (
            <div
              key={service.id}
              className="rounded-[30px] border border-white/70 bg-white/88 p-6 shadow-sm backdrop-blur transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold text-slate-950">{service.name}</p>
                </div>
                <div className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white">
                  {service.priceUsdt}
                </div>
              </div>
              {service.description && (
                <p className="mt-4 text-sm leading-6 text-slate-600">{service.description}</p>
              )}
              <div className="mt-6 flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                  Fulfilled by {ownerName}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onAnalytics('CLICK', {
                      surface: 'services_page',
                      action: 'service_checkout_started',
                      source: 'card_services_page',
                      status: service.id,
                      offerId: service.id,
                      amount: Number(service.priceUsdt),
                      currency: 'USDT',
                    })
                    setSelectedService(service)
                  }}
                  className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
                >
                  Buy now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedService && (
        <ServiceCheckoutSheet
          cardHandle={cardHandle}
          service={selectedService}
          source="card_services_page"
          onClose={() => setSelectedService(null)}
          onAnalytics={onAnalytics}
        />
      )}
    </>
  )
}
