import React from 'react'
import type { CardData } from '@dotly/types'

interface SaveContactButtonProps {
  card: CardData
  handle: string
  onSaveContact?: () => void
  primaryColor?: string
}

export function SaveContactButton({
  card,
  handle,
  onSaveContact,
  primaryColor = '#0ea5e9',
}: SaveContactButtonProps) {
  const handleDownload = () => {
    window.open(
      `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'}/public/cards/${handle}/vcard`,
      '_blank',
    )
  }

  const onClick = onSaveContact ?? handleDownload

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '13px 24px',
        borderRadius: 14,
        border: `2px solid ${primaryColor}`,
        background: 'transparent',
        color: primaryColor,
        fontSize: 15,
        fontWeight: 700,
        cursor: 'pointer',
        letterSpacing: 0,
        transition: 'background 0.12s, transform 0.12s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.background = `${primaryColor}12`
        ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
        ;(e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
      }}
    >
      {/* Download / vCard icon */}
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
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
        <path d="M12 7v6M9 10l3 3 3-3" />
      </svg>
      Save to Contacts
    </button>
  )
}
