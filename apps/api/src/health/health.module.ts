import { Module } from '@nestjs/common'
import { HealthController } from './health.controller'
import { PrismaModule } from '../prisma/prisma.module'
import { RedisModule } from '../redis/redis.module'

@Module({
  // RedisModule is @Global() so RedisService is technically available without
  // importing it here, but we import it explicitly to make the dependency
  // graph clear and to prevent breakage if @Global() is ever removed.
  imports: [PrismaModule, RedisModule],
  controllers: [HealthController],
})
export class HealthModule {}
