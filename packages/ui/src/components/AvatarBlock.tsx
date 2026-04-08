import React from 'react'

export interface AvatarBlockProps {
  avatarUrl?: string
  name: string
  size?: number
  primaryColor?: string
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

/** Deterministically derive a subtle gradient from a color for the fallback avatar */
function buildGradient(color: string): string {
  return `linear-gradient(135deg, ${color}cc 0%, ${color} 100%)`
}

export function AvatarBlock({
  avatarUrl,
  name,
  size = 80,
  primaryColor = '#0ea5e9',
}: AvatarBlockProps) {
  const fontSize = Math.round(size * 0.36)
  const ringSize = Math.round(size * 0.055)

  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    overflow: 'hidden',
    flexShrink: 0,
    position: 'relative',
    // Subtle ring using box-shadow so it doesn't affect layout
    boxShadow: `0 0 0 ${ringSize}px ${primaryColor}33, 0 4px 16px rgba(0,0,0,0.12)`,
  }

  function normalizeUrl(url: string) {
    if (!url) return url
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) return url
    return `https://${url}`
  }

  if (avatarUrl) {
    return (
      <div style={containerStyle}>
        <img
          src={normalizeUrl(avatarUrl)}
          alt={name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
          onError={(e) => {
            // Gracefully degrade to initials on broken images
            const el = e.currentTarget
            el.style.display = 'none'
            const parent = el.parentElement
            if (parent) {
              parent.style.background = buildGradient(primaryColor)
              parent.style.display = 'flex'
              parent.style.alignItems = 'center'
              parent.style.justifyContent = 'center'
              const span = document.createElement('span')
              span.textContent = getInitials(name)
              span.style.color = '#fff'
              span.style.fontWeight = '700'
              span.style.fontSize = `${fontSize}px`
              span.style.letterSpacing = '-0.5px'
              parent.appendChild(span)
            }
          }}
        />
      </div>
    )
  }

  return (
    <div
      style={{
        ...containerStyle,
        background: buildGradient(primaryColor),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ffffff',
        fontSize,
        fontWeight: 700,
        letterSpacing: '-0.5px',
        userSelect: 'none',
      }}
    >
      {getInitials(name)}
    </div>
  )
}
