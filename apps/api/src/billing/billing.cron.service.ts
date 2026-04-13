import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { Plan } from '@dotly/types'
import { BillingService } from './billing.service'
import { PrismaService } from '../prisma/prisma.service'
import { AuditService } from '../audit/audit.service'

@Injectable()
export class BillingCronService {
  private readonly logger = new Logger(BillingCronService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly billing: BillingService,
    private readonly audit: AuditService,
  ) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async revokeRefundedPayments(): Promise<void> {
    const activeSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        chainId: 42161,
        txHash: { not: null },
      },
      select: {
        userId: true,
        plan: true,
        boosterAiOrderId: true,
        txHash: true,
      },
    })

    for (const subscription of activeSubscriptions) {
      if (!subscription.txHash) continue

      try {
        const payment = await this.billing.readRecordedPaymentByTxHash(subscription.txHash)
        if (!payment || Number(payment.status) !== 2) continue

        await this.prisma.subscription.update({
          where: { userId: subscription.userId },
          data: {
            status: 'CANCELLED',
            plan: Plan.FREE,
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
          },
        })
        await this.prisma.user.update({
          where: { id: subscription.userId },
          data: { plan: Plan.FREE },
        })

        void this.audit
          .log({
            userId: subscription.userId,
            action: 'billing.checkout.refunded',
            resourceType: 'subscription',
            metadata: {
              txHash: subscription.txHash,
              previousPlan: subscription.plan,
            },
          })
          .catch(() => void 0)
      } catch (error) {
        this.logger.warn(
          `Failed to sync refund state for user ${subscription.userId}: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }
  }
}
