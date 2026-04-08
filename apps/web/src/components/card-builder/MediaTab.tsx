'use client'

import type { JSX } from 'react'
import { useState, useRef } from 'react'
import { MediaBlockType } from '@dotly/types'
import type { MediaBlockData } from '@dotly/types'
import { Trash2, Plus, Link2, ImageIcon, PlayCircle, FileImage } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/cn'

interface MediaTabProps {
  mediaBlocks: MediaBlockData[]
  onChange: (blocks: MediaBlockData[]) => void
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function guessType(url: string): MediaBlockData['type'] {
  const lower = url.toLowerCase()
  if (lower.includes('youtube.com') || lower.includes('youtu.be') || lower.includes('vimeo.com')) {
    return MediaBlockType.VIDEO
  }
  return MediaBlockType.IMAGE
}

/** Extract YouTube video ID from various URL formats */
function youtubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1)
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v')
  } catch {
    // ignore
  }
  return null
}

export function MediaTab({ mediaBlocks, onChange }: MediaTabProps): JSX.Element {
  const idCounterRef = useRef(2000)
  const [newUrl, setNewUrl] = useState('')
  const [newCaption, setNewCaption] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(mediaBlocks.length === 0)

  const detectedType = newUrl ? guessType(newUrl) : null

  const addBlock = () => {
    if (!newUrl.trim()) return
    if (!isValidUrl(newUrl)) {
      setUrlError('Please enter a valid URL (YouTube, Vimeo, or image URL)')
      return
    }
    setUrlError(null)
    const block: MediaBlockData = {
      id: `new-${idCounterRef.current++}`,
      type: guessType(newUrl),
      url: newUrl,
      caption: newCaption.trim() || undefined,
      displayOrder: mediaBlocks.length,
    }
    onChange([...mediaBlocks, block])
    setNewUrl('')
    setNewCaption('')
    setShowAddForm(false)
  }

  const removeBlock = (id: string) => {
    onChange(mediaBlocks.filter((b) => b.id !== id).map((b, i) => ({ ...b, displayOrder: i })))
  }

  const updateCaption = (id: string, caption: string) => {
    onChange(mediaBlocks.map((b) => (b.id === id ? { ...b, caption } : b)))
  }

  return (
    <div className="space-y-4">
      {/* ── Existing blocks ── */}
      {mediaBlocks.length > 0 && (
        <div className="space-y-3">
          {[...mediaBlocks]
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((block) => {
              const ytId = block.type === MediaBlockType.VIDEO ? youtubeId(block.url) : null
              return (
                <div
                  key={block.id}
                  className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50"
                >
                  {/* Thumbnail */}
                  {block.type === MediaBlockType.IMAGE && (
                    <Image
                      src={block.url}
                      alt={block.caption ?? ''}
                      width={400}
                      height={160}
                      unoptimized
                      className="h-36 w-full object-cover"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  )}
                  {block.type === MediaBlockType.VIDEO && ytId && (
                    <div className="relative h-36 w-full bg-gray-900">
                      <Image
                        src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
                        alt={block.caption ?? 'Video thumbnail'}
                        width={400}
                        height={144}
                        unoptimized
                        className="h-full w-full object-cover opacity-80"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
                          <PlayCircle className="h-7 w-7 text-white" />
                        </div>
                      </div>
                    </div>
                  )}
                  {block.type === MediaBlockType.VIDEO && !ytId && (
                    <div className="flex h-36 w-full items-center justify-center bg-gray-900">
                      <PlayCircle className="h-10 w-10 text-gray-500" />
                    </div>
                  )}

                  {/* Meta row */}
                  <div className="flex items-start gap-3 px-3.5 pt-3 pb-1">
                    <span
                      className={cn(
                        'mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                        block.type === MediaBlockType.VIDEO
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700',
                      )}
                    >
                      {block.type === MediaBlockType.VIDEO ? (
                        <>
                          <PlayCircle className="h-2.5 w-2.5" /> Video
                        </>
                      ) : (
                        <>
                          <ImageIcon className="h-2.5 w-2.5" /> Image
                        </>
                      )}
                    </span>
                    <p className="flex-1 truncate text-xs text-gray-400 mt-0.5">{block.url}</p>
                    <button
                      type="button"
                      onClick={() => removeBlock(block.id)}
                      className="shrink-0 rounded-lg p-1 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Caption */}
                  <div className="px-3.5 pb-3">
                    <input
                      type="text"
                      value={block.caption ?? ''}
                      onChange={(e) => updateCaption(block.id, e.target.value)}
                      placeholder="Add a caption…"
                      className={cn(
                        'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 placeholder:text-gray-300',
                        'focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400',
                      )}
                    />
                  </div>
                </div>
              )
            })}
        </div>
      )}

      {/* ── Empty state ── */}
      {mediaBlocks.length === 0 && !showAddForm && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-8 text-center">
          <FileImage className="h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No media yet</p>
          <p className="text-xs text-gray-400">Add images or YouTube/Vimeo videos</p>
        </div>
      )}

      {/* ── Add media form ── */}
      {showAddForm ? (
        <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-4 space-y-3">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Add Media</p>

          {/* URL */}
          <div>
            <div
              className={cn(
                'flex items-center gap-2.5 rounded-2xl border bg-white px-3.5 py-3',
                'transition-all focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/20',
                urlError ? 'border-red-300' : 'border-gray-200',
              )}
            >
              <Link2 className="h-4 w-4 shrink-0 text-gray-400" />
              <input
                type="url"
                value={newUrl}
                onChange={(e) => {
                  setNewUrl(e.target.value)
                  setUrlError(null)
                }}
                onKeyDown={(e) => e.key === 'Enter' && addBlock()}
                placeholder="YouTube URL or image URL"
                className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
              />
              {/* Auto-detect badge */}
              {detectedType && (
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                    detectedType === MediaBlockType.VIDEO
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700',
                  )}
                >
                  {detectedType === MediaBlockType.VIDEO ? 'Video' : 'Image'}
                </span>
              )}
            </div>
            {urlError && <p className="mt-1.5 px-1 text-xs text-red-500">{urlError}</p>}
            {!urlError && (
              <p className="mt-1.5 px-1 text-xs text-gray-400">
                Paste a YouTube/Vimeo link or direct image URL
              </p>
            )}
          </div>

          {/* Caption */}
          <div
            className={cn(
              'flex items-center gap-2.5 rounded-2xl border border-gray-200 bg-white px-3.5 py-3',
              'transition-all focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/20',
            )}
          >
            <ImageIcon className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              type="text"
              value={newCaption}
              onChange={(e) => setNewCaption(e.target.value)}
              placeholder="Caption (optional)"
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false)
                setNewUrl('')
                setNewCaption('')
                setUrlError(null)
              }}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={addBlock}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-500/25 hover:bg-brand-600 transition-colors active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Add Media
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/50 py-3.5 text-sm font-semibold text-brand-600 hover:border-brand-400 hover:bg-brand-50 transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Add Media
        </button>
      )}
    </div>
  )
}
