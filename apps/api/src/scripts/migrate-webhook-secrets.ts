import { NestFactory } from '@nestjs/core'
import { AppModule } from '../app.module'
import { WebhooksService } from '../webhooks/webhooks.service'

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false })

  try {
    const webhooks = app.get(WebhooksService)
    const result = await webhooks.migrateLegacySecrets()
    console.log(
      `Webhook secret migration complete: scanned=${result.scanned} migrated=${result.migrated}`,
    )
  } finally {
    await app.close()
  }
}

main().catch((err) => {
  console.error('Webhook secret migration failed:', err)
  process.exit(1)
})
