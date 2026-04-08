import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { BillingController } from './billing.controller'
import { BillingService } from './billing.service'
import { BoosterAiClient } from './boosterai.client'
import { BoosterAiPartnerGuard } from './boosterai-partner.guard'
import { BoosterAiPartnerEligibilityController } from './boosterai-partner-eligibility.controller'
import { AuditModule } from '../audit/audit.module'

@Module({
  imports: [ConfigModule, AuditModule],
  controllers: [BillingController, BoosterAiPartnerEligibilityController],
  providers: [BillingService, BoosterAiClient, BoosterAiPartnerGuard],
  exports: [BillingService, BoosterAiClient],
})
export class BillingModule {}
