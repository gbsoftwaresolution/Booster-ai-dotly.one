'use client'

import type { JSX } from 'react'
import { useState, useEffect, useCallback, useRef } from 'react'
import DOMPurify from 'dompurify'
import { getAccessToken } from '@/lib/supabase/client'
import { apiGet } from '@/lib/api'
import { SelectField } from '@/components/ui/SelectField'
import { Copy, Check, Mail } from 'lucide-react'
import {
  generateSignatureHtml,
  type CardSummary,
  type SignatureStyle,
  type SignatureOptions,
} from './signature-utils'

const STYLES: { value: SignatureStyle; label: string; desc: string }[] = [
  { value: 'minimal', label: 'Minimal', desc: 'Clean, text-only' },
  { value: 'professional', label: 'Professional', desc: 'Photo + divider' },
  { value: 'branded', label: 'Branded', desc: 'Accent color + left border' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getToken(): Promise<string | undefined> {
  return (await getAccessToken()) ?? undefined
}

function encodeSvgData(svgData: string): string {
  const bytes = new TextEncoder().encode(svgData)
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return window.btoa(binary)
}

function getCopyToastText(copyToast: 'html' | 'gmail' | 'gmail-plain' | null): string {
  if (copyToast === 'html') return 'HTML copied to the clipboard.'
  if (copyToast === 'gmail') return 'Styled signature copied for Gmail.'
  if (copyToast === 'gmail-plain') {
    return 'Signature copied as plain text. Styled paste is not supported in this browser.'
  }
  return ''
}

// ─── Page component ────────────────────────────────────────────────────────────

export default function EmailSignaturePage(): JSX.Element {
  const [cards, setCards] = useState<CardSummary[]>([])
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [style, setStyle] = useState<SignatureStyle>('professional')
  const [options, setOptions] = useState<SignatureOptions>({
    showPhoto: true,
    showSocials: true,
    showQr: false,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copyToast, setCopyToast] = useState<'html' | 'gmail' | 'gmail-plain' | null>(null)
  const [copyError, setCopyError] = useState<string | null>(null)
  const toastTimeoutRef = useRef<number | null>(null)

  // Load cards with full detail
  useEffect(() => {
    async function load() {
      try {
        const token = await getToken()
        const data = await apiGet<CardSummary[]>('/cards?include=theme,socialLinks,qrCode', token)
        setCards(data)
        const first = data[0]
        if (first) setSelectedCardId(first.id)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cards')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  // Fetch the actual QR image data URL when the selected card changes and QR is enabled
  useEffect(() => {
    if (!selectedCardId || !options.showQr) return

    async function fetchQrImage() {
      try {
        const token = await getToken()
        const data = await apiGet<{ pngDataUrl?: string; svgData?: string }>(
          `/cards/${selectedCardId}/qr`,
          token,
        )
        // Prefer pngDataUrl; fall back to an SVG data URL constructed from svgData
        const imageUrl =
          data.pngDataUrl ??
          (data.svgData ? `data:image/svg+xml;base64,${encodeSvgData(data.svgData)}` : null)
        setCards((prev) =>
          prev.map((c) => (c.id === selectedCardId ? { ...c, qrImageUrl: imageUrl } : c)),
        )
      } catch {
        // QR not yet generated for this card — leave qrImageUrl as null, QR cell is hidden
      }
    }
    void fetchQrImage()
  }, [selectedCardId, options.showQr])

  const selectedCard = cards.find((c) => c.id === selectedCardId) ?? null

  const signatureHtml = selectedCard ? generateSignatureHtml(selectedCard, style, options) : ''

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current !== null) {
        window.clearTimeout(toastTimeoutRef.current)
      }
    }
  }, [])

  const showToast = useCallback((type: 'html' | 'gmail' | 'gmail-plain') => {
    setCopyToast(type)
    if (toastTimeoutRef.current !== null) {
      window.clearTimeout(toastTimeoutRef.current)
    }
    toastTimeoutRef.current = window.setTimeout(() => setCopyToast(null), 2000)
  }, [])

  const handleCopyHtml = useCallback(async () => {
    setCopyError(null)
    try {
      await navigator.clipboard.writeText(signatureHtml)
      showToast('html')
    } catch {
      setCopyError('Failed to copy to clipboard. Please copy manually.')
    }
  }, [signatureHtml, showToast])

  const handleCopyForGmail = useCallback(async () => {
    setCopyError(null)
    try {
      const blob = new Blob([signatureHtml], { type: 'text/html' })
      const item = new ClipboardItem({ 'text/html': blob })
      await navigator.clipboard.write([item])
      showToast('gmail')
    } catch {
      // Fallback to plain text copy
      try {
        await navigator.clipboard.writeText(signatureHtml)
        showToast('gmail-plain')
      } catch {
        setCopyError('Failed to copy to clipboard. Please copy manually.')
      }
    }
  }, [signatureHtml, showToast])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-gray-100" />
        <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="app-panel rounded-[30px] px-6 py-6 sm:px-8">
        <h1 className="text-2xl font-bold text-gray-900">Email Signature Generator</h1>
        <p className="mt-2 text-sm text-gray-500">
          Generate a Gmail-compatible email signature from your Dotly card.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {copyError && (
        <div role="alert" className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {copyError}
        </div>
      )}

      <div aria-live="polite" className="sr-only">
        {getCopyToastText(copyToast)}
      </div>

      {cards.length === 0 && !error ? (
        <div className="app-empty-state">
          <Mail className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p className="text-sm text-gray-500">
            Create a card first to generate an email signature.
          </p>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[320px,1fr]">
          {/* ── Controls panel ── */}
          <div className="space-y-6">
            {/* Card selector */}
            <div className="app-panel rounded-[24px] p-5">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">Card</h2>
              <SelectField
                aria-label="Select a card for this signature"
                value={selectedCardId ?? ''}
                onChange={(e) => setSelectedCardId(e.target.value)}
                className="rounded-xl px-3 py-2.5 pr-10 focus:border-indigo-500 focus:ring-indigo-100"
              >
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    /{card.handle}
                    {card.fields['name'] ? ` — ${card.fields['name']}` : ''}
                  </option>
                ))}
              </SelectField>
            </div>

            {/* Style selector */}
            <div className="app-panel rounded-[24px] p-5">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">Style</h2>
              <div className="space-y-2">
                {STYLES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStyle(s.value)}
                    aria-pressed={style === s.value}
                    className={[
                      'flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors',
                      style === s.value
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 text-gray-700 hover:bg-gray-50',
                    ].join(' ')}
                  >
                    <span className="font-medium">{s.label}</span>
                    <span className="text-xs text-gray-400">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="app-panel rounded-[24px] p-5">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">Options</h2>
              <div className="space-y-3">
                {(
                  [
                    { key: 'showPhoto', label: 'Show photo' },
                    { key: 'showSocials', label: 'Show social links' },
                    { key: 'showQr', label: 'Show QR code' },
                  ] as { key: keyof SignatureOptions; label: string }[]
                ).map(({ key, label }) => (
                  <label key={key} className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={options[key]}
                      onChange={(e) => setOptions((prev) => ({ ...prev, [key]: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
              {options.showQr && selectedCard && !selectedCard.qrImageUrl && (
                <p className="mt-3 text-xs text-amber-600">
                  No QR code found for this card. Generate one from the card editor first.
                </p>
              )}
            </div>

            {/* Copy buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => void handleCopyHtml()}
                disabled={!selectedCard}
                aria-live="polite"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {copyToast === 'html' ? (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy HTML
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => void handleCopyForGmail()}
                disabled={!selectedCard}
                aria-live="polite"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {copyToast === 'gmail' || copyToast === 'gmail-plain' ? (
                  <>
                    <Check className="h-4 w-4" />
                    {copyToast === 'gmail-plain' ? 'Plain Text Copied' : 'Copied!'}
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy for Gmail
                  </>
                )}
              </button>

              <p className="text-center text-xs text-gray-400">
                {copyToast === 'gmail-plain'
                  ? 'This browser only allowed plain-text copy. Paste styling may be lost.'
                  : '“Copy for Gmail” pastes styled HTML directly into Gmail compose.'}
              </p>
            </div>
          </div>

          {/* ── Live preview ── */}
          <div className="app-panel rounded-[28px] p-6">
            <h2 className="mb-4 text-sm font-semibold text-gray-700">Preview</h2>

            {selectedCard ? (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6">
                {/* Simulate email context */}
                <div className="mb-4 border-b border-gray-200 pb-4">
                  <p className="text-xs text-gray-400">— Email body above —</p>
                </div>
                <div
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: intentional for signature preview — sanitized via DOMPurify
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(signatureHtml),
                  }}
                />
              </div>
            ) : (
              <p className="text-sm text-gray-400">Select a card to preview your signature.</p>
            )}

            {/* Raw HTML toggle */}
            {selectedCard && (
              <details className="mt-4">
                <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600">
                  View raw HTML
                </summary>
                <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100">
                  {signatureHtml}
                </pre>
              </details>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
