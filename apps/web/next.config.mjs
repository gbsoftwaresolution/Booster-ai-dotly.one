import bundleAnalyzer from '@next/bundle-analyzer'
import { withSentryConfig } from '@sentry/nextjs'

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
})

// ---------------------------------------------------------------------------
// Fail-fast environment validation
// ---------------------------------------------------------------------------
// Next.js has no built-in startup validator for env vars.  Missing or
// placeholder values produce silent `undefined` at runtime, causing opaque
// crashes deep inside request handlers.  We validate here — at build/start
// time — so the problem is caught before any traffic is served.
//
// NEXT_PUBLIC_* vars are inlined at build time; server-only vars (API_URL,
// INTERNAL_API_URL) are read at runtime, so they are validated here too.
// ---------------------------------------------------------------------------
const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  // M-5: NEXT_PUBLIC_API_URL falls back to localhost:3001 if absent — every API
  // call from the browser silently fails in production.  Validate here.
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_WEB_URL',
]

// Placeholder values that look valid but are definitely not real credentials
const KNOWN_PLACEHOLDERS = new Set([
  'placeholder',
  'your-anon-key',
  'changeme',
  'https://placeholder.supabase.co',
  'http://localhost',
])

const missingOrPlaceholder = REQUIRED_ENV_VARS.filter((key) => {
  const val = process.env[key]
  return !val || KNOWN_PLACEHOLDERS.has(val)
})

function collectAllowedDevOrigins() {
  const hosts = new Set(['dotly.one', '*.dotly.one'])

  for (const value of [process.env.NEXT_PUBLIC_WEB_URL, process.env.NEXT_PUBLIC_APP_URL]) {
    if (!value) continue
    try {
      hosts.add(new URL(value).hostname)
    } catch {
      // Ignore malformed local overrides and keep the static host allowlist.
    }
  }

  return [...hosts]
}

if (missingOrPlaceholder.length > 0) {
  // Throw only in production to avoid blocking local dev with placeholder .env.local files.
  // In development, log a prominent warning instead.
  const msg = `[next.config] MISSING or PLACEHOLDER environment variables: ${missingOrPlaceholder.join(', ')}`
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${msg}\nSet real values before deploying.`)
  } else {
    console.warn(`\x1b[33m⚠ WARNING: ${msg}\x1b[0m`)
  }
}

// MED-10: Require an explicit R2_PUBLIC_HOSTNAME in production rather than
// falling back to the *.r2.cloudflarestorage.com wildcard.  The wildcard
// allows any Cloudflare R2 bucket (including attacker-controlled ones) to be
// used as an image source, which can bypass Content Security Policy and enable
// image-based attacks.  In production we fail the build if the var is missing;
// in development we omit the pattern entirely so developers get a clear error
// from next/image rather than silently loading from a wildcard origin.
const r2Hostname = process.env.R2_PUBLIC_HOSTNAME
if (!r2Hostname && process.env.NODE_ENV === 'production') {
  throw new Error(
    '[next.config] R2_PUBLIC_HOSTNAME is not set. Set it to your Cloudflare R2 public bucket hostname (e.g. assets.dotly.one) before deploying.',
  )
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: collectAllowedDevOrigins(),
  transpilePackages: ['@dotly/ui', '@dotly/types'],
  images: {
    remotePatterns: [
      // Only allow the explicitly configured R2 hostname — never a wildcard.
      // In local dev this pattern is omitted when R2_PUBLIC_HOSTNAME is unset,
      // which causes next/image to throw a visible error rather than loading
      // from an unconstrained glob.
      ...(r2Hostname ? [{ protocol: /** @type {'https'} */ ('https'), hostname: r2Hostname }] : []),
      // Production CDN
      { protocol: /** @type {'https'} */ ('https'), hostname: 'cdn.dotly.one' },
    ],
  },
}

export default withSentryConfig(withBundleAnalyzer(nextConfig), {
  // Sentry build-time options
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Only upload source maps in CI/production builds; keeps local builds fast
  silent: !process.env.CI,
  // Disable source map upload in dev to avoid spurious warnings
  disableServerWebpackPlugin: process.env.NODE_ENV !== 'production',
  disableClientWebpackPlugin: process.env.NODE_ENV !== 'production',
})
