'use client'

import { useState } from 'react'
import type { JSX } from 'react'
import {
  ExternalLink,
  ShieldCheck,
  Wallet,
  CreditCard,
  Building2,
  Coins,
  Ban,
  RefreshCcw,
} from 'lucide-react'

import { StatusNotice } from '@/components/ui/StatusNotice'
import { cn } from '@/lib/cn'
import { BILLING_FEATURE_MATRIX, getPlanFeatureValue } from '@/lib/billing-plans'

import {
  BILLING_DURATIONS,
  DURATION_LABEL,
  DURATION_SAVINGS,
  formatPlanLabel,
  PAID_PLANS,
  PLAN_PRICES,
  PLAN_COLORS,
  STATUS_COLORS,
} from './helpers'
import type { Duration, NoWalletOrder, PlanId, SubscriptionData } from './types'

export function BillingHero({
  currentPlan,
  currentStatus,
  walletAddress,
  hasWallet,
  selectedPrice,
  selectedPlan,
  selectedDuration,
  expiryDate,
  focusMessage,
  loading,
  paymentMethodBlocked,
  billingCountry,
}: {
  currentPlan: PlanId
  currentStatus: string
  walletAddress: string | null
  hasWallet: boolean | null
  selectedPrice: number | undefined
  selectedPlan: PlanId
  selectedDuration: Duration
  expiryDate: string | null
  focusMessage: string
  loading: boolean
  paymentMethodBlocked: boolean
  billingCountry: string | null
}): JSX.Element {
  const metrics = [
    { label: 'Plan', value: currentPlan },
    { label: 'Status', value: currentStatus },
    {
      label: 'Checkout',
      value: paymentMethodBlocked
        ? 'Blocked'
        : walletAddress
          ? 'Ready'
          : hasWallet === false
            ? 'Manual'
            : 'Setup',
    },
    { label: 'Selected Price', value: selectedPrice ? `$${selectedPrice}` : '—' },
  ]

  const snapshots = [
    {
      label: 'Plan state',
      value: currentPlan,
      detail: `${currentStatus}${expiryDate ? ` until ${expiryDate}` : ''}`,
      tone: 'bg-sky-50 text-sky-600',
    },
    {
      label: 'Checkout readiness',
      value: paymentMethodBlocked ? 'Unavailable' : walletAddress ? 'Ready' : 'Needs setup',
      detail: paymentMethodBlocked
        ? `Disabled for billing country${billingCountry ? ` ${billingCountry}` : ''}`
        : walletAddress
          ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
          : 'Checkout is available today',
      tone: paymentMethodBlocked
        ? 'bg-red-50 text-red-600'
        : walletAddress
          ? 'bg-emerald-50 text-emerald-600'
          : 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Upgrade selection',
      value: `${selectedPlan}`,
      detail: selectedPrice
        ? `${selectedDuration.replace('_', ' ')} at $${selectedPrice}`
        : 'No upgrade amount selected',
      tone: 'bg-indigo-50 text-indigo-600',
    },
  ]

  return (
    <div className="group relative overflow-hidden rounded-[32px] sm:rounded-[40px] border border-white/60 bg-white/40 p-4 sm:p-10 backdrop-blur-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] transition-all duration-700 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] ring-1 ring-black/5 w-full min-w-0">
      <div
        className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-sky-500/5 pointer-events-none"
        aria-hidden="true"
      />
      <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-indigo-400/10 blur-[100px] pointer-events-none" />
      <div className="absolute right-0 top-1/4 h-96 w-96 rounded-full bg-sky-400/10 blur-[100px] pointer-events-none" />
      <div className="relative z-10 flex flex-col gap-8 xl:grid xl:grid-cols-[1.35fr_0.92fr] xl:items-start">
        <div className="flex flex-col items-center xl:items-start text-center xl:text-left">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50/80 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.25em] text-indigo-600 ring-1 ring-inset ring-indigo-500/20 backdrop-blur-sm">
            <Wallet className="h-3.5 w-3.5" />
            Subscription
          </div>
          <h1 className="mt-4 text-[28px] font-extrabold tracking-tight text-gray-950 sm:text-[2rem] leading-tight">
            Manage billing with clearer subscription context
          </h1>
          <p className="mt-3 max-w-[280px] sm:max-w-2xl text-sm sm:text-base font-medium text-gray-500 leading-relaxed mx-auto xl:mx-0">
            Review your current plan, compare USD pricing, and use the available checkout method
            with more confidence.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center xl:justify-start gap-2 text-xs font-medium text-gray-600">
            <span className="rounded-full border border-indigo-100 bg-white/60 px-4 py-2 shadow-sm backdrop-blur-md transition-colors hover:bg-white">
              Free plan available
            </span>
            <span className="rounded-full border border-indigo-100 bg-white/60 px-4 py-2 shadow-sm backdrop-blur-md transition-colors hover:bg-white">
              7-day refund window on paid upgrades
            </span>
            <span className="rounded-full border border-indigo-100 bg-white/60 px-4 py-2 shadow-sm backdrop-blur-md transition-colors hover:bg-white">
              Cancel before renewal
            </span>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-4">
            {metrics.map(({ label, value }) => (
              <div
                key={label}
                className="flex flex-col items-center xl:items-start rounded-[24px] border border-white/80 bg-white/60 px-4 py-4 shadow-sm backdrop-blur-md transition-transform duration-500 hover:-translate-y-1 hover:bg-white/80 hover:shadow-md ring-1 ring-black/5 text-center xl:text-left"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400">
                  {label}
                </p>
                <p className="mt-1.5 text-base sm:text-lg font-extrabold text-gray-900">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 inline-flex max-w-full items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-4 py-2.5 text-xs font-semibold text-gray-600 shadow-sm backdrop-blur-md transition-all hover:bg-white active:scale-95">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-50 text-sky-600">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
            <span className="truncate">Focus: {focusMessage}</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[32px] border border-indigo-100/50 bg-gradient-to-br from-indigo-50/60 to-sky-50/60 p-6 sm:p-8 shadow-inner backdrop-blur-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-600">
                Billing Snapshot
              </p>
              <p className="mt-1.5 text-base font-extrabold text-indigo-950">
                Subscription health at a glance
              </p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 shadow-sm border border-indigo-100">
              <span className="flex h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              {loading ? 'Syncing' : 'Live'}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {snapshots.map(({ label, value, detail, tone }) => (
              <div
                key={label}
                className="group/snapshot flex items-center gap-4 rounded-[24px] border border-white/60 bg-white/60 px-5 py-4 shadow-sm backdrop-blur-lg transition-all duration-300 hover:scale-[1.02] hover:bg-white hover:shadow-md"
              >
                <span
                  className={`${tone} flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl`}
                >
                  <Wallet className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {label}
                  </p>
                  <p className="truncate text-sm text-gray-500">{detail}</p>
                </div>
                <span className="shrink-0 text-lg font-bold tabular-nums text-gray-900">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function BillingFeedback({
  successMsg,
  error,
}: {
  successMsg: string | null
  error: string | null
}): JSX.Element | null {
  if (!successMsg && !error) return null

  return (
    <>
      {successMsg && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {successMsg}
        </div>
      )}
      {error && <StatusNotice message={error} />}
    </>
  )
}

export function BillingLoadingState(): JSX.Element {
  return (
    <div className="app-list-skeleton rounded-[28px]">
      <div className="animate-pulse space-y-3">
        <div className="h-4 w-32 rounded bg-gray-200" />
        <div className="h-4 w-48 rounded bg-gray-200" />
      </div>
    </div>
  )
}

export function CurrentPlanCard({
  currentPlan,
  currentStatus,
  subscription,
  expiryDate,
}: {
  currentPlan: PlanId
  currentStatus: string
  subscription: SubscriptionData | null
  expiryDate: string | null
}): JSX.Element {
  const FEATURES = BILLING_FEATURE_MATRIX.map((row) => ({
    label: row.label,
    current: getPlanFeatureValue(row, currentPlan),
  }))
  return (
    <div className="relative overflow-hidden rounded-[32px] sm:rounded-[40px] border border-white/60 bg-white/40 p-4 sm:p-8 backdrop-blur-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] transition-all duration-500 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] ring-1 ring-black/5 w-full min-w-0">
      <h2 className="text-xl font-bold tracking-tight text-gray-950">Current Plan</h2>

      <div className="mt-8 rounded-[24px] border border-white/60 bg-white/60 p-4 shadow-sm backdrop-blur-md ring-1 ring-black/5 overflow-x-auto w-full">
        <table className="w-full min-w-[320px] sm:min-w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-200/60 bg-gray-100/50 backdrop-blur-sm">
              <th className="px-5 py-4 font-bold text-gray-700">Feature overview</th>
              <th className="px-4 py-4 text-center font-bold text-gray-700">Your Plan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100/60">
            {FEATURES.map((row, i) => (
              <tr key={row.label} className={i % 2 === 0 ? 'bg-white/40' : 'bg-transparent'}>
                <td className="px-5 py-3 font-medium text-gray-600">{row.label}</td>
                <td className="px-4 py-3 text-center">
                  {row.current === true ? (
                    <svg
                      className="mx-auto h-5 w-5 text-indigo-500"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : row.current === false ? (
                    <span className="text-gray-300 mx-auto block w-5 text-center">-</span>
                  ) : (
                    <span className="font-semibold text-gray-800">{row.current}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span
          className={cn(
            'rounded-full px-3 py-1 text-sm font-semibold',
            PLAN_COLORS[currentPlan] ?? 'bg-gray-100 text-gray-700',
          )}
        >
          {currentPlan}
        </span>
        <span
          className={cn(
            'rounded-full px-3 py-1 text-sm font-semibold',
            STATUS_COLORS[currentStatus] ?? 'bg-gray-100 text-gray-500',
          )}
        >
          {currentStatus}
        </span>
        {subscription?.billingDuration && (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
            {DURATION_LABEL[subscription.billingDuration as Duration]}
          </span>
        )}
      </div>
      {expiryDate && (
        <p className="mt-3 text-sm text-gray-500">
          Current period ends: <span className="font-medium text-gray-700">{expiryDate}</span>
        </p>
      )}
      {subscription?.amountUsdt && (
        <p className="mt-1 text-sm text-gray-500">
          Amount charged:{' '}
          <span className="font-medium text-gray-700">${subscription.amountUsdt} via checkout</span>
        </p>
      )}
      {subscription?.boosterAiOrderId && (
        <p className="mt-1 font-mono text-xs text-gray-400">
          Order:{' '}
          <span
            className="inline-block align-bottom max-w-[100px] sm:max-w-none truncate"
            title={subscription.boosterAiOrderId}
          >
            {subscription.boosterAiOrderId}
          </span>
        </p>
      )}
      {currentPlan === 'FREE' && (
        <div className="mt-4 space-y-3">
          <p className="text-sm sm:text-base font-medium leading-relaxed text-gray-500">
            Start on the free plan and upgrade only when you need deeper analytics, CRM, and
            follow-up features.
          </p>
          <a
            href="#upgrade"
            className="mt-2 inline-flex items-center justify-center rounded-2xl bg-gradient-to-b from-indigo-500 to-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-[0_20px_40px_-12px_rgba(99,102,241,0.5)] transition-all hover:scale-[1.02] hover:shadow-[0_25px_50px_-12px_rgba(99,102,241,0.6)] active:scale-[0.98] border border-indigo-400/20"
          >
            Upgrade your plan
          </a>
        </div>
      )}
    </div>
  )
}

export function WalletCard({
  walletAddress,
  hasWallet,
  connectingWallet,
  onConnectWallet,
  onManualWalletChange,
  paymentMethodBlocked,
  billingCountry,
}: {
  walletAddress: string | null
  hasWallet: boolean | null
  connectingWallet: boolean
  onConnectWallet: () => void
  onManualWalletChange: (value: string) => void
  paymentMethodBlocked: boolean
  billingCountry: string | null
}): JSX.Element {
  return (
    <div className="relative overflow-hidden rounded-[32px] sm:rounded-[40px] border border-white/60 bg-white/40 p-4 sm:p-8 backdrop-blur-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] transition-all duration-500 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] ring-1 ring-black/5 w-full min-w-0">
      <h2 className="text-base font-semibold text-gray-900">Checkout</h2>
      <p className="mt-1 text-sm text-gray-500">
        Dotly plans are priced in USD. Use the currently supported checkout method to complete your
        upgrade.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center xl:justify-start gap-2 text-xs font-medium text-gray-600">
        <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5">
          Card coming soon
        </span>
        <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5">
          Bank transfer coming soon
        </span>
        <span
          className={cn(
            'rounded-full border px-3 py-1.5',
            paymentMethodBlocked
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700',
          )}
        >
          {paymentMethodBlocked ? 'Unavailable here' : 'Available now'}
        </span>
      </div>
      {paymentMethodBlocked && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Checkout is unavailable for your billing country
          {billingCountry ? ` (${billingCountry})` : ''}.
        </div>
      )}
      <div className="mt-4">
        {paymentMethodBlocked ? (
          <p className="text-sm text-gray-500">
            Update your profile country if it is incorrect. Card and bank payment methods will
            appear here when available.
          </p>
        ) : walletAddress ? (
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="font-mono text-sm text-gray-700">
              {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
            </span>
            <button
              type="button"
              onClick={onConnectWallet}
              className="text-xs text-brand-500 hover:underline"
            >
              {hasWallet === false ? 'Reconnect or edit' : 'Change'}
            </button>
          </div>
        ) : hasWallet === false ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              No payment app was detected in this browser. You can still continue from a supported
              app by entering your payment address below and generating payment links.
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-0 flex-1">
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Your payment address
                </label>
                <input
                  type="text"
                  placeholder="0x…"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  onChange={(event) => onManualWalletChange(event.target.value)}
                />
              </div>
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Get payment app
              </a>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={onConnectWallet}
            disabled={connectingWallet || hasWallet === null}
            className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-white disabled:opacity-50"
          >
            <Wallet className="h-4 w-4 text-brand-500" />
            {connectingWallet
              ? 'Connecting…'
              : hasWallet === null
                ? 'Detecting wallet…'
                : 'Connect wallet'}
          </button>
        )}
      </div>
    </div>
  )
}

export function UpgradePlanCard({
  currentPlan,
  selectedPlan,
  selectedDuration,
  selectedPrice,
  subscribeStep,
  noWalletOrder,
  nowMs,
  noWalletActivating,
  walletAddress,
  hasWallet,
  subscribing,
  onConnectWallet,
  onSelectPlan,
  onSelectDuration,
  onActivateNoWallet,
  onNoWalletTxHashChange,
  onGeneratePaymentLinks,
  onSubscribe,
  onOpenCheckout,
  paymentMethodBlocked,
  billingCountry,
}: {
  currentPlan: PlanId
  selectedPlan: PlanId
  selectedDuration: Duration
  selectedPrice: number | undefined
  subscribeStep: string | null
  noWalletOrder: NoWalletOrder | null
  nowMs: number
  noWalletActivating: boolean
  walletAddress: string | null
  hasWallet: boolean | null
  subscribing: boolean
  onConnectWallet: () => void
  onSelectPlan: (plan: PlanId) => void
  onSelectDuration: (duration: Duration) => void
  onActivateNoWallet: () => void
  onNoWalletTxHashChange: (value: string) => void
  onGeneratePaymentLinks: () => void
  onSubscribe: () => void
  onOpenCheckout?: () => void
  paymentMethodBlocked: boolean
  billingCountry: string | null
}): JSX.Element | null {
  const [copiedCheckoutLink, setCopiedCheckoutLink] = useState(false)

  if (currentPlan === 'ENTERPRISE') return null

  const remainingMs = noWalletOrder ? Math.max(0, noWalletOrder.expiresAtMs - nowMs) : 0
  const remainingMinutes = Math.floor(remainingMs / 60_000)
  const remainingSeconds = Math.floor((remainingMs % 60_000) / 1000)
  const hostedLinkExpired = noWalletOrder ? remainingMs === 0 : false

  const handleCopyCheckoutLink = async () => {
    if (!noWalletOrder) return

    try {
      await navigator.clipboard.writeText(noWalletOrder.checkoutUrl)
      setCopiedCheckoutLink(true)
      window.setTimeout(() => setCopiedCheckoutLink(false), 2000)
    } catch {
      setCopiedCheckoutLink(false)
    }
  }

  const FEATURES = BILLING_FEATURE_MATRIX.map((row) => ({
    label: row.label,
    current: getPlanFeatureValue(row, selectedPlan),
  }))

  return (
    <div
      id="upgrade"
      className="relative overflow-hidden rounded-[32px] sm:rounded-[40px] border border-white/60 bg-white/40 p-4 sm:p-8 backdrop-blur-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] transition-all duration-500 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] ring-1 ring-black/5 w-full min-w-0"
    >
      <h2 className="text-xl font-bold tracking-tight text-indigo-950">Upgrade Plan</h2>
      <p className="mt-2 text-sm sm:text-base font-medium leading-relaxed text-gray-500">
        Upgrade to unlock powerful follow-up tools and deeper analytics.
      </p>
      <div className="mt-6 rounded-[20px] border border-indigo-100/50 bg-gradient-to-br from-indigo-50/50 to-sky-50/50 px-5 py-4 text-sm font-medium text-indigo-900 shadow-sm backdrop-blur-sm">
        Paid upgrades include a 7-day refund window. If you are unsure, stay on the free plan first
        and upgrade once you are ready.
      </div>

      <div className="mt-5 space-y-5">
        <div>
          <label className="mb-3 block text-sm font-bold text-gray-950 uppercase tracking-wider">
            1. Choose your plan
          </label>
          <div className="flex flex-wrap gap-3">
            {PAID_PLANS.map((plan) => (
              <button
                key={plan}
                type="button"
                onClick={() => onSelectPlan(plan)}
                className={cn(
                  'flex-1 sm:flex-none relative flex items-center justify-center rounded-[14px] sm:rounded-[18px] border px-3 sm:px-6 py-3 sm:py-3.5 text-xs sm:text-sm font-bold transition-all duration-300 min-w-0 sm:min-w-[120px]',
                  selectedPlan === plan
                    ? 'border-indigo-500/20 bg-gradient-to-b from-indigo-50 to-indigo-100/50 text-indigo-700 shadow-[0_4px_12px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/30 scale-[1.02]'
                    : 'border-white/60 bg-white/40 text-gray-600 hover:bg-white/80 hover:text-gray-900 shadow-sm active:scale-[0.98]',
                )}
              >
                {formatPlanLabel(plan)}
              </button>
            ))}
          </div>

          {/* Dynamic Upgrade Features */}
          <div className="mt-8 rounded-[24px] border border-white/60 bg-white/60 p-4 shadow-sm backdrop-blur-md ring-1 ring-black/5 overflow-hidden">
            <div className="w-full overflow-x-auto rounded-[18px] bg-white/40 shadow-inner">
              <table className="w-full min-w-[320px] sm:min-w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-200/60 bg-gray-100/50 backdrop-blur-sm">
                    <th className="px-5 py-4 font-bold text-gray-700">Premium feature</th>
                    <th className="px-4 py-4 text-center font-bold text-indigo-900 bg-indigo-50/50">
                      <div className="text-base">{formatPlanLabel(selectedPlan)}</div>
                      {selectedPrice ? (
                        <div className="mt-0.5 text-xs font-medium text-indigo-600/80">
                          $
                          {(
                            selectedPrice /
                            (selectedDuration === 'ANNUAL'
                              ? 12
                              : selectedDuration === 'SIX_MONTHS'
                                ? 6
                                : 1)
                          ).toLocaleString('en-US', { maximumFractionDigits: 2 })}{' '}
                          / mo
                        </div>
                      ) : null}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/60">
                  {FEATURES.map((row, i) => (
                    <tr
                      key={row.label}
                      className={
                        i % 2 === 0
                          ? 'bg-white/60 transition-colors hover:bg-white/80'
                          : 'bg-transparent transition-colors hover:bg-white/40'
                      }
                    >
                      <td className="px-5 py-3.5 font-medium text-gray-600">{row.label}</td>
                      <td className="bg-indigo-50/20 px-4 py-3.5 text-center">
                        {row.current === true ? (
                          <svg
                            className="mx-auto h-5 w-5 text-indigo-500 backdrop-blur-sm"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : row.current === false ? (
                          <span className="text-gray-300 mx-auto block w-5 text-center">-</span>
                        ) : (
                          <span className="font-bold text-indigo-700">{row.current}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-indigo-100/50">
          <label className="mb-3 block text-sm font-bold text-gray-950 uppercase tracking-wider">
            2. Choose billing period
          </label>
          <div className="flex flex-col gap-3">
            {BILLING_DURATIONS.map((duration) => {
              const price = PLAN_PRICES[selectedPlan]?.[duration]
              const moPrice = price
                ? (price / (duration === 'ANNUAL' ? 12 : duration === 'SIX_MONTHS' ? 6 : 1))
                    .toFixed(2)
                    .replace(/\.00$/, '')
                : null

              return (
                <button
                  key={duration}
                  type="button"
                  onClick={() => onSelectDuration(duration)}
                  className={cn(
                    'group relative flex w-full items-center justify-between rounded-[24px] border p-5 text-left transition-all duration-300',
                    selectedDuration === duration
                      ? 'border-indigo-500/30 bg-gradient-to-b from-indigo-50/50 to-indigo-100/50 shadow-[0_8px_24px_rgba(99,102,241,0.15)] ring-1 ring-indigo-400/20 scale-[1.02]'
                      : 'border-white/60 bg-white/40 hover:bg-white/80 hover:shadow-sm active:scale-[0.99] text-gray-600 hover:text-gray-900 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]',
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all duration-300 shadow-sm',
                        selectedDuration === duration
                          ? 'border-indigo-600 bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.5)]'
                          : 'border-gray-300 bg-white/80 group-hover:border-indigo-300',
                      )}
                    >
                      <div
                        className={cn(
                          'h-2 w-2 rounded-full bg-white transition-all duration-300',
                          selectedDuration === duration
                            ? 'scale-100 opacity-100'
                            : 'scale-0 opacity-0',
                        )}
                      />
                    </div>
                    <div>
                      <div
                        className={cn(
                          'text-[15px] font-extrabold tracking-wide',
                          selectedDuration === duration ? 'text-indigo-950' : 'text-gray-800',
                        )}
                      >
                        {DURATION_LABEL[duration]}
                      </div>
                      {DURATION_SAVINGS[duration] && (
                        <div className="mt-1.5 flex items-center gap-2 text-xs font-bold text-emerald-600">
                          <span
                            className={cn(
                              'rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.05em] shadow-[0_2px_4px_rgba(16,185,129,0.1)] transition-colors',
                              selectedDuration === duration
                                ? 'border-emerald-300 bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-700'
                                : 'border-emerald-200/60 bg-emerald-50/50 group-hover:bg-emerald-100/50',
                            )}
                          >
                            {DURATION_SAVINGS[duration]}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {price ? (
                      <>
                        <div
                          className={cn(
                            'text-xl font-black tracking-tight',
                            selectedDuration === duration
                              ? 'text-indigo-600'
                              : 'text-gray-900 group-hover:text-indigo-500 transition-colors',
                          )}
                        >
                          ${price}
                        </div>
                        <div
                          className={cn(
                            'mt-1 text-xs font-bold uppercase tracking-wider',
                            selectedDuration === duration
                              ? 'text-indigo-500/80'
                              : 'text-gray-400 group-hover:text-gray-500 transition-colors',
                          )}
                        >
                          ${moPrice} / mo
                        </div>
                      </>
                    ) : (
                      <div className="text-sm font-bold text-gray-400">Contact Sales</div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="pt-6 border-t border-indigo-100/50">
          <label className="mb-3 block text-sm font-bold text-gray-950 uppercase tracking-wider">
            3. Payment method
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {/* Card (Coming Soon) */}
            <div className="group relative flex flex-col justify-between rounded-[20px] border border-white/60 bg-white/40 p-4 text-left transition-all duration-300 opacity-60 grayscale-[100%] cursor-not-allowed shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-400 shadow-sm">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div className="font-bold text-gray-700">Card</div>
              </div>
              <div className="mt-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                Coming soon
              </div>
            </div>

            {/* Bank (Coming Soon) */}
            <div className="group relative flex flex-col justify-between rounded-[20px] border border-white/60 bg-white/40 p-4 text-left transition-all duration-300 opacity-60 grayscale-[100%] cursor-not-allowed shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-400 shadow-sm">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="font-bold text-gray-700">Bank</div>
              </div>
              <div className="mt-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                Coming soon
              </div>
            </div>

            {/* Current method */}
            <div
              className={cn(
                'group relative flex flex-col justify-between rounded-[20px] border p-4 text-left transition-all duration-300',
                paymentMethodBlocked
                  ? 'border-red-200/60 bg-red-50/50 shadow-sm opacity-70 cursor-not-allowed'
                  : 'border-indigo-500/30 bg-gradient-to-b from-indigo-50/50 to-indigo-100/50 shadow-[0_8px_24px_rgba(99,102,241,0.15)] ring-1 ring-indigo-400/20 scale-[1.02] z-10',
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border shadow-sm transition-all duration-300',
                    paymentMethodBlocked
                      ? 'border-red-200 bg-white text-red-500'
                      : 'border-indigo-600 bg-indigo-600 text-white shadow-[0_0_10px_rgba(79,70,229,0.5)]',
                  )}
                >
                  {paymentMethodBlocked ? (
                    <Ban className="h-4 w-4" />
                  ) : (
                    <Coins className="h-4 w-4" />
                  )}
                </div>
                <div
                  className={cn(
                    'font-bold text-[15px] tracking-wide',
                    paymentMethodBlocked ? 'text-red-900' : 'text-indigo-950',
                  )}
                >
                  Checkout
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div
                  className={cn(
                    'text-[10px] font-extrabold uppercase tracking-wider',
                    paymentMethodBlocked ? 'text-red-500' : 'text-indigo-600',
                  )}
                >
                  {paymentMethodBlocked
                    ? `Unavailable${billingCountry ? ` in ${billingCountry}` : ''}`
                    : 'Selected'}
                </div>
                {!paymentMethodBlocked && (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm border border-indigo-400">
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="app-panel-subtle rounded-[24px] p-4 text-sm text-gray-600">
          <div className="flex items-center gap-2 text-gray-800">
            <ShieldCheck className="h-4 w-4 text-brand-500" />
            <p className="font-medium">Checkout summary</p>
          </div>
          <p className="mt-1">
            Plan:{' '}
            <span className="font-semibold text-gray-900">{formatPlanLabel(selectedPlan)}</span>
          </p>
          <p>
            Duration:{' '}
            <span className="font-semibold text-gray-900">{DURATION_LABEL[selectedDuration]}</span>
          </p>
          <p>
            Amount: <span className="font-semibold text-gray-900">${selectedPrice ?? '—'} USD</span>
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Checkout may require an approval step before payment confirmation, depending on the
            active method.
          </p>
          <p className="mt-2 text-xs text-gray-500">
            The refund window and renewal terms shown in Dotly apply to your subscription after
            activation.
          </p>
        </div>

        {subscribeStep && (
          <div className="flex items-center gap-2 text-sm text-brand-600">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            {subscribeStep}
          </div>
        )}

        {!paymentMethodBlocked && noWalletOrder && (
          <div className="rounded-[24px] border border-blue-200/80 bg-blue-50/90 p-4 shadow-sm">
            <p className="text-sm font-semibold text-blue-900">Hosted checkout link</p>
            <p className="text-xs text-blue-700">
              Copy this checkout link into your payment app. Dotly will guide approval and payment
              there. Amount: <strong>${noWalletOrder.amountUsdt} USD equivalent</strong> on network{' '}
              {noWalletOrder.chainId}.
            </p>
            <div className="mt-3 rounded-xl border border-blue-200 bg-white/80 px-3 py-2 text-xs text-blue-800">
              <p>
                Link status:{' '}
                <span className="font-semibold">
                  {noWalletOrder.lastStatus === 'ACTIVE'
                    ? 'Activated'
                    : noWalletOrder.lastStatus === 'PAID'
                      ? 'Payment detected'
                      : noWalletOrder.lastStatus === 'REFUNDED'
                        ? 'Refunded'
                        : hostedLinkExpired || noWalletOrder.lastStatus === 'EXPIRED'
                          ? 'Expired'
                          : 'Waiting for payment'}
                </span>
              </p>
              <p className="mt-1">
                {hostedLinkExpired || noWalletOrder.lastStatus === 'EXPIRED'
                  ? 'This hosted checkout link has expired after 5 minutes. If you already paid, Dotly can still confirm it below.'
                  : `Link expires in ${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')}. Dotly checks payment status automatically every 10 seconds.`}
              </p>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <button
                  type="button"
                  onClick={() => void handleCopyCheckoutLink()}
                  className="rounded-xl border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                >
                  {copiedCheckoutLink ? 'Copied' : 'Copy link'}
                </button>
                {!hostedLinkExpired && noWalletOrder.lastStatus !== 'EXPIRED' && (
                  <a
                    href={noWalletOrder.checkoutUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50"
                  >
                    Open link
                  </a>
                )}
              </div>
              {hostedLinkExpired || noWalletOrder.lastStatus === 'EXPIRED' ? (
                <div className="block break-all rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-mono text-amber-700">
                  {noWalletOrder.checkoutUrl}
                </div>
              ) : (
                <a
                  href={noWalletOrder.checkoutUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block break-all rounded-md border border-blue-300 bg-white px-3 py-2 text-xs font-mono text-blue-700 hover:bg-blue-50"
                >
                  {noWalletOrder.checkoutUrl}
                </a>
              )}
              <p className="text-[11px] text-blue-700">
                Open this inside a supported payment app. The hosted checkout will guide payment and
                try to activate your plan automatically.
              </p>
              {(hostedLinkExpired || noWalletOrder.lastStatus === 'EXPIRED') && (
                <button
                  type="button"
                  onClick={onGeneratePaymentLinks}
                  disabled={subscribing}
                  className="rounded-xl border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-50"
                >
                  {subscribing ? 'Generating…' : 'Generate new 5-minute link'}
                </button>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-blue-800">
                Fallback: payment transaction hash
              </label>
              <input
                type="text"
                value={noWalletOrder.txHash ?? ''}
                onChange={(event) => onNoWalletTxHashChange(event.target.value)}
                placeholder="0x..."
                className="w-full rounded-xl border border-blue-300 bg-white px-3 py-2 text-xs text-blue-900 placeholder:text-blue-300 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-blue-700">
                Usually the hosted checkout activates automatically. Use this only if the payment
                app finishes payment but cannot return to Dotly.
              </p>
            </div>
            <button
              type="button"
              onClick={onActivateNoWallet}
              disabled={noWalletActivating}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {noWalletActivating ? 'Checking…' : 'I already paid — confirm'}
            </button>
          </div>
        )}

        {paymentMethodBlocked ? (
          <p className="text-xs text-gray-400">
            Checkout is disabled for your billing country. Update your profile country if needed.
          </p>
        ) : (
          !noWalletOrder && (
            <>
              <button
                type="button"
                onClick={() => {
                  if (hasWallet === false) {
                    onGeneratePaymentLinks()
                    return
                  }

                  if (!walletAddress) {
                    onConnectWallet()
                    return
                  }

                  if (onOpenCheckout) {
                    onOpenCheckout()
                    return
                  }

                  onSubscribe()
                }}
                disabled={subscribing || paymentMethodBlocked}
                className={cn(
                  'w-full sm:w-auto rounded-xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-[0_4px_12px_rgba(79,70,229,0.25)] transition-all hover:bg-indigo-700 hover:shadow-[0_6px_20px_rgba(79,70,229,0.35)] active:scale-[0.98]',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                )}
              >
                {subscribing
                  ? (subscribeStep ?? 'Processing…')
                  : hasWallet === false
                    ? 'Generate payment links'
                    : !walletAddress
                      ? 'Connect payment account'
                      : onOpenCheckout
                        ? 'Continue to checkout'
                        : 'Pay now'}
              </button>
            </>
          )
        )}
      </div>
    </div>
  )
}

export function TransactionHistoryCard({
  subscription,
  expiryDate,
}: {
  subscription: SubscriptionData | null
  expiryDate: string | null
}): JSX.Element {
  return (
    <div className="relative overflow-hidden rounded-[32px] sm:rounded-[40px] border border-white/60 bg-white/40 p-4 sm:p-8 backdrop-blur-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] transition-all duration-500 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] ring-1 ring-black/5 w-full min-w-0">
      <h2 className="text-base font-semibold text-gray-900">Transaction History</h2>
      {subscription?.txHash ? (
        <div className="app-panel-subtle mt-3 rounded-[24px] p-4 text-sm text-gray-700">
          <p className="font-medium text-gray-900">Latest subscription transaction</p>
          <p className="mt-2">
            Plan: <span className="font-semibold">{subscription.plan}</span>
          </p>
          <p className="mt-1">
            Status: <span className="font-semibold">{subscription.status}</span>
          </p>
          {expiryDate && (
            <p className="mt-1">
              Renews / expires: <span className="font-semibold">{expiryDate}</span>
            </p>
          )}
          <p className="mt-2 font-mono text-xs text-gray-500 truncate" title={subscription.txHash}>
            {subscription.txHash}
          </p>
          <a
            href={`https://arbiscan.io/tx/${subscription.txHash}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-brand-500 hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View on Arbiscan
          </a>
        </div>
      ) : (
        <p className="mt-2 text-sm text-gray-400">No subscription payment activity recorded yet.</p>
      )}
    </div>
  )
}

function formatRefundStatusLabel(
  status: NonNullable<SubscriptionData['refund']>['status'],
): string {
  switch (status) {
    case 'PAID_ESCROW':
      return 'Refund window open'
    case 'REFUNDED':
      return 'Refunded'
    case 'FINALIZED':
      return 'Refund window closed'
    default:
      return 'No refund data'
  }
}

function formatDateTime(value: string | null): string | null {
  if (!value) return null

  return new Date(value).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatRefundTimeRemaining(refundUntil: string | null): string | null {
  if (!refundUntil) return null

  const deadline = new Date(refundUntil)
  const diffMs = deadline.getTime() - Date.now()

  if (Number.isNaN(deadline.getTime()) || diffMs <= 0) return null

  const minutesLeft = Math.ceil(diffMs / (60 * 1000))
  const hoursLeft = Math.ceil(diffMs / (60 * 60 * 1000))
  const daysLeft = Math.ceil(diffMs / (24 * 60 * 60 * 1000))

  if (daysLeft >= 2) return `${daysLeft} days left to claim`
  if (daysLeft === 1 && diffMs > 24 * 60 * 60 * 1000 - 60 * 1000) return '1 day left to claim'
  if (hoursLeft >= 2) return `${hoursLeft} hours left to claim`
  if (hoursLeft === 1) return '1 hour left to claim'
  if (minutesLeft >= 2) return `${minutesLeft} minutes left to claim`
  return 'Less than 1 minute left to claim'
}

export function RefundCard({
  subscription,
  refunding,
  requestingManualReview,
  onRequestRefund,
  onRequestManualReview,
}: {
  subscription: SubscriptionData | null
  refunding: boolean
  requestingManualReview: boolean
  onRequestRefund: () => void
  onRequestManualReview: () => void
}): JSX.Element {
  const refund = subscription?.refund

  if (!refund) {
    return (
      <div className="relative overflow-hidden rounded-[32px] sm:rounded-[40px] border border-white/60 bg-white/40 p-4 sm:p-8 backdrop-blur-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] ring-1 ring-black/5 w-full min-w-0">
        <h2 className="text-base font-semibold text-gray-900">Refund Status</h2>
        <p className="mt-2 text-sm text-gray-500">
          Refund details appear here after a paid subscription has been activated.
        </p>
      </div>
    )
  }

  const refundUntilLabel = formatDateTime(refund.refundUntil)
  const supportRequestedLabel = formatDateTime(refund.supportRequestedAt)
  const refundTimeRemaining =
    refund.status === 'PAID_ESCROW' ? formatRefundTimeRemaining(refund.refundUntil) : null

  return (
    <div className="relative overflow-hidden rounded-[32px] sm:rounded-[40px] border border-white/60 bg-white/40 p-4 sm:p-8 backdrop-blur-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] ring-1 ring-black/5 w-full min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Refund Status</h2>
          <p className="mt-2 text-sm text-gray-500">
            Dotly refunds are executed against the latest payment record for your subscription.
          </p>
        </div>
        <span
          className={cn(
            'rounded-full px-3 py-1 text-xs font-semibold',
            refund.status === 'PAID_ESCROW'
              ? 'bg-amber-100 text-amber-800'
              : refund.status === 'REFUNDED'
                ? 'bg-green-100 text-green-800'
                : refund.status === 'FINALIZED'
                  ? 'bg-gray-100 text-gray-700'
                  : 'bg-gray-100 text-gray-600',
          )}
        >
          {formatRefundStatusLabel(refund.status)}
        </span>
      </div>

      <div className="mt-4 rounded-[24px] border border-white/60 bg-white/60 p-4 shadow-sm backdrop-blur-md ring-1 ring-black/5 w-full min-w-0">
        <div className="space-y-2 text-sm text-gray-700">
          <p>
            Payment ID:{' '}
            <span
              className="font-mono text-xs text-gray-500 max-w-[120px] sm:max-w-none inline-block align-bottom truncate"
              title={refund.paymentId ?? undefined}
            >
              {refund.paymentId ?? '—'}
            </span>
          </p>
          <p>
            Refund deadline: <span className="font-medium">{refundUntilLabel ?? '—'}</span>
          </p>
          <p>
            Claim window: <span className="font-medium">{refundTimeRemaining ?? 'Closed'}</span>
          </p>
          <p>
            Manual review:{' '}
            <span className="font-medium">{supportRequestedLabel ?? 'Not requested'}</span>
          </p>
        </div>
      </div>

      {refund.status === 'PAID_ESCROW' && (
        <p className="mt-4 text-sm text-gray-600">
          The refund window is still open. You can submit the refund from the original payment
          account, or log a manual review request for support fallback.
        </p>
      )}

      {refund.status === 'REFUNDED' && (
        <p className="mt-4 text-sm text-green-700">
          This payment has already been refunded. Billing access is downgraded after the next sync
          and is also refreshed when this page reloads.
        </p>
      )}

      {refund.status === 'FINALIZED' && (
        <p className="mt-4 text-sm text-gray-600">
          The escrow period has ended and this payment is finalized, so the refund window is no
          longer available.
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onRequestRefund}
          disabled={!refund.canSelfRefund || refunding}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCcw className="h-4 w-4" />
          {refunding ? 'Submitting refund…' : 'Request refund in wallet'}
        </button>
        <button
          type="button"
          onClick={onRequestManualReview}
          disabled={
            !refund.canRequestManualReview || requestingManualReview || !!refund.supportRequestedAt
          }
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {requestingManualReview
            ? 'Recording review request…'
            : refund.supportRequestedAt
              ? 'Manual review requested'
              : 'Request manual review'}
        </button>
      </div>
    </div>
  )
}
