import { spawn } from 'node:child_process'

function run(command, args, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env: {
        ...process.env,
        ...extraEnv,
      },
    })

    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code ?? 'unknown'}`))
    })

    child.on('error', reject)
  })
}

async function main() {
  await run('pnpm', ['--filter', '@dotly/api', 'verify:metrics'])
  await run('pnpm', ['--filter', '@dotly/web', 'verify:sentry'])
  console.log('Observability smoke checks passed')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
