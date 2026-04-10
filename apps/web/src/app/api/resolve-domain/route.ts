import { NextRequest, NextResponse } from 'next/server'
import { getServerApiUrl } from '@/lib/server-api'

// HIGH-03: Validate the host param at the Next.js layer before forwarding to the
// API.  The NestJS side also validates (FQDN_REGEX on the route param) but
// defence-in-depth catches malformed input before any network hop.
// This regex matches the same set as NestJS IsFQDN: at least two labels separated
// by dots, each label [a-z0-9-], TLD ≥ 2 chars.  It explicitly rejects:
//   • bare labels like "localhost"
//   • IP addresses
//   • path-traversal sequences ("../", "%2f", etc.)
const FQDN_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i

export async function GET(request: NextRequest) {
  const apiUrl = getServerApiUrl()
  const host = request.nextUrl.searchParams.get('host')

  if (!host) {
    return NextResponse.json({ error: 'Missing host parameter' }, { status: 400 })
  }

  if (!FQDN_RE.test(host)) {
    return NextResponse.json({ error: 'Invalid host parameter' }, { status: 400 })
  }

  try {
    const res = await fetch(`${apiUrl}/custom-domains/resolve/${encodeURIComponent(host)}`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 })
    }

    const data = (await res.json()) as { handle: string }
    return NextResponse.json({ handle: data.handle })
  } catch {
    return NextResponse.json({ error: 'Resolution failed' }, { status: 502 })
  }
}
