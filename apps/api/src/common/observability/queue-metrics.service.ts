import { InjectQueue } from '@nestjs/bull'
import { Injectable } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import type { Queue } from 'bull'
import { ObservabilityService } from './observability.service'
import { DOMAIN_VERIFICATION_QUEUE } from '../../custom-domains/domain-verification.processor'

@Injectable()
export class QueueMetricsService {
  constructor(
    private readonly observability: ObservabilityService,
    @InjectQueue('contact-enrichment') private readonly contactEnrichmentQueue: Queue,
    @InjectQueue(DOMAIN_VERIFICATION_QUEUE) private readonly domainVerificationQueue: Queue,
  ) {}

  @Cron('*/30 * * * * *')
  async sampleQueueBacklog(): Promise<void> {
    await Promise.all([
      this.sampleQueue('contact-enrichment', this.contactEnrichmentQueue),
      this.sampleQueue(DOMAIN_VERIFICATION_QUEUE, this.domainVerificationQueue),
    ])
  }

  private async sampleQueue(name: string, queue: Queue): Promise<void> {
    const [waiting, active, delayed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getDelayedCount(),
      queue.getFailedCount(),
    ])

    this.observability.setQueueBacklog(name, 'waiting', waiting)
    this.observability.setQueueBacklog(name, 'active', active)
    this.observability.setQueueBacklog(name, 'delayed', delayed)
    this.observability.setQueueBacklog(name, 'failed', failed)
  }
}
