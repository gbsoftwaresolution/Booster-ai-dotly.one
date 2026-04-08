import { createClient } from '@/lib/supabase/server'
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
  const rawNext = searchParams.get('next') ?? '/dashboard'

  // Guard against open redirect: only allow same-origin relative paths.
  // Reject protocol-relative URLs (//evil.com) and absolute URLs.
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/dashboard'

  // F-01: Pin the origin to NEXT_PUBLIC_APP_URL rather than deriving it from
  // `request.url`. The Host header can be spoofed by a reverse proxy or a
  // malicious request, turning `new URL(request.url).origin` into an open
  // redirect gadget. NEXT_PUBLIC_APP_URL is set at build time and is not
  // attacker-controlled.
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    // Fail closed: if the env var is missing we cannot safely redirect.
    return new Response('Server misconfiguration: NEXT_PUBLIC_APP_URL is not set', { status: 500 })
  }
  // Strip any trailing slash so we can safely append paths.
  const origin = appUrl.replace(/\/$/, '')

  if (code) {
    // LOW-07: Validate code format before forwarding to Supabase.
    // Reject codes that do not look like a UUID v4 — they are not valid
    // Supabase PKCE codes and should never be sent to the auth endpoint.
    if (!SUPABASE_CODE_RE.test(code)) {
      return NextResponse.redirect(`${origin}/auth?error=invalid_code`)
    }

    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }
  return NextResponse.redirect(`${origin}/auth?error=auth_callback_failed`)
}
