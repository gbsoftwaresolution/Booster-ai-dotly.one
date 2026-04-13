import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { EmailService } from '../email/email.service'
import { GoogleCalendarService } from './google-calendar.service'
import { ContactsService } from '../contacts/contacts.service'
import { CreateAppointmentTypeDto } from './dto/create-appointment-type.dto'
import { UpdateAppointmentTypeDto } from './dto/update-appointment-type.dto'
import { SetAvailabilityDto } from './dto/set-availability.dto'
import { CreateBookingDto } from './dto/create-booking.dto'
import { SetBookingQuestionsDto } from './dto/manage-booking-questions.dto'
import { BookingStatus } from '@dotly/database'
import { ConfigService } from '@nestjs/config'

// Day-of-week index: 0=Sunday, 1=Monday, ... 6=Saturday (JS Date.getDay())
const DOW_MAP: Record<string, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
}

/**
 * Convert a "HH:MM" wall-clock time on a given UTC date to a UTC Date,
 * interpreting the wall clock in the given IANA timezone.
 *
 * Strategy: use Intl.DateTimeFormat to find what UTC offset applies on that
 * date in the target timezone, then subtract the offset from the naïve UTC
 * timestamp so the result represents the correct moment in time.
 */
function wallToUtc(utcDate: Date, hhMm: string, tz: string): Date {
  const [h, m] = hhMm.split(':').map(Number)
  // Build a naïve UTC date with the wall-clock time as if UTC
  const naiveUtc = new Date(
    Date.UTC(utcDate.getUTCFullYear(), utcDate.getUTCMonth(), utcDate.getUTCDate(), h ?? 0, m ?? 0),
  )
  // Use Intl to find the UTC offset the target timezone applies on this date
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(naiveUtc)
    const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10)
    const tzYear = get('year')
    const tzMonth = get('month') - 1
    const tzDay = get('day')
    const tzHour = get('hour') === 24 ? 0 : get('hour')
    const tzMin = get('minute')
    // Reconstruct: naiveUtc already is the wall time in UTC; compute what UTC
    // Intl thinks the wall time maps to, then derive offset
    const tzAsUtc = Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMin)
    const offsetMs = naiveUtc.getTime() - tzAsUtc
    return new Date(naiveUtc.getTime() + offsetMs)
  } catch {
    // Unknown timezone — fall back to treating as UTC
    return naiveUtc
  }
}

/**
 * Check whether a given UTC start time falls on a valid slot grid position
 * within any availability window for the appointment type on that day.
 * Used to prevent bookings at arbitrary times (BUG-2, BUG-3, HIGH-2).
 *
 * We accept the slot only if it satisfies BOTH:
 *   1. startAt >= windowStart  AND  endAt <= windowEnd  (within the window)
 *   2. (startAt - windowStart) is divisible by stepMs   (on the slot grid)
 *
 * The step size is durationMins + bufferAfterMins (same formula as
 * getAvailableSlots uses when building the list of available times).
 * Without condition 2, a direct POST with startAt="10:07" would pass the
 * window-membership check and create an off-grid booking.
 */
function isSlotInAvailability(
  startAt: Date,
  apt: {
    durationMins: number
    bufferAfterMins: number
    timezone: string
    availabilityRules: { dayOfWeek: string; startTime: string; endTime: string }[]
  },
): boolean {
  const ownerTz = apt.timezone || 'UTC'
  const endAt = new Date(startAt.getTime() + apt.durationMins * 60_000)
  // Step must be at least durationMins so the grid never produces overlapping slots
  const stepMs = Math.max(apt.durationMins, apt.durationMins + apt.bufferAfterMins) * 60_000

  // Determine day-of-week in the owner's timezone for the requested start
  let jsDow: number
  try {
    const dayName = new Intl.DateTimeFormat('en-US', {
      timeZone: ownerTz,
      weekday: 'short',
    }).format(startAt)
    const intlDow: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    }
    jsDow = intlDow[dayName] ?? startAt.getDay()
  } catch {
    jsDow = startAt.getDay()
  }

  // Derive the local calendar date of startAt in the owner's timezone.
  // Using UTC components of startAt would be wrong for owners in positive-offset
  // timezones: a slot at 00:30 Tokyo (UTC+9) is 15:30 UTC the *previous* day,
  // so getUTCDate() returns yesterday — wallToUtc would then build window bounds
  // anchored on the wrong local date, rejecting valid early-morning slots.
  let anchorYear: number, anchorMonth: number, anchorDay: number
  try {
    const localParts = new Intl.DateTimeFormat('en-US', {
      timeZone: ownerTz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(startAt)
    const getPart = (type: string) =>
      parseInt(localParts.find((p) => p.type === type)?.value ?? '0', 10)
    anchorYear = getPart('year')
    anchorMonth = getPart('month') - 1 // 0-indexed for Date.UTC
    anchorDay = getPart('day')
  } catch {
    anchorYear = startAt.getUTCFullYear()
    anchorMonth = startAt.getUTCMonth()
    anchorDay = startAt.getUTCDate()
  }
  const utcDateAnchor = new Date(Date.UTC(anchorYear, anchorMonth, anchorDay))

  const rules = apt.availabilityRules.filter((r) => DOW_MAP[r.dayOfWeek] === jsDow)
  for (const rule of rules) {
    const windowStart = wallToUtc(utcDateAnchor, rule.startTime, ownerTz)
    const windowEnd = wallToUtc(utcDateAnchor, rule.endTime, ownerTz)
    if (startAt >= windowStart && endAt <= windowEnd) {
      // HIGH-2: also verify the slot aligns to the grid defined by windowStart + n*stepMs
      const offsetMs = startAt.getTime() - windowStart.getTime()
      if (offsetMs % stepMs === 0) return true
    }
  }
  return false
}

/**
 * FIX-E/F: Validate that startAt is within the appointment type's bufferDays
 * booking window. A guest could POST directly to /book bypassing the slot page
 * and book arbitrarily far in the future.  bufferDays === 0 means unlimited.
 */
function isWithinBufferWindow(startAt: Date, bufferDays: number): boolean {
  if (bufferDays === 0) return true
  const nowUtc = new Date()
  const todayMidnightUtc = new Date(
    Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate()),
  )
  // HIGH-5: Use end-of-day (midnight of day bufferDays+1) so that slots on the
  // last allowed day at e.g. 17:00 are still accepted.
  // Old code used midnight of day bufferDays which rejected all hours > 00:00.
  const maxDate = new Date(todayMidnightUtc.getTime() + (bufferDays + 1) * 86_400_000)
  return startAt < maxDate
}

