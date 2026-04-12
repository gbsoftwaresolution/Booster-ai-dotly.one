const LOCAL_API_FALLBACK = 'http://localhost:3001'

export function getPublicApiUrl(): string {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL
  if (apiUrl) {
    const parsed = new URL(apiUrl)
    const isCiLocalApiUrl =
      process.env.CI === 'true' &&
      parsed.protocol === 'http:' &&
      (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')

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
