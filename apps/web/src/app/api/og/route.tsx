import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'
import { getServerApiUrl } from '@/lib/server-api'

// Use Node.js runtime — Edge runtime has restrictions on fetch options and
// module-scope env access that cause silent failures with ImageResponse.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Cache the rendered image for 5 minutes at the CDN / reverse-proxy level.
// WhatsApp and other crawlers respect Cache-Control and will re-fetch after
// this window, picking up profile updates.
export const revalidate = 300

const W = 1200
const H = 630

interface RawCard {
  fields: Record<string, string>
  theme?: { primaryColor?: string; secondaryColor?: string; fontFamily?: string; logoUrl?: string }
  teamBrand?: {
    brandName?: string | null
    brandLogoUrl?: string | null
    brandColor?: string | null
    secondaryColor?: string | null
    fontFamily?: string | null
    brandLock?: boolean
  } | null
}

function safeBrandColor(color: string | null | undefined): string {
  if (!color) return '#0ea5e9'
  return /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : '#0ea5e9'
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h
  const n = parseInt(full.slice(0, 6), 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

/** Safely fetch an avatar URL and return it as a base64 data URI so
 *  Satori never has to make a cross-origin request at render time. */
async function fetchAvatarAsDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') ?? 'image/jpeg'
    const buf = await res.arrayBuffer()
    const b64 = Buffer.from(buf).toString('base64')
    return `data:${ct};base64,${b64}`
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const apiUrl = getServerApiUrl()
  const { searchParams } = req.nextUrl
  const handle = searchParams.get('handle')

  if (!handle) {
    return new Response('Missing handle', { status: 400 })
  }

  // Fetch card data server-side
  let card: RawCard | null = null
  try {
    const res = await fetch(`${apiUrl}/public/cards/${handle}`, {
      next: { revalidate: 300 },
    })
    if (res.ok) card = (await res.json()) as RawCard
  } catch {
    // fall through — render a generic card
  }

  const fields = card?.fields ?? {}
  const name: string = fields.name ?? handle
  const jobTitle: string = fields.title ?? ''
  const company: string = fields.company ?? ''
  const rawAvatarUrl: string | null = fields.avatarUrl ?? null
  const teamBrandLocked = card?.teamBrand?.brandLock ?? false

  const accentRaw = card?.teamBrand?.brandColor ?? card?.theme?.primaryColor ?? '#0ea5e9'
  const accent = safeBrandColor(accentRaw)
  const secondary = safeBrandColor(
    (teamBrandLocked ? card?.teamBrand?.secondaryColor : null) ??
      card?.theme?.secondaryColor ??
      '#ffffff',
  )
  const [r, g, b] = hexToRgb(accent)
  const bgTint = `rgba(${r},${g},${b},0.08)`
  const accentLight = `rgba(${r},${g},${b},0.20)`
  const fontFamily = teamBrandLocked
    ? (card?.teamBrand?.fontFamily ?? 'system-ui, -apple-system, sans-serif')
    : 'system-ui, -apple-system, sans-serif'

  const subtitle = [jobTitle, company].filter(Boolean).join(' · ')

  // Pre-fetch avatar as data URI so Satori doesn't need to make a network call
  const avatarDataUri = rawAvatarUrl ? await fetchAvatarAsDataUri(rawAvatarUrl) : null

  const imageResponse = new ImageResponse(
    <div
      style={{
        width: W,
        height: H,
        display: 'flex',
        background: '#ffffff',
        fontFamily,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Tinted radial background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 80% 70% at 10% 50%, ${bgTint} 0%, transparent 70%)`,
        }}
      />

      {/* Left accent bar */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 10,
          background: accent,
        }}
      />

      {/* Decorative circle — top right */}
      <div
        style={{
          position: 'absolute',
          right: -100,
          top: -100,
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: accentLight,
        }}
      />
      {/* Decorative circle — bottom right */}
      <div
        style={{
          position: 'absolute',
          right: 90,
          bottom: -70,
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: bgTint,
        }}
      />

      {/* Main row */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          width: '100%',
          padding: '64px 96px 64px 76px',
          gap: 56,
        }}
      >
        {/* Avatar circle */}
        {avatarDataUri && (
          <div
            style={{
              flexShrink: 0,
              width: 204,
              height: 204,
              borderRadius: '50%',
              overflow: 'hidden',
              border: `6px solid ${accent}`,
              outline: `6px solid ${accentLight}`,
              display: 'flex',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarDataUri}
              width={204}
              height={204}
              alt={name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}

        {/* Text */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            flex: 1,
            minWidth: 0,
          }}
        >
          {/* Name */}
          <div
            style={{
              fontSize: avatarDataUri ? 70 : 78,
              fontWeight: 800,
              color: accent,
              lineHeight: 1.05,
              letterSpacing: '-2px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </div>

          {/* Subtitle */}
          {subtitle ? (
            <div
              style={{
                fontSize: 30,
                fontWeight: 500,
                color: secondary,
                letterSpacing: '-0.4px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {subtitle}
            </div>
          ) : null}

          {/* Handle pill */}
          <div style={{ display: 'flex', marginTop: 10 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: accent,
                color: '#ffffff',
                borderRadius: 100,
                padding: '10px 30px',
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: '-0.3px',
              }}
            >
              dotly.one/{handle}
            </div>
          </div>
        </div>
      </div>

      {/* Wordmark */}
      <div
        style={{
          position: 'absolute',
          bottom: 26,
          right: 44,
          fontSize: 20,
          fontWeight: 800,
          color: '#cbd5e1',
          letterSpacing: '-0.4px',
        }}
      >
        Dotly.one
      </div>
    </div>,
    { width: W, height: H },
  )

  // Explicitly set caching headers WhatsApp and other crawlers honour.
  // s-maxage = CDN / proxy cache; max-age = browser cache.
  imageResponse.headers.set(
    'Cache-Control',
    'public, s-maxage=300, max-age=300, stale-while-revalidate=600',
  )
  // Explicitly declare content type — some proxies strip it
  imageResponse.headers.set('Content-Type', 'image/png')

  return imageResponse
}
