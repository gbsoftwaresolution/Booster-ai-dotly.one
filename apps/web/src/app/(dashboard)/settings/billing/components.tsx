'use client'

import type { JSX } from 'react'
import { ExternalLink, ShieldCheck, Wallet } from 'lucide-react'

import { StatusNotice } from '@/components/ui/StatusNotice'
import { cn } from '@/lib/cn'

import {
  BILLING_DURATIONS,
  DURATION_LABEL,
  DURATION_SAVINGS,
  formatPlanLabel,
  PAID_PLANS,
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
}): JSX.Element {
  const metrics = [
    { label: 'Plan', value: currentPlan },
    { label: 'Status', value: currentStatus },
    {
      label: 'Wallet',
      value: walletAddress ? 'Connected' : hasWallet === false ? 'External' : 'Missing',
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
      label: 'Wallet readiness',
      value: walletAddress ? 'Ready' : 'Needs setup',
      detail: walletAddress
        ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
        : 'Connect a wallet to pay with USDT',
      tone: walletAddress ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600',
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
    <div className="app-panel relative overflow-hidden rounded-[34px] px-6 py-6 sm:px-8 sm:py-7">
      <div
        className="absolute inset-0 opacity-90"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(circle at top left, rgba(14,165,233,0.12), transparent 34%), radial-gradient(circle at right center, rgba(99,102,241,0.10), transparent 28%), linear-gradient(135deg, rgba(255,255,255,0.94), rgba(248,250,252,0.98))',
        }}
      />
      <div className="relative grid gap-5 xl:grid-cols-[1.35fr_0.92fr] xl:items-start">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-600">
            <Wallet className="h-3.5 w-3.5" />
            Subscription
          </div>
          <h1 className="mt-3 text-2xl font-bold text-gray-900 sm:text-[2rem]">
            Manage billing with clearer subscription context
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500 sm:text-[15px]">
            Review your current plan, connect a wallet for USDT payments, and control upgrades with
            more confidence.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-xl sm:grid-cols-4">
            {metrics.map(({ label, value }) => (
              <div
                key={label}
                className="rounded-[22px] border border-white/80 bg-white/85 px-3 py-3 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.2)]"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                  {label}
                </p>
                <p className="mt-1 text-sm font-bold text-gray-900 sm:text-base">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-medium text-gray-600 shadow-sm">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-50 text-sky-600">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
            <span className="truncate">Focus: {focusMessage}</span>
          </div>
        </div>

        <div className="app-panel-subtle rounded-[30px] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
                Billing Snapshot
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                Subscription health at a glance
              </p>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-600 shadow-sm">
              {loading ? 'Syncing' : 'Live'}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {snapshots.map(({ label, value, detail, tone }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-[24px] border border-white/80 bg-white/80 px-4 py-3"
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
  return (
    <div className="app-panel rounded-[28px] p-6 sm:p-7">
      <h2 className="text-base font-semibold text-gray-900">Current Plan</h2>
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
          Amount paid:{' '}
          <span className="font-medium text-gray-700">${subscription.amountUsdt} USDT</span>
        </p>
      )}
      {subscription?.boosterAiOrderId && (
        <p className="mt-1 font-mono text-xs text-gray-400">
          Order: {subscription.boosterAiOrderId}
        </p>
      )}
      {currentPlan === 'FREE' && (
        <div className="mt-4">
          <a
            href="#upgrade"
            className="inline-block rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600"
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
}: {
  walletAddress: string | null
  hasWallet: boolean | null
  connectingWallet: boolean
  onConnectWallet: () => void
  onManualWalletChange: (value: string) => void
}): JSX.Element {
  return (
    <div className="app-panel rounded-[28px] p-6 sm:p-7">
      <h2 className="text-base font-semibold text-gray-900">Web3 Wallet</h2>
      <p className="mt-1 text-sm text-gray-500">
        Connect your wallet to pay with USDT on Arbitrum via the BoosterAI PaymentVault.
      </p>
      <div className="mt-4">
        {walletAddress ? (
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="font-mono text-sm text-gray-700">
              {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
            </span>
            {hasWallet !== false && (
              <button
                type="button"
                onClick={onConnectWallet}
                className="text-xs text-brand-500 hover:underline"
              >
                Change
              </button>
            )}
          </div>
        ) : hasWallet === false ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              No wallet detected in this browser. You can still subscribe using MetaMask Mobile —
              enter your wallet address below to generate payment links, then open them in your
              wallet app.
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-0 flex-1">
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Your wallet address
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
                Get MetaMask
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
                : 'Connect Wallet'}
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
  noWalletActivating,
  walletAddress,
  hasWallet,
  subscribing,
  onSelectPlan,
  onSelectDuration,
  onActivateNoWallet,
  onGeneratePaymentLinks,
  onSubscribe,
}: {
  currentPlan: PlanId
  selectedPlan: PlanId
  selectedDuration: Duration
  selectedPrice: number | undefined
  subscribeStep: string | null
  noWalletOrder: NoWalletOrder | null
  noWalletActivating: boolean
  walletAddress: string | null
  hasWallet: boolean | null
  subscribing: boolean
  onSelectPlan: (plan: PlanId) => void
  onSelectDuration: (duration: Duration) => void
  onActivateNoWallet: () => void
  onGeneratePaymentLinks: () => void
  onSubscribe: () => void
}): JSX.Element | null {
  if (currentPlan === 'ENTERPRISE') return null

  return (
    <div id="upgrade" className="app-panel rounded-[28px] p-6 sm:p-7">
      <h2 className="text-base font-semibold text-gray-900">Upgrade Plan</h2>
      <p className="mt-1 text-sm text-gray-500">
        Pay with USDT. Your wallet signs the transaction — your private key stays private.
      </p>

      <div className="mt-5 space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Select plan</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {PAID_PLANS.map((plan) => (
              <button
                key={plan}
                type="button"
                onClick={() => onSelectPlan(plan)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                  selectedPlan === plan
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300',
                )}
              >
                {formatPlanLabel(plan)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Billing period</label>
          <div className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 p-1">
            {BILLING_DURATIONS.map((duration) => (
              <button
                key={duration}
                type="button"
                onClick={() => onSelectDuration(duration)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                  selectedDuration === duration
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-500 hover:text-gray-700',
                )}
              >
                {DURATION_LABEL[duration]}
                {DURATION_SAVINGS[duration] && (
                  <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700">
                    {DURATION_SAVINGS[duration]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="app-panel-subtle rounded-[24px] p-4 text-sm text-gray-600">
          <div className="flex items-center gap-2 text-gray-800">
            <ShieldCheck className="h-4 w-4 text-brand-500" />
            <p className="font-medium">Transaction summary</p>
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
            Amount:{' '}
            <span className="font-semibold text-gray-900">${selectedPrice ?? '—'} USDT</span>
          </p>
          <p className="mt-2 text-xs text-gray-500">
            Network: Arbitrum One (chain 42161). You will approve USDT spending, then confirm the
            payment transaction in your wallet.
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

        {noWalletOrder && (
          <div className="rounded-[24px] border border-blue-200/80 bg-blue-50/90 p-4 shadow-sm">
            <p className="text-sm font-semibold text-blue-900">
              Two-step payment via MetaMask Mobile
            </p>
            <p className="text-xs text-blue-700">
              Open each link in your MetaMask Mobile or Trust Wallet browser in order. Amount:{' '}
              <strong>${noWalletOrder.amountUsdt} USDT</strong> on chain {noWalletOrder.chainId}.
            </p>
            <div className="mt-4 space-y-2">
              <div>
                <p className="mb-1 text-xs font-medium text-blue-800">
                  Step 1 — Approve USDT spending
                </p>
                <a
                  href={noWalletOrder.approveLink}
                  className="block break-all rounded-md border border-blue-300 bg-white px-3 py-2 text-xs font-mono text-blue-700 hover:bg-blue-50"
                >
                  {noWalletOrder.approveLink}
                </a>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-blue-800">Step 2 — Confirm payment</p>
                <a
                  href={noWalletOrder.payLink}
                  className="block break-all rounded-md border border-blue-300 bg-white px-3 py-2 text-xs font-mono text-blue-700 hover:bg-blue-50"
                >
                  {noWalletOrder.payLink}
                </a>
              </div>
            </div>
            <p className="text-xs text-blue-600">
              After completing both transactions, click below to activate your plan.
            </p>
            <button
              type="button"
              onClick={onActivateNoWallet}
              disabled={noWalletActivating}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {noWalletActivating
                ? 'Checking…'
                : "I've completed both transactions — activate my plan"}
            </button>
          </div>
        )}

        {!noWalletOrder && (
          <>
            {hasWallet === false && walletAddress ? (
              <button
                type="button"
                onClick={onGeneratePaymentLinks}
                disabled={subscribing}
                className={cn(
                  'rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                )}
              >
                {subscribing ? 'Creating order…' : 'Generate payment links'}
              </button>
            ) : (
              <button
                type="button"
                onClick={onSubscribe}
                disabled={subscribing || !walletAddress}
                className={cn(
                  'rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-600',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                )}
              >
                {subscribing ? (subscribeStep ?? 'Processing…') : 'Subscribe with USDT'}
              </button>
            )}
            {!walletAddress && (
              <p className="text-xs text-gray-400">
                {hasWallet === false
                  ? 'Enter your wallet address above to generate payment links.'
                  : 'Connect your wallet above to subscribe.'}
              </p>
            )}
          </>
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
    <div className="app-panel rounded-[28px] p-6 sm:p-7">
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
          <p className="mt-2 break-all font-mono text-xs text-gray-500">{subscription.txHash}</p>
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
        <p className="mt-2 text-sm text-gray-400">
          No on-chain subscription transactions recorded yet.
        </p>
      )}
    </div>
  )
}
