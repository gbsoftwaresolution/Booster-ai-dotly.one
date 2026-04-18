import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ScheduleModule } from '@nestjs/schedule'
import { BullModule } from '@nestjs/bull'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { ThrottlerStorageRedisService } from 'nestjs-throttler-storage-redis'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './auth/auth.module'
import { HealthModule } from './health/health.module'
import { UsersModule } from './users/users.module'
import { CardsModule } from './cards/cards.module'
import { AnalyticsModule } from './analytics/analytics.module'
import { ContactsModule } from './contacts/contacts.module'
import { BillingModule } from './billing/billing.module'
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard'
import { RedisModule } from './redis/redis.module'
import { EmailModule } from './email/email.module'
import { TeamsModule } from './teams/teams.module'
import { CustomDomainsModule } from './custom-domains/custom-domains.module'
import { NotificationsModule } from './notifications/notifications.module'
import { AiModule } from './ai/ai.module'
import { LoggerModule } from './common/logger/logger.module'
import { AuditModule } from './audit/audit.module'
import { WebhooksModule } from './webhooks/webhooks.module'
import { LeadFormModule } from './lead-form/lead-form.module'
import { WalletPassesModule } from './wallet-passes/wallet-passes.module'
import { SchedulingModule } from './scheduling/scheduling.module'
import { InboxModule } from './inbox/inbox.module'
import { SalesLinkModule } from './sales-link/sales-link.module'
import { PaymentAccountsModule } from './payment-accounts/payment-accounts.module'
import { validate } from './config/env.validation'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = config.getOrThrow<string>('REDIS_URL')
        const parsed = new URL(redisUrl)
        // M-07: Support rediss:// (TLS) scheme used by managed Redis providers
        // such as Upstash, Redis Cloud, and Railway. When the scheme is rediss://
        // we must pass tls:{} to ioredis or the TLS handshake will never start
        // and the connection will hang / be rejected by the server.
        const tls = parsed.protocol === 'rediss:' ? {} : undefined
        return { redis: redisUrl, ...(tls !== undefined && { tls }) }
      },
    }),
    ThrottlerModule.forRootAsync({
      // H-10: Use Redis-backed storage so rate-limit counters are shared
      // across all API pods.  In-memory storage (the default) means each
      // pod has its own counters — a client can bypass the limit by round-
      // robining across instances, which is trivially easy with modern load
      // balancers.  Redis-backed storage ensures the limit is enforced
      // globally regardless of how many replicas are running.
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{ ttl: 60000, limit: 100 }],
        storage: new ThrottlerStorageRedisService(config.getOrThrow<string>('REDIS_URL')),
      }),
    }),
    LoggerModule,
    PrismaModule,
    RedisModule,
    EmailModule,
    AuthModule,
    HealthModule,
    UsersModule,
    CardsModule,
    AnalyticsModule,
    ContactsModule,
    BillingModule,
    TeamsModule,
    CustomDomainsModule,
    NotificationsModule,
    AiModule,
    AuditModule,
    WebhooksModule,
    LeadFormModule,
    WalletPassesModule,
    SchedulingModule,
    InboxModule,
    SalesLinkModule,
    PaymentAccountsModule,
  ],
  providers: [
    // ThrottlerGuard MUST run first (before JwtAuthGuard) so that every
    // inbound request — authenticated or not — is rate-limited before any
    // token validation occurs.  This blocks JWT brute-force, credential
    // stuffing, and enumeration floods against protected endpoints.
    // Registering JwtAuthGuard first would mean unauthenticated probes of
    // protected routes are rejected before consuming rate-limit quota, leaving
    // public endpoints effectively un-throttled at the guard level.
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
