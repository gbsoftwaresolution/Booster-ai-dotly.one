import type { CreateOrderResponse, Duration, PlanId } from './types'
import { BILLING_PLAN_PRICES } from '@/lib/billing-plans'
import { getAppUrl } from '@/lib/app-url'

export const PAID_PLANS: PlanId[] = ['STARTER', 'PRO']

export const PLAN_PRICES: Record<PlanId, Record<Duration, number> | null> = BILLING_PLAN_PRICES

export const DURATION_LABEL: Record<Duration, string> = {
  MONTHLY: 'Monthly',
  SIX_MONTHS: '6 Months',
  ANNUAL: 'Annual',
}

export const DURATION_SAVINGS: Record<Duration, string | null> = {
  MONTHLY: null,
  SIX_MONTHS: 'Save 8%',
  ANNUAL: 'Save 17%',
}

export const PLAN_COLORS: Record<PlanId, string> = {
  FREE: 'bg-gray-100 text-gray-700',
  STARTER: 'bg-sky-100 text-sky-700',
  PRO: 'bg-brand-100 text-brand-700',
  BUSINESS: 'bg-purple-100 text-purple-700',
  AGENCY: 'bg-orange-100 text-orange-700',
  ENTERPRISE: 'bg-yellow-100 text-yellow-700',
}

export const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  FREE: 'bg-gray-100 text-gray-600',
  PENDING: 'bg-amber-100 text-amber-700',
  PAST_DUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

export const ERC20_APPROVE_SELECTOR = '0x095ea7b3'
export const ARBITRUM_CHAIN_ID = 42161
const ARBITRUM_CHAIN_ID_HEX = '0xa4b1'

export const BILLING_DURATIONS: Duration[] = ['MONTHLY', 'SIX_MONTHS', 'ANNUAL']

export function buildApproveDeepLink(params: {
  paymentTokenAddress: string
  paymentVaultAddress: string
  amountRaw: bigint
  chainId: number
}): string {
  const { paymentTokenAddress, paymentVaultAddress, amountRaw, chainId } = params

  return (
    `ethereum:${paymentTokenAddress}@${chainId}/approve` +
    `?address=${paymentVaultAddress}` +
    `&uint256=${amountRaw.toString()}`
  )
}

export function buildPayDeepLink(params: { paymentVaultAddress: string; chainId: number }): string {
  const { paymentVaultAddress, chainId } = params
  return `ethereum:${paymentVaultAddress}@${chainId}`
}

export function buildHostedCheckoutUrl(params: { order: CreateOrderResponse }): string {
  const searchParams = new URLSearchParams({ paymentId: params.order.paymentId })

  return `${getAppUrl()}/pay/checkout?${searchParams.toString()}`
}

export function readRefCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined

  const match = document.cookie.match(/(?:^|;\s*)dotly_ref=([^;]+)/)
  return match?.[1]
}

export function parsePaymentAmount(amountStr: string): bigint {
  const [intPart, decPart = ''] = amountStr.split('.')
  const dec = decPart.padEnd(6, '0').slice(0, 6)
  return BigInt(intPart ?? '0') * 1_000_000n + BigInt(dec)
}

export async function waitForReceipt(txHash: string, maxWaitMs = 90_000): Promise<void> {
  const start = Date.now()

  while (Date.now() - start < maxWaitMs) {
    await new Promise((resolve) => setTimeout(resolve, 2_500))
    const receipt = (await window.ethereum?.request({
      method: 'eth_getTransactionReceipt',
      params: [txHash],
    })) as { status: string } | null

    if (receipt?.status === '0x1') return
    if (receipt?.status === '0x0') throw new Error('Payment transaction failed.')
  }

  throw new Error('Transaction receipt timeout — please check your wallet or try again.')
}

function parseWalletChainId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) return value
  if (typeof value === 'bigint') return Number(value)

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    if (/^0x[0-9a-fA-F]+$/.test(trimmed)) return parseInt(trimmed, 16)
    if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10)
  }

  return null
}

async function getWalletChainId(): Promise<number> {
  if (!window.ethereum) {
    throw new Error('A supported payment app is not available in this browser.')
  }

  const chainId = parseWalletChainId(await window.ethereum.request({ method: 'eth_chainId' }))
  if (chainId !== null) return chainId

  const fallbackChainId = parseWalletChainId(
    await window.ethereum.request({ method: 'net_version' }),
  )
  if (fallbackChainId !== null) return fallbackChainId

  throw new Error('Could not determine the connected wallet network.')
}

export async function ensureWalletChain(requiredChainId: number): Promise<number> {
  let currentChainId = await getWalletChainId()
  if (currentChainId === requiredChainId) return currentChainId

  try {
    await window.ethereum?.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: ARBITRUM_CHAIN_ID_HEX }],
    })
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : null
    if (code === 4001) {
      throw new Error('Wallet network switch was cancelled.')
    }
    if (code === 4902) {
      throw new Error(
        'The required payment network is not available in this app. Add it and try again.',
      )
    }
  }

  currentChainId = await getWalletChainId()
  if (currentChainId !== requiredChainId) {
    throw new Error(
      `Please switch your payment app to chain ${requiredChainId}. Currently on ${currentChainId}.`,
    )
  }

  return currentChainId
}

export function formatExpiryDate(date: string | null | undefined): string | null {
  if (!date) return null

  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function getFocusMessage({
  loading,
  currentPlan,
  currentStatus,
  expiryDate,
}: {
  loading: boolean
  currentPlan: PlanId
  currentStatus: string
  expiryDate: string | null
}): string {
  if (loading) return 'Loading subscription and checkout details.'
  if (currentPlan === 'FREE') {
    return 'Upgrade when you are ready to unlock paid features and choose a checkout method.'
  }

  return `${currentPlan} is currently ${currentStatus.toLowerCase()}${expiryDate ? ` until ${expiryDate}` : ''}.`
}

export function formatPlanLabel(plan: PlanId): string {
  return plan.charAt(0) + plan.slice(1).toLowerCase()
}
