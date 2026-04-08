'use client'

import type { JSX } from 'react'
import { useState } from 'react'
import { Copy, ExternalLink, Globe, CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

interface PublishBarProps {
  handle: string
  isActive: boolean
  onPublish: () => Promise<void>
  onUnpublish: () => Promise<void>
}

export function PublishBar({
  handle,
  isActive,
  onPublish,
  onUnpublish,
}: PublishBarProps): JSX.Element {
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showModal, setShowModal] = useState(false)

  const cardUrl = `${process.env.NEXT_PUBLIC_WEB_URL ?? 'https://dotly.one'}/card/${handle}`

  const handleToggle = async () => {
    setLoading(true)
    try {
      if (isActive) {
        await onUnpublish()
      } else {
        await onPublish()
        setShowModal(true)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(cardUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      {/* ── Publish bar ── */}
      <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3.5">
        {/* Status + URL row */}
        <div className="mb-3 flex items-center gap-2">
          {/* Live / Draft pill */}
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
              isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400',
              )}
            />
            {isActive ? 'Live' : 'Draft'}
          </span>

          {/* URL */}
          <div className="flex min-w-0 flex-1 items-center gap-1 rounded-xl bg-gray-50 px-3 py-1.5">
            <Globe className="h-3 w-3 shrink-0 text-gray-400" />
            <span className="flex-1 truncate text-xs text-gray-500">
              <span className="text-gray-400">dotly.one/</span>
              <span className="font-semibold text-gray-700">{handle}</span>
            </span>
          </div>

          {/* Copy */}
          <button
            type="button"
            onClick={() => void handleCopy()}
            className={cn(
              'flex shrink-0 items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-all',
              copied
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
            )}
          >
            {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {/* View live */}
          <a
            href={`/card/${handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="hidden sm:inline">View</span>
          </a>

          {/* Publish / Unpublish — full width */}
          <button
            type="button"
            onClick={() => void handleToggle()}
            disabled={loading}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed',
              isActive
                ? 'bg-gray-700 hover:bg-gray-800'
                : 'bg-green-600 hover:bg-green-700 shadow-sm shadow-green-600/30',
            )}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isActive ? (
              'Unpublish'
            ) : (
              <>
                <Globe className="h-4 w-4" />
                Publish Card
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Publish success modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            {/* Success icon */}
            <div className="mb-4 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <h2 className="text-center text-lg font-bold text-gray-900">Card is Live!</h2>
            <p className="mt-1 text-center text-sm text-gray-500">
              Your card is now publicly accessible at:
            </p>

            {/* URL box */}
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
              <Globe className="h-4 w-4 shrink-0 text-brand-500" />
              <span className="flex-1 truncate text-sm font-semibold text-brand-600">
                {cardUrl}
              </span>
              <button
                type="button"
                onClick={() => void handleCopy()}
                className={cn(
                  'shrink-0 rounded-lg p-1.5 transition-colors',
                  copied ? 'text-green-600' : 'text-gray-400 hover:text-gray-600',
                )}
              >
                {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>

            {/* Actions */}
            <div className="mt-5 flex gap-2.5">
              <a
                href={`/card/${handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-500 py-3 text-sm font-bold text-white shadow-sm shadow-brand-500/25 hover:bg-brand-600 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                View Live
              </a>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-2xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
