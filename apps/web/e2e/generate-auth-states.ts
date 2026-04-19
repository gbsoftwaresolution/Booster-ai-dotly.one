import { request } from '@playwright/test'
import * as path from 'path'

type PlanKey = 'free' | 'starter' | 'pro'

interface AccountConfig {
  email: string
  password: string
  outputPath: string
}

function shouldRelaxSecureCookies(baseUrl: string): boolean {
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(baseUrl)
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
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
  const context = await request.newContext({
    baseURL,
  })

  try {
    const response = await context.post('/api/auth/sign-in', {
      data: {
        email: config.email,
        password: config.password,
      },
    })

    if (!response.ok()) {
      throw new Error(`Sign-in failed for ${plan}: ${response.status()} ${await response.text()}`)
    }

    const storageState = await context.storageState()
    const cookies = storageState.cookies
    if (!cookies.some((cookie) => cookie.name === 'dotly_refresh_token')) {
      throw new Error(`Missing refresh token cookie for ${plan}`)
    }

    const normalizedStorageState = shouldRelaxSecureCookies(baseURL)
      ? {
          ...storageState,
          cookies: storageState.cookies.map((cookie) => ({ ...cookie, secure: false })),
        }
      : storageState

    const fs = await import('node:fs/promises')
    await fs.writeFile(config.outputPath, JSON.stringify(normalizedStorageState, null, 2))
    process.stdout.write(`Saved ${plan} auth state to ${config.outputPath}\n`)
  } finally {
    await context.dispose()
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
