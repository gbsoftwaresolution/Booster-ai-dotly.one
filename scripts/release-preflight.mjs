import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const repoRoot = new URL('../', import.meta.url)
const repoRootPath = fileURLToPath(repoRoot)

function read(relativePath) {
  return readFileSync(new URL(relativePath, repoRoot), 'utf8')
}

function fail(message) {
  console.error(`release-preflight: ${message}`)
  process.exitCode = 1
}

const modeArg = process.argv.find((arg) => arg.startsWith('--mode='))
const mode = modeArg?.slice('--mode='.length) ?? 'all'

if (!['all', 'tracked-env', 'mobile-submit', 'prod-env-docs'].includes(mode)) {
  fail(`unknown mode "${mode}"`)
}

function ensureEnvKeys(relativePath, requiredKeys) {
  const content = read(relativePath)
  for (const key of requiredKeys) {
    const pattern = new RegExp(`^${key}=`, 'm')
    if (!pattern.test(content)) {
      fail(`${relativePath} is missing required env example key ${key}`)
    }
  }
}

if (mode === 'all' || mode === 'mobile-submit') {
  const easJson = JSON.parse(read('apps/mobile/eas.json'))
  const iosSubmit = easJson?.submit?.production?.ios ?? {}
  for (const [key, value] of Object.entries(iosSubmit)) {
    if (typeof value === 'string' && value.includes('TODO_REPLACE')) {
      fail(`apps/mobile/eas.json still contains placeholder iOS submit value for ${key}`)
    }
  }
}

if (mode === 'all' || mode === 'tracked-env') {
  const trackedFiles = execFileSync('git', ['ls-files'], {
    cwd: repoRootPath,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean)

  const trackedEnvFiles = trackedFiles.filter((filePath) => {
    const normalized = filePath.replace(/\\/g, '/')
    return (
      /(\/|^)(\.env(\..*)?|\.env\.local)$/.test(normalized) && !normalized.endsWith('.env.example')
    )
  })

  for (const relativePath of trackedEnvFiles) {
    fail(`tracked real env file present in git: ${relativePath}`)
  }
}

if (mode === 'all' || mode === 'prod-env-docs') {
  ensureEnvKeys('apps/api/.env.example', [
    'DATABASE_URL',
    'AUTH_JWT_SECRET',
    'GOOGLE_AUTH_CLIENT_ID',
    'GOOGLE_AUTH_CLIENT_SECRET',
    'GOOGLE_AUTH_STATE_SECRET',
    'REDIS_URL',
    'WEB_URL',
    'MAILGUN_API_KEY',
    'MAILGUN_DOMAIN',
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET',
    'R2_PUBLIC_URL',
    'ARBITRUM_RPC_URL',
    'DOTLY_CONTRACT_ADDRESS',
    'DOTLY_USDT_ADDRESS',
    'DOTLY_PAYMENT_SIGNER_PRIVATE_KEY',
    'SENTRY_DSN',
  ])

  ensureEnvKeys('apps/web/.env.example', [
    'NEXT_PUBLIC_API_URL',
    'API_URL',
    'NEXT_PUBLIC_WEB_URL',
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_SITE_URL',
    'NEXT_PUBLIC_SENTRY_DSN',
  ])
}

if (process.exitCode) {
  process.exit(process.exitCode)
}

console.log('release-preflight: ok')
