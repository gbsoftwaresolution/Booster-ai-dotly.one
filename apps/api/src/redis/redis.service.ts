import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis
  private readonly logger = new Logger(RedisService.name)

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.config.getOrThrow<string>('REDIS_URL')
    this.client = new Redis(redisUrl, {
      lazyConnect: true,
      enableOfflineQueue: false,
    })
    this.client.on('connect', () => this.logger.log('Redis connected'))
    this.client.on('error', (err: Error) => this.logger.error('Redis error', err))
    this.client.connect().catch(() => this.logger.warn('Redis unavailable — fallback mode active'))
  }

  async onModuleDestroy() {
    await this.client?.quit()
  }

  getClient(): Redis {
    return this.client
  }

  async isHealthy(): Promise<boolean> {
    try {
      return (await this.client.ping()) === 'PONG'
    } catch {
      return false
    }
  }
}
