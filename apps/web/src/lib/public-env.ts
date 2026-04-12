const LOCAL_API_FALLBACK = 'http://localhost:3001'

function isLocalhostUrl(value: string | undefined): boolean {
  if (!value) return false

  try {
    const { hostname } = new URL(value)
    return hostname === 'localhost' || hostname === '127.0.0.1'
  } catch {
    return false
  }
}

export function getPublicApiUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  if (apiUrl) {
    const parsed = new URL(apiUrl)
    const isLocalhostApiUrl = parsed.protocol === 'http:' && isLocalhostUrl(parsed.toString())
    const isLocalAppRuntime =
      isLocalhostUrl(process.env.NEXT_PUBLIC_APP_URL) ||
      isLocalhostUrl(process.env.NEXT_PUBLIC_WEB_URL)
    const isCiLocalApiUrl = isLocalhostApiUrl && (process.env.CI === 'true' || isLocalAppRuntime)

    // GitHub Actions builds the production bundle against a local test API.
    if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:' && !isCiLocalApiUrl) {
      throw new Error('NEXT_PUBLIC_API_URL must use https in production')
    }
    return parsed.toString().replace(/\/$/, '')
  }

  if (process.env.NODE_ENV !== 'production') {
    return LOCAL_API_FALLBACK
  }

  throw new Error('NEXT_PUBLIC_API_URL must be set in production')
}

export function isAppleWalletEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_APPLE_WALLET === 'true'
}

export function isGoogleWalletEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_GOOGLE_WALLET === 'true'
}
