import { Module } from '@nestjs/common'
import { PrismaModule } from '../prisma/prisma.module'
import { SalesLinkController } from './sales-link.controller'
import { SalesLinkService } from './sales-link.service'

@Module({
  imports: [PrismaModule],
  controllers: [SalesLinkController],
  providers: [SalesLinkService],
})
export class SalesLinkModule {}
