import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { SchedulingController } from './scheduling.controller'
import { SchedulingService } from './scheduling.service'
import { SchedulingCronService } from './scheduling.cron.service'
import { GoogleCalendarService } from './google-calendar.service'
import { PrismaModule } from '../prisma/prisma.module'
import { EmailModule } from '../email/email.module'
import { ContactsModule } from '../contacts/contacts.module'

@Module({
  imports: [PrismaModule, EmailModule, ConfigModule, ContactsModule],
  controllers: [SchedulingController],
  providers: [SchedulingService, SchedulingCronService, GoogleCalendarService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
