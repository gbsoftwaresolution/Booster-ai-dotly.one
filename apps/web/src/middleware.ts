import { NextResponse, type NextRequest } from 'next/server'

// Hostnames that belong to the platform itself — not custom domains
const PLATFORM_HOSTNAMES = ['localhost', 'dotly.one', 'www.dotly.one']
const LOCAL_APP_FALLBACK = 'http://localhost:3000'
const PRODUCTION_APP_FALLBACK = 'https://dotly.one'

function shouldDisableEdgeCache(request: NextRequest): boolean {
  return !request.nextUrl.pathname.startsWith('/api/')
}

function applyNoStoreHeaders<T extends Response>(request: NextRequest, response: T): T {
  if (!shouldDisableEdgeCache(request)) {
    return response
  }

  response.headers.set('Cache-Control', 'private, no-store, no-cache, max-age=0, must-revalidate')
  response.headers.set('CDN-Cache-Control', 'no-store')
  response.headers.set('Surrogate-Control', 'no-store')
  return response
}

function isPlatformHost(hostname: string): boolean {
  if (PLATFORM_HOSTNAMES.includes(hostname)) return true
  // Allow Railway-generated preview/custom subdomains for the platform app.
  if (hostname.endsWith('.up.railway.app')) return true
  // Allow localhost with any port (e.g. localhost:3000)
  if (hostname.startsWith('localhost:')) return true
  return false
}

// ─── Legacy flat-URL → new /apps/* redirect map ───────────────────────────
// Checked in order; first match wins.
// String entries: exact match OR prefix (<pattern>/).
// RegExp entries: matched against full pathname; replacer receives match array.
type StringRedirect = [string, string]
type RegExpRedirect = [RegExp, (m: RegExpMatchArray) => string]
type RedirectEntry = StringRedirect | RegExpRedirect

const LEGACY_REDIRECTS: RedirectEntry[] = [
  // Cards — /cards/new redirects to /apps/cards/create; the bare /cards catch-all
  // also matches all sub-paths (/cards/create, /cards/:id/edit, /cards/:id/analytics)
  // because of the prefix-match logic below. All those sub-paths are now implemented
  // under /apps/cards/* so the redirect is safe — no loops.
  ['/cards/new', '/apps/cards/create'],
  ['/cards', '/apps/cards'],
  // CRM — specific sub-paths before the bare /crm catch-all
  ['/crm/custom-fields', '/apps/crm/custom-fields'],
  ['/crm/analytics', '/apps/crm/analytics'],
  ['/crm', '/apps/crm/pipeline'],
  ['/contacts', '/apps/crm/contacts'],
  ['/leads', '/apps/crm/leads'],
  ['/deals', '/apps/crm/deals'],
  ['/tasks', '/apps/crm/tasks'],
  ['/pipelines', '/apps/crm/pipelines'],
  // Scheduling
  ['/scheduling', '/apps/scheduling'],
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Keep liveness probes independent from auth and custom-domain logic.
  if (pathname === '/api/health' || pathname === '/api/health/live') {
    return NextResponse.next()
  }

  let response = applyNoStoreHeaders(
    request,
    NextResponse.next({ request: { headers: request.headers } }),
  )

  // ─── Referral cookie: ?ref=p_XXXXX ──────────────────────────────────────
  const refParam = request.nextUrl.searchParams.get('ref')
  if (refParam && /^[a-zA-Z0-9_-]{1,64}$/.test(refParam) && !request.cookies.get('dotly_ref')) {
    response.cookies.set('dotly_ref', refParam, {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
      sameSite: 'lax',
      httpOnly: false,
    })
  }

  const hasSession = Boolean(
    request.cookies.get('dotly_access_token')?.value ||
    request.cookies.get('dotly_refresh_token')?.value,
  )

  const isDashboardRoute =
    request.nextUrl.pathname.startsWith('/onboarding') ||
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/qr') ||
    request.nextUrl.pathname.startsWith('/apps') ||
    request.nextUrl.pathname.startsWith('/contacts') ||
    request.nextUrl.pathname.startsWith('/crm') ||
    request.nextUrl.pathname.startsWith('/analytics') ||
    request.nextUrl.pathname.startsWith('/cards') ||
    request.nextUrl.pathname.startsWith('/settings') ||
    request.nextUrl.pathname.startsWith('/email-signature') ||
    request.nextUrl.pathname.startsWith('/email-templates') ||
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

  if (!hasSession && isDashboardRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth'
    url.search = ''
    url.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`)
    return applyNoStoreHeaders(request, NextResponse.redirect(url))
  }

  if (hasSession && request.nextUrl.pathname === '/auth') {
    const url = request.nextUrl.clone()
    url.pathname = '/onboarding'
    url.search = ''
    return applyNoStoreHeaders(request, NextResponse.redirect(url))
  }

  // ─── Legacy flat-URL → /apps/* permanent redirects (308) ─────────────────
  // Only runs for authenticated users (unauthenticated were handled above).
  for (const entry of LEGACY_REDIRECTS) {
    const [pattern, target] = entry
    if (typeof pattern === 'string') {
      if (pathname === pattern || pathname.startsWith(pattern + '/')) {
        const url = request.nextUrl.clone()
        url.pathname = target as string
        return applyNoStoreHeaders(request, NextResponse.redirect(url, 308))
      }
    } else {
      const m = pathname.match(pattern as RegExp)
      if (m) {
        const url = request.nextUrl.clone()
        url.pathname = (target as (m: RegExpMatchArray) => string)(m)
        return applyNoStoreHeaders(request, NextResponse.redirect(url, 308))
      }
    }
  }

  // --- Custom domain routing ---
  const hostname = request.headers.get('host') ?? request.nextUrl.hostname

  if (!isPlatformHost(hostname)) {
    // CRIT-03: Use NEXT_PUBLIC_APP_URL as base — never attacker-controlled.
    // LOW-06: Validate hostname as FQDN before use.
    const fqdnRegex =
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/
    if (!fqdnRegex.test(hostname)) {
      return response
    }

    const appBase = (
      process.env.NEXT_PUBLIC_APP_URL ??
      (process.env.NODE_ENV === 'production' ? PRODUCTION_APP_FALLBACK : LOCAL_APP_FALLBACK)
    ).replace(/\/$/, '')
    const resolveUrl = `${appBase}/api/resolve-domain?host=${encodeURIComponent(hostname)}`

    try {
      const resolveRes = await fetch(resolveUrl, { cache: 'no-store' })
      if (resolveRes.ok) {
        const data = (await resolveRes.json()) as { handle?: string }
        if (data.handle) {
          if (!/^[a-z0-9-]+$/.test(data.handle)) {
            return response
          }
          const rewriteUrl = request.nextUrl.clone()
          rewriteUrl.pathname = `/card/${data.handle}`
          return applyNoStoreHeaders(request, NextResponse.rewrite(rewriteUrl))
        }
      }
    } catch {
      // Resolve failed — fall through to normal routing
    }
  }

  return applyNoStoreHeaders(request, response)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|card/|api/health(?:/live)?$).*)'],
}
