'use client'

import { useState } from 'react'
import Link from 'next/link'
import Script from 'next/script'
import { Check, ShieldCheck, Sparkles, X as XIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import {
  BILLING_FEATURE_MATRIX,
  BILLING_PLAN_PRICES,
  type BillingDuration,
  getPlanFeatureValue,
} from '@/lib/billing-plans'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'

type Duration = BillingDuration

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_WEB_URL ?? 'https://dotly.one'

const pricingStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Dotly.one',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, iOS, Android',
  url: `${SITE_URL}/pricing`,
  offers: [
    {
      '@type': 'Offer',
      name: 'Dotly.one Free',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}/pricing`,
    },
    {
      '@type': 'Offer',
      name: 'Dotly.one Starter',
      price: String(BILLING_PLAN_PRICES.STARTER?.ANNUAL ?? 1),
      priceCurrency: 'USD',
      category: 'subscription',
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}/pricing`,
    },
    {
      '@type': 'Offer',
      name: 'Dotly.one Pro',
      price: String(BILLING_PLAN_PRICES.PRO?.ANNUAL ?? 200),
      priceCurrency: 'USD',
      category: 'subscription',
      availability: 'https://schema.org/InStock',
      url: `${SITE_URL}/pricing`,
    },
  ],
}

interface Plan {
  id: 'STARTER' | 'PRO'
  name: string
  tagline: string
  prices: Record<Duration, number>
  highlight?: boolean
  features: string[]
  cta: string
}

interface FeatureRow {
  label: string
  free: string | boolean
  starter: string | boolean
  pro: string | boolean
}

const PLANS: Plan[] = [
  {
    id: 'STARTER',
    name: 'Starter',
    tagline: 'For people proving that one booked call can pay for Dotly.',
    prices: BILLING_PLAN_PRICES.STARTER!,
    features: [
      '1 revenue card',
      '30-day analytics',
      'Booking, WhatsApp, and lead capture',
      'Basic CRM access',
      'Email signature',
      'Email templates',
      'Basic scheduling',
    ],
    cta: 'Start with Starter',
  },
  {
    id: 'PRO',
    name: 'Pro',
    tagline: 'For operators running a full contact-to-customer workflow.',
    prices: BILLING_PLAN_PRICES.PRO!,
    highlight: true,
    features: [
      'Up to 3 cards',
      '90-day analytics',
      'Full CRM',
      'Full scheduling',
      'CSV export',
      'Custom domain',
      'Webhooks',
    ],
    cta: 'Upgrade to Pro',
  },
]

const FEATURES: FeatureRow[] = BILLING_FEATURE_MATRIX.map((row) => ({
  label: row.label,
  free: getPlanFeatureValue(row, 'FREE'),
  starter: getPlanFeatureValue(row, 'STARTER'),
  pro: getPlanFeatureValue(row, 'PRO'),
}))

const DURATION_LABELS: Record<Duration, string> = {
  MONTHLY: 'Monthly',
  SIX_MONTHS: '6 Months',
  ANNUAL: 'Annual',
}

const DURATION_SAVINGS: Record<Duration, string | null> = {
  MONTHLY: null,
  SIX_MONTHS: 'Best value',
  ANNUAL: 'Lowest monthly rate',
}

const DURATION_NOTE: Record<Duration, string | null> = {
  MONTHLY: null,
  SIX_MONTHS: 'Billed every 6 months in USD',
  ANNUAL: 'Billed annually in USD',
}

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
    return (
      <span className="block text-center text-gray-300">
        <XIcon className="mx-auto h-4 w-4" />
      </span>
    )
  }

  return <span className="block text-center text-sm text-gray-700">{value}</span>
}

function formatPrice(plan: Plan, duration: Duration): { display: string; sub: string } {
  const total = plan.prices[duration]
  if (duration === 'MONTHLY') return { display: `$${total}`, sub: 'per month' }
  if (duration === 'SIX_MONTHS') return { display: `$${total}`, sub: 'every 6 months' }
  return { display: `$${total}`, sub: 'per year' }
}

