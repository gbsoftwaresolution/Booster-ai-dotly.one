import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { ThrottlerGuard, Throttle } from '@nestjs/throttler'
import { Public } from '../auth/decorators/public.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { AnalyticsService } from './analytics.service'
import { PrismaService } from '../prisma/prisma.service'
import { BillingService } from '../billing/billing.service'
import {
  IsString,
  IsIn,
  IsOptional,
  IsDateString,
  ValidateNested,
  IsObject,
  MaxLength,
} from 'class-validator'
import { Type } from 'class-transformer'
import type { Request } from 'express'
import { Plan } from '@dotly/types'

const VALID_EVENT_TYPES = ['VIEW', 'CLICK', 'SAVE', 'LEAD_SUBMIT'] as const
type EventType = (typeof VALID_EVENT_TYPES)[number]

// HIGH-02: Strict allowlisted metadata schema for the @Public analytics endpoint.
// The previous `Record<string, unknown>` accepted arbitrary data of any shape and
// size on an unauthenticated endpoint — an attacker could store megabytes of
// data in the analytics table per request.
// We now accept only the known optional fields the frontend actually sends.
class EventMetadataDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactId?: string

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  referrer?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  linkPlatform?: string

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  linkUrl?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  action?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  surface?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  status?: string
}

class RecordEventDto {
  @IsString()
  cardId!: string

  @IsIn(VALID_EVENT_TYPES, {
    message: `type must be one of: ${VALID_EVENT_TYPES.join(', ')}`,
  })
  type!: EventType

  // HIGH-02: Replace open-ended Record<string, unknown> with a validated DTO.
  // @IsOptional means the whole metadata object may be omitted; when present
  // it must be an object and each field is individually validated above.
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => EventMetadataDto)
  metadata?: EventMetadataDto
}

// F-02: Strongly-typed query DTO with ISO-8601 date validation.
// Without this, New Date('foo') silently becomes NaN and the query
// returns an empty result set instead of a clear validation error.
class AnalyticsQueryDto {
  @IsOptional()
  @IsDateString({}, { message: 'from must be a valid ISO-8601 date string (e.g. 2025-01-01)' })
  from?: string

  @IsOptional()
  @IsDateString({}, { message: 'to must be a valid ISO-8601 date string (e.g. 2025-12-31)' })
  to?: string
}

@ApiTags('analytics')
@Controller()
export class AnalyticsController {
  constructor(
    private analyticsService: AnalyticsService,
    private prisma: PrismaService,
    private billingService: BillingService,
  ) {}

  private extractClientIp(req: Request): string | undefined {
    const trustedProxyHint = req.headers['x-vercel-ip-country'] || req.headers['x-real-ip']
    if (trustedProxyHint) {
      const forwarded = req.headers['x-forwarded-for']
      const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded
      const firstForwarded = forwardedValue?.split(',')[0]?.trim()
      if (firstForwarded) return firstForwarded
    }

    return req.socket?.remoteAddress
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('public/analytics')
  @ApiOperation({ summary: 'Record a public analytics event (no auth)' })
  async record(@Body() body: RecordEventDto, @Req() req: Request) {
    // Validate that the cardId references a real, published card so that
    // arbitrary callers cannot pollute the analytics table with phantom IDs.
    const card = await this.prisma.card.findUnique({
      where: { id: body.cardId, isActive: true },
      select: { id: true },
    })
    if (!card) {
      throw new BadRequestException('Card not found or not published')
    }

    const ip = this.extractClientIp(req)
    const country = req.headers['x-vercel-ip-country'] as string | undefined
    const ua = req.headers['user-agent'] ?? ''
    // Order matters: check tablet before mobile — many tablet UAs also contain
    // 'mobile' (e.g. "iPad; CPU OS … Mobile Safari"). A tablet match wins.
    const uaLower = ua.toLowerCase()
    const device =
      uaLower.includes('tablet') ||
      uaLower.includes('ipad') ||
      uaLower.includes('kindle') ||
      uaLower.includes('playbook')
        ? 'tablet'
        : uaLower.includes('mobile') ||
            uaLower.includes('android') ||
            uaLower.includes('iphone') ||
            uaLower.includes('ipod')
          ? 'mobile'
          : 'desktop'
    await this.analyticsService.record({
      cardId: body.cardId,
      type: body.type,
      metadata: body.metadata as Record<string, unknown> | undefined,
      ip,
      country,
      device,
      referrer: req.headers['referer'],
    })
    return { success: true }
  }

  @ApiBearerAuth()
  @Get('analytics/dashboard-summary')
  @ApiOperation({
    summary: 'Get aggregate analytics across all cards for the current user (dashboard)',
  })
  getDashboardSummary(@CurrentUser() user: { id: string }) {
    return this.analyticsService.getDashboardSummary(user.id)
  }

  @ApiBearerAuth()
  @Get('cards/:id/analytics/summary')
  @ApiOperation({ summary: 'Get analytics summary for a card' })
  getSummary(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.analyticsService.getSummary(id, user.id)
  }

  @ApiBearerAuth()
  @Get('cards/:id/analytics')
  @ApiOperation({ summary: 'Get full analytics for a card' })
  async getAnalytics(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; plan?: string },
    @Query() query: AnalyticsQueryDto,
  ) {
    // F-02: Enforce plan-based maximum date range so FREE users cannot query
    // unlimited history.  The plan limit is read from the canonical source
    // (BillingService.getPlanLimits) so it stays in sync with billing changes.
    // Resolve supabaseId → internal DB user to ensure the plan lookup succeeds
    // even when the JWT sub (user.id) is the Supabase UUID, not the DB primary key.
    const dbUser = await this.prisma.user.findFirst({
      where: { OR: [{ id: user.id }, { supabaseId: user.id }] },
      select: { plan: true },
    })
    const plan: Plan = (dbUser?.plan as Plan | undefined) ?? Plan.FREE
    const limits = this.billingService.getPlanLimits(plan)

    const now = new Date()
    let toDate = query.to ? new Date(query.to) : now
    let fromDate = query.from
      ? new Date(query.from)
      : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Clamp toDate to now — querying the future returns nothing and wastes resources.
    if (toDate > now) toDate = now

    // Enforce plan-specific lookback window.
    // analyticsDays === -1 means unlimited (ENTERPRISE).
    if (limits.analyticsDays !== -1) {
      const earliestAllowed = new Date(now.getTime() - limits.analyticsDays * 24 * 60 * 60 * 1000)
      if (fromDate < earliestAllowed) {
        fromDate = earliestAllowed
      }
    }

    if (fromDate >= toDate) {
      throw new BadRequestException('from must be before to')
    }

    return this.analyticsService.getAnalytics(id, user.id, { from: fromDate, to: toDate })
  }
}
