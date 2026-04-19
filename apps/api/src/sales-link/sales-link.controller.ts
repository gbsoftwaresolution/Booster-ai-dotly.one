import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  NotFoundException,
  Param,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import { Public } from '../auth/decorators/public.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { SalesLinkService } from './sales-link.service'
import type { Request } from 'express'

const LEAD_ACTIONS = ['view', 'whatsapp', 'booking', 'payment'] as const
const WHATSAPP_INTENTS = ['general', 'service'] as const
const SALES_LINK_BOOKING_SLOTS = [
  '2026-04-20 10:00',
  '2026-04-20 12:00',
  '2026-04-20 15:00',
] as const

class CreateLeadDto {
  @IsString()
  username!: string

  @IsOptional()
  @IsString()
  source?: string
}

class TrackLeadEventDto {
  @IsIn(LEAD_ACTIONS)
  action!: (typeof LEAD_ACTIONS)[number]

  @IsUUID()
  leadId!: string

  @IsOptional()
  @IsIn(WHATSAPP_INTENTS)
  intent?: (typeof WHATSAPP_INTENTS)[number]

  @IsOptional()
  @IsString()
  ctaVariant?: string
}

class CreateBookingDto {
  @IsString()
  username!: string

  @IsUUID()
  leadId!: string

  @IsIn(SALES_LINK_BOOKING_SLOTS)
  slot!: (typeof SALES_LINK_BOOKING_SLOTS)[number]
}

class CreatePaymentDto {
  @IsString()
  username!: string

  @IsUUID()
  leadId!: string

  @IsIn([5000])
  amount!: number
}

class ConfirmPaymentDto {
  @IsUUID()
  paymentId!: string
}

const LEAD_STATUSES = ['new', 'contacted', 'booked', 'paid', 'closed', 'lost'] as const

class UpdateLeadDto {
  @IsOptional()
  @IsIn(LEAD_STATUSES)
  status?: (typeof LEAD_STATUSES)[number]

  @IsOptional()
  @IsString()
  note?: string

  @IsOptional()
  followUpFlag?: boolean
}

@ApiTags('sales-link')
@Controller()
export class SalesLinkController {
  constructor(private readonly salesLinkService: SalesLinkService) {}

  @Public()
  @Get('public/:username')
  @ApiOperation({ summary: 'Get a public sales link profile by username' })
  async getPublicProfile(@Param('username') username: string) {
    const pageData = await this.salesLinkService.getPublicPageData(username)
    if (!pageData) {
      throw new NotFoundException('Profile not found')
    }
    return pageData.profile
  }