function formatMonthlyEquivalent(price: number, duration: Duration): string {
  const divisor = duration === 'ANNUAL' ? 12 : duration === 'SIX_MONTHS' ? 6 : 1
  return (price / divisor).toFixed(2).replace(/\.00$/, '')
}

function getCheckoutHref(plan: 'STARTER' | 'PRO', duration: Duration): string {
  const next = encodeURIComponent(`/settings/billing?plan=${plan}&duration=${duration}`)
  return `/auth?next=${next}`
}

export default function PricingPage() {
  const [duration, setDuration] = useState<Duration>('ANNUAL')

  return (
    <div className="marketing-shell relative min-h-screen overflow-hidden bg-slate-50/50">
      <Script
        id="pricing-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingStructuredData) }}
      />
      <div className="absolute left-1/2 top-0 -translate-x-1/2 -top-40 h-[600px] w-[800px] rounded-full bg-gradient-to-br from-indigo-400/20 to-sky-300/20 blur-[120px] pointer-events-none" />
      <div className="absolute right-0 top-1/3 h-[500px] w-[500px] rounded-full bg-sky-400/10 blur-[100px] pointer-events-none" />
      <div className="absolute left-0 bottom-1/4 h-[600px] w-[600px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <Navbar />

      <section className="px-6 py-16 text-center sm:py-20">
        <div className="mx-auto max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/50 bg-sky-50/50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-sky-700 backdrop-blur-md shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            USD pricing
          </div>
          <h1 className="mt-8 text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-gray-900 to-gray-600 sm:text-6xl lg:text-[4.5rem] leading-[1.1]">
            Pricing for people who want every contact to turn into revenue.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl leading-relaxed text-gray-500 font-medium">
            Start free, prove your booking and lead capture flow, then upgrade when you need deeper
            analytics, stronger CRM, and more conversion power.
          </p>
          <p className="mt-3 text-sm text-gray-500">
            All plans are priced in USD. Paid upgrades currently use crypto checkout.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs font-medium text-gray-500">
            <span className="rounded-full border border-white/60 bg-white/40 px-4 py-2 shadow-sm backdrop-blur-md">
              Start free
            </span>
            <span className="rounded-full border border-white/60 bg-white/40 px-4 py-2 shadow-sm backdrop-blur-md">
              Crypto checkout available today
            </span>
            <span className="rounded-full border border-white/60 bg-white/40 px-4 py-2 shadow-sm backdrop-blur-md">
              7-day refund window on eligible upgrades
            </span>
          </div>
          <p className="mt-3 text-sm font-medium text-brand-600">
            Business, Agency, and Enterprise plans will be published later.
          </p>

          <div className="relative mt-12 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/50 p-2 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] backdrop-blur-2xl ring-1 ring-black/5">
            {(['MONTHLY', 'SIX_MONTHS', 'ANNUAL'] as Duration[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={cn(
                  'relative flex items-center gap-2.5 rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-500',
                  duration === d
                    ? 'bg-gradient-to-b from-gray-800 to-gray-950 text-white shadow-[0_4px_12px_rgba(0,0,0,0.15),0_0_0_1px_rgba(255,255,255,0.1)_inset] scale-[1.02]'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/60 hover:shadow-sm active:scale-[0.98]',
                )}
              >
                {DURATION_LABELS[d]}
                {DURATION_SAVINGS[d] && (
                  <span className="rounded-full border border-emerald-200/60 bg-gradient-to-br from-emerald-100 to-emerald-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.05em] text-emerald-600 shadow-[0_2px_4px_rgba(16,185,129,0.1)]">
                    {DURATION_SAVINGS[d]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {DURATION_NOTE[duration] && (
            <p className="mt-3 text-xs text-gray-500">{DURATION_NOTE[duration]}</p>
          )}
        </div>
      </section>

      <section className="px-6 pb-16 sm:pb-20">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="group relative overflow-hidden rounded-[32px] sm:rounded-[40px] border border-white/60 bg-white/40 px-6 py-8 sm:px-10 sm:py-10 backdrop-blur-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] transition-all duration-500 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] ring-1 ring-black/5">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-950">Free</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Launch your first contact-to-customer flow.
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm text-gray-600">
                  <span className="rounded-full border border-white/80 bg-white/60 px-4 py-2 text-xs font-semibold shadow-sm backdrop-blur-md transition-colors group-hover:bg-white">
                    1 revenue card
                  </span>
                  <span className="rounded-full border border-white/80 bg-white/60 px-4 py-2 text-xs font-semibold shadow-sm backdrop-blur-md transition-colors group-hover:bg-white">
                    3 social links
                  </span>
                  <span className="rounded-full border border-white/80 bg-white/60 px-4 py-2 text-xs font-semibold shadow-sm backdrop-blur-md transition-colors group-hover:bg-white">
                    7-day analytics
                  </span>
                  <span className="rounded-full border border-white/80 bg-white/60 px-4 py-2 text-xs font-semibold shadow-sm backdrop-blur-md transition-colors group-hover:bg-white">
                    Book, chat, and lead capture
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div>
                  <span className="text-4xl font-bold tracking-tight text-gray-950">$0</span>
                  <span className="ml-1 text-sm text-gray-500">forever</span>
                </div>
                <Link
                  href="/auth?next=%2Fdashboard"
                  className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-3.5 text-sm font-bold text-gray-900 shadow-sm transition-all hover:scale-[1.02] hover:bg-gray-50 hover:shadow active:scale-[0.98]"
                >
                  Get started free
                </Link>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {PLANS.map((plan) => {
              const { display, sub } = formatPrice(plan, duration)

              return (
                <div
                  key={plan.id}
                  className={cn(
                    'group relative overflow-hidden rounded-[40px] p-8 sm:p-10 backdrop-blur-3xl transition-all duration-500 hover:-translate-y-2 ring-1 ring-black/5',
                    plan.highlight
                      ? 'border border-indigo-200/60 bg-gradient-to-b from-indigo-50/80 to-white/90 shadow-[0_30px_60px_-15px_rgba(99,102,241,0.15)] hover:shadow-[0_40px_80px_-15px_rgba(99,102,241,0.25)]'
                      : 'border border-white/60 bg-white/50 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)]',
                  )}
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 h-32"
                    style={{
                      background: plan.highlight
                        ? 'radial-gradient(circle at top, rgba(99,102,241,0.15), transparent 70%)'
                        : 'radial-gradient(circle at top, rgba(148,163,184,0.08), transparent 70%)',
                    }}
                  />

                  {plan.highlight && (
                    <div className="absolute right-8 top-8 inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-700 backdrop-blur-md">
                      <Sparkles className="h-3.5 w-3.5" />
                      Most complete
                    </div>
                  )}

                  <div className="relative">
                    <h2 className="text-2xl font-bold tracking-tight text-gray-950">{plan.name}</h2>
                    <p className="mt-2 text-sm leading-6 text-gray-500">{plan.tagline}</p>
                  </div>

                  <div className="relative mt-6">
                    <div className="flex items-end gap-2">
                      <span className="text-6xl font-extrabold tracking-tight text-gray-950">
                        {display}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-gray-500">{sub}</p>
                    <p className="mt-2 text-xs text-gray-500">
                      Includes a 7-day refund window on first paid upgrade.
                    </p>
                  </div>

                  <ul className="relative mt-6 space-y-3 text-sm text-gray-700">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-3 transition-colors group-hover:text-gray-900"
                      >
                        <span className="mt-[3px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 shadow-sm">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={getCheckoutHref(plan.id, duration)}
                    className={cn(
                      'mt-8 inline-flex w-full items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold',
                      plan.highlight
                        ? 'bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-[0_20px_40px_-12px_rgba(99,102,241,0.5)] hover:scale-[1.02] hover:shadow-[0_25px_50px_-12px_rgba(99,102,241,0.6)] active:scale-[0.98] border border-indigo-400/20'
                        : 'bg-white text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 hover:scale-[1.02] active:scale-[0.98]',
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

      <section className="border-t border-gray-100 px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-bold text-gray-950">Feature comparison</h2>
          <p className="mt-3 text-center text-sm text-gray-500">
            Published plans today: Free, Starter, and Pro. Paid upgrades are crypto-only for now.
          </p>

          <div className="mt-12 overflow-hidden rounded-[40px] border border-white/60 bg-white/40 p-2 sm:p-4 backdrop-blur-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] ring-1 ring-black/5">
            <div className="overflow-x-auto overflow-y-hidden rounded-[32px] bg-white/60 shadow-inner">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200/60 bg-gray-100/50 backdrop-blur-sm px-4">
                    <th className="px-5 py-4 font-semibold text-gray-700">Feature</th>
                    <th className="px-4 py-4 text-center font-semibold text-gray-500">
                      <div>Free</div>
                      <div className="font-normal text-xs text-gray-400 mt-0.5">$0 / mo</div>
                    </th>
                    <th className="px-4 py-4 text-center font-semibold text-gray-700">
                      <div>Starter</div>
                      <div className="font-normal text-xs text-gray-500 mt-0.5">
                        $
                        {formatMonthlyEquivalent(
                          BILLING_PLAN_PRICES.STARTER?.[duration] ?? 0,
                          duration,
                        )}{' '}
                        / mo
                      </div>
                    </th>
                    <th className="bg-brand-50/40 px-4 py-4 text-center font-semibold text-brand-700">
                      <div>Pro</div>
                      <div className="font-normal text-xs text-brand-600/80 mt-0.5">
                        $
                        {formatMonthlyEquivalent(
                          BILLING_PLAN_PRICES.PRO?.[duration] ?? 0,
                          duration,
                        )}{' '}
                        / mo
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {FEATURES.map((row, index) => (
                    <tr
                      key={row.label}
                      className={cn(
                        'transition-colors duration-200 hover:bg-white/80',
                        index % 2 === 0 ? 'bg-white/40' : 'bg-gray-50/20',
                      )}
                    >
                      <td className="px-5 py-4 font-medium text-gray-700">{row.label}</td>
                      <td className="px-4 py-4">
                        <FeatureValue value={row.free} />
                      </td>
                      <td className="px-4 py-4">
                        <FeatureValue value={row.starter} />
                      </td>
                      <td className="bg-brand-50/20 px-4 py-4">
                        <FeatureValue value={row.pro} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="relative px-6 py-20 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-50/80 pointer-events-none" />
        <div className="relative z-10 group mx-auto flex max-w-2xl flex-col items-center rounded-[40px] border border-white/60 bg-white/40 px-8 py-12 sm:px-12 sm:py-16 backdrop-blur-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] transition-all duration-500 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] ring-1 ring-black/5">
          <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-[24px] border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white text-indigo-600 shadow-sm transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <h3 className="text-lg font-bold text-gray-950">Billing clarity</h3>
          <p className="mt-3 text-sm leading-7 text-gray-500">
            Dotly is sold as a SaaS subscription. Pricing is listed in USD so teams and individual
            operators can compare plans clearly, while current paid upgrades are processed through
            crypto checkout.
          </p>
          <p className="mt-2 text-sm leading-7 text-gray-500">
            Start on the free plan, upgrade when your flow is working, and use the 7-day refund
            window on eligible paid upgrades if Dotly is not the right fit.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  )
}
