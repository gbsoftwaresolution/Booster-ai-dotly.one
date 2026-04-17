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

interface AnalyticsActionSummary {
  totalBookingsStarted: number
  totalBookingsCompleted: number
  totalWhatsappClicks: number
  totalLeadCaptureOpens: number
  totalLeadSubmissions: number
  totalDepositStarts: number
  totalDepositCompletions: number
  totalPaymentStarts: number
  totalPaymentCompletions: number
}

export interface NameValuePair {
  name: string
  value: number
}

function collectInteractionBreakdown(
  events: Array<{ type: string; metadata: Prisma.JsonValue | null }>,
): NameValuePair[] {
  const interactionsByAction: Record<string, number> = {}
  const relevant = events.filter((e) => e.type === 'CLICK' || e.type === 'SAVE')
  relevant.forEach((e) => {
    const meta = (e.metadata ?? {}) as Record<string, unknown>
    const action = meta['action'] as string | undefined
    if (!action) return
    interactionsByAction[action] = (interactionsByAction[action] || 0) + 1
  })
  return Object.entries(interactionsByAction)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }))
}

function summarizeActions(
  events: Array<{ type: string; metadata: Prisma.JsonValue | null }>,
): AnalyticsActionSummary {
  const summary: AnalyticsActionSummary = {
    totalBookingsStarted: 0,
    totalBookingsCompleted: 0,
    totalWhatsappClicks: 0,
    totalLeadCaptureOpens: 0,
    totalLeadSubmissions: 0,
    totalDepositStarts: 0,
    totalDepositCompletions: 0,
    totalPaymentStarts: 0,
    totalPaymentCompletions: 0,
  }

  events.forEach((event) => {
    const meta = (event.metadata ?? {}) as Record<string, unknown>
    const action = typeof meta['action'] === 'string' ? meta['action'] : ''
    switch (action) {
      case 'open_booking_page':
      case 'booking_started':
        summary.totalBookingsStarted += 1
        break
      case 'booking_completed':
        summary.totalBookingsCompleted += 1
        break
      case 'whatsapp_clicked':
        summary.totalWhatsappClicks += 1
        break
      case 'open_lead_capture':
        summary.totalLeadCaptureOpens += 1
        break
      case 'lead_submitted':
        summary.totalLeadSubmissions += 1
        break
      case 'deposit_started':
        summary.totalDepositStarts += 1
        break
      case 'deposit_completed':
        summary.totalDepositCompletions += 1
        break
      case 'payment_started':
        summary.totalPaymentStarts += 1
        break
      case 'payment_completed':
        summary.totalPaymentCompletions += 1
        break
      default:
        break
    }
  })

  return summary
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
    const ipHash = event.ip ? crypto.createHash('sha256').update(event.ip).digest('hex') : undefined

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
      await this.invalidateDashboardCacheByCardId(event.cardId)
    } catch {
      this.logger.warn('Redis unavailable — writing analytics event directly to DB')
      // Verify the card exists before inserting to avoid P2003 FK violation
      const card = await this.prisma.card.findUnique({
        where: { id: event.cardId },
        select: { id: true },
      })
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
      await this.invalidateDashboardCacheByCardId(event.cardId)
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
    // SEC-02: Use a random token as the lock value so only the instance that
    // acquired the lock can release it. A blind del(LOCK_KEY) would release a
    // lock held by a different pod if this instance's del races with a new
    // lock acquisition after TTL expiry. The compare-and-delete is implemented
    // with a Lua script (atomic eval) to avoid a TOCTOU race between GET and DEL.
    const lockToken = crypto.randomBytes(16).toString('hex')
    // ioredis v5 requires the options-object overload: set(key, value, options)
    const locked = await client.set(LOCK_KEY, lockToken, 'EX', Math.ceil(LOCK_TTL_MS / 1000), 'NX')
    if (!locked) return // Another instance is already flushing

    try {
      const items = await client.lrange(ANALYTICS_QUEUE_KEY, 0, 999)
      if (!items.length) return

      // Guard against malformed JSON — one bad Redis payload must not abort the
      // entire batch. Skip unparseable items and log them for investigation.
      const events: QueuedEvent[] = []
      for (const raw of items) {
        try {
          events.push(JSON.parse(raw) as QueuedEvent)
        } catch {
          this.logger.warn(`Dropping malformed analytics queue entry: ${raw.slice(0, 120)}`)
        }
      }

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
          `Dropping ${staleCount} analytics event(s) for deleted card(s): ${[...uniqueCardIds]
            .filter((id) => !validCardIds.has(id))
            .join(', ')}`,
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

        // Keep dashboard interaction widgets reasonably fresh after queue flush.
        const affectedCardIds = [...new Set(validEvents.map((e) => e.cardId))]
        await Promise.all(
          affectedCardIds.map((cardId) => this.invalidateDashboardCacheByCardId(cardId)),
        )
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
      // SEC-02: Release only if we still own the lock. The Lua script atomically
      // compares the stored value to our token and deletes only on match — this
      // prevents accidentally releasing a lock acquired by another pod after our
      // TTL expired while we were still processing (e.g. a slow DB write).
      const releaseLua = `
        if redis.call("GET", KEYS[1]) == ARGV[1] then
          return redis.call("DEL", KEYS[1])
        else
          return 0
        end`
      await client.eval(releaseLua, 1, LOCK_KEY, lockToken)
    }
  }

  private async resolveInternalUserId(userId: string): Promise<string> {
    const byId = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    if (byId) return byId.id
    throw new ForbiddenException('Authenticated user not found')
  }

  private isMissingContactSourceCardColumnError(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2022') {
      return false
    }

    const column =
      error.meta && typeof error.meta === 'object' && 'column' in error.meta
        ? String(error.meta.column)
        : ''

    return column === 'contacts.sourceCardId'
  }

  private async countLeadsForCard(
    cardId: string,
    createdAt?: { gte: Date; lte: Date },
  ): Promise<number> {
    try {
      return await this.prisma.contact.count({
        where: {
          sourceCardId: cardId,
          ...(createdAt ? { createdAt } : {}),
        },
      })
    } catch (error) {
      if (!this.isMissingContactSourceCardColumnError(error)) throw error

      this.logger.warn(
        'contacts.sourceCardId column missing; returning 0 leads for analytics until migrations are applied',
      )
      return 0
    }
  }

  async getSummary(cardId: string, userId: string) {
    const internalUserId = await this.resolveInternalUserId(userId)
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      select: { id: true, userId: true },
    })
    if (!card || card.userId !== internalUserId) throw new NotFoundException('Card not found')

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    // Run all queries in parallel:
    //   1. eventTotals  — accurate total counts (no row cap, pure SQL COUNT)
    //   2. viewsByDayRaw  — 7-day VIEW trend, grouped by day in SQL (not in Node.js)
    //   3. clicksByDayRaw — 7-day CLICK trend, grouped by day in SQL
    //   4. totalLeads   — contact count
    //
    // Previously the 7-day trend was computed by fetching up to 1000 raw events and
    // grouping in JavaScript. On viral cards with >1000 events in 7 days the chart
    // data was wrong (undercounted). We now group by date in SQL using $queryRaw so
    // accuracy is never limited by a row cap.
    const [eventTotals, viewsByDayRaw, clicksByDayRaw, totalLeads] = await Promise.all([
      this.prisma.analyticsEvent.groupBy({
        by: ['type'],
        where: { cardId, type: { in: ['VIEW', 'CLICK'] } },
        _count: { _all: true },
      }),
      // GROUP BY DATE in Postgres — one row per day, no per-row fetch.
      // TZ-01: Use DATE("createdAt" AT TIME ZONE 'UTC') to make the timezone
      // explicit. Postgres uses the server timezone by default; specifying UTC
      // ensures consistent bucketing regardless of server locale. Pass a user
      // timezone here in the future when frontend sends a tz param.
      this.prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT DATE("createdAt" AT TIME ZONE 'UTC')::text AS date, COUNT(*)::bigint AS count
        FROM "analytics_events"
        WHERE "cardId" = ${cardId}
          AND "type" = 'VIEW'
          AND "createdAt" >= ${sevenDaysAgo}
        GROUP BY DATE("createdAt" AT TIME ZONE 'UTC')
        ORDER BY DATE("createdAt" AT TIME ZONE 'UTC')
      `,
      this.prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT DATE("createdAt" AT TIME ZONE 'UTC')::text AS date, COUNT(*)::bigint AS count
        FROM "analytics_events"
        WHERE "cardId" = ${cardId}
          AND "type" = 'CLICK'
          AND "createdAt" >= ${sevenDaysAgo}
        GROUP BY DATE("createdAt" AT TIME ZONE 'UTC')
        ORDER BY DATE("createdAt" AT TIME ZONE 'UTC')
      `,
      this.countLeadsForCard(cardId),
    ])

    const countByType = new Map(eventTotals.map((r) => [r.type, r._count._all]))
    const totalViews = countByType.get('VIEW') ?? 0
    const totalClicks = countByType.get('CLICK') ?? 0

    // Postgres returns count as bigint — convert to number and fill missing days
    const viewsByDay = fillDays(
      viewsByDayRaw.map((r) => ({ date: r.date, count: Number(r.count) })),
      sevenDaysAgo,
      new Date(),
    )
    const clicksByDay = fillDays(
      clicksByDayRaw.map((r) => ({ date: r.date, count: Number(r.count) })),
      sevenDaysAgo,
      new Date(),
    )

    const recentInteractionEvents = await this.prisma.analyticsEvent.findMany({
      where: {
        cardId,
        type: { in: ['CLICK', 'SAVE', 'LEAD_SUBMIT'] },
      },
      select: {
        type: true,
        metadata: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5000,
    })

    const actionSummary = summarizeActions(recentInteractionEvents)

    return { totalViews, totalClicks, totalLeads, viewsByDay, clicksByDay, ...actionSummary }
  }

  async getAnalytics(
    cardId: string,
    userId: string,
    params: {
      from: Date
      to: Date
    },
  ) {
    const internalUserId = await this.resolveInternalUserId(userId)
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      select: { id: true, userId: true },
    })
    if (!card || card.userId !== internalUserId) throw new NotFoundException('Card not found')

    const where = { cardId, createdAt: { gte: params.from, lte: params.to } }

    // Run all three DB queries in parallel:
    //   1. allEvents — event rows for in-memory aggregation (no ipHash — not needed here)
    //   2. contacts  — lead count over the same date range
    //   3. uniqueVisitorResult — COUNT DISTINCT ipHash for unique-visitor metric
    // Run five queries in parallel:
    //  1. allEvents — capped at 5000 rows, used ONLY for chart/breakdown aggregations
    //  2. contacts  — accurate lead count for the period
    //  3. uniqueVisitorResult — SELECT DISTINCT ipHash (accurate, not capped)
    //  4. exactCounts — accurate total view + click COUNTs via groupBy (not subject to the 5000 cap)
    //
    // totalViews/totalClicks are taken from (4), not from allEvents.length, so
    // high-traffic cards with >5000 events in the range get correct summary numbers.
    const [allEvents, contacts, uniqueVisitorResult, exactCounts] = await Promise.all([
      this.prisma.analyticsEvent.findMany({
        where,
        // ipHash is NOT selected here — it is only needed for uniqueVisitors
        // and fetching it on 5000 rows wastes significant bandwidth.
        select: {
          type: true,
          createdAt: true,
          device: true,
          country: true,
          referrer: true,
          metadata: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5000, // Cap for in-memory breakdown aggregation — totals use exactCounts below
      }),
      this.countLeadsForCard(cardId, { gte: params.from, lte: params.to }),
      // COUNT DISTINCT ipHash in SQL — avoids pulling thousands of hash rows
      // into application memory just to count them. Prisma doesn't have a native
      // countDistinct API, so we use $queryRaw with a parameterised query.
      this.prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(DISTINCT "ipHash")::bigint AS count
        FROM "analytics_events"
        WHERE "cardId" = ${cardId}
          AND "type" = 'VIEW'
          AND "ipHash" IS NOT NULL
          AND "createdAt" >= ${params.from}
          AND "createdAt" <= ${params.to}
      `,
      // Accurate VIEW + CLICK totals in SQL — not affected by the 5000-row cap
      this.prisma.analyticsEvent.groupBy({
        by: ['type'],
        where: { ...where, type: { in: ['VIEW', 'CLICK'] } },
        _count: { _all: true },
      }),
    ])
    const uniqueVisitors = uniqueVisitorResult[0] ? Number(uniqueVisitorResult[0].count) : 0

    const countByType = new Map(exactCounts.map((r) => [r.type, r._count._all]))
    const totalViews = countByType.get('VIEW') ?? 0
    const totalClicks = countByType.get('CLICK') ?? 0

    const views = allEvents.filter((e) => e.type === 'VIEW')
    const clicks = allEvents.filter((e) => e.type === 'CLICK')

    // Group views by day
    const viewsByDay = groupByDay(views, params.from, params.to)
    const clicksByDay = groupByDay(clicks, params.from, params.to)

    // Device breakdown — uses VIEW events only so we measure visitor devices,
    // not click-inflated counts (a user who clicks many links would otherwise
    // skew the breakdown toward their device type).
    const deviceCounts: Record<string, number> = {}
    views.forEach((e) => {
      const d = e.device || 'unknown'
      deviceCounts[d] = (deviceCounts[d] || 0) + 1
    })

    // Country breakdown
    const countryCounts: Record<string, number> = {}
    views.forEach((e) => {
      const c = e.country || 'unknown'
      countryCounts[c] = (countryCounts[c] || 0) + 1
    })

    // Referrer breakdown
    const referrerCounts: Record<string, number> = {}
    views.forEach((e) => {
      const r = e.referrer || 'direct'
      referrerCounts[r] = (referrerCounts[r] || 0) + 1
    })

    // Click breakdown by link
    // The public analytics DTO names this field 'linkPlatform'; legacy events
    // may have stored it as 'platform'. Check both to handle either schema.
    const clicksByLink: Record<string, number> = {}
    clicks.forEach((e) => {
      const meta = e.metadata as Record<string, unknown>
      const platform = (meta['linkPlatform'] as string) || (meta['platform'] as string)
      if (!platform) return
      clicksByLink[platform] = (clicksByLink[platform] || 0) + 1
    })

    // Interaction breakdown across richer metadata events.
    // We intentionally use both CLICK and SAVE because newer public-card actions
    // are stored as metadata on those existing event types to avoid a schema migration.
    const interactionsByAction = collectInteractionBreakdown(allEvents)
    const actionSummary = summarizeActions(allEvents)

    return {
      summary: {
        totalViews,
        totalClicks,
        totalLeads: contacts,
        uniqueVisitors,
        ...actionSummary,
        // Use accurate SQL counts for conversion rate so high-traffic cards with
        // >5000 events in range get the right ratio, not one from a truncated set.
        conversionRate: totalViews > 0 ? Math.round((contacts / totalViews) * 1000) / 10 : 0,
      },
      charts: {
        viewsByDay,
        clicksByDay,
        deviceBreakdown: Object.entries(deviceCounts).map(([name, value]) => ({ name, value })),
        countryBreakdown: Object.entries(countryCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([name, value]) => ({ name, value })),
        clicksByLink: Object.entries(clicksByLink).map(([name, value]) => ({ name, value })),
        interactionsByAction,
        referrers: Object.entries(referrerCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([name, value]) => ({ name, value })),
      },
    }
  }
  // Dashboard aggregate: total views, clicks, leads, cards, and active cards
  // across all of a user's cards — returned in a single query set.
  //
  // Design notes:
  //   • Redis-cached for 60 s to avoid hitting the DB on every dashboard load.
  //     The cache key is scoped to the internal userId so users never see each
  //     other's data. TTL is short enough that new cards / events are visible
  //     within a minute.
  //   • totalCards uses a DB COUNT (not cards.length) so it is accurate even
  //     when the user has more than 100 cards.
  //   • Views + clicks are retrieved with a single groupBy query instead of two
  //     separate COUNT queries.
  //   • truncated is retained for backwards compat but is now derived from
  //     comparing totalCards to the 100-card display cap.
  async getDashboardSummary(userId: string): Promise<{
    totalViews: number
    totalClicks: number
    totalLeads: number
    totalBookingsStarted: number
    totalBookingsCompleted: number
    totalWhatsappClicks: number
    totalLeadCaptureOpens: number
    totalLeadSubmissions: number
    totalDepositStarts: number
    totalDepositCompletions: number
    totalPaymentStarts: number
    totalPaymentCompletions: number
    totalCards: number
    activeCards: number
    openDealsCount: number
    openPipelineValue: number
    pendingTasksCount: number
    overdueTasksCount: number
    interactionsByAction: NameValuePair[]
    truncated: boolean
  }> {
    const internalUserId = await this.resolveInternalUserId(userId)

    // ── Redis cache ───────────────────────────────────────────────────────────
    const CACHE_KEY = `analytics:dashboard:${internalUserId}`
    const CACHE_TTL_SECONDS = 60
    try {
      const cached = await this.redis.getClient().get(CACHE_KEY)
      if (cached) {
        return JSON.parse(cached) as Awaited<ReturnType<typeof this.getDashboardSummary>>
      }
    } catch {
      // Redis unavailable — fall through to DB
    }

    // ── Counts + aggregates across ALL user cards ───────────────────────────
    // Previously capped at 100 cards, silently undercounting users with large
    // portfolios. We now use a single subquery / nested filter so totalViews,
    // totalClicks, and totalLeads reflect every card the user owns.
    const [
      totalCards,
      activeCards,
      eventCounts,
      leadCount,
      openDeals,
      pendingTasksCount,
      overdueTasksCount,
      recentEvents,
    ] = await Promise.all([
      this.prisma.card.count({ where: { userId: internalUserId } }),
      this.prisma.card.count({ where: { userId: internalUserId, isActive: true } }),
      this.prisma.analyticsEvent.groupBy({
        by: ['type'],
        where: {
          type: { in: ['VIEW', 'CLICK'] },
          card: { userId: internalUserId },
        },
        _count: { _all: true },
      }),
      this.prisma.contact.count({ where: { sourceCard: { userId: internalUserId } } }),
      this.prisma.deal.aggregate({
        where: {
          ownerUserId: userId,
          stage: { notIn: ['CLOSED_WON', 'CLOSED_LOST'] },
        },
        _count: { _all: true },
        _sum: { value: true },
      }),
      this.prisma.contactTask.count({
        where: {
          ownerUserId: userId,
          completed: false,
        },
      }),
      this.prisma.contactTask.count({
        where: {
          ownerUserId: userId,
          completed: false,
          dueAt: { lt: new Date() },
        },
      }),
      this.prisma.analyticsEvent.findMany({
        where: {
          type: { in: ['CLICK', 'SAVE'] },
          card: { userId: internalUserId },
        },
        select: {
          type: true,
          metadata: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5000,
      }),
    ])

    const countByType = new Map(eventCounts.map((r) => [r.type, r._count._all]))

    const actionSummary = summarizeActions(recentEvents)

    const result = {
      totalViews: countByType.get('VIEW') ?? 0,
      totalClicks: countByType.get('CLICK') ?? 0,
      totalLeads: leadCount,
      ...actionSummary,
      totalCards,
      activeCards,
      openDealsCount: openDeals._count._all,
      openPipelineValue: Number(openDeals._sum.value ?? 0),
      pendingTasksCount,
      overdueTasksCount,
      interactionsByAction: collectInteractionBreakdown(recentEvents),
      truncated: false, // All cards are now aggregated — never truncated
    }

    // Cache the result
    try {
      await this.redis.getClient().set(CACHE_KEY, JSON.stringify(result), 'EX', CACHE_TTL_SECONDS)
    } catch {
      /* ignore */
    }

    return result
  }

  // Invalidate the dashboard summary cache when cards change (called by CardsService
  // hooks for create/delete/duplicate so the next load reflects the latest state).
  async invalidateDashboardCache(userId: string): Promise<void> {
    try {
      await this.redis.getClient().del(`analytics:dashboard:${userId}`)
    } catch {
      // Redis unavailable — cache will expire naturally
    }
  }

  async invalidateDashboardCacheByCardId(cardId: string): Promise<void> {
    try {
      const card = await this.prisma.card.findUnique({
        where: { id: cardId },
        select: { userId: true },
      })
      if (!card) return
      await this.invalidateDashboardCache(card.userId)
    } catch {
      // Best-effort cache invalidation only
    }
  }
}

// fillDays: merge pre-aggregated { date, count } rows from SQL into a full
// consecutive day series — filling zeros for days with no events.
// TZ-01: Uses toISOString() (UTC) to generate the key series, which must match
// the DATE("createdAt" AT TIME ZONE 'UTC') used in the SQL queries that produce
// the input rows. Both must agree on timezone or zero-fill days will be wrong.
function fillDays(
  rows: { date: string; count: number }[],
  from: Date,
  to: Date,
): { date: string; count: number }[] {
  const map = new Map(rows.map((r) => [r.date, r.count]))
  const days: { date: string; count: number }[] = []
  const current = new Date(from)
  while (current <= to) {
    const dateStr = current.toISOString().split('T')[0] ?? '' // UTC date
    days.push({ date: dateStr, count: map.get(dateStr) ?? 0 })
    current.setDate(current.getDate() + 1)
  }
  return days
}

// TZ-01: groupByDay buckets events by UTC date (toISOString uses UTC).
// This is consistent with the SQL DATE("createdAt" AT TIME ZONE 'UTC') used in
// getSummary. Both functions must bucket by the same timezone or the in-memory
// and SQL charts will show different data. When user-timezone support is added,
// both functions should accept a `tz` string and apply the same offset.
function groupByDay(events: { createdAt: Date }[], from: Date, to: Date) {
  const counts = new Map<string, number>()
  for (const event of events) {
    // L-02: Guard against invalid Date objects (e.g. from bad DB data or
    // clock skew). isNaN(date.getTime()) catches Invalid Date without throwing.
    // Previously the code used `?? ''` which silently bucketed corrupt dates
    // under an empty-string key, producing a phantom '' entry in the chart.
    const iso =
      event.createdAt instanceof Date && !isNaN(event.createdAt.getTime())
        ? event.createdAt.toISOString().split('T')[0] // UTC date — matches SQL AT TIME ZONE 'UTC'
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
