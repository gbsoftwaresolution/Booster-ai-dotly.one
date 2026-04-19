import { Module } from '@nestjs/common'
import { ObservabilityModule } from '../common/observability/observability.module'
import { PaymentAccountsModule } from '../payment-accounts/payment-accounts.module'
import { PrismaModule } from '../prisma/prisma.module'
import { SalesLinkController } from './sales-link.controller'
import { SalesLinkService } from './sales-link.service'

@Module({
  imports: [PrismaModule, PaymentAccountsModule, ObservabilityModule],
  controllers: [SalesLinkController],
  providers: [SalesLinkService],
})
export class SalesLinkModule {}
