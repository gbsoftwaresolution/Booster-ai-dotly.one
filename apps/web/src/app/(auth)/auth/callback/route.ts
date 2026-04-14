import { createClient } from '@/lib/supabase/server'
import { sanitizeNextPath } from '@/lib/app-url'
import { NextRequest, NextResponse } from 'next/server'

// LOW-07: Allowlist regex for the Supabase PKCE authorization code.
// Supabase issues these as UUID v4 strings (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx).
// Rejecting any value that does not match:
//  1. prevents sending attacker-controlled arbitrary strings to the Supabase API
//     (which could be used as a probe or to trigger unexpected error paths), and
//  2. caps the value length, blocking oversized input that could cause DoS in
//     the Supabase SDK's internal parser.
const SUPABASE_CODE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = sanitizeNextPath(searchParams.get('next'), '/onboarding')

  const configuredOrigin = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_WEB_URL)?.replace(
    /\/$/,
    '',
  )
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = request.headers.get('host')
  const externalHost = (forwardedHost ?? host)?.split(',')[0]?.trim()
  const externalProto = forwardedProto?.split(',')[0]?.trim() || request.nextUrl.protocol.replace(/:$/, '')
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

  if (code) {
    // LOW-07: Validate code format before forwarding to Supabase.
    // Reject codes that do not look like a UUID v4 — they are not valid
    // Supabase PKCE codes and should never be sent to the auth endpoint.
    if (!SUPABASE_CODE_RE.test(code)) {
      return redirectWithError('invalid_code')
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }
  return redirectWithError('auth_callback_failed')
}
