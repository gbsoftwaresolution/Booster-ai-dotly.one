import { AnalyticsService } from './analytics.service'

function createPrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
    },
    card: {
      findUnique: jest.fn(),
    },
    contact: {
      count: jest.fn(),
    },
    analyticsEvent: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    $queryRaw: jest.fn(),
  }
}

function createRedisMock() {
  return {
    getClient: jest.fn(() => ({
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      rpush: jest.fn(),
      lrange: jest.fn(),
      ltrim: jest.fn(),
      eval: jest.fn(),
    })),
  }
}

describe('AnalyticsService', () => {
  it('getSummary checks ownership with a drift-safe card select', async () => {
    const prisma = createPrismaMock()
    const redis = createRedisMock()
    const service = new AnalyticsService(prisma as never, redis as never)

    prisma.user.findUnique.mockResolvedValueOnce({ id: 'owner-1' })
    prisma.card.findUnique.mockResolvedValueOnce({ id: 'card-1', userId: 'owner-1' })
    prisma.analyticsEvent.groupBy.mockResolvedValueOnce([
      { type: 'VIEW', _count: { _all: 12 } },
      { type: 'CLICK', _count: { _all: 4 } },
    ])
    prisma.$queryRaw
      .mockResolvedValueOnce([{ date: '2026-04-04', count: 3n }])
      .mockResolvedValueOnce([{ date: '2026-04-04', count: 1n }])
    prisma.contact.count.mockResolvedValueOnce(2)

    const result = await service.getSummary('card-1', 'owner-1')

    expect(prisma.card.findUnique).toHaveBeenCalledWith({
      where: { id: 'card-1' },
      select: { id: true, userId: true },
    })
    expect(result.totalViews).toBe(12)
    expect(result.totalClicks).toBe(4)
    expect(result.totalLeads).toBe(2)
  })

  it('getAnalytics resolves authenticated user ids and keeps the card lookup narrow', async () => {
    const prisma = createPrismaMock()
    const redis = createRedisMock()
    const service = new AnalyticsService(prisma as never, redis as never)

    const from = new Date('2026-04-01T00:00:00.000Z')
    const to = new Date('2026-04-07T23:59:59.999Z')

    prisma.user.findUnique.mockResolvedValueOnce({ id: 'owner-1' })
    prisma.card.findUnique.mockResolvedValueOnce({ id: 'card-1', userId: 'owner-1' })
    prisma.analyticsEvent.findMany.mockResolvedValueOnce([
      {
        type: 'VIEW',
        createdAt: new Date('2026-04-03T12:00:00.000Z'),
        device: 'mobile',
        country: 'US',
        referrer: 'direct',
        metadata: {},
      },
      {
        type: 'CLICK',
        createdAt: new Date('2026-04-03T12:05:00.000Z'),
        device: 'mobile',
        country: 'US',
        referrer: 'direct',
        metadata: { linkPlatform: 'linkedin' },
      },
    ])
    prisma.contact.count.mockResolvedValueOnce(1)
    prisma.$queryRaw.mockResolvedValueOnce([{ count: 1n }])
    prisma.analyticsEvent.groupBy.mockResolvedValueOnce([
      { type: 'VIEW', _count: { _all: 8 } },
      { type: 'CLICK', _count: { _all: 3 } },
    ])

    const result = await service.getAnalytics('card-1', 'owner-1', { from, to })

    expect(prisma.card.findUnique).toHaveBeenCalledWith({
      where: { id: 'card-1' },
      select: { id: true, userId: true },
    })
    expect(result.summary.totalViews).toBe(8)
    expect(result.summary.totalClicks).toBe(3)
    expect(result.summary.totalLeads).toBe(1)
    expect(result.summary.uniqueVisitors).toBe(1)
  })
})
