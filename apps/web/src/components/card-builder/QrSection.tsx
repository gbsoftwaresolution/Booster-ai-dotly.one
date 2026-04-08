'use client'
import { useState } from 'react'
import { getAccessToken } from '@/lib/supabase/client'

interface QrSectionProps {
  cardId: string
  apiUrl?: string
}

interface QrResult {
  shortUrl: string
  svgData: string
  pngDataUrl: string
}

/** Thin SVG spinner */
function Spinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      style={{ animation: 'spin 0.75s linear infinite' }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}

/** Download (arrow-down-tray) SVG icon */
function DownloadIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

/** QR code icon */
function QrIcon({ size = 15 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="3" height="3" />
      <rect x="18" y="14" width="3" height="3" />
      <rect x="14" y="18" width="3" height="3" />
      <rect x="18" y="18" width="3" height="3" />
    </svg>
  )
}

/** Color swatch picker with live ring preview */
function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        {label}
      </label>
      <div className="flex items-center gap-2.5 rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
        {/* Swatch — clicking it opens the hidden color input */}
        <label className="relative cursor-pointer">
          <span
            className="block h-7 w-7 rounded-lg border-2 border-white shadow-md transition-transform hover:scale-110 active:scale-95"
            style={{
              backgroundColor: value,
              boxShadow: `0 0 0 2px ${value}40, 0 2px 8px rgba(0,0,0,.12)`,
            }}
          />
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            tabIndex={-1}
          />
        </label>

        {/* Hex text input */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={7}
          spellCheck={false}
          className="flex-1 bg-transparent font-mono text-xs text-gray-700 outline-none placeholder:text-gray-300"
          placeholder="#000000"
        />
      </div>
    </div>
  )
}

export function QrSection({ cardId, apiUrl = '' }: QrSectionProps) {
  const baseUrl = apiUrl || (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001')
  const [fgColor, setFgColor] = useState('#000000')
  const [bgColor, setBgColor] = useState('#ffffff')
  const [size, setSize] = useState(400)
  const [qrResult, setQrResult] = useState<QrResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function generateQr() {
    setLoading(true)
    setError('')
    try {
      const token = await getAccessToken()
      const res = await fetch(`${baseUrl}/cards/${cardId}/qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ fgColor, bgColor, size }),
      })
      if (!res.ok) {
        setError('Failed to generate QR code.')
        return
      }
      const data = (await res.json()) as QrResult
      setQrResult(data)
    } catch {
      setError('Network error generating QR code.')
    } finally {
      setLoading(false)
    }
  }

  function downloadPng() {
    if (!qrResult) return
    const a = document.createElement('a')
    a.href = qrResult.pngDataUrl
    a.download = `dotly-qr-${cardId}.png`
    a.click()
  }

  function downloadSvg() {
    if (!qrResult) return
    const blob = new Blob([qrResult.svgData], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dotly-qr-${cardId}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Size steps mapped to human-readable labels
  const sizeLabel =
    size <= 200 ? 'Small' : size <= 400 ? 'Medium' : size <= 600 ? 'Large' : 'Extra Large'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-50 text-sky-500">
          <QrIcon size={16} />
        </span>
        <div>
          <h3 className="text-sm font-bold text-gray-900">QR Code</h3>
          <p className="text-[11px] text-gray-400">Generate a scannable code for your card</p>
        </div>
      </div>

      {/* Color pickers */}
      <div className="grid grid-cols-2 gap-3">
        <ColorPicker label="Foreground" value={fgColor} onChange={setFgColor} />
        <ColorPicker label="Background" value={bgColor} onChange={setBgColor} />
      </div>

      {/* Size slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Resolution
          </label>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-semibold text-gray-500">
            {sizeLabel} · {size}px
          </span>
        </div>
        <div className="relative flex items-center">
          <input
            type="range"
            min={100}
            max={800}
            step={50}
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-sky-500"
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-300">
          <span>100px</span>
          <span>800px</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3.5 py-2.5">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* QR Preview */}
      {qrResult && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-5 shadow-sm">
          {/* QR image */}
          <div
            className="rounded-2xl shadow-lg"
            style={{
              padding: 12,
              backgroundColor: bgColor,
              boxShadow: '0 8px 32px rgba(0,0,0,.10), 0 2px 8px rgba(0,0,0,.06)',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrResult.pngDataUrl}
              alt="QR Code preview"
              style={{ width: 180, height: 180, display: 'block' }}
            />
          </div>

          {/* Short URL */}
          <p className="max-w-[220px] truncate text-center text-[11px] font-mono text-gray-400">
            {qrResult.shortUrl}
          </p>

          {/* Download buttons */}
          <div className="flex w-full gap-2">
            <button
              type="button"
              onClick={downloadPng}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white py-2 text-xs font-semibold text-gray-600 shadow-sm transition-all hover:border-sky-200 hover:text-sky-600 active:scale-95"
            >
              <DownloadIcon size={13} />
              PNG
            </button>
            <button
              type="button"
              onClick={downloadSvg}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white py-2 text-xs font-semibold text-gray-600 shadow-sm transition-all hover:border-sky-200 hover:text-sky-600 active:scale-95"
            >
              <DownloadIcon size={13} />
              SVG
            </button>
          </div>
        </div>
      )}

      {/* Generate button */}
      <button
        type="button"
        onClick={() => {
          void generateQr()
        }}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-sky-400 py-3 text-sm font-semibold text-white shadow-md shadow-sky-500/25 transition-all hover:from-sky-600 hover:to-sky-500 hover:shadow-sky-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <Spinner />
            Generating…
          </>
        ) : (
          <>
            <QrIcon size={15} />
            {qrResult ? 'Regenerate QR Code' : 'Generate QR Code'}
          </>
        )}
      </button>
    </div>
  )
}
