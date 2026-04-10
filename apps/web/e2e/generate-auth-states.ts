import { chromium } from '@playwright/test'
import * as path from 'path'

type PlanKey = 'free' | 'starter' | 'pro'

interface AccountConfig {
  email: string
  password: string
  outputPath: string
}

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env: ${name}`)
  return value
}

function getAccountConfig(plan: PlanKey): AccountConfig {
  const upper = plan.toUpperCase()
  return {
    email: requiredEnv(`PLAYWRIGHT_${upper}_EMAIL`),
    password: requiredEnv(`PLAYWRIGHT_${upper}_PASSWORD`),
    outputPath: path.resolve(process.cwd(), `.auth/${plan}.json`),
  }
}

async function signIn(plan: PlanKey): Promise<void> {
  const config = getAccountConfig(plan)
  const browser = await chromium.launch()
  const page = await browser.newPage({
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
  })

  try {
    await page.goto('/auth')
    await page.getByLabel(/email address/i).fill(config.email)
    await page.getByLabel(/^password$/i).fill(config.password)
    await page.getByRole('button', { name: /^sign in$/i }).click()
    await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 30000 })
    await page.context().storageState({ path: config.outputPath })
    process.stdout.write(`Saved ${plan} auth state to ${config.outputPath}\n`)
  } finally {
    await browser.close()
  }
}

async function main(): Promise<void> {
  const requested = (process.argv[2] || 'all').toLowerCase()
  const plans: PlanKey[] = requested === 'all' ? ['free', 'starter', 'pro'] : [requested as PlanKey]

  for (const plan of plans) {
    if (!['free', 'starter', 'pro'].includes(plan)) {
      throw new Error(`Unknown plan '${plan}'. Use free, starter, pro, or all.`)
    }
    await signIn(plan)
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack || error.message : String(error)
  process.stderr.write(`${message}\n`)
  process.exit(1)
})
