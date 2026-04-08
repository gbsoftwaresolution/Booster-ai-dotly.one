import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { ContactsController } from './contacts.controller'
import { ContactsService } from './contacts.service'
import { AnalyticsModule } from '../analytics/analytics.module'
import { AiModule } from '../ai/ai.module'
import { NotificationsModule } from '../notifications/notifications.module'

@Module({
  imports: [
    AnalyticsModule,
    AiModule,
    NotificationsModule,
    // Re-register so @InjectQueue('contact-enrichment') is available in ContactsService
    BullModule.registerQueue({ name: 'contact-enrichment' }),
  ],
  controllers: [ContactsController],
  providers: [ContactsService],
  exports: [ContactsService],
})
export class ContactsModule {}
