import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import {
  Plan as SharedPlan,
  BillingDuration,
  type BillingAdminRefundResponse,
  type BillingHostedCheckoutQuoteResponse,
  type BillingHostedCheckoutStatusResponse,
  type BillingRefundRequestResponse,
  type BillingRefundReviewItem,
  type BillingRefundReviewListResponse,
  type BillingRefundStatus,
  type BillingRefundSummary,
} from '@dotly/types'
import { AuditService } from '../audit/audit.service'
import { createPublicClient, decodeEventLog, http, type Address } from 'viem'
import { arbitrum } from 'viem/chains'
import { randomBytes } from 'crypto'
import { Contract, JsonRpcProvider, Wallet } from 'ethers'
import { DURATION_DAYS } from './boosterai.client'
import type { BillingSummaryResponse } from '@dotly/types'
import { DURATION_IDS, PaymentVaultQuotes, PLAN_IDS } from './payment-vault-quotes'
import { isCryptoBlockedForCountry } from './crypto-country-policy'
import { EmailService } from '../email/email.service'
import Stripe from 'stripe'
import { ObservabilityService } from '../common/observability/observability.service'

const DOTLY_PAYMENT_VAULT_ABI = [
  {
    type: 'event',
    name: 'PaymentRecorded',
    inputs: [
      { name: 'paymentId', type: 'bytes32', indexed: true },
      { name: 'userRef', type: 'bytes32', indexed: true },
      { name: 'payer', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'planId', type: 'uint32', indexed: false },
      { name: 'duration', type: 'uint8', indexed: false },
      { name: 'paymentRef', type: 'bytes32', indexed: false },
      { name: 'paidAt', type: 'uint64', indexed: false },
      { name: 'refundUntil', type: 'uint64', indexed: false },
    ],
  },
  {
    name: 'adminRefund',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'paymentId', type: 'bytes32' }],
    outputs: [],
  },
  {
    name: 'getPayment',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'paymentId', type: 'bytes32' }],
    outputs: [
      { name: 'payer', type: 'address' },
      { name: 'userRef', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
      { name: 'planId', type: 'uint32' },
      { name: 'duration', type: 'uint8' },
      { name: 'paymentRef', type: 'bytes32' },
      { name: 'paidAt', type: 'uint64' },
      { name: 'refundUntil', type: 'uint64' },
      { name: 'status', type: 'uint8' },
    ],
  },
] as const

const CHAIN_ID = 42161
const STRIPE_PRO_MONTHLY_AMOUNT = 1500

