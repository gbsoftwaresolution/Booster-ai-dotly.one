import type { BillingSummaryResponse } from '@dotly/types'

export type PlanId = 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS' | 'AGENCY' | 'ENTERPRISE'
export type Duration = 'MONTHLY' | 'SIX_MONTHS' | 'ANNUAL'

export type SubscriptionData = BillingSummaryResponse

export interface CreateOrderResponse {
  orderId: string
  paymentVaultAddress: string
  usdtTokenAddress: string
  amountUsdt: string
  paymentRef: string
  chainId: number
}

export interface ActivateOrderResponse {
  status: 'ACTIVE' | 'PENDING' | string
  plan: PlanId
  currentPeriodEnd: string | null
}

export interface NoWalletOrder {
  approveLink: string
  payLink: string
  amountUsdt: string
  orderId: string
  chainId: number
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      isMetaMask?: boolean
    }
  }
}
