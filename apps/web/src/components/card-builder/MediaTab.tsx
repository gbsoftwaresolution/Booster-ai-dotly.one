'use client'

import type { JSX } from 'react'
import { useState, useRef, useCallback } from 'react'
import { MediaBlockType } from '@dotly/types'
import type { MediaBlockData } from '@dotly/types'
import {
  Trash2,
  Plus,
  Link2,
  ImageIcon,
  PlayCircle,
  Music2,
  FileText,
  GripVertical,
  Upload,
  ExternalLink,
  X,
  Check,
  AlertCircle,
  Loader2,
  Eye,
  ChevronRight,
  Film,
  FileAudio,
  FileImage,
  Heading2,
} from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/cn'
import { getAccessToken } from '@/lib/supabase/client'
import { apiPost } from '@/lib/api'

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_BLOCKS = 10

// ─── Types ────────────────────────────────────────────────────────────────────

interface MediaTabProps {
  cardId: string
  mediaBlocks: MediaBlockData[]
  onChange: (blocks: MediaBlockData[]) => void
}

type AddMode = 'url' | 'upload' | 'heading'

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  if (
    lower.includes('youtube.com') ||
    lower.includes('youtu.be') ||
    lower.includes('vimeo.com') ||
    lower.endsWith('.mp4') ||
    lower.endsWith('.webm')
  )
    return MediaBlockType.VIDEO
  if (
    lower.includes('open.spotify.com') ||
    lower.includes('soundcloud.com') ||
    lower.endsWith('.mp3') ||
    lower.endsWith('.wav') ||
    lower.endsWith('.ogg') ||
    lower.endsWith('.m4a')
  )
    return MediaBlockType.AUDIO
  if (
    lower.endsWith('.pdf') ||
    lower.includes('docs.google.com') ||
    lower.includes('docsend.com') ||
    lower.includes('slideshare.net') ||
    lower.includes('scribd.com')
  )
    return MediaBlockType.DOCUMENT
  return MediaBlockType.IMAGE
}

function youtubeId(url: string): string | null {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1)
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v')
  } catch {
    /* ignore */
  }
  return null
}

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPE_META: Record<
  MediaBlockType,
  {
    label: string
    desc: string
    accent: string
    accentBg: string
    accentText: string
    Icon: React.FC<{ className?: string }>
    PreviewIcon: React.FC<{ className?: string }>
    gradient: string
  }
> = {
  [MediaBlockType.IMAGE]: {
    label: 'Image',
    desc: 'Photo or graphic',
    accent: '#3b82f6',
    accentBg: 'bg-blue-50',
    accentText: 'text-blue-600',
    Icon: ({ className }) => <ImageIcon className={className} />,
    PreviewIcon: ({ className }) => <FileImage className={className} />,
    gradient: 'from-blue-500/10 to-blue-600/5',
  },
  [MediaBlockType.VIDEO]: {
    label: 'Video',
    desc: 'YouTube, Vimeo or direct',
    accent: '#8b5cf6',
    accentBg: 'bg-purple-50',
    accentText: 'text-purple-600',
    Icon: ({ className }) => <PlayCircle className={className} />,
    PreviewIcon: ({ className }) => <Film className={className} />,
    gradient: 'from-purple-500/10 to-purple-600/5',
  },
  [MediaBlockType.AUDIO]: {
    label: 'Audio',
    desc: 'Spotify, SoundCloud or MP3',
    accent: '#10b981',
    accentBg: 'bg-emerald-50',
    accentText: 'text-emerald-600',
    Icon: ({ className }) => <Music2 className={className} />,
    PreviewIcon: ({ className }) => <FileAudio className={className} />,
    gradient: 'from-emerald-500/10 to-emerald-600/5',
  },
  [MediaBlockType.DOCUMENT]: {
    label: 'Document',
    desc: 'PDF, Google Docs, SlideShare',
    accent: '#f59e0b',
    accentBg: 'bg-amber-50',
    accentText: 'text-amber-600',
    Icon: ({ className }) => <FileText className={className} />,
    PreviewIcon: ({ className }) => <FileText className={className} />,
    gradient: 'from-amber-500/10 to-amber-600/5',
  },
  [MediaBlockType.HEADING]: {
    label: 'Heading',
    desc: 'Section title or label',
    accent: '#6366f1',
    accentBg: 'bg-indigo-50',
    accentText: 'text-indigo-600',
    Icon: ({ className }) => <Heading2 className={className} />,
    PreviewIcon: ({ className }) => <Heading2 className={className} />,
    gradient: 'from-indigo-500/10 to-indigo-600/5',
  },
}

