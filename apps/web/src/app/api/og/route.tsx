import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'
import { getServerApiUrl } from '@/lib/server-api'

export const runtime = 'edge'

const API_URL = getServerApiUrl()

// OG image dimensions — 1200×630 is the standard social card size
const W = 1200
const H = 630

interface RawCard {
  fields: Record<string, string>
  theme?: {
    primaryColor?: string
    secondaryColor?: string
  }
  teamBrand?: {
    brandName?: string | null
    brandLogoUrl?: string | null
    brandColor?: string | null
  } | null
}

function safeBrandColor(color: string | null | undefined): string {
  if (!color) return '#0ea5e9'
  return /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : '#0ea5e9'
}

// Lighten a hex colour for use as a subtle background tint
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

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const handle = searchParams.get('handle')

  if (!handle) {
    return new Response('Missing handle', { status: 400 })
  }

  // Fetch card data
  let card: RawCard | null = null
  try {
    const res = await fetch(`${API_URL}/public/cards/${handle}`, {
      next: { revalidate: 300 }, // cache 5 min at edge
    })
    if (res.ok) card = (await res.json()) as RawCard
  } catch {
    // fall through to default
  }

  const fields = card?.fields ?? {}
  const name: string = fields.name ?? handle
  const jobTitle: string = fields.title ?? ''
  const company: string = fields.company ?? ''
  const avatarUrl: string | null = fields.avatarUrl ?? null
  const accentRaw = card?.teamBrand?.brandColor ?? card?.theme?.primaryColor ?? '#0ea5e9'
  const accent = safeBrandColor(accentRaw)
  const [r, g, b] = hexToRgb(accent)
  const bgTint = `rgba(${r},${g},${b},0.07)`
  const accentLight = `rgba(${r},${g},${b},0.18)`

  const subtitle = [jobTitle, company].filter(Boolean).join(' · ')

  return new ImageResponse(
    <div
      style={{
        width: W,
        height: H,
        display: 'flex',
        background: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle tinted background */}
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
          width: 8,
          background: accent,
        }}
      />

      {/* Decorative circle top-right */}
      <div
        style={{
          position: 'absolute',
          right: -120,
          top: -120,
          width: 420,
          height: 420,
          borderRadius: '50%',
          background: accentLight,
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 80,
          bottom: -80,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: bgTint,
        }}
      />

      {/* Main content — left-padded after the accent bar */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          width: '100%',
          padding: '64px 96px 64px 72px',
          gap: 64,
        }}
      >
        {/* Avatar */}
        {avatarUrl && (
          <div
            style={{
              flexShrink: 0,
              width: 200,
              height: 200,
              borderRadius: '50%',
              overflow: 'hidden',
              border: `6px solid ${accent}`,
              boxShadow: `0 0 0 6px ${accentLight}`,
              display: 'flex',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl}
              width={200}
              height={200}
              alt={name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        )}

        {/* Text block */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            flex: 1,
            minWidth: 0,
          }}
        >
          {/* Name */}
          <div
            style={{
              fontSize: avatarUrl ? 72 : 80,
              fontWeight: 800,
              color: '#0f172a',
              lineHeight: 1.1,
              letterSpacing: '-2px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </div>

          {/* Job title · Company */}
          {subtitle && (
            <div
              style={{
                fontSize: 32,
                fontWeight: 500,
                color: '#475569',
                letterSpacing: '-0.5px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {subtitle}
            </div>
          )}

          {/* Accent pill — handle */}
          <div
            style={{
              display: 'flex',
              marginTop: 8,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: accent,
                color: '#ffffff',
                borderRadius: 100,
                padding: '10px 28px',
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

      {/* Bottom-right Dotly wordmark */}
      <div
        style={{
          position: 'absolute',
          bottom: 28,
          right: 48,
          fontSize: 22,
          fontWeight: 800,
          color: '#cbd5e1',
          letterSpacing: '-0.5px',
        }}
      >
        Dotly.one
      </div>
    </div>,
    {
      width: W,
      height: H,
    },
  )
}
