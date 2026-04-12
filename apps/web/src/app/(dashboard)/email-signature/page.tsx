'use client'

import type { JSX } from 'react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { getAccessToken } from '@/lib/supabase/client'
import { apiGet } from '@/lib/api'
import {
  generateSignatureHtml,
  type CardSummary,
  type SignatureStyle,
  type SignatureOptions,
} from './signature-utils'
import {
  EmailSignatureAlerts,
  EmailSignatureControls,
  EmailSignatureEmpty,
  EmailSignatureHeader,
  EmailSignatureLoading,
  EmailSignaturePreview,
} from './components'
import { encodeSvgData, getToken } from './helpers'

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
  const [qrError, setQrError] = useState<string | null>(null)
  const toastTimeoutRef = useRef<number | null>(null)

  // Load cards with full detail
  useEffect(() => {
    async function load() {
      try {
        const token = await getToken(getAccessToken)
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
        setQrError(null)
        const token = await getToken(getAccessToken)
        const data = await apiGet<{ pngDataUrl?: string; svgData?: string }>(
          `/cards/${selectedCardId}/qr`,
          token,
        )
        const imageUrl =
          data.pngDataUrl ??
          (data.svgData ? `data:image/svg+xml;base64,${encodeSvgData(data.svgData)}` : null)
        setCards((prev) =>
          prev.map((c) => (c.id === selectedCardId ? { ...c, qrImageUrl: imageUrl } : c)),
        )
      } catch (err) {
        setQrError(err instanceof Error ? err.message : 'Could not load QR code.')
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
      try {
        await navigator.clipboard.writeText(signatureHtml)
        showToast('gmail-plain')
      } catch {
        setCopyError('Failed to copy to clipboard. Please copy manually.')
      }
    }
  }, [signatureHtml, showToast])

  if (loading) {
    return <EmailSignatureLoading />
  }

  return (
    <div className="space-y-6">
      <EmailSignatureHeader />

      <EmailSignatureAlerts
        error={error}
        qrError={qrError}
        showQr={options.showQr}
        copyError={copyError}
        copyToast={copyToast}
      />

      {cards.length === 0 && !error ? (
        <EmailSignatureEmpty />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[320px,1fr]">
          <EmailSignatureControls
            cards={cards}
            selectedCardId={selectedCardId}
            style={style}
            options={options}
            selectedCard={selectedCard}
            copyToast={copyToast}
            onSelectCard={setSelectedCardId}
            onSelectStyle={setStyle}
            onToggleOption={(key, checked) => setOptions((prev) => ({ ...prev, [key]: checked }))}
            onCopyHtml={() => void handleCopyHtml()}
            onCopyForGmail={() => void handleCopyForGmail()}
          />

          <EmailSignaturePreview selectedCard={selectedCard} signatureHtml={signatureHtml} />
        </div>
      )}
    </div>
  )
}
