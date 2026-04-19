'use client'

import { useState } from 'react'
import { Interface } from 'ethers'
import type { CardServiceOffer } from '@dotly/types'
import { getPublicApiUrl } from '@/lib/public-env'
import {
  ARBITRUM_CHAIN_ID,
  ensureWalletChain,
  waitForReceipt,
} from '@/app/(dashboard)/settings/billing/helpers'

const API_URL = getPublicApiUrl()

interface ServiceCheckoutIntentResponse {
  paymentId: string
  serviceId: string
  serviceName: string
  amountUsdt: string
  amountRaw: string
  tokenAddress: string
  recipientAddress: string
  chainId: number
}

export function ServiceCheckoutSheet({
  cardHandle,
  service,
  source = 'card_public_page',
  onClose,
  onAnalytics,
}: {
  cardHandle: string
  service: CardServiceOffer
  source?: string
  onClose: () => void
  onAnalytics: (type: 'CLICK' | 'SAVE', metadata: Record<string, unknown>) => void
}) {
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  async function handlePay() {
    if (!window.ethereum) {
      setError('Open this page in a supported browser to complete payment.')
      return
    }

    const trimmedName = customerName.trim()
    const trimmedEmail = customerEmail.trim().toLowerCase()
    if (!trimmedName || !trimmedEmail) {
      setError('Name and email are required before checkout.')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const accounts = (await window.ethereum.request({
        method: 'eth_requestAccounts',
      })) as string[]
      const walletAddress = accounts[0]
      if (!walletAddress) throw new Error('No wallet account was returned.')

      setStep('Preparing checkout…')
      const intent = await fetch(`${API_URL}/public/cards/${cardHandle}/service-checkout-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: service.id,
          customerName: trimmedName,
          customerEmail: trimmedEmail,
          walletAddress,
          notes: notes.trim() || undefined,
        }),
      }).then(async (res) => {
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as Record<string, unknown>
          throw new Error(
            typeof err['message'] === 'string' ? err['message'] : `Error ${res.status}`,
          )
        }
        return (await res.json()) as ServiceCheckoutIntentResponse
      })

      await ensureWalletChain(intent.chainId || ARBITRUM_CHAIN_ID)
      setStep('Sending payment…')

      const iface = new Interface(['function transfer(address to,uint256 value)'])
      const transferData = iface.encodeFunctionData('transfer', [
        intent.recipientAddress,
        BigInt(intent.amountRaw),
      ])

      const paymentTxHash = (await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from: walletAddress, to: intent.tokenAddress, data: transferData }],
      })) as string

      setTxHash(paymentTxHash)
      setStep('Waiting for payment confirmation…')
      await waitForReceipt(paymentTxHash)

      setStep('Verifying payment with Dotly…')
      const activateRes = await fetch(
        `${API_URL}/public/cards/${cardHandle}/service-checkout-activate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId: intent.paymentId, txHash: paymentTxHash }),
        },
      )
      if (!activateRes.ok) {
        const err = (await activateRes.json().catch(() => ({}))) as Record<string, unknown>
        throw new Error(
          typeof err['message'] === 'string' ? err['message'] : `Error ${activateRes.status}`,
        )
      }

      onAnalytics('SAVE', {
        surface: 'service_checkout',
        action: 'service_checkout_completed',
        source,
        status: service.id,
        offerId: service.id,
        amount: Number(intent.amountUsdt),
        currency: 'PAYMENT',
      })
      onAnalytics('SAVE', {
        surface: 'service_checkout',
        action: 'payment_completed',
        source,
        status: service.id,
        offerId: service.id,
        amount: Number(intent.amountUsdt),
        currency: 'PAYMENT',
      })
      setSuccess(
        `Payment received for ${intent.serviceName}. The seller can now fulfill your order.`,
      )
      setStep(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Service checkout failed.'
      setError(
        /user rejected|cancelled/i.test(message) ? 'The wallet action was cancelled.' : message,
      )
      setStep(null)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-5 shadow-2xl"
        style={{ maxWidth: 520, margin: '0 auto' }}
      >
        <div className="mb-4 h-1 w-10 rounded-full bg-gray-200 mx-auto" />
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-500">
              Service checkout
            </p>
            <h3 className="mt-2 text-xl font-bold text-slate-950">{service.name}</h3>
            {service.description && (
              <p className="mt-1 text-sm text-slate-500">{service.description}</p>
            )}
            <p className="mt-2 text-sm font-semibold text-slate-900">{service.priceUsdt}</p>
          </div>

          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Your full name"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
          />
          <input
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder="Your email"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
          />
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes for the seller"
            className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
          />

          {step && <div className="text-sm font-medium text-indigo-700">{step}</div>}
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {success}
            </div>
          )}
          {txHash && (
            <p className="break-all rounded-xl bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600">
              Payment tx: {txHash}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => void handlePay()}
              disabled={submitting}
              className="flex-1 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? 'Processing…' : `Pay ${service.priceUsdt}`}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
