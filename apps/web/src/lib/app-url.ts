const LOCAL_APP_FALLBACK = 'http://localhost:3000'
const PRODUCTION_APP_FALLBACK = 'https://dotly.one'

export function getAppUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_WEB_URL
  const fallbackUrl =
    process.env.NODE_ENV === 'production' ? PRODUCTION_APP_FALLBACK : LOCAL_APP_FALLBACK

  return (configuredUrl ?? fallbackUrl).replace(/\/$/, '')
}

export function getAuthCallbackUrl(): string {
  return `${getAppUrl()}/auth/callback`
}

export function sanitizeNextPath(raw: string | null | undefined, fallback = '/dashboard'): string {
  if (!raw) return fallback
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : fallback
}