// ─── Type pill badge ──────────────────────────────────────────────────────────

function TypePill({ type }: { type: MediaBlockType }) {
  const m = TYPE_META[type]
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        m.accentBg,
        m.accentText,
      )}
    >
      <m.Icon className="h-2.5 w-2.5" />
      {m.label}
    </span>
  )
}

// ─── Detected-type hint banner ────────────────────────────────────────────────

function DetectedTypeBanner({ type }: { type: MediaBlockType }) {
  const m = TYPE_META[type]
  return (
    <div className={cn('flex items-center gap-2 rounded-xl px-3 py-2', m.accentBg)}>
      <m.Icon className={cn('h-3.5 w-3.5 shrink-0', m.accentText)} />
      <p className={cn('text-xs font-semibold', m.accentText)}>
        Detected as <span className="font-bold">{m.label}</span> — {m.desc}
      </p>
    </div>
  )
}

// ─── Block preview ────────────────────────────────────────────────────────────

function BlockThumb({ block }: { block: MediaBlockData }) {
  const m = TYPE_META[block.type]
  const ytId = block.type === MediaBlockType.VIDEO ? youtubeId(block.url ?? '') : null

  if (block.type === MediaBlockType.IMAGE && block.url) {
    return (
      <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
        <Image
          src={block.url}
          alt={block.altText ?? block.caption ?? ''}
          fill
          unoptimized
          className="object-cover"
          onError={(e) => {
            ;(e.target as HTMLImageElement).style.opacity = '0'
          }}
        />
      </div>
    )
  }

  if (block.type === MediaBlockType.VIDEO && ytId) {
    return (
      <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-900 shrink-0">
        <Image
          src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
          alt={block.caption ?? 'video'}
          fill
          unoptimized
          className="object-cover opacity-80"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
            <PlayCircle className="h-4 w-4 text-white" />
          </div>
        </div>
      </div>
    )
  }

  if (block.type === MediaBlockType.HEADING) {
    return (
      <div className="w-16 h-16 rounded-xl shrink-0 flex items-center justify-center bg-indigo-50 border border-indigo-100">
        <Heading2 className="h-7 w-7 text-indigo-400" />
      </div>
    )
  }

  return (
    <div
      className={cn('w-16 h-16 rounded-xl shrink-0 flex items-center justify-center', m.accentBg)}
    >
      <m.PreviewIcon className={cn('h-7 w-7', m.accentText)} />
    </div>
  )
}

// ─── Inline editable block card ───────────────────────────────────────────────

interface BlockCardProps {
  block: MediaBlockData
  index: number
  total: number
  dragOver: boolean
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragEnd: () => void
  onRemove: () => void
  onUpdate: (field: keyof MediaBlockData, value: string) => void
}

