'use client'
import { useState } from 'react'

interface ShareBarProps {
  handle: string
  ownerName: string
}

export function ShareBar({ handle, ownerName }: ShareBarProps) {
  const [copied, setCopied] = useState(false)
  const url = `https://dotly.one/card/${handle}`

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // Legacy fallback
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  async function handleShare() {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: `${ownerName}'s digital card`, url })
        return
      } catch {
        // user cancelled or API not available
      }
    }
    void handleCopy()
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 14px',
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
        borderTop: '1px solid rgba(148,163,184,.12)',
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      <style>{`
        @keyframes check-bounce {
          0%   { transform: scale(0.6); opacity: 0; }
          60%  { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes copy-fade {
          from { opacity: 0; transform: scale(.8); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* URL pill */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          borderRadius: 12,
          background: 'rgba(241,245,249,0.8)',
          border: '1px solid rgba(226,232,240,0.6)',
          padding: '7px 12px',
          cursor: 'text',
        }}
        onClick={() => void handleCopy()}
        title="Click to copy"
      >
        <p
          style={{
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: 11,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            color: '#64748b',
            letterSpacing: '-0.01em',
          }}
        >
          {url}
        </p>
      </div>

      {/* Copy button */}
      <button
        type="button"
        onClick={() => void handleCopy()}
        aria-label={copied ? 'Copied!' : 'Copy link'}
        title={copied ? 'Copied!' : 'Copy link'}
        style={{
          flexShrink: 0,
          width: 36,
          height: 36,
          borderRadius: 10,
          border: copied ? '1px solid rgba(34,197,94,.3)' : '1px solid rgba(226,232,240,.8)',
          background: copied ? 'rgba(240,253,244,0.9)' : 'rgba(255,255,255,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'background 0.2s, border-color 0.2s',
        }}
      >
        {copied ? (
          <svg
            key="check"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#22c55e"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: 'check-bounce 0.3s cubic-bezier(.32,1.4,.56,1) both' }}
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg
            key="copy"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#64748b"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ animation: 'copy-fade 0.2s ease both' }}
          >
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>

      {/* Share button */}
      <button
        type="button"
        onClick={() => void handleShare()}
        aria-label="Share card"
        style={{
          flexShrink: 0,
          height: 36,
          paddingLeft: 14,
          paddingRight: 14,
          borderRadius: 10,
          border: 'none',
          background: 'linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%)',
          boxShadow: '0 2px 10px rgba(14,165,233,.30)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 700,
          color: 'white',
          transition: 'opacity 0.15s, transform 0.15s',
          letterSpacing: '-0.01em',
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.opacity = '0.88'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.opacity = '1'
        }}
        onMouseDown={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.94)'
        }}
        onMouseUp={(e) => {
          ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
        }}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        Share
      </button>
    </div>
  )
}
