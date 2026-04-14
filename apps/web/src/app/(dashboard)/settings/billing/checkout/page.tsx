'use client'

import { useState, useEffect, useCallback } from 'react'
import type { JSX } from 'react'
import { Interface } from 'ethers'
import { useSearchParams } from 'next/navigation'
import { apiGet, apiPatch, apiPost } from '@/lib/api'
import { getAccessToken } from '@/lib/supabase/client'
import {
  BillingFeedback,
  BillingHero,
  BillingLoadingState,
  CurrentPlanCard,
  RefundCard,
  TransactionHistoryCard,
  UpgradePlanCard,
  WalletCard,
} from '../components'
import {
  ensureWalletChain,
  buildHostedCheckoutUrl,
  ERC20_APPROVE_SELECTOR,
  formatExpiryDate,
  getFocusMessage,
  PLAN_PRICES,
  readRefCookie,
  waitForReceipt,
} from '../helpers'
import { detectBrowserCountry } from '../../helpers'
import type {
  ActivateOrderResponse,
  CreateOrderResponse,
  Duration,
  HostedCheckoutStatusResponse,
  NoWalletOrder,
  PlanId,
  RefundRequestResponse,
  SubscriptionData,
} from '../types'

const HOSTED_LINK_TTL_MS = 5 * 60 * 1000
const HOSTED_LINK_POLL_MS = 10 * 1000

