import { Module } from '@nestjs/common'
import { PaymentAccountsModule } from '../payment-accounts/payment-accounts.module'
import { PrismaModule } from '../prisma/prisma.module'
import { SalesLinkController } from './sales-link.controller'
import { SalesLinkService } from './sales-link.service'

@Module({
  imports: [PrismaModule, PaymentAccountsModule],
  controllers: [SalesLinkController],
  providers: [SalesLinkService],
})
export class SalesLinkModule {}
