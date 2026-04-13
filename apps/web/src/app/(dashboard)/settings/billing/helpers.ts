import type { Duration, PlanId } from './types'

export const PAID_PLANS: PlanId[] = ['STARTER', 'PRO']

export const PLAN_PRICES: Record<PlanId, Record<Duration, number> | null> = {
  FREE: null,
  STARTER: { MONTHLY: 10, SIX_MONTHS: 50, ANNUAL: 99 },
  PRO: { MONTHLY: 20, SIX_MONTHS: 99, ANNUAL: 199 },
  BUSINESS: { MONTHLY: 50, SIX_MONTHS: 275, ANNUAL: 500 },
  AGENCY: { MONTHLY: 100, SIX_MONTHS: 550, ANNUAL: 1000 },
  ENTERPRISE: { MONTHLY: 199, SIX_MONTHS: 1095, ANNUAL: 1990 },
}

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
  TRIALING: 'bg-blue-100 text-blue-700',
  FREE: 'bg-gray-100 text-gray-600',
  PENDING: 'bg-amber-100 text-amber-700',
  PAST_DUE: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
}

export const ERC20_APPROVE_SELECTOR = '0x095ea7b3'

export const BILLING_DURATIONS: Duration[] = ['MONTHLY', 'SIX_MONTHS', 'ANNUAL']

export function buildApproveDeepLink(params: {
  usdtTokenAddress: string
  paymentVaultAddress: string
  amountRaw: bigint
  chainId: number
}): string {
  const { usdtTokenAddress, paymentVaultAddress, amountRaw, chainId } = params

  return (
    `ethereum:${usdtTokenAddress}@${chainId}/approve` +
    `?address=${paymentVaultAddress}` +
    `&uint256=${amountRaw.toString()}`
  )
}

export function buildPayDeepLink(params: {
  paymentVaultAddress: string
  paymentRef: string
  chainId: number
}): string {
  const { paymentVaultAddress, paymentRef, chainId } = params
  const ref = paymentRef.startsWith('0x') ? paymentRef : `0x${paymentRef}`

  return `ethereum:${paymentVaultAddress}@${chainId}/paySubscription?bytes32=${ref}`
}

export function readRefCookie(): string | undefined {
  if (typeof document === 'undefined') return undefined

  const match = document.cookie.match(/(?:^|;\s*)dotly_ref=([^;]+)/)
  return match?.[1]
}

export function parseUsdtAmount(amountStr: string): bigint {
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
