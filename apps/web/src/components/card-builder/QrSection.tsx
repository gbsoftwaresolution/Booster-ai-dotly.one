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

  return (
    <div className="space-y-4 p-4 border border-gray-200 rounded-xl">
      <h3 className="font-semibold text-gray-800">QR Code</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Foreground Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={fgColor}
              onChange={(e) => setFgColor(e.target.value)}
              className="h-8 w-8 rounded cursor-pointer border border-gray-300"
            />
            <input
              type="text"
              value={fgColor}
              onChange={(e) => setFgColor(e.target.value)}
              className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs font-mono"
              maxLength={7}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Background Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="h-8 w-8 rounded cursor-pointer border border-gray-300"
            />
            <input
              type="text"
              value={bgColor}
              onChange={(e) => setBgColor(e.target.value)}
              className="flex-1 rounded border border-gray-300 px-2 py-1 text-xs font-mono"
              maxLength={7}
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Size (px): {size}
        </label>
        <input
          type="range"
          min={100}
          max={800}
          step={50}
          value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          className="w-full"
        />
      </div>

      {error && (
        <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      )}

      {qrResult && (
        <div className="flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrResult.pngDataUrl}
            alt="QR Code preview"
            className="rounded border border-gray-200"
            style={{ width: 200, height: 200 }}
          />
          <p className="text-xs text-gray-400">{qrResult.shortUrl}</p>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => { void generateQr() }}
          disabled={loading}
          className="flex-1 rounded-lg bg-sky-500 px-3 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-60"
        >
          {loading ? 'Generating…' : 'Generate QR Code'}
        </button>
        {qrResult && (
          <>
            <button
              type="button"
              onClick={downloadPng}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Download PNG
            </button>
            <button
              type="button"
              onClick={downloadSvg}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Download SVG
            </button>
          </>
        )}
      </div>
    </div>
  )
}
