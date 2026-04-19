import { sanitizeNextPath } from '@/lib/app-url'
import { NextRequest, NextResponse } from 'next/server'
import { setServerSession } from '@/lib/auth/session'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const payload = searchParams.get('payload')
  const next = sanitizeNextPath(searchParams.get('next'), '/auth/continue')

  const configuredOrigin = (
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_WEB_URL
  )?.replace(/\/$/, '')
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = request.headers.get('host')
  const externalHost = (forwardedHost ?? host)?.split(',')[0]?.trim()
  const externalProto =
    forwardedProto?.split(',')[0]?.trim() || request.nextUrl.protocol.replace(/:$/, '')
  const requestOrigin = externalHost
    ? `${externalProto}://${externalHost}`.replace(/\/$/, '')
    : request.nextUrl.origin.replace(/\/$/, '')
  const configuredHostname = configuredOrigin ? new URL(configuredOrigin).hostname : null
  const requestHostname = externalHost?.split(':')[0] ?? request.nextUrl.hostname
  const shouldPreferRequestOrigin =
    !configuredOrigin ||
    configuredHostname === 'localhost' ||
    configuredHostname === '127.0.0.1' ||
    requestHostname.endsWith('.up.railway.app') ||
    requestHostname === 'localhost' ||
    requestHostname === '127.0.0.1'
  const origin = shouldPreferRequestOrigin ? requestOrigin : configuredOrigin
  const failureRedirectUrl = new URL('/auth', origin)
  if (next !== '/dashboard') {
    failureRedirectUrl.searchParams.set('next', next)
  }

  function redirectWithError(errorCode: string) {
    const url = new URL(failureRedirectUrl)
    url.searchParams.set('error', errorCode)
    return NextResponse.redirect(url)
  }

  if (payload) {
    try {
      const parsed = JSON.parse(payload) as {
        accessToken?: string
        refreshToken?: string
        next?: string
      }
      if (!parsed.accessToken || !parsed.refreshToken) {
        return redirectWithError('invalid_payload')
      }
      await setServerSession({ accessToken: parsed.accessToken, refreshToken: parsed.refreshToken })
      const redirectPath = sanitizeNextPath(parsed.next, next)
      const redirectTo = shouldUseDecisionPage(redirectPath)
        ? `${origin}/auth/continue?next=${encodeURIComponent(redirectPath)}`
        : `${origin}${redirectPath}`
      return new NextResponse(null, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          Location: redirectTo,
        },
        status: 302,
      })
    } catch {
      return redirectWithError('invalid_payload')
    }
  }

  const redirectPath = shouldUseDecisionPage(next)
    ? `${origin}/auth/continue?next=${encodeURIComponent(next)}`
    : `${origin}${next}`
  return NextResponse.redirect(redirectPath)
}

function shouldUseDecisionPage(next: string): boolean {
  return next === '/' || next === '/dashboard' || next === '/onboarding'
}
