export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_WEB_URL ??
    'https://dotly.one'
  ).replace(/\/$/, '')
}

export function getAuthCallbackUrl(): string {
  return `${getAppUrl()}/auth/callback`
}

export function sanitizeNextPath(raw: string | null | undefined, fallback = '/dashboard'): string {
  if (!raw) return fallback
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : fallback
}
