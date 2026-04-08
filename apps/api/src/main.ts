import * as Sentry from '@sentry/node'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import helmet from 'helmet'
import * as express from 'express'
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston'
import { AppModule } from './app.module'
import { SentryExceptionFilter } from './common/filters/sentry-exception.filter'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  enabled: !!process.env.SENTRY_DSN,
})

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER))

  // Fail fast if critical env vars are missing
  const webUrl = process.env['WEB_URL']
  if (!webUrl) {
    console.error('[Bootstrap] FATAL: WEB_URL environment variable is not set. CORS will be misconfigured. Aborting.')
    process.exit(1)
  }

  // M-7: Support multiple allowed CORS origins via a comma-separated
  // CORS_ORIGINS env var (e.g. for staging, preview deploys, mobile dev).
  // WEB_URL is always included as a baseline origin.
  const extraOrigins = (process.env['CORS_ORIGINS'] ?? '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean)
  const allowedOrigins = Array.from(new Set([webUrl, ...extraOrigins]))

  // F-14: Tell Express to trust the first hop of X-Forwarded-For.
  // Without this, when the API runs behind a load balancer (Vercel / Railway /
  // Railway), req.ip is always the LB's IP and the throttler keys every user
  // to the same bucket, allowing one user's burst to rate-limit all others.
  // "1" = trust exactly one proxy level; adjust if there are more upstream hops.
  app.getHttpAdapter().getInstance().set('trust proxy', 1)

  // F-08: Enforce a hard body-size cap so large payloads are rejected before
  // NestJS DTO validation runs.  The UploadAvatarDto allows up to 7 MB base64;
  // 8 MB gives a small margin while still being far below Express's 100 MB default.
  app.use(express.json({ limit: '8mb' }))
  app.use(express.urlencoded({ extended: true, limit: '8mb' }))

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    }),
  )
  app.enableCors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    credentials: true,
  })
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )
  app.useGlobalFilters(new SentryExceptionFilter())

  app.enableShutdownHooks()

  const port = process.env.PORT || 3001
  await app.listen(port)
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER)
  logger.log(`Dotly API running on http://localhost:${port}`, 'Bootstrap')

  const config = new DocumentBuilder()
    .setTitle('Dotly.one API')
    .setDescription('Digital Smart Business Card Platform API')
    .setVersion('1.0')
    // L-01: addBearerAuth() registers the security scheme in the OpenAPI spec.
    // addSecurityRequirements() then marks EVERY endpoint as requiring it by
    // default, so the Swagger UI shows the padlock on all operations without
    // needing @ApiBearerAuth() on every controller method.  Public endpoints
    // that use @Public() still work — the guard exempts them at runtime.
    .addBearerAuth()
    .addSecurityRequirements('bearer')
    .build()
  const document = SwaggerModule.createDocument(app, config)

  // Swagger is only mounted when explicitly enabled via SWAGGER_ENABLED=true,
  // or when running outside production.  This prevents the full API schema
  // (all endpoint paths, parameter shapes, and auth requirements) from being
  // publicly accessible in production where it would aid attackers.
  const swaggerEnabled =
    process.env.NODE_ENV !== 'production' || process.env.SWAGGER_ENABLED === 'true'
  if (swaggerEnabled) {
    SwaggerModule.setup('api/docs', app, document)
    logger.log(`Swagger: http://localhost:${port}/api/docs`, 'Bootstrap')
  }
}
bootstrap().catch((err) => {
  console.error('[Bootstrap] Fatal error during startup:', err)
  process.exit(1)
})
