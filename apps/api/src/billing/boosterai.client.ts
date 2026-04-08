import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Plan, BillingDuration } from '@dotly/types'

// ─── Pricing table (USDT, exact amounts) ─────────────────────────────────────
// Tier        | Monthly | 6 Months | Annual
// STARTER     |  10.00  |  55.00   | 100.00
// PRO         |  20.00  | 110.00   | 200.00
// BUSINESS    |  50.00  | 275.00   | 500.00
// AGENCY      | 100.00  | 550.00   | 1000.00
// ENTERPRISE  | 199.00  | 1095.00  | 1990.00

export const PLAN_PRICING: Record<string, Record<BillingDuration, string>> = {
  [Plan.STARTER]: {
    [BillingDuration.MONTHLY]:    '10.00',
    [BillingDuration.SIX_MONTHS]: '55.00',
    [BillingDuration.ANNUAL]:     '100.00',
  },
  [Plan.PRO]: {
    [BillingDuration.MONTHLY]:    '20.00',
    [BillingDuration.SIX_MONTHS]: '110.00',
    [BillingDuration.ANNUAL]:     '200.00',
  },
  [Plan.BUSINESS]: {
    [BillingDuration.MONTHLY]:    '50.00',
    [BillingDuration.SIX_MONTHS]: '275.00',
    [BillingDuration.ANNUAL]:     '500.00',
  },
  [Plan.AGENCY]: {
    [BillingDuration.MONTHLY]:    '100.00',
    [BillingDuration.SIX_MONTHS]: '550.00',
    [BillingDuration.ANNUAL]:     '1000.00',
  },
  [Plan.ENTERPRISE]: {
    [BillingDuration.MONTHLY]:    '199.00',
    [BillingDuration.SIX_MONTHS]: '1095.00',
    [BillingDuration.ANNUAL]:     '1990.00',
  },
}

// Duration → number of days (used to compute currentPeriodEnd)
export const DURATION_DAYS: Record<BillingDuration, number> = {
  [BillingDuration.MONTHLY]:    30,
  [BillingDuration.SIX_MONTHS]: 183,
  [BillingDuration.ANNUAL]:     365,
}

// ─── BoosterAI response shapes ────────────────────────────────────────────────

export interface BoosterAiCreateOrderResponse {
  orderId: string
  paymentVaultAddress: string
  usdtTokenAddress: string
  amountUsdt: string
  paymentRef: string
  chainId: number
}

export interface BoosterAiOrderStatusResponse {
  orderId: string
  orderStatus: string   // e.g. 'PENDING' | 'FINALIZED_ONCHAIN' | 'REFUNDED_ONCHAIN'
  entitlementStatus: string
  partnerId: string | null
  planId: number
  amountUsdt: string
  paidAt: string | null
  finalizedAt: string | null
  refundUntil: string | null
}

// ─── Client ───────────────────────────────────────────────────────────────────

@Injectable()
export class BoosterAiClient {
  private readonly logger = new Logger(BoosterAiClient.name)

  /** planId lookup — defaults match BoosterAI's plan catalogue (1-5) */
  private readonly planIds: Record<string, number>

  private readonly baseUrl: string
  private readonly apiKey: string

  constructor(private config: ConfigService) {
    this.baseUrl = config.get<string>('BOOSTERAI_API_URL') ?? 'https://api.boosterai.space'
    this.apiKey  = config.get<string>('BOOSTERAI_INTERNAL_API_KEY') ?? ''

    this.planIds = {
      [Plan.STARTER]:    parseInt(config.get<string>('BOOSTERAI_PLAN_ID_STARTER')    ?? '1', 10),
      [Plan.PRO]:        parseInt(config.get<string>('BOOSTERAI_PLAN_ID_PRO')        ?? '2', 10),
      [Plan.BUSINESS]:   parseInt(config.get<string>('BOOSTERAI_PLAN_ID_BUSINESS')   ?? '3', 10),
      [Plan.AGENCY]:     parseInt(config.get<string>('BOOSTERAI_PLAN_ID_AGENCY')     ?? '4', 10),
      [Plan.ENTERPRISE]: parseInt(config.get<string>('BOOSTERAI_PLAN_ID_ENTERPRISE') ?? '5', 10),
    }
  }

  getPlanId(plan: Plan): number {
    const id = this.planIds[plan]
    if (!id) throw new Error(`No BoosterAI planId configured for plan ${plan}`)
    return id
  }

  getAmountUsdt(plan: Plan, duration: BillingDuration): string {
    const price = PLAN_PRICING[plan]?.[duration]
    if (!price) throw new Error(`No price configured for plan ${plan} / duration ${duration}`)
    return price
  }

  /**
   * Create an order on BoosterAI — returns PaymentVault parameters
   * that the frontend uses to call paySubscription() on-chain.
   */
  async createOrder(params: {
    plan: Plan
    duration: BillingDuration
    walletAddress: string
    partnerCode?: string
    countryCode?: string
  }): Promise<BoosterAiCreateOrderResponse> {
    const planId      = this.getPlanId(params.plan)
    const amountUsdt  = this.getAmountUsdt(params.plan, params.duration)
    const countryCode = params.countryCode ?? this.config.get<string>('BOOSTERAI_COUNTRY_CODE') ?? 'US'

    const body: Record<string, unknown> = {
      planId,
      payerWallet:  params.walletAddress,
      amountUsdt,
      rail: 'CRYPTO',
      countryCode,
      // Pass billing duration as metadata so BoosterAI can record it
      meta: { billingDuration: params.duration },
    }
    if (params.partnerCode) body.partnerCode = params.partnerCode

    const res = await this.fetch<BoosterAiCreateOrderResponse>('POST', '/v1/orders', body)
    return res
  }

  /**
   * Poll BoosterAI for the status of a previously created order.
   * Uses the internal Dotly endpoint protected by x-dotly-api-key.
   */
  async getOrderStatus(orderId: string): Promise<BoosterAiOrderStatusResponse> {
    return this.fetch<BoosterAiOrderStatusResponse>(
      'GET',
      `/v1/internal/dotly/orders/${orderId}`,
      undefined,
      true, // internal — use x-dotly-api-key header
    )
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async fetch<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    internal = false,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }

    if (internal) {
      headers['x-dotly-api-key'] = this.apiKey
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15_000)

    try {
      const res = await globalThis.fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      const json = await res.json() as unknown

      if (!res.ok) {
        const msg = (json as any)?.error?.message ?? `BoosterAI responded with ${res.status}`
        this.logger.error(`BoosterAI ${method} ${path} failed: ${msg}`)
        throw new Error(msg)
      }

      return json as T
    } catch (err) {
      if ((err as any)?.name === 'AbortError') {
        throw new Error(`BoosterAI request timed out: ${method} ${path}`)
      }
      throw err
    } finally {
      clearTimeout(timeout)
    }
  }
}
