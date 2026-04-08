'use client'

import { useState, useEffect, useCallback } from 'react'
import type { JSX } from 'react'
import { cn } from '@/lib/cn'
import { apiGet, apiPatch, apiPost } from '@/lib/api'
import { getAccessToken } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

type PlanId = 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS' | 'AGENCY' | 'ENTERPRISE'
type Duration = 'MONTHLY' | 'SIX_MONTHS' | 'ANNUAL'

interface SubscriptionData {
  plan: PlanId
  status: 'ACTIVE' | 'CANCELLED' | 'PAST_DUE' | 'TRIALING'
  currentPeriodEnd: string | null
  txHash: string | null
  chainId: number | null
  boosterAiOrderId: string | null
  billingDuration: Duration | null
  amountUsdt: string | null
  user: {
    plan: string
    walletAddress: string | null
  }
}

interface CreateOrderResponse {
  orderId: string
  paymentVaultAddress: string
  usdtTokenAddress: string
  amountUsdt: string
  paymentRef: string
  chainId: number
}

interface ActivateOrderResponse {
  status: 'ACTIVE' | 'PENDING' | string
  plan: PlanId
  currentPeriodEnd: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PAID_PLANS: PlanId[] = ['STARTER', 'PRO', 'BUSINESS', 'AGENCY', 'ENTERPRISE']

const PLAN_PRICES: Record<PlanId, Record<Duration, number> | null> = {
  FREE: null,
  STARTER:    { MONTHLY: 10,  SIX_MONTHS: 55,   ANNUAL: 100  },
  PRO:        { MONTHLY: 20,  SIX_MONTHS: 110,  ANNUAL: 200  },
  BUSINESS:   { MONTHLY: 50,  SIX_MONTHS: 275,  ANNUAL: 500  },
  AGENCY:     { MONTHLY: 100, SIX_MONTHS: 550,  ANNUAL: 1000 },
  ENTERPRISE: { MONTHLY: 199, SIX_MONTHS: 1095, ANNUAL: 1990 },
}

const DURATION_LABEL: Record<Duration, string> = {
  MONTHLY: 'Monthly',
  SIX_MONTHS: '6 Months',
  ANNUAL: 'Annual',
}

const DURATION_SAVINGS: Record<Duration, string | null> = {
  MONTHLY: null,
  SIX_MONTHS: 'Save 8%',
  ANNUAL: 'Save 17%',
}

const PLAN_COLORS: Record<PlanId, string> = {
  FREE: 'bg-gray-100 text-gray-700',
  STARTER: 'bg-sky-100 text-sky-700',
  PRO: 'bg-brand-100 text-brand-700',
  BUSINESS: 'bg-purple-100 text-purple-700',
  AGENCY: 'bg-orange-100 text-orange-700',
  ENTERPRISE: 'bg-yellow-100 text-yellow-700',
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  TRIALING: 'bg-blue-100 text-blue-700',
  PAST_DUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

// USDT ERC-20 approve ABI — minimal
const ERC20_APPROVE_SELECTOR = '0x095ea7b3'

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      isMetaMask?: boolean
    }
  }
}

// ─── EIP-681 deep-link builder ────────────────────────────────────────────────
// Produces a link MetaMask Mobile / Trust Wallet can open directly.
// Format: ethereum:<contractAddress>@<chainId>/functionName?<params>
//
// For USDT approve:
//   ethereum:<usdtAddress>@<chainId>/approve?address=<vault>&uint256=<amount>
// For paySubscription:
//   ethereum:<vaultAddress>@<chainId>/paySubscription?bytes32=<paymentRef>

function buildApproveDeepLink(params: {
  usdtTokenAddress: string
  paymentVaultAddress: string
  amountRaw: bigint
  chainId: number
}): string {
  const { usdtTokenAddress, paymentVaultAddress, amountRaw, chainId } = params
  // EIP-681: ethereum:<address>@<chainId>/<function>?<params>
  return (
    `ethereum:${usdtTokenAddress}@${chainId}/approve` +
    `?address=${paymentVaultAddress}` +
    `&uint256=${amountRaw.toString()}`
  )
}

