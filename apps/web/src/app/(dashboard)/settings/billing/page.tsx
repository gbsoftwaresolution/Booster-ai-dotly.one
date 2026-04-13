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
  TransactionHistoryCard,
  UpgradePlanCard,
  WalletCard,
} from './components'
import {
  buildApproveDeepLink,
  buildPayDeepLink,
  ERC20_APPROVE_SELECTOR,
  formatExpiryDate,
  getFocusMessage,
  PLAN_PRICES,
  readRefCookie,
  waitForReceipt,
} from './helpers'
import { detectBrowserCountry } from '../helpers'
import type {
  ActivateOrderResponse,
  CreateOrderResponse,
  Duration,
  NoWalletOrder,
  PlanId,
  SubscriptionData,
} from './types'

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
  const [subscribeStep, setSubscribeStep] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [noWalletOrder, setNoWalletOrder] = useState<NoWalletOrder | null>(null)
  const [noWalletActivating, setNoWalletActivating] = useState(false)
  const [detectedCountry, setDetectedCountry] = useState('')

  useEffect(() => {
    setHasWallet(Boolean(window.ethereum && typeof window.ethereum.request === 'function'))
    setDetectedCountry(detectBrowserCountry())
  }, [])

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
        approveLink: buildApproveDeepLink({
          usdtTokenAddress: order.usdtTokenAddress,
          paymentVaultAddress: order.paymentVaultAddress,
          amountRaw: BigInt(order.amountRaw),
          chainId: order.chainId,
        }),
        payLink: buildPayDeepLink({
          paymentVaultAddress: order.paymentVaultAddress,
          chainId: order.chainId,
        }),
        amountUsdt: order.amountUsdt,
        paymentId: order.paymentId,
        chainId: order.chainId,
        txHash: null,
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

      const chainIdHex = (await window.ethereum.request({ method: 'eth_chainId' })) as string
      const chainId = parseInt(chainIdHex, 16)
      if (chainId !== requiredChainId) {
        throw new Error(
          `Please switch your wallet to chain ${requiredChainId} (Arbitrum One). Currently on ${chainId}.`,
        )
      }

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
            noWalletActivating={noWalletActivating}
            walletAddress={walletAddress}
            hasWallet={hasWallet}
            subscribing={subscribing}
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

          <TransactionHistoryCard subscription={subscription} expiryDate={expiryDate} />
        </>
      )}
    </div>
  )
}
