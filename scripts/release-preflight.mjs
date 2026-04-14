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

if (!['all', 'tracked-env', 'mobile-submit'].includes(mode)) {
  fail(`unknown mode "${mode}"`)
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
    return /(\/|^)(\.env(\..*)?|\.env\.local)$/.test(normalized) && !normalized.endsWith('.env.example')
  })

  for (const relativePath of trackedEnvFiles) {
    fail(`tracked real env file present in git: ${relativePath}`)
  }
}

if (process.exitCode) {
  process.exit(process.exitCode)
}

console.log('release-preflight: ok')