import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, '..')

const standaloneRoot = path.join(appRoot, '.next', 'standalone', 'apps', 'web')
const standaloneNextRoot = path.join(standaloneRoot, '.next')
const sourceStaticRoot = path.join(appRoot, '.next', 'static')
const targetStaticRoot = path.join(standaloneNextRoot, 'static')
const sourcePublicRoot = path.join(appRoot, 'public')
const targetPublicRoot = path.join(standaloneRoot, 'public')

if (!existsSync(standaloneRoot)) {
  throw new Error(`Standalone output not found at ${standaloneRoot}`)
}

mkdirSync(standaloneNextRoot, { recursive: true })

if (existsSync(sourceStaticRoot)) {
  rmSync(targetStaticRoot, { recursive: true, force: true })
  cpSync(sourceStaticRoot, targetStaticRoot, { recursive: true })
}

if (existsSync(sourcePublicRoot)) {
  rmSync(targetPublicRoot, { recursive: true, force: true })
  cpSync(sourcePublicRoot, targetPublicRoot, { recursive: true })
}