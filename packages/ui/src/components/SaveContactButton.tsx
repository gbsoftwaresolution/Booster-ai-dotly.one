import React from 'react'
import type { ButtonStyle, CardData } from '@dotly/types'

interface SaveContactButtonProps {
  card: CardData
  handle: string
  onSaveContact?: () => void
  primaryColor?: string
  secondaryColor?: string
  buttonStyle?: ButtonStyle
}

/** SVG icon: save-to-contacts / download card */
function SaveIcon({ size = 16 }: { size?: number }) {
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
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
      <path d="M12 7v6M9 10l3 3 3-3" />
    </svg>
  )
}

export function SaveContactButton({
  card,
  handle,
  onSaveContact,
  primaryColor = '#0ea5e9',
  secondaryColor = '#dbeafe',
  buttonStyle = 'filled-icon-text',
}: SaveContactButtonProps) {
  const handleDownload = () => {
    window.open(
      `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'}/public/cards/${handle}/vcard`,
      '_blank',
    )
  }

  const onClick = onSaveContact ?? handleDownload

  // ── icon only ────────────────────────────────────────────────────────────────
  if (buttonStyle === 'icon') {
    return (
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={onClick}
          title="Save to Contacts"
          aria-label="Save to Contacts"
          style={{
            width: 52,
            height: 52,
            borderRadius: 999,
            border: `1px solid color-mix(in srgb, ${secondaryColor} 58%, white)`,
            background: `linear-gradient(180deg, rgba(255,255,255,0.98) 0%, color-mix(in srgb, ${secondaryColor} 18%, white) 100%)`,
            color: primaryColor,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 16px rgba(60,64,67,0.10)',
            transition: 'transform 0.12s, box-shadow 0.12s',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
              '0 10px 22px rgba(60,64,67,0.14)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
              '0 6px 16px rgba(60,64,67,0.10)'
          }}
        >
          <SaveIcon size={20} />
        </button>
      </div>
    )
  }

  // ── filled icon (wide, no label) ─────────────────────────────────────────────
  if (buttonStyle === 'filled-icon') {
    return (
      <button
        onClick={onClick}
        title="Save to Contacts"
        aria-label="Save to Contacts"
        style={{
          width: '100%',
          minHeight: 54,
          padding: '14px 20px',
          borderRadius: 18,
          border: `1px solid color-mix(in srgb, ${secondaryColor} 56%, white)`,
          background: `linear-gradient(180deg, color-mix(in srgb, ${secondaryColor} 22%, ${primaryColor}) 0%, ${primaryColor} 100%)`,
          color: '#ffffff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 12px 24px rgba(60,64,67,0.12)',
          transition: 'transform 0.12s, box-shadow 0.12s',
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
            '0 16px 28px rgba(60,64,67,0.16)'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
            '0 12px 24px rgba(60,64,67,0.12)'
        }}
      >
        <SaveIcon size={20} />
      </button>
    )
  }

  // ── icon + text (outlined ghost) ─────────────────────────────────────────────
  if (buttonStyle === 'icon-text') {
    return (
      <button
        onClick={onClick}
        style={{
          width: '100%',
          minHeight: 54,
          padding: '14px 20px',
          borderRadius: 18,
          border: `2px solid color-mix(in srgb, ${primaryColor} 40%, white)`,
          background: 'rgba(255,255,255,0.82)',
          color: primaryColor,
          fontFamily: 'inherit',
          fontSize: 15,
          fontWeight: 700,
          cursor: 'pointer',
          letterSpacing: '-0.01em',
          transition: 'background 0.12s, transform 0.12s, box-shadow 0.12s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          boxShadow: '0 6px 18px rgba(60,64,67,0.06)',
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.background =
            `color-mix(in srgb, ${primaryColor} 6%, white)`
          ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
            '0 10px 24px rgba(60,64,67,0.10)'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.82)'
          ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 18px rgba(60,64,67,0.06)'
        }}
      >
        <SaveIcon size={18} />
        <span>Save to Contacts</span>
      </button>
    )
  }

  // ── filled + icon + text (default) ───────────────────────────────────────────
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        minHeight: 54,
        padding: '14px 20px',
        borderRadius: 18,
        border: `1px solid color-mix(in srgb, ${secondaryColor} 58%, white)`,
        background: `linear-gradient(180deg, rgba(255,255,255,0.98) 0%, color-mix(in srgb, ${secondaryColor} 18%, white) 100%)`,
        color: '#202124',
        fontFamily: 'inherit',
        fontSize: 15,
        fontWeight: 700,
        cursor: 'pointer',
        letterSpacing: '-0.01em',
        transition: 'background 0.12s, transform 0.12s, box-shadow 0.12s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        boxShadow: '0 12px 24px rgba(60,64,67,0.08), inset 0 1px 0 rgba(255,255,255,0.72)',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.background =
          `linear-gradient(180deg, rgba(255,255,255,0.98) 0%, color-mix(in srgb, ${secondaryColor} 24%, white) 100%)`
        ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
        ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
          '0 16px 28px rgba(60,64,67,0.10), inset 0 1px 0 rgba(255,255,255,0.72)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.background =
          'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,250,252,0.98) 100%)'
        ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
        ;(e.currentTarget as HTMLButtonElement).style.boxShadow =
          '0 12px 24px rgba(60,64,67,0.08), inset 0 1px 0 rgba(255,255,255,0.72)'
      }}
    >
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 999,
          background: `color-mix(in srgb, ${primaryColor} 10%, white)`,
          color: primaryColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: `1px solid color-mix(in srgb, ${secondaryColor} 50%, white)`,
        }}
      >
        <SaveIcon size={16} />
      </span>
      <span>Save to Contacts</span>
    </button>
  )
}
