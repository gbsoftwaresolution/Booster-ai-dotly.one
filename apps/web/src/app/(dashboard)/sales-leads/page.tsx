'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { apiGet } from '@/lib/api'
import { getAccessToken } from '@/lib/auth/client'

interface SalesLeadListItem {
  id: string
  status: string
  source: string | null
  followUpFlag: boolean
  createdAt: string
  lastAction: string
}

interface MeResponse {
  username: string | null
}

function statusClasses(status: string) {
  if (status === 'paid' || status === 'closed')
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (status === 'booked') return 'bg-sky-50 text-sky-700 ring-sky-200'
  if (status === 'contacted') return 'bg-amber-50 text-amber-700 ring-amber-200'
  if (status === 'lost') return 'bg-rose-50 text-rose-700 ring-rose-200'
  return 'bg-slate-100 text-slate-700 ring-slate-200'
}

export default function SalesLeadsPage() {
  const [leads, setLeads] = useState<SalesLeadListItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    void (async () => {
      try {
        const token = await getAccessToken()
        if (!token) return

        const me = await apiGet<MeResponse>('/users/me', token)
        if (!me.username) {
          throw new Error('Set a username to manage your leads.')
        }

        const response = await apiGet<SalesLeadListItem[]>(
          `/leads/${encodeURIComponent(me.username)}`,
          token,
        )
        if (!active) return

        setLeads(response)
        setError(null)
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Could not load leads.')
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [])

  return (
    <main className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-500">
          Sales CRM
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">Leads</h1>
        <p className="mt-2 text-sm text-gray-600">
          See every lead, what happened last, and what needs follow-up.
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-24 animate-pulse rounded-[24px] bg-gray-100" />
            ))}
          </div>
        ) : null}

        {!loading && !leads.length ? (
          <p className="text-sm text-gray-500">
            No leads yet. Share your sales link to start building your pipeline.
          </p>
        ) : null}

        <div className="space-y-3">
          {leads.map((lead) => (
            <Link
              key={lead.id}
              href={`/sales-leads/${lead.id}`}
              className={`block rounded-[24px] border p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm ${
                lead.followUpFlag ? 'border-amber-200 bg-amber-50/70' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${statusClasses(lead.status)}`}
                    >
                      {lead.status}
                    </span>
                    {lead.followUpFlag ? (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200">
                        Needs Follow-Up
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm font-medium text-gray-900">
                    Last action: {lead.lastAction}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Source: {lead.source ?? 'direct'} • Created{' '}
                    {new Date(lead.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="text-sm font-semibold text-brand-600">Open lead</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
