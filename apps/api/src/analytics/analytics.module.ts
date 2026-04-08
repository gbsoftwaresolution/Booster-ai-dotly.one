import { Module } from '@nestjs/common'
import { AnalyticsController } from './analytics.controller'
import { AnalyticsService } from './analytics.service'
import { BillingModule } from '../billing/billing.module'

@Module({
  // F-02: Import BillingModule so BillingService can be injected into
  // AnalyticsController for plan-based date-range enforcement.
  imports: [BillingModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
