'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, ShieldCheck, Sparkles, X as XIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'

type Duration = 'MONTHLY' | 'SIX_MONTHS' | 'ANNUAL'

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
    tagline: 'For individuals, freelancers, and solo professionals.',
    prices: { MONTHLY: 10, SIX_MONTHS: 50, ANNUAL: 99 },
    features: [
      '1 premium card',
      '30-day analytics',
      'Lead capture',
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
    tagline: 'For power users running their full follow-up workflow.',
    prices: { MONTHLY: 20, SIX_MONTHS: 99, ANNUAL: 199 },
    highlight: true,
    features: [
      'Up to 3 cards',
      'Advanced analytics',
      'Full CRM',
      'Inbox + scheduling',
      'CSV export',
      'Custom domain',
      'Webhooks',
    ],
    cta: 'Upgrade to Pro',
  },
]

const FEATURES: FeatureRow[] = [
  { label: 'Digital cards', free: '1', starter: '1 premium card', pro: '3 cards' },
  { label: 'Analytics history', free: '7 days', starter: '30 days', pro: 'Advanced analytics' },
  {
    label: 'Social links',
    free: 'Up to 3',
    starter: 'More social links',
    pro: 'More social links',
  },
  { label: 'Lead capture', free: 'Basic', starter: true, pro: true },
  { label: 'CRM', free: false, starter: 'Basic CRM', pro: 'Full CRM' },
  { label: 'Email signature', free: false, starter: true, pro: true },
  { label: 'Email templates', free: false, starter: true, pro: true },
  { label: 'Scheduling', free: false, starter: 'Basic', pro: 'Full' },
  { label: 'CSV export', free: false, starter: false, pro: true },
  { label: 'Custom domain', free: false, starter: false, pro: true },
  { label: 'Webhooks', free: false, starter: false, pro: true },
]

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
  SIX_MONTHS: 'Billed every 6 months in USDT',
  ANNUAL: 'Billed annually in USDT',
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
  if (duration === 'MONTHLY') return { display: `$${total}`, sub: 'USDT / month' }
  if (duration === 'SIX_MONTHS') return { display: `$${total}`, sub: 'USDT / 6 months' }
  return { display: `$${total}`, sub: 'USDT / year' }
}

function getCheckoutHref(plan: 'STARTER' | 'PRO', duration: Duration): string {
  const next = encodeURIComponent(`/settings/billing?plan=${plan}&duration=${duration}`)
  return `/auth?next=${next}`
}

export default function PricingPage() {
  const [duration, setDuration] = useState<Duration>('MONTHLY')

  return (
    <div className="marketing-shell min-h-screen bg-transparent">
      <Navbar />

      <section className="px-6 py-16 text-center sm:py-20">
        <div className="mx-auto max-w-3xl">
          <div className="app-shell-surface inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-sky-700">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
            Paid in USDT
          </div>
          <h1 className="mt-6 text-4xl font-extrabold tracking-[-0.04em] text-gray-950 sm:text-5xl lg:text-6xl">
            Simple pricing for how Dotly works today.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-gray-600">
            Start free, then upgrade when you need richer sharing, stronger analytics, and a more
            complete CRM workflow.
          </p>
          <p className="mt-3 text-sm font-medium text-brand-600">
            Business, Agency, and Enterprise plans will be published later.
          </p>

          <div className="app-shell-surface mt-10 inline-flex items-center gap-1 rounded-full p-1">
            {(['MONTHLY', 'SIX_MONTHS', 'ANNUAL'] as Duration[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={cn(
                  'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  duration === d
                    ? 'bg-gray-950 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-800',
                )}
              >
                {DURATION_LABELS[d]}
                {DURATION_SAVINGS[d] && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
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
          <div className="app-panel rounded-[32px] px-6 py-6 sm:px-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-950">Free</h2>
                <p className="mt-1 text-sm text-gray-500">Try Dotly with the essentials.</p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm text-gray-600">
                  <span className="app-panel-subtle rounded-full px-3 py-1.5">1 digital card</span>
                  <span className="app-panel-subtle rounded-full px-3 py-1.5">3 social links</span>
                  <span className="app-panel-subtle rounded-full px-3 py-1.5">7-day analytics</span>
                  <span className="app-panel-subtle rounded-full px-3 py-1.5">
                    Basic lead capture
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div>
                  <span className="text-4xl font-bold tracking-tight text-gray-950">$0</span>
                  <span className="ml-1 text-sm text-gray-500">USDT forever</span>
                </div>
                <Link
                  href="/auth?next=%2Fdashboard"
                  className="app-panel-subtle inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-white"
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
                    'relative overflow-hidden rounded-[34px] p-7 shadow-[0_32px_90px_-44px_rgba(15,23,42,0.38)] backdrop-blur-xl',
                    plan.highlight
                      ? 'border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-cyan-50'
                      : 'border border-white/75 bg-white/84',
                  )}
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 h-32"
                    style={{
                      background: plan.highlight
                        ? 'radial-gradient(circle at top, rgba(56,189,248,0.22), transparent 60%)'
                        : 'radial-gradient(circle at top, rgba(148,163,184,0.12), transparent 60%)',
                    }}
                  />

                  {plan.highlight && (
                    <div className="absolute right-6 top-6 inline-flex items-center gap-1.5 rounded-full bg-gray-950 px-3 py-1 text-xs font-semibold text-white">
                      <Sparkles className="h-3.5 w-3.5" />
                      Most complete
                    </div>
                  )}

                  <div className="relative">
                    <h2 className="text-xl font-semibold text-gray-950">{plan.name}</h2>
                    <p className="mt-2 text-sm leading-6 text-gray-500">{plan.tagline}</p>
                  </div>

                  <div className="relative mt-6">
                    <div className="flex items-end gap-2">
                      <span className="text-5xl font-bold tracking-tight text-gray-950">
                        {display}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-gray-500">{sub}</p>
                  </div>

                  <ul className="relative mt-6 space-y-3 text-sm text-gray-700">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-50 text-brand-500">
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
                        ? 'bg-gradient-to-b from-sky-500 to-sky-600 text-white shadow-[0_22px_45px_-24px_rgba(14,165,233,0.72)] hover:brightness-[1.03]'
                        : 'border border-brand-200 bg-white text-brand-700 hover:bg-brand-50',
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
            Published plans today: Free, Starter, and Pro.
          </p>

          <div className="app-panel mt-8 overflow-x-auto rounded-[32px]">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-5 py-4 font-semibold text-gray-700">Feature</th>
                  <th className="px-4 py-4 text-center font-semibold text-gray-500">Free</th>
                  <th className="px-4 py-4 text-center font-semibold text-gray-700">Starter</th>
                  <th className="bg-brand-50/40 px-4 py-4 text-center font-semibold text-brand-700">
                    Pro
                  </th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((row, index) => (
                  <tr
                    key={row.label}
                    className={cn(index % 2 === 0 ? 'bg-white' : 'bg-gray-50/35')}
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
      </section>

      <section className="border-t border-gray-100 bg-gray-50/75 px-6 py-12 text-center">
        <div className="app-panel mx-auto flex max-w-2xl flex-col items-center rounded-[30px] px-6 py-8">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <h3 className="text-lg font-bold text-gray-950">Payment roadmap</h3>
          <p className="mt-3 text-sm leading-7 text-gray-500">
            Dotly&apos;s published plans today focus on cards, analytics, CRM, inbox, and
            scheduling. Wallet-based USDT payments are not part of the current self-serve pricing
            surface.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  )
}
