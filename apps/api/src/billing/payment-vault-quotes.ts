import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Wallet, TypedDataEncoder, keccak256 } from 'ethers'
import { BillingDuration, Plan } from '@dotly/types'
import { PLAN_PRICING } from './boosterai.client'

export const DURATION_IDS: Record<BillingDuration, number> = {
  [BillingDuration.MONTHLY]: 1,
  [BillingDuration.SIX_MONTHS]: 2,
  [BillingDuration.ANNUAL]: 3,
}

export const PLAN_IDS: Record<Plan, number> = {
  [Plan.FREE]: 0,
  [Plan.STARTER]: 1,
  [Plan.PRO]: 2,
  [Plan.BUSINESS]: 3,
  [Plan.AGENCY]: 4,
  [Plan.ENTERPRISE]: 5,
}

@Injectable()
export class PaymentVaultQuotes {
  constructor(private readonly config: ConfigService) {}

  private parseNonce(nonce: string | bigint): bigint {
    if (typeof nonce === 'bigint') {
      return nonce
    }

    const trimmed = nonce.trim()
    if (!trimmed) {
      throw new BadRequestException('Payment nonce is required')
    }

    if (/^0x[0-9a-fA-F]+$/.test(trimmed) || /^\d+$/.test(trimmed)) {
      return BigInt(trimmed)
    }

    throw new BadRequestException('Payment nonce must be a decimal or hex uint256 value')
  }

  getChainId(): number {
    return 42161
  }

  getVaultAddress(): string {
    const address = this.config.get<string>('DOTLY_CONTRACT_ADDRESS')
    if (!address) throw new BadRequestException('Payment vault is not configured')
    return address
  }

  getUsdtAddress(): string {
    const address = this.config.get<string>('DOTLY_USDT_ADDRESS')
    if (!address) throw new BadRequestException('USDT token is not configured')
    return address
  }

  getAmountUsdt(plan: Plan, duration: BillingDuration): string {
    const amount = PLAN_PRICING[plan]?.[duration]
    if (!amount) {
      throw new BadRequestException(`No configured price for ${plan} / ${duration}`)
    }
    return amount
  }

  parseAmountRaw(amountUsdt: string): bigint {
    const [whole, decimals = ''] = amountUsdt.split('.')
    return BigInt(whole ?? '0') * 1_000_000n + BigInt(decimals.padEnd(6, '0').slice(0, 6))
  }

  makeUserRef(userId: string): string {
    return TypedDataEncoder.hashStruct(
      'UserRef',
      { UserRef: [{ name: 'userId', type: 'string' }] },
      { userId },
    )
  }

  makePaymentRef(input: {
    userId: string
    plan: Plan
    duration: BillingDuration
    walletAddress: string
    nonce: string | bigint
  }) {
    return TypedDataEncoder.hashStruct(
      'PaymentRef',
      {
        PaymentRef: [
          { name: 'userId', type: 'string' },
          { name: 'plan', type: 'string' },
          { name: 'duration', type: 'string' },
          { name: 'walletAddress', type: 'address' },
          { name: 'nonce', type: 'uint256' },
        ],
      },
      {
        userId: input.userId,
        plan: input.plan,
        duration: input.duration,
        walletAddress: input.walletAddress,
        nonce: this.parseNonce(input.nonce),
      },
    )
  }

  paymentIdFor(paymentRef: string): string {
    return keccak256(paymentRef)
  }

  async signQuote(params: {
    payer: string
    userRef: string
    amountRaw: bigint
    planId: number
    durationId: number
    paymentRef: string
    deadline: bigint
  }) {
    const privateKey = this.config.get<string>('DOTLY_PAYMENT_SIGNER_PRIVATE_KEY')
    if (!privateKey) {
      throw new BadRequestException('Payment signer is not configured')
    }

    const signer = new Wallet(privateKey)
    const domain = {
      name: 'DotlyPaymentVault',
      version: '1',
      chainId: this.getChainId(),
      verifyingContract: this.getVaultAddress(),
    }

    const types = {
      PaymentQuote: [
        { name: 'payer', type: 'address' },
        { name: 'userRef', type: 'bytes32' },
        { name: 'amount', type: 'uint256' },
        { name: 'planId', type: 'uint32' },
        { name: 'duration', type: 'uint8' },
        { name: 'paymentRef', type: 'bytes32' },
        { name: 'deadline', type: 'uint64' },
        { name: 'vault', type: 'address' },
        { name: 'chainId', type: 'uint256' },
        { name: 'token', type: 'address' },
      ],
    }

    const value = {
      payer: params.payer,
      userRef: params.userRef,
      amount: params.amountRaw,
      planId: params.planId,
      duration: params.durationId,
      paymentRef: params.paymentRef,
      deadline: params.deadline,
      vault: this.getVaultAddress(),
      chainId: this.getChainId(),
      token: this.getUsdtAddress(),
    }

    return signer.signTypedData(domain, types, value)
  }
}
