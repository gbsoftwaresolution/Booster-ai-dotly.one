import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { BullModule } from '@nestjs/bull'
import { ObservabilityService } from './observability.service'
import { RequestContextMiddleware } from './request-context.middleware'
import { RequestLoggingInterceptor } from './request-logging.interceptor'
import { MetricsController } from './metrics.controller'
import { QueueMetricsService } from './queue-metrics.service'
import { DOMAIN_VERIFICATION_QUEUE } from '../../custom-domains/domain-verification.processor'

@Module({
  imports: [
    BullModule.registerQueue({ name: 'contact-enrichment' }),
    BullModule.registerQueue({ name: DOMAIN_VERIFICATION_QUEUE }),
  ],
  controllers: [MetricsController],
  providers: [
    ObservabilityService,
    QueueMetricsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
  ],
  exports: [ObservabilityService],
})
export class ObservabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*')
  }
}
