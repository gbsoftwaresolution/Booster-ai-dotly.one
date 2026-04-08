import React from 'react'
import type { SocialButtonStyle, SocialLinkData } from '@dotly/types'

// ── Inline brand SVG icons ────────────────────────────────────────────────────
// All icons are self-contained SVG so packages/ui stays dependency-free.

function IconLinkedIn() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function IconTwitterX() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function IconInstagram() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  )
}

function IconGitHub() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
}

function IconYouTube() {
  return (
    <svg width="18" height="14" viewBox="0 0 24 17" fill="#ffffff" aria-hidden="true">
      <path d="M23.495 2.205a3.025 3.025 0 0 0-2.128-2.138C19.505 0 12 0 12 0S4.495 0 2.632.067A3.025 3.025 0 0 0 .505 2.205C0 4.07 0 8.165 0 8.165S0 12.26.505 14.124a3.025 3.025 0 0 0 2.127 2.138C4.495 16.33 12 16.33 12 16.33s7.505 0 9.367-.068a3.025 3.025 0 0 0 2.128-2.138C24 12.26 24 8.165 24 8.165s-.006-4.096-.505-5.96zM9.609 11.657V4.673l6.264 3.492-6.264 3.492z" />
    </svg>
  )
}

function IconTikTok() {
  return (
    <svg width="14" height="16" viewBox="0 0 24 28" fill="#ffffff" aria-hidden="true">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.17 8.17 0 0 0 4.78 1.52V6.74a4.85 4.85 0 0 1-1.01-.05z" />
    </svg>
  )
}

function IconWhatsApp() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  )
}

function IconFacebook() {
  return (
    <svg width="10" height="18" viewBox="0 0 10 20" fill="#ffffff" aria-hidden="true">
      <path d="M10 0H7C5.343 0 4 1.343 4 3v3H0v4h4v10h4V10h3l1-4H8V3a1 1 0 0 1 1-1h1V0z" />
    </svg>
  )
}

function IconCalendly() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="#ffffff" strokeWidth="2" />
      <path
        d="M16 8.5A5.5 5.5 0 1 0 16 15.5"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IconCalCom() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#ffffff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function IconGlobe() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#ffffff"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

// ── Platform registry ─────────────────────────────────────────────────────────

const PLATFORM_META: Record<
  string,
  { label: string; bg: string; followLabel: string; Icon: () => React.ReactElement }
> = {
  LINKEDIN: {
    label: 'LinkedIn',
    bg: '#0A66C2',
    followLabel: 'Connect on LinkedIn',
    Icon: IconLinkedIn,
  },
  TWITTER: { label: 'X', bg: '#000000', followLabel: 'Follow me on X', Icon: IconTwitterX },
  INSTAGRAM: {
    label: 'Instagram',
    bg: '#E1306C',
    followLabel: 'Follow on Instagram',
    Icon: IconInstagram,
  },
  GITHUB: { label: 'GitHub', bg: '#171515', followLabel: 'Follow on GitHub', Icon: IconGitHub },
  YOUTUBE: {
    label: 'YouTube',
    bg: '#FF0000',
    followLabel: 'Subscribe on YouTube',
    Icon: IconYouTube,
  },
  TIKTOK: { label: 'TikTok', bg: '#010101', followLabel: 'Follow on TikTok', Icon: IconTikTok },
  WHATSAPP: {
    label: 'WhatsApp',
    bg: '#25D366',
    followLabel: 'Message on WhatsApp',
    Icon: IconWhatsApp,
  },
  FACEBOOK: {
    label: 'Facebook',
    bg: '#1877F2',
    followLabel: 'Follow me on Facebook',
    Icon: IconFacebook,
  },
  CALENDLY: { label: 'Calendly', bg: '#0069FF', followLabel: 'Book a meeting', Icon: IconCalendly },
  CALCOM: { label: 'Cal.com', bg: '#111827', followLabel: 'Book a meeting', Icon: IconCalCom },
  CUSTOM: { label: 'Website', bg: '#64748b', followLabel: 'Visit my website', Icon: IconGlobe },
}

function getPlatformMeta(platform: string) {
  return PLATFORM_META[platform] ?? PLATFORM_META['CUSTOM']!
}

