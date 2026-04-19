'use client'

import type { JSX } from 'react'
import type { CardServiceOffer, PartialCardFields } from '@dotly/types'

interface ServicesTabProps {
  fields: PartialCardFields
  onServicesChange: (services: CardServiceOffer[] | undefined) => void
}

export function ServicesTab({ fields, onServicesChange }: ServicesTabProps): JSX.Element {
  const services = Array.isArray(fields.services) ? fields.services.slice(0, 3) : []

  function updateServices(nextServices: CardServiceOffer[]) {
    onServicesChange(nextServices.length > 0 ? nextServices : undefined)
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-slate-200 bg-white/70 p-5 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.22)]">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
          Services surface
        </p>
        <h3 className="mt-2 text-lg font-bold tracking-tight text-slate-900">
          Create a focused list of fixed-price offers
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Add up to 3 service offers. One can be visually highlighted on your public services page.
        </p>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white/70 p-5 space-y-4">
        {services.length === 0 && (
          <p className="text-sm text-slate-500">
            No offers yet. Add your first fixed-price service to start selling from your card.
          </p>
        )}

        {services.map((service, index) => (
          <div
            key={service.id || index}
            className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                value={service.name}
                onChange={(e) => {
                  const next = [...services]
                  next[index] = { ...service, name: e.target.value.slice(0, 160) }
                  updateServices(next)
                }}
                placeholder="Service name"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
              />
              <input
                type="text"
                value={service.priceUsdt}
                onChange={(e) => {
                  const next = [...services]
                  next[index] = { ...service, priceUsdt: e.target.value.slice(0, 32) }
                  updateServices(next)
                }}
                placeholder="Price"
                className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <textarea
              rows={3}
              value={service.description ?? ''}
              onChange={(e) => {
                const next = [...services]
                next[index] = { ...service, description: e.target.value.slice(0, 400) }
                updateServices(next)
              }}
              placeholder="What the buyer gets"
              className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
            />
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={!!service.highlighted}
                  onChange={(e) => {
                    const next = services.map((item, itemIndex) => ({
                      ...item,
                      highlighted: itemIndex === index ? e.target.checked : false,
                    }))
                    updateServices(next)
                  }}
                />
                Highlight this offer
              </label>
              <button
                type="button"
                onClick={() =>
                  updateServices(services.filter((_, itemIndex) => itemIndex !== index))
                }
                className="text-sm font-semibold text-red-500 hover:text-red-600"
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        {services.length < 3 && (
          <button
            type="button"
            onClick={() =>
              updateServices([
                ...services,
                {
                  id: `service-${Date.now().toString(36)}`,
                  name: '',
                  priceUsdt: '',
                },
              ])
            }
            className="rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Add service offer
          </button>
        )}
      </div>
    </div>
  )
}
