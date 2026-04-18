'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { apiGet, apiPost } from '@/lib/api'
import { getAccessToken } from '@/lib/auth/client'

interface PaymentProviderOption {
  provider: 'stripe_connect' | 'upi_link' | null
  displayName: string
  enabled: boolean
  supportedCountries: string[]
}

interface PaymentAccountItem {
  provider: 'stripe_connect' | 'upi_link' | null
  accountType: 'company' | 'individual' | null
  country: string | null
  status: string
  onboardingComplete: boolean
  detailsSubmitted: boolean
  chargesEnabled: boolean
  payoutsEnabled: boolean
}

interface PaymentAccountStatus {
  stripeEnabled: boolean
  defaultProvider: 'stripe_connect' | 'upi_link' | null
  country: string | null
  providers: PaymentProviderOption[]
  accounts: PaymentAccountItem[]
}

async function getToken(): Promise<string | undefined> {
  return getAccessToken()
}

export default function PaymentSettingsPage() {
  const [data, setData] = useState<PaymentAccountStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accountType, setAccountType] = useState<'company' | 'individual'>('individual')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true

    void (async () => {
      try {
        const token = await getToken()
        if (!token) return

        const response = await apiGet<PaymentAccountStatus>('/payment-accounts/me', token)
        if (!active) return

        setData(response)
        const stripeAccount = response.accounts.find(
          (account) => account.provider === 'stripe_connect',
        )
        if (stripeAccount?.accountType) {
          setAccountType(stripeAccount.accountType)
        }
        setError(null)
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Could not load payment account settings.')
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [])

  async function reload() {
    const token = await getToken()
    if (!token) return
    const response = await apiGet<PaymentAccountStatus>('/payment-accounts/me', token)
    setData(response)
  }

  async function startOnboarding() {
    setSubmitting(true)
    setError(null)

    try {
      const token = await getToken()
      if (!token) return

      const response = await apiPost<{ url: string }>(
        '/payment-accounts/stripe/onboarding',
        { accountType },
        token,
      )
      window.location.href = response.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start Stripe onboarding.')
    } finally {
      setSubmitting(false)
    }
  }

  async function manageAccount() {
    setSubmitting(true)
    setError(null)

    try {
      const token = await getToken()
      if (!token) return

      const response = await apiPost<{ url: string }>('/payment-accounts/stripe/manage', {}, token)
      window.location.href = response.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open Stripe account settings.')
    } finally {
      setSubmitting(false)
    }
  }

  async function setDefaultProvider(provider: 'stripe_connect' | 'upi_link') {
    setSubmitting(true)
    setError(null)

    try {
      const token = await getToken()
      if (!token) return

      await apiPost('/payment-accounts/default-provider', { provider }, token)
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update default provider.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-500">
            Seller Payments
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950">
            Payment Accounts
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600">
            Choose your default payment provider, connect Stripe as a company or individual, and
            keep local rails ready for each country.
          </p>
        </div>
        <Link
          href="/settings"
          className="text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          Back to settings
        </Link>
      </div>

      <section className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
        {loading ? <p className="text-sm text-gray-500">Loading payment account...</p> : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        {!loading && data ? (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Default Provider</p>
                <p className="mt-2 text-sm font-semibold text-gray-900">
                  {data.defaultProvider ?? 'Not set'}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Country</p>
                <p className="mt-2 text-sm font-semibold text-gray-900">
                  {data.country ?? 'Not set'}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Stripe Mode</p>
                <p className="mt-2 text-sm font-semibold text-gray-900">
                  {data.stripeEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Connected Accounts</p>
                <p className="mt-2 text-sm font-semibold text-gray-900">{data.accounts.length}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 p-4">
              <p className="text-sm font-semibold text-gray-900">Available providers</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {data.providers.map((provider) => (
                  <div
                    key={provider.provider ?? provider.displayName}
                    className="rounded-2xl border border-gray-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {provider.displayName}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {provider.supportedCountries.length
                            ? `Countries: ${provider.supportedCountries.join(', ')}`
                            : 'Available globally'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          provider.provider && void setDefaultProvider(provider.provider)
                        }
                        disabled={!provider.provider || submitting}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-900 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
                      >
                        {data.defaultProvider === provider.provider ? 'Default' : 'Set default'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 p-4">
              <p className="text-sm font-semibold text-gray-900">Stripe Connect onboarding</p>
              <p className="mt-1 text-sm text-gray-600">
                Connect Stripe for card payments and payouts. Sellers can onboard as either a
                company or an individual.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setAccountType('individual')}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium ${
                    accountType === 'individual'
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  Individual
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType('company')}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium ${
                    accountType === 'company'
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  Company
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void startOnboarding()}
                  disabled={!data.stripeEnabled || submitting}
                  className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  Connect Stripe
                </button>
                <button
                  type="button"
                  onClick={() => void manageAccount()}
                  disabled={
                    !data.accounts.some((account) => account.provider === 'stripe_connect') ||
                    !data.stripeEnabled ||
                    submitting
                  }
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-400"
                >
                  Edit Stripe account
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 p-4">
              <p className="text-sm font-semibold text-gray-900">Connected payment accounts</p>
              {data.accounts.length ? (
                <div className="mt-4 space-y-3">
                  {data.accounts.map((account) => (
                    <div
                      key={`${account.provider}-${account.country}`}
                      className="rounded-2xl border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {account.provider ?? 'Unknown provider'}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {account.accountType ?? 'unknown'} •{' '}
                            {account.country ?? 'country not set'}
                          </p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase text-gray-700">
                          {account.status}
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4 text-xs text-gray-600">
                        <p>Onboarding: {account.onboardingComplete ? 'Complete' : 'Pending'}</p>
                        <p>Details: {account.detailsSubmitted ? 'Submitted' : 'Pending'}</p>
                        <p>Charges: {account.chargesEnabled ? 'Enabled' : 'Pending'}</p>
                        <p>Payouts: {account.payoutsEnabled ? 'Enabled' : 'Pending'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-gray-500">No payment accounts connected yet.</p>
              )}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  )
}
