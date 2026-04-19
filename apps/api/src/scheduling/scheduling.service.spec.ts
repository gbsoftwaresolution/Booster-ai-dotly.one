import { BadRequestException, ConflictException } from '@nestjs/common'
import { SchedulingService } from './scheduling.service'

function nextUtcWeekdayAt(targetDow: number, hour: number, minute: number): Date {
  const candidate = new Date()
  candidate.setUTCHours(hour, minute, 0, 0)

  let daysUntil = (targetDow - candidate.getUTCDay() + 7) % 7
  if (daysUntil === 0) {
    daysUntil = 7
  }

  candidate.setUTCDate(candidate.getUTCDate() + daysUntil)
  return candidate
}

describe('SchedulingService booking buffers', () => {
  function createService(overrides?: {
    bookingFindFirst?: jest.Mock
    bookingFindUnique?: jest.Mock
    appointmentTypeFindUnique?: jest.Mock
    bookingDepositFindUnique?: jest.Mock
    bookingDepositCreate?: jest.Mock
    bookingDepositUpdate?: jest.Mock
  }) {
    const bookingFindFirst = overrides?.bookingFindFirst ?? jest.fn()
    const bookingFindUnique = overrides?.bookingFindUnique ?? jest.fn()
    const appointmentTypeFindUnique =
      overrides?.appointmentTypeFindUnique ??
      jest.fn().mockResolvedValue({
        id: 'apt_1',
        ownerUserId: 'owner_1',
        slug: 'intro-call',
        name: 'Intro Call',
        isActive: true,
        deletedAt: null,
        durationMins: 30,
        bufferAfterMins: 15,
        bufferDays: 60,
        timezone: 'UTC',
        availabilityRules: [{ dayOfWeek: 'MON', startTime: '10:00', endTime: '12:00' }],
        questions: [],
      })
    const bookingDepositFindUnique = overrides?.bookingDepositFindUnique ?? jest.fn()
    const bookingDepositCreate = overrides?.bookingDepositCreate ?? jest.fn()
    const bookingDepositUpdate = overrides?.bookingDepositUpdate ?? jest.fn()
    const userFindUnique = jest.fn().mockResolvedValue({
      email: 'owner@example.com',
      name: 'Owner',
      walletAddress: '0xhostwallet',
    })

    const prisma = {
      appointmentType: {
        findUnique: appointmentTypeFindUnique,
      },
      contact: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      contactTimeline: {
        create: jest.fn().mockResolvedValue(undefined),
      },
      user: {
        findUnique: userFindUnique,
      },
      bookingDeposit: {
        findUnique: bookingDepositFindUnique,
        create: bookingDepositCreate,
        update: bookingDepositUpdate,
      },
      booking: {
        findUnique: bookingFindUnique,
      },
      $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          booking: {
            findFirst: bookingFindFirst,
            create: jest.fn(),
            update: jest.fn(),
          },
          bookingAnswer: {
            createMany: jest.fn(),
          },
          bookingDeposit: {
            update: bookingDepositUpdate,
          },
        }),
      ),
    }

    const email = {
      sendBookingConfirmationToGuest: jest.fn().mockResolvedValue(undefined),
      sendBookingNotificationToOwner: jest.fn().mockResolvedValue(undefined),
      sendRescheduleConfirmationToGuest: jest.fn().mockResolvedValue(undefined),
    }
    const googleCalendar = {
      getBusyTimes: jest.fn().mockResolvedValue([]),
      createEvent: jest.fn().mockResolvedValue(null),
      updateEvent: jest.fn().mockResolvedValue(undefined),
    }
    const config = { get: jest.fn().mockReturnValue('https://cdn.dotly.one') }
    const contactsService = {
      create: jest.fn().mockResolvedValue(undefined),
    }
    const audit = {
      log: jest.fn().mockResolvedValue(undefined),
    }

    return {
      service: new SchedulingService(
        prisma as never,
        email as never,
        googleCalendar as never,
        config as never,
        contactsService as never,
        audit as never,
      ),
      bookingFindFirst,
      contactsService,
      bookingDepositCreate,
      bookingDepositUpdate,
      bookingDepositFindUnique,
      userFindUnique,
    }
  }

  it('rejects createBooking when an existing booking buffer overlaps the requested slot', async () => {
    const existingStart = nextUtcWeekdayAt(1, 10, 15)
    const existingEnd = new Date(existingStart.getTime() + 30 * 60_000)
    const requestedStart = nextUtcWeekdayAt(1, 10, 45)
    const existingBooking = {
      id: 'booking_existing',
      startAt: existingStart,
      endAt: existingEnd,
    }
    const { service, bookingFindFirst } = createService({
      bookingFindFirst: jest.fn().mockResolvedValue(existingBooking),
    })

    await expect(
      service.createBooking('owner_1', 'intro-call', {
        startAt: requestedStart.toISOString(),
        guestName: 'Guest',
        guestEmail: 'guest@example.com',
        guestNotes: '',
        answers: [],
      }),
    ).rejects.toThrow(ConflictException)

    expect(bookingFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          startAt: { lt: new Date(requestedStart.getTime() + 45 * 60_000) },
          endAt: { gt: new Date(requestedStart.getTime() - 15 * 60_000) },
        }),
      }),
    )
  })

  it('rejects reschedule when the new slot lands inside another booking buffer', async () => {
    const currentStart = nextUtcWeekdayAt(1, 9, 0)
    const currentEnd = new Date(currentStart.getTime() + 30 * 60_000)
    const requestedStart = nextUtcWeekdayAt(1, 10, 45)
    const existingStart = nextUtcWeekdayAt(1, 10, 15)
    const existingEnd = new Date(existingStart.getTime() + 30 * 60_000)
    const bookingFindUnique = jest
      .fn()
      .mockResolvedValueOnce({
        id: 'booking_current',
        token: 'token_1',
        ownerUserId: 'owner_1',
        status: 'CONFIRMED',
        startAt: currentStart,
        endAt: currentEnd,
        tokenExpiresAt: new Date(Date.now() + 24 * 60 * 60_000),
        googleEventId: null,
        appointmentType: {
          id: 'apt_1',
          ownerUserId: 'owner_1',
          slug: 'intro-call',
          name: 'Intro Call',
          isActive: true,
          deletedAt: null,
          durationMins: 30,
          bufferAfterMins: 15,
          bufferDays: 60,
          timezone: 'UTC',
          availabilityRules: [{ dayOfWeek: 'MON', startTime: '10:00', endTime: '12:00' }],
        },
      })
      .mockResolvedValueOnce(null)
    const { service, bookingFindFirst } = createService({
      bookingFindUnique,
      bookingFindFirst: jest.fn().mockResolvedValue({
        id: 'booking_existing',
        startAt: existingStart,
        endAt: existingEnd,
      }),
    })

    await expect(
      service.rescheduleByToken('token_1', requestedStart.toISOString()),
    ).rejects.toThrow(ConflictException)

    expect(bookingFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          startAt: { lt: new Date(requestedStart.getTime() + 45 * 60_000) },
          endAt: { gt: new Date(requestedStart.getTime() - 15 * 60_000) },
        }),
      }),
    )
  })

  it('creates a CRM contact after a successful booking', async () => {
    const requestedStart = nextUtcWeekdayAt(1, 10, 0)
    const { service, contactsService } = createService({
      bookingFindFirst: jest.fn().mockResolvedValue(null),
    })

    await service.createBooking('owner_1', 'intro-call', {
      startAt: requestedStart.toISOString(),
      guestName: 'Guest User',
      guestEmail: 'guest@example.com',
      guestNotes: 'Interested in pricing',
      answers: [],
    })

    expect(contactsService.create).toHaveBeenCalledWith('owner_1', {
      name: 'Guest User',
      email: 'guest@example.com',
      notes: 'Interested in pricing',
    })
  })

  it('rejects deposit-enabled bookings without a verified deposit record', async () => {
    const requestedStart = nextUtcWeekdayAt(1, 10, 0)
    const appointmentTypeFindUnique = jest.fn().mockResolvedValue({
      id: 'apt_1',
      ownerUserId: 'owner_1',
      slug: 'intro-call',
      name: 'Intro Call',
      isActive: true,
      deletedAt: null,
      durationMins: 30,
      bufferAfterMins: 15,
      bufferDays: 60,
      timezone: 'UTC',
      depositEnabled: true,
      depositAmountUsdt: '10.00',
      availabilityRules: [{ dayOfWeek: 'MON', startTime: '10:00', endTime: '12:00' }],
      questions: [],
    })

    const { service } = createService({
      appointmentTypeFindUnique,
      bookingDepositFindUnique: jest.fn().mockResolvedValue(null),
      bookingFindFirst: jest.fn().mockResolvedValue(null),
    })

    await expect(
      service.createBooking('owner_1', 'intro-call', {
        startAt: requestedStart.toISOString(),
        guestName: 'Guest User',
        guestEmail: 'guest@example.com',
        guestNotes: '',
        depositPaymentId: 'dep_missing',
        depositTxHash: `0x${'1'.repeat(64)}`,
        answers: [],
      }),
    ).rejects.toThrow(BadRequestException)
  })

  it('creates a persisted deposit intent for deposit-enabled appointment types', async () => {
    const requestedStart = nextUtcWeekdayAt(1, 10, 0)
    const appointmentTypeFindUnique = jest.fn().mockResolvedValue({
      id: 'apt_1',
      ownerUserId: 'owner_1',
      slug: 'intro-call',
      name: 'Intro Call',
      isActive: true,
      deletedAt: null,
      durationMins: 30,
      bufferAfterMins: 15,
      bufferDays: 60,
      timezone: 'UTC',
      depositEnabled: true,
      depositAmountUsdt: '15.00',
      availabilityRules: [{ dayOfWeek: 'MON', startTime: '10:00', endTime: '12:00' }],
    })

    const { service, bookingDepositCreate } = createService({ appointmentTypeFindUnique })

    const result = await service.createBookingDepositIntent('owner_1', 'intro-call', {
      guestName: 'Guest User',
      guestEmail: 'guest@example.com',
      walletAddress: '0xguestwallet',
      startAt: requestedStart.toISOString(),
    })

    expect(result.amountUsdt).toBe('15.00')
    expect(result.depositPaymentId).toMatch(/^dep_/)
    expect(bookingDepositCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          appointmentTypeId: 'apt_1',
          ownerUserId: 'owner_1',
          guestName: 'Guest User',
          guestEmail: 'guest@example.com',
          walletAddress: '0xguestwallet',
          recipientAddress: '0xhostwallet',
          amountUsdt: '15.00',
        }),
      }),
    )
  })

  it('expires stale deposit intents before booking verification', async () => {
    const requestedStart = nextUtcWeekdayAt(1, 10, 0)
    const appointmentTypeFindUnique = jest.fn().mockResolvedValue({
      id: 'apt_1',
      ownerUserId: 'owner_1',
      slug: 'intro-call',
      name: 'Intro Call',
      isActive: true,
      deletedAt: null,
      durationMins: 30,
      bufferAfterMins: 15,
      bufferDays: 60,
      timezone: 'UTC',
      depositEnabled: true,
      depositAmountUsdt: '10.00',
      availabilityRules: [{ dayOfWeek: 'MON', startTime: '10:00', endTime: '12:00' }],
      questions: [],
    })

    const staleCreatedAt = new Date(Date.now() - 31 * 60_000)
    const { service, bookingDepositFindUnique, bookingDepositUpdate } = createService({
      appointmentTypeFindUnique,
      bookingDepositFindUnique: jest.fn().mockResolvedValue({
        ownerUserId: 'owner_1',
        appointmentType: { slug: 'intro-call' },
        walletAddress: '0xguestwallet',
        recipientAddress: '0xhostwallet',
        amountUsdt: '10.00',
        amountRaw: '10000000',
        startAt: requestedStart,
        tokenAddress: '0xtoken',
        status: 'INTENT_CREATED',
        txHash: null,
        createdAt: staleCreatedAt,
      }),
      bookingFindFirst: jest.fn().mockResolvedValue(null),
    })

    await expect(
      service.createBooking('owner_1', 'intro-call', {
        startAt: requestedStart.toISOString(),
        guestName: 'Guest User',
        guestEmail: 'guest@example.com',
        guestNotes: '',
        depositPaymentId: 'dep_stale',
        depositTxHash: `0x${'1'.repeat(64)}`,
        answers: [],
      }),
    ).rejects.toThrow('Deposit intent has expired')

    expect(bookingDepositFindUnique).toHaveBeenCalled()
    expect(bookingDepositUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { paymentId: 'dep_stale' },
        data: { status: 'EXPIRED' },
      }),
    )
  })
})