/** Ensure a URL has a safe protocol (http/https only). Returns '#' for unsafe values. */
function safeLinkUrl(url: string): string {
  if (!url) return '#'
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return url
    return '#'
  } catch {
    // Not a full URL — treat as relative path (won't match common attacks)
    return url.startsWith('/') ? url : `https://${url}`
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface SocialLinkListProps {
  socialLinks: SocialLinkData[]
  onSocialLinkClick?: (platform: string, url: string) => void
  /** Controls the visual style of the social link list.
   *  `socialButtonStyle` from `CardThemeData` is forwarded here.
   *  Falls back to the legacy `style` prop for backward compat. */
  socialButtonStyle?: SocialButtonStyle
  /** @deprecated Use `socialButtonStyle` instead. Kept for backward compat. */
  style?: 'pills' | 'list' | 'icons'
  accentColor?: string
}

export function SocialLinkList({
  socialLinks,
  onSocialLinkClick,
  socialButtonStyle,
  style,
  accentColor = '#0ea5e9',
}: SocialLinkListProps) {
  if (!socialLinks || socialLinks.length === 0) return null

  // `socialButtonStyle` takes precedence; fall back to legacy `style` prop
  const resolvedStyle: SocialButtonStyle =
    socialButtonStyle ?? (style as SocialButtonStyle) ?? 'pills'

  const sorted = [...socialLinks].sort((a, b) => a.displayOrder - b.displayOrder)

  // ── Follow buttons — full-width, vertically stacked ────────────────────────
  if (resolvedStyle === 'follow') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sorted.map((link) => {
          const m = getPlatformMeta(link.platform)
          const href = safeLinkUrl(link.url)
          return (
            <a
              key={link.id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={m.followLabel}
              onClick={() => onSocialLinkClick?.(link.platform, link.url)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                width: '100%',
                padding: '13px 18px',
                borderRadius: 16,
                background: m.bg,
                color: '#ffffff',
                textDecoration: 'none',
                boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
                transition: 'transform 0.12s, box-shadow 0.12s, filter 0.12s',
                boxSizing: 'border-box',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLAnchorElement
                el.style.transform = 'translateY(-1px)'
                el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.24)'
                el.style.filter = 'brightness(1.06)'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLAnchorElement
                el.style.transform = 'translateY(0)'
                el.style.boxShadow = '0 2px 10px rgba(0,0,0,0.18)'
                el.style.filter = 'none'
              }}
            >
              {/* Icon badge */}
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.18)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <m.Icon />
              </span>

              {/* Label */}
              <span
                style={{
                  flex: 1,
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: '-0.01em',
                  lineHeight: 1.2,
                }}
              >
                {m.followLabel}
              </span>

              {/* Chevron */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,0.7)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0 }}
                aria-hidden="true"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </a>
          )
        })}
      </div>
    )
  }

  // ── Icon-only circles ──────────────────────────────────────────────────────
  if (resolvedStyle === 'icons') {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
        {sorted.map((link) => {
          const m = getPlatformMeta(link.platform)
          const href = safeLinkUrl(link.url)
          return (
            <a
              key={link.id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={m.label}
              title={m.label}
              onClick={() => onSocialLinkClick?.(link.platform, link.url)}
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: m.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.20)',
                transition: 'transform 0.15s, box-shadow 0.15s',
                flexShrink: 0,
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.12)'
                ;(e.currentTarget as HTMLAnchorElement).style.boxShadow =
                  '0 4px 14px rgba(0,0,0,0.28)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)'
                ;(e.currentTarget as HTMLAnchorElement).style.boxShadow =
                  '0 2px 8px rgba(0,0,0,0.20)'
              }}
            >
              <m.Icon />
            </a>
          )
        })}
      </div>
    )
  }

  // ── Vertical list (Corporate template) ────────────────────────────────────
  if (resolvedStyle === 'list') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.map((link) => {
          const m = getPlatformMeta(link.platform)
          const href = safeLinkUrl(link.url)
          return (
            <a
              key={link.id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={m.label}
              onClick={() => onSocialLinkClick?.(link.platform, link.url)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '4px 0',
                textDecoration: 'none',
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: m.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                }}
              >
                <m.Icon />
              </span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: accentColor,
                  textDecoration: 'underline',
                  textUnderlineOffset: 2,
                }}
              >
                {m.label}
              </span>
            </a>
          )
        })}
      </div>
    )
  }

  // ── Pills (default) ────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
      {sorted.map((link) => {
        const m = getPlatformMeta(link.platform)
        const href = safeLinkUrl(link.url)
        return (
          <a
            key={link.id}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={m.label}
            onClick={() => onSocialLinkClick?.(link.platform, link.url)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '7px 14px 7px 9px',
              borderRadius: 100,
              background: m.bg,
              color: '#ffffff',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
              transition: 'transform 0.12s, box-shadow 0.12s',
              letterSpacing: 0,
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-1px)'
              ;(e.currentTarget as HTMLAnchorElement).style.boxShadow =
                '0 4px 12px rgba(0,0,0,0.22)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(0)'
              ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.15)'
            }}
          >
            {/* Icon in a frosted badge */}
            <span
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <m.Icon />
            </span>
            {m.label}
          </a>
        )
      })}
    </div>
  )
}
