'use client'

import { Interface } from 'ethers'
import Link from 'next/link'
import { Suspense, useEffect, useMemo, useState } from 'react'
import type { JSX } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiGet, apiPost } from '@/lib/api'
import {
  ARBITRUM_CHAIN_ID,
  ERC20_APPROVE_SELECTOR,
  ensureWalletChain,
  waitForReceipt,
} from '@/app/(dashboard)/settings/billing/helpers'
import type { ActivateOrderResponse } from '@/app/(dashboard)/settings/billing/types'
import type { BillingHostedCheckoutQuoteResponse } from '@dotly/types'

type HostedCheckoutParams = BillingHostedCheckoutQuoteResponse

function parsePaymentId(searchParams: URLSearchParams): string | null {
  const paymentId = searchParams.get('paymentId')
  return paymentId && /^0x[a-fA-F0-9]{64}$/.test(paymentId) ? paymentId : null
}

function HostedCryptoCheckoutContent(): JSX.Element {
  const router = useRouter()
  const searchParams = useSearchParams()
  const paymentId = useMemo(() => parsePaymentId(searchParams), [searchParams])
  const [params, setParams] = useState<HostedCheckoutParams | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadQuote = async () => {
      if (!paymentId) {
        setError('This crypto checkout link is incomplete or invalid.')
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const quote = await apiGet<BillingHostedCheckoutQuoteResponse>(
          `/billing/checkout/hosted?paymentId=${encodeURIComponent(paymentId)}`,
        )
        if (!cancelled) {
          setParams(quote)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load hosted checkout.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadQuote()

    return () => {
      cancelled = true
    }
  }, [paymentId])

  const handlePay = async () => {
    if (!params) {
      setError('This crypto checkout link is incomplete or invalid.')
      return
    }

    if (!window.ethereum) {
      setError('Open this page inside a web3 wallet browser such as MetaMask or Trust Wallet.')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const accounts = (await window.ethereum.request({
        method: 'eth_requestAccounts',
      })) as string[]
      const connectedWallet = accounts[0]?.toLowerCase()

      if (!connectedWallet) {
        throw new Error('No wallet account was returned.')
      }

      if (connectedWallet !== params.walletAddress.toLowerCase()) {
        throw new Error(
          'Please switch to the same wallet address used when generating this checkout link.',
        )
      }

      await ensureWalletChain(params.chainId)

      setStep('Approving USDT payment…')
      const approveData =
        ERC20_APPROVE_SELECTOR +
        params.paymentVaultAddress.slice(2).padStart(64, '0') +
        BigInt(params.amountRaw).toString(16).padStart(64, '0')

      const approveTxHash = (await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from: params.walletAddress, to: params.usdtTokenAddress, data: approveData }],
      })) as string

      setStep('Waiting for approval confirmation…')
      await waitForReceipt(approveTxHash)

      setStep('Confirming subscription payment…')
      const iface = new Interface([
        'function paySubscription(bytes32 userRef,uint256 amount,uint32 planId,uint8 duration,bytes32 paymentRef,uint64 deadline,bytes signature)',
      ])
      const payData = iface.encodeFunctionData('paySubscription', [
        params.userRef,
        BigInt(params.amountRaw),
        params.planId,
        params.durationId,
        params.paymentRef,
        BigInt(params.deadline),
        params.signature,
      ])

      const payTxHash = (await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from: params.walletAddress, to: params.paymentVaultAddress, data: payData }],
      })) as string

      setTxHash(payTxHash)
      setStep('Waiting for on-chain payment confirmation…')
      await waitForReceipt(payTxHash)

      setStep('Activating your Dotly plan…')

      let activated = false
      for (let i = 0; i < 5; i++) {
        await new Promise((resolve) => setTimeout(resolve, 2_000))
        try {
          const result = await apiPost<ActivateOrderResponse>('/billing/checkout/hosted/activate', {
            paymentId: params.paymentId,
            txHash: payTxHash,
            chainId: params.chainId,
          })
          if (result.status === 'ACTIVE') {
            activated = true
            break
          }
        } catch {
          // Keep polling while the payment is indexing.
        }
      }

      if (!activated) {
        setSuccess(
          'Payment completed. Dotly is finalizing activation now. Return to billing in a moment to confirm.',
        )
      } else {
        setSuccess(
          'Payment confirmed and your plan is active. Billing will reflect this immediately when you return.',
        )
        window.setTimeout(() => {
          router.push(
            `/settings/billing?payment=success&paymentId=${encodeURIComponent(params.paymentId)}`,
          )
        }, 1200)
      }
      setStep(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed.'
      if (/user rejected|cancelled/i.test(message)) {
        setError('The wallet action was cancelled.')
      } else {
        setError(message)
      }
      setStep(null)
    } finally {
      setSubmitting(false)
    }
  }

  const handleManualConfirm = async () => {
    if (!params || !txHash) return

    setSubmitting(true)
    setError(null)
    setSuccess(null)
    setStep('Confirming payment with Dotly…')

    try {
      const result = await apiPost<ActivateOrderResponse>('/billing/checkout/hosted/activate', {
        paymentId: params.paymentId,
        txHash,
        chainId: params.chainId,
      })
      if (result.status === 'ACTIVE') {
        setSuccess('Payment confirmed and your plan is active.')
        window.setTimeout(() => {
          router.push(
            `/settings/billing?payment=success&paymentId=${encodeURIComponent(params.paymentId)}`,
          )
        }, 1200)
      } else {
        setSuccess('Payment was submitted. Dotly is still finalizing activation.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not confirm payment.')
    } finally {
      setSubmitting(false)
      setStep(null)
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-16">
        <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 text-slate-600">
          Loading crypto checkout…
        </div>
      </main>
    )
  }

  if (!params) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-16">
        <div className="w-full rounded-3xl border border-red-200 bg-red-50 p-6 text-red-800">
          {error ?? 'Invalid or incomplete crypto checkout link.'}
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-16">
      <div className="w-full rounded-[32px] border border-indigo-100 bg-white p-6 shadow-[0_20px_60px_-20px_rgba(79,70,229,0.25)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-500">
          Dotly Crypto Checkout
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950">Pay in your wallet browser</h1>
        <p className="mt-2 text-sm text-slate-600">
          This checkout will ask for USDT approval first and then request the subscription payment.
        </p>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p>
            Plan: <span className="font-semibold text-slate-950">{params.plan}</span>
          </p>
          <p className="mt-1">
            Duration: <span className="font-semibold text-slate-950">{params.duration}</span>
          </p>
          <p className="mt-1">
            Amount: <span className="font-semibold text-slate-950">${params.amountUsdt} USDT</span>
          </p>
          <p className="mt-1">
            Network:{' '}
            <span className="font-semibold text-slate-950">
              Arbitrum One ({params.chainId || ARBITRUM_CHAIN_ID})
            </span>
          </p>
          <p className="mt-1 break-all font-mono text-xs text-slate-500">
            Wallet: {params.walletAddress}
          </p>
        </div>

        {step && <div className="mt-4 text-sm font-medium text-indigo-700">{step}</div>}
        {error && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {success}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => void handlePay()}
            disabled={submitting}
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? 'Processing…' : 'Pay now'}
          </button>
          {txHash && (
            <button
              type="button"
              onClick={() => void handleManualConfirm()}
              disabled={submitting}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Confirm payment again
            </button>
          )}
        </div>

        {txHash && (
          <p className="mt-4 break-all rounded-xl bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600">
            Payment tx: {txHash}
          </p>
        )}

        <div className="mt-6 text-sm text-slate-500">
          <Link href="/settings/billing" className="font-medium text-indigo-600 hover:underline">
            Return to billing
          </Link>
        </div>
      </div>
    </main>
  )
}

export default function HostedCryptoCheckoutPage(): JSX.Element {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-16 text-sm text-slate-500">
          Loading crypto checkout…
        </main>
      }
    >
      <HostedCryptoCheckoutContent />
    </Suspense>
  )
}
