import type {
  BillingActivateCheckoutResponse,
  BillingCheckoutQuoteResponse,
  BillingHostedCheckoutStatusResponse,
  BillingRefundRequestResponse,
  BillingSummaryResponse,
} from '@dotly/types'

export type PlanId = 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS' | 'AGENCY' | 'ENTERPRISE'
export type Duration = 'MONTHLY' | 'SIX_MONTHS' | 'ANNUAL'

export type SubscriptionData = BillingSummaryResponse

export type CreateOrderResponse = BillingCheckoutQuoteResponse

export type ActivateOrderResponse = BillingActivateCheckoutResponse

export type HostedCheckoutStatusResponse = BillingHostedCheckoutStatusResponse

export type RefundRequestResponse = BillingRefundRequestResponse

export interface NoWalletOrder {
  checkoutUrl: string
  amountUsdt: string
  paymentId: string
  chainId: number
  txHash: string | null
  createdAtMs: number
  expiresAtMs: number
  lastStatus: HostedCheckoutStatusResponse['status']
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      isMetaMask?: boolean
    }
  }
}
