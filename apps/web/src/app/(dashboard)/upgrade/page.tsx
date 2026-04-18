'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { apiPost, isApiError } from '@/lib/api'
import { getAccessToken } from '@/lib/auth/client'
import { useBillingPlan } from '@/components/billing/BillingPlanProvider'

export default function UpgradePage() {
  const searchParams = useSearchParams()
  const { plan, refresh } = useBillingPlan()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkoutState = searchParams.get('checkout')
    if (checkoutState === 'success') {
      setMessage('Checkout completed. We are confirming your Pro upgrade now.')
      void refresh()
    }

    if (checkoutState === 'cancelled') {
      setError('Upgrade checkout was cancelled.')
    }
  }, [refresh, searchParams])

  async function handleUpgrade() {
    setLoading(true)
    setError(null)

    try {
      const token = await getAccessToken()
      if (!token) {
        setError('You need to sign in before upgrading.')
        return
      }

      const response = await apiPost<{ url?: string | null }>(
        '/billing/create-subscription',
        { plan: 'PRO' },
        token,
      )

      if (!response.url) {
        setError('Could not start upgrade checkout right now.')
        return
      }

      window.location.href = response.url
    } catch (err) {
      setError(isApiError(err) ? err.message : 'Could not start upgrade checkout.')
    } finally {
      setLoading(false)
    }
  }

  const isPaidPlan = plan !== 'FREE'

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="rounded-[32px] border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">Upgrade</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
          Upgrade to Pro
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
          Upgrade when your link is getting attention and you are ready to turn that interest into
          revenue.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-950">Free</h2>
          <p className="mt-2 text-sm text-gray-500">Try Dotly and prove your funnel.</p>
          <ul className="mt-4 space-y-3 text-sm text-gray-700">
            <li>20 leads per month</li>
            <li>5 bookings per month</li>
            <li>Dotly branding stays visible</li>
            <li>Payments stay locked</li>
          </ul>
        </div>

        <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-emerald-950">Pro</h2>
              <p className="mt-2 text-sm text-emerald-800">$15/month</p>
            </div>
            <span className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold uppercase text-white">
              Best fit
            </span>
          </div>
          <ul className="mt-4 space-y-3 text-sm text-emerald-950">
            <li>Unlimited leads</li>
            <li>Unlimited bookings</li>
            <li>Accept payments</li>
            <li>Full dashboard visibility</li>
            <li>No Dotly branding</li>
          </ul>
          <button
            type="button"
            onClick={() => void handleUpgrade()}
            disabled={loading || isPaidPlan}
            className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPaidPlan
              ? 'You are already on a paid plan'
              : loading
                ? 'Starting checkout...'
                : 'Upgrade Now'}
          </button>
          <p className="mt-3 text-xs text-emerald-900">
            Upgrade when you want more leads, more bookings, and payment collection in one place.
          </p>
        </div>
      </section>

      {message ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      <div className="text-sm text-gray-500">
        Prefer the existing billing flow?{' '}
        <Link
          href="/settings/billing"
          className="font-semibold text-gray-900 underline underline-offset-4"
        >
          Open billing settings
        </Link>
      </div>
    </div>
  )
}
