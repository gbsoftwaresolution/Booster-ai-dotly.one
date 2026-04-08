import { Module } from '@nestjs/common'
import { CardsController } from './cards.controller'
import { CardsService } from './cards.service'
import { QrController } from './qr.controller'
import { AuditModule } from '../audit/audit.module'

@Module({
  imports: [AuditModule],
  controllers: [CardsController, QrController],
  providers: [CardsService],
  exports: [CardsService],
})
export class CardsModule {}
