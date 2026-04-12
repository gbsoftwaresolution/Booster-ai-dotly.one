import { Controller, Get } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { Public } from '../auth/decorators/public.decorator'
import { RedisService } from '../redis/redis.service'
import { PrismaService } from '../prisma/prisma.service'
import { Prisma } from '@dotly/database'

function getApiVersion(): string {
  return process.env.npm_package_version ?? '0.0.0'
}

function getNodeEnv(): string {
  return process.env.NODE_ENV ?? 'development'
}

@ApiTags('health')
// MED-02: Removed @SkipThrottle().  The health endpoint is @Public and
// unauthenticated — allowing unlimited requests per second would let any
// external caller DoS-hammer the database and Redis on every request.
// The global throttle (100/min) is generous enough for uptime monitors
// which typically probe once every 30–60 seconds.
@Controller('health')
export class HealthController {
  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get()
  async check(): Promise<{
    status: string
    version: string
    environment: string
    services: { database: string; redis: string }
  }> {
    const [dbStatus, redisStatus] = await Promise.all([this.checkDatabase(), this.checkRedis()])

    // F-21: Remove `uptime` and `timestamp` from the public health response.
    // uptime is a useful fingerprinting signal (reveals last restart time and
    // exact process start offset). timestamp leaks server clock precision.
    // Load balancers and uptime monitors only need the top-level `status` field
    // and the per-service ok/error breakdown; they don't need timing metadata.
    return {
      status: dbStatus === 'ok' && redisStatus === 'ok' ? 'ok' : 'degraded',
      version: getApiVersion(),
      environment: getNodeEnv(),
      services: {
        database: dbStatus,
        redis: redisStatus,
      },
    }
  }

  @Public()
  @Get('live')
  live(): { status: string; version: string; environment: string } {
    return {
      status: 'ok',
      version: getApiVersion(),
      environment: getNodeEnv(),
    }
  }

  private async checkDatabase(): Promise<string> {
    try {
      await this.prisma.$queryRaw(Prisma.sql`SELECT 1`)
      return 'ok'
    } catch {
      return 'error'
    }
  }

  private async checkRedis(): Promise<string> {
    try {
      const healthy = await this.redis.isHealthy()
      return healthy ? 'ok' : 'error'
    } catch {
      return 'error'
    }
  }
}
