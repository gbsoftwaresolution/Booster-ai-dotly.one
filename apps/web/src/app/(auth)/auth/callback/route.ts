import { sanitizeNextPath } from '@/lib/app-url'
import { NextRequest, NextResponse } from 'next/server'
import { setServerSession } from '@/lib/auth/session'

function renderSessionBootstrapHtml(params: {
  accessToken: string
  refreshToken: string
  redirectTo: string
}): string {
  const accessToken = JSON.stringify(params.accessToken)
  const refreshToken = JSON.stringify(params.refreshToken)
  const redirectTo = JSON.stringify(params.redirectTo)

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="refresh" content="3;url=${params.redirectTo.replace(/&/g, '&amp;')}" />
    <title>Completing sign-in...</title>
  </head>
  <body>
    <p>Completing sign-in...</p>
    <script>
      try {
        window.localStorage.setItem('dotly_access_token', ${accessToken});
        window.localStorage.setItem('dotly_refresh_token', ${refreshToken});
      } catch {}
      window.location.replace(${redirectTo});
    </script>
  </body>
</html>`
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const payload = searchParams.get('payload')
  const next = sanitizeNextPath(searchParams.get('next'), '/onboarding')

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
      const redirectTo = `${origin}${sanitizeNextPath(parsed.next, next)}`
      return new NextResponse(
        renderSessionBootstrapHtml({
          accessToken: parsed.accessToken,
          refreshToken: parsed.refreshToken,
          redirectTo,
        }),
        {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        },
      )
    } catch {
      return redirectWithError('invalid_payload')
    }
  }
  return redirectWithError('auth_callback_failed')
}
