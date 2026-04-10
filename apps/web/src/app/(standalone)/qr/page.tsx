'use client'

import type { JSX } from 'react'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { getPublicApiUrl } from '@/lib/public-env'
import { getAccessToken } from '@/lib/supabase/client'
import { apiGet, apiPost } from '@/lib/api'
import jsQR from 'jsqr'
import {
  Pencil,
  ExternalLink,
  ChevronRight,
  Wifi,
  WifiOff,
  Loader2,
  Home,
  Camera,
  X,
  UserPlus,
  Check,
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  Globe,
  MessageSquare,
  Copy,
  Share2,
  Zap,
  ZapOff,
  RotateCcw,
} from 'lucide-react'

// ─── Constants ────────────────────────────────────────────────────────────────

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dotly.one'
const API_URL = getPublicApiUrl()

// ─── Types ────────────────────────────────────────────────────────────────────

interface CardSummary {
  id: string
  handle: string
  templateId: string
  isActive: boolean
  fields: Record<string, string>
}

interface QrResult {
  shortUrl: string
  svgData: string
  pngDataUrl: string
}

interface SocialLink {
  platform: string
  url: string
  label?: string
}

interface PublicCardData {
  id: string
  handle: string
  fields: {
    name?: string
    title?: string
    company?: string
    phone?: string
    email?: string
    website?: string
    bio?: string
    avatarUrl?: string
  }
  socialLinks?: SocialLink[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function parseDotlyHandle(url: string): string | null {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')
    const siteHost = new URL(SITE_URL).hostname.replace(/^www\./, '')
    if (host !== siteHost) return null
    const parts = parsed.pathname.split('/').filter(Boolean)
    if (parts.length === 1 && parts[0]) return parts[0]
    return null
  } catch {
    return null
  }
}

function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* ignore */
  }
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

// Social platform → brand colour
const SOCIAL_COLORS: Record<string, string> = {
  linkedin: '#0077b5',
  twitter: '#1da1f2',
  x: '#000000',
  instagram: '#e1306c',
  github: '#333333',
  youtube: '#ff0000',
  facebook: '#1877f2',
  tiktok: '#010101',
  discord: '#5865f2',
  telegram: '#26a5e4',
  whatsapp: '#25d366',
}
function socialColor(platform: string): string {
  return SOCIAL_COLORS[platform.toLowerCase()] ?? '#55a7ff'
}

// ─── Global styles (injected once at root) ────────────────────────────────────

const GLOBAL_STYLES = `
  @keyframes qr-scanline {
    0%   { top: 4px;           opacity: 0; }
    15%  { opacity: 1; }
    85%  { opacity: 1; }
    100% { top: calc(100% - 4px); opacity: 0; }
  }
  @keyframes scan-sweep {
    0%   { top: 0%;   opacity: 0; }
    10%  { opacity: 1; }
    90%  { opacity: 1; }
    100% { top: 100%; opacity: 0; }
  }
  @keyframes qrpulse {
    0%   { box-shadow: 0 0 0 0   rgba(85,167,255,.5); }
    70%  { box-shadow: 0 0 0 14px rgba(85,167,255,0);  }
    100% { box-shadow: 0 0 0 0   rgba(85,167,255,0);   }
  }
  @keyframes detect-flash {
    0%   { opacity: 0; }
    25%  { opacity: 0.35; }
    100% { opacity: 0; }
  }
  @keyframes slide-up {
    from { transform: translateY(28px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @keyframes fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position:  400px 0; }
  }
  .qr-shimmer {
    background: linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 75%);
    background-size: 400px 100%;
    animation: shimmer 1.4s ease-in-out infinite;
  }
  .slide-up  { animation: slide-up 0.3s cubic-bezier(.32,.72,0,1) both; }
  .fade-in   { animation: fade-in  0.25s ease both; }
`

// ─── ScannedCardSheet ─────────────────────────────────────────────────────────

