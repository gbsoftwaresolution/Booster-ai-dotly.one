import { Processor, Process } from '@nestjs/bull'
import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectQueue as InjectBullQueue } from '@nestjs/bull'
import type { Queue, Job } from 'bull'
import { CustomDomainsService } from './custom-domains.service'

export const DOMAIN_VERIFICATION_QUEUE = 'domain-verification'
export const DOMAIN_POLL_JOB = 'poll-pending-domains'

@Processor(DOMAIN_VERIFICATION_QUEUE)
export class DomainVerificationProcessor {
  constructor(private readonly svc: CustomDomainsService) {}

  @Process(DOMAIN_POLL_JOB)
  async handlePoll(_job: Job) {
    await this.svc.recheckPendingDomains()
  }
}

@Injectable()
export class DomainVerificationScheduler implements OnModuleInit {
  private readonly logger = new Logger(DomainVerificationScheduler.name)

  constructor(
    @InjectBullQueue(DOMAIN_VERIFICATION_QUEUE)
    private readonly queue: Queue,
  ) {}

  async onModuleInit() {
    try {
      // Remove any stale repeatable jobs to avoid duplicates on restart
      const repeatableJobs = await this.queue.getRepeatableJobs()
      for (const job of repeatableJobs) {
        if (job.name === DOMAIN_POLL_JOB) {
          await this.queue.removeRepeatableByKey(job.key)
        }
      }

      // Schedule repeatable job every 5 minutes
      await this.queue.add(
        DOMAIN_POLL_JOB,
        {},
        {
          repeat: { every: 5 * 60 * 1000 }, // 5 minutes in ms
          removeOnComplete: true,
          removeOnFail: false,
        },
      )
    } catch (err) {
      // Do not crash bootstrap if Redis is temporarily unavailable.
      // The scheduler will be missing until the next deploy/restart, but
      // the rest of the application will continue to function normally.
      this.logger.error(
        'Failed to register domain-verification repeatable job — Redis may be unavailable',
        err instanceof Error ? err.stack : String(err),
      )
    }
  }
}