export default function BillingSettingsPage(): JSX.Element {
  const searchParams = useSearchParams()
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [hasWallet, setHasWallet] = useState<boolean | null>(null) // null = detecting

  const [selectedPlan, setSelectedPlan] = useState<PlanId>('PRO')
  const [selectedDuration, setSelectedDuration] = useState<Duration>('MONTHLY')

  const [connectingWallet, setConnectingWallet] = useState(false)
  const [subscribing, setSubscribing] = useState(false)
  const [refunding, setRefunding] = useState(false)
  const [requestingManualRefund, setRequestingManualRefund] = useState(false)
  const [subscribeStep, setSubscribeStep] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())

  const [noWalletOrder, setNoWalletOrder] = useState<NoWalletOrder | null>(null)
  const [noWalletActivating, setNoWalletActivating] = useState(false)
  const [detectedCountry, setDetectedCountry] = useState('')

  useEffect(() => {
    setHasWallet(Boolean(window.ethereum && typeof window.ethereum.request === 'function'))
    setDetectedCountry(detectBrowserCountry())
  }, [])

  useEffect(() => {
    if (!noWalletOrder) return

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [noWalletOrder])

  useEffect(() => {
    const planParam = searchParams.get('plan')
    const durationParam = searchParams.get('duration')

    if (planParam === 'STARTER' || planParam === 'PRO') setSelectedPlan(planParam)
    if (
      durationParam === 'MONTHLY' ||
      durationParam === 'SIX_MONTHS' ||
      durationParam === 'ANNUAL'
    ) {
      setSelectedDuration(durationParam)
    }
  }, [searchParams])

  const getToken = useCallback(async (): Promise<string | null> => {
    try {
      return (await getAccessToken()) ?? null
    } catch {
      return null
    }
  }, [])

  const fetchSubscription = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) {
        setError('Not authenticated')
        return
      }
      const query = detectedCountry ? `?countryCode=${encodeURIComponent(detectedCountry)}` : ''
      const data = await apiGet<SubscriptionData>(`/billing${query}`, token)
      setSubscription(data)
      setWalletAddress(data?.walletAddress ?? null)
    } catch {
      setError('Failed to load subscription data.')
    } finally {
      setLoading(false)
    }
  }, [detectedCountry, getToken])

  useEffect(() => {
    void fetchSubscription()
  }, [fetchSubscription])

  useEffect(() => {
    if (!noWalletOrder) return

    let cancelled = false

    const checkStatus = async () => {
      try {
        const status = await apiGet<HostedCheckoutStatusResponse>(
          `/billing/checkout/hosted/status?paymentId=${encodeURIComponent(noWalletOrder.paymentId)}`,
        )

        if (cancelled) return

        setNoWalletOrder((current) =>
          current && current.paymentId === noWalletOrder.paymentId
            ? { ...current, lastStatus: status.status, txHash: current.txHash ?? status.txHash }
            : current,
        )

        if (status.activated || status.status === 'ACTIVE') {
          setSuccessMsg('Crypto payment confirmed and your plan is active.')
          setTimeout(() => setSuccessMsg(null), 6_000)
          setNoWalletOrder(null)
          void fetchSubscription()
          return
        }

        if (status.paid && status.txHash) {
          const token = await getToken()
          if (!token || cancelled) return

          try {
            const activated = await apiPost<ActivateOrderResponse>(
              '/billing/checkout/activate',
              {
                paymentId: noWalletOrder.paymentId,
                txHash: status.txHash,
                chainId: noWalletOrder.chainId,
              },
              token,
            )

            if (cancelled) return

            if (activated.status === 'ACTIVE') {
              setSuccessMsg('Crypto payment confirmed and your plan is active.')
              setTimeout(() => setSuccessMsg(null), 6_000)
              setNoWalletOrder(null)
              void fetchSubscription()
              return
            }
          } catch {
            // Keep polling until activation becomes available.
          }
        }

        if (Date.now() >= noWalletOrder.expiresAtMs && status.status === 'PENDING') {
          setNoWalletOrder((current) =>
            current && current.paymentId === noWalletOrder.paymentId
              ? { ...current, lastStatus: 'EXPIRED' }
              : current,
          )
        }
      } catch {
        // Keep the manual fallback available on transient failures.
      }
    }

    void checkStatus()
    const intervalId = window.setInterval(() => {
      void checkStatus()
    }, HOSTED_LINK_POLL_MS)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [fetchSubscription, getToken, noWalletOrder])

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('No wallet detected. Install MetaMask or use the mobile deep-link flow below.')
      return
    }
    setConnectingWallet(true)
    setError(null)
    try {
      const accounts = (await window.ethereum.request({
        method: 'eth_requestAccounts',
      })) as string[]
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

  const handleNoWalletSubscribe = async (walletAddr: string) => {
    setSubscribing(true)
    setError(null)
    setSubscribeStep('Preparing crypto checkout…')
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated.')
      const ref = readRefCookie()
      const order = await apiPost<CreateOrderResponse>(
        '/billing/checkout/order',
        {
          plan: selectedPlan,
          duration: selectedDuration,
          walletAddress: walletAddr,
          ...(detectedCountry ? { countryCode: detectedCountry } : {}),
          ...(ref ? { ref } : {}),
        },
        token,
      )
      setNoWalletOrder({
        checkoutUrl: buildHostedCheckoutUrl({ order }),
        amountUsdt: order.amountUsdt,
        paymentId: order.paymentId,
        chainId: order.chainId,
        txHash: null,
        createdAtMs: Date.now(),
        expiresAtMs: Date.now() + HOSTED_LINK_TTL_MS,
        lastStatus: 'PENDING',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order.')
    } finally {
      setSubscribing(false)
      setSubscribeStep(null)
    }
  }

  const handleNoWalletActivate = async () => {
    if (!noWalletOrder) return
    setNoWalletActivating(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated.')
      if (!noWalletOrder.txHash) {
        throw new Error('Paste the payment transaction hash from your wallet app first.')
      }
      let activated = false
      for (let i = 0; i < 5; i++) {
        await new Promise((r) => setTimeout(r, 2_000))
        try {
          const result = await apiPost<ActivateOrderResponse>(
            '/billing/checkout/activate',
            {
              paymentId: noWalletOrder.paymentId,
              txHash: noWalletOrder.txHash,
              chainId: noWalletOrder.chainId,
            },
            token,
          )
          if (result.status === 'ACTIVE') {
            activated = true
            break
          }
        } catch {
          /* keep polling */
        }
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
    if (!walletAddress) {
      setError('Please connect your wallet first.')
      return
    }
    if (!window.ethereum) {
      setError('MetaMask is not installed.')
      return
    }

    setSubscribing(true)
    setError(null)
    setSubscribeStep('Preparing crypto checkout…')

    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated.')

      const ref = readRefCookie()

      const order = await apiPost<CreateOrderResponse>(
        '/billing/checkout/order',
        {
          plan: selectedPlan,
          duration: selectedDuration,
          walletAddress,
          ...(detectedCountry ? { countryCode: detectedCountry } : {}),
          ...(ref ? { ref } : {}),
        },
        token,
      )

      const {
        paymentVaultAddress,
        usdtTokenAddress,
        amountUsdt,
        amountRaw,
        userRef,
        planId,
        durationId,
        paymentRef,
        paymentId,
        deadline,
        signature,
        chainId: requiredChainId,
      } = order

      await ensureWalletChain(requiredChainId)

      setSubscribeStep('Approving crypto payment…')

      const approveData =
        ERC20_APPROVE_SELECTOR +
        paymentVaultAddress.slice(2).padStart(64, '0') +
        BigInt(amountRaw).toString(16).padStart(64, '0')

      const approveTxHash = (await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from: walletAddress, to: usdtTokenAddress, data: approveData }],
      })) as string

      setSubscribeStep('Waiting for wallet approval…')
      await waitForReceipt(approveTxHash)

      setSubscribeStep('Confirming payment…')
      const iface = new Interface([
        'function paySubscription(bytes32 userRef,uint256 amount,uint32 planId,uint8 duration,bytes32 paymentRef,uint64 deadline,bytes signature)',
      ])
      const payData = iface.encodeFunctionData('paySubscription', [
        userRef,
        BigInt(amountRaw),
        planId,
        durationId,
        paymentRef,
        BigInt(deadline),
        signature,
      ])

      const payTxHash = (await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from: walletAddress, to: paymentVaultAddress, data: payData }],
      })) as string

      setSubscribeStep('Waiting for payment confirmation…')
      await waitForReceipt(payTxHash)

      setSubscribeStep('Activating subscription…')

      let activated = false
      for (let i = 0; i < 5; i++) {
        await new Promise((r) => setTimeout(r, 2_000))
        try {
          const result = await apiPost<ActivateOrderResponse>(
            '/billing/checkout/activate',
            { paymentId, txHash: payTxHash, chainId: requiredChainId },
            token,
          )
          if (result.status === 'ACTIVE') {
            activated = true
            break
          }
        } catch {
          // Not ready yet — keep polling
        }
      }

      if (!activated) {
        setSuccessMsg(
          `Payment sent! Your ${selectedPlan} plan will be activated shortly. Refresh in a moment.`,
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

  const handleRequestRefund = async () => {
    const refund = subscription?.refund

    if (!refund?.canSelfRefund || !refund.paymentId || !refund.paymentVaultAddress) {
      setError('This payment is not currently eligible for a self-serve refund.')
      return
    }
    if (!walletAddress) {
      setError('Connect the original paying wallet before requesting a refund.')
      return
    }
    if (!window.ethereum) {
      setError('MetaMask is not installed.')
      return
    }

    setRefunding(true)
    setError(null)

    try {
      await ensureWalletChain(subscription?.chainId ?? 42161)

      const iface = new Interface(['function requestRefund(bytes32 paymentId)'])
      const data = iface.encodeFunctionData('requestRefund', [refund.paymentId])

      const txHash = (await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{ from: walletAddress, to: refund.paymentVaultAddress, data }],
      })) as string

      await waitForReceipt(txHash)
      await fetchSubscription()
      setSuccessMsg('Refund confirmed on chain and billing status has been refreshed.')
      setTimeout(() => setSuccessMsg(null), 6_000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Refund transaction failed.'
      if (/user rejected|User rejected/i.test(message)) {
        setError('Refund transaction was cancelled.')
      } else {
        setError(message)
      }
    } finally {
      setRefunding(false)
    }
  }

  const handleRequestManualRefund = async () => {
    setRequestingManualRefund(true)
    setError(null)

    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated.')

      const result = await apiPost<RefundRequestResponse>('/billing/refund/request', {}, token)
      await fetchSubscription()
      setSuccessMsg(
        result.alreadyRequested
          ? `Manual refund review was already requested on ${new Date(result.requestedAt).toLocaleString('en-US')}.`
          : 'Manual refund review has been recorded for this payment.',
      )
      setTimeout(() => setSuccessMsg(null), 6_000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not request manual refund review.')
    } finally {
      setRequestingManualRefund(false)
    }
  }

  const currentPlan = (subscription?.plan as PlanId | undefined) ?? 'FREE'
  const currentStatus = subscription?.status ?? 'FREE'
  const expiryDate = formatExpiryDate(subscription?.currentPeriodEnd)

  const selectedPrice = PLAN_PRICES[selectedPlan]?.[selectedDuration]
  const focusMessage = getFocusMessage({ loading, currentPlan, currentStatus, expiryDate })
  const cryptoBlocked = subscription?.cryptoBlocked ?? false
  const billingCountry = subscription?.billingCountry ?? null

  return (
    <div className="space-y-8 sm:space-y-12 max-w-6xl mx-auto w-full">
      <BillingHero
        currentPlan={currentPlan}
        currentStatus={currentStatus}
        walletAddress={walletAddress}
        hasWallet={hasWallet}
        selectedPrice={selectedPrice}
        selectedPlan={selectedPlan}
        selectedDuration={selectedDuration}
        expiryDate={expiryDate}
        focusMessage={focusMessage}
        loading={loading}
        cryptoBlocked={cryptoBlocked}
        billingCountry={billingCountry}
      />

      <BillingFeedback successMsg={successMsg} error={error} />

      {loading ? (
        <BillingLoadingState />
      ) : (
        <>
          <CurrentPlanCard
            currentPlan={currentPlan}
            currentStatus={currentStatus}
            subscription={subscription}
            expiryDate={expiryDate}
          />

          <WalletCard
            walletAddress={walletAddress}
            hasWallet={hasWallet}
            connectingWallet={connectingWallet}
            onConnectWallet={() => void connectWallet()}
            onManualWalletChange={(value) => setWalletAddress(value.trim() || null)}
            cryptoBlocked={cryptoBlocked}
            billingCountry={billingCountry}
          />

          <UpgradePlanCard
            currentPlan={currentPlan}
            selectedPlan={selectedPlan}
            selectedDuration={selectedDuration}
            selectedPrice={selectedPrice}
            subscribeStep={subscribeStep}
            noWalletOrder={noWalletOrder}
            nowMs={nowMs}
            noWalletActivating={noWalletActivating}
            walletAddress={walletAddress}
            hasWallet={hasWallet}
            subscribing={subscribing}
            onConnectWallet={() => void connectWallet()}
            onSelectPlan={setSelectedPlan}
            onSelectDuration={setSelectedDuration}
            onActivateNoWallet={() => void handleNoWalletActivate()}
            onNoWalletTxHashChange={(value) =>
              setNoWalletOrder((current) =>
                current ? { ...current, txHash: value.trim() || null } : current,
              )
            }
            onGeneratePaymentLinks={() => {
              if (!walletAddress) return
              void handleNoWalletSubscribe(walletAddress)
            }}
            onSubscribe={() => void handleSubscribe()}
            cryptoBlocked={cryptoBlocked}
            billingCountry={billingCountry}
          />

          <RefundCard
            subscription={subscription}
            refunding={refunding}
            requestingManualReview={requestingManualRefund}
            onRequestRefund={() => void handleRequestRefund()}
            onRequestManualReview={() => void handleRequestManualRefund()}
          />

          <TransactionHistoryCard subscription={subscription} expiryDate={expiryDate} />
        </>
      )}
    </div>
  )
}
