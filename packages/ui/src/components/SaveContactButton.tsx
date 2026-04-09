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
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  )
}

export function SaveContactButton({
  card,
  handle,
  onSaveContact,
  primaryColor = '#007AFF',
  secondaryColor = '#007AFF',
  buttonStyle = 'filled-icon-text',
}: SaveContactButtonProps) {
  const handleDownload = () => {
    window.open(
      `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'}/public/cards/${handle}/vcard`,
      '_blank',
    )
  }

  const onClick = onSaveContact ?? handleDownload
  const baseLabel = 'Save Contact'

  return (
    <>
      <style>
        {`
          .apple-save-btn {
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif;
            transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
            user-select: none;
            -webkit-tap-highlight-color: transparent;
            cursor: pointer;
            letter-spacing: -0.02em;
            -webkit-font-smoothing: antialiased;
          }
          .apple-save-btn:active {
            transform: scale(0.96);
            opacity: 0.85;
          }
          .apple-save-icon-btn {
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif;
            transition: all 0.4s cubic-bezier(0.25, 1, 0.5, 1);
            user-select: none;
            -webkit-tap-highlight-color: transparent;
            cursor: pointer;
          }
          .apple-save-icon-btn:active {
            transform: scale(0.92);
            opacity: 0.85;
          }
        `}
      </style>
      
      {buttonStyle === 'icon' && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={onClick}
            title={baseLabel}
            aria-label={baseLabel}
            className="apple-save-icon-btn"
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: '#FFFFFF',
              color: primaryColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              boxShadow: '0 4px 16px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,1), 0 0 0 1px rgba(0,0,0,0.03)',
            }}
          >
            <SaveIcon size={22} />
          </button>
        </div>
      )}

      {buttonStyle === 'filled-icon' && (
        <button
          onClick={onClick}
          title={baseLabel}
          aria-label={baseLabel}
          className="apple-save-btn"
          style={{
            width: '100%',
            height: 52,
            borderRadius: 18,
            border: 'none',
            background: primaryColor,
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 8px 16px color-mix(in srgb, ${primaryColor} 20%, transparent)`,
          }}
        >
          <SaveIcon size={24} />
        </button>
      )}

      {buttonStyle === 'filled-icon-text' && (
        <button
          onClick={onClick}
          className="apple-save-btn"
          style={{
            width: '100%',
            height: 50,
            borderRadius: 16,
            border: 'none',
            background: primaryColor,
            color: '#FFFFFF',
            fontSize: 15,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            boxShadow: `0 6px 14px color-mix(in srgb, ${primaryColor} 25%, transparent)`,
          }}
        >
          <SaveIcon size={18} />
          {baseLabel}
        </button>
      )}

      {buttonStyle === 'icon-text' && (
        <button
          onClick={onClick}
          className="apple-save-btn"
          style={{
            width: '100%',
            height: 50,
            borderRadius: 16,
            border: 'none',
            background: '#FFFFFF',
            color: primaryColor,
            fontSize: 15,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            boxShadow: '0 4px 16px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,1), 0 0 0 1px rgba(0,0,0,0.03)',
          }}
        >
          <SaveIcon size={18} />
          {baseLabel}
        </button>
      )}
    </>
  )
}
