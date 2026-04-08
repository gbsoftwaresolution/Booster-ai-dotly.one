'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'

// ─── Pricing data ─────────────────────────────────────────────────────────────

type Duration = 'MONTHLY' | 'SIX_MONTHS' | 'ANNUAL'

interface Plan {
  id: 'STARTER' | 'PRO' | 'BUSINESS' | 'AGENCY' | 'ENTERPRISE'
  name: string
  tagline: string
  prices: Record<Duration, number>
  highlight?: boolean
  dark?: boolean
  features: string[]
  cta: string
  ctaHref: string
}

const PLANS: Plan[] = [
  {
    id: 'STARTER',
    name: 'Starter',
    tagline: 'Perfect for freelancers & solopreneurs.',
    prices: { MONTHLY: 10, SIX_MONTHS: 55, ANNUAL: 100 },
    features: ['1 digital card', '30-day analytics', '5 social links', 'Lead capture', 'Basic CRM'],
    cta: 'Get Starter',
    ctaHref: '/auth',
  },
  {
    id: 'PRO',
    name: 'Pro',
    tagline: 'For professionals building their brand.',
    prices: { MONTHLY: 20, SIX_MONTHS: 110, ANNUAL: 200 },
    highlight: true,
    features: [
      '3 digital cards',
      '90-day analytics',
      'Unlimited social links',
      'Full CRM access',
      'Portfolio & media blocks',
      'CSV export',
    ],
    cta: 'Get Pro',
    ctaHref: '/auth',
  },
  {
    id: 'BUSINESS',
    name: 'Business',
    tagline: 'For teams scaling their digital presence.',
    prices: { MONTHLY: 50, SIX_MONTHS: 275, ANNUAL: 500 },
    features: [
      '10 digital cards',
      '365-day analytics',
      'Custom domain',
      'Team management (10 members)',
      'Priority support',
    ],
    cta: 'Get Business',
    ctaHref: '/auth',
  },
  {
    id: 'AGENCY',
    name: 'Agency',
    tagline: 'For agencies managing multiple clients.',
    prices: { MONTHLY: 100, SIX_MONTHS: 550, ANNUAL: 1000 },
    features: [
      '50 digital cards',
      'Unlimited analytics',
      'Unlimited team members',
      'Multi-workspace management',
      'White label (partner branding)',
      'Priority support + SLA',
    ],
    cta: 'Get Agency',
    ctaHref: '/auth',
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    tagline: 'White-glove service for large organizations.',
    prices: { MONTHLY: 199, SIX_MONTHS: 1095, ANNUAL: 1990 },
    dark: true,
    features: [
      'Unlimited cards',
      'Unlimited analytics',
      'White label / SSO / SCIM',
      'Dedicated onboarding',
      'SLA guarantee',
      'Custom integrations',
    ],
    cta: 'Get Enterprise',
    ctaHref: '/auth',
  },
]

// Feature comparison table (6 tiers: Free + 5 paid)
interface FeatureRow {
  label: string
  free: string | boolean
  starter: string | boolean
  pro: string | boolean
  business: string | boolean
  agency: string | boolean
  enterprise: string | boolean
}

const FEATURES: FeatureRow[] = [
  {
    label: 'Digital cards',
    free: '1',
    starter: '1',
    pro: '3',
    business: '10',
    agency: '50',
    enterprise: 'Unlimited',
  },
  {
    label: 'Analytics history',
    free: '7 days',
    starter: '30 days',
    pro: '90 days',
    business: '365 days',
    agency: 'Unlimited',
    enterprise: 'Unlimited',
  },
  {
    label: 'Social links',
    free: '3',
    starter: '5',
    pro: 'Unlimited',
    business: 'Unlimited',
    agency: 'Unlimited',
    enterprise: 'Unlimited',
  },
  {
    label: 'Lead capture',
    free: false,
    starter: true,
    pro: true,
    business: true,
    agency: true,
    enterprise: true,
  },
  {
    label: 'Full CRM access',
    free: false,
    starter: false,
    pro: true,
    business: true,
    agency: true,
    enterprise: true,
  },
  {
    label: 'Portfolio / media blocks',
    free: false,
    starter: false,
    pro: true,
    business: true,
    agency: true,
    enterprise: true,
  },
  {
    label: 'CSV export',
    free: false,
    starter: false,
    pro: true,
    business: true,
    agency: true,
    enterprise: true,
  },
  {
    label: 'Custom domain',
    free: false,
    starter: false,
    pro: false,
    business: true,
    agency: true,
    enterprise: true,
  },
  {
    label: 'Team management',
    free: false,
    starter: false,
    pro: false,
    business: '10 members',
    agency: 'Unlimited',
    enterprise: 'Unlimited',
  },
  {
    label: 'White label / SSO',
    free: false,
    starter: false,
    pro: false,
    business: false,
    agency: true,
    enterprise: true,
  },
  {
    label: 'Priority support',
    free: false,
    starter: false,
    pro: false,
    business: true,
    agency: true,
    enterprise: true,
  },
  {
    label: 'Dedicated onboarding',
    free: false,
    starter: false,
    pro: false,
    business: false,
    agency: false,
    enterprise: true,
  },
  {
    label: 'SLA guarantee',
    free: false,
    starter: false,
    pro: false,
    business: false,
    agency: true,
    enterprise: true,
  },
]

