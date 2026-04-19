import { NestFactory } from '@nestjs/core'
import { Logger } from '@nestjs/common'
import { AppModule } from '../app.module'
import { WebhooksService } from '../webhooks/webhooks.service'

const logger = new Logger('MigrateWebhookSecrets')

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false })

  try {
    const webhooks = app.get(WebhooksService)
    const result = await webhooks.migrateLegacySecrets()
    logger.log(
      `Webhook secret migration complete: scanned=${result.scanned} migrated=${result.migrated}`,
    )
  } finally {
    await app.close()
  }
}

main().catch((err) => {
  logger.error('Webhook secret migration failed', err instanceof Error ? err.stack : undefined)
  process.exit(1)
})
