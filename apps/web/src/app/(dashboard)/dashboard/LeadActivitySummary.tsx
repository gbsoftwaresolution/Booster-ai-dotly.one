'use client'

import { useEffect, useState } from 'react'
import { apiGet, apiPost } from '@/lib/api'
import { getAccessToken } from '@/lib/auth/client'

interface LeadDashboardData {
  totalLeads: number
  totalBookings: number
  revenue: number
  payments: number
  pendingCollectionPayments: number
  stripeEnabled: boolean
  pipeline: {
    new: number
    contacted: number
    booked: number
    paid: number
    lost: number
  }
  events: {
    views: number
    whatsapp: number
    general: number
    service: number
    booking: number
    payment: number
  }
  recentLeads: Array<{
    createdAt: string
    lastAction: string
    lastIntent: string | null
  }>
  bookings: Array<{
    id: string
    slot: string
    name: string | null
    createdAt: string
  }>
  paymentRecords: Array<{
    id: string
    amount: number
    status: string
    provider: string | null
    createdAt: string
  }>
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[22px] border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-950 tabular-nums">{value}</p>
    </div>
  )
}

export function LeadActivitySummary({ username }: { username: string | null }) {
  const [data, setData] = useState<LeadDashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmingPaymentId, setConfirmingPaymentId] = useState<string | null>(null)

  useEffect(() => {
    if (!username) {
      setError('Set a username to start tracking lead activity.')
      return
    }

    let active = true

    void (async () => {
      try {
        const token = await getAccessToken()
        if (!token) return

        const response = await apiGet<LeadDashboardData>(
          `/lead-summary/${encodeURIComponent(username)}`,
          token,
        )
        if (!active) return

        setData(response)
        setError(null)
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Failed to load lead activity.')
      }
    })()

    return () => {
      active = false
    }
  }, [username])

  async function confirmPayment(paymentId: string) {
    try {
      setConfirmingPaymentId(paymentId)
      const token = await getAccessToken()
      if (!token) return

      await apiPost('/payment/confirm', { paymentId }, token)
      if (!username) return

      const response = await apiGet<LeadDashboardData>(
        `/lead-summary/${encodeURIComponent(username)}`,
        token,
      )
      setData(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not confirm payment.')
    } finally {
      setConfirmingPaymentId(null)
    }
  }

  return (
    <section className="space-y-5 rounded-[28px] border border-gray-200 bg-white/90 p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-gray-950">Sales Snapshot</h2>
        <p className="mt-1 text-sm text-gray-500">
          Check leads, chats, bookings, payments, and revenue in one scan.
        </p>
        {!data?.stripeEnabled ? (
          <p className="mt-2 text-sm text-amber-600">Stripe mode is currently disabled.</p>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Total Leads" value={data?.totalLeads ?? 0} />
        <Stat label="WhatsApp Clicks" value={data?.events.whatsapp ?? 0} />
        <Stat label="Bookings" value={data?.totalBookings ?? 0} />
        <Stat label="Payments" value={data?.payments ?? 0} />
        <Stat label="Total Revenue" value={data?.revenue ?? 0} />
      </div>

      <div className="rounded-[22px] border border-gray-200 bg-gray-50 p-4">
        <h3 className="text-sm font-semibold text-gray-900">Pipeline</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat label="New Leads" value={data?.pipeline.new ?? 0} />
          <Stat label="Contacted" value={data?.pipeline.contacted ?? 0} />
          <Stat label="Booked" value={data?.pipeline.booked ?? 0} />
          <Stat label="Paid" value={data?.pipeline.paid ?? 0} />
          <Stat label="Lost" value={data?.pipeline.lost ?? 0} />
        </div>
      </div>

      <div className="rounded-[22px] border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Needs Attention</h3>
            <p className="mt-1 text-sm text-gray-500">
              Pending collection payments that still need manual confirmation.
            </p>
          </div>
          <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 ring-1 ring-inset ring-gray-200">
            {data?.pendingCollectionPayments ?? 0} open
          </div>
        </div>

        {data?.paymentRecords.some((payment) => payment.status === 'pending_collection') ? (
          <div className="mt-3 space-y-2">
            {data.paymentRecords
              .filter((payment) => payment.status === 'pending_collection')
              .slice(0, 5)
              .map((payment) => (
                <div
                  key={payment.id}
                  className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-600"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900">
                        {payment.provider?.toLowerCase().replace(/_/g, ' ') ?? 'payment'}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {new Date(payment.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <p className="font-semibold text-gray-900">{payment.amount}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void confirmPayment(payment.id)}
                    disabled={confirmingPaymentId === payment.id}
                    className="mt-3 rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    {confirmingPaymentId === payment.id ? 'Confirming...' : 'Mark as collected'}
                  </button>
                </div>
              ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-gray-500">No pending payment actions right now.</p>
        )}
      </div>
    </section>
  )
}
