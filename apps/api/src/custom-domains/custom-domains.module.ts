import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { BillingModule } from '../billing/billing.module'
import { CustomDomainsController } from './custom-domains.controller'
import { CustomDomainsService } from './custom-domains.service'
import {
  DomainVerificationProcessor,
  DomainVerificationScheduler,
  DOMAIN_VERIFICATION_QUEUE,
} from './domain-verification.processor'

@Module({
  imports: [
    BillingModule,
    BullModule.registerQueue({
      name: DOMAIN_VERIFICATION_QUEUE,
    }),
  ],
  controllers: [CustomDomainsController],
  providers: [CustomDomainsService, DomainVerificationProcessor, DomainVerificationScheduler],
  exports: [CustomDomainsService],
})
export class CustomDomainsModule {}