// ─── Duration config ───────────────────────────────────────────────────────────

const DURATION_LABELS: Record<Duration, string> = {
  MONTHLY: 'Monthly',
  SIX_MONTHS: '6 Months',
  ANNUAL: 'Annual',
}

const DURATION_SAVINGS: Record<Duration, string | null> = {
  MONTHLY: null,
  SIX_MONTHS: 'Save 8%',
  ANNUAL: 'Save 17%',
}

const DURATION_NOTE: Record<Duration, string | null> = {
  MONTHLY: null,
  SIX_MONTHS: 'Billed every 6 months',
  ANNUAL: 'Billed annually — 2 months free',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FeatureValue({ value }: { value: string | boolean }) {
  if (value === true) {
    return (
      <svg className="mx-auto h-5 w-5 text-brand-500" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    )
  }
  if (value === false) {
    return <span className="block text-center text-gray-300">—</span>
  }
  return <span className="block text-center text-sm text-gray-700">{value}</span>
}

function formatPrice(plan: Plan, duration: Duration): { display: string; sub: string } {
  const total = plan.prices[duration]
  if (duration === 'MONTHLY') {
    return { display: `$${total}`, sub: '/mo' }
  }
  if (duration === 'SIX_MONTHS') {
    const monthly = (total / 6).toFixed(2).replace(/\.00$/, '')
    return { display: `$${monthly}`, sub: `/mo · $${total} total` }
  }
  // ANNUAL
  const monthly = (total / 12).toFixed(2).replace(/\.00$/, '')
  return { display: `$${monthly}`, sub: `/mo · $${total}/yr` }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [duration, setDuration] = useState<Duration>('MONTHLY')

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Hero */}
      <section className="px-6 py-14 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
          Simple, transparent pricing
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-gray-500">
          Pay with USDT via any Web3 wallet. No credit card, no middleman.
        </p>
        <p className="mt-2 text-sm font-medium text-brand-600">
          Powered by BoosterAI PaymentVault — fully on-chain
        </p>

        {/* Duration toggle */}
        <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 p-1">
          {(['MONTHLY', 'SIX_MONTHS', 'ANNUAL'] as Duration[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDuration(d)}
              className={cn(
                'flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                duration === d
                  ? 'bg-white shadow text-gray-900'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {DURATION_LABELS[d]}
              {DURATION_SAVINGS[d] && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                  {DURATION_SAVINGS[d]}
                </span>
              )}
            </button>
          ))}
        </div>
        {DURATION_NOTE[duration] && (
          <p className="mt-2 text-xs text-gray-500">{DURATION_NOTE[duration]}</p>
        )}
      </section>

      {/* Free + 5 Plan cards */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-7xl">
          {/* Free card — full-width intro row */}
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-8 py-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Free</h2>
              <p className="mt-0.5 text-sm text-gray-500">
                Get started with the basics — no wallet needed.
              </p>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                <li>1 digital card</li>
                <li>7-day analytics</li>
                <li>3 social links</li>
              </ul>
            </div>
            <div className="flex shrink-0 items-center gap-6">
              <div>
                <span className="text-3xl font-bold text-gray-900">$0</span>
                <span className="ml-1 text-sm text-gray-500">/forever</span>
              </div>
              <Link
                href="/auth"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                Get started
              </Link>
            </div>
          </div>

          {/* 5 paid tier cards */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {PLANS.map((plan) => {
              const { display, sub } = formatPrice(plan, duration)
              return (
                <div
                  key={plan.id}
                  className={cn(
                    'relative flex flex-col rounded-2xl p-6 shadow-sm',
                    plan.highlight
                      ? 'border-2 border-brand-500 bg-white shadow-md'
                      : plan.dark
                        ? 'border border-gray-700 bg-gray-900'
                        : 'border border-gray-200 bg-white',
                  )}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-white">
                        Most popular
                      </span>
                    </div>
                  )}
                  <div className="mb-4">
                    <h2
                      className={cn(
                        'text-base font-semibold',
                        plan.dark ? 'text-white' : 'text-gray-900',
                      )}
                    >
                      {plan.name}
                    </h2>
                    <div className="mt-2 flex flex-wrap items-end gap-1">
                      <span
                        className={cn(
                          'text-3xl font-bold',
                          plan.dark ? 'text-white' : 'text-gray-900',
                        )}
                      >
                        {display}
                      </span>
                    </div>
                    <p
                      className={cn(
                        'mt-0.5 text-xs',
                        plan.dark ? 'text-gray-400' : 'text-gray-400',
                      )}
                    >
                      {sub}
                    </p>
                    <p
                      className={cn('mt-2 text-xs', plan.dark ? 'text-gray-400' : 'text-gray-500')}
                    >
                      {plan.tagline}
                    </p>
                  </div>

                  <ul
                    className={cn(
                      'mb-6 flex-1 space-y-1.5 text-sm',
                      plan.dark ? 'text-gray-300' : 'text-gray-600',
                    )}
                  >
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <span className={plan.dark ? 'text-brand-400' : 'text-brand-500'}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.ctaHref}
                    className={cn(
                      'block rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition-colors',
                      plan.highlight
                        ? 'bg-brand-500 text-white hover:bg-brand-600'
                        : plan.dark
                          ? 'border border-gray-600 text-white hover:bg-gray-800'
                          : 'border border-brand-500 text-brand-600 hover:bg-brand-50',
                    )}
                  >
                    {plan.cta}
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Full feature comparison table */}
      <section className="border-t border-gray-100 px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="mb-8 text-center text-2xl font-bold text-gray-900">
            Full feature comparison
          </h2>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-5 py-3 font-semibold text-gray-700">Feature</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-500">Free</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700">Starter</th>
                  <th className="px-3 py-3 text-center font-semibold text-brand-600">Pro</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700">Business</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700">Agency</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((row, i) => (
                  <tr
                    key={row.label}
                    className={cn(
                      'border-b border-gray-100',
                      i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50',
                    )}
                  >
                    <td className="px-5 py-3 font-medium text-gray-700">{row.label}</td>
                    <td className="px-3 py-3">
                      <FeatureValue value={row.free} />
                    </td>
                    <td className="px-3 py-3">
                      <FeatureValue value={row.starter} />
                    </td>
                    <td className="px-3 py-3 bg-brand-50/30">
                      <FeatureValue value={row.pro} />
                    </td>
                    <td className="px-3 py-3">
                      <FeatureValue value={row.business} />
                    </td>
                    <td className="px-3 py-3">
                      <FeatureValue value={row.agency} />
                    </td>
                    <td className="px-3 py-3">
                      <FeatureValue value={row.enterprise} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Web3 payment note */}
      <section className="border-t border-gray-100 bg-gray-50 px-6 py-12 text-center">
        <div className="mx-auto max-w-lg">
          <div className="mb-3 text-3xl">&#128274;</div>
          <h3 className="text-lg font-bold text-gray-900">Pay with USDT — no credit card needed</h3>
          <p className="mt-2 text-sm text-gray-500">
            Connect MetaMask, WalletConnect, or any EVM-compatible wallet. Payments are settled on
            Arbitrum via the BoosterAI PaymentVault smart contract. Your private key never leaves
            your wallet.
          </p>
          <p className="mt-3 text-xs font-medium text-brand-600">
            Powered by BoosterAI PaymentVault — no middleman, no subscription lock-in
          </p>
        </div>
      </section>

      <Footer />
    </div>
  )
}
