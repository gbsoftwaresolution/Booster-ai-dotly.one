import { Controller, Get, Header } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Public } from '../../auth/decorators/public.decorator'
import { ObservabilityService } from './observability.service'

@ApiTags('observability')
@Controller()
export class MetricsController {
  constructor(private readonly observability: ObservabilityService) {}

  @Public()
  @Get('metrics')
  @Header('Cache-Control', 'no-store')
  async getMetrics(): Promise<string> {
    return this.observability.getMetrics()
  }
}
