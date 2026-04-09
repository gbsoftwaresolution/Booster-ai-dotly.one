import { Controller, Get, Post, Patch, Delete, Put, Param, Body, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { Public } from '../auth/decorators/public.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { SchedulingService } from './scheduling.service'
import { CreateAppointmentTypeDto } from './dto/create-appointment-type.dto'
import { UpdateAppointmentTypeDto } from './dto/update-appointment-type.dto'
import { SetAvailabilityDto } from './dto/set-availability.dto'
import { CreateBookingDto } from './dto/create-booking.dto'
import { CancelBookingDto } from './dto/cancel-booking.dto'
import { RescheduleBookingDto } from './dto/reschedule-booking.dto'

@ApiTags('scheduling')
@Controller('scheduling')
export class SchedulingController {
  constructor(private readonly schedulingService: SchedulingService) {}

  // ── Appointment Types (authenticated) ─────────────────────────────────────

  @ApiBearerAuth()
  @Post('appointment-types')
  createAppointmentType(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateAppointmentTypeDto,
  ) {
    return this.schedulingService.createAppointmentType(user.id, dto)
  }

  @ApiBearerAuth()
  @Get('appointment-types')
  getAppointmentTypes(@CurrentUser() user: { id: string }) {
    return this.schedulingService.getAppointmentTypes(user.id)
  }

  @ApiBearerAuth()
  @Get('appointment-types/:id')
  getAppointmentType(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.schedulingService.getAppointmentType(user.id, id)
  }

  @ApiBearerAuth()
  @Patch('appointment-types/:id')
  updateAppointmentType(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentTypeDto,
  ) {
    return this.schedulingService.updateAppointmentType(user.id, id, dto)
  }

  @ApiBearerAuth()
  @Delete('appointment-types/:id')
  deleteAppointmentType(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.schedulingService.deleteAppointmentType(user.id, id)
  }

  @ApiBearerAuth()
  @Put('appointment-types/:id/availability')
  setAvailability(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: SetAvailabilityDto,
  ) {
    return this.schedulingService.setAvailabilityRules(user.id, id, dto)
  }

  // ── Bookings (authenticated) ───────────────────────────────────────────────

  @ApiBearerAuth()
  @Get('bookings')
  getBookings(@CurrentUser() user: { id: string }, @Query('upcoming') upcoming?: string) {
    return this.schedulingService.getBookings(user.id, {
      upcoming: upcoming === 'true',
    })
  }

  @ApiBearerAuth()
  @Patch('bookings/:id/cancel')
  ownerCancelBooking(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: CancelBookingDto,
  ) {
    return this.schedulingService.ownerCancelBooking(user.id, id, dto.reason)
  }

  // ── Public Endpoints ──────────────────────────────────────────────────────

  /**
   * GET /scheduling/public/:handle/:slug
   * Returns appointment type details for the public booking page.
   */
  @Public()
  @Get('public/:handle/:slug')
  async getPublicAppointmentType(@Param('handle') handle: string, @Param('slug') slug: string) {
    const ownerUserId = await this.schedulingService.resolveOwnerByHandle(handle)
    return this.schedulingService.getPublicAppointmentType(ownerUserId, slug)
  }

  /**
   * GET /scheduling/public/:handle/:slug/slots?date=YYYY-MM-DD&tz=IANA_TZ
   * Returns available time slots for a given date.
   */
  @Public()
  @Get('public/:handle/:slug/slots')
  async getAvailableSlots(
    @Param('handle') handle: string,
    @Param('slug') slug: string,
    @Query('date') date: string,
    @Query('tz') tz?: string,
  ) {
    const ownerUserId = await this.schedulingService.resolveOwnerByHandle(handle)
    return this.schedulingService.getAvailableSlots(ownerUserId, slug, date, tz)
  }

  /**
   * POST /scheduling/public/:handle/:slug/book
   * Creates a booking (public — no auth required).
   * MED-1: Tighter per-IP throttle (10/min) to limit booking spam.
   */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('public/:handle/:slug/book')
  async createBooking(
    @Param('handle') handle: string,
    @Param('slug') slug: string,
    @Body() dto: CreateBookingDto,
  ) {
    const ownerUserId = await this.schedulingService.resolveOwnerByHandle(handle)
    return this.schedulingService.createBooking(ownerUserId, slug, dto)
  }

  /**
   * POST /scheduling/bookings/:token/cancel
   * Guest cancels their own booking via the token from their confirmation email.
   * MED-1: Tighter per-IP throttle (10/min).
   * FIX-7: reason now validated via CancelBookingDto (@MaxLength(1000)).
   */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('bookings/:token/cancel')
  cancelBookingByToken(@Param('token') token: string, @Body() dto: CancelBookingDto) {
    return this.schedulingService.cancelBookingByToken(token, dto.reason)
  }

  /**
   * POST /scheduling/bookings/:token/reschedule
   * Guest reschedules their own booking via the token. Body: { startAt: ISO string }
   * MED-1: Tighter per-IP throttle (10/min).
   * FIX-7: startAt now validated via RescheduleBookingDto (@IsDateString()).
   */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('bookings/:token/reschedule')
  rescheduleByToken(@Param('token') token: string, @Body() dto: RescheduleBookingDto) {
    return this.schedulingService.rescheduleByToken(token, dto.startAt)
  }

  /**
   * GET /scheduling/bookings/:token/info
   * Returns public booking info for the reschedule page.
   * FIX-8: Throttle to prevent token probing via timing enumeration.
   */
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get('bookings/:token/info')
  getBookingInfoByToken(@Param('token') token: string) {
    return this.schedulingService.getBookingInfoByToken(token)
  }

  /**
   * GET /scheduling/bookings/:token/slots?date=YYYY-MM-DD&tz=...
   * FIX-A: Slot availability for reschedule page, keyed by booking token only.
   * Replaces the old public-by-id/:ownerUserId/:aptId/slots endpoint that
   * leaked internal IDs in the URL (IDOR risk).
   * FIX-8: Throttle to limit slot enumeration via token probing.
   */
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get('bookings/:token/slots')
  getAvailableSlotsByToken(
    @Param('token') token: string,
    @Query('date') date: string,
    @Query('tz') tz?: string,
  ) {
    return this.schedulingService.getAvailableSlotsByToken(token, date, tz)
  }
}
