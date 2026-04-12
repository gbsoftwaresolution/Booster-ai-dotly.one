import { HealthController } from './health.controller'

describe('HealthController', () => {
  const originalNodeEnv = process.env.NODE_ENV
  const originalVersion = process.env.npm_package_version

  beforeEach(() => {
    process.env.NODE_ENV = 'test'
    process.env.npm_package_version = '9.9.9'
  })

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv
    process.env.npm_package_version = originalVersion
  })

  it('reports readiness with version, environment, and dependency states', async () => {
    const controller = new HealthController(
      { isHealthy: jest.fn().mockResolvedValue(true) } as never,
      { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) } as never,
    )

    await expect(controller.check()).resolves.toEqual({
      status: 'ok',
      version: '9.9.9',
      environment: 'test',
      services: {
        database: 'ok',
        redis: 'ok',
      },
    })
  })

  it('reports degraded when a dependency fails', async () => {
    const controller = new HealthController(
      { isHealthy: jest.fn().mockResolvedValue(false) } as never,
      { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) } as never,
    )

    await expect(controller.check()).resolves.toEqual({
      status: 'degraded',
      version: '9.9.9',
      environment: 'test',
      services: {
        database: 'ok',
        redis: 'error',
      },
    })
  })

  it('reports liveness without touching dependencies', () => {
    const redis = { isHealthy: jest.fn() }
    const prisma = { $queryRaw: jest.fn() }
    const controller = new HealthController(redis as never, prisma as never)

    expect(controller.live()).toEqual({
      status: 'ok',
      version: '9.9.9',
      environment: 'test',
    })
    expect(redis.isHealthy).not.toHaveBeenCalled()
    expect(prisma.$queryRaw).not.toHaveBeenCalled()
  })
})
