import React from 'react'
import type { SocialLinkData } from '@dotly/types'

interface SocialLinkListProps {
  socialLinks: SocialLinkData[]
  onSocialLinkClick?: (platform: string, url: string) => void
  style?: 'pills' | 'list' | 'icons'
  accentColor?: string
}

const PLATFORM_META: Record<string, { label: string; bg: string; fg: string; shortLabel: string }> =
  {
    LINKEDIN: { label: 'LinkedIn', shortLabel: 'in', bg: '#0A66C2', fg: '#fff' },
    TWITTER: { label: 'X', shortLabel: 'X', bg: '#000000', fg: '#fff' },
    INSTAGRAM: { label: 'Instagram', shortLabel: 'ig', bg: '#E1306C', fg: '#fff' },
    GITHUB: { label: 'GitHub', shortLabel: 'gh', bg: '#171515', fg: '#fff' },
    YOUTUBE: { label: 'YouTube', shortLabel: 'yt', bg: '#FF0000', fg: '#fff' },
    TIKTOK: { label: 'TikTok', shortLabel: 'tt', bg: '#010101', fg: '#fff' },
    WHATSAPP: { label: 'WhatsApp', shortLabel: 'wa', bg: '#25D366', fg: '#fff' },
    FACEBOOK: { label: 'Facebook', shortLabel: 'fb', bg: '#1877F2', fg: '#fff' },
    CALENDLY: { label: 'Calendly', shortLabel: 'cal', bg: '#0069FF', fg: '#fff' },
    CALCOM: { label: 'Cal.com', shortLabel: 'cal', bg: '#111827', fg: '#fff' },
    CUSTOM: { label: 'Website', shortLabel: '↗', bg: '#64748b', fg: '#fff' },
  }

function getPlatformMeta(platform: string) {
  return PLATFORM_META[platform] ?? PLATFORM_META['CUSTOM']!
}

export function SocialLinkList({
  socialLinks,
  onSocialLinkClick,
  style = 'pills',
  accentColor = '#0ea5e9',
}: SocialLinkListProps) {
  if (!socialLinks || socialLinks.length === 0) return null

  const sorted = [...socialLinks].sort((a, b) => a.displayOrder - b.displayOrder)

  const handleClick = (platform: string, url: string) => {
    onSocialLinkClick?.(platform, url)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  // ── Icon-only row (small colored circles) ──────────────────────────────────
  if (style === 'icons') {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
        {sorted.map((link) => {
          const m = getPlatformMeta(link.platform)
          return (
            <button
              key={link.id}
              onClick={() => handleClick(link.platform, link.url)}
              title={m.label}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: m.bg,
                color: m.fg,
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 0,
                boxShadow: '0 2px 6px rgba(0,0,0,0.18)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                  '0 4px 12px rgba(0,0,0,0.25)'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
                  '0 2px 6px rgba(0,0,0,0.18)'
              }}
            >
              {m.shortLabel}
            </button>
          )
        })}
      </div>
    )
  }

  // ── Vertical list (for Corporate) ──────────────────────────────────────────
  if (style === 'list') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {sorted.map((link) => {
          const m = getPlatformMeta(link.platform)
          return (
            <button
              key={link.id}
              onClick={() => handleClick(link.platform, link.url)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px 0',
                textAlign: 'left',
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: m.bg,
                  color: m.fg,
                  fontSize: 9,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {m.shortLabel}
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
            </button>
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
        return (
          <button
            key={link.id}
            onClick={() => handleClick(link.platform, link.url)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px 7px 10px',
              borderRadius: 100,
              border: 'none',
              background: m.bg,
              color: m.fg,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
              transition: 'transform 0.12s, box-shadow 0.12s',
              letterSpacing: 0,
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 10px rgba(0,0,0,0.2)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.12)'
            }}
          >
            {/* Mini brand badge */}
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 8,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {m.shortLabel}
            </span>
            {m.label}
          </button>
        )
      })}
    </div>
  )
}
