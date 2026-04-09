import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service'
import { EmailService } from '../email/email.service'
import { BookingStatus } from '@dotly/database'

@Injectable()
export class SchedulingCronService {
  private readonly logger = new Logger(SchedulingCronService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  /**
   * Runs every 10 minutes.
   * Finds confirmed bookings starting in 23–25 hours that have not yet
   * received a reminder email, sends the reminder, then stamps reminderSentAt.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async sendReminders(): Promise<void> {
    const now = new Date()
    const windowStart = new Date(now.getTime() + 23 * 60 * 60_000)
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60_000)

    const bookings = await this.prisma.booking.findMany({
      where: {
        status: BookingStatus.CONFIRMED,
        startAt: { gte: windowStart, lte: windowEnd },
        reminderSentAt: null,
      },
      include: {
        appointmentType: {
          select: {
            name: true,
            durationMins: true,
            location: true,
            description: true,
            timezone: true,
          },
        },
      },
    })

    if (!bookings.length) return
    this.logger.log(`Sending ${bookings.length} reminder email(s)`)

    // FIX-J: batch-fetch all owners in a single query instead of N individual
    // queries inside the loop (N+1 problem that adds latency for every booking).
    const ownerIds = [...new Set(bookings.map((b) => b.ownerUserId))]
    const owners = await this.prisma.user.findMany({
      where: { id: { in: ownerIds } },
      select: { id: true, email: true, name: true },
    })
    const ownerMap = new Map(owners.map((o) => [o.id, o]))

    for (const booking of bookings) {
      const owner = ownerMap.get(booking.ownerUserId)
      if (!owner) continue

      try {
        // MED-4: Atomically claim this booking for reminder sending by setting
        // reminderSentAt only if it is still NULL.  In a multi-pod deployment
        // without this guard, two pods running concurrently can both select the
        // same booking (reminderSentAt = null), both send the email, and then
        // both stamp reminderSentAt — resulting in duplicate reminder emails.
        // Using updateMany with a WHERE reminderSentAt IS NULL filter ensures
        // only one pod "wins" the claim; the other gets count = 0 and skips.
        const claimed = await this.prisma.booking.updateMany({
          where: { id: booking.id, reminderSentAt: null },
          data: { reminderSentAt: new Date() },
        })
        if (claimed.count === 0) {
          // Another pod already claimed this reminder
          continue
        }

        // HIGH-3: sendBookingReminderToGuest returns boolean (true=sent, false=all
        // providers failed).  If it returns false without throwing, treat it as a
        // failure so the catch block rolls back the claim and retries next tick.
        const sent = await this.email.sendBookingReminderToGuest(
          booking,
          booking.appointmentType,
          owner,
        )
        if (!sent) throw new Error('All email providers failed — will retry')
      } catch (err) {
        this.logger.warn(`Failed to send reminder for booking ${booking.id}: ${String(err)}`)
        // Roll back the claim so it can be retried on the next cron tick
        await this.prisma.booking
          .update({
            where: { id: booking.id },
            data: { reminderSentAt: null },
          })
          .catch(() => undefined)
      }
    }
  }
}
