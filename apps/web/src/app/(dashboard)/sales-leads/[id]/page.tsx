'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { apiGet, apiPost } from '@/lib/api'
import { getAccessToken } from '@/lib/auth/client'

const LEAD_STATUSES = ['new', 'contacted', 'booked', 'paid', 'closed', 'lost'] as const

function statusClasses(status: string) {
  if (status === 'paid' || status === 'closed')
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (status === 'booked') return 'bg-sky-50 text-sky-700 ring-sky-200'
  if (status === 'contacted') return 'bg-amber-50 text-amber-700 ring-amber-200'
  if (status === 'lost') return 'bg-rose-50 text-rose-700 ring-rose-200'
  return 'bg-slate-100 text-slate-700 ring-slate-200'
}

interface SalesLeadDetail {
  id: string
  username: string
  status: string
  source: string | null
  note: string | null
  followUpFlag: boolean
  createdAt: string
  events: Array<{ action: string; intent: string | null; createdAt: string }>
  bookings: Array<{ slot: string; createdAt: string }>
  payments: Array<{ amount: number; status: string; createdAt: string }>
}

export default function SalesLeadDetailPage() {
  const params = useParams<{ id: string }>()
  const leadId = params.id

  const [lead, setLead] = useState<SalesLeadDetail | null>(null)
  const [status, setStatus] = useState('new')
  const [note, setNote] = useState('')
  const [followUpFlag, setFollowUpFlag] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    void (async () => {
      try {
        const token = await getAccessToken()
        if (!token) return

        const response = await apiGet<SalesLeadDetail>(`/lead/${leadId}`, token)
        if (!active) return

        setLead(response)
        setStatus(response.status)
        setNote(response.note ?? '')
        setFollowUpFlag(response.followUpFlag)
        setError(null)
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Could not load lead detail.')
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [leadId])

  async function saveLead() {
    try {
      setSaving(true)
      const token = await getAccessToken()
      if (!token) return

      await apiPost(`/lead/${leadId}`, { status, note, followUpFlag }, token)
      const response = await apiGet<SalesLeadDetail>(`/lead/${leadId}`, token)
      setLead(response)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save lead.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-500">
          Lead Detail
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">Lead Timeline</h1>
        <p className="mt-2 text-sm text-gray-600">
          See what happened, what money came in, and what you need to do next.
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {loading ? <div className="h-40 animate-pulse rounded-[28px] bg-gray-100" /> : null}

      {lead ? (
        <section className="space-y-6 rounded-[28px] border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Created</p>
              <p className="mt-2 text-sm font-semibold text-gray-900">
                {new Date(lead.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Source</p>
              <p className="mt-2 text-sm font-semibold text-gray-900">{lead.source ?? 'direct'}</p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Status</p>
              <span
                className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${statusClasses(lead.status)}`}
              >
                {lead.status}
              </span>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Follow-Up</p>
              <p className="mt-2 text-sm font-semibold text-gray-900">
                {lead.followUpFlag ? 'Needs Follow-Up' : 'Clear'}
              </p>
            </div>
          </div>

          <div className="rounded-[24px] border border-gray-200 p-4 sm:p-5">
            <p className="text-sm font-semibold text-gray-900">Update lead</p>

            <div className="mt-4 grid gap-4">
              <label className="text-sm text-gray-700">
                <span className="mb-2 block font-medium">Status</span>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900"
                >
                  {LEAD_STATUSES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-gray-700">
                <span className="mb-2 block font-medium">Notes</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900"
                />
              </label>

              <label className="flex items-center gap-3 text-sm font-medium text-gray-900">
                <input
                  type="checkbox"
                  checked={followUpFlag}
                  onChange={(event) => setFollowUpFlag(event.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                Needs Follow-Up
              </label>

              <button
                type="button"
                onClick={() => void saveLead()}
                disabled={saving}
                className="rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <h2 className="text-sm font-semibold text-gray-900">Events</h2>
              <div className="mt-3 space-y-2">
                {lead.events.map((event, index) => (
                  <div
                    key={`${event.createdAt}-${index}`}
                    className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-600"
                  >
                    <p className="font-medium text-gray-900 capitalize">{event.action}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {new Date(event.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <h2 className="text-sm font-semibold text-gray-900">Bookings</h2>
              <div className="mt-3 space-y-2">
                {lead.bookings.length ? (
                  lead.bookings.map((booking, index) => (
                    <div
                      key={`${booking.createdAt}-${index}`}
                      className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-600"
                    >
                      <p className="font-medium text-gray-900">{booking.slot}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(booking.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No bookings yet.</p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <h2 className="text-sm font-semibold text-gray-900">Payments</h2>
              <div className="mt-3 space-y-2">
                {lead.payments.length ? (
                  lead.payments.map((payment, index) => (
                    <div
                      key={`${payment.createdAt}-${index}`}
                      className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-600"
                    >
                      <p className="font-medium text-gray-900">{payment.amount}</p>
                      <p className="mt-1 text-xs uppercase text-gray-500">{payment.status}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(payment.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No payments yet.</p>
                )}
              </div>
            </section>
          </div>
        </section>
      ) : null}
    </main>
  )
}