function ScannedCardSheet({
  handle,
  onClose,
  onDashboard,
}: {
  handle: string
  onClose: () => void
  onDashboard: () => void
}): JSX.Element {
  const [card, setCard] = useState<PublicCardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [copied, setCopied] = useState(false)
  const [msgOpen, setMsgOpen] = useState(false)

  useEffect(() => {
    apiGet<PublicCardData>(`/public/cards/${handle}`)
      .then(setCard)
      .catch(() => setFetchError('Could not load this card.'))
      .finally(() => setLoading(false))
  }, [handle])

  async function handleSave() {
    if (!card) return
    setSaving(true)
    setSaveError('')
    try {
      const token = await getAccessToken()
      if (!token) {
        setSaveError('Sign in to save contacts.')
        return
      }
      await apiPost(
        '/contacts',
        {
          name: card.fields.name ?? handle,
          email: card.fields.email ?? '',
          phone: card.fields.phone ?? '',
          company: card.fields.company ?? '',
          title: card.fields.title ?? '',
          sourceHandle: handle,
        },
        token,
      )
      vibrate([30, 40, 80])
      setSaved(true)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  async function handleShare() {
    const url = `${SITE_URL}/${handle}`
    const name = card?.fields.name ?? handle
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: `${name}'s card`, url })
        return
      } catch {
        /* user cancelled or not supported */
      }
    }
    const ok = await copyToClipboard(url)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const name = card?.fields.name ?? handle
  const ini = initials(name)
  const cardUrl = `${SITE_URL}/${handle}`

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ background: 'linear-gradient(160deg,#050810,#0b1120)' }}
    >
      {/* Safe-area-aware header */}
      <div
        className="flex shrink-0 items-center justify-between px-5 pb-3"
        style={{ paddingTop: 'max(48px, calc(env(safe-area-inset-top) + 12px))' }}
      >
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: 'rgba(255,255,255,0.1)' }}
          aria-label="Back to scanner"
        >
          <ArrowLeft className="h-5 w-5 text-white" />
        </button>
        <span className="text-[15px] font-semibold text-white">Card Scanned</span>
        <button
          onClick={onDashboard}
          className="flex h-9 items-center rounded-full px-4 text-xs font-semibold text-white"
          style={{ background: 'rgba(255,255,255,0.1)' }}
        >
          Dashboard
        </button>
      </div>

      {/* Scrollable body */}
      <div
        className="flex-1 overflow-y-auto px-5 pb-10"
        style={{ paddingBottom: 'max(40px, env(safe-area-inset-bottom))' }}
      >
        {/* ── Loading skeleton ── */}
        {loading && (
          <div className="flex flex-col gap-4 pt-2 slide-up">
            {/* Profile skeleton */}
            <div className="rounded-3xl p-6" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 shrink-0 rounded-2xl qr-shimmer" />
                <div className="flex-1 flex flex-col gap-2 pt-1">
                  <div className="h-5 w-2/3 rounded-lg qr-shimmer" />
                  <div className="h-3.5 w-1/2 rounded-lg qr-shimmer" />
                  <div className="h-3 w-1/3 rounded-lg qr-shimmer" />
                </div>
              </div>
              <div className="mt-4 h-3 w-full rounded-lg qr-shimmer" />
              <div className="mt-2 h-3 w-4/5 rounded-lg qr-shimmer" />
            </div>
            <div className="rounded-3xl p-5" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="h-12 w-full rounded-2xl qr-shimmer" />
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {fetchError && !loading && (
          <div
            className="mt-10 flex flex-col items-center gap-4 rounded-3xl p-8 text-center slide-up"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: 'rgba(239,68,68,0.12)' }}
            >
              <X className="h-7 w-7 text-red-400" />
            </div>
            <div>
              <p className="font-semibold text-white">Card not found</p>
              <p className="mt-1 text-sm" style={{ color: '#a5afc3' }}>
                {fetchError}
              </p>
            </div>
            <a
              href={cardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-2xl px-5 py-3 text-sm font-semibold text-white"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              Open in browser <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}

        {/* ── Card loaded ── */}
        {card && !loading && (
          <div className="flex flex-col gap-4 slide-up">
            {/* ── Profile hero ── */}
            <div
              className="rounded-3xl p-5"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {/* Avatar + name row */}
              <div className="flex items-start gap-4">
                {card.fields.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={card.fields.avatarUrl}
                    alt={name}
                    className="h-[68px] w-[68px] shrink-0 rounded-[18px] object-cover"
                    style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}
                  />
                ) : (
                  <div
                    className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-[18px] text-xl font-black text-white"
                    style={{
                      background: 'linear-gradient(135deg,#55a7ff,#7d6bff)',
                      boxShadow: '0 4px 16px rgba(85,167,255,0.25)',
                    }}
                  >
                    {ini}
                  </div>
                )}
                <div className="min-w-0 flex-1 pt-1">
                  <h2 className="text-[22px] font-black leading-tight tracking-tight text-white">
                    {name}
                  </h2>
                  {card.fields.title && (
                    <p className="mt-0.5 text-sm font-medium" style={{ color: '#a5b0c8' }}>
                      {card.fields.title}
                    </p>
                  )}
                  {card.fields.company && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 shrink-0" style={{ color: '#55a7ff' }} />
                      <span className="text-xs font-semibold" style={{ color: '#a5b0c8' }}>
                        {card.fields.company}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bio */}
              {card.fields.bio && (
                <p className="mt-4 text-sm leading-relaxed" style={{ color: '#c2cce0' }}>
                  {card.fields.bio}
                </p>
              )}

              {/* Divider */}
              <div className="my-4" style={{ height: 1, background: 'rgba(255,255,255,0.07)' }} />

              {/* Contact action pills */}
              <div className="flex flex-wrap gap-2">
                {card.fields.email && (
                  <a
                    href={`mailto:${card.fields.email}`}
                    className="flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold text-white"
                    style={{
                      background: 'rgba(85,167,255,0.12)',
                      border: '1px solid rgba(85,167,255,0.2)',
                    }}
                  >
                    <Mail className="h-3.5 w-3.5" style={{ color: '#55a7ff' }} />
                    Email
                  </a>
                )}
                {card.fields.phone && (
                  <a
                    href={`tel:${card.fields.phone}`}
                    className="flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold text-white"
                    style={{
                      background: 'rgba(85,167,255,0.12)',
                      border: '1px solid rgba(85,167,255,0.2)',
                    }}
                  >
                    <Phone className="h-3.5 w-3.5" style={{ color: '#55a7ff' }} />
                    Call
                  </a>
                )}
                {card.fields.website && (
                  <a
                    href={card.fields.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold text-white"
                    style={{
                      background: 'rgba(85,167,255,0.12)',
                      border: '1px solid rgba(85,167,255,0.2)',
                    }}
                  >
                    <Globe className="h-3.5 w-3.5" style={{ color: '#55a7ff' }} />
                    Website
                  </a>
                )}
              </div>

              {/* Social links */}
              {card.socialLinks && card.socialLinks.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {card.socialLinks.map((s, i) => (
                    <a
                      key={i}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold text-white capitalize"
                      style={{
                        background: `${socialColor(s.platform)}1a`,
                        border: `1px solid ${socialColor(s.platform)}33`,
                        color: socialColor(s.platform),
                      }}
                    >
                      {s.label ?? s.platform}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* ── Primary CTA: Save contact ── */}
            <div
              className="rounded-3xl p-5"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {saved ? (
                <div className="flex flex-col items-center gap-3 py-2">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-full"
                    style={{
                      background: 'rgba(34,197,94,0.12)',
                      border: '1px solid rgba(34,197,94,0.2)',
                    }}
                  >
                    <Check className="h-7 w-7 text-green-400" />
                  </div>
                  <p className="text-base font-bold text-white">Contact saved!</p>
                  <p className="text-center text-xs" style={{ color: '#a5b0c8' }}>
                    {name} has been added to your contacts. They&apos;ll be notified you connected.
                  </p>
                  {/* Share their card */}
                  <button
                    onClick={() => void handleShare()}
                    className="mt-1 flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold text-white"
                    style={{ background: 'rgba(255,255,255,0.08)' }}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Share2 className="h-4 w-4" />
                    )}
                    {copied ? 'Link copied!' : `Share ${name}'s card`}
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className="flex w-full items-center justify-center gap-2.5 rounded-2xl py-4 text-[15px] font-black text-white transition-opacity active:scale-[0.98] disabled:opacity-60"
                    style={{
                      background: 'linear-gradient(135deg,#55a7ff,#7d6bff)',
                      boxShadow: '0 6px 24px rgba(85,167,255,0.3)',
                      letterSpacing: '-0.2px',
                    }}
                  >
                    {saving ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <UserPlus className="h-5 w-5" />
                    )}
                    {saving ? 'Saving…' : `Save ${name}`}
                  </button>
                  {saveError && (
                    <p className="mt-2 text-center text-xs text-red-400">{saveError}</p>
                  )}
                  <p
                    className="mt-2.5 text-center text-[11px] font-medium"
                    style={{ color: '#6b7a96' }}
                  >
                    They&apos;ll be notified and can add you back
                  </p>
                </>
              )}
            </div>

            {/* ── Leave a message ── */}
            {!msgOpen ? (
              <button
                onClick={() => setMsgOpen(true)}
                className="flex w-full items-center gap-3.5 rounded-3xl px-5 py-4 text-left"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: 'rgba(85,167,255,0.12)' }}
                >
                  <MessageSquare className="h-5 w-5" style={{ color: '#55a7ff' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">Leave a message</p>
                  <p className="text-xs" style={{ color: '#6b7a96' }}>
                    Send {name} a private note
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0" style={{ color: '#6b7a96' }} />
              </button>
            ) : (
              <LeaveMessage handle={handle} name={name} onDismiss={() => setMsgOpen(false)} />
            )}

            {/* ── View full card ── */}
            <a
              href={cardUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-3xl py-3.5 text-sm font-semibold text-white"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}
            >
              <ExternalLink className="h-4 w-4" style={{ color: '#6b7a96' }} />
              <span style={{ color: '#a5b0c8' }}>View full card</span>
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── LeaveMessage ─────────────────────────────────────────────────────────────

function LeaveMessage({
  handle,
  name,
  onDismiss,
}: {
  handle: string
  name: string
  onDismiss: () => void
}): JSX.Element {
  const [senderName, setSenderName] = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const openedAt = useRef(Date.now())

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (honeypot) return
    if (Date.now() - openedAt.current < 1500) return
    if (!senderName.trim() || !message.trim()) {
      setError('Name and message are required.')
      return
    }
    setSending(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/public/cards/${handle}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderName: senderName.trim(),
          senderEmail: senderEmail.trim(),
          message: message.trim(),
        }),
      })
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { message?: string }
        setError(
          res.status === 429
            ? 'Too many messages. Try again later.'
            : (b.message ?? 'Something went wrong.'),
        )
        return
      }
      setSent(true)
    } catch {
      setError('Network error. Try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className="rounded-3xl p-5 slide-up"
      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Leave a message</h3>
        <button
          onClick={onDismiss}
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        >
          <X className="h-4 w-4 text-white" />
        </button>
      </div>

      {sent ? (
        <div className="flex flex-col items-center gap-3 py-3">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{ background: 'rgba(34,197,94,0.12)' }}
          >
            <Check className="h-6 w-6 text-green-400" />
          </div>
          <p className="text-sm font-bold text-white">Message sent!</p>
          <p className="text-center text-xs" style={{ color: '#a5b0c8' }}>
            {name} will receive your message.
          </p>
        </div>
      ) : (
        <form onSubmit={(e) => void handleSend(e)} className="flex flex-col gap-3">
          {/* Honeypot */}
          <input
            type="text"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            aria-hidden="true"
            style={{ position: 'absolute', left: -9999, width: 1, height: 1 }}
          />

          <input
            type="text"
            placeholder="Your name"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            required
            className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          />
          <input
            type="email"
            placeholder="Your email (optional)"
            value={senderEmail}
            onChange={(e) => setSenderEmail(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          />
          <textarea
            placeholder={`Your message to ${name}…`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            rows={3}
            className="w-full resize-none rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={sending}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#55a7ff,#7d6bff)' }}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send Message'}
          </button>
        </form>
      )}
    </div>
  )
}

// ─── QR Scanner ───────────────────────────────────────────────────────────────

function QrScanner({ onClose }: { onClose: () => void }): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const torchTrack = useRef<MediaStreamTrack | null>(null)

  const [error, setError] = useState('')
  const [detected, setDetected] = useState('')
  const [scannedHandle, setScannedHandle] = useState<string | null>(null)
  const [flashVisible, setFlashVisible] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream

        // Check torch capability
        const vtrack = stream.getVideoTracks()[0]
        if (vtrack) {
          torchTrack.current = vtrack
          const caps = vtrack.getCapabilities() as { torch?: boolean }
          if (caps.torch) setTorchSupported(true)
        }

        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        video.setAttribute('playsinline', 'true')
        video.muted = true
        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => resolve()
        })
        await video.play()
        if (!cancelled) rafRef.current = requestAnimationFrame(tick)
      } catch (e) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message.toLowerCase() : ''
          setError(
            msg.includes('permission') || msg.includes('notallowed')
              ? 'Camera access denied. Allow camera in browser settings.'
              : 'Could not start camera. Try refreshing.',
          )
        }
      }
    }

    function tick() {
      if (cancelled) return
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      const w = video.videoWidth
      const h = video.videoHeight
      if (w === 0 || h === 0) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      ctx.drawImage(video, 0, 0, w, h)

      const code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, {
        inversionAttempts: 'attemptBoth',
      })
      if (code?.data && !cancelled) {
        setDetected(code.data)
        stopStream()
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    void start()
    return () => {
      cancelled = true
      stopStream()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function stopStream() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  async function toggleTorch() {
    const track = torchTrack.current
    if (!track) return
    const next = !torchOn
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] })
      setTorchOn(next)
    } catch {
      /* device doesn't support it */
    }
  }

  function scanAgain() {
    setDetected('')
    setScannedHandle(null)
    // Re-mount scanner (remount by closing + reopening handled by parent)
    onClose()
  }

  // On detection: vibrate + flash + classify URL
  useEffect(() => {
    if (!detected) return
    vibrate([20, 30, 60])
    setFlashVisible(true)
    setTimeout(() => setFlashVisible(false), 400)
    const h = parseDotlyHandle(detected)
    if (h) setScannedHandle(h)
  }, [detected])

  if (scannedHandle) {
    return (
      <ScannedCardSheet
        handle={scannedHandle}
        onClose={() => {
          setScannedHandle(null)
          setDetected('')
          onClose()
        }}
        onDashboard={() => onClose()}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col" style={{ background: '#000' }}>
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      {/* Detect flash overlay */}
      {flashVisible && (
        <div
          className="pointer-events-none fixed inset-0 z-[110]"
          style={{
            background: 'rgba(85,167,255,0.25)',
            animation: 'detect-flash 0.4s ease forwards',
          }}
        />
      )}

      {/* Header */}
      <div
        className="flex shrink-0 items-center justify-between px-5 pb-3 z-10"
        style={{
          paddingTop: 'max(48px, calc(env(safe-area-inset-top) + 12px))',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)',
        }}
      >
        <span className="text-[15px] font-semibold text-white">Scan a Card</span>
        <div className="flex items-center gap-2">
          {torchSupported && (
            <button
              onClick={() => void toggleTorch()}
              className="flex h-10 w-10 items-center justify-center rounded-full"
              style={{ background: torchOn ? 'rgba(255,220,50,0.2)' : 'rgba(255,255,255,0.1)' }}
              aria-label={torchOn ? 'Turn off torch' : 'Turn on torch'}
            >
              {torchOn ? (
                <Zap className="h-5 w-5" style={{ color: '#ffd632' }} />
              ) : (
                <ZapOff className="h-5 w-5 text-white" />
              )}
            </button>
          )}
          <button
            onClick={() => {
              stopStream()
              onClose()
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: 'rgba(255,255,255,0.1)' }}
            aria-label="Close scanner"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      {/* Viewfinder */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline autoPlay />

        {/* Dimming vignette */}
        {!detected && !error && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `
                radial-gradient(ellipse 70% 70% at 50% 50%,
                  transparent 38%,
                  rgba(0,0,0,0.65) 100%)
              `,
            }}
          />
        )}

        {/* Viewfinder box */}
        {!detected && !error && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative" style={{ width: 260, height: 260 }}>
              {/* Corners */}
              {[
                'top-0 left-0',
                'top-0 right-0 rotate-90',
                'bottom-0 right-0 rotate-180',
                'bottom-0 left-0 -rotate-90',
              ].map((pos, i) => (
                <span
                  key={i}
                  className={`absolute h-9 w-9 ${pos}`}
                  style={{
                    borderTop: '3px solid #55a7ff',
                    borderLeft: '3px solid #55a7ff',
                    borderRadius: '4px 0 0 0',
                  }}
                />
              ))}

              {/* Animated scan line */}
              <span
                className="absolute left-1 right-1 h-[2px] rounded-full"
                style={{
                  background: 'linear-gradient(90deg, transparent, #55a7ff, transparent)',
                  animation: 'scan-sweep 2.4s ease-in-out infinite',
                  position: 'absolute',
                }}
              />
            </div>

            <p
              className="absolute text-xs font-medium"
              style={{ color: 'rgba(255,255,255,0.5)', bottom: 'calc(50% - 160px)' }}
            >
              Point at a Dotly QR code
            </p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 text-center">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <Camera className="h-7 w-7 text-white/60" />
            </div>
            <p className="text-sm font-semibold text-white">{error}</p>
            <button
              onClick={() => {
                stopStream()
                onClose()
              }}
              className="rounded-2xl px-6 py-3 text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#55a7ff,#7d6bff)' }}
            >
              Go Back
            </button>
          </div>
        )}
      </div>

      {/* Non-Dotly result sheet */}
      {detected && !scannedHandle && (
        <div
          className="shrink-0 flex flex-col gap-3 rounded-t-3xl px-5 py-5 slide-up"
          style={{
            background: 'rgba(10,14,26,0.98)',
            backdropFilter: 'blur(30px)',
            paddingBottom: 'max(20px, env(safe-area-inset-bottom))',
          }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{ color: '#55a7ff' }}
          >
            QR Code Detected
          </p>
          <p className="truncate text-sm font-medium text-white">{detected}</p>
          <div className="flex gap-2.5">
            <button
              onClick={scanAgain}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-white"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              <RotateCcw className="h-4 w-4" /> Scan Again
            </button>
            <a
              href={detected.startsWith('http') ? detected : `https://${detected}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#55a7ff,#7d6bff)' }}
            >
              Open <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── QR Panel ────────────────────────────────────────────────────────────────

function QrPanel({ card }: { card: CardSummary }): JSX.Element {
  const name = (card.fields['name'] as string | undefined) ?? card.handle
  const jobTitle = (card.fields['title'] as string | undefined) ?? ''
  const publicUrl = `${SITE_URL}/${card.handle}`

  const [qr, setQr] = useState<QrResult | null>(null)
  const [loadingQr, setLoadingQr] = useState(false)
  const [qrError, setQrError] = useState('')
  const [imgLoaded, setImgLoaded] = useState(false)
  const [copied, setCopied] = useState(false)

  const [nfcSupported, setNfcSupported] = useState(false)
  const [nfcEnabled, setNfcEnabled] = useState(false)
  const [nfcBusy, setNfcBusy] = useState(false)
  const [nfcStatus, setNfcStatus] = useState<'off' | 'on' | 'error'>('off')

  useEffect(() => {
    setNfcSupported('NDEFReader' in window)
  }, [])

  const fetchQr = useCallback(async () => {
    setLoadingQr(true)
    setQrError('')
    setImgLoaded(false)
    try {
      const token = await getAccessToken()
      const res = await fetch(`${API_URL}/cards/${card.id}/qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ fgColor: '#0f172a', bgColor: '#ffffff', size: 480 }),
      })
      if (!res.ok) throw new Error('Failed')
      setQr((await res.json()) as QrResult)
    } catch {
      setQrError('Could not generate QR code.')
    } finally {
      setLoadingQr(false)
    }
  }, [card.id])

  useEffect(() => {
    void fetchQr()
  }, [fetchQr])

  async function toggleNfc() {
    if (!nfcSupported) return
    setNfcBusy(true)
    try {
      if (!nfcEnabled) {
        // @ts-expect-error NDEFReader not in TS lib
        const ndef = new NDEFReader()
        await ndef.write({ records: [{ recordType: 'url', data: publicUrl }] })
        setNfcEnabled(true)
        setNfcStatus('on')
      } else {
        setNfcEnabled(false)
        setNfcStatus('off')
      }
    } catch {
      setNfcStatus('error')
    } finally {
      setNfcBusy(false)
    }
  }

  function downloadPng() {
    if (!qr) return
    const a = document.createElement('a')
    a.href = qr.pngDataUrl
    a.download = `dotly-${card.handle}.png`
    a.click()
  }

  async function handleCopy() {
    const ok = await copyToClipboard(publicUrl)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  async function handleShare() {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: `${name}'s card`, url: publicUrl })
        return
      } catch {
        /* cancelled */
      }
    }
    void handleCopy()
  }

  const ini = initials(name)

  return (
    <div className="flex flex-col items-center w-full gap-4">
      {/* Identity + QR card */}
      <div
        className="w-full rounded-3xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.09)' }}
      >
        {/* Name / title header */}
        <div className="px-6 pt-6 pb-4 text-center">
          <div
            className="mx-auto mb-3 flex h-[72px] w-[72px] items-center justify-center rounded-[20px] text-2xl font-black text-white"
            style={{
              background: 'linear-gradient(135deg,#55a7ff,#7d6bff)',
              boxShadow: '0 6px 20px rgba(85,167,255,0.3)',
            }}
          >
            {ini}
          </div>
          <h2 className="text-xl font-black tracking-tight text-white">{name}</h2>
          {jobTitle && (
            <p className="mt-0.5 text-sm font-medium" style={{ color: '#a5b0c8' }}>
              {jobTitle}
            </p>
          )}
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold"
            style={{ color: '#55a7ff' }}
          >
            dotly.one/{card.handle}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* QR code */}
        <div className="mx-5 mb-5 overflow-hidden rounded-2xl" style={{ background: '#fff' }}>
          {/* Skeleton shown while loading or before image decoded */}
          {(loadingQr || (!imgLoaded && qr)) && (
            <div
              className="flex h-[240px] items-center justify-center qr-shimmer"
              style={{
                background: 'linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)',
                backgroundSize: '400px 100%',
              }}
            >
              {loadingQr && <Loader2 className="h-7 w-7 animate-spin text-slate-300" />}
            </div>
          )}
          {qrError && !loadingQr && (
            <div className="flex h-[200px] flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-slate-500">{qrError}</p>
              <button
                onClick={() => void fetchQr()}
                className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200"
              >
                Retry
              </button>
            </div>
          )}
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qr.pngDataUrl}
              alt={`QR code for ${name}`}
              className="w-full rounded-2xl"
              style={{
                display: imgLoaded ? 'block' : 'none',
                animation: 'fade-in 0.3s ease',
              }}
              onLoad={() => setImgLoaded(true)}
            />
          )}
        </div>
      </div>

      {/* Action row: Copy + Share */}
      <div className="flex w-full gap-2.5">
        <button
          onClick={() => void handleCopy()}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white transition-opacity active:opacity-80"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-green-400" /> Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" /> Copy Link
            </>
          )}
        </button>
        <button
          onClick={() => void handleShare()}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white"
          style={{
            background: 'linear-gradient(135deg,#55a7ff,#7d6bff)',
            boxShadow: '0 4px 18px rgba(85,167,255,0.25)',
          }}
        >
          <Share2 className="h-4 w-4" /> Share Card
        </button>
      </div>

      {/* NFC — only shown when supported */}
      {nfcSupported && (
        <div
          className="w-full rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <button
            onClick={() => void toggleNfc()}
            disabled={nfcBusy}
            className="flex w-full items-center gap-4 px-5 py-4 text-left disabled:opacity-60"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: nfcEnabled ? 'rgba(45,212,191,0.15)' : 'rgba(255,255,255,0.08)',
              }}
            >
              {nfcBusy ? (
                <Loader2 className="h-4.5 w-4.5 animate-spin text-white" />
              ) : nfcEnabled ? (
                <Wifi className="h-4.5 w-4.5" style={{ color: '#2dd4bf' }} />
              ) : (
                <WifiOff className="h-4.5 w-4.5 text-white/50" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">
                {nfcEnabled ? 'NFC Sharing On' : 'Enable NFC Sharing'}
              </p>
              <p className="text-xs" style={{ color: '#6b7a96' }}>
                {nfcStatus === 'on'
                  ? 'Hold phone near another device to share'
                  : nfcStatus === 'error'
                    ? 'Could not enable NFC — try again'
                    : 'Tap to share card via NFC'}
              </p>
            </div>
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{
                background: nfcEnabled ? '#2dd4bf' : '#374151',
                boxShadow: nfcEnabled ? '0 0 0 4px rgba(45,212,191,0.2)' : 'none',
              }}
            />
          </button>
        </div>
      )}

      {/* Download + Edit */}
      <div className="flex w-full gap-2.5">
        <button
          onClick={downloadPng}
          disabled={!qr || !imgLoaded}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-xs font-semibold text-white disabled:opacity-40"
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          Download QR
        </button>
        <Link
          href={`/apps/cards/${card.id}/edit`}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-xs font-semibold text-white"
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Pencil className="h-3.5 w-3.5" /> Edit Card
        </Link>
      </div>
    </div>
  )
}

