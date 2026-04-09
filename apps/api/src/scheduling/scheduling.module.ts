import { Module } from '@nestjs/common'
import { SchedulingController } from './scheduling.controller'
import { SchedulingService } from './scheduling.service'
import { SchedulingCronService } from './scheduling.cron.service'
import { PrismaModule } from '../prisma/prisma.module'
import { EmailModule } from '../email/email.module'

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [SchedulingController],
  providers: [SchedulingService, SchedulingCronService],
  exports: [SchedulingService],
})
export class SchedulingModule {}
