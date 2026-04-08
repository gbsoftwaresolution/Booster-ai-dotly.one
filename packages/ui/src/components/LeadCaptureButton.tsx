import React from 'react'

interface LeadCaptureButtonProps {
  onLeadCapture?: () => void
  mode?: 'web' | 'mobile' | 'preview'
  primaryColor?: string
  label?: string
}

export function LeadCaptureButton({
  onLeadCapture,
  mode = 'web',
  primaryColor = '#0ea5e9',
  label = 'Connect with Me',
}: LeadCaptureButtonProps) {
  if (!onLeadCapture) return null

  const isPreview = mode === 'preview'

  return (
    <button
      onClick={isPreview ? undefined : onLeadCapture}
      disabled={isPreview}
      style={{
        width: '100%',
        padding: '13px 24px',
        borderRadius: 14,
        border: 'none',
        background: isPreview
          ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
          : `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}cc 100%)`,
        color: '#ffffff',
        fontSize: 15,
        fontWeight: 700,
        cursor: isPreview ? 'not-allowed' : 'pointer',
        letterSpacing: 0,
        boxShadow: isPreview ? 'none' : `0 4px 16px ${primaryColor}55`,
        transition: 'transform 0.12s, box-shadow 0.12s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        opacity: isPreview ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        if (isPreview) return
        ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
        ;(e.currentTarget as HTMLButtonElement).style.boxShadow = `0 6px 20px ${primaryColor}66`
      }}
      onMouseLeave={(e) => {
        if (isPreview) return
        ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
        ;(e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 16px ${primaryColor}55`
      }}
    >
      {/* Handshake icon (SVG so no emoji rendering inconsistency) */}
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z" />
      </svg>
      {label}
    </button>
  )
}