function BlockCard({
  block,
  dragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onRemove,
  onUpdate,
}: BlockCardProps) {
  const [expanded, setExpanded] = useState(false)
  const m = TYPE_META[block.type]

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        'group rounded-2xl border bg-white transition-all duration-200',
        dragOver
          ? 'border-brand-400 ring-2 ring-brand-500/20 shadow-lg shadow-brand-500/10 scale-[1.01]'
          : 'border-gray-100 hover:border-gray-200 hover:shadow-sm',
      )}
    >
      {/* ── Main row ── */}
      <div className="flex items-center gap-3 p-3">
        {/* Drag handle */}
        <button
          type="button"
          className="shrink-0 cursor-grab active:cursor-grabbing text-gray-200 hover:text-gray-400 transition-colors touch-none"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Thumbnail */}
        <BlockThumb block={block} />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <TypePill type={block.type} />
            {block.linkUrl && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400 font-medium">
                <ExternalLink className="h-2.5 w-2.5" />
                linked
              </span>
            )}
          </div>
          {block.type === MediaBlockType.HEADING ? (
            <p className="text-xs font-semibold text-gray-700 truncate leading-tight">
              {block.caption || <span className="text-gray-300 italic">Untitled heading</span>}
            </p>
          ) : (
            <>
              <p className="text-xs text-gray-500 truncate leading-tight">
                {block.caption || block.url}
              </p>
              {block.caption && (
                <p className="text-[10px] text-gray-300 truncate leading-tight mt-0.5">
                  {block.url}
                </p>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          {block.linkUrl && (
            <a
              href={block.linkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-1.5 text-gray-300 hover:bg-gray-100 hover:text-gray-500 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={cn(
              'rounded-lg p-1.5 transition-colors',
              expanded
                ? 'bg-brand-50 text-brand-500'
                : 'text-gray-300 hover:bg-gray-100 hover:text-gray-500',
            )}
            title="Edit details"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
            title="Remove"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Expanded edit panel ── */}
      {expanded && (
        <div
          className={cn(
            'border-t border-gray-50 p-3 space-y-2.5 bg-gradient-to-b',
            `${m.gradient} from-gray-50/80`,
          )}
        >
          {block.type === MediaBlockType.HEADING ? (
            /* Heading: only the text matters */
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Heading Text
              </label>
              <input
                type="text"
                value={block.caption ?? ''}
                onChange={(e) => onUpdate('caption', e.target.value)}
                placeholder="e.g. Portfolio, Previous Works…"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 placeholder:text-gray-300 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 transition-all"
              />
            </div>
          ) : (
            <>
              {/* Media URL */}
              <div className="group/field">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Media URL
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                  <Link2 className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                  <input
                    type="url"
                    value={block.url ?? ''}
                    onChange={(e) => onUpdate('url', e.target.value)}
                    placeholder="https://…"
                    className="flex-1 bg-transparent text-xs text-gray-800 placeholder:text-gray-300 outline-none"
                  />
                  {block.url && isValidUrl(block.url) && (
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  )}
                </div>
              </div>

              {/* Caption */}
              <div className="group/field">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Caption
                </label>
                <input
                  type="text"
                  value={block.caption ?? ''}
                  onChange={(e) => onUpdate('caption', e.target.value)}
                  placeholder="Add a caption…"
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 placeholder:text-gray-300 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 transition-all"
                />
              </div>

              {/* Alt text — images only */}
              {block.type === MediaBlockType.IMAGE && (
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Alt Text
                    <span className="ml-1 normal-case font-normal tracking-normal text-gray-300">
                      (accessibility & SEO)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={block.altText ?? ''}
                    onChange={(e) => onUpdate('altText', e.target.value)}
                    placeholder="Describe the image…"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 placeholder:text-gray-300 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 transition-all"
                  />
                </div>
              )}

              {/* Link URL */}
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Click Destination
                  <span className="ml-1 normal-case font-normal tracking-normal text-gray-300">
                    (optional)
                  </span>
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                  <input
                    type="url"
                    value={block.linkUrl ?? ''}
                    onChange={(e) => onUpdate('linkUrl', e.target.value)}
                    placeholder="https://example.com"
                    className="flex-1 bg-transparent text-xs text-gray-800 placeholder:text-gray-300 outline-none"
                  />
                  {block.linkUrl && isValidUrl(block.linkUrl) && (
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Add-media sheet ──────────────────────────────────────────────────────────

interface AddSheetProps {
  cardId: string
  blockCount: number
  onAdd: (block: MediaBlockData) => void
  onClose: () => void
}

function AddSheet({ cardId, blockCount, onAdd, onClose }: AddSheetProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<AddMode>('url')
  const [url, setUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [altText, setAltText] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [headingText, setHeadingText] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const idCounterRef = useRef(Date.now())

  const detectedType = url ? guessType(url) : null
  const canAdd = mode === 'heading' ? headingText.trim().length > 0 : url.trim().length > 0

  const commit = useCallback(() => {
    if (mode === 'heading') {
      if (!headingText.trim()) return
      const block: MediaBlockData = {
        id: `new-${idCounterRef.current++}`,
        type: MediaBlockType.HEADING,
        url: '',
        caption: headingText.trim(),
        displayOrder: blockCount,
      }
      onAdd(block)
      return
    }
    if (!url.trim()) return
    if (!isValidUrl(url)) {
      setUrlError('Enter a valid URL (https://…)')
      return
    }
    if (linkUrl && !isValidUrl(linkUrl)) {
      setLinkError('Enter a valid URL (https://…)')
      return
    }
    const block: MediaBlockData = {
      id: `new-${idCounterRef.current++}`,
      type: guessType(url),
      url,
      caption: caption.trim() || undefined,
      altText: altText.trim() || undefined,
      linkUrl: linkUrl.trim() || undefined,
      displayOrder: blockCount,
    }
    onAdd(block)
  }, [mode, headingText, url, caption, altText, linkUrl, blockCount, onAdd])

  const processFile = useCallback(
    async (file: File) => {
      let blockType: MediaBlockData['type'] = MediaBlockType.IMAGE
      if (file.type.startsWith('video/')) blockType = MediaBlockType.VIDEO
      else if (file.type.startsWith('audio/')) blockType = MediaBlockType.AUDIO
      else if (file.type === 'application/pdf') blockType = MediaBlockType.DOCUMENT

      const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
      const isImage = ALLOWED_IMAGE.includes(file.type)

      setUploading(true)
      setUploadError(null)

      try {
        let publicUrl = ''
        if (isImage) {
          const token = await getAccessToken()
          const safe = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
          const { uploadUrl, publicUrl: pub } = await apiPost<{
            uploadUrl: string
            publicUrl: string
          }>(`/cards/${cardId}/upload-url`, { filename: safe, contentType: file.type }, token)
          const res = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
          })
          if (!res.ok) throw new Error('Upload failed — please try again')
          publicUrl = pub
        } else {
          publicUrl = URL.createObjectURL(file)
        }

        const block: MediaBlockData = {
          id: `new-${idCounterRef.current++}`,
          type: blockType,
          url: publicUrl,
          caption: file.name.replace(/\.[^.]+$/, ''),
          altText: file.name,
          displayOrder: blockCount,
        }
        onAdd(block)
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed')
      } finally {
        setUploading(false)
      }
    },
    [cardId, blockCount, onAdd],
  )

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) await processFile(file)
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [processFile],
  )

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      const file = e.dataTransfer.files?.[0]
      if (file) await processFile(file)
    },
    [processFile],
  )

  return (
    <div className="rounded-2xl border border-brand-100 bg-white shadow-sm overflow-hidden">
      {/* Sheet header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
        <div>
          <p className="text-xs font-bold text-gray-800 uppercase tracking-widest">Add Media</p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {blockCount}/{MAX_BLOCKS} blocks used
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Mode tabs */}
      <div className="flex border-b border-gray-50 bg-gray-50/50">
        {(['url', 'heading', 'upload'] as AddMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all',
              mode === m
                ? 'bg-white text-brand-600 border-b-2 border-brand-500 shadow-sm'
                : 'text-gray-400 hover:text-gray-600',
            )}
          >
            {m === 'url' ? (
              <>
                <Link2 className="h-3.5 w-3.5" />
                Paste URL
              </>
            ) : m === 'heading' ? (
              <>
                <Heading2 className="h-3.5 w-3.5" />
                Heading
              </>
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                Upload
              </>
            )}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {mode === 'heading' ? (
          <>
            {/* Heading text input */}
            <div className="flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50/50 px-3.5 py-3 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
              <Heading2 className="h-4 w-4 shrink-0 text-indigo-400" />
              <input
                type="text"
                value={headingText}
                onChange={(e) => setHeadingText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && commit()}
                placeholder="e.g. Portfolio, Previous Works, Gallery…"
                autoFocus
                className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
              />
            </div>
            <p className="px-1 text-[11px] text-gray-400">
              Headings appear as bold section labels above your media blocks.
            </p>
            <button
              type="button"
              onClick={commit}
              disabled={!canAdd}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-500/25 hover:bg-indigo-600 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Plus className="h-4 w-4" />
              Add Heading
            </button>
          </>
        ) : mode === 'url' ? (
          <>
            {/* URL input */}
            <div>
              <div
                className={cn(
                  'flex items-center gap-2.5 rounded-2xl border bg-gray-50 px-3.5 py-3',
                  'transition-all focus-within:bg-white focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/20',
                  urlError ? 'border-red-300 bg-red-50/30' : 'border-gray-200',
                )}
              >
                <Link2 className="h-4 w-4 shrink-0 text-gray-400" />
                <input
                  type="url"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value)
                    setUrlError(null)
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && commit()}
                  placeholder="YouTube, Spotify, image URL, PDF…"
                  autoFocus
                  className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
                />
                {url && isValidUrl(url) && <Check className="h-4 w-4 text-emerald-500 shrink-0" />}
              </div>
              {urlError ? (
                <p className="mt-1.5 flex items-center gap-1 px-1 text-xs text-red-500">
                  <AlertCircle className="h-3 w-3" />
                  {urlError}
                </p>
              ) : (
                <p className="mt-1.5 px-1 text-[11px] text-gray-400">
                  Supports YouTube · Vimeo · Spotify · SoundCloud · PDFs · any image URL
                </p>
              )}
            </div>

            {/* Detected type */}
            {detectedType && <DetectedTypeBanner type={detectedType} />}

            {/* Caption */}
            <div
              className={cn(
                'flex items-center gap-2.5 rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-3',
                'transition-all focus-within:bg-white focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/20',
              )}
            >
              <ImageIcon className="h-4 w-4 shrink-0 text-gray-400" />
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Caption (optional)"
                className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
              />
            </div>

            {/* Advanced: alt text + link url */}
            {detectedType === MediaBlockType.IMAGE && (
              <div
                className={cn(
                  'flex items-center gap-2.5 rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-3',
                  'transition-all focus-within:bg-white focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/20',
                )}
              >
                <FileImage className="h-4 w-4 shrink-0 text-gray-400" />
                <input
                  type="text"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Alt text (accessibility & SEO)"
                  className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
                />
              </div>
            )}

            <div>
              <div
                className={cn(
                  'flex items-center gap-2.5 rounded-2xl border bg-gray-50 px-3.5 py-3',
                  'transition-all focus-within:bg-white focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/20',
                  linkError ? 'border-red-300 bg-red-50/30' : 'border-gray-200',
                )}
              >
                <ExternalLink className="h-4 w-4 shrink-0 text-gray-400" />
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => {
                    setLinkUrl(e.target.value)
                    setLinkError(null)
                  }}
                  placeholder="Click destination URL (optional)"
                  className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
                />
                {linkUrl && isValidUrl(linkUrl) && (
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                )}
              </div>
              {linkError && (
                <p className="mt-1 flex items-center gap-1 px-1 text-xs text-red-500">
                  <AlertCircle className="h-3 w-3" />
                  {linkError}
                </p>
              )}
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={commit}
              disabled={!canAdd}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-500/25 hover:bg-brand-600 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Plus className="h-4 w-4" />
              Add to Card
            </button>
          </>
        ) : (
          /* Upload mode */
          <>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,audio/mpeg,audio/wav,audio/ogg,audio/m4a,application/pdf"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => !uploading && fileInputRef.current?.click()}
              onDragEnter={(e) => {
                e.preventDefault()
                setDragActive(true)
              }}
              onDragLeave={() => setDragActive(false)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              disabled={uploading}
              className={cn(
                'w-full flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed py-10 transition-all',
                uploading
                  ? 'border-brand-300 bg-brand-50/50 cursor-not-allowed'
                  : dragActive
                    ? 'border-brand-400 bg-brand-50 scale-[1.01]'
                    : 'border-gray-200 bg-gray-50 hover:border-brand-300 hover:bg-brand-50/40 cursor-pointer active:scale-[0.99]',
              )}
            >
              {uploading ? (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50">
                    <Loader2 className="h-7 w-7 text-brand-500 animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-brand-600">Uploading…</p>
                    <p className="text-xs text-brand-400 mt-1">Please wait</p>
                  </div>
                </>
              ) : (
                <>
                  <div
                    className={cn(
                      'flex h-14 w-14 items-center justify-center rounded-2xl transition-colors',
                      dragActive ? 'bg-brand-100' : 'bg-gray-100',
                    )}
                  >
                    <Upload
                      className={cn(
                        'h-7 w-7 transition-colors',
                        dragActive ? 'text-brand-500' : 'text-gray-400',
                      )}
                    />
                  </div>
                  <div className="text-center">
                    <p
                      className={cn(
                        'text-sm font-semibold transition-colors',
                        dragActive ? 'text-brand-600' : 'text-gray-700',
                      )}
                    >
                      {dragActive ? 'Drop to upload' : 'Drop a file or click to browse'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      JPG · PNG · WebP · GIF · PDF · MP3 · MP4
                    </p>
                  </div>
                </>
              )}
            </button>
            {uploadError && (
              <p className="flex items-center gap-1.5 text-xs text-red-500 px-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {uploadError}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Quick-add type picker ─────────────────────────────────────────────────────

const QUICK_TYPES: { label: string; hint: string; icon: React.FC<{ className?: string }> }[] = [
  {
    label: 'Image',
    hint: 'Photo or graphic',
    icon: ({ className }) => <ImageIcon className={className} />,
  },
  {
    label: 'Video',
    hint: 'YouTube · Vimeo',
    icon: ({ className }) => <PlayCircle className={className} />,
  },
  {
    label: 'Audio',
    hint: 'Spotify · MP3',
    icon: ({ className }) => <Music2 className={className} />,
  },
  {
    label: 'Document',
    hint: 'PDF · Slides',
    icon: ({ className }) => <FileText className={className} />,
  },
]

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-gradient-to-b from-gray-50 to-white overflow-hidden">
      {/* Icon header */}
      <div className="flex flex-col items-center gap-3 py-8 px-6 text-center">
        <div className="flex -space-x-2">
          {([ImageIcon, PlayCircle, Music2, FileText] as React.FC<{ className?: string }>[]).map(
            (Icon, i) => (
              <div
                key={i}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-gray-100 shadow-sm"
                style={{ zIndex: 4 - i }}
              >
                <Icon className="h-4 w-4 text-gray-400" />
              </div>
            ),
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-700">No media yet</p>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">
            Showcase your work with images, videos,
            <br />
            audio tracks and documents.
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-500/25 hover:bg-brand-600 active:scale-95 transition-all"
        >
          <Plus className="h-4 w-4" />
          Add first block
        </button>
      </div>

      {/* Type grid hint */}
      <div className="grid grid-cols-4 border-t border-gray-100">
        {QUICK_TYPES.map((t) => (
          <div key={t.label} className="flex flex-col items-center gap-1 py-3 px-2">
            <t.icon className="h-4 w-4 text-gray-300" />
            <p className="text-[9px] font-bold text-gray-300 uppercase tracking-wide">{t.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function MediaTab({ cardId, mediaBlocks, onChange }: MediaTabProps): JSX.Element {
  const [showAdd, setShowAdd] = useState(mediaBlocks.length === 0)
  const dragIndexRef = useRef<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)

  const sorted = [...mediaBlocks].sort((a, b) => a.displayOrder - b.displayOrder)
  const atLimit = mediaBlocks.length >= MAX_BLOCKS

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAdd = useCallback(
    (block: MediaBlockData) => {
      onChange([...mediaBlocks, block])
      setShowAdd(false)
    },
    [mediaBlocks, onChange],
  )

  const handleRemove = useCallback(
    (id: string) => {
      onChange(mediaBlocks.filter((b) => b.id !== id).map((b, i) => ({ ...b, displayOrder: i })))
    },
    [mediaBlocks, onChange],
  )

  const handleUpdate = useCallback(
    (id: string, field: keyof MediaBlockData, value: string) => {
      onChange(mediaBlocks.map((b) => (b.id === id ? { ...b, [field]: value || undefined } : b)))
    },
    [mediaBlocks, onChange],
  )

  const handleDragStart = (index: number) => {
    dragIndexRef.current = index
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOver(index)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    const dragIndex = dragIndexRef.current
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragOver(null)
      return
    }
    const copy = [...sorted]
    const [moved] = copy.splice(dragIndex, 1)
    if (!moved) return
    copy.splice(dropIndex, 0, moved)
    onChange(copy.map((b, i) => ({ ...b, displayOrder: i })))
    dragIndexRef.current = null
    setDragOver(null)
  }

  const handleDragEnd = () => {
    dragIndexRef.current = null
    setDragOver(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* ── Section header (when blocks exist) ── */}
      {sorted.length > 0 && (
        <div className="flex items-center gap-3">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
            Media
          </p>
          <div className="h-px flex-1 bg-gray-100" />
          <span className="text-[10px] font-semibold text-gray-300">
            {sorted.length}/{MAX_BLOCKS}
          </span>
        </div>
      )}

      {/* ── Block list ── */}
      {sorted.length > 0 && (
        <div className="space-y-2">
          {sorted.map((block, index) => (
            <BlockCard
              key={block.id}
              block={block}
              index={index}
              total={sorted.length}
              dragOver={dragOver === index}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onRemove={() => handleRemove(block.id)}
              onUpdate={(field, value) => handleUpdate(block.id, field, value)}
            />
          ))}
        </div>
      )}

      {/* ── Drag hint ── */}
      {sorted.length > 1 && !showAdd && (
        <p className="flex items-center justify-center gap-1.5 text-[10px] text-gray-300">
          <GripVertical className="h-3 w-3" />
          Drag blocks to reorder
        </p>
      )}

      {/* ── Empty state ── */}
      {mediaBlocks.length === 0 && !showAdd && <EmptyState onAdd={() => setShowAdd(true)} />}

      {/* ── Add sheet ── */}
      {showAdd && !atLimit ? (
        <AddSheet
          cardId={cardId}
          blockCount={mediaBlocks.length}
          onAdd={handleAdd}
          onClose={() => setShowAdd(false)}
        />
      ) : showAdd && atLimit ? null : null}

      {/* ── Add button (when blocks exist and sheet is closed) ── */}
      {!showAdd &&
        sorted.length > 0 &&
        (atLimit ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-3 text-xs text-gray-400">
            <AlertCircle className="h-3.5 w-3.5" />
            Maximum {MAX_BLOCKS} blocks reached
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="group flex w-full items-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-3 transition-all hover:border-brand-300 hover:bg-brand-50/40 active:scale-[0.99]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-100 group-hover:bg-brand-100 transition-colors">
              <Plus className="h-4 w-4 text-gray-400 group-hover:text-brand-500 transition-colors" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-gray-600 group-hover:text-brand-600 transition-colors">
                Add media block
              </p>
              <p className="text-xs text-gray-400">Image, video, audio or document</p>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-brand-400 transition-colors" />
          </button>
        ))}
    </div>
  )
}