function buildPayDeepLink(params: {
  paymentVaultAddress: string
  paymentRef: string
  chainId: number
}): string {
  const { paymentVaultAddress, paymentRef, chainId } = params
  const ref = paymentRef.startsWith('0x') ? paymentRef : `0x${paymentRef}`
  return (
    `ethereum:${paymentVaultAddress}@${chainId}/paySubscription` +
    `?bytes32=${ref}`
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readRefCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.match(/(?:^|;\s*)dotly_ref=([^;]+)/)
  return match?.[1]
}

function parseUsdtAmount(amountStr: string): bigint {
  // amountStr is like "20.00" — USDT has 6 decimals
  const [intPart, decPart = ''] = amountStr.split('.')
  const dec = decPart.padEnd(6, '0').slice(0, 6)
  return BigInt(intPart!) * 1_000_000n + BigInt(dec)
}

async function waitForReceipt(txHash: string, maxWaitMs = 90_000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    await new Promise((r) => setTimeout(r, 2_500))
    const receipt = (await window.ethereum!.request({
      method: 'eth_getTransactionReceipt',
      params: [txHash],
    })) as { status: string } | null
    if (receipt?.status === '0x1') return
    if (receipt?.status === '0x0') throw new Error('Transaction was reverted on-chain.')
  }
  throw new Error('Transaction receipt timeout — please check your wallet or try again.')
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BillingSettingsPage(): JSX.Element {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [hasWallet, setHasWallet] = useState<boolean | null>(null) // null = detecting

  const [selectedPlan, setSelectedPlan] = useState<PlanId>('PRO')
  const [selectedDuration, setSelectedDuration] = useState<Duration>('MONTHLY')

  const [connectingWallet, setConnectingWallet] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [subscribeStep, setSubscribeStep] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // No-wallet deep-link state — populated after order creation when no wallet detected
  const [noWalletOrder, setNoWalletOrder] = useState<{
    approveLink: string
    payLink: string
    amountUsdt: string
    orderId: string
    chainId: number
  } | null>(null)
  const [noWalletActivating, setNoWalletActivating] = useState(false)

  // Detect wallet on mount
  useEffect(() => {
    setHasWallet(Boolean(window.ethereum && typeof window.ethereum.request === 'function'))
  }, [])

  // ─── Auth token ───────────────────────────────────────────────────────────

  const getToken = useCallback(async (): Promise<string | null> => {
    try {
      return (await getAccessToken()) ?? null
    } catch {
      return null
    }
  }, [])

  // ─── Fetch subscription ───────────────────────────────────────────────────

  const fetchSubscription = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) { setError('Not authenticated'); return }
      const data = await apiGet<SubscriptionData>('/billing', token)
      setSubscription(data)
      setWalletAddress(data?.user?.walletAddress ?? null)
    } catch {
      setError('Failed to load subscription data.')
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => { void fetchSubscription() }, [fetchSubscription])

  // ─── Connect wallet ───────────────────────────────────────────────────────

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('No wallet detected. Install MetaMask or use the mobile deep-link flow below.')
      return
    }
    setConnectingWallet(true)
    setError(null)
    try {
      const accounts = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[]
      const address = accounts[0]
      if (!address) throw new Error('No account returned')
      setWalletAddress(address)
      const token = await getToken()
      if (token) await apiPatch('/billing/wallet', { walletAddress: address }, token)
      setSuccessMsg('Wallet connected!')
      setTimeout(() => setSuccessMsg(null), 3_000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet.')
    } finally {
      setConnectingWallet(false)
    }
  }

  // ─── Subscribe via BoosterAI PaymentVault ────────────────────────────────

  // No-wallet: create order then show EIP-681 deep-links for MetaMask Mobile
  const handleNoWalletSubscribe = async (walletAddr: string) => {
    setSubscribing(true)
    setError(null)
    setSubscribeStep('Creating order…')
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated.')
      const ref = readRefCookie()
      const order = await apiPost<CreateOrderResponse>('/billing/boosterai/order', {
        plan: selectedPlan,
        duration: selectedDuration,
        walletAddress: walletAddr,
        ...(ref ? { ref } : {}),
      }, token)
      const amountRaw = parseUsdtAmount(order.amountUsdt)
      setNoWalletOrder({
        approveLink: buildApproveDeepLink({
          usdtTokenAddress: order.usdtTokenAddress,
          paymentVaultAddress: order.paymentVaultAddress,
          amountRaw,
          chainId: order.chainId,
        }),
        payLink: buildPayDeepLink({
          paymentVaultAddress: order.paymentVaultAddress,
          paymentRef: order.paymentRef,
          chainId: order.chainId,
        }),
        amountUsdt: order.amountUsdt,
        orderId: order.orderId,
        chainId: order.chainId,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order.')
    } finally {
      setSubscribing(false)
      setSubscribeStep(null)
    }
  }

  // No-wallet: manually trigger activation after user confirms they've paid
  const handleNoWalletActivate = async () => {
    if (!noWalletOrder) return
    setNoWalletActivating(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated.')
      let activated = false
      for (let i = 0; i < 5; i++) {
        await new Promise((r) => setTimeout(r, 2_000))
        try {
          const result = await apiPost<ActivateOrderResponse>(
            '/billing/boosterai/activate',
            { orderId: noWalletOrder.orderId },
            token,
          )
          if (result.status === 'ACTIVE') { activated = true; break }
        } catch { /* keep polling */ }
      }
      if (activated) {
        setSuccessMsg(`Successfully subscribed to ${selectedPlan}!`)
        setNoWalletOrder(null)
        void fetchSubscription()
      } else {
        setSuccessMsg('Payment sent — your plan will activate shortly. Refresh in a moment.')
      }
      setTimeout(() => setSuccessMsg(null), 6_000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Activation check failed.')
    } finally {
      setNoWalletActivating(false)
    }
  }

  const handleSubscribe = async () => {
    if (!walletAddress) { setError('Please connect your wallet first.'); return }
    if (!window.ethereum) { setError('MetaMask is not installed.'); return }

    setSubscribing(true)
    setError(null)
    setSubscribeStep('Creating order…')

    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated.')

      const ref = readRefCookie()

      // ── Step 1: Create BoosterAI order ──────────────────────────────────
      const order = await apiPost<CreateOrderResponse>('/billing/boosterai/order', {
        plan: selectedPlan,
        duration: selectedDuration,
        walletAddress,
        ...(ref ? { ref } : {}),
      }, token)

      const {
        paymentVaultAddress,
        usdtTokenAddress,
        amountUsdt,
        paymentRef,
        chainId: requiredChainId,
      } = order

      // ── Step 2: Verify the wallet is on the correct chain ────────────────
      const chainIdHex = (await window.ethereum.request({ method: 'eth_chainId' })) as string
      const chainId = parseInt(chainIdHex, 16)
      if (chainId !== requiredChainId) {
        throw new Error(
          `Please switch your wallet to chain ${requiredChainId} (Arbitrum One). Currently on ${chainId}.`
        )
      }

      const usdtRaw = parseUsdtAmount(amountUsdt)

      // ── Step 3: Approve USDT spending on PaymentVault ───────────────────
      setSubscribeStep('Approving USDT transfer…')

      // ERC-20 approve(address spender, uint256 amount) = 0x095ea7b3
      const approveData =
        ERC20_APPROVE_SELECTOR +
        paymentVaultAddress.slice(2).padStart(64, '0') +
        usdtRaw.toString(16).padStart(64, '0')

      const approveTxHash = (await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from: walletAddress, to: usdtTokenAddress, data: approveData }],
      })) as string

      setSubscribeStep('Waiting for approval confirmation…')
      await waitForReceipt(approveTxHash)

      // ── Step 4: Call PaymentVault.paySubscription(bytes32 paymentRef) ───
      // Function selector for paySubscription(bytes32): keccak256 first 4 bytes
      // = 0x4d544a74 (pre-computed from BoosterAI's PaymentVault ABI)
      setSubscribeStep('Confirming payment transaction…')
      const payData =
        '0x4d544a74' +
        (paymentRef.startsWith('0x') ? paymentRef.slice(2) : paymentRef).padStart(64, '0')

      const payTxHash = (await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from: walletAddress, to: paymentVaultAddress, data: payData }],
      })) as string

      setSubscribeStep('Waiting for payment confirmation…')
      await waitForReceipt(payTxHash)

      // ── Step 5: Activate subscription on Dotly ───────────────────────────
      setSubscribeStep('Activating subscription…')

      // Poll activate up to 5 times (on-chain indexer may lag slightly)
      let activated = false
      for (let i = 0; i < 5; i++) {
        await new Promise((r) => setTimeout(r, 2_000))
        try {
          const result = await apiPost<ActivateOrderResponse>(
            '/billing/boosterai/activate',
            { orderId: order.orderId },
            token,
          )
          if (result.status === 'ACTIVE') { activated = true; break }
        } catch {
          // Not ready yet — keep polling
        }
      }

      if (!activated) {
        // Still set a partial success — backend will reconcile async
        setSuccessMsg(
          `Payment sent! Your ${selectedPlan} plan will be activated shortly. Refresh in a moment.`
        )
      } else {
        setSuccessMsg(`Successfully subscribed to ${selectedPlan}!`)
      }
      setTimeout(() => setSuccessMsg(null), 6_000)
      void fetchSubscription()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transaction failed.'
      if (/user rejected|User rejected/i.test(message)) {
        setError('Transaction was cancelled.')
      } else {
        setError(message)
      }
    } finally {
      setSubscribing(false)
      setSubscribeStep(null)
    }
  }

  // ─── Derived state ────────────────────────────────────────────────────────

  const currentPlan = subscription?.plan ?? 'FREE'
  const currentStatus = subscription?.status ?? 'TRIALING'
  const expiryDate = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null

  const selectedPrice = PLAN_PRICES[selectedPlan]?.[selectedDuration]

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your subscription and payment method.</p>
      </div>

      {successMsg && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {successMsg}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-32 rounded bg-gray-200" />
            <div className="h-4 w-48 rounded bg-gray-200" />
          </div>
        </div>
      ) : (
        <>
          {/* Current plan */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
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
                  {DURATION_LABEL[subscription.billingDuration]}
                </span>
              )}
            </div>
            {expiryDate && (
              <p className="mt-3 text-sm text-gray-500">
                Current period ends:{' '}
                <span className="font-medium text-gray-700">{expiryDate}</span>
              </p>
            )}
            {subscription?.amountUsdt && (
              <p className="mt-1 text-sm text-gray-500">
                Amount paid:{' '}
                <span className="font-medium text-gray-700">${subscription.amountUsdt} USDT</span>
              </p>
            )}
            {subscription?.boosterAiOrderId && (
              <p className="mt-1 text-xs text-gray-400 font-mono">
                Order: {subscription.boosterAiOrderId}
              </p>
            )}
            {currentPlan === 'FREE' && (
              <div className="mt-4">
                <a
                  href="#upgrade"
                  className="inline-block rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
                >
                  Upgrade your plan
                </a>
              </div>
            )}
          </div>

          {/* Web3 Wallet */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
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
                  <button
                    type="button"
                    onClick={() => void connectWallet()}
                    className="text-xs text-brand-500 hover:underline"
                  >
                    Change
                  </button>
                </div>
              ) : hasWallet === false ? (
                /* No wallet in this browser — show mobile deep-link path */
                <div className="space-y-3">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    No wallet detected in this browser. You can still subscribe using MetaMask Mobile — enter your wallet address below to generate payment links, then open them in your wallet app.
                  </div>
                  <div className="flex gap-2 items-end flex-wrap">
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Your wallet address</label>
                      <input
                        type="text"
                        placeholder="0x…"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        onChange={(e) => setWalletAddress(e.target.value.trim() || null)}
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
                  onClick={() => void connectWallet()}
                  disabled={connectingWallet || hasWallet === null}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <span>&#129422;</span>
                  {connectingWallet ? 'Connecting…' : hasWallet === null ? 'Detecting wallet…' : 'Connect Wallet'}
                </button>
              )}
            </div>
          </div>

          {/* Upgrade section */}
          {currentPlan !== 'ENTERPRISE' && (
            <div id="upgrade" className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-base font-semibold text-gray-900">Upgrade Plan</h2>
              <p className="mt-1 text-sm text-gray-500">
                Pay with USDT. Your wallet signs the transaction — your private key stays private.
              </p>

              <div className="mt-5 space-y-5">
                {/* Plan selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Select plan
                  </label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {PAID_PLANS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setSelectedPlan(p)}
                        className={cn(
                          'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                          selectedPlan === p
                            ? 'border-brand-500 bg-brand-50 text-brand-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300',
                        )}
                      >
                        {p.charAt(0) + p.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Billing period
                  </label>
                  <div className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 p-1">
                    {(['MONTHLY', 'SIX_MONTHS', 'ANNUAL'] as Duration[]).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setSelectedDuration(d)}
                        className={cn(
                          'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
                          selectedDuration === d
                            ? 'bg-white shadow text-gray-900'
                            : 'text-gray-500 hover:text-gray-700',
                        )}
                      >
                        {DURATION_LABEL[d]}
                        {DURATION_SAVINGS[d] && (
                          <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700">
                            {DURATION_SAVINGS[d]}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
                  <p className="font-medium text-gray-800">Transaction summary</p>
                  <p className="mt-1">
                    Plan:{' '}
                    <span className="font-semibold text-gray-900">
                      {selectedPlan.charAt(0) + selectedPlan.slice(1).toLowerCase()}
                    </span>
                  </p>
                  <p>
                    Duration:{' '}
                    <span className="font-semibold text-gray-900">{DURATION_LABEL[selectedDuration]}</span>
                  </p>
                  <p>
                    Amount:{' '}
                    <span className="font-semibold text-gray-900">
                      ${selectedPrice ?? '—'} USDT
                    </span>
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    Network: Arbitrum One (chain 42161). You will approve USDT spending, then
                    confirm the payment transaction in your wallet.
                  </p>
                </div>

                {subscribeStep && (
                  <div className="flex items-center gap-2 text-sm text-brand-600">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    {subscribeStep}
                  </div>
                )}

                {/* No-wallet deep-link result */}
                {noWalletOrder && (
                  <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <p className="text-sm font-semibold text-blue-900">
                      Two-step payment via MetaMask Mobile
                    </p>
                    <p className="text-xs text-blue-700">
                      Open each link in your MetaMask Mobile or Trust Wallet browser in order.
                      Amount: <strong>${noWalletOrder.amountUsdt} USDT</strong> on chain {noWalletOrder.chainId}.
                    </p>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs font-medium text-blue-800 mb-1">Step 1 — Approve USDT spending</p>
                        <a
                          href={noWalletOrder.approveLink}
                          className="block break-all rounded-md border border-blue-300 bg-white px-3 py-2 text-xs font-mono text-blue-700 hover:bg-blue-50"
                        >
                          {noWalletOrder.approveLink}
                        </a>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-blue-800 mb-1">Step 2 — Confirm payment</p>
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
                      onClick={() => void handleNoWalletActivate()}
                      disabled={noWalletActivating}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {noWalletActivating ? 'Checking…' : "I've completed both transactions — activate my plan"}
                    </button>
                  </div>
                )}

                {!noWalletOrder && (
                  <>
                    {hasWallet === false && walletAddress ? (
                      /* No browser wallet but address entered manually — use deep-link flow */
                      <button
                        type="button"
                        onClick={() => void handleNoWalletSubscribe(walletAddress)}
                        disabled={subscribing}
                        className={cn(
                          'rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors',
                          'bg-brand-500 hover:bg-brand-600',
                          'disabled:cursor-not-allowed disabled:opacity-50',
                        )}
                      >
                        {subscribing ? 'Creating order…' : 'Generate payment links'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleSubscribe()}
                        disabled={subscribing || !walletAddress}
                        className={cn(
                          'rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors',
                          'bg-brand-500 hover:bg-brand-600',
                          'disabled:cursor-not-allowed disabled:opacity-50',
                        )}
                      >
                        {subscribing ? subscribeStep ?? 'Processing…' : 'Subscribe with USDT'}
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
          )}

          {/* Transaction history */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900">Transaction History</h2>
            {subscription?.txHash ? (
              <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
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
                  className="mt-3 inline-block text-brand-500 hover:underline"
                >
                  View on Arbiscan
                </a>
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-400">
                No on-chain subscription transactions recorded yet.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
