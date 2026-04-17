import { Prisma } from '@dotly/database'
import { UsersService } from './users.service'

function createMissingColumnError(column: string): Prisma.PrismaClientKnownRequestError {
  const error = Object.create(
    Prisma.PrismaClientKnownRequestError.prototype,
  ) as Prisma.PrismaClientKnownRequestError & {
    code: string
    meta: { column: string }
  }
  error.code = 'P2022'
  error.meta = { column }
  return error
}

describe('UsersService.getMe', () => {
  it('returns a minimal user profile without internal push token', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user_1',
          email: 'user@example.com',
          name: 'User',
          avatarUrl: null,
          plan: 'PRO',
          walletAddress: null,
          country: 'US',
          timezone: 'America/New_York',
          notifLeadCaptured: true,
          notifWeeklyDigest: false,
          notifProductUpdates: false,
          pushToken: 'secret-push-token',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        }),
      },
    }

    const service = new UsersService(
      prisma as never,
      {} as never,
      { get: jest.fn().mockReturnValue(undefined) } as never,
    )
    const result = await service.getMe('user_1')

    expect(result).toEqual({
      id: 'user_1',
      email: 'user@example.com',
      name: 'User',
      avatarUrl: null,
      plan: 'PRO',
      walletAddress: null,
      country: 'US',
      timezone: 'America/New_York',
      notifLeadCaptured: true,
      notifWeeklyDigest: false,
      notifProductUpdates: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    })
    expect(result).not.toHaveProperty('pushToken')
  })

  it('falls back to legacy defaults when notification columns are missing in the local database', async () => {
    const findUnique = jest
      .fn()
      .mockRejectedValueOnce(createMissingColumnError('users.notifLeadCaptured'))
      .mockResolvedValueOnce({
        id: 'user_legacy',
        email: 'legacy@example.com',
        name: 'Legacy User',
        avatarUrl: null,
        plan: 'FREE',
        walletAddress: null,
        pushToken: null,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      })

    const prisma = {
      user: {
        findUnique,
      },
    }

    const service = new UsersService(
      prisma as never,
      {} as never,
      { get: jest.fn().mockReturnValue(undefined) } as never,
    )

    const result = await service.getMe('user_legacy')

    expect(findUnique).toHaveBeenCalledTimes(2)
    expect(result).toEqual({
      id: 'user_legacy',
      email: 'legacy@example.com',
      name: 'Legacy User',
      avatarUrl: null,
      plan: 'FREE',
      walletAddress: null,
      country: null,
      timezone: null,
      notifLeadCaptured: true,
      notifWeeklyDigest: true,
      notifProductUpdates: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    })
  })

  it('clears push token on logout cleanup path', async () => {
    const update = jest.fn().mockResolvedValue(undefined)
    const prisma = { user: { update } }
    const service = new UsersService(
      prisma as never,
      {} as never,
      { get: jest.fn().mockReturnValue(undefined) } as never,
    )

    await service.clearPushToken('user_1')

    expect(update).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: { pushToken: null },
    })
  })
})
