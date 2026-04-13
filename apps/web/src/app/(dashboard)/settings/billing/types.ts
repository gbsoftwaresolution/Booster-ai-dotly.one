import type {
  BillingActivateCheckoutResponse,
  BillingCheckoutQuoteResponse,
  BillingSummaryResponse,
} from '@dotly/types'

export type PlanId = 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS' | 'AGENCY' | 'ENTERPRISE'
export type Duration = 'MONTHLY' | 'SIX_MONTHS' | 'ANNUAL'

export type SubscriptionData = BillingSummaryResponse

export type CreateOrderResponse = BillingCheckoutQuoteResponse

export type ActivateOrderResponse = BillingActivateCheckoutResponse

export interface NoWalletOrder {
  approveLink: string
  payLink: string
  amountUsdt: string
  paymentId: string
  chainId: number
  txHash: string | null
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      isMetaMask?: boolean
    }
  }
}
