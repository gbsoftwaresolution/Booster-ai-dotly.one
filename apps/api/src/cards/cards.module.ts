import { Module } from '@nestjs/common'
import { CardsController } from './cards.controller'
import { CardsService } from './cards.service'
import { QrController } from './qr.controller'
import { AuditModule } from '../audit/audit.module'
import { AnalyticsModule } from '../analytics/analytics.module'
import { AuthModule } from '../auth/auth.module'

@Module({
  // AnalyticsModule is imported so CardsService can call
  // invalidateDashboardCache() after create / duplicate / delete,
  // keeping the 60-second Redis cache consistent with DB state.
  imports: [AuditModule, AnalyticsModule, AuthModule],
  controllers: [CardsController, QrController],
  providers: [CardsService],
  exports: [CardsService],
})
export class CardsModule {}