// ─── Card Picker ──────────────────────────────────────────────────────────────

function CardPicker({
  cards,
  selected,
  onSelect,
}: {
  cards: CardSummary[]
  selected: CardSummary
  onSelect: (c: CardSummary) => void
}): JSX.Element {
  return (
    <div className="flex flex-col gap-2 w-full">
      <p
        className="mb-1 text-[10px] font-bold uppercase tracking-[0.12em]"
        style={{ color: '#6b7a96' }}
      >
        Your Cards
      </p>
      {cards.map((card) => {
        const cname = (card.fields['name'] as string | undefined) ?? card.handle
        const ctitle = (card.fields['title'] as string | undefined) ?? ''
        const isSel = card.id === selected.id
        return (
          <button
            key={card.id}
            onClick={() => onSelect(card)}
            className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-all active:scale-[0.99]"
            style={{
              background: isSel
                ? 'linear-gradient(135deg,rgba(85,167,255,0.15),rgba(125,107,255,0.15))'
                : 'rgba(255,255,255,0.05)',
              border: isSel
                ? '1.5px solid rgba(85,167,255,0.35)'
                : '1.5px solid rgba(255,255,255,0.06)',
            }}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] text-sm font-black text-white"
              style={{ background: 'linear-gradient(135deg,#55a7ff,#7d6bff)' }}
            >
              {initials(cname)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-bold text-white">{cname}</p>
              <p className="truncate text-xs" style={{ color: '#6b7a96' }}>
                {ctitle || `dotly.one/${card.handle}`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{
                  background: card.isActive ? 'rgba(45,212,191,0.12)' : 'rgba(255,255,255,0.06)',
                  color: card.isActive ? '#2dd4bf' : '#6b7a96',
                }}
              >
                {card.isActive ? 'Live' : 'Draft'}
              </span>
              <ChevronRight className="h-4 w-4" style={{ color: '#6b7a96' }} />
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function QrPage(): JSX.Element {
  const [cards, setCards] = useState<CardSummary[]>([])
  const [selected, setSelected] = useState<CardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const token = (await getAccessToken()) ?? ''
        const data = await apiGet<CardSummary[]>('/cards', token)
        if (!data?.length) {
          setCards([])
          return
        }
        const sorted = [...data].sort((a, b) =>
          a.isActive === b.isActive ? 0 : a.isActive ? -1 : 1,
        )
        setCards(sorted)
        setSelected(sorted[0] ?? null)
      } catch {
        setError('Failed to load your cards.')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  return (
    <div
      className="min-h-screen w-full"
      style={{ background: 'linear-gradient(160deg,#050810,#0b1120)' }}
    >
      {/* Global keyframes — defined once here so all sub-components can use them */}
      <style>{GLOBAL_STYLES}</style>

      {scannerOpen && <QrScanner onClose={() => setScannerOpen(false)} />}

      <div
        className="mx-auto max-w-sm px-5 py-6"
        style={{
          paddingTop: 'max(24px, calc(env(safe-area-inset-top) + 16px))',
          paddingBottom: 'max(120px, calc(env(safe-area-inset-bottom) + 96px))',
        }}
      >
        {/* Top bar */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p
              className="text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ color: '#6b7a96' }}
            >
              Dotly
            </p>
            <h1 className="text-xl font-black tracking-tight text-white">My QR Card</h1>
          </div>
          <button
            onClick={() => setScannerOpen(true)}
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-white active:scale-95"
            style={{
              background: 'linear-gradient(135deg,#55a7ff,#7d6bff)',
              boxShadow: '0 4px 18px rgba(85,167,255,0.35)',
              animation: 'qrpulse 2.5s ease-in-out infinite',
            }}
            aria-label="Scan a QR code"
          >
            <Camera className="h-5 w-5" />
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-4 pt-20">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <p className="text-sm" style={{ color: '#6b7a96' }}>
              Loading your cards…
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div
            className="mt-16 rounded-3xl p-6 text-center"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* No cards */}
        {!loading && !error && cards.length === 0 && (
          <div className="mt-16 flex flex-col items-center gap-5 text-center fade-in">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-3xl"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6b7a96"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <path d="m14 14 3 3 4-4" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-black text-white">No cards yet</p>
              <p className="mt-1 text-sm" style={{ color: '#6b7a96' }}>
                Create your first digital business card to get your QR code.
              </p>
            </div>
            <Link
              href="/apps/cards/create"
              className="rounded-2xl px-7 py-3.5 text-sm font-black text-white"
              style={{
                background: 'linear-gradient(135deg,#55a7ff,#7d6bff)',
                boxShadow: '0 4px 18px rgba(85,167,255,0.3)',
              }}
            >
              Create a Card
            </Link>
          </div>
        )}

        {/* Single card */}
        {!loading && !error && cards.length === 1 && selected && (
          <div className="fade-in">
            <QrPanel card={selected} />
          </div>
        )}

        {/* Multiple cards */}
        {!loading && !error && cards.length > 1 && selected && (
          <div className="flex flex-col gap-5 fade-in">
            <CardPicker cards={cards} selected={selected} onSelect={setSelected} />
            <QrPanel card={selected} />
          </div>
        )}
      </div>

      {/* Home FAB — single instance, always at the bottom */}
      <div
        className="fixed left-0 right-0 flex justify-center z-40"
        style={{ bottom: 'max(28px, env(safe-area-inset-bottom))' }}
      >
        <Link
          href="/dashboard"
          className="flex items-center justify-center h-14 w-14 rounded-full text-white shadow-2xl transition-transform active:scale-90"
          style={{
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1.5px solid rgba(255,255,255,0.14)',
          }}
          aria-label="Go to dashboard"
        >
          <Home className="h-5 w-5" />
        </Link>
      </div>
    </div>
  )
}