@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name)
  private readonly allowedAssetHosts: Set<string>

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly googleCalendar: GoogleCalendarService,
    private readonly config: ConfigService,
    private readonly contactsService: ContactsService,
  ) {
    const r2Url = this.config.get<string>('R2_PUBLIC_URL') ?? 'https://cdn.dotly.one'
    const allowedAssetHosts = new Set<string>(['cdn.dotly.one'])
    try {
      const normalized = r2Url.startsWith('http') ? r2Url : `https://${r2Url}`
      allowedAssetHosts.add(new URL(normalized).hostname)
    } catch {
      /* ignore invalid config */
    }
    this.allowedAssetHosts = allowedAssetHosts
  }

  private sanitizeAvatarUrl(value: string | null | undefined): string | null {
    if (!value) return null
    try {
      const url = new URL(value)
      if (['http:', 'https:'].includes(url.protocol) && this.allowedAssetHosts.has(url.hostname)) {
        return url.toString()
      }
    } catch {
      /* ignore */
    }
    return null
  }

  // ── Appointment Types ──────────────────────────────────────────────────────

  async createAppointmentType(userId: string, dto: CreateAppointmentTypeDto) {
    const existing = await this.prisma.appointmentType.findUnique({
      where: { ownerUserId_slug: { ownerUserId: userId, slug: dto.slug } },
    })
    if (existing) {
      throw new ConflictException(`Slug "${dto.slug}" is already in use`)
    }
    return this.prisma.appointmentType.create({
      data: {
        ownerUserId: userId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        durationMins: dto.durationMins,
        color: dto.color ?? '#0ea5e9',
        bufferDays: dto.bufferDays ?? 60,
        bufferAfterMins: dto.bufferAfterMins ?? 0,
        location: dto.location,
        isActive: dto.isActive ?? true,
        timezone: dto.timezone ?? 'UTC',
      },
    })
  }

  private parseQuestionOptions(options: string | null | undefined): string[] {
    if (!options) return []

    try {
      const parsed = JSON.parse(options) as unknown
      if (!Array.isArray(parsed)) return []
      return parsed.filter(
        (value): value is string => typeof value === 'string' && value.trim().length > 0,
      )
    } catch {
      return []
    }
  }

  private serializeQuestionOptions<T extends { options?: string | null }>(
    question: T,
  ): Omit<T, 'options'> & {
    options: string[]
  } {
    return {
      ...question,
      options: this.parseQuestionOptions(question.options),
    }
  }

  async getAppointmentTypes(userId: string) {
    const appointmentTypes = await this.prisma.appointmentType.findMany({
      where: { ownerUserId: userId, deletedAt: null },
      include: {
        availabilityRules: true,
        questions: { orderBy: { position: 'asc' } },
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    return appointmentTypes.map((appointmentType) => ({
      ...appointmentType,
      questions: appointmentType.questions.map((question) =>
        this.serializeQuestionOptions(question),
      ),
    }))
  }

  async getAppointmentType(userId: string, id: string) {
    const apt = await this.prisma.appointmentType.findUnique({
      where: { id },
      include: { availabilityRules: true, questions: { orderBy: { position: 'asc' } } },
    })
    if (!apt || apt.ownerUserId !== userId || apt.deletedAt !== null) throw new NotFoundException()
    return {
      ...apt,
      questions: apt.questions.map((question) => this.serializeQuestionOptions(question)),
    }
  }

  async updateAppointmentType(userId: string, id: string, dto: UpdateAppointmentTypeDto) {
    const apt = await this.prisma.appointmentType.findUnique({ where: { id } })
    if (!apt || apt.ownerUserId !== userId) throw new NotFoundException()

    if (dto.slug && dto.slug !== apt.slug) {
      const conflict = await this.prisma.appointmentType.findUnique({
        where: { ownerUserId_slug: { ownerUserId: userId, slug: dto.slug } },
      })
      if (conflict) throw new ConflictException(`Slug "${dto.slug}" is already in use`)
    }

    // BUG-1: Only pass explicitly-set DTO fields to Prisma to avoid passing
    // undefined values that Prisma may interpret as "set to null".
    const data: Record<string, unknown> = {}
    if (dto.name !== undefined) data['name'] = dto.name
    if (dto.slug !== undefined) data['slug'] = dto.slug
    if (dto.description !== undefined) data['description'] = dto.description
    if (dto.durationMins !== undefined) data['durationMins'] = dto.durationMins
    if (dto.color !== undefined) data['color'] = dto.color
    if (dto.bufferDays !== undefined) data['bufferDays'] = dto.bufferDays
    if (dto.bufferAfterMins !== undefined) data['bufferAfterMins'] = dto.bufferAfterMins
    if (dto.location !== undefined) data['location'] = dto.location
    if (dto.isActive !== undefined) data['isActive'] = dto.isActive
    if (dto.timezone !== undefined) data['timezone'] = dto.timezone

    return this.prisma.appointmentType.update({ where: { id }, data })
  }

  async deleteAppointmentType(userId: string, id: string) {
    const apt = await this.prisma.appointmentType.findUnique({ where: { id } })
    if (!apt || apt.ownerUserId !== userId) throw new NotFoundException()
    // CRITICAL-2: Soft-delete — set deletedAt instead of destroying the row.
    // Hard-deleting would cascade-destroy all booking history (past and future).
    // The Booking FK is now RESTRICT at the DB level as a safety net.
    await this.prisma.appointmentType.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    })
  }

  // ── Availability Rules ──────────────────────────────────────────────────────

  async setAvailabilityRules(userId: string, appointmentTypeId: string, dto: SetAvailabilityDto) {
    const apt = await this.prisma.appointmentType.findUnique({ where: { id: appointmentTypeId } })
    if (!apt || apt.ownerUserId !== userId) throw new NotFoundException()

    // Validate: startTime < endTime for each rule
    for (const rule of dto.rules) {
      if (rule.startTime >= rule.endTime) {
        throw new BadRequestException(`startTime must be before endTime for day ${rule.dayOfWeek}`)
      }
    }

    // Replace all existing rules
    await this.prisma.$transaction([
      this.prisma.availabilityRule.deleteMany({ where: { appointmentTypeId } }),
      this.prisma.availabilityRule.createMany({
        data: dto.rules.map((r) => ({
          appointmentTypeId,
          dayOfWeek: r.dayOfWeek,
          startTime: r.startTime,
          endTime: r.endTime,
        })),
      }),
    ])

    return this.prisma.availabilityRule.findMany({ where: { appointmentTypeId } })
  }

  // ── Booking Questions ──────────────────────────────────────────────────────

  async setBookingQuestions(
    userId: string,
    appointmentTypeId: string,
    dto: SetBookingQuestionsDto,
  ) {
    const apt = await this.prisma.appointmentType.findUnique({ where: { id: appointmentTypeId } })
    if (!apt || apt.ownerUserId !== userId) throw new NotFoundException()

    // Replace all questions atomically
    await this.prisma.$transaction([
      this.prisma.bookingQuestion.deleteMany({ where: { appointmentTypeId } }),
      this.prisma.bookingQuestion.createMany({
        data: dto.questions.map((q, idx) => ({
          appointmentTypeId,
          label: q.label,
          type: q.type,
          options: JSON.stringify(q.options ?? []),
          required: q.required ?? false,
          position: q.position ?? idx,
        })),
      }),
    ])

    const questions = await this.prisma.bookingQuestion.findMany({
      where: { appointmentTypeId },
      orderBy: { position: 'asc' },
    })

    return questions.map((question) => this.serializeQuestionOptions(question))
  }

  // ── Available Slots ─────────────────────────────────────────────────────────

  /**
   * Compute available N-minute slots for a given ownerUserId+slug on a given date.
   * `date` is "YYYY-MM-DD". Slots are computed in the owner's timezone then returned as UTC ISO strings.
   * Optional `guestTz` is the guest's IANA timezone — returned alongside each slot for display.
   */
  async getAvailableSlots(ownerUserId: string, slug: string, date: string, guestTz?: string) {
    const apt = await this.prisma.appointmentType.findUnique({
      where: { ownerUserId_slug: { ownerUserId, slug } },
      include: { availabilityRules: true, questions: { orderBy: { position: 'asc' } } },
    })
    if (!apt || !apt.isActive || apt.deletedAt !== null) throw new NotFoundException()

    const ownerTz = apt.timezone || 'UTC'

    // Parse the requested date as a UTC noon anchor (not midnight) to prevent
    // HIGH-6: Intl.DateTimeFormat shifting the date to the previous day for
    // owners in negative-offset timezones (e.g. America/New_York = UTC-5).
    // Using noon UTC guarantees the date string maps to the correct local date
    // regardless of the owner timezone's offset (within ±12 h).
    const [year, month, day] = date.split('-').map(Number)
    if (!year || !month || !day) throw new BadRequestException('date must be YYYY-MM-DD')
    // MED-4: Reject overflow dates that JS silently normalises (e.g. 2026-02-31
    // becomes March 3).  Reconstruct and compare — if day/month shift, the input
    // was invalid.
    const requestedDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
    if (
      requestedDate.getUTCFullYear() !== year ||
      requestedDate.getUTCMonth() + 1 !== month ||
      requestedDate.getUTCDate() !== day
    ) {
      throw new BadRequestException('date is not a valid calendar date')
    }

    // BUG-8: bufferDays enforcement using whole-day comparison.
    // Compute today's UTC midnight so that "today" is never blocked.
    const nowUtc = new Date()
    const todayMidnightUtc = new Date(
      Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth(), nowUtc.getUTCDate()),
    )
    // HIGH-1: Use Math.floor so that today (0 ms ahead) maps to diffDays=0 not 1.
    // Math.round would give 1 for today (noon UTC anchor is 43200000 ms ahead of
    // midnight, which rounds up to 1 day), incorrectly treating today as day 1.
    const diffDays = Math.floor((requestedDate.getTime() - todayMidnightUtc.getTime()) / 86_400_000)
    // Block dates in the past
    if (diffDays < 0) return { slots: [], ownerTimezone: ownerTz, guestTimezone: guestTz ?? null }
    // Block dates beyond the booking window (bufferDays === 0 means unlimited)
    if (apt.bufferDays > 0 && diffDays > apt.bufferDays)
      return { slots: [], ownerTimezone: ownerTz, guestTimezone: guestTz ?? null }

    // Determine day-of-week in the owner's timezone for the requested date
    let jsDow: number
    try {
      const dayName = new Intl.DateTimeFormat('en-US', {
        timeZone: ownerTz,
        weekday: 'short',
      }).format(requestedDate)
      const intlDow: Record<string, number> = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6,
      }
      jsDow = intlDow[dayName] ?? requestedDate.getDay()
    } catch {
      jsDow = requestedDate.getDay()
    }

    // Find availability rules for this day of week
    const rules = apt.availabilityRules.filter((r) => DOW_MAP[r.dayOfWeek] === jsDow)
    if (!rules.length) return { slots: [], ownerTimezone: ownerTz, guestTimezone: guestTz ?? null }

    // Collect all valid time windows (may be multiple rules per day)
    const slotDuration = apt.durationMins
    const bufferAfter = apt.bufferAfterMins

    const allSlots: Date[] = []
    for (const rule of rules) {
      const windowStart = wallToUtc(requestedDate, rule.startTime, ownerTz)
      const windowEnd = wallToUtc(requestedDate, rule.endTime, ownerTz)
      const windowStartMs = windowStart.getTime()
      const windowEndMs = windowEnd.getTime()
      const stepMs = (slotDuration + bufferAfter) * 60_000

      let cursor = windowStartMs
      while (cursor + slotDuration * 60_000 <= windowEndMs) {
        allSlots.push(new Date(cursor))
        cursor += stepMs
      }
    }

    // BUG-13: Fetch existing bookings using a tight window — only the slots
    // generated above can fall in this range. Use ±1 day in UTC to handle all
    // timezone offsets without accidentally capturing bookings from other days.
    const dayStart = new Date(Date.UTC(year, month - 1, day - 1, 0, 0, 0))
    const dayEnd = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0))
    const existingBookings = await this.prisma.booking.findMany({
      where: {
        appointmentTypeId: apt.id,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
        startAt: { gte: dayStart, lte: dayEnd },
      },
    })

    // Fetch Google Calendar busy times for the day (best-effort, don't block on failure)
    const googleBusy = await this.googleCalendar.getBusyTimes(ownerUserId, dayStart, dayEnd)

    const freeSlots = allSlots.filter((slot) => {
      const slotEnd = new Date(slot.getTime() + slotDuration * 60_000)
      const blockedByDb = existingBookings.some((b) => {
        const busyEnd = new Date(b.endAt.getTime() + apt.bufferAfterMins * 60_000)
        return b.startAt < slotEnd && busyEnd > slot
      })
      const blockedByGoogle = googleBusy.some((b) => b.start < slotEnd && b.end > slot)
      return !blockedByDb && !blockedByGoogle
    })

    // Also filter out slots in the past
    const futureSlots = freeSlots.filter((s) => s > nowUtc)

    return {
      ownerTimezone: ownerTz,
      guestTimezone: guestTz ?? null,
      slots: futureSlots.map((s) => s.toISOString()),
    }
  }

  // ── Bookings ────────────────────────────────────────────────────────────────

  async createBooking(ownerUserId: string, slug: string, dto: CreateBookingDto) {
    const apt = await this.prisma.appointmentType.findUnique({
      where: { ownerUserId_slug: { ownerUserId, slug } },
      include: { availabilityRules: true, questions: { orderBy: { position: 'asc' } } },
    })
    if (!apt || !apt.isActive) throw new NotFoundException()

    // Fetch owner for email notifications
    const owner = await this.prisma.user.findUnique({
      where: { id: ownerUserId },
      select: { email: true, name: true },
    })
    if (!owner) throw new NotFoundException('Owner not found')

    const startAt = new Date(dto.startAt)
    if (isNaN(startAt.getTime())) throw new BadRequestException('Invalid startAt')

    // BUG-2: Validate that the requested slot falls within an availability window
    if (!isSlotInAvailability(startAt, apt)) {
      throw new BadRequestException('The requested time slot is not within the available schedule')
    }

    // FIX-E: Validate that the slot is within the booking window (bufferDays)
    if (!isWithinBufferWindow(startAt, apt.bufferDays)) {
      throw new BadRequestException(
        `Bookings can only be made up to ${apt.bufferDays} days in advance`,
      )
    }

    // Reject bookings in the past
    if (startAt <= new Date()) {
      throw new BadRequestException('Cannot book a slot in the past')
    }

    const endAt = new Date(startAt.getTime() + apt.durationMins * 60_000)
    // LOW-1: The buffer-after window belongs to the existing booking — a new
    // booking must not start during that buffer.  Extend the "busy until" time
    // used in the conflict query by bufferAfterMins so that the overlap check
    // correctly blocks slots that fall within the post-meeting buffer.
    const busyUntil = new Date(endAt.getTime() + apt.bufferAfterMins * 60_000)
    const conflictWindowStart = new Date(startAt.getTime() - apt.bufferAfterMins * 60_000)

    const answers = dto.answers ?? []
    const normalizedQuestions = apt.questions.map((question) =>
      this.serializeQuestionOptions(question),
    )
    const questionsById = new Map(normalizedQuestions.map((question) => [question.id, question]))
    const seenQuestionIds = new Set<string>()
    for (const answer of answers) {
      const question = questionsById.get(answer.questionId)
      if (!question) {
        throw new BadRequestException('Booking answers contain an invalid questionId')
      }
      if (seenQuestionIds.has(answer.questionId)) {
        throw new BadRequestException('Duplicate booking answer for the same question')
      }
      seenQuestionIds.add(answer.questionId)
    }

    const missingRequiredQuestion = normalizedQuestions.find(
      (question) =>
        question.required &&
        (!seenQuestionIds.has(question.id) ||
          !answers.find((answer) => answer.questionId === question.id)?.value.trim()),
    )
    if (missingRequiredQuestion) {
      throw new BadRequestException(
        `Answer required for question: ${missingRequiredQuestion.label}`,
      )
    }

    // CRITICAL-1: Wrap conflict check + create in a serializable transaction so
    // concurrent requests for the same slot cannot both pass the conflict check
    // before either has inserted the row (classic TOCTOU / phantom-read race).
    let booking: Awaited<ReturnType<typeof this.prisma.booking.create>>
    try {
      booking = await this.prisma.$transaction(
        async (tx) => {
          const conflict = await tx.booking.findFirst({
            where: {
              appointmentTypeId: apt.id,
              status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
              // A conflict exists when intervals overlap including the
              // appointment type's post-meeting buffer on the existing booking:
              // existing.startAt < newBusyUntil  AND  existing.endAt > (newStartAt - bufferAfter)
              startAt: { lt: busyUntil },
              endAt: { gt: conflictWindowStart },
            },
          })
          if (conflict) throw new ConflictException('This time slot is no longer available')

          const createdBooking = await tx.booking.create({
            data: {
              appointmentTypeId: apt.id,
              ownerUserId,
              startAt,
              endAt,
              status: BookingStatus.CONFIRMED,
              guestName: dto.guestName,
              guestEmail: dto.guestEmail,
              guestNotes: dto.guestNotes,
              // HIGH-4: Token expires 24 h after the appointment starts so that
              // cancel/reschedule links become invalid once the meeting has passed.
              tokenExpiresAt: new Date(startAt.getTime() + 24 * 60 * 60_000),
            },
          })

          if (answers.length > 0) {
            await tx.bookingAnswer.createMany({
              data: answers.map((answer) => ({
                bookingId: createdBooking.id,
                questionId: answer.questionId,
                value: answer.value.trim(),
              })),
              skipDuplicates: true,
            })
          }

          return createdBooking
        },
        { isolationLevel: 'Serializable' },
      )
    } catch (e) {
      // Re-throw NestJS HTTP exceptions (ConflictException etc.) unwrapped
      if (e instanceof ConflictException || e instanceof BadRequestException) throw e
      throw new ConflictException('This time slot is no longer available')
    }

    // Create Google Calendar event (best-effort, don't block)
    void (async () => {
      try {
        const eventId = await this.googleCalendar.createEvent(ownerUserId, {
          summary: `${dto.guestName} — ${apt.name}`,
          description: [
            dto.guestNotes ? `Guest notes: ${dto.guestNotes}` : '',
            apt.description ?? '',
          ]
            .filter(Boolean)
            .join('\n\n'),
          location: apt.location ?? undefined,
          start: { dateTime: startAt.toISOString(), timeZone: apt.timezone },
          end: { dateTime: endAt.toISOString(), timeZone: apt.timezone },
          attendees: [{ email: dto.guestEmail, displayName: dto.guestName }],
        })
        if (eventId) {
          await this.prisma.booking.update({
            where: { id: booking.id },
            data: { googleEventId: eventId },
          })
        }
      } catch (err) {
        this.logger.error(
          `Google Calendar createEvent failed: ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    })()

    // Send emails async (don't block response)
    void this.email
      .sendBookingConfirmationToGuest(booking, apt, owner)
      .catch((err: unknown) =>
        this.logger.error(
          `sendBookingConfirmationToGuest failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      )
    void this.email
      .sendBookingNotificationToOwner(booking, apt, owner)
      .catch((err: unknown) =>
        this.logger.error(
          `sendBookingNotificationToOwner failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      )

    void this.contactsService
      .create(ownerUserId, {
        name: dto.guestName,
        email: dto.guestEmail,
        notes: dto.guestNotes,
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        if (message.includes('already exists')) return
        this.logger.warn(`create CRM contact from booking failed: ${message}`)
      })

    return booking
  }

  async getBookings(userId: string, filter?: { status?: BookingStatus; upcoming?: boolean }) {
    const where: Record<string, unknown> = { ownerUserId: userId }
    if (filter?.status) where['status'] = filter.status
    if (filter?.upcoming) where['startAt'] = { gte: new Date() }
    return this.prisma.booking.findMany({
      where,
      include: { appointmentType: { select: { name: true, color: true, durationMins: true } } },
      orderBy: { startAt: 'asc' },
    })
  }

  async cancelBookingByToken(token: string, reason?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { token },
      include: { appointmentType: { select: { name: true, location: true, timezone: true } } },
    })
    if (!booking) throw new NotFoundException()
    if (booking.status === BookingStatus.CANCELLED)
      throw new ConflictException('Booking already cancelled')
    // HIGH-4: Reject cancel requests once the token has expired
    if (booking.tokenExpiresAt && booking.tokenExpiresAt < new Date())
      throw new BadRequestException('This cancellation link has expired')

    // FIX-5: Use conditional updateMany (WHERE status != CANCELLED) to make the
    // cancel atomic. Two concurrent requests can both pass the pre-check above
    // before either updates, causing duplicate cancellation emails.
    // updateMany returns count=0 if another request already cancelled first.
    const { count } = await this.prisma.booking.updateMany({
      where: { token, status: { not: BookingStatus.CANCELLED } },
      data: { status: BookingStatus.CANCELLED, cancelReason: reason ?? null },
    })
    if (count === 0) throw new ConflictException('Booking already cancelled')

    // Delete Google Calendar event (best-effort)
    if (booking.googleEventId) {
      void this.googleCalendar
        .deleteEvent(booking.ownerUserId, booking.googleEventId)
        .catch((err: unknown) =>
          this.logger.error(
            `Google deleteEvent failed: ${err instanceof Error ? err.message : String(err)}`,
          ),
        )
    }

    // Re-fetch the updated booking for the return value and emails
    const updated = await this.prisma.booking.findUnique({ where: { token } })

    // BUG-4: Notify owner when guest cancels
    const owner = await this.prisma.user.findUnique({
      where: { id: booking.ownerUserId },
      select: { email: true, name: true },
    })
    if (owner) {
      void this.email
        .sendCancellationConfirmationToGuest(booking, booking.appointmentType, owner, reason)
        .catch((err: unknown) =>
          this.logger.error(
            `sendCancellationConfirmationToGuest failed: ${err instanceof Error ? err.message : String(err)}`,
          ),
        )
      void this.email
        .sendCancellationNotificationToOwner(booking, booking.appointmentType, owner, reason)
        .catch((err: unknown) =>
          this.logger.error(
            `sendCancellationNotificationToOwner failed: ${err instanceof Error ? err.message : String(err)}`,
          ),
        )
    }

    return updated
  }

  async ownerCancelBooking(userId: string, bookingId: string, reason?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { appointmentType: { select: { name: true, location: true, timezone: true } } },
    })
    if (!booking || booking.ownerUserId !== userId) throw new NotFoundException()
    if (booking.status === BookingStatus.CANCELLED)
      throw new ConflictException('Booking already cancelled')

    // FIX-6: Same conditional-update pattern — prevents race between owner and guest
    // cancelling concurrently, both passing the status check and both sending emails.
    const { count } = await this.prisma.booking.updateMany({
      where: { id: bookingId, status: { not: BookingStatus.CANCELLED } },
      data: { status: BookingStatus.CANCELLED, cancelReason: reason ?? null },
    })
    if (count === 0) throw new ConflictException('Booking already cancelled')

    // Delete Google Calendar event (best-effort)
    if (booking.googleEventId) {
      void this.googleCalendar
        .deleteEvent(userId, booking.googleEventId)
        .catch((err: unknown) =>
          this.logger.error(
            `Google deleteEvent (owner cancel) failed: ${err instanceof Error ? err.message : String(err)}`,
          ),
        )
    }

    // Re-fetch for return value and emails
    const updated = await this.prisma.booking.findUnique({ where: { id: bookingId } })

    // BUG-5: Notify guest when owner cancels
    const owner = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    })
    if (owner) {
      void this.email
        .sendCancellationConfirmationToGuest(booking, booking.appointmentType, owner, reason)
        .catch((err: unknown) =>
          this.logger.error(
            `sendCancellationConfirmationToGuest (owner cancel) failed: ${err instanceof Error ? err.message : String(err)}`,
          ),
        )
    }

    return updated
  }

  async rescheduleByToken(token: string, newStartAtIso: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { token },
      include: { appointmentType: { include: { availabilityRules: true } } },
    })
    if (!booking) throw new NotFoundException()
    if (booking.status === BookingStatus.CANCELLED)
      throw new ConflictException('Cannot reschedule a cancelled booking')
    // HIGH-4: Reject reschedule requests once the token has expired
    if (booking.tokenExpiresAt && booking.tokenExpiresAt < new Date())
      throw new BadRequestException('This reschedule link has expired')

    const apt = booking.appointmentType
    // FIX-2: Block reschedule if the appointment type was deactivated or soft-deleted
    // after the original booking was made. Checking only at create-time is insufficient
    // because owners can deactivate types at any point.
    if (!apt.isActive || apt.deletedAt !== null)
      throw new BadRequestException('This appointment type is no longer available for booking')
    const newStartAt = new Date(newStartAtIso)
    if (isNaN(newStartAt.getTime())) throw new BadRequestException('Invalid startAt')

    // Reject past slots
    if (newStartAt <= new Date()) {
      throw new BadRequestException('Cannot reschedule to a slot in the past')
    }

    // BUG-3: Validate that the new slot falls within an availability window
    if (!isSlotInAvailability(newStartAt, apt)) {
      throw new BadRequestException('The requested time slot is not within the available schedule')
    }

    // FIX-F: Validate that the new slot is within the booking window (bufferDays)
    if (!isWithinBufferWindow(newStartAt, apt.bufferDays)) {
      throw new BadRequestException(
        `Bookings can only be rescheduled up to ${apt.bufferDays} days in advance`,
      )
    }

    const newEndAt = new Date(newStartAt.getTime() + apt.durationMins * 60_000)
    // LOW-1: Extend the conflict window by bufferAfterMins (see createBooking)
    const newBusyUntil = new Date(newEndAt.getTime() + apt.bufferAfterMins * 60_000)
    const conflictWindowStart = new Date(newStartAt.getTime() - apt.bufferAfterMins * 60_000)

    // CRITICAL-1: Wrap conflict check + update in a serializable transaction to
    // prevent two concurrent reschedules landing on the same slot.
    let updated: Awaited<ReturnType<typeof this.prisma.booking.update>>
    try {
      updated = await this.prisma.$transaction(
        async (tx) => {
          const conflict = await tx.booking.findFirst({
            where: {
              appointmentTypeId: apt.id,
              status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
              id: { not: booking.id },
              startAt: { lt: newBusyUntil },
              endAt: { gt: conflictWindowStart },
            },
          })
          if (conflict) throw new ConflictException('This time slot is no longer available')

          return tx.booking.update({
            where: { token },
            data: {
              startAt: newStartAt,
              endAt: newEndAt,
              reminderSentAt: null,
              // HIGH-4: Extend token expiry to 24 h after the new start time
              tokenExpiresAt: new Date(newStartAt.getTime() + 24 * 60 * 60_000),
            },
          })
        },
        { isolationLevel: 'Serializable' },
      )
    } catch (e) {
      if (e instanceof ConflictException || e instanceof BadRequestException) throw e
      throw new ConflictException('This time slot is no longer available')
    }

    // Update Google Calendar event (best-effort)
    if (booking.googleEventId) {
      void this.googleCalendar
        .updateEvent(booking.ownerUserId, booking.googleEventId, {
          start: { dateTime: newStartAt.toISOString(), timeZone: apt.timezone },
          end: { dateTime: newEndAt.toISOString(), timeZone: apt.timezone },
        })
        .catch((err: unknown) =>
          this.logger.error(
            `Google updateEvent failed: ${err instanceof Error ? err.message : String(err)}`,
          ),
        )
    }

    // Fetch owner for emails
    const owner = await this.prisma.user.findUnique({
      where: { id: booking.ownerUserId },
      select: { email: true, name: true },
    })
    if (owner) {
      void this.email
        .sendRescheduleConfirmationToGuest(updated, apt, owner)
        .catch((err: unknown) =>
          this.logger.error(
            `sendRescheduleConfirmationToGuest failed: ${err instanceof Error ? err.message : String(err)}`,
          ),
        )
      void this.email
        .sendRescheduleNotificationToOwner(updated, apt, owner)
        .catch((err: unknown) =>
          this.logger.error(
            `sendRescheduleNotificationToOwner failed: ${err instanceof Error ? err.message : String(err)}`,
          ),
        )
    }

    return updated
  }

  // ── Public lookup by card handle ────────────────────────────────────────────

  /** Resolves ownerUserId from a card handle for the public booking page. */
  async resolveOwnerByHandle(handle: string) {
    const card = await this.prisma.card.findFirst({
      where: { handle, isActive: true },
      select: { userId: true },
    })
    if (!card) throw new NotFoundException('Card not found')
    return card.userId
  }

  async getPublicAppointmentType(ownerUserId: string, slug: string, sourceHandle?: string) {
    const apt = await this.prisma.appointmentType.findUnique({
      where: { ownerUserId_slug: { ownerUserId, slug } },
      include: { availabilityRules: true, questions: { orderBy: { position: 'asc' } } },
    })
    if (!apt || !apt.isActive || apt.deletedAt !== null) throw new NotFoundException()

    const owner = await this.prisma.user.findUnique({
      where: { id: ownerUserId },
      select: { name: true, avatarUrl: true },
    })

    const sourceCard = sourceHandle
      ? await this.prisma.card.findFirst({
          where: { userId: ownerUserId, handle: sourceHandle, isActive: true },
          select: { id: true, handle: true },
        })
      : null

    const primaryCard =
      sourceCard ??
      (await this.prisma.card.findFirst({
        where: { userId: ownerUserId, isActive: true },
        orderBy: { createdAt: 'asc' },
        select: { id: true, handle: true },
      }))

    // MED-3: Return only the fields the public booking page needs.
    // ownerUserId, bufferDays, bufferAfterMins, createdAt, updatedAt, deletedAt
    // are internal fields that should never appear in a public unauthenticated response.
    return {
      id: apt.id,
      cardId: primaryCard?.id ?? null,
      cardHandle: primaryCard?.handle ?? null,
      name: apt.name,
      slug: apt.slug,
      description: apt.description,
      durationMins: apt.durationMins,
      color: apt.color,
      location: apt.location,
      timezone: apt.timezone,
      isActive: apt.isActive,
      availabilityRules: apt.availabilityRules,
      questions: apt.questions.map((question) => this.serializeQuestionOptions(question)),
      owner: owner
        ? { name: owner.name, avatarUrl: this.sanitizeAvatarUrl(owner.avatarUrl) }
        : { name: null, avatarUrl: null },
    }
  }

  /** Returns minimal public booking info for the reschedule / cancel page.
   *  FIX-K: ownerUserId is NOT exposed — it is an internal FK and should
   *  never appear in a public unauthenticated API response.
   */
  async getBookingInfoByToken(token: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { token },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        guestName: true,
        guestEmail: true,
        token: true,
        status: true,
        tokenExpiresAt: true,
        appointmentType: {
          select: {
            id: true,
            name: true,
            durationMins: true,
            color: true,
            location: true,
            // ownerUserId intentionally omitted — internal FK
            timezone: true,
          },
        },
      },
    })
    if (!booking) throw new NotFoundException()
    // MED-2: Expired links should not reveal booking details — treat as not found.
    if (booking.tokenExpiresAt && booking.tokenExpiresAt < new Date())
      throw new NotFoundException('This link has expired')
    // Omit tokenExpiresAt from the public response — internal field
    const { tokenExpiresAt, ...publicBooking } = booking
    void tokenExpiresAt
    return publicBooking
  }

  /**
   * FIX-A: Slot availability lookup keyed by booking token (for reschedule page).
   * This replaces the old public-by-id/:ownerUserId/:aptId/slots endpoint that
   * leaked internal ownerUserId and aptId in the URL, enabling IDOR enumeration.
   * Only the booking token (an opaque cuid) is needed.
   */
  async getAvailableSlotsByToken(token: string, date: string, guestTz?: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { token },
      select: {
        ownerUserId: true,
        status: true,
        tokenExpiresAt: true,
        appointmentType: { select: { slug: true, isActive: true } },
      },
    })
    if (!booking || !booking.appointmentType.isActive) throw new NotFoundException()
    // MED-2: Expired token — refuse slot browsing just as cancel/reschedule are refused
    if (booking.tokenExpiresAt && booking.tokenExpiresAt < new Date())
      throw new NotFoundException('This link has expired')
    // MED-2: Prevent cancelled bookings from browsing available slots — the
    // reschedule page should show a "booking cancelled" message instead.
    if (booking.status === BookingStatus.CANCELLED) throw new NotFoundException()
    return this.getAvailableSlots(booking.ownerUserId, booking.appointmentType.slug, date, guestTz)
  }
}
