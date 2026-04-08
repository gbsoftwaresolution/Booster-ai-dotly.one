import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { ConfigModule } from '@nestjs/config'
import { AiService } from './ai.service'
import { AiController } from './ai.controller'
import { ContactEnrichmentProcessor } from './contact-enrichment.processor'

@Module({
  imports: [
    ConfigModule,
    BullModule.registerQueue({
      name: 'contact-enrichment',
    }),
  ],
  controllers: [AiController],
  providers: [AiService, ContactEnrichmentProcessor],
  exports: [AiService, BullModule],
})
export class AiModule {}
