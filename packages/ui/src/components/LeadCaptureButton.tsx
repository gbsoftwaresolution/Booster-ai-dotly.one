import React from 'react'
import type { ButtonStyle } from '@dotly/types'

interface LeadCaptureButtonProps {
  onLeadCapture?: () => void
  mode?: 'web' | 'mobile' | 'preview'
  primaryColor?: string
  secondaryColor?: string
  label?: string
  buttonStyle?: ButtonStyle
}

/** SVG icon: heart / connect */
function ConnectIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z" />
    </svg>
  )
}

export function LeadCaptureButton({
  onLeadCapture,
  mode = 'web',
  primaryColor = '#0ea5e9',
  secondaryColor = '#dbeafe',
  label = 'Connect with Me',
  buttonStyle = 'filled-icon-text',
}: LeadCaptureButtonProps) {
  if (!onLeadCapture) return null

  const isPreview = mode === 'preview'

  // ── icon only ────────────────────────────────────────────────────────────────
  if (buttonStyle === 'icon') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={isPreview ? undefined : onLeadCapture}
          disabled={isPreview}
          title={label}
          aria-label={label}
          style={{
            width: 52,
            height: 52,
            borderRadius: 999,
            border: isPreview
              ? '1px solid rgba(107, 114, 128, 0.18)'
              : `1px solid color-mix(in srgb, ${secondaryColor} 56%, white)`,
            background: isPreview
              ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
              : `linear-gradient(180deg, color-mix(in srgb, ${secondaryColor} 22%, ${primaryColor}) 0%, ${primaryColor} 100%)`,
            color: '#ffffff',
            cursor: isPreview ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isPreview ? 'none' : '0 6px 16px rgba(15,23,42,0.16)',
            transition: 'transform 0.12s, box-shadow 0.12s',
            opacity: isPreview ? 0.6 : 1,
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            if (isPreview) return
            ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
              '0 10px 22px rgba(15,23,42,0.20)'
          }}
          onMouseLeave={(e) => {
            if (isPreview) return
            ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
              '0 6px 16px rgba(15,23,42,0.16)'
          }}
        >
          <ConnectIcon size={20} />
        </button>
      </div>
    )
  }

  // ── filled icon (wide, no label) ─────────────────────────────────────────────
  if (buttonStyle === 'filled-icon') {
    return (
      <button
        onClick={isPreview ? undefined : onLeadCapture}
        disabled={isPreview}
        title={label}
        aria-label={label}
        style={{
          width: '100%',
          minHeight: 56,
          padding: '15px 20px',
          borderRadius: 18,
          border: isPreview
            ? '1px solid rgba(107, 114, 128, 0.18)'
            : `1px solid color-mix(in srgb, ${secondaryColor} 56%, white)`,
          background: isPreview
            ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
            : `linear-gradient(180deg, color-mix(in srgb, ${secondaryColor} 22%, ${primaryColor}) 0%, ${primaryColor} 100%)`,
          color: '#ffffff',
          cursor: isPreview ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isPreview
            ? 'none'
            : '0 18px 32px rgba(15,23,42,0.14), inset 0 1px 0 rgba(255,255,255,0.18)',
          transition: 'transform 0.12s, box-shadow 0.12s, filter 0.12s',
          opacity: isPreview ? 0.6 : 1,
        }}
        onMouseEnter={(e) => {
          if (isPreview) return
          ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
            '0 22px 36px rgba(15,23,42,0.18), inset 0 1px 0 rgba(255,255,255,0.18)'
        }}
        onMouseLeave={(e) => {
          if (isPreview) return
          ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
            '0 18px 32px rgba(15,23,42,0.14), inset 0 1px 0 rgba(255,255,255,0.18)'
        }}
      >
        <ConnectIcon size={20} />
      </button>
    )
  }

  // ── icon + text (outlined ghost) ─────────────────────────────────────────────
  if (buttonStyle === 'icon-text') {
    return (
      <button
        onClick={isPreview ? undefined : onLeadCapture}
        disabled={isPreview}
        style={{
          width: '100%',
          minHeight: 56,
          padding: '15px 20px',
          borderRadius: 18,
          border: isPreview
            ? '2px solid rgba(107, 114, 128, 0.28)'
            : `2px solid color-mix(in srgb, ${primaryColor} 40%, white)`,
          background: isPreview ? 'rgba(200,200,200,0.18)' : 'rgba(255,255,255,0.82)',
          color: isPreview ? '#9ca3af' : primaryColor,
          fontFamily: 'inherit',
          fontSize: 15,
          fontWeight: 700,
          cursor: isPreview ? 'not-allowed' : 'pointer',
          letterSpacing: '-0.01em',
          transition: 'background 0.12s, transform 0.12s, box-shadow 0.12s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          boxShadow: isPreview ? 'none' : '0 6px 18px rgba(60,64,67,0.06)',
          opacity: isPreview ? 0.6 : 1,
        }}
        onMouseEnter={(e) => {
          if (isPreview) return
          ;(e.currentTarget as HTMLButtonElement).style.background =
            `color-mix(in srgb, ${primaryColor} 6%, white)`
          ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
            '0 10px 24px rgba(60,64,67,0.10)'
        }}
        onMouseLeave={(e) => {
          if (isPreview) return
          ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.82)'
          ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 18px rgba(60,64,67,0.06)'
        }}
      >
        <ConnectIcon size={18} />
        <span>{label}</span>
      </button>
    )
  }

  // ── filled + icon + text (default) ───────────────────────────────────────────
  return (
    <button
      onClick={isPreview ? undefined : onLeadCapture}
      disabled={isPreview}
      style={{
        width: '100%',
        minHeight: 56,
        padding: '15px 20px',
        borderRadius: 18,
        border: isPreview
          ? '1px solid rgba(107, 114, 128, 0.18)'
          : `1px solid color-mix(in srgb, ${secondaryColor} 56%, white)`,
        background: isPreview
          ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
          : `linear-gradient(180deg, color-mix(in srgb, ${secondaryColor} 22%, ${primaryColor}) 0%, ${primaryColor} 100%)`,
        color: '#ffffff',
        fontFamily: 'inherit',
        fontSize: 15,
        fontWeight: 700,
        cursor: isPreview ? 'not-allowed' : 'pointer',
        letterSpacing: '-0.01em',
        boxShadow: isPreview
          ? 'none'
          : '0 18px 32px rgba(15,23,42,0.14), inset 0 1px 0 rgba(255,255,255,0.18)',
        transition: 'transform 0.12s, box-shadow 0.12s, filter 0.12s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        opacity: isPreview ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        if (isPreview) return
        ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
        ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
          '0 22px 36px rgba(15,23,42,0.18), inset 0 1px 0 rgba(255,255,255,0.18)'
        ;(e.currentTarget as HTMLButtonElement).style.filter = 'saturate(1.03)'
      }}
      onMouseLeave={(e) => {
        if (isPreview) return
        ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
        ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
          '0 18px 32px rgba(15,23,42,0.14), inset 0 1px 0 rgba(255,255,255,0.18)'
        ;(e.currentTarget as HTMLButtonElement).style.filter = 'none'
      }}
    >
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 999,
          background: 'rgba(255,255,255,0.18)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <ConnectIcon size={16} />
      </span>
      <span>{label}</span>
    </button>
  )
}
