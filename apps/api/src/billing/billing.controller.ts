import { Controller, Get, Post, Body, Patch, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { ThrottlerGuard, Throttle } from '@nestjs/throttler'
import {
  IsEthereumAddress, IsString, IsInt, Min, Max, Matches,
  IsEnum, IsOptional,
} from 'class-validator'
import { BillingService } from './billing.service'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Plan, BillingDuration } from '@dotly/types'

interface AuthUser {
  id: string
}

class VerifySubscriptionDto {
  @IsEthereumAddress()
  walletAddress!: string

  @IsString()
  @Matches(/^0x[a-fA-F0-9]{64}$/, { message: 'txHash must be a valid 32-byte hex transaction hash prefixed with 0x' })
  txHash!: string

  /** chainId: 137 = Polygon, 8453 = Base */
  @IsInt()
  @Min(1)
  @Max(999999)
  chainId!: number
}

class SetWalletDto {
  @IsEthereumAddress()
  walletAddress!: string
}

class CreateBoosterAiOrderDto {
  @IsEnum(['STARTER', 'PRO', 'BUSINESS', 'AGENCY', 'ENTERPRISE'])
  plan!: 'STARTER' | 'PRO' | 'BUSINESS' | 'AGENCY' | 'ENTERPRISE'

  @IsEnum(BillingDuration)
  duration!: BillingDuration

  @IsEthereumAddress()
  walletAddress!: string

  /** Referral/partner code from ?ref=p_xxxxx */
  @IsOptional() @IsString()
  ref?: string

  /** ISO 3166-1 alpha-2 country code, e.g. "US". Defaults to BOOSTERAI_COUNTRY_CODE env var. */
  @IsOptional() @IsString()
  countryCode?: string
}

class ActivateBoosterAiOrderDto {
  @IsString()
  orderId!: string
}

@ApiTags('billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(private billingService: BillingService) {}

  @Get()
  getSubscription(@CurrentUser() user: AuthUser) {
    return this.billingService.getUserSubscription(user.id)
  }

  // F-16: Rate-limit POST /billing/verify to 5 per minute per user.
  // Without this, an attacker can rapidly cycle through wallet addresses /
  // txHashes trying to find one that maps to a paid plan, or abuse the RPC
  // call quota for on-chain reads.
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('verify')
  verify(
    @CurrentUser() user: AuthUser,
    @Body() dto: VerifySubscriptionDto,
  ) {
    return this.billingService.verifyAndSyncSubscription(
      user.id,
      dto.walletAddress,
      dto.txHash,
      dto.chainId,
    )
  }

  // MED-09: Rate-limit PATCH /billing/wallet to 10 per minute per user.
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Patch('wallet')
  setWallet(@CurrentUser() user: AuthUser, @Body() dto: SetWalletDto) {
    return this.billingService.setWalletAddress(user.id, dto.walletAddress)
  }

  // ─── BoosterAI affiliate billing ─────────────────────────────────────────

  /**
   * POST /billing/boosterai/order
   * Creates a BoosterAI order and returns PaymentVault parameters.
   * The frontend uses these to trigger the on-chain USDT payment.
   */
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('boosterai/order')
  createBoosterAiOrder(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateBoosterAiOrderDto,
  ) {
    const planMap: Record<string, Plan> = {
      STARTER:    Plan.STARTER,
      PRO:        Plan.PRO,
      BUSINESS:   Plan.BUSINESS,
      AGENCY:     Plan.AGENCY,
      ENTERPRISE: Plan.ENTERPRISE,
    }
    return this.billingService.createBoosterAiOrder(user.id, {
      plan:          planMap[dto.plan]!,
      duration:      dto.duration,
      walletAddress: dto.walletAddress,
      ref:           dto.ref,
      countryCode:   dto.countryCode,
    })
  }

  /**
   * POST /billing/boosterai/activate
   * Polls BoosterAI for order finalization and activates the subscription.
   * Idempotent — safe to call multiple times until { status: 'ACTIVE' }.
   */
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('boosterai/activate')
  activateBoosterAiOrder(
    @CurrentUser() user: AuthUser,
    @Body() dto: ActivateBoosterAiOrderDto,
  ) {
    return this.billingService.activateBoosterAiOrder(user.id, dto.orderId)
  }
}
