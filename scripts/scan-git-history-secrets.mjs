import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const repoRoot = new URL('../', import.meta.url)
const repoRootPath = fileURLToPath(repoRoot)

const secretPatterns = [
  'sk_live_',
  'rk_live_',
  'AKIA[0-9A-Z]{16}',
  'AIza[0-9A-Za-z_-]{20,}',
  'xox[baprs]-[A-Za-z0-9-]{10,}',
  'SG\\.[A-Za-z0-9_-]{20,}',
  '-----BEGIN PRIVATE KEY-----',
  '-----BEGIN RSA PRIVATE KEY-----',
  'postgres://[^[:space:]]+:[^[:space:]@]+@',
  'postgresql://[^[:space:]]+:[^[:space:]@]+@',
  'redis://[^[:space:]]+:[^[:space:]@]+@',
  'eyJ[a-zA-Z0-9_-]{10,}\\.[a-zA-Z0-9._-]{10,}\\.[a-zA-Z0-9._-]{10,}',
]

const excludeArgs = [
  ':(exclude)pnpm-lock.yaml',
  ':(exclude)package-lock.json',
  ':(exclude)yarn.lock',
  ':(exclude)contracts/artifacts/**',
  ':(exclude)contracts/cache/**',
]

function runGit(args) {
  return execFileSync('git', args, {
    cwd: repoRootPath,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 64,
  })
}

function isLikelyFalsePositive(line) {
  return [
    'postgresql://postgres:postgres@localhost',
    'postgresql://user:password@localhost',
    'postgresql://USER:PASSWORD@HOST',
    'postgresql://placeholder:placeholder@localhost',
    'redis://localhost',
    'key-xxxxxxxx',
    'sk_test_',
    'your-',
    'placeholder',
    '0x59c6995e998f97a5a0044976f7d7c7650f9d7a8f86c4d4b4207f2555026a7566',
    'docs/PHASE_',
  ].some((fragment) => line.includes(fragment))
}

function main() {
  const commits = runGit(['rev-list', '--all'])
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const matches = []

  for (const commit of commits) {
    try {
      const output = runGit([
        'grep',
        '-I',
        '-n',
        '-E',
        secretPatterns.join('|'),
        commit,
        '--',
        '.',
        ...excludeArgs,
      ])
      const filtered = output
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => !isLikelyFalsePositive(line))
      if (filtered.length > 0) {
        matches.push(filtered.join('\n'))
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!message.includes('status 1')) {
        throw error
      }
    }
  }

  const reportPath = new URL('../secret-history-scan.txt', import.meta.url)
  writeFileSync(reportPath, `${matches.join('\n')}\n`, 'utf8')

  if (matches.length === 0) {
    console.log('secret-history-scan: no matches found')
    return
  }

  console.log(
    `secret-history-scan: wrote ${matches.length} matching commit block(s) to ${fileURLToPath(reportPath)}`,
  )
  process.exitCode = 1
}

main()
