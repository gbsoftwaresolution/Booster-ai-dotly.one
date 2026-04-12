import { UsersService } from './users.service'

describe('UsersService.getMe', () => {
  it('returns a minimal user profile without internal push token or supabase id', async () => {
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
          supabaseId: 'supabase-secret',
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
    expect(result).not.toHaveProperty('supabaseId')
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
