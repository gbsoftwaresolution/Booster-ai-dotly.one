import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const appRoot = path.resolve(__dirname, '..')

const standaloneRoot = path.join(appRoot, '.next', 'standalone', 'apps', 'web')
const standaloneNextRoot = path.join(standaloneRoot, '.next')
const sourceServerRoot = path.join(appRoot, '.next', 'server')
const targetServerRoot = path.join(standaloneNextRoot, 'server')
const sourceStaticRoot = path.join(appRoot, '.next', 'static')
const targetStaticRoot = path.join(standaloneNextRoot, 'static')
const sourcePublicRoot = path.join(appRoot, 'public')
const targetPublicRoot = path.join(standaloneRoot, 'public')
const nextRootFiles = [
  'BUILD_ID',
  'app-build-manifest.json',
  'app-path-routes-manifest.json',
  'build-manifest.json',
  'images-manifest.json',
  'next-font-manifest.json',
  'next-minimal-server.js.nft.json',
  'next-server.js.nft.json',
  'package.json',
  'prerender-manifest.json',
  'react-loadable-manifest.json',
  'required-server-files.json',
  'routes-manifest.json',
]

if (!existsSync(standaloneRoot)) {
  throw new Error(`Standalone output not found at ${standaloneRoot}`)
}

mkdirSync(standaloneNextRoot, { recursive: true })

if (existsSync(sourceServerRoot)) {
  rmSync(targetServerRoot, { recursive: true, force: true })
  cpSync(sourceServerRoot, targetServerRoot, { recursive: true })
}

if (existsSync(sourceStaticRoot)) {
  rmSync(targetStaticRoot, { recursive: true, force: true })
  cpSync(sourceStaticRoot, targetStaticRoot, { recursive: true })
}

if (existsSync(sourcePublicRoot)) {
  rmSync(targetPublicRoot, { recursive: true, force: true })
  cpSync(sourcePublicRoot, targetPublicRoot, { recursive: true })
}

for (const file of nextRootFiles) {
  const sourceFile = path.join(appRoot, '.next', file)
  const targetFile = path.join(standaloneNextRoot, file)

  if (!existsSync(sourceFile)) continue
  cpSync(sourceFile, targetFile)
}
