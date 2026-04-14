import type { CSSProperties, ReactElement } from 'react'
import { SITE_NAME } from '@/lib/seo'

const BRAND_GRADIENT = 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)'

export function createPwaIconMarkup(maskable = false): ReactElement {
  const outerPadding = maskable ? '12%' : '0'
  const cardRadius = maskable ? '28%' : '22%'
  const accentStyle: CSSProperties = {
    position: 'absolute',
    inset: '14%',
    borderRadius: cardRadius,
    background: BRAND_GRADIENT,
    boxShadow: '0 28px 72px rgba(14, 165, 233, 0.28)',
  }

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        padding: outerPadding,
        background: 'radial-gradient(circle at top, rgba(255, 255, 255, 0.92), #dbeafe 68%, #bfdbfe 100%)',
      }}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          width: '100%',
          height: '100%',
          borderRadius: maskable ? '30%' : '24%',
          overflow: 'hidden',
          background: 'linear-gradient(180deg, #eff6ff 0%, #dbeafe 100%)',
        }}
      >
        <div style={accentStyle} />
        <div
          style={{
            position: 'absolute',
            top: '18%',
            left: '16%',
            width: '26%',
            height: '26%',
            borderRadius: '999px',
            background: 'rgba(255, 255, 255, 0.22)',
            filter: 'blur(12px)',
          }}
        />
        <div
          style={{
            position: 'relative',
            display: 'flex',
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontFamily: 'Arial, sans-serif',
            fontSize: 320,
            fontWeight: 800,
            letterSpacing: '-0.08em',
          }}
        >
          D
        </div>
        <div
          style={{
            position: 'absolute',
            right: '18%',
            bottom: '18%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: '24%',
            padding: '4% 8%',
            borderRadius: '999px',
            background: 'rgba(255, 255, 255, 0.88)',
            color: '#0f172a',
            fontFamily: 'Arial, sans-serif',
            fontSize: 56,
            fontWeight: 700,
            letterSpacing: '-0.04em',
          }}
        >
          {SITE_NAME}
        </div>
      </div>
    </div>
  )
}