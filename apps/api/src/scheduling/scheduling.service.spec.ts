import { ConflictException } from '@nestjs/common'
import { SchedulingService } from './scheduling.service'

describe('SchedulingService booking buffers', () => {
  function createService(overrides?: {
    bookingFindFirst?: jest.Mock
    bookingFindUnique?: jest.Mock
  }) {
    const bookingFindFirst = overrides?.bookingFindFirst ?? jest.fn()
    const bookingFindUnique = overrides?.bookingFindUnique ?? jest.fn()

    const prisma = {
      appointmentType: {
        findUnique: jest.fn().mockResolvedValue({
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
        }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ email: 'owner@example.com', name: 'Owner' }),
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

    return {
      service: new SchedulingService(
        prisma as never,
        email as never,
        googleCalendar as never,
        config as never,
        contactsService as never,
      ),
      bookingFindFirst,
      contactsService,
    }
  }

  it('rejects createBooking when an existing booking buffer overlaps the requested slot', async () => {
    const existingBooking = {
      id: 'booking_existing',
      startAt: new Date('2026-04-13T10:15:00.000Z'),
      endAt: new Date('2026-04-13T10:45:00.000Z'),
    }
    const { service, bookingFindFirst } = createService({
      bookingFindFirst: jest.fn().mockResolvedValue(existingBooking),
    })

    await expect(
      service.createBooking('owner_1', 'intro-call', {
        startAt: '2026-04-13T10:45:00.000Z',
        guestName: 'Guest',
        guestEmail: 'guest@example.com',
        guestNotes: '',
        answers: [],
      }),
    ).rejects.toThrow(ConflictException)

    expect(bookingFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          startAt: { lt: new Date('2026-04-13T11:30:00.000Z') },
          endAt: { gt: new Date('2026-04-13T10:30:00.000Z') },
        }),
      }),
    )
  })

  it('rejects reschedule when the new slot lands inside another booking buffer', async () => {
    const bookingFindUnique = jest
      .fn()
      .mockResolvedValueOnce({
        id: 'booking_current',
        token: 'token_1',
        ownerUserId: 'owner_1',
        status: 'CONFIRMED',
        startAt: new Date('2026-04-13T09:00:00.000Z'),
        endAt: new Date('2026-04-13T09:30:00.000Z'),
        tokenExpiresAt: new Date('2026-04-14T09:00:00.000Z'),
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
        startAt: new Date('2026-04-13T10:15:00.000Z'),
        endAt: new Date('2026-04-13T10:45:00.000Z'),
      }),
    })

    await expect(service.rescheduleByToken('token_1', '2026-04-13T10:45:00.000Z')).rejects.toThrow(
      ConflictException,
    )

    expect(bookingFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          startAt: { lt: new Date('2026-04-13T11:30:00.000Z') },
          endAt: { gt: new Date('2026-04-13T10:30:00.000Z') },
        }),
      }),
    )
  })

  it('creates a CRM contact after a successful booking', async () => {
    const { service, contactsService } = createService({
      bookingFindFirst: jest.fn().mockResolvedValue(null),
    })

    await service.createBooking('owner_1', 'intro-call', {
      startAt: '2026-04-13T10:00:00.000Z',
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
})
