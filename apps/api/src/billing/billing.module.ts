import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { BillingController } from './billing.controller'
import { BillingService } from './billing.service'
import { BoosterAiClient } from './boosterai.client'
import { BoosterAiPartnerGuard } from './boosterai-partner.guard'
import { PartnerLinkController } from './partner-link.controller'
import { PaymentVaultQuotes } from './payment-vault-quotes'
import { AuditModule } from '../audit/audit.module'

@Module({
  imports: [ConfigModule, AuditModule],
  controllers: [BillingController, PartnerLinkController],
  providers: [BillingService, BoosterAiClient, BoosterAiPartnerGuard, PaymentVaultQuotes],
  exports: [BillingService, BoosterAiClient, PaymentVaultQuotes],
})
export class BillingModule {}
