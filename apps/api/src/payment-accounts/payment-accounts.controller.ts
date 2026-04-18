import { Body, Controller, Get, Headers, Post, RawBodyRequest, Req } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { IsIn } from 'class-validator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { PaymentAccountsService } from './payment-accounts.service'
import type { Request } from 'express'

class CreatePaymentAccountDto {
  @IsIn(['company', 'individual'])
  accountType!: 'company' | 'individual'
}

class SetDefaultProviderDto {
  @IsIn(['stripe_connect', 'upi_link', 'cash_on_delivery'])
  provider!: 'stripe_connect' | 'upi_link' | 'cash_on_delivery'
}

@ApiTags('payment-accounts')
@ApiBearerAuth()
@Controller('payment-accounts')
export class PaymentAccountsController {
  constructor(private readonly paymentAccountsService: PaymentAccountsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the current user payment account status' })
  getMe(@CurrentUser() user: { id: string }) {
    return this.paymentAccountsService.getAccount(user.id)
  }

  @Get('providers')
  @ApiOperation({ summary: 'List available seller payment providers' })
  listProviders(@CurrentUser() user: { id: string }) {
    return this.paymentAccountsService.getAccount(user.id).then((account) => account.providers)
  }

  @Post('default-provider')
  @ApiOperation({ summary: 'Set the seller default payment provider' })
  setDefaultProvider(@CurrentUser() user: { id: string }, @Body() body: SetDefaultProviderDto) {
    return this.paymentAccountsService.setDefaultProvider(user.id, body.provider)
  }

  @Post('stripe/onboarding')
  @ApiOperation({ summary: 'Create or continue Stripe Connect onboarding' })
  createStripeOnboarding(
    @CurrentUser() user: { id: string },
    @Body() body: CreatePaymentAccountDto,
  ) {
    return this.paymentAccountsService.createOrUpdateStripeAccount(user.id, body.accountType)
  }

  @Post('stripe/manage')
  @ApiOperation({ summary: 'Get a Stripe Connect account update link' })
  createStripeManageLink(@CurrentUser() user: { id: string }) {
    return this.paymentAccountsService.createStripeManagementLink(user.id)
  }

  @Post('stripe/webhook')
  @ApiOperation({ summary: 'Sync Stripe Connect account updates' })
  syncStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ) {
    return this.paymentAccountsService.handleStripeConnectWebhook(req.rawBody, signature)
  }
}