  @Public()
  @Get('public-page/:username')
  @ApiOperation({ summary: 'Get public sales-link page data by username' })
  async getPublicPage(@Param('username') username: string) {
    const pageData = await this.salesLinkService.getPublicPageData(username)
    if (!pageData) {
      throw new NotFoundException('Profile not found')
    }

    return pageData
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('lead/create')
  @ApiOperation({ summary: 'Create a new anonymous sales-link lead' })
  async createLead(@Body() body: CreateLeadDto) {
    const username = body.username.trim()
    if (!username) {
      throw new BadRequestException('username is required')
    }

    const lead = await this.salesLinkService.createLead({
      username,
      source: body.source?.trim() || undefined,
    })

    return { leadId: lead.id }
  }

  @Public()
  @Get('booking/slots/:username')
  @ApiOperation({ summary: 'Get simple public booking slots for a sales link' })
  async getBookingSlots(@Param('username') username: string) {
    const profile = await this.salesLinkService.getPublicProfile(username)
    if (!profile) {
      throw new NotFoundException('Profile not found')
    }

    return this.salesLinkService.getSlots()
  }

  @Public()
  @Get('payment/config/:username')
  @ApiOperation({ summary: 'Get public payment availability for a sales link' })
  async getPaymentConfig(@Param('username') username: string) {
    const pageData = await this.salesLinkService.getPublicPageData(username)
    if (!pageData) {
      throw new NotFoundException('Profile not found')
    }

    return pageData.paymentConfig
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Post('track')
  @ApiOperation({ summary: 'Record a sales link event for a lead' })
  async trackClick(@Body() body: TrackLeadEventDto) {
    await this.salesLinkService.trackEvent(body.leadId, body.action, body.intent, body.ctaVariant)
    return { success: true }
  }

  @Get('activity/:username')
  @ApiOperation({ summary: 'Get recent sales link activity for the current user' })
  async getRecentActivity(
    @Param('username') username: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.salesLinkService.getRecentActivity(username, user.id)
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('booking/create')
  @ApiOperation({ summary: 'Create a simple public sales link booking' })
  async createBooking(@Body() body: CreateBookingDto) {
    return this.salesLinkService.createBooking({
      username: body.username.trim(),
      leadId: body.leadId,
      slot: body.slot,
    })
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('payment/create')
  @ApiOperation({ summary: 'Create a Stripe Checkout session for a sales link payment' })
  async createPayment(@Body() body: CreatePaymentDto) {
    return this.salesLinkService.createPayment({
      username: body.username.trim(),
      leadId: body.leadId,
      amount: body.amount,
    })
  }

  @Public()
  @Post('payment/webhook')
  @ApiOperation({ summary: 'Handle Stripe webhook events for sales link payments' })
  async handlePaymentWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ) {
    return this.salesLinkService.handlePaymentWebhook(req.rawBody, signature)
  }

  @Get('booking/:username')
  @ApiOperation({ summary: 'Get sales link bookings for the current user' })
  async getBookings(@Param('username') username: string, @CurrentUser() user: { id: string }) {
    const dashboard = await this.salesLinkService.getLeadDashboard(username, user.id)
    return {
      totalBookings: dashboard.totalBookings,
      bookings: dashboard.bookings,
    }
  }

  @Get('payment/:username')
  @ApiOperation({ summary: 'Get sales link payment totals for the current user' })
  async getPayments(@Param('username') username: string, @CurrentUser() user: { id: string }) {
    const dashboard = await this.salesLinkService.getLeadDashboard(username, user.id)
    return {
      revenue: dashboard.revenue,
      payments: dashboard.payments,
    }
  }

  @Get('lead-summary/:username')
  @ApiOperation({ summary: 'Get sales link dashboard summary for the current user' })
  async getLeadSummary(@Param('username') username: string, @CurrentUser() user: { id: string }) {
    return this.salesLinkService.getLeadDashboard(username, user.id)
  }

  @Get('dashboard/:username')
  @ApiOperation({ summary: 'Get revenue visibility dashboard data for the current user' })
  async getDashboard(@Param('username') username: string, @CurrentUser() user: { id: string }) {
    return this.salesLinkService.getRevenueDashboard(username, user.id)
  }

  @Get('launch-dashboard/:username')
  @ApiOperation({ summary: 'Get launch-focused revenue dashboard data for the current user' })
  async getLaunchDashboard(
    @Param('username') username: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.salesLinkService.getLaunchDashboard(username, user.id)
  }

  @Get('payments/:username')
  @ApiOperation({ summary: 'Get payment history for the current user' })
  async getPaymentHistory(
    @Param('username') username: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.salesLinkService.getPaymentHistory(username, user.id)
  }

  @Post('payment/confirm')
  @ApiOperation({ summary: 'Confirm a pending COD sales link payment' })
  async confirmPayment(@CurrentUser() user: { id: string }, @Body() body: ConfirmPaymentDto) {
    return this.salesLinkService.confirmPendingPayment(body.paymentId, user.id)
  }

  @Get('leads/:username')
  @ApiOperation({ summary: 'Get sales link leads list for the current user' })
  async getLeads(@Param('username') username: string, @CurrentUser() user: { id: string }) {
    return this.salesLinkService.getLeadsList(username, user.id)
  }

  @Get('lead/:id')
  @ApiOperation({ summary: 'Get sales link lead detail for the current user' })
  async getLead(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.salesLinkService.getLeadDetail(id, user.id)
  }

  @Post('lead/:id')
  @ApiOperation({ summary: 'Update sales link lead status, note, and follow-up flag' })
  async updateLead(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() body: UpdateLeadDto,
  ) {
    return this.salesLinkService.updateLead(id, user.id, body)
  }
}
