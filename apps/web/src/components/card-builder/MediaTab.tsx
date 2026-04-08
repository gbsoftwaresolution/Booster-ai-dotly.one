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
  FolderOpen,
  Pencil,
  ChevronDown,
  Download,
} from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/cn'
import { getAccessToken } from '@/lib/supabase/client'
import { apiPost } from '@/lib/api'

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_MEDIA = 10
const MAX_DOCS = 10
const DEFAULT_GROUP_ID = '__default__'
const DEFAULT_GROUP_NAME = 'General'
const DOCS_GROUP_ID = '__docs__'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MediaTabProps {
  cardId: string
  mediaBlocks: MediaBlockData[]
  onChange: (blocks: MediaBlockData[]) => void
}

type AddMode = 'url' | 'upload'

interface Group {
  id: string
  name: string
  blocks: MediaBlockData[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function guessMediaType(url: string): MediaBlockData['type'] {
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
  return MediaBlockType.IMAGE
}

function guessDocType(url: string): boolean {
  const lower = url.toLowerCase()
  return (
    lower.endsWith('.pdf') ||
    lower.endsWith('.doc') ||
    lower.endsWith('.docx') ||
    lower.endsWith('.xls') ||
    lower.endsWith('.xlsx') ||
    lower.endsWith('.ppt') ||
    lower.endsWith('.pptx') ||
    lower.endsWith('.csv') ||
    lower.endsWith('.zip') ||
    lower.endsWith('.txt') ||
    lower.includes('docs.google.com') ||
    lower.includes('docsend.com') ||
    lower.includes('slideshare.net') ||
    lower.includes('scribd.com')
  )
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Split blocks into media groups and document group */
function splitBlocks(blocks: MediaBlockData[]): {
  mediaGroups: Group[]
  docBlocks: MediaBlockData[]
} {
  const docBlocks: MediaBlockData[] = []
  const groupMap = new Map<string, Group>()
  const groupOrder: string[] = []

  for (const b of [...blocks].sort((a, c) => a.displayOrder - c.displayOrder)) {
    if (b.type === MediaBlockType.DOCUMENT) {
      docBlocks.push(b)
      continue
    }
    const gid = b.groupId ?? DEFAULT_GROUP_ID
    const gname = b.groupName ?? DEFAULT_GROUP_NAME
    if (!groupMap.has(gid)) {
      groupMap.set(gid, { id: gid, name: gname, blocks: [] })
      groupOrder.push(gid)
    }
    groupMap.get(gid)!.blocks.push(b)
  }

  return {
    mediaGroups: groupOrder.map((gid) => groupMap.get(gid)!),
    docBlocks,
  }
}

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPE_META: Record<
  Exclude<MediaBlockType, 'HEADING'>,
  {
    label: string
    accent: string
    accentBg: string
    accentText: string
    Icon: React.FC<{ className?: string }>
    PreviewIcon: React.FC<{ className?: string }>
  }
> = {
  [MediaBlockType.IMAGE]: {
    label: 'Image',
    accent: '#3b82f6',
    accentBg: 'bg-blue-50',
    accentText: 'text-blue-600',
    Icon: ({ className }) => <ImageIcon className={className} />,
    PreviewIcon: ({ className }) => <FileImage className={className} />,
  },
  [MediaBlockType.VIDEO]: {
    label: 'Video',
    accent: '#8b5cf6',
    accentBg: 'bg-purple-50',
    accentText: 'text-purple-600',
    Icon: ({ className }) => <PlayCircle className={className} />,
    PreviewIcon: ({ className }) => <Film className={className} />,
  },
  [MediaBlockType.AUDIO]: {
    label: 'Audio',
    accent: '#10b981',
    accentBg: 'bg-emerald-50',
    accentText: 'text-emerald-600',
    Icon: ({ className }) => <Music2 className={className} />,
    PreviewIcon: ({ className }) => <FileAudio className={className} />,
  },
  [MediaBlockType.DOCUMENT]: {
    label: 'Document',
    accent: '#f59e0b',
    accentBg: 'bg-amber-50',
    accentText: 'text-amber-600',
    Icon: ({ className }) => <FileText className={className} />,
    PreviewIcon: ({ className }) => <FileText className={className} />,
  },
}

// ─── Type pill badge ──────────────────────────────────────────────────────────

function TypePill({ type }: { type: Exclude<MediaBlockType, 'HEADING'> }) {
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

// ─── Block thumbnail ──────────────────────────────────────────────────────────

function BlockThumb({ block }: { block: MediaBlockData }) {
  const type = block.type as Exclude<MediaBlockType, 'HEADING'>
  const m = TYPE_META[type]
  const ytId = block.type === MediaBlockType.VIDEO ? youtubeId(block.url ?? '') : null

  if (block.type === MediaBlockType.IMAGE && block.url) {
    return (
      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
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
      <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-900 shrink-0">
        <Image
          src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`}
          alt={block.caption ?? 'video'}
          fill
          unoptimized
          className="object-cover opacity-80"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
            <PlayCircle className="h-3.5 w-3.5 text-white" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'w-14 h-14 rounded-xl shrink-0 flex items-center justify-center',
        m?.accentBg ?? 'bg-gray-100',
      )}
    >
      {m ? (
        <m.PreviewIcon className={cn('h-6 w-6', m.accentText)} />
      ) : (
        <FileText className="h-6 w-6 text-gray-400" />
      )}
    </div>
  )
}

// ─── Block card (inline editable) ─────────────────────────────────────────────

interface BlockCardProps {
  block: MediaBlockData
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
  const type = block.type as Exclude<MediaBlockType, 'HEADING'>
  const m = TYPE_META[type]

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        'group rounded-xl border bg-white transition-all duration-150',
        dragOver
          ? 'border-brand-400 ring-2 ring-brand-500/20 shadow-md scale-[1.01]'
          : 'border-gray-100 hover:border-gray-200 hover:shadow-sm',
      )}
    >
      <div className="flex items-center gap-2.5 p-2.5">
        <button
          type="button"
          className="shrink-0 cursor-grab active:cursor-grabbing text-gray-200 hover:text-gray-400 transition-colors touch-none"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <BlockThumb block={block} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">{m && <TypePill type={type} />}</div>
          <p className="text-xs text-gray-600 truncate leading-tight font-medium">
            {block.caption || block.url}
          </p>
          {block.caption && block.url && (
            <p className="text-[10px] text-gray-300 truncate leading-tight mt-0.5">{block.url}</p>
          )}
          {block.fileSize && (
            <p className="text-[10px] text-gray-400 mt-0.5">{formatFileSize(block.fileSize)}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
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

      {expanded && (
        <div className="border-t border-gray-50 p-3 space-y-2.5 bg-gray-50/60">
          {/* Media URL */}
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
              URL
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
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Caption / Title
            </label>
            <input
              type="text"
              value={block.caption ?? ''}
              onChange={(e) => onUpdate('caption', e.target.value)}
              placeholder="Add a caption…"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-gray-800 placeholder:text-gray-300 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 transition-all"
            />
          </div>

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
        </div>
      )}
    </div>
  )
}

// ─── Add-media sheet ──────────────────────────────────────────────────────────

interface AddSheetProps {
  cardId: string
  groupId: string
  groupName: string
  isDoc: boolean
  blockCount: number
  maxBlocks: number
  onAdd: (block: MediaBlockData) => void
  onClose: () => void
}

function AddSheet({
  cardId,
  groupId,
  groupName,
  isDoc,
  blockCount,
  maxBlocks,
  onAdd,
  onClose,
}: AddSheetProps): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [mode, setMode] = useState<AddMode>('url')
  const [url, setUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [altText, setAltText] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [linkError, setLinkError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const idCounterRef = useRef(Date.now())

  const detectedType = url ? (isDoc ? MediaBlockType.DOCUMENT : guessMediaType(url)) : null

  const canAdd = url.trim().length > 0

  const commit = useCallback(() => {
    if (!url.trim()) return
    if (!isValidUrl(url)) {
      setUrlError('Enter a valid URL (https://…)')
      return
    }
    if (linkUrl && !isValidUrl(linkUrl)) {
      setLinkError('Enter a valid URL (https://…)')
      return
    }
    const type = isDoc
      ? MediaBlockType.DOCUMENT
      : guessDocType(url)
        ? MediaBlockType.DOCUMENT
        : guessMediaType(url)
    const block: MediaBlockData = {
      id: `new-${idCounterRef.current++}`,
      type,
      url,
      caption: caption.trim() || undefined,
      altText: altText.trim() || undefined,
      linkUrl: linkUrl.trim() || undefined,
      displayOrder: blockCount,
      groupId: isDoc ? DOCS_GROUP_ID : groupId,
      groupName: isDoc ? 'Downloads' : groupName,
    }
    onAdd(block)
  }, [isDoc, url, caption, altText, linkUrl, blockCount, groupId, groupName, onAdd])

  const processFile = useCallback(
    async (file: File) => {
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      const isAudio = file.type.startsWith('audio/')
      const isPdf = file.type === 'application/pdf'
      const isOtherDoc =
        file.type.includes('word') ||
        file.type.includes('excel') ||
        file.type.includes('spreadsheet') ||
        file.type.includes('presentation') ||
        file.type.includes('powerpoint') ||
        file.type === 'text/csv' ||
        file.type === 'text/plain' ||
        file.type === 'application/zip'

      let blockType: MediaBlockData['type'] = MediaBlockType.IMAGE
      if (isVideo) blockType = MediaBlockType.VIDEO
      else if (isAudio) blockType = MediaBlockType.AUDIO
      else if (isPdf || isOtherDoc || isDoc) blockType = MediaBlockType.DOCUMENT

      const shouldConvert = isImage && file.type !== 'image/gif' && !isDoc

      setUploading(true)
      setUploadError(null)

      try {
        let publicUrl = ''
        if (isImage) {
          const token = await getAccessToken()

          let uploadBlob: Blob = file
          let uploadMime = file.type
          let uploadFilename = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')

          if (shouldConvert) {
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () => resolve(reader.result as string)
              reader.onerror = reject
              reader.readAsDataURL(file)
            })
            const webpBlob = await new Promise<Blob>((resolve, reject) => {
              const img = new window.Image()
              img.onload = () => {
                const canvas = document.createElement('canvas')
                canvas.width = img.naturalWidth
                canvas.height = img.naturalHeight
                const ctx = canvas.getContext('2d')
                if (!ctx) {
                  reject(new Error('Canvas not supported'))
                  return
                }
                ctx.drawImage(img, 0, 0)
                canvas.toBlob(
                  (blob) => {
                    if (!blob) {
                      reject(new Error('Conversion failed'))
                      return
                    }
                    resolve(blob)
                  },
                  'image/webp',
                  0.92,
                )
              }
              img.onerror = reject
              img.src = dataUrl
            })
            uploadBlob = webpBlob
            uploadMime = 'image/webp'
            uploadFilename = uploadFilename.replace(/\.[^.]+$/, '') + '.webp'
          }

          const { uploadUrl, publicUrl: pub } = await apiPost<{
            uploadUrl: string
            publicUrl: string
          }>(
            `/cards/${cardId}/upload-url`,
            { filename: uploadFilename, contentType: uploadMime },
            token,
          )
          const res = await fetch(uploadUrl, {
            method: 'PUT',
            body: uploadBlob,
            headers: { 'Content-Type': uploadMime },
          })
          if (!res.ok) throw new Error('Upload failed — please try again')
          publicUrl = pub
        } else if (isPdf || isOtherDoc) {
          const token = await getAccessToken()
          const uploadFilename = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
          const { uploadUrl, publicUrl: pub } = await apiPost<{
            uploadUrl: string
            publicUrl: string
          }>(
            `/cards/${cardId}/upload-url`,
            { filename: uploadFilename, contentType: file.type },
            token,
          )
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
          altText: isImage ? file.name : undefined,
          displayOrder: blockCount,
          mimeType: file.type || undefined,
          fileSize: file.size || undefined,
          groupId: blockType === MediaBlockType.DOCUMENT ? DOCS_GROUP_ID : groupId,
          groupName: blockType === MediaBlockType.DOCUMENT ? 'Downloads' : groupName,
        }
        onAdd(block)
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Upload failed')
      } finally {
        setUploading(false)
      }
    },
    [cardId, blockCount, groupId, groupName, isDoc, onAdd],
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

  const acceptAttr = isDoc
    ? 'application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip'
    : 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,audio/mpeg,audio/wav,audio/ogg,audio/m4a,application/pdf'

  return (
    <div className="rounded-2xl border border-brand-100 bg-white shadow-sm overflow-hidden">
      {/* Sheet header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
        <div>
          <p className="text-xs font-bold text-gray-800 uppercase tracking-widest">
            {isDoc ? 'Add Document' : `Add to "${groupName}"`}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {blockCount}/{maxBlocks} used
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
        {(['url', 'upload'] as AddMode[]).map((m) => (
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
            ) : (
              <>
                <Upload className="h-3.5 w-3.5" />
                Upload File
              </>
            )}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {mode === 'url' ? (
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
                  placeholder={
                    isDoc ? 'PDF, Google Docs, SlideShare…' : 'YouTube, Spotify, image URL…'
                  }
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
                  {isDoc
                    ? 'Supports PDF · Google Docs · SlideShare · DocSend'
                    : 'Supports YouTube · Vimeo · Spotify · SoundCloud · any image URL'}
                </p>
              )}
            </div>

            {/* Detected type badge */}
            {detectedType && !isDoc && (
              <div
                className={cn(
                  'flex items-center gap-2 rounded-xl px-3 py-2',
                  TYPE_META[detectedType as Exclude<MediaBlockType, 'HEADING'>]?.accentBg ??
                    'bg-gray-50',
                )}
              >
                {(() => {
                  const m = TYPE_META[detectedType as Exclude<MediaBlockType, 'HEADING'>]
                  if (!m) return null
                  return (
                    <>
                      <m.Icon className={cn('h-3.5 w-3.5 shrink-0', m.accentText)} />
                      <p className={cn('text-xs font-semibold', m.accentText)}>
                        Detected as <span className="font-bold">{m.label}</span>
                      </p>
                    </>
                  )
                })()}
              </div>
            )}

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
                placeholder={isDoc ? 'Document title (optional)' : 'Caption (optional)'}
                className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
              />
            </div>

            {/* Alt text for images */}
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

            {/* Link URL */}
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

            <button
              type="button"
              onClick={commit}
              disabled={!canAdd}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-500/25 hover:bg-brand-600 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Plus className="h-4 w-4" />
              {isDoc ? 'Add Document' : 'Add to Group'}
            </button>
          </>
        ) : (
          /* Upload mode */
          <>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={acceptAttr}
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
                      {isDoc
                        ? 'PDF · Word · Excel · PowerPoint · CSV · TXT · ZIP'
                        : 'JPG · PNG · WebP · GIF · PDF · MP3 · MP4'}
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

// ─── Group card ────────────────────────────────────────────────────────────────

interface GroupCardProps {
  group: Group
  totalMediaCount: number
  dragOverIndex: number | null
  dragIndexRef: React.MutableRefObject<number | null>
  onRemoveBlock: (id: string) => void
  onUpdateBlock: (id: string, field: keyof MediaBlockData, value: string) => void
  onDrop: (e: React.DragEvent, dropIndex: number) => void
  onDragEnd: () => void
  setDragOver: (i: number | null) => void
  onRenameGroup: (groupId: string, newName: string) => void
  onDeleteGroup: (groupId: string) => void
  onAddToGroup: (groupId: string) => void
  cardId: string
  mediaBlocksAll: MediaBlockData[]
  onAddBlock: (block: MediaBlockData) => void
  showAddSheet: boolean
  onToggleAddSheet: () => void
}

function GroupCard({
  group,
  totalMediaCount,
  dragOverIndex,
  dragIndexRef,
  onRemoveBlock,
  onUpdateBlock,
  onDrop,
  onDragEnd,
  setDragOver,
  onRenameGroup,
  onDeleteGroup,
  cardId,
  mediaBlocksAll,
  onAddBlock,
  showAddSheet,
  onToggleAddSheet,
}: GroupCardProps) {
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(group.name)
  const [collapsed, setCollapsed] = useState(false)

  const isDefault = group.id === DEFAULT_GROUP_ID
  const atLimit = totalMediaCount >= MAX_MEDIA

  const commitRename = () => {
    const trimmed = nameValue.trim()
    if (trimmed && trimmed !== group.name) {
      onRenameGroup(group.id, trimmed)
    } else {
      setNameValue(group.name)
    }
    setEditingName(false)
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
      {/* Group header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50/80 border-b border-gray-100">
        <FolderOpen className="h-4 w-4 text-brand-400 shrink-0" />
        {editingName ? (
          <input
            autoFocus
            type="text"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') {
                setNameValue(group.name)
                setEditingName(false)
              }
            }}
            className="flex-1 bg-white rounded-lg border border-brand-300 px-2 py-0.5 text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        ) : (
          <p className="flex-1 text-sm font-bold text-gray-700 truncate">{group.name}</p>
        )}

        <div className="flex items-center gap-0.5 shrink-0">
          <span className="text-[10px] text-gray-400 font-medium mr-1">
            {group.blocks.length} block{group.blocks.length !== 1 ? 's' : ''}
          </span>
          {!isDefault && (
            <>
              <button
                type="button"
                onClick={() => {
                  setEditingName(true)
                  setNameValue(group.name)
                }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                title="Rename group"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => onDeleteGroup(group.id)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                title="Delete group"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', collapsed && '-rotate-90')}
            />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-3 space-y-2">
          {/* Block list */}
          {group.blocks.length > 0 && (
            <div className="space-y-2">
              {group.blocks.map((block, index) => {
                const globalIndex = mediaBlocksAll
                  .filter((b) => b.type !== MediaBlockType.DOCUMENT)
                  .findIndex((b) => b.id === block.id)
                return (
                  <BlockCard
                    key={block.id}
                    block={block}
                    dragOver={dragOverIndex === globalIndex}
                    onDragStart={() => {
                      dragIndexRef.current = globalIndex
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragOver(globalIndex)
                    }}
                    onDrop={(e) => onDrop(e, globalIndex)}
                    onDragEnd={onDragEnd}
                    onRemove={() => onRemoveBlock(block.id)}
                    onUpdate={(field, value) => onUpdateBlock(block.id, field, value)}
                  />
                )
              })}
            </div>
          )}

          {/* Add to group / sheet */}
          {showAddSheet && !atLimit ? (
            <AddSheet
              cardId={cardId}
              groupId={group.id}
              groupName={group.name}
              isDoc={false}
              blockCount={totalMediaCount}
              maxBlocks={MAX_MEDIA}
              onAdd={onAddBlock}
              onClose={onToggleAddSheet}
            />
          ) : atLimit && showAddSheet ? null : (
            <button
              type="button"
              onClick={onToggleAddSheet}
              disabled={atLimit}
              className={cn(
                'group flex w-full items-center gap-2.5 rounded-xl border border-dashed px-3 py-2.5 transition-all',
                atLimit
                  ? 'border-gray-100 bg-gray-50 cursor-not-allowed'
                  : 'border-gray-200 bg-white hover:border-brand-300 hover:bg-brand-50/40 active:scale-[0.99]',
              )}
            >
              <div
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
                  atLimit ? 'bg-gray-100' : 'bg-gray-100 group-hover:bg-brand-100',
                )}
              >
                <Plus
                  className={cn(
                    'h-3.5 w-3.5 transition-colors',
                    atLimit ? 'text-gray-300' : 'text-gray-400 group-hover:text-brand-500',
                  )}
                />
              </div>
              <p
                className={cn(
                  'text-xs font-semibold transition-colors',
                  atLimit ? 'text-gray-300' : 'text-gray-500 group-hover:text-brand-600',
                )}
              >
                {atLimit ? `Limit reached (${MAX_MEDIA})` : 'Add media to this group'}
              </p>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Document section ─────────────────────────────────────────────────────────

interface DocSectionProps {
  cardId: string
  docBlocks: MediaBlockData[]
  allBlocks: MediaBlockData[]
  dragOverIndex: number | null
  dragIndexRef: React.MutableRefObject<number | null>
  onRemoveBlock: (id: string) => void
  onUpdateBlock: (id: string, field: keyof MediaBlockData, value: string) => void
  onDrop: (e: React.DragEvent, dropIndex: number) => void
  onDragEnd: () => void
  setDragOver: (i: number | null) => void
  onAddBlock: (block: MediaBlockData) => void
  showAddSheet: boolean
  onToggleAddSheet: () => void
}

function DocSection({
  cardId,
  docBlocks,
  allBlocks,
  dragOverIndex,
  dragIndexRef,
  onRemoveBlock,
  onUpdateBlock,
  onDrop,
  onDragEnd,
  setDragOver,
  onAddBlock,
  showAddSheet,
  onToggleAddSheet,
}: DocSectionProps) {
  const atLimit = docBlocks.length >= MAX_DOCS

  return (
    <div className="rounded-2xl border border-amber-100 bg-white overflow-hidden shadow-sm">
      {/* Section header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50/60 border-b border-amber-100">
        <Download className="h-4 w-4 text-amber-500 shrink-0" />
        <p className="flex-1 text-sm font-bold text-amber-700">Downloads</p>
        <span className="text-[10px] text-amber-500 font-medium">
          {docBlocks.length}/{MAX_DOCS}
        </span>
      </div>

      <div className="p-3 space-y-2">
        {/* Document blocks */}
        {docBlocks.length > 0 && (
          <div className="space-y-2">
            {docBlocks.map((block) => {
              const globalIndex = allBlocks.findIndex((b) => b.id === block.id)
              return (
                <BlockCard
                  key={block.id}
                  block={block}
                  dragOver={dragOverIndex === globalIndex}
                  onDragStart={() => {
                    dragIndexRef.current = globalIndex
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOver(globalIndex)
                  }}
                  onDrop={(e) => onDrop(e, globalIndex)}
                  onDragEnd={onDragEnd}
                  onRemove={() => onRemoveBlock(block.id)}
                  onUpdate={(field, value) => onUpdateBlock(block.id, field, value)}
                />
              )
            })}
          </div>
        )}

        {/* Add document */}
        {showAddSheet && !atLimit ? (
          <AddSheet
            cardId={cardId}
            groupId={DOCS_GROUP_ID}
            groupName="Downloads"
            isDoc={true}
            blockCount={docBlocks.length}
            maxBlocks={MAX_DOCS}
            onAdd={onAddBlock}
            onClose={onToggleAddSheet}
          />
        ) : atLimit && showAddSheet ? null : (
          <button
            type="button"
            onClick={onToggleAddSheet}
            disabled={atLimit}
            className={cn(
              'group flex w-full items-center gap-2.5 rounded-xl border border-dashed px-3 py-2.5 transition-all',
              atLimit
                ? 'border-gray-100 bg-gray-50 cursor-not-allowed'
                : 'border-amber-200 bg-white hover:border-amber-400 hover:bg-amber-50/40 active:scale-[0.99]',
            )}
          >
            <div
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
                atLimit ? 'bg-gray-100' : 'bg-amber-50 group-hover:bg-amber-100',
              )}
            >
              <Plus
                className={cn(
                  'h-3.5 w-3.5 transition-colors',
                  atLimit ? 'text-gray-300' : 'text-amber-400 group-hover:text-amber-600',
                )}
              />
            </div>
            <p
              className={cn(
                'text-xs font-semibold transition-colors',
                atLimit ? 'text-gray-300' : 'text-amber-600 group-hover:text-amber-700',
              )}
            >
              {atLimit ? `Limit reached (${MAX_DOCS})` : 'Add document'}
            </p>
          </button>
        )}

        {docBlocks.length === 0 && !showAddSheet && (
          <p className="text-center text-xs text-gray-400 py-2">
            PDFs, Word, Excel, PowerPoint and more
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function MediaTab({ cardId, mediaBlocks, onChange }: MediaTabProps): JSX.Element {
  const dragIndexRef = useRef<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  // activeAddSheet: groupId that currently has its add sheet open, or null
  const [activeAddSheet, setActiveAddSheet] = useState<string | null>(null)
  // showDocSheet: whether the doc section's add sheet is open
  const [showDocSheet, setShowDocSheet] = useState(false)
  // new group name prompt
  const [showNewGroupPrompt, setShowNewGroupPrompt] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')

  const sorted = [...mediaBlocks].sort((a, b) => a.displayOrder - b.displayOrder)
  const { mediaGroups, docBlocks } = splitBlocks(sorted)
  const mediaOnlyBlocks = sorted.filter((b) => b.type !== MediaBlockType.DOCUMENT)
  const mediaCount = mediaOnlyBlocks.length
  const docCount = docBlocks.length

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAddBlock = useCallback(
    (block: MediaBlockData) => {
      onChange([...mediaBlocks, block])
      setActiveAddSheet(null)
      setShowDocSheet(false)
    },
    [mediaBlocks, onChange],
  )

  const handleRemoveBlock = useCallback(
    (id: string) => {
      onChange(mediaBlocks.filter((b) => b.id !== id).map((b, i) => ({ ...b, displayOrder: i })))
    },
    [mediaBlocks, onChange],
  )

  const handleUpdateBlock = useCallback(
    (id: string, field: keyof MediaBlockData, value: string) => {
      onChange(mediaBlocks.map((b) => (b.id === id ? { ...b, [field]: value || undefined } : b)))
    },
    [mediaBlocks, onChange],
  )

  const handleRenameGroup = useCallback(
    (groupId: string, newName: string) => {
      onChange(mediaBlocks.map((b) => (b.groupId === groupId ? { ...b, groupName: newName } : b)))
    },
    [mediaBlocks, onChange],
  )

  const handleDeleteGroup = useCallback(
    (groupId: string) => {
      // Remove all blocks in the group
      onChange(
        mediaBlocks.filter((b) => b.groupId !== groupId).map((b, i) => ({ ...b, displayOrder: i })),
      )
    },
    [mediaBlocks, onChange],
  )

  const handleCreateGroup = useCallback(() => {
    const name = newGroupName.trim() || 'New Group'
    const groupId = `grp-${Date.now()}`
    // No blocks yet — just open the add sheet for this new group
    // We'll mark it active so user can immediately add to it
    // We need to at least register the group in the state somehow.
    // Since groups are derived from blocks, we'll create a placeholder
    // HEADING block with this groupId — but wait, the plan says no HEADING blocks.
    // Instead we'll just track "pending groups" via UI state.
    // The group appears once its first block is added.
    setPendingGroup({ id: groupId, name })
    setNewGroupName('')
    setShowNewGroupPrompt(false)
    setActiveAddSheet(groupId)
  }, [newGroupName])

  const [pendingGroup, setPendingGroup] = useState<{ id: string; name: string } | null>(null)

  const handleDragStart = (index: number) => {
    dragIndexRef.current = index
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

  // Combine real groups with pending group (if any and not yet in real groups)
  const pendingExists = pendingGroup && !mediaGroups.find((g) => g.id === pendingGroup.id)
  const allGroups: Group[] = [
    ...mediaGroups,
    ...(pendingExists ? [{ id: pendingGroup!.id, name: pendingGroup!.name, blocks: [] }] : []),
  ]

  // ── Render ────────────────────────────────────────────────────────────────

  const hasAnything = mediaBlocks.length > 0 || pendingExists

  return (
    <div className="space-y-4">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Media & Files</p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {mediaCount}/{MAX_MEDIA} media · {docCount}/{MAX_DOCS} docs
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowNewGroupPrompt(true)
            setNewGroupName('')
          }}
          disabled={mediaCount >= MAX_MEDIA}
          className={cn(
            'flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all',
            mediaCount >= MAX_MEDIA
              ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
              : 'bg-brand-500 text-white shadow-sm shadow-brand-500/25 hover:bg-brand-600 active:scale-95',
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          New Group
        </button>
      </div>

      {/* ── New group prompt ── */}
      {showNewGroupPrompt && (
        <div className="rounded-2xl border border-brand-100 bg-white shadow-sm p-4 space-y-3">
          <p className="text-xs font-bold text-gray-700 uppercase tracking-widest">Create Group</p>
          <div className="flex items-center gap-2.5 rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-3 focus-within:bg-white focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all">
            <FolderOpen className="h-4 w-4 shrink-0 text-gray-400" />
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateGroup()
                if (e.key === 'Escape') setShowNewGroupPrompt(false)
              }}
              placeholder="e.g. Portfolio, Gallery, Works…"
              autoFocus
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreateGroup}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand-500 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-500/25 hover:bg-brand-600 active:scale-[0.98] transition-all"
            >
              <Plus className="h-4 w-4" />
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowNewGroupPrompt(false)}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 active:scale-[0.98] transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {!hasAnything && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gradient-to-b from-gray-50 to-white p-8 text-center space-y-3">
          <div className="flex justify-center -space-x-2">
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
              Create a group to add images, videos, audio,
              <br />
              or add documents to the Downloads section.
            </p>
          </div>
          <div className="flex justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setShowNewGroupPrompt(true)
                setNewGroupName('')
              }}
              className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-500/25 hover:bg-brand-600 active:scale-95 transition-all"
            >
              <Plus className="h-4 w-4" />
              New Group
            </button>
            <button
              type="button"
              onClick={() => setShowDocSheet(true)}
              className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100 active:scale-95 transition-all"
            >
              <Download className="h-4 w-4" />
              Add Document
            </button>
          </div>
        </div>
      )}

      {/* ── Media groups ── */}
      {allGroups.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
              Media Groups
            </p>
            <div className="h-px flex-1 bg-gray-100" />
          </div>
          {allGroups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              totalMediaCount={mediaCount}
              dragOverIndex={dragOver}
              dragIndexRef={dragIndexRef}
              onRemoveBlock={handleRemoveBlock}
              onUpdateBlock={handleUpdateBlock}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              setDragOver={setDragOver}
              onRenameGroup={handleRenameGroup}
              onDeleteGroup={(gid) => {
                handleDeleteGroup(gid)
                if (pendingGroup?.id === gid) setPendingGroup(null)
              }}
              onAddToGroup={() => setActiveAddSheet(group.id)}
              cardId={cardId}
              mediaBlocksAll={mediaBlocks}
              onAddBlock={(block) => {
                handleAddBlock(block)
                if (pendingGroup?.id === group.id) setPendingGroup(null)
              }}
              showAddSheet={activeAddSheet === group.id}
              onToggleAddSheet={() =>
                setActiveAddSheet((prev) => (prev === group.id ? null : group.id))
              }
            />
          ))}
        </div>
      )}

      {/* ── Documents section ── */}
      {(docBlocks.length > 0 || hasAnything) && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
              Documents
            </p>
            <div className="h-px flex-1 bg-gray-100" />
          </div>
          <DocSection
            cardId={cardId}
            docBlocks={docBlocks}
            allBlocks={sorted}
            dragOverIndex={dragOver}
            dragIndexRef={dragIndexRef}
            onRemoveBlock={handleRemoveBlock}
            onUpdateBlock={handleUpdateBlock}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            setDragOver={setDragOver}
            onAddBlock={handleAddBlock}
            showAddSheet={showDocSheet}
            onToggleAddSheet={() => setShowDocSheet((v) => !v)}
          />
        </div>
      )}

      {/* ── Drag hint ── */}
      {mediaBlocks.length > 1 && (
        <p className="flex items-center justify-center gap-1.5 text-[10px] text-gray-300">
          <GripVertical className="h-3 w-3" />
          Drag blocks within or between groups to reorder
        </p>
      )}
    </div>
  )
}