type RecordedPaymentState = {
  paymentId: string
  payer: string
  userRef: string
  amount: bigint
  planId: number
  duration: number
  paymentRef: string
  paidAt: bigint
  refundUntil: bigint
  status: number
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name)
  private readonly stripe: Stripe | null

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private config: ConfigService,
    private paymentVaultQuotes: PaymentVaultQuotes,
    private email: EmailService,
    private readonly observability: ObservabilityService,
  ) {
    const stripeMode = this.config.get<'enabled' | 'disabled'>('STRIPE_MODE') ?? 'disabled'
    const stripeKey = this.config.get<string>('STRIPE_SECRET_KEY')
    this.stripe = stripeMode === 'enabled' && stripeKey ? new Stripe(stripeKey) : null
  }

  private isStripeEnabled(): boolean {
    return !!this.stripe
  }

  private async syncStripeSubscription(params: {
    userId: string
    stripeCustomerId?: string | null
    subscription: Stripe.Subscription
  }): Promise<void> {
    const stripeSubscription = params.subscription as Stripe.Subscription & {
      current_period_end?: number
    }
    const isActive = ['active', 'trialing', 'past_due'].includes(params.subscription.status)
    const currentPeriodEnd = stripeSubscription.current_period_end
      ? new Date(stripeSubscription.current_period_end * 1000)
      : null

    await this.prisma.subscription.upsert({
      where: { userId: params.userId },
      create: {
        userId: params.userId,
        plan: isActive ? SharedPlan.PRO : SharedPlan.FREE,
        status: isActive ? 'ACTIVE' : 'CANCELLED',
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
        stripeCustomerId: params.stripeCustomerId ?? null,
        stripeSubscriptionId: params.subscription.id,
      },
      update: {
        plan: isActive ? SharedPlan.PRO : SharedPlan.FREE,
        status: isActive ? 'ACTIVE' : 'CANCELLED',
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
        stripeCustomerId: params.stripeCustomerId ?? undefined,
        stripeSubscriptionId: params.subscription.id,
      },
    })

    await this.prisma.user.update({
      where: { id: params.userId },
      data: { plan: isActive ? SharedPlan.PRO : SharedPlan.FREE },
    })
  }

  async createStripeSubscriptionCheckout(userId: string, requestedPlan: SharedPlan) {
    if (!this.isStripeEnabled() || !this.stripe) {
      throw new BadRequestException('Stripe subscriptions are not configured right now')
    }

    if (requestedPlan !== SharedPlan.PRO) {
      throw new BadRequestException('Only the Pro plan is available in this upgrade flow')
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        plan: true,
      },
    })

    if (!user) {
      throw new BadRequestException('User not found')
    }

    if (user.plan !== SharedPlan.FREE) {
      throw new BadRequestException('Your account is already on a paid plan')
    }

    const webUrl = this.config.getOrThrow<string>('WEB_URL').replace(/\/$/, '')
    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: user.email,
      success_url: `${webUrl}/upgrade?checkout=success`,
      cancel_url: `${webUrl}/upgrade?checkout=cancelled`,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Dotly Pro',
              description: 'Unlimited leads, payments, full dashboard, and no Dotly branding.',
            },
            recurring: { interval: 'month' },
            unit_amount: STRIPE_PRO_MONTHLY_AMOUNT,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        plan: SharedPlan.PRO,
        source: 'dotly_upgrade',
      },
      subscription_data: {
        metadata: {
          userId,
          plan: SharedPlan.PRO,
          source: 'dotly_upgrade',
        },
      },
    })

    this.observability.incrementCoreFlowCounter('upgrade_checkout_started_total', {
      plan: requestedPlan,
      provider: 'stripe_subscription',
    })
    this.logger.log(
      JSON.stringify({
        event: 'upgrade_checkout_started',
        userId,
        plan: requestedPlan,
        provider: 'stripe_subscription',
      }),
    )

    return { url: session.url }
  }

  async handleStripeBillingWebhook(rawBody?: Buffer, signature?: string) {
    const startedAt = process.hrtime.bigint()
    if (!this.isStripeEnabled() || !this.stripe) {
      return { received: true as const }
    }

    const webhookSecret =
      this.config.get<string>('STRIPE_BILLING_WEBHOOK_SECRET') ??
      this.config.get<string>('STRIPE_WEBHOOK_SECRET')

    if (!webhookSecret || !rawBody || !signature) {
      throw new BadRequestException('Stripe billing webhook is not configured')
    }

    const event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.userId
      const subscriptionId =
        typeof session.subscription === 'string' ? session.subscription : session.subscription?.id
      const stripeCustomerId =
        typeof session.customer === 'string' ? session.customer : session.customer?.id

      if (userId && subscriptionId) {
        const subscription = await this.stripe.subscriptions.retrieve(subscriptionId)
        await this.syncStripeSubscription({
          userId,
          stripeCustomerId,
          subscription,
        })
        this.observability.incrementCoreFlowCounter('upgrade_checkout_completed_total', {
          plan: SharedPlan.PRO,
          provider: 'stripe_subscription',
          status: 'success',
        })
      }
    }

    if (
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const subscription = event.data.object as Stripe.Subscription
      const metadataUserId = subscription.metadata?.userId
      const existing = metadataUserId
        ? { userId: metadataUserId }
        : await this.prisma.subscription.findFirst({
            where: { stripeSubscriptionId: subscription.id },
            select: { userId: true },
          })

      if (existing?.userId) {
        const stripeCustomerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id
        await this.syncStripeSubscription({
          userId: existing.userId,
          stripeCustomerId,
          subscription,
        })
      }
    }

    const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000
    this.observability.incrementCoreFlowCounter('webhook_events_total', {
      source: 'billing',
      event_type: event.type,
      status: 'success',
    })
    this.observability.observeWebhookLatency('billing', event.type, durationSeconds)

    return { received: true as const }
  }

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
        currentPeriodEnd: true,
      },
    })

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

  private getVaultAddress(): string | null {
    return this.config.get<string>('DOTLY_CONTRACT_ADDRESS') ?? null
  }

  private getOwnerPrivateKey(): string | null {
    return this.config.get<string>('DOTLY_OWNER_PRIVATE_KEY') ?? null
  }

  private getSupportInbox(): string | null {
    return this.config.get<string>('BILLING_SUPPORT_EMAIL') ?? null
  }

  private isAdminRefundEnabled(): boolean {
    return !!this.getOwnerPrivateKey()
  }

  private getArbitrumClient() {
    const contractAddress = this.getVaultAddress() as Address | null
    if (!contractAddress) {
      throw new BadRequestException('Payment vault is not configured')
    }

    const rpcUrl = this.config.get<string>('ARBITRUM_RPC_URL')
    if (!rpcUrl) {
      throw new BadRequestException('Arbitrum RPC URL is not configured')
    }

    return {
      contractAddress,
      client: createPublicClient({ chain: arbitrum, transport: http(rpcUrl) }),
    }
  }

  private mapPaymentStatus(status: number): BillingRefundStatus {
    switch (status) {
      case 1:
        return 'PAID_ESCROW'
      case 2:
        return 'REFUNDED'
      case 3:
        return 'FINALIZED'
      default:
        return 'NONE'
    }
  }

  private async getLatestManualRefundRequest(userId: string, paymentId: string) {
    return this.prisma.auditLog.findFirst({
      where: {
        userId,
        action: 'billing.refund.requested',
        resourceId: paymentId,
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })
  }

  private getAuditMetadataRecord(metadata: unknown): Record<string, unknown> {
    return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
      ? (metadata as Record<string, unknown>)
      : {}
  }

  private asHostedQuoteResponse(metadata: unknown): BillingHostedCheckoutQuoteResponse | null {
    const record = this.getAuditMetadataRecord(metadata)
    const amountUsdt = typeof record.amountUsdt === 'string' ? record.amountUsdt : null
    const amountRaw = typeof record.amountRaw === 'string' ? record.amountRaw : null
    const paymentVaultAddress =
      typeof record.paymentVaultAddress === 'string' ? record.paymentVaultAddress : null
    const usdtTokenAddress =
      typeof record.usdtTokenAddress === 'string' ? record.usdtTokenAddress : null
    const paymentRef = typeof record.paymentRef === 'string' ? record.paymentRef : null
    const paymentId = typeof record.paymentId === 'string' ? record.paymentId : null
    const userRef = typeof record.userRef === 'string' ? record.userRef : null
    const planId = typeof record.planId === 'number' ? record.planId : null
    const durationId = typeof record.durationId === 'number' ? record.durationId : null
    const deadline = typeof record.deadline === 'string' ? record.deadline : null
    const signature = typeof record.signature === 'string' ? record.signature : null
    const chainId = typeof record.chainId === 'number' ? record.chainId : null
    const plan = typeof record.plan === 'string' ? record.plan : null
    const duration = typeof record.duration === 'string' ? record.duration : null
    const walletAddress = typeof record.walletAddress === 'string' ? record.walletAddress : null

    if (
      !amountUsdt ||
      !amountRaw ||
      !paymentVaultAddress ||
      !usdtTokenAddress ||
      !paymentRef ||
      !paymentId ||
      !userRef ||
      planId === null ||
      durationId === null ||
      !deadline ||
      !signature ||
      chainId === null ||
      !plan ||
      !duration ||
      !walletAddress
    ) {
      return null
    }

    return {
      amountUsdt,
      amountRaw,
      paymentVaultAddress,
      usdtTokenAddress,
      paymentRef,
      paymentId,
      userRef,
      planId,
      durationId,
      deadline,
      signature,
      chainId,
      plan,
      duration,
      walletAddress,
    }
  }

  async getHostedCheckoutQuote(paymentId: string): Promise<BillingHostedCheckoutQuoteResponse> {
    const entry = await this.prisma.auditLog.findFirst({
      where: {
        action: 'billing.checkout.hosted_quote_created',
        resourceId: paymentId,
      },
      orderBy: { createdAt: 'desc' },
      select: { metadata: true, createdAt: true },
    })

    if (!entry) {
      throw new BadRequestException('Hosted checkout quote was not found')
    }

    const ageMs = Date.now() - entry.createdAt.getTime()
    if (ageMs > 60 * 60 * 1000) {
      throw new BadRequestException(
        'Hosted checkout quote has expired. Generate a new payment link.',
      )
    }

    const quote = this.asHostedQuoteResponse(entry.metadata)
    if (!quote) {
      throw new BadRequestException('Hosted checkout quote is invalid')
    }

    return quote
  }

  async getHostedCheckoutStatus(paymentId: string): Promise<BillingHostedCheckoutStatusResponse> {
    const sub = await this.prisma.subscription.findUnique({
      where: { boosterAiOrderId: paymentId },
      select: {
        status: true,
        txHash: true,
        currentPeriodEnd: true,
      },
    })

    if (!sub) {
      throw new BadRequestException('Hosted checkout was not found')
    }

    const quoteEntry = await this.prisma.auditLog.findFirst({
      where: {
        action: 'billing.checkout.hosted_quote_created',
        resourceId: paymentId,
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    })

    const isExpired = quoteEntry
      ? Date.now() - quoteEntry.createdAt.getTime() > 5 * 60 * 1000
      : false

    if (sub.status === 'ACTIVE') {
      return {
        paymentId,
        status: 'ACTIVE',
        paid: true,
        activated: true,
        txHash: sub.txHash ?? null,
        currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      }
    }

    try {
      const payment = await this.readRecordedPayment(paymentId)
      const paid = payment.status === 1 || payment.status === 2 || payment.status === 3

      return {
        paymentId,
        status:
          payment.status === 2 ? 'REFUNDED' : paid ? 'PAID' : isExpired ? 'EXPIRED' : 'PENDING',
        paid,
        activated: false,
        txHash: sub.txHash ?? null,
        currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      }
    } catch {
      return {
        paymentId,
        status: isExpired ? 'EXPIRED' : 'PENDING',
        paid: false,
        activated: false,
        txHash: sub.txHash ?? null,
        currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
      }
    }
  }

  private asRecordedPaymentState(
    paymentId: string,
    payment: readonly unknown[],
  ): RecordedPaymentState {
    return {
      paymentId,
      payer: String(payment[0]),
      userRef: String(payment[1]),
      amount: BigInt(String(payment[2])),
      planId: Number(payment[3]),
      duration: Number(payment[4]),
      paymentRef: String(payment[5]),
      paidAt: BigInt(String(payment[6])),
      refundUntil: BigInt(String(payment[7])),
      status: Number(payment[8]),
    }
  }

  private async buildRefundSummary(
    userId: string,
    payment: RecordedPaymentState,
  ): Promise<BillingRefundSummary> {
    const nowSeconds = Math.floor(Date.now() / 1000)
    const refundUntilSeconds = Number(payment.refundUntil)
    const refundStatus = this.mapPaymentStatus(payment.status)
    const eligible = refundStatus === 'PAID_ESCROW' && nowSeconds <= refundUntilSeconds
    const latestRequest = await this.getLatestManualRefundRequest(userId, payment.paymentId)

    return {
      paymentId: payment.paymentId,
      paymentVaultAddress: this.getVaultAddress(),
      status: refundStatus,
      refundUntil:
        refundUntilSeconds > 0 ? new Date(refundUntilSeconds * 1000).toISOString() : null,
      eligible,
      canSelfRefund: eligible,
      canRequestManualReview: eligible,
      supportRequestedAt: latestRequest?.createdAt.toISOString() ?? null,
    }
  }

  private async applyRefundCancellation(
    userId: string,
    previousPlan: SharedPlan,
    txHash: string,
  ): Promise<void> {
    await this.prisma.subscription.update({
      where: { userId },
      data: {
        status: 'CANCELLED',
        plan: SharedPlan.FREE,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
    })

    await this.prisma.user.update({
      where: { id: userId },
      data: { plan: SharedPlan.FREE },
    })

    void this.audit
      .log({
        userId,
        action: 'billing.checkout.refunded',
        resourceType: 'subscription',
        metadata: {
          txHash,
          previousPlan,
        },
      })
      .catch(() => void 0)
  }

  private async resolvePaymentIdFromTxHash(txHash: string): Promise<string | null> {
    try {
      const { client, contractAddress } = this.getArbitrumClient()
      const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` })

      for (const log of receipt.logs) {
        if (log.address.toLowerCase() !== contractAddress.toLowerCase()) continue

        try {
          const decoded = decodeEventLog({
            abi: DOTLY_PAYMENT_VAULT_ABI,
            data: log.data,
            topics: log.topics,
          })

          if (decoded.eventName === 'PaymentRecorded') {
            return decoded.args.paymentId
          }
        } catch {
          continue
        }
      }

      return null
    } catch (err) {
      if (err instanceof BadRequestException) throw err
      this.logger.warn(
        `Failed to resolve payment id from tx hash ${txHash}: ${this.formatError(err)}`,
      )
      return null
    }
  }

  private async notifySupportRefundReview(params: {
    userId: string
    userEmail: string
    userName: string | null
    plan: SharedPlan
    paymentId: string
    txHash: string
    refundUntil: string | null
  }): Promise<void> {
    const supportInbox = this.getSupportInbox()
    if (!supportInbox) return

    try {
      await this.email.sendRefundReviewRequestNotification({
        to: supportInbox,
        userId: params.userId,
        userEmail: params.userEmail,
        userName: params.userName,
        plan: params.plan,
        paymentId: params.paymentId,
        txHash: params.txHash,
        refundUntil: params.refundUntil,
      })
    } catch (err) {
      this.logger.warn(
        `Failed to notify support about refund review request: ${this.formatError(err)}`,
      )
    }
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

  private async assertTxOrigin(walletAddress: string, txHash: string): Promise<void> {
    try {
      const { client } = this.getArbitrumClient()
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
      this.logger.error(`assertTxOrigin: failed to fetch transaction: ${this.formatError(err)}`)
      throw new BadRequestException(
        'Could not verify transaction on chain — please try again in a moment',
      )
    }
  }

  private getPlanById(planId: number): SharedPlan {
    const match = Object.entries(PLAN_IDS).find(([, value]) => value === planId)
    if (!match) {
      throw new BadRequestException(`Unknown plan id: ${planId}`)
    }
    return match[0] as SharedPlan
  }

  private async readRecordedPayment(paymentId: string) {
    try {
      const { client, contractAddress } = this.getArbitrumClient()
      const payment = await client.readContract({
        address: contractAddress,
        abi: DOTLY_PAYMENT_VAULT_ABI,
        functionName: 'getPayment',
        args: [paymentId as `0x${string}`],
      })

      return this.asRecordedPaymentState(paymentId, payment)
    } catch (err) {
      if (err instanceof BadRequestException) throw err
      this.logger.error(`Failed to read vault payment: ${this.formatError(err)}`)
      throw new BadRequestException('Could not verify payment state on chain')
    }
  }

  async readRecordedPaymentByTxHash(txHash: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { txHash },
      select: { userId: true, boosterAiOrderId: true },
    })

    if (!subscription) return null

    const paymentId =
      subscription.boosterAiOrderId ?? (await this.resolvePaymentIdFromTxHash(txHash))

    if (!paymentId) return null

    if (!subscription.boosterAiOrderId) {
      await this.prisma.subscription.update({
        where: { userId: subscription.userId },
        data: { boosterAiOrderId: paymentId },
      })
    }

    return this.readRecordedPayment(paymentId)
  }

  async getUserSubscription(
    userId: string,
    fallbackCountryCode?: string,
  ): Promise<BillingSummaryResponse> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { user: { select: { plan: true, walletAddress: true, country: true } } },
    })
    const billingCountry = subscription?.user?.country ?? fallbackCountryCode ?? null

    let resolvedPlan = subscription?.user?.plan ?? SharedPlan.FREE
    let resolvedStatus = subscription?.status ?? null
    let resolvedCurrentPeriodEnd = subscription?.currentPeriodEnd ?? null
    let refund: BillingRefundSummary | null = null

    if (subscription?.txHash) {
      try {
        const payment = await this.readRecordedPaymentByTxHash(subscription.txHash)

        if (payment) {
          refund = await this.buildRefundSummary(userId, payment)

          if (
            payment.status === 2 &&
            (subscription.status !== 'CANCELLED' || subscription.user.plan !== SharedPlan.FREE)
          ) {
            await this.applyRefundCancellation(
              userId,
              subscription.user.plan as SharedPlan,
              subscription.txHash,
            )
            resolvedPlan = SharedPlan.FREE
            resolvedStatus = 'CANCELLED'
            resolvedCurrentPeriodEnd = null
          }
        }
      } catch (err) {
        this.logger.warn(`Failed to load refund state for user ${userId}: ${this.formatError(err)}`)
      }
    }

    return {
      plan: resolvedPlan,
      status: resolvedStatus,
      currentPeriodEnd: resolvedCurrentPeriodEnd?.toISOString() ?? null,
      walletAddress: subscription?.user?.walletAddress ?? null,
      txHash: subscription?.txHash ?? null,
      chainId: subscription?.chainId ?? null,
      boosterAiOrderId: subscription?.boosterAiOrderId ?? null,
      billingDuration: subscription?.billingDuration ?? null,
      amountUsdt: subscription?.amountUsdt ?? null,
      cryptoBlocked: isCryptoBlockedForCountry(this.config, billingCountry),
      billingCountry,
      refund,
    }
  }

  async requestManualRefundReview(userId: string): Promise<BillingRefundRequestResponse> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      select: {
        txHash: true,
        plan: true,
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    })

    if (!subscription?.txHash) {
      throw new BadRequestException('No paid subscription payment is available for refund review')
    }

    const payment = await this.readRecordedPaymentByTxHash(subscription.txHash)
    if (!payment) {
      throw new BadRequestException('Could not find the recorded payment for this subscription')
    }

    const refund = await this.buildRefundSummary(userId, payment)
    if (!refund.canRequestManualReview) {
      if (refund.status === 'REFUNDED') {
        throw new BadRequestException('This payment has already been refunded')
      }
      if (refund.status === 'FINALIZED') {
        throw new BadRequestException('The refund window has already closed for this payment')
      }
      throw new BadRequestException('This payment is not eligible for manual refund review')
    }

    const existingRequest = await this.getLatestManualRefundRequest(userId, payment.paymentId)
    if (existingRequest) {
      return {
        status: 'REQUESTED',
        paymentId: payment.paymentId,
        requestedAt: existingRequest.createdAt.toISOString(),
        alreadyRequested: true,
      }
    }

    await this.audit.log({
      userId,
      action: 'billing.refund.requested',
      resourceType: 'subscription',
      resourceId: payment.paymentId,
      metadata: {
        txHash: subscription.txHash,
        refundUntil: Number(payment.refundUntil),
        onchainStatus: refund.status,
      },
    })

    if (subscription.user?.email) {
      void this.notifySupportRefundReview({
        userId,
        userEmail: subscription.user.email,
        userName: subscription.user.name ?? null,
        plan: subscription.plan as SharedPlan,
        paymentId: payment.paymentId,
        txHash: subscription.txHash,
        refundUntil: refund.refundUntil,
      })
    }

    return {
      status: 'REQUESTED',
      paymentId: payment.paymentId,
      requestedAt: new Date().toISOString(),
      alreadyRequested: false,
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

  async createCheckoutOrder(
    userId: string,
    params: {
      plan: SharedPlan
      duration: BillingDuration
      walletAddress: string
      ref?: string
      countryCode?: string
    },
  ) {
    if (params.plan === SharedPlan.FREE) {
      throw new BadRequestException('Cannot create a checkout quote for the FREE plan')
    }

    await this.assertOrderCreationAllowed(userId)

    const normalizedWallet = this.normalizeWalletAddress(params.walletAddress)
    await this.assertWalletAvailableForUser(userId, normalizedWallet)

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { country: true },
    })
    const billingCountry = (user?.country ?? params.countryCode ?? null)?.toUpperCase() ?? null

    if (isCryptoBlockedForCountry(this.config, billingCountry)) {
      throw new BadRequestException('Crypto checkout is not available in your country')
    }

    const partnerCode = this.normalizePartnerCode(params.ref)
    await this.assertNoSelfReferral(userId, partnerCode)

    const amountUsdt = this.paymentVaultQuotes.getAmountUsdt(params.plan, params.duration)
    const amountRaw = this.paymentVaultQuotes.parseAmountRaw(amountUsdt)
    const userRef = this.paymentVaultQuotes.makeUserRef(userId)
    const paymentRef = this.paymentVaultQuotes.makePaymentRef({
      userId,
      plan: params.plan,
      duration: params.duration,
      walletAddress: normalizedWallet,
      nonce: `0x${randomBytes(32).toString('hex')}`,
    })
    const paymentId = this.paymentVaultQuotes.paymentIdFor(paymentRef)
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600)
    const planId = PLAN_IDS[params.plan]
    const durationId = DURATION_IDS[params.duration]
    const signature = await this.paymentVaultQuotes.signQuote({
      payer: normalizedWallet,
      userRef,
      amountRaw,
      planId,
      durationId,
      paymentRef,
      deadline,
    })

    await this.prisma.user.update({
      where: { id: userId },
      data: { walletAddress: normalizedWallet },
    })

    await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        plan: params.plan,
        status: 'PENDING',
        boosterAiOrderId: paymentId,
        boosterAiPartnerId: null,
        billingDuration: params.duration,
        amountUsdt,
        contractSubscriptionId: normalizedWallet,
      },
      update: {
        plan: params.plan,
        boosterAiOrderId: paymentId,
        billingDuration: params.duration,
        amountUsdt,
        contractSubscriptionId: normalizedWallet,
        status: 'PENDING',
        currentPeriodEnd: null,
        txHash: null,
        chainId: null,
        cancelAtPeriodEnd: false,
        boosterAiPartnerId: null,
      },
    })

    void this.audit
      .log({
        userId,
        action: 'billing.checkout.hosted_quote_created',
        resourceType: 'subscription',
        resourceId: paymentId,
        metadata: {
          plan: params.plan,
          duration: params.duration,
          walletAddress: normalizedWallet,
          amountUsdt,
          amountRaw: amountRaw.toString(),
          paymentVaultAddress: this.paymentVaultQuotes.getVaultAddress(),
          usdtTokenAddress: this.paymentVaultQuotes.getUsdtAddress(),
          paymentRef,
          paymentId,
          userRef,
          planId,
          durationId,
          deadline: deadline.toString(),
          signature,
          chainId: this.paymentVaultQuotes.getChainId(),
        },
      })
      .catch(() => void 0)

    this.observability.incrementCoreFlowCounter('upgrade_checkout_started_total', {
      plan: params.plan,
      provider: 'crypto_hosted',
    })
    this.logger.log(
      JSON.stringify({
        event: 'upgrade_checkout_started',
        userId,
        plan: params.plan,
        provider: 'crypto_hosted',
        paymentId,
      }),
    )

    return {
      amountUsdt,
      amountRaw: amountRaw.toString(),
      paymentVaultAddress: this.paymentVaultQuotes.getVaultAddress(),
      usdtTokenAddress: this.paymentVaultQuotes.getUsdtAddress(),
      paymentRef,
      paymentId,
      userRef,
      planId,
      durationId,
      deadline: deadline.toString(),
      signature,
      chainId: this.paymentVaultQuotes.getChainId(),
    }
  }

  async activateCheckoutOrder(userId: string, paymentId: string, txHash: string, chainId: number) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      select: { id: true },
    })

    if (!subscription) {
      throw new BadRequestException('No pending checkout was found for this account')
    }

    return this.activateCheckoutOrderForPendingSubscription(paymentId, txHash, chainId)
  }

  async activateCheckoutOrderForPendingSubscription(
    paymentId: string,
    txHash: string,
    chainId: number,
  ) {
    if (chainId !== CHAIN_ID) {
      throw new BadRequestException('Only Arbitrum payments are supported')
    }

    const sub = await this.prisma.subscription.findUnique({
      where: { boosterAiOrderId: paymentId },
      select: {
        userId: true,
        plan: true,
        boosterAiOrderId: true,
        billingDuration: true,
        amountUsdt: true,
        contractSubscriptionId: true,
      },
    })

    if (!sub?.boosterAiOrderId || sub.boosterAiOrderId !== paymentId) {
      throw new BadRequestException('Payment does not match a pending checkout')
    }

    const userId = sub.userId

    const walletAddress = sub.contractSubscriptionId
    if (!walletAddress) {
      throw new BadRequestException('No wallet is associated with the pending checkout')
    }

    await this.assertTxOrigin(walletAddress, txHash)

    const payment = await this.readRecordedPayment(paymentId)
    const expectedPlan = sub.plan as SharedPlan
    const expectedDuration = (sub.billingDuration ?? BillingDuration.MONTHLY) as BillingDuration
    const expectedAmount = this.paymentVaultQuotes.getAmountUsdt(expectedPlan, expectedDuration)

    const payer = payment.payer
    const planId = payment.planId
    const duration = payment.duration
    const paidAt = payment.paidAt
    const refundUntil = payment.refundUntil
    const amount = payment.amount
    const status = payment.status

    if (status !== 1) {
      throw new BadRequestException('Recorded payment is no longer in escrow and cannot activate')
    }

    if (payer.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new BadRequestException('Recorded payment payer does not match the account wallet')
    }
    if (this.getPlanById(planId) !== expectedPlan) {
      throw new BadRequestException('Recorded payment plan does not match the pending subscription')
    }
    if (duration !== DURATION_IDS[expectedDuration]) {
      throw new BadRequestException(
        'Recorded payment duration does not match the pending subscription',
      )
    }
    if (sub.amountUsdt !== expectedAmount) {
      throw new BadRequestException('Pending subscription amount does not match configured pricing')
    }

    const paymentAmountUsdt = (Number(amount) / 1_000_000).toFixed(2)
    if (paymentAmountUsdt !== expectedAmount) {
      throw new BadRequestException(
        'Recorded payment amount does not match the pending subscription',
      )
    }

    const paidAtDate = new Date(Number(paidAt) * 1000)
    const days = DURATION_DAYS[expectedDuration] ?? 30
    const periodEnd = new Date(paidAtDate.getTime() + days * 24 * 60 * 60 * 1000)

    await this.prisma.subscription.update({
      where: { userId },
      data: {
        plan: expectedPlan,
        status: 'ACTIVE',
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        boosterAiOrderId: paymentId,
        txHash,
        chainId,
      },
    })

    await this.prisma.user.update({ where: { id: userId }, data: { plan: expectedPlan } })

    void this.audit
      .log({
        userId,
        action: 'billing.checkout.activated',
        resourceType: 'subscription',
        metadata: {
          paymentId,
          plan: expectedPlan,
          txHash,
          refundUntil: Number(refundUntil),
        },
      })
      .catch(() => void 0)

    this.observability.incrementCoreFlowCounter('upgrade_checkout_completed_total', {
      plan: expectedPlan,
      provider: 'crypto_hosted',
      status: 'success',
    })
    this.logger.log(
      JSON.stringify({
        event: 'upgrade_checkout_completed',
        userId,
        paymentId,
        plan: expectedPlan,
        provider: 'crypto_hosted',
        txHash,
      }),
    )

    return { status: 'ACTIVE', plan: expectedPlan, currentPeriodEnd: periodEnd.toISOString() }
  }

  async listRefundReviewRequests(): Promise<BillingRefundReviewListResponse> {
    const requests = await this.prisma.auditLog.findMany({
      where: { action: 'billing.refund.requested' },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            plan: true,
            subscription: {
              select: {
                status: true,
                currentPeriodEnd: true,
                txHash: true,
                boosterAiOrderId: true,
              },
            },
          },
        },
      },
    })

    const items = await Promise.all(
      requests.map(async (request): Promise<BillingRefundReviewItem> => {
        const metadata = this.getAuditMetadataRecord(request.metadata)
        const paymentId = request.resourceId ?? request.user?.subscription?.boosterAiOrderId ?? null
        const txHash =
          request.user?.subscription?.txHash ??
          (typeof metadata.txHash === 'string' ? metadata.txHash : null)

        let refund: BillingRefundSummary | null = null
        let adminRefundTxHash: string | null = null

        const adminRefundAudit = paymentId
          ? await this.prisma.auditLog.findFirst({
              where: {
                action: 'billing.refund.admin_refunded',
                resourceId: paymentId,
              },
              orderBy: { createdAt: 'desc' },
              select: { metadata: true },
            })
          : null

        if (adminRefundAudit) {
          const adminMetadata = this.getAuditMetadataRecord(adminRefundAudit.metadata)
          adminRefundTxHash =
            typeof adminMetadata.refundTxHash === 'string' ? adminMetadata.refundTxHash : null
        }

        if (paymentId && request.userId) {
          try {
            const payment = await this.readRecordedPayment(paymentId)
            refund = await this.buildRefundSummary(request.userId, payment)
          } catch (err) {
            this.logger.warn(
              `Failed to load refund review state for payment ${paymentId}: ${this.formatError(err)}`,
            )
          }
        }

        return {
          requestId: request.id,
          userId: request.userId,
          userEmail: request.user?.email ?? null,
          userName: request.user?.name ?? null,
          requestedAt: request.createdAt.toISOString(),
          paymentId,
          txHash,
          plan: request.user?.plan ?? SharedPlan.FREE,
          subscriptionStatus: request.user?.subscription?.status ?? null,
          currentPeriodEnd: request.user?.subscription?.currentPeriodEnd?.toISOString() ?? null,
          refund,
          canAdminRefund: !!refund?.eligible && this.isAdminRefundEnabled(),
          adminRefundTxHash,
        }
      }),
    )

    return {
      items,
      adminRefundEnabled: this.isAdminRefundEnabled(),
    }
  }

  async adminRefundPayment(paymentId: string): Promise<BillingAdminRefundResponse> {
    const ownerKey = this.getOwnerPrivateKey()
    if (!ownerKey) {
      throw new BadRequestException('DOTLY_OWNER_PRIVATE_KEY is not configured')
    }

    const payment = await this.readRecordedPayment(paymentId)
    if (payment.status === 2) {
      throw new BadRequestException('This payment has already been refunded')
    }
    if (payment.status === 3) {
      throw new BadRequestException('This payment has already been finalized')
    }

    const rpcUrl = this.config.get<string>('ARBITRUM_RPC_URL')
    const contractAddress = this.getVaultAddress()
    if (!rpcUrl || !contractAddress) {
      throw new BadRequestException('Payment vault is not configured')
    }

    const provider = new JsonRpcProvider(rpcUrl)
    const signer = new Wallet(ownerKey, provider)
    const contract = new Contract(contractAddress, DOTLY_PAYMENT_VAULT_ABI, signer)
    const adminRefund = (
      contract as unknown as {
        adminRefund: (id: string) => Promise<{ hash: string; wait: () => Promise<unknown> }>
      }
    ).adminRefund

    let refundTxHash = ''
    try {
      const tx = await adminRefund(paymentId)
      refundTxHash = tx.hash as string
      await tx.wait()
    } catch (err) {
      this.logger.error(`Failed to execute admin refund for ${paymentId}: ${this.formatError(err)}`)
      throw new BadRequestException('Admin refund transaction failed')
    }

    const subscription = await this.prisma.subscription.findFirst({
      where: { boosterAiOrderId: paymentId },
      select: { userId: true, plan: true, status: true },
    })

    if (subscription && subscription.status !== 'CANCELLED') {
      await this.applyRefundCancellation(
        subscription.userId,
        subscription.plan as SharedPlan,
        refundTxHash,
      )
    }

    if (subscription?.userId) {
      await this.audit.log({
        userId: subscription.userId,
        action: 'billing.refund.admin_refunded',
        resourceType: 'subscription',
        resourceId: paymentId,
        metadata: {
          refundTxHash,
          paymentId,
        },
      })
    }

    return {
      status: 'REFUNDED',
      paymentId,
      txHash: refundTxHash,
    }
  }

  getPlanLimits(plan: SharedPlan) {
    const limits: Record<
      SharedPlan,
      {
        cards: number
        analyticsDays: number
        crmLevel: 'none' | 'basic' | 'full'
        csvExport: boolean
        emailTemplates: boolean
        webhooks: boolean
        customDomain: boolean
        schedulingLevel: 'none' | 'basic' | 'full'
        teamMembers: number
      }
    > = {
      [SharedPlan.FREE]: {
        cards: 1,
        analyticsDays: 7,
        crmLevel: 'none',
        csvExport: false,
        emailTemplates: false,
        webhooks: false,
        customDomain: false,
        schedulingLevel: 'none',
        teamMembers: 0,
      },
      [SharedPlan.STARTER]: {
        cards: 1,
        analyticsDays: 30,
        crmLevel: 'basic',
        csvExport: false,
        emailTemplates: true,
        webhooks: false,
        customDomain: false,
        schedulingLevel: 'basic',
        teamMembers: 0,
      },
      [SharedPlan.PRO]: {
        cards: 3,
        analyticsDays: 90,
        crmLevel: 'full',
        csvExport: true,
        emailTemplates: true,
        webhooks: true,
        customDomain: true,
        schedulingLevel: 'full',
        teamMembers: 0,
      },
      [SharedPlan.BUSINESS]: {
        cards: 10,
        analyticsDays: 365,
        crmLevel: 'full',
        csvExport: true,
        emailTemplates: true,
        webhooks: true,
        customDomain: true,
        schedulingLevel: 'full',
        teamMembers: 10,
      },
      [SharedPlan.AGENCY]: {
        cards: 50,
        analyticsDays: 365,
        crmLevel: 'full',
        csvExport: true,
        emailTemplates: true,
        webhooks: true,
        customDomain: true,
        schedulingLevel: 'full',
        teamMembers: 50,
      },
      [SharedPlan.ENTERPRISE]: {
        cards: -1,
        analyticsDays: -1,
        crmLevel: 'full',
        csvExport: true,
        emailTemplates: true,
        webhooks: true,
        customDomain: true,
        schedulingLevel: 'full',
        teamMembers: -1,
      },
    }
    return limits[plan] ?? limits[SharedPlan.FREE]
  }
}
