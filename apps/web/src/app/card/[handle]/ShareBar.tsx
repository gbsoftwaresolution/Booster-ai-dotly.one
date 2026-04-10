'use client'
import { useState, useEffect, useRef } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dotly.one'

// ─── Global styles (all keyframes in one place) ───────────────────────────────
const GLOBAL_STYLES = `
  @keyframes check-bounce {
    0%   { transform: scale(0.6); opacity: 0; }
    60%  { transform: scale(1.2); opacity: 1; }
    100% { transform: scale(1);   opacity: 1; }
  }
  @keyframes copy-fade {
    from { opacity: 0; transform: scale(.8); }
    to   { opacity: 1; transform: scale(1); }
  }
`

interface ShareBarProps {
  handle: string
  ownerName: string
  allowAnonymousExport?: boolean
  onAnalytics?: (type: 'CLICK' | 'SAVE', metadata: Record<string, unknown>) => void
}

// ── Device detection ─────────────────────────────────────────────────────────

function useWalletSupport() {
  const [appleSupported, setAppleSupported] = useState(false)
  const [googleSupported, setGoogleSupported] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent
    // Apple Wallet: iOS or macOS Safari (not Chrome/Firefox)
    const isApple =
      /iPhone|iPad|iPod|Macintosh/i.test(ua) &&
      /Safari/i.test(ua) &&
      !/Chrome|CriOS|FxiOS/i.test(ua)
    // Google Wallet: Android Chrome or desktop Chrome (not Safari)
    const isGoogle = /Chrome/i.test(ua) && !/Edg|OPR/i.test(ua)
    setAppleSupported(isApple)
    setGoogleSupported(isGoogle && !isApple)
  }, [])

  return { appleSupported, googleSupported }
}

export function ShareBar({
  handle,
  ownerName,
  allowAnonymousExport = true,
  onAnalytics,
}: ShareBarProps) {
  const [copied, setCopied] = useState(false)
  const { appleSupported, googleSupported } = useWalletSupport()
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Encode handle in case it contains special characters
  const url = `${SITE_URL}/card/${encodeURIComponent(handle)}`

  // Cleanup copied-state timer on unmount
  useEffect(() => {
    return () => {
      if (copiedTimerRef.current !== null) {
        clearTimeout(copiedTimerRef.current)
      }
    }
  }, [])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const input = document.createElement('input')
      input.value = url
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
    }
    setCopied(true)
    onAnalytics?.('CLICK', { surface: 'share_bar', action: 'copy_link' })
    if (copiedTimerRef.current !== null) clearTimeout(copiedTimerRef.current)
    copiedTimerRef.current = setTimeout(() => setCopied(false), 2200)
  }

  async function handleShare() {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: `${ownerName}'s digital card`, url })
        onAnalytics?.('CLICK', { surface: 'share_bar', action: 'native_share' })
        return
      } catch {
        // user cancelled or API not available
      }
    }
    void handleCopy()
  }

  async function handleAppleWallet() {
    onAnalytics?.('SAVE', { surface: 'share_bar', action: 'apple_wallet_open' })
    // Triggers a .pkpass download — navigate directly
    window.location.href = `${API_URL}/public/cards/${handle}/wallet/apple`
  }

  async function handleGoogleWallet() {
    try {
      const res = await fetch(`${API_URL}/public/cards/${handle}/wallet/google`)
      if (res.ok) {
        const { url: saveUrl } = (await res.json()) as { url: string }
        onAnalytics?.('SAVE', { surface: 'share_bar', action: 'google_wallet_open' })
        window.open(saveUrl, '_blank', 'noopener,noreferrer')
      }
    } catch {
      // silent fail
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '10px 14px',
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
        borderTop: '1px solid rgba(148,163,184,.12)',
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      <style>{GLOBAL_STYLES}</style>

      {/* Main share row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* URL pill — keyboard accessible button */}
        <button
          type="button"
          onClick={() => void handleCopy()}
          title="Click to copy"
          aria-label="Copy card link"
          style={{
            flex: 1,
            minWidth: 0,
            borderRadius: 12,
            background: 'rgba(241,245,249,0.8)',
            border: '1px solid rgba(226,232,240,0.6)',
            padding: '0 12px',
            cursor: 'pointer',
            height: 44,
            display: 'flex',
            alignItems: 'center',
          }}
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
        </button>

        {/* Copy button — 44px touch target */}
        <button
          type="button"
          onClick={() => void handleCopy()}
          aria-label={copied ? 'Copied!' : 'Copy link'}
          title={copied ? 'Copied!' : 'Copy link'}
          style={{
            flexShrink: 0,
            width: 44,
            height: 44,
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

        {/* Share button — 44px touch target */}
        <button
          type="button"
          onClick={() => void handleShare()}
          aria-label="Share card"
          style={{
            flexShrink: 0,
            height: 44,
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

      {/* Wallet row — only rendered on supported devices */}
      {allowAnonymousExport && (appleSupported || googleSupported) && (
        <div style={{ display: 'flex', gap: 8 }}>
          {appleSupported && (
            <button
              type="button"
              onClick={() => void handleAppleWallet()}
              aria-label="Add to Apple Wallet"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                height: 44,
                borderRadius: 10,
                border: 'none',
                background: '#000',
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '-0.01em',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.opacity = '0.85'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.opacity = '1'
              }}
            >
              {/* Apple Wallet logo mark */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect width="24" height="24" rx="5" fill="#000" />
                <path
                  d="M12 5.5c-.8-1-2.1-1.5-3.2-1.5C7 4 5.5 5.5 5.5 7.3c0 2.7 2.4 4.6 6.5 7.7 4.1-3.1 6.5-5 6.5-7.7 0-1.8-1.5-3.3-3.3-3.3-1.1 0-2.4.5-3.2 1.5z"
                  fill="#fff"
                />
              </svg>
              Add to Apple Wallet
            </button>
          )}

          {googleSupported && (
            <button
              type="button"
              onClick={() => void handleGoogleWallet()}
              aria-label="Save to Google Wallet"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                height: 44,
                borderRadius: 10,
                border: '1.5px solid #e2e8f0',
                background: '#fff',
                color: '#1e293b',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '-0.01em',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = '#f8fafc'
              }}
              onMouseLeave={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.background = '#fff'
              }}
            >
              {/* Google Wallet "G" mark */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Save to Google Wallet
            </button>
          )}
        </div>
      )}
    </div>
  )
}
