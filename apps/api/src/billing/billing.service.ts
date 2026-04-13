import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { Plan as SharedPlan, BillingDuration } from '@dotly/types'
import { AuditService } from '../audit/audit.service'
import { createPublicClient, http, type Address } from 'viem'
import { arbitrum } from 'viem/chains'
import { DURATION_DAYS } from './boosterai.client'
import type { BillingSummaryResponse } from '@dotly/types'
import { DURATION_IDS, PaymentVaultQuotes, PLAN_IDS } from './payment-vault-quotes'

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

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name)

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private config: ConfigService,
    private paymentVaultQuotes: PaymentVaultQuotes,
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
        updatedAt: true,
      },
    })

    if (existingSubscription?.boosterAiOrderId) {
      const stalePendingThresholdMs = 2 * 60 * 60 * 1000
      const isStalePending =
        existingSubscription.updatedAt.getTime() < Date.now() - stalePendingThresholdMs

      if (isStalePending) {
        await this.prisma.subscription.update({
          where: { userId },
          data: {
            boosterAiOrderId: null,
            status: 'CANCELLED',
            plan: SharedPlan.FREE,
            cancelAtPeriodEnd: false,
          },
        })
      } else {
        throw new BadRequestException(
          'You already have a pending checkout. Complete or wait for that checkout before starting another one',
        )
      }
    }

    const refreshedSubscription = existingSubscription?.boosterAiOrderId
      ? await this.prisma.subscription.findUnique({
          where: { userId },
          select: {
            status: true,
            currentPeriodEnd: true,
          },
        })
      : existingSubscription

    const isActive = refreshedSubscription?.status === 'ACTIVE'
    const stillValid =
      !!refreshedSubscription?.currentPeriodEnd &&
      refreshedSubscription.currentPeriodEnd > new Date()

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

  private async assertTxOrigin(walletAddress: string, txHash: string): Promise<void> {
    try {
      const rpcUrl = this.config.get<string>('ARBITRUM_RPC_URL')
      if (!rpcUrl) {
        throw new BadRequestException('Arbitrum RPC URL is not configured')
      }

      const client = createPublicClient({ chain: arbitrum, transport: http(rpcUrl) })
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
      const contractAddress = this.config.get<string>('DOTLY_CONTRACT_ADDRESS') as
        | Address
        | undefined
      if (!contractAddress) {
        throw new BadRequestException('Payment vault is not configured')
      }

      const rpcUrl = this.config.get<string>('ARBITRUM_RPC_URL')
      if (!rpcUrl) {
        throw new BadRequestException('Arbitrum RPC URL is not configured')
      }

      const client = createPublicClient({ chain: arbitrum, transport: http(rpcUrl) })
      const payment = await client.readContract({
        address: contractAddress,
        abi: DOTLY_PAYMENT_VAULT_ABI,
        functionName: 'getPayment',
        args: [paymentId as `0x${string}`],
      })

      return payment
    } catch (err) {
      if (err instanceof BadRequestException) throw err
      this.logger.error(`Failed to read vault payment: ${this.formatError(err)}`)
      throw new BadRequestException('Could not verify payment state on chain')
    }
  }

  async readRecordedPaymentByTxHash(txHash: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { txHash },
      select: { boosterAiOrderId: true },
    })

    if (!subscription?.boosterAiOrderId) return null

    const payment = await this.readRecordedPayment(subscription.boosterAiOrderId)

    return {
      payer: payment[0],
      userRef: payment[1],
      amount: payment[2],
      planId: payment[3],
      duration: payment[4],
      paymentRef: payment[5],
      paidAt: payment[6],
      refundUntil: payment[7],
      status: payment[8],
    }
  }

  async getUserSubscription(userId: string): Promise<BillingSummaryResponse> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { user: { select: { plan: true, walletAddress: true } } },
    })
    return {
      plan: subscription?.user?.plan ?? SharedPlan.FREE,
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
      nonce: crypto.randomUUID(),
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
        status: 'TRIALING',
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
        status: 'TRIALING',
        boosterAiPartnerId: null,
      },
    })

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
    if (chainId !== CHAIN_ID) {
      throw new BadRequestException('Only Arbitrum payments are supported')
    }

    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      select: {
        plan: true,
        boosterAiOrderId: true,
        billingDuration: true,
        amountUsdt: true,
        contractSubscriptionId: true,
      },
    })

    if (!sub?.boosterAiOrderId || sub.boosterAiOrderId !== paymentId) {
      throw new BadRequestException('Payment does not match the pending checkout for this account')
    }

    const walletAddress = sub.contractSubscriptionId
    if (!walletAddress) {
      throw new BadRequestException('No wallet is associated with the pending checkout')
    }

    await this.assertTxOrigin(walletAddress, txHash)

    const payment = await this.readRecordedPayment(paymentId)
    const expectedPlan = sub.plan as SharedPlan
    const expectedDuration = (sub.billingDuration ?? BillingDuration.MONTHLY) as BillingDuration
    const expectedAmount = this.paymentVaultQuotes.getAmountUsdt(expectedPlan, expectedDuration)

    const payer = payment[0]
    const planId = payment[3]
    const duration = payment[4]
    const paidAt = payment[6]
    const refundUntil = payment[7]
    const amount = payment[2]
    const status = payment[8]

    if (Number(status) !== 1) {
      throw new BadRequestException('Recorded payment is no longer in escrow and cannot activate')
    }

    if (payer.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new BadRequestException('Recorded payment payer does not match the account wallet')
    }
    if (this.getPlanById(Number(planId)) !== expectedPlan) {
      throw new BadRequestException('Recorded payment plan does not match the pending subscription')
    }
    if (Number(duration) !== DURATION_IDS[expectedDuration]) {
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
        boosterAiOrderId: null,
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

    return { status: 'ACTIVE', plan: expectedPlan, currentPeriodEnd: periodEnd.toISOString() }
  }

  getPlanLimits(plan: SharedPlan) {
    const limits: Record<
      SharedPlan,
      {
        cards: number
        analyticsDays: number
        csvExport: boolean
        webhooks: boolean
        customDomain: boolean
        teamMembers: number
      }
    > = {
      [SharedPlan.FREE]: {
        cards: 1,
        analyticsDays: 7,
        csvExport: false,
        webhooks: false,
        customDomain: false,
        teamMembers: 0,
      },
      [SharedPlan.STARTER]: {
        cards: 1,
        analyticsDays: 30,
        csvExport: false,
        webhooks: false,
        customDomain: false,
        teamMembers: 0,
      },
      [SharedPlan.PRO]: {
        cards: 3,
        analyticsDays: 90,
        csvExport: true,
        webhooks: true,
        customDomain: true,
        teamMembers: 0,
      },
      [SharedPlan.BUSINESS]: {
        cards: 10,
        analyticsDays: 365,
        csvExport: true,
        webhooks: true,
        customDomain: true,
        teamMembers: 10,
      },
      [SharedPlan.AGENCY]: {
        cards: 50,
        analyticsDays: 365,
        csvExport: true,
        webhooks: true,
        customDomain: true,
        teamMembers: 50,
      },
      [SharedPlan.ENTERPRISE]: {
        cards: -1,
        analyticsDays: -1,
        csvExport: true,
        webhooks: true,
        customDomain: true,
        teamMembers: -1,
      },
    }
    return limits[plan] ?? limits[SharedPlan.FREE]
  }
}
