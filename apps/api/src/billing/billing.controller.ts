import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Query,
  UseGuards,
  Headers,
  RawBodyRequest,
  Req,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { ThrottlerGuard, Throttle } from '@nestjs/throttler'
import {
  IsEthereumAddress,
  IsString,
  IsInt,
  Matches,
  IsEnum,
  IsOptional,
  IsIn,
} from 'class-validator'
import { BillingService } from './billing.service'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Plan, BillingDuration } from '@dotly/types'
import { Public } from '../auth/decorators/public.decorator'
import { DotlySupportOpsGuard } from './dotly-support-ops.guard'
import type { Request } from 'express'

interface AuthUser {
  id: string
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
  @IsOptional()
  @IsString()
  @Matches(/^p_[A-Za-z0-9_-]{4,120}$/, {
    message: 'ref must be a valid partner code in the format p_xxxxx',
  })
  ref?: string

  /** ISO 3166-1 alpha-2 country code, e.g. "US". Defaults to BOOSTERAI_COUNTRY_CODE env var. */
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/, {
    message: 'countryCode must be a 2-letter uppercase ISO country code',
  })
  countryCode?: string
}

class ActivateBoosterAiOrderDto {
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{64}$/, {
    message: 'paymentId must be a valid 32-byte hex string prefixed with 0x',
  })
  paymentId!: string

  @IsString()
  @Matches(/^0x[a-fA-F0-9]{64}$/, {
    message: 'txHash must be a valid 32-byte hex transaction hash prefixed with 0x',
  })
  txHash!: string

  @IsInt()
  @IsIn([42161], { message: 'chainId must be 42161 (Arbitrum)' })
  chainId!: number
}

class BillingSummaryQueryDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/, {
    message: 'countryCode must be a 2-letter uppercase ISO country code',
  })
  countryCode?: string
}

class HostedCheckoutQuoteQueryDto {
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{64}$/, {
    message: 'paymentId must be a valid 32-byte hex string prefixed with 0x',
  })
  paymentId!: string
}

class AdminRefundDto {
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{64}$/, {
    message: 'paymentId must be a valid 32-byte hex string prefixed with 0x',
  })
  paymentId!: string
}

class CreateStripeSubscriptionDto {
  @IsOptional()
  @IsEnum(['PRO'])
  plan?: 'PRO'
}

@ApiTags('billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(private billingService: BillingService) {}

  @Get()
  getSubscription(@CurrentUser() user: AuthUser, @Query() query: BillingSummaryQueryDto) {
    return this.billingService.getUserSubscription(user.id, query.countryCode)
  }

  // MED-09: Rate-limit PATCH /billing/wallet to 10 per minute per user.
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Patch('wallet')
  setWallet(@CurrentUser() user: AuthUser, @Body() dto: SetWalletDto) {
    return this.billingService.setWalletAddress(user.id, dto.walletAddress)
  }

  // ─── Subscription checkout ───────────────────────────────────────────────

  /**
   * POST /billing/checkout/order
   * Creates a signed checkout quote for DotlyPaymentVault.
   */
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('checkout/order')
  createCheckoutOrder(@CurrentUser() user: AuthUser, @Body() dto: CreateBoosterAiOrderDto) {
    const planMap: Record<string, Plan> = {
      STARTER: Plan.STARTER,
      PRO: Plan.PRO,
      BUSINESS: Plan.BUSINESS,
      AGENCY: Plan.AGENCY,
      ENTERPRISE: Plan.ENTERPRISE,
    }
    return this.billingService.createCheckoutOrder(user.id, {
      plan: planMap[dto.plan]!,
      duration: dto.duration,
      walletAddress: dto.walletAddress,
      ref: dto.ref,
      countryCode: dto.countryCode,
    })
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('create-subscription')
  createStripeSubscription(
    @CurrentUser() user: AuthUser,
    @Body() _dto: CreateStripeSubscriptionDto,
  ) {
    return this.billingService.createStripeSubscriptionCheckout(user.id, Plan.PRO)
  }

  @Public()
  @Post('webhook')
  handleStripeBillingWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ) {
    return this.billingService.handleStripeBillingWebhook(req.rawBody, signature)
  }

  /**
   * POST /billing/checkout/activate
   * Verifies the payment transaction and activates the subscription.
   */
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('checkout/activate')
  activateCheckoutOrder(@CurrentUser() user: AuthUser, @Body() dto: ActivateBoosterAiOrderDto) {
    return this.billingService.activateCheckoutOrder(
      user.id,
      dto.paymentId,
      dto.txHash,
      dto.chainId,
    )
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('checkout/hosted/activate')
  activateHostedCheckoutOrder(@Body() dto: ActivateBoosterAiOrderDto) {
    return this.billingService.activateCheckoutOrderForPendingSubscription(
      dto.paymentId,
      dto.txHash,
      dto.chainId,
    )
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Get('checkout/hosted')
  getHostedCheckoutQuote(@Query() query: HostedCheckoutQuoteQueryDto) {
    return this.billingService.getHostedCheckoutQuote(query.paymentId)
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get('checkout/hosted/status')
  getHostedCheckoutStatus(@Query() query: HostedCheckoutQuoteQueryDto) {
    return this.billingService.getHostedCheckoutStatus(query.paymentId)
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('refund/request')
  requestRefundReview(@CurrentUser() user: AuthUser) {
    return this.billingService.requestManualRefundReview(user.id)
  }

  @UseGuards(DotlySupportOpsGuard)
  @Get('internal/refunds')
  getInternalRefundQueue() {
    return this.billingService.listRefundReviewRequests()
  }

  @UseGuards(DotlySupportOpsGuard)
  @Post('internal/refunds/admin')
  adminRefund(@Body() dto: AdminRefundDto) {
    return this.billingService.adminRefundPayment(dto.paymentId)
  }
}
