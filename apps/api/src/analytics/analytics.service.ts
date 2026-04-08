import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../prisma/prisma.service'
import { RedisService } from '../redis/redis.service'
import * as crypto from 'crypto'
import { Prisma } from '@dotly/database'

const ANALYTICS_QUEUE_KEY = 'analytics:events'

interface AnalyticsEventPayload {
  cardId: string
  type: string
  metadata?: Record<string, unknown>
  ip?: string
  country?: string
  device?: string
  referrer?: string
}

interface QueuedEvent {
  cardId: string
  type: string
  metadata?: Record<string, unknown>
  ipHash?: string
  country?: string
  device?: string
  referrer?: string
  createdAt: string
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name)

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async record(event: AnalyticsEventPayload): Promise<void> {
    const ipHash = event.ip
      ? crypto.createHash('sha256').update(event.ip).digest('hex')
      : undefined

    const payload: QueuedEvent = {
      cardId: event.cardId,
      type: event.type,
      metadata: event.metadata ?? {},
      ipHash,
      country: event.country,
      device: event.device,
      referrer: event.referrer,
      createdAt: new Date().toISOString(),
    }

    try {
      const client = this.redis.getClient()
      await client.rpush(ANALYTICS_QUEUE_KEY, JSON.stringify(payload))
    } catch {
      this.logger.warn('Redis unavailable — writing analytics event directly to DB')
      // Verify the card exists before inserting to avoid P2003 FK violation
      const card = await this.prisma.card.findUnique({ where: { id: event.cardId }, select: { id: true } })
      if (!card) {
        this.logger.warn(`Dropping analytics event for non-existent card ${event.cardId}`)
        return
      }
      await this.prisma.analyticsEvent.create({
        data: {
          cardId: event.cardId,
          type: event.type as 'VIEW' | 'CLICK' | 'SAVE' | 'LEAD_SUBMIT',
          metadata: (event.metadata ?? {}) as Prisma.InputJsonValue,
          ipHash,
          country: event.country,
          device: event.device,
          referrer: event.referrer,
        },
      })
    }
  }

  @Cron(CronExpression.EVERY_30_SECONDS)
  async flushAnalyticsQueue(): Promise<void> {
    const client = this.redis.getClient()

    // H-06: Distributed lock — only ONE instance should flush at a time.
    // `SET NX PX` is atomic; if the lock already exists (another pod won it)
    // we skip this tick entirely. TTL is 25 s — just under the 30 s cron
    // interval — so the lock always expires before the next tick even if the
    // holder crashes without releasing it.
    const LOCK_KEY = 'analytics:flush:lock'
    const LOCK_TTL_MS = 25_000
    // ioredis v5 requires the options-object overload: set(key, value, options)
    const locked = await client.set(LOCK_KEY, '1', 'EX', Math.ceil(LOCK_TTL_MS / 1000), 'NX')
    if (!locked) return // Another instance is already flushing

    try {
      const items = await client.lrange(ANALYTICS_QUEUE_KEY, 0, 999)
      if (!items.length) return

      const events = items.map((i) => JSON.parse(i) as QueuedEvent)

      // Guard against P2003: cards may have been deleted after their events were
      // queued in Redis. Fetch the subset of cardIds that actually exist so we
      // never attempt to insert an event whose FK is gone.
      const uniqueCardIds = [...new Set(events.map((e) => e.cardId))]
      const existingCards = await this.prisma.card.findMany({
        where: { id: { in: uniqueCardIds } },
        select: { id: true },
      })
      const validCardIds = new Set(existingCards.map((c) => c.id))

      const validEvents = events.filter((e) => validCardIds.has(e.cardId))
      const staleCount = events.length - validEvents.length
      if (staleCount > 0) {
        this.logger.warn(
          `Dropping ${staleCount} analytics event(s) for deleted card(s): ${
            [...uniqueCardIds].filter((id) => !validCardIds.has(id)).join(', ')
          }`,
        )
      }

      if (validEvents.length > 0) {
        await this.prisma.analyticsEvent.createMany({
          data: validEvents.map((e) => ({
            cardId: e.cardId,
            type: e.type as 'VIEW' | 'CLICK' | 'SAVE' | 'LEAD_SUBMIT',
            metadata: (e.metadata ?? {}) as Prisma.InputJsonValue,
            ipHash: e.ipHash,
            country: e.country,
            device: e.device,
            referrer: e.referrer,
            createdAt: new Date(e.createdAt),
          })),
          skipDuplicates: true,
        })
      }

      // Trim the full batch (valid + stale) from the queue — stale events must
      // not be retried since their card FK no longer exists.
      // lrange + ltrim is intentionally non-atomic: we trim ONLY after a successful
      // DB write so that a DB failure leaves items in Redis for the next cron tick.
      // The distributed lock above ensures only one instance runs this path.
      await client.ltrim(ANALYTICS_QUEUE_KEY, items.length, -1)
      this.logger.log(
        `Flushed ${validEvents.length} analytics events to DB` +
        (staleCount > 0 ? ` (${staleCount} stale events discarded)` : ''),
      )
    } catch (err) {
      this.logger.error('Analytics flush failed', err)
    } finally {
      // Release the lock immediately after we're done (don't wait for TTL)
      await client.del(LOCK_KEY)
    }
  }

  async getSummary(cardId: string, userId: string) {
    const card = await this.prisma.card.findUnique({ where: { id: cardId } })
    if (!card || card.userId !== userId) throw new NotFoundException('Card not found')

    const [totalViews, totalClicks, totalLeads] = await Promise.all([
      this.prisma.analyticsEvent.count({ where: { cardId, type: 'VIEW' } }),
      this.prisma.analyticsEvent.count({ where: { cardId, type: 'CLICK' } }),
      this.prisma.contact.count({ where: { sourceCardId: cardId } }),
    ])

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const recent = await this.prisma.analyticsEvent.findMany({
      where: { cardId, createdAt: { gte: sevenDaysAgo } },
      select: { type: true, createdAt: true },
      // MED-03: Cap at 1000 rows to prevent unbounded memory usage on viral cards.
      // The summary only needs trend data — returning the most recent 1000 events
      // is more than sufficient for a 7-day chart.
      orderBy: { createdAt: 'desc' },
      take: 1000,
    })

    return { totalViews, totalClicks, totalLeads, last7Days: recent }
  }

  async getAnalytics(cardId: string, userId: string, params: {
    from: Date
    to: Date
  }) {
    const card = await this.prisma.card.findUnique({ where: { id: cardId } })
    if (!card || card.userId !== userId) throw new ForbiddenException()

    const where = { cardId, createdAt: { gte: params.from, lte: params.to } }

    const [allEvents, contacts] = await Promise.all([
      this.prisma.analyticsEvent.findMany({
        where,
        select: { type: true, createdAt: true, device: true, country: true, referrer: true, metadata: true, ipHash: true },
        orderBy: { createdAt: 'desc' },
        take: 5000, // Cap to prevent unbounded memory usage on high-traffic cards
      }),
      this.prisma.contact.count({ where: { sourceCardId: cardId, createdAt: { gte: params.from, lte: params.to } } }),
    ])

    const views = allEvents.filter(e => e.type === 'VIEW')
    const clicks = allEvents.filter(e => e.type === 'CLICK')

    // Group views by day
    const viewsByDay = groupByDay(views, params.from, params.to)
    const clicksByDay = groupByDay(clicks, params.from, params.to)

    // Device breakdown
    const deviceCounts: Record<string, number> = {}
    allEvents.forEach(e => { const d = e.device || 'unknown'; deviceCounts[d] = (deviceCounts[d] || 0) + 1 })

    // Country breakdown
    const countryCounts: Record<string, number> = {}
    views.forEach(e => { const c = e.country || 'unknown'; countryCounts[c] = (countryCounts[c] || 0) + 1 })

    // Referrer breakdown
    const referrerCounts: Record<string, number> = {}
    views.forEach(e => { const r = e.referrer || 'direct'; referrerCounts[r] = (referrerCounts[r] || 0) + 1 })

    // Click breakdown by link
    const clicksByLink: Record<string, number> = {}
    clicks.forEach(e => {
      const meta = e.metadata as Record<string, unknown>
      const platform = (meta.platform as string) || 'unknown'
      clicksByLink[platform] = (clicksByLink[platform] || 0) + 1
    })

    const uniqueVisitors = new Set(views.map(e => e.ipHash).filter(Boolean)).size

    return {
      summary: {
        totalViews: views.length,
        totalClicks: clicks.length,
        totalLeads: contacts,
        uniqueVisitors,
        conversionRate: views.length > 0 ? ((contacts / views.length) * 100).toFixed(1) : '0',
      },
      charts: {
        viewsByDay,
        clicksByDay,
        deviceBreakdown: Object.entries(deviceCounts).map(([name, value]) => ({ name, value })),
        countryBreakdown: Object.entries(countryCounts).sort((a,b) => b[1]-a[1]).slice(0,10).map(([name, value]) => ({ name, value })),
        clicksByLink: Object.entries(clicksByLink).map(([name, value]) => ({ name, value })),
        referrers: Object.entries(referrerCounts).sort((a,b) => b[1]-a[1]).slice(0,10).map(([name, value]) => ({ name, value })),
      },
    }
  }
}

function groupByDay(events: { createdAt: Date }[], from: Date, to: Date) {
  const counts = new Map<string, number>()
  for (const event of events) {
    // L-02: Guard against invalid Date objects (e.g. from bad DB data or
    // clock skew). isNaN(date.getTime()) catches Invalid Date without throwing.
    // Previously the code used `?? ''` which silently bucketed corrupt dates
    // under an empty-string key, producing a phantom '' entry in the chart.
    const iso = event.createdAt instanceof Date && !isNaN(event.createdAt.getTime())
      ? event.createdAt.toISOString().split('T')[0]
      : null
    if (!iso) continue // skip events with invalid dates entirely
    counts.set(iso, (counts.get(iso) ?? 0) + 1)
  }

  const days: { date: string; count: number }[] = []
  const current = new Date(from)
  while (current <= to) {
    const dateStr = current.toISOString().split('T')[0] ?? ''
    days.push({ date: dateStr, count: counts.get(dateStr) ?? 0 })
    current.setDate(current.getDate() + 1)
  }
  return days
}
