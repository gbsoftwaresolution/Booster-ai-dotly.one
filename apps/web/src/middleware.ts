import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Hostnames that belong to the platform itself — not custom domains
const PLATFORM_HOSTNAMES = ['localhost', 'dotly.one', 'www.dotly.one']

function isPlatformHost(hostname: string): boolean {
  if (PLATFORM_HOSTNAMES.includes(hostname)) return true
  // Allow all *.vercel.app subdomains
  if (hostname.endsWith('.vercel.app')) return true
  // Allow localhost with any port (e.g. localhost:3000)
  if (hostname.startsWith('localhost:')) return true
  return false
}

export async function middleware(request: NextRequest) {
  // H-2: Fail visibly if critical Supabase env vars are absent.
  // Using non-null assertions (!) silently passes undefined to the Supabase
  // client, which then fails to verify JWTs and lets every request through as
  // unauthenticated.  Instead, return a 500 with a clear message so operators
  // notice the misconfiguration immediately on first request.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(
      'Server misconfiguration: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.',
      { status: 500 },
    )
  }

  let response = NextResponse.next({ request: { headers: request.headers } })

  // ─── Referral cookie: ?ref=p_XXXXX ──────────────────────────────────────
  // Capture the BoosterAI partner referral code from the URL and persist it in
  // a 30-day cookie so it survives navigation to /auth and back to /pricing.
  // We only set it if it looks like a valid partner code (alphanumeric + _ -)
  // and only if no cookie is already set (first-touch attribution).
  const refParam = request.nextUrl.searchParams.get('ref')
  if (refParam && /^[a-zA-Z0-9_-]{1,64}$/.test(refParam) && !request.cookies.get('dotly_ref')) {
    response.cookies.set('dotly_ref', refParam, {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
      sameSite: 'lax',
      httpOnly: false, // must be readable by client-side JS at checkout
    })
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options })
        response = NextResponse.next({ request: { headers: request.headers } })
        response.cookies.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options })
        response = NextResponse.next({ request: { headers: request.headers } })
        response.cookies.set({ name, value: '', ...options })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isDashboardRoute =
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/contacts') ||
    request.nextUrl.pathname.startsWith('/crm') ||
    request.nextUrl.pathname.startsWith('/analytics') ||
    request.nextUrl.pathname.startsWith('/cards') ||
    request.nextUrl.pathname.startsWith('/settings') ||
    request.nextUrl.pathname.startsWith('/email-signature') ||
    request.nextUrl.pathname.startsWith('/scheduling') ||
    request.nextUrl.pathname.startsWith('/leads') ||
    request.nextUrl.pathname.startsWith('/pipelines') ||
    request.nextUrl.pathname.startsWith('/deals') ||
    request.nextUrl.pathname.startsWith('/tasks') ||
    // M-01: /team routes need auth EXCEPT the public invite-acceptance and
    // sign-in pages which must be reachable by unauthenticated users.
    (request.nextUrl.pathname.startsWith('/team') &&
      !request.nextUrl.pathname.startsWith('/team/accept') &&
      !/^\/team\/[^/]+\/sign-in/.test(request.nextUrl.pathname))

  if (!user && isDashboardRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    return NextResponse.redirect(url)
  }

  // --- Custom domain routing ---
  const hostname = request.headers.get('host') ?? request.nextUrl.hostname

  if (!isPlatformHost(hostname)) {
    // This is a custom domain — resolve it via the internal API route.
    //
    // CRIT-03: Do NOT use `request.url` as the base for the resolve URL.
    // `request.url` includes the attacker-supplied Host header, so a crafted
    // request with Host: 169.254.169.254 would construct a URL that hits the
    // AWS metadata endpoint (SSRF).
    //
    // LOW-06: Validate the hostname looks like an FQDN before building the URL
    // so path traversal characters (/, ?, #, ..) in the Host header cannot
    // escape the intended query param.
    //
    // We use NEXT_PUBLIC_APP_URL (a build-time constant) as the base — it is
    // never attacker-controlled.
    const fqdnRegex =
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/
    if (!fqdnRegex.test(hostname)) {
      // Hostname contains unexpected characters — skip custom-domain routing
      return response
    }

    const appBase = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://dotly.one').replace(/\/$/, '')
    const resolveUrl = `${appBase}/api/resolve-domain?host=${encodeURIComponent(hostname)}`

    try {
      const resolveRes = await fetch(resolveUrl, { cache: 'no-store' })
      if (resolveRes.ok) {
        const data = (await resolveRes.json()) as { handle?: string }
        if (data.handle) {
          // LOW-06: Validate the returned handle before using it in a rewrite.
          // An API returning a handle with path traversal chars (../../..) or
          // query strings could escape /card/[handle] and rewrite to arbitrary
          // internal paths.  Allow only lowercase alphanumeric + hyphen.
          if (!/^[a-z0-9-]+$/.test(data.handle)) {
            // Invalid handle — fall through to normal routing (returns 404)
            return response
          }
          // Rewrite transparently to the card page
          const rewriteUrl = request.nextUrl.clone()
          rewriteUrl.pathname = `/card/${data.handle}`
          return NextResponse.rewrite(rewriteUrl)
        }
      }
    } catch {
      // Resolve failed — fall through to normal routing
    }
  }

  return response
}

export const config = {
  // Exclude Next.js internals and the public card viewer (/card/[handle]).
  // Card pages are intentionally public — they have no auth gate and are
  // served to anyone who visits a shared link or a custom domain rewrite.
  // The custom-domain rewrite logic in this middleware rewrites requests
  // from custom domains to /card/[handle] BEFORE the matcher runs, so
  // keeping /card/* out of the matcher also prevents an infinite fetch loop.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|card/).*)'],
}
