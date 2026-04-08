import { Module } from '@nestjs/common'
import { LeadFormController } from './lead-form.controller'
import { LeadFormService } from './lead-form.service'

@Module({
  controllers: [LeadFormController],
  providers: [LeadFormService],
  exports: [LeadFormService],
})
export class LeadFormModule {}
