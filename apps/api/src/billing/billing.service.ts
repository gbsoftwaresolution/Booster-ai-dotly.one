import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { Plan, BillingDuration } from '@dotly/types'
import { AuditService } from '../audit/audit.service'
import { createPublicClient, http, type Address } from 'viem'
import { polygon, base } from 'viem/chains'
import { BoosterAiClient, DURATION_DAYS } from './boosterai.client'
import type { BillingSummaryResponse } from '@dotly/types'

// Minimal ABI — only the read function we need
const DOTLY_ABI = [
  {
    name: 'getSubscription',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'plan', type: 'uint8' },
      { name: 'expiresAt', type: 'uint256' },
      { name: 'active', type: 'bool' },
    ],
  },
] as const

// Map Solidity enum indices → app Plan values.
// The deployed DotlySubscription.sol defines:
//   enum Plan { FREE, PRO, BUSINESS, ENTERPRISE }  (indices 0-3)
// STARTER and AGENCY are app-only plans with no on-chain counterpart.
// Any index outside 0-3 is treated as FREE to avoid silent privilege escalation.
const PLAN_INDEX_MAP: Plan[] = [Plan.FREE, Plan.PRO, Plan.BUSINESS, Plan.ENTERPRISE]

const FINALIZED_BOOSTERAI_STATUSES = new Set(['FINALIZED_ONCHAIN'])
const REFUNDED_BOOSTERAI_STATUSES = new Set(['REFUNDED_ONCHAIN'])

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name)

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private config: ConfigService,
    private boosterAi: BoosterAiClient,
  ) {}

  private formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
  }

  private normalizeWalletAddress(walletAddress: string): string {
    return walletAddress.toLowerCase()
  }

  private async assertWalletAvailableForUser(userId: string, walletAddress: string): Promise<void> {
    const normalizedWallet = this.normalizeWalletAddress(walletAddress)
    const existingOwner = await this.prisma.user.findFirst({
      where: {
        walletAddress: normalizedWallet,
        id: { not: userId },
      },
      select: { id: true },
    })

    if (existingOwner) {
      throw new BadRequestException(
        'This wallet is already linked to another Dotly account and cannot be reused for billing',
      )
    }
  }

  private async assertOrderCreationAllowed(userId: string): Promise<void> {
    const existingSubscription = await this.prisma.subscription.findUnique({
      where: { userId },
      select: {
        status: true,
        boosterAiOrderId: true,
        currentPeriodEnd: true,
      },
    })

    if (existingSubscription?.boosterAiOrderId) {
      throw new BadRequestException(
        'You already have a pending checkout. Complete or wait for that checkout before starting another one',
      )
    }

    const isActive = existingSubscription?.status === 'ACTIVE'
    const stillValid =
      !!existingSubscription?.currentPeriodEnd && existingSubscription.currentPeriodEnd > new Date()

    if (isActive && stillValid) {
      throw new BadRequestException(
        'Your subscription is already active. Manage your current subscription before starting a new checkout',
      )
    }
  }

  private normalizePartnerCode(ref?: string): string | undefined {
    if (!ref) return undefined
    const trimmed = ref.trim()
    return trimmed || undefined
  }

  private normalizePartnerIdentity(partnerId?: string | null): string | undefined {
    if (!partnerId) return undefined
    const trimmed = partnerId.trim()
    if (!trimmed) return undefined
    return trimmed.replace(/^p_/, '')
  }

  async linkPartnerIdentity(userId: string, partnerId: string) {
    const normalizedPartnerId = this.normalizePartnerIdentity(partnerId)
    if (!normalizedPartnerId) {
      throw new BadRequestException('Partner identity is required')
    }

    const existingOwner = await this.prisma.user.findFirst({
      where: {
        boosterAiPartnerId: normalizedPartnerId,
        id: { not: userId },
      },
      select: { id: true },
    })

    if (existingOwner) {
      throw new BadRequestException(
        'This partner identity is already linked to another Dotly account',
      )
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { boosterAiPartnerId: normalizedPartnerId },
      select: { id: true, boosterAiPartnerId: true },
    })
  }

  private async assertNoSelfReferral(userId: string, partnerCode?: string): Promise<void> {
    const normalizedPartnerCode = this.normalizePartnerIdentity(partnerCode)
    if (!normalizedPartnerCode) return

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { boosterAiPartnerId: true },
    })

    if (
      user?.boosterAiPartnerId &&
      this.normalizePartnerIdentity(user.boosterAiPartnerId) === normalizedPartnerCode
    ) {
      throw new BadRequestException(
        'You cannot use your own partner code when purchasing a subscription',
      )
    }
  }

  /**
   * Verify on-chain subscription for a wallet address and sync to DB.
   * Called after user submits a transaction hash.
   * The server NEVER signs transactions — it only reads chain state.
   */
  async verifyAndSyncSubscription(
    userId: string,
    walletAddress: string,
    txHash: string,
    chainId: number,
  ) {
    const normalizedWallet = this.normalizeWalletAddress(walletAddress)
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { walletAddress: true },
    })
    if (!user?.walletAddress || user.walletAddress.toLowerCase() !== normalizedWallet) {
      throw new BadRequestException(
        'Provided wallet address does not match the wallet on your account',
      )
    }

    // F-10: Verify that the transaction was sent FROM the claimed walletAddress.
    // Without this check, any user could submit a tx hash from another wallet,
    // claim that wallet's on-chain plan, and upgrade their account for free.
    // We read the transaction from the chain and assert tx.from === walletAddress.
    await this.assertTxOrigin(normalizedWallet, txHash, chainId)

    const { plan, expiresAt } = await this.getOnChainPlan(normalizedWallet, chainId)

    await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        plan,
        status: 'ACTIVE',
        contractSubscriptionId: normalizedWallet,
        txHash,
        chainId,
        currentPeriodEnd: expiresAt,
      },
      update: {
        plan,
        status: 'ACTIVE',
        txHash,
        currentPeriodEnd: expiresAt,
      },
    })

    await this.prisma.user.update({ where: { id: userId }, data: { plan } })

    void this.audit
      .log({
        userId,
        action: 'billing.subscribed',
        resourceType: 'subscription',
        metadata: { plan, txHash, chainId, walletAddress: normalizedWallet },
      })
      .catch(() => void 0)

    return { plan, status: 'ACTIVE' }
  }

  /**
   * F-10: Assert that a transaction hash was sent FROM a specific wallet.
   * Fetches the transaction from the chain using viem and compares `tx.from`
   * (lowercased) to the claimed wallet address (lowercased).
   * Throws BadRequestException if the sender does not match.
   */
  private async assertTxOrigin(
    walletAddress: string,
    txHash: string,
    chainId: number,
  ): Promise<void> {
    try {
      const polygonRpc = this.config.get<string>('POLYGON_RPC_URL')
      const baseRpc = this.config.get<string>('BASE_RPC_URL')
      const chain = chainId === 137 ? polygon : base
      const rpcUrl = chainId === 137 ? polygonRpc : baseRpc
      if (!rpcUrl) {
        // HIGH-01: Reject the upgrade request rather than silently bypassing the
        // tx-origin check.  If an attacker triggers a missing-RPC condition they
        // would previously have been able to claim any on-chain plan without a
        // valid transaction.  Throwing BadRequestException aborts the subscription
        // update and surfaces a clear error to the caller.
        throw new BadRequestException(`Chain ${chainId} is not supported — RPC URL not configured`)
      }

      const client = createPublicClient({ chain, transport: http(rpcUrl) })
      const tx = await client.getTransaction({ hash: txHash as `0x${string}` })

      if (!tx) {
        throw new BadRequestException(
          'Transaction not found on chain — please wait for it to be mined',
        )
      }

      if (tx.from.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new BadRequestException(
          'Transaction sender does not match the provided wallet address',
        )
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err
      // HIGH-01: Do NOT swallow RPC errors silently.  The previous code logged
      // and continued, meaning an attacker who triggers a transient RPC error
      // (e.g. by submitting an invalid txHash) bypasses the tx-origin check
      // entirely and can claim any on-chain plan without a valid transaction.
      // Re-throwing as BadRequestException ensures the subscription update is
      // aborted when we cannot verify the transaction.
      this.logger.error(`assertTxOrigin: failed to fetch transaction: ${this.formatError(err)}`)
      throw new BadRequestException(
        'Could not verify transaction on chain — please try again in a moment',
      )
    }
  }

  /**
   * Read on-chain subscription plan for a wallet.
   * Uses viem in read-only mode — no private key needed.
   */
  private async getOnChainPlan(
    walletAddress: string,
    chainId: number,
  ): Promise<{ plan: Plan; expiresAt: Date }> {
    try {
      const contractAddress = this.config.get<string>('DOTLY_CONTRACT_ADDRESS') as
        | Address
        | undefined
      if (!contractAddress) {
        throw new BadRequestException('Billing contract is not configured')
      }

      const polygonRpc = this.config.get<string>('POLYGON_RPC_URL')
      const baseRpc = this.config.get<string>('BASE_RPC_URL')

      const chain = chainId === 137 ? polygon : base
      const rpcUrl = chainId === 137 ? polygonRpc : baseRpc
      if (!rpcUrl) {
        throw new BadRequestException(`No RPC URL configured for chainId ${chainId}`)
      }

      const client = createPublicClient({ chain, transport: http(rpcUrl) })
      const [planIndex, expiresAtRaw, active] = await client.readContract({
        address: contractAddress,
        abi: DOTLY_ABI,
        functionName: 'getSubscription',
        args: [walletAddress as Address],
      })

      if (!active || expiresAtRaw <= BigInt(Math.floor(Date.now() / 1000))) {
        return {
          plan: Plan.FREE,
          expiresAt: new Date(Number(expiresAtRaw) * 1000),
        }
      }

      return {
        plan: PLAN_INDEX_MAP[planIndex] ?? Plan.FREE,
        expiresAt: new Date(Number(expiresAtRaw) * 1000),
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err
      this.logger.error(`Failed to read on-chain subscription: ${this.formatError(err)}`)
      throw new BadRequestException('Could not verify on-chain subscription state')
    }
  }

  private getPlanForBoosterPlanId(planId: number): Plan {
    const planMap = new Map<number, Plan>([
      [this.boosterAi.getPlanId(Plan.STARTER), Plan.STARTER],
      [this.boosterAi.getPlanId(Plan.PRO), Plan.PRO],
      [this.boosterAi.getPlanId(Plan.BUSINESS), Plan.BUSINESS],
      [this.boosterAi.getPlanId(Plan.AGENCY), Plan.AGENCY],
      [this.boosterAi.getPlanId(Plan.ENTERPRISE), Plan.ENTERPRISE],
    ])
    const plan = planMap.get(planId)
    if (!plan) throw new BadRequestException(`Unknown BoosterAI planId: ${planId}`)
    return plan
  }

  async getUserSubscription(userId: string): Promise<BillingSummaryResponse> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { user: { select: { plan: true, walletAddress: true } } },
    })
    return {
      plan: subscription?.user?.plan ?? Plan.FREE,
      status: subscription?.status ?? null,
      currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() ?? null,
      walletAddress: subscription?.user?.walletAddress ?? null,
      txHash: subscription?.txHash ?? null,
      chainId: subscription?.chainId ?? null,
      boosterAiOrderId: subscription?.boosterAiOrderId ?? null,
      billingDuration: subscription?.billingDuration ?? null,
      amountUsdt: subscription?.amountUsdt ?? null,
    }
  }

  async setWalletAddress(userId: string, walletAddress: string) {
    const normalizedWallet = this.normalizeWalletAddress(walletAddress)
    await this.assertWalletAvailableForUser(userId, normalizedWallet)
    return this.prisma.user.update({
      where: { id: userId },
      data: { walletAddress: normalizedWallet },
    })
  }

  // ─── BoosterAI affiliate billing ───────────────────────────────────────────

  /**
   * Step 1 — Create a BoosterAI order and return PaymentVault params.
   * The frontend uses these to call paySubscription() on-chain.
   */
  async createCheckoutOrder(
    userId: string,
    params: {
      plan: Plan
      duration: BillingDuration
      walletAddress: string
      ref?: string
      countryCode?: string
    },
  ) {
    if (params.plan === Plan.FREE) {
      throw new BadRequestException('Cannot create a BoosterAI order for the FREE plan')
    }

    await this.assertOrderCreationAllowed(userId)

    const normalizedWallet = this.normalizeWalletAddress(params.walletAddress)
    await this.assertWalletAvailableForUser(userId, normalizedWallet)

    const partnerCode = this.normalizePartnerCode(params.ref)
    await this.assertNoSelfReferral(userId, partnerCode)

    let orderRes: Awaited<ReturnType<BoosterAiClient['createOrder']>>
    try {
      orderRes = await this.boosterAi.createOrder({
        plan: params.plan,
        duration: params.duration,
        walletAddress: normalizedWallet,
        partnerCode,
        countryCode: params.countryCode,
      })
    } catch (err) {
      this.logger.error(`BoosterAI createOrder failed: ${this.formatError(err)}`)
      throw new BadRequestException(
        (err as Error).message ?? 'Failed to create order with BoosterAI — please try again',
      )
    }

    const amountUsdt = this.boosterAi.getAmountUsdt(params.plan, params.duration)

    await this.prisma.user.update({
      where: { id: userId },
      data: { walletAddress: normalizedWallet },
    })

    // Persist the pending order on the Subscription record so we can resume
    // polling even if the user closes the tab.
    await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        plan: params.plan,
        status: 'TRIALING',
        boosterAiOrderId: orderRes.orderId,
        boosterAiPartnerId: null,
        billingDuration: params.duration,
        amountUsdt,
        contractSubscriptionId: normalizedWallet,
      },
      update: {
        plan: params.plan,
        boosterAiOrderId: orderRes.orderId,
        billingDuration: params.duration,
        amountUsdt,
        contractSubscriptionId: normalizedWallet,
        status: 'TRIALING',
        boosterAiPartnerId: null,
      },
    })

    return {
      orderId: orderRes.orderId,
      paymentVaultAddress: orderRes.paymentVaultAddress,
      usdtTokenAddress: orderRes.usdtTokenAddress,
      amountUsdt: orderRes.amountUsdt,
      paymentRef: orderRes.paymentRef,
      chainId: orderRes.chainId,
    }
  }

  /**
   * Step 2 — Poll BoosterAI for order finalization and activate the
   * subscription in Dotly's database.
   * Returns { status: 'ACTIVE' | 'PENDING' | 'CANCELLED' }.
   */
  async activateBoosterAiOrder(userId: string, orderId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      select: {
        plan: true,
        boosterAiOrderId: true,
        billingDuration: true,
        amountUsdt: true,
      },
    })

    if (!sub?.boosterAiOrderId || sub.boosterAiOrderId !== orderId) {
      throw new BadRequestException(
        'Order does not match the pending BoosterAI order for this account',
      )
    }

    let status: Awaited<ReturnType<BoosterAiClient['getOrderStatus']>>
    try {
      status = await this.boosterAi.getOrderStatus(orderId)
    } catch (err) {
      this.logger.error(
        `BoosterAI getOrderStatus failed for orderId=${orderId}: ${this.formatError(err)}`,
      )
      throw new BadRequestException(
        (err as Error).message ?? 'Could not retrieve order status — please try again',
      )
    }

    if (FINALIZED_BOOSTERAI_STATUSES.has(status.orderStatus)) {
      const expectedPlan = this.getPlanForBoosterPlanId(status.planId)
      const duration = (sub.billingDuration ?? BillingDuration.MONTHLY) as BillingDuration
      const expectedAmount = this.boosterAi.getAmountUsdt(expectedPlan, duration)

      if (sub.plan !== expectedPlan) {
        throw new BadRequestException(
          'BoosterAI order plan does not match the pending subscription plan',
        )
      }
      if (sub.amountUsdt !== expectedAmount || status.amountUsdt !== expectedAmount) {
        throw new BadRequestException(
          'BoosterAI order amount does not match the pending subscription',
        )
      }

      const paidAt = status.paidAt ? new Date(status.paidAt) : new Date()
      const dur = duration as BillingDuration
      const days = DURATION_DAYS[dur] ?? 30
      const periodEnd = new Date(paidAt.getTime() + days * 24 * 60 * 60 * 1000)
      const plan = expectedPlan

      await this.prisma.subscription.update({
        where: { userId },
        data: {
          plan,
          status: 'ACTIVE',
          boosterAiPartnerId: status.partnerId ?? undefined,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          boosterAiOrderId: null,
        },
      })

      await this.prisma.user.update({ where: { id: userId }, data: { plan } })

      void this.audit
        .log({
          userId,
          action: 'billing.checkout.activated',
          resourceType: 'subscription',
          metadata: {
            orderId,
            plan,
            partnerId: status.partnerId,
            refundUntil: status.refundUntil,
          },
        })
        .catch(() => void 0)

      return { status: 'ACTIVE', plan, currentPeriodEnd: periodEnd }
    }

    if (REFUNDED_BOOSTERAI_STATUSES.has(status.orderStatus)) {
      await this.prisma.subscription.update({
        where: { userId },
        data: {
          status: 'CANCELLED',
          plan: Plan.FREE,
          cancelAtPeriodEnd: false,
          boosterAiOrderId: null,
        },
      })
      await this.prisma.user.update({ where: { id: userId }, data: { plan: Plan.FREE } })

      void this.audit
        .log({
          userId,
          action: 'billing.checkout.refunded',
          resourceType: 'subscription',
          metadata: { orderId },
        })
        .catch(() => void 0)

      return { status: 'CANCELLED' }
    }

    // Order exists but not yet finalized on-chain
    return { status: 'PENDING', orderStatus: status.orderStatus }
  }

  getPlanLimits(plan: Plan) {
    const limits: Record<
      Plan,
      {
        cards: number
        analyticsDays: number
        csvExport: boolean
        webhooks: boolean
        customDomain: boolean
        teamMembers: number
      }
    > = {
      [Plan.FREE]: {
        cards: 1,
        analyticsDays: 7,
        csvExport: false,
        webhooks: false,
        customDomain: false,
        teamMembers: 0,
      },
      [Plan.STARTER]: {
        cards: 1,
        analyticsDays: 30,
        csvExport: false,
        webhooks: false,
        customDomain: false,
        teamMembers: 0,
      },
      [Plan.PRO]: {
        cards: 3,
        analyticsDays: 90,
        csvExport: true,
        webhooks: true,
        customDomain: true,
        teamMembers: 0,
      },
      [Plan.BUSINESS]: {
        cards: 10,
        analyticsDays: 365,
        csvExport: true,
        webhooks: true,
        customDomain: true,
        teamMembers: 10,
      },
      [Plan.AGENCY]: {
        cards: 50,
        analyticsDays: 365,
        csvExport: true,
        webhooks: true,
        customDomain: true,
        teamMembers: 50,
      },
      [Plan.ENTERPRISE]: {
        cards: -1,
        analyticsDays: -1,
        csvExport: true,
        webhooks: true,
        customDomain: true,
        teamMembers: -1,
      },
    }
    return limits[plan]
  }
}
