import React from 'react'
import type { MediaBlockData } from '@dotly/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractYouTubeId(url: string): string {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1)
    return u.searchParams.get('v') ?? ''
  } catch {
    return ''
  }
}

function isSpotify(url: string) {
  return url.toLowerCase().includes('open.spotify.com')
}

function spotifyEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    if (!u.hostname.includes('spotify.com')) return null
    const embedPath = u.pathname.replace(/^\/(track|album|playlist|show|episode)/, '/embed/$1')
    return `https://open.spotify.com${embedPath}`
  } catch {
    return null
  }
}

function isVimeo(url: string) {
  return url.toLowerCase().includes('vimeo.com')
}

function vimeoEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url)
    const id = u.pathname.replace(/^\//, '').split('/')[0]
    return id ? `https://player.vimeo.com/video/${id}` : null
  } catch {
    return null
  }
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Detect document format from mimeType or URL */
function detectDocFormat(
  mimeType: string | undefined,
  url: string,
): 'pdf' | 'word' | 'excel' | 'powerpoint' | 'csv' | 'zip' | 'txt' | 'generic' {
  const mime = (mimeType ?? '').toLowerCase()
  const lower = url.toLowerCase()

  if (mime === 'application/pdf' || lower.endsWith('.pdf')) return 'pdf'
  if (
    mime.includes('word') ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lower.endsWith('.doc') ||
    lower.endsWith('.docx')
  )
    return 'word'
  if (
    mime.includes('excel') ||
    mime.includes('spreadsheet') ||
    mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    lower.endsWith('.xls') ||
    lower.endsWith('.xlsx')
  )
    return 'excel'
  if (
    mime.includes('presentation') ||
    mime.includes('powerpoint') ||
    mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    lower.endsWith('.ppt') ||
    lower.endsWith('.pptx')
  )
    return 'powerpoint'
  if (mime === 'text/csv' || lower.endsWith('.csv')) return 'csv'
  if (
    mime === 'application/zip' ||
    mime === 'application/x-zip-compressed' ||
    lower.endsWith('.zip')
  )
    return 'zip'
  if (mime === 'text/plain' || lower.endsWith('.txt')) return 'txt'
  return 'generic'
}

// ── Document format icons (inline SVG) ───────────────────────────────────────

function DocFormatIcon({
  format,
  size = 20,
}: {
  format: ReturnType<typeof detectDocFormat>
  size?: number
}) {
  const configs: Record<
    ReturnType<typeof detectDocFormat>,
    { bg: string; label: string; icon: React.ReactNode }
  > = {
    pdf: {
      bg: '#ef4444',
      label: 'PDF',
      icon: (
        <text
          x="20"
          y="28"
          textAnchor="middle"
          fontSize="10"
          fontWeight="900"
          fontFamily="Arial,sans-serif"
          fill="white"
          letterSpacing="-0.5"
        >
          PDF
        </text>
      ),
    },
    word: {
      bg: '#2563eb',
      label: 'DOC',
      icon: (
        <text
          x="20"
          y="28"
          textAnchor="middle"
          fontSize="10"
          fontWeight="900"
          fontFamily="Arial,sans-serif"
          fill="white"
          letterSpacing="-0.5"
        >
          DOC
        </text>
      ),
    },
    excel: {
      bg: '#16a34a',
      label: 'XLS',
      icon: (
        <text
          x="20"
          y="28"
          textAnchor="middle"
          fontSize="10"
          fontWeight="900"
          fontFamily="Arial,sans-serif"
          fill="white"
          letterSpacing="-0.5"
        >
          XLS
        </text>
      ),
    },
    powerpoint: {
      bg: '#ea580c',
      label: 'PPT',
      icon: (
        <text
          x="20"
          y="28"
          textAnchor="middle"
          fontSize="10"
          fontWeight="900"
          fontFamily="Arial,sans-serif"
          fill="white"
          letterSpacing="-0.5"
        >
          PPT
        </text>
      ),
    },
    csv: {
      bg: '#0d9488',
      label: 'CSV',
      icon: (
        <text
          x="20"
          y="28"
          textAnchor="middle"
          fontSize="10"
          fontWeight="900"
          fontFamily="Arial,sans-serif"
          fill="white"
          letterSpacing="-0.5"
        >
          CSV
        </text>
      ),
    },
    zip: {
      bg: '#7c3aed',
      label: 'ZIP',
      icon: (
        <text
          x="20"
          y="28"
          textAnchor="middle"
          fontSize="10"
          fontWeight="900"
          fontFamily="Arial,sans-serif"
          fill="white"
          letterSpacing="-0.5"
        >
          ZIP
        </text>
      ),
    },
    txt: {
      bg: '#64748b',
      label: 'TXT',
      icon: (
        <text
          x="20"
          y="28"
          textAnchor="middle"
          fontSize="10"
          fontWeight="900"
          fontFamily="Arial,sans-serif"
          fill="white"
          letterSpacing="-0.5"
        >
          TXT
        </text>
      ),
    },
    generic: {
      bg: '#94a3b8',
      label: 'FILE',
      icon: (
        <text
          x="20"
          y="28"
          textAnchor="middle"
          fontSize="9"
          fontWeight="900"
          fontFamily="Arial,sans-serif"
          fill="white"
          letterSpacing="-0.5"
        >
          FILE
        </text>
      ),
    },
  }

  const c = configs[format]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Page shape */}
      <rect width="40" height="40" rx="8" fill={c.bg} />
      {/* Dog-ear */}
      <path d="M26 6 L34 14 L26 14 Z" fill="rgba(255,255,255,0.25)" />
      <path
        d="M8 6 L26 6 L34 14 L34 34 Q34 36 32 36 L8 36 Q6 36 6 34 L6 8 Q6 6 8 6Z"
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="0.5"
      />
      {c.icon}
    </svg>
  )
}

// ── Format badge ──────────────────────────────────────────────────────────────

const FORMAT_COLORS: Record<ReturnType<typeof detectDocFormat>, string> = {
  pdf: '#ef4444',
  word: '#2563eb',
  excel: '#16a34a',
  powerpoint: '#ea580c',
  csv: '#0d9488',
  zip: '#7c3aed',
  txt: '#64748b',
  generic: '#94a3b8',
}

// ── Wrappers ──────────────────────────────────────────────────────────────────

function MaybeLink({
  href,
  children,
  style,
}: {
  href: string | undefined
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  if (!href) return <>{children}</>
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: 'block', textDecoration: 'none', ...style }}
    >
      {children}
    </a>
  )
}

// ── Individual block renderers ────────────────────────────────────────────────

function VideoBlock({ block, accentColor }: { block: MediaBlockData; accentColor: string }) {
  const url = block.url ?? ''
  const ytId = extractYouTubeId(url)
  const isVimeoUrl = isVimeo(url)
  const vimeoEmbed = isVimeoUrl ? vimeoEmbedUrl(url) : null
  const isDirectVideo =
    url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogg') || url.endsWith('.mov')

  const embedWrap = (iframe: React.ReactNode) => (
    <MaybeLink href={block.linkUrl}>
      <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#000' }}>
        {iframe}
      </div>
    </MaybeLink>
  )

  if (ytId) {
    return embedWrap(
      <iframe
        src={`https://www.youtube.com/embed/${ytId}?modestbranding=1&rel=0`}
        title={block.caption ?? 'YouTube video'}
        allowFullScreen
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
        }}
      />,
    )
  }

  if (vimeoEmbed) {
    return embedWrap(
      <iframe
        src={vimeoEmbed}
        title={block.caption ?? 'Vimeo video'}
        allowFullScreen
        loading="lazy"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          border: 'none',
          display: 'block',
        }}
      />,
    )
  }

  if (isDirectVideo) {
    return (
      <MaybeLink href={block.linkUrl}>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video
          controls
          preload="metadata"
          style={{ width: '100%', display: 'block', maxHeight: 320, background: '#000' }}
        >
          <source src={url} />
        </video>
      </MaybeLink>
    )
  }

  return (
    <a
      href={url || undefined}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        background: `linear-gradient(135deg, ${accentColor}10 0%, ${accentColor}05 100%)`,
        border: `1px solid ${accentColor}22`,
        borderRadius: 14,
        textDecoration: 'none',
        color: '#1f2937',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: accentColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1f2937' }}>
          {block.caption || 'Watch video'}
        </p>
        <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Tap to open</p>
      </div>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#9ca3af"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0 }}
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </a>
  )
}

function ImageBlock({ block }: { block: MediaBlockData }) {
  return (
    <MaybeLink href={block.linkUrl}>
      <img
        src={block.url ?? undefined}
        alt={block.altText ?? block.caption ?? ''}
        loading="lazy"
        style={{ width: '100%', display: 'block', objectFit: 'cover' }}
      />
      {block.linkUrl && (
        <div
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(4px)',
            borderRadius: 6,
            padding: '3px 6px',
            display: 'flex',
            alignItems: 'center',
            gap: 3,
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </div>
      )}
    </MaybeLink>
  )
}

function AudioBlock({ block, accentColor }: { block: MediaBlockData; accentColor: string }) {
  const url = block.url ?? ''
  if (isSpotify(url)) {
    const embed = spotifyEmbedUrl(url)
    if (embed) {
      return (
        <MaybeLink href={block.linkUrl}>
          <iframe
            src={`${embed}?utm_source=generator&theme=0`}
            width="100%"
            height="152"
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            title={block.caption ?? 'Spotify'}
            style={{ border: 'none', display: 'block', borderRadius: 12 }}
          />
        </MaybeLink>
      )
    }
  }

  if (url.toLowerCase().includes('soundcloud.com')) {
    return (
      <MaybeLink href={block.linkUrl}>
        <iframe
          width="100%"
          height="120"
          scrolling="no"
          allow="autoplay"
          loading="lazy"
          src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23${accentColor.replace('#', '')}&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false`}
          title={block.caption ?? 'SoundCloud'}
          style={{ border: 'none', display: 'block', borderRadius: 12 }}
        />
      </MaybeLink>
    )
  }

  return (
    <MaybeLink href={block.linkUrl}>
      <div
        style={{
          background: `linear-gradient(135deg, ${accentColor}12 0%, ${accentColor}06 100%)`,
          border: `1px solid ${accentColor}22`,
          borderRadius: 14,
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: accentColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {block.caption && (
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#1f2937',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {block.caption}
              </p>
            )}
            <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>Audio track</p>
          </div>
        </div>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio
          controls
          src={url}
          preload="metadata"
          style={{ width: '100%', height: 40, outline: 'none' }}
        />
      </div>
    </MaybeLink>
  )
}

/**
 * Redesigned document block:
 * - Per-format SVG icon (PDF=red, Word=blue, Excel=green, PowerPoint=orange, CSV=teal, ZIP=purple, TXT=gray)
 * - Shows title (caption or filename), extension badge, file size if available
 * - Always triggers download/open
 */
function DocumentBlock({ block, accentColor }: { block: MediaBlockData; accentColor: string }) {
  const url = block.url ?? ''
  const isGoogleDoc = url.includes('docs.google.com') || url.includes('slides.google.com')

  // Google Docs — embed preview
  if (isGoogleDoc) {
    const previewUrl = url.includes('/pub') ? url : url.replace(/\/edit.*$/, '/preview')
    return (
      <div style={{ borderRadius: 14, overflow: 'hidden' }}>
        <iframe
          src={previewUrl}
          title={block.caption ?? 'Document'}
          loading="lazy"
          style={{ width: '100%', height: 280, border: 'none', display: 'block' }}
          allow="autoplay"
        />
        {block.caption && (
          <div
            style={{
              padding: '8px 12px',
              background: '#f8fafc',
              borderTop: '1px solid #f1f5f9',
            }}
          >
            <p style={{ margin: 0, fontSize: 12, color: '#6b7280', fontWeight: 500 }}>
              {block.caption}
            </p>
          </div>
        )}
      </div>
    )
  }

  const format = detectDocFormat(block.mimeType, url)
  const formatColor = FORMAT_COLORS[format]

  const filename = (() => {
    try {
      return decodeURIComponent(url.split('/').pop() ?? 'document').replace(/\?.*$/, '')
    } catch {
      return 'document'
    }
  })()

  const ext = filename.includes('.')
    ? filename.split('.').pop()?.toUpperCase()
    : format.toUpperCase()
  const title = block.caption || filename.replace(/\.[^.]+$/, '')

  return (
    <a
      href={block.linkUrl || url || undefined}
      target="_blank"
      rel="noopener noreferrer"
      download={block.caption || filename}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        background: `${formatColor}08`,
        border: `1.5px solid ${formatColor}20`,
        borderRadius: 14,
        textDecoration: 'none',
        color: '#1f2937',
        transition: 'all 0.15s',
      }}
    >
      {/* Format icon */}
      <div style={{ flexShrink: 0 }}>
        <DocFormatIcon format={format} size={40} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 700,
            color: '#1f2937',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          {/* Extension badge */}
          <span
            style={{
              display: 'inline-block',
              background: formatColor,
              color: 'white',
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.04em',
              padding: '1px 5px',
              borderRadius: 4,
              lineHeight: 1.6,
            }}
          >
            {ext}
          </span>
          {/* File size */}
          {block.fileSize ? (
            <span style={{ fontSize: 11, color: '#9ca3af' }}>{formatFileSize(block.fileSize)}</span>
          ) : null}
        </div>
      </div>

      {/* Download arrow */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke={formatColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0, opacity: 0.7 }}
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
    </a>
  )
}

// ── Heading block (legacy support) ────────────────────────────────────────────

function HeadingBlock({
  block,
  accentColor,
}: {
  block: MediaBlockData
  accentColor: string
  captionColor: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginTop: 6,
        marginBottom: 2,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: accentColor,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {block.caption || 'Section'}
      </p>
      <div
        style={{
          flex: 1,
          height: 1,
          background: `${accentColor}30`,
        }}
      />
    </div>
  )
}

// ── Image gallery (2-col grid for multiple consecutive images) ─────────────────

function ImageGallery({ blocks }: { blocks: MediaBlockData[] }) {
  if (blocks.length === 1) {
    const block = blocks[0]!
    return (
      <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden' }}>
        <ImageBlock block={block} />
      </div>
    )
  }

  const isOdd = blocks.length % 2 !== 0

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridAutoRows: 130,
        gap: 3,
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {blocks.map((block, i) => {
        const spanTwo = isOdd && i === 0
        return (
          <div
            key={block.id}
            style={{
              gridRow: spanTwo ? 'span 2' : undefined,
              position: 'relative',
              overflow: 'hidden',
              background: '#e5e7eb',
            }}
          >
            <MaybeLink href={block.linkUrl} style={{ height: '100%' }}>
              <img
                src={block.url ?? undefined}
                alt={block.altText ?? block.caption ?? ''}
                loading="lazy"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </MaybeLink>
          </div>
        )
      })}
    </div>
  )
}

// ── Caption ───────────────────────────────────────────────────────────────────

function Caption({ text, captionColor }: { text: string; captionColor: string }) {
  return (
    <p
      style={{
        margin: '6px 2px 0',
        fontSize: 12,
        color: captionColor,
        lineHeight: 1.5,
        fontStyle: 'italic',
      }}
    >
      {text}
    </p>
  )
}

// ── Group section header ───────────────────────────────────────────────────────

function GroupHeader({ name, accentColor }: { name: string; accentColor: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginTop: 4,
        marginBottom: 10,
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          color: accentColor,
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {name}
      </p>
      <div
        style={{
          flex: 1,
          height: 1,
          background: `${accentColor}28`,
        }}
      />
    </div>
  )
}

// ── Downloads section header ───────────────────────────────────────────────────

function DownloadsSectionHeader({ captionColor }: { captionColor: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginTop: 4,
        marginBottom: 10,
      }}
    >
      {/* Download arrow icon */}
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#d97706"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0 }}
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      <p
        style={{
          margin: 0,
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          color: '#d97706',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        Downloads
      </p>
      <div
        style={{
          flex: 1,
          height: 1,
          background: '#f59e0b28',
        }}
      />
    </div>
  )
}

// ── Internal rendering helpers ─────────────────────────────────────────────────

type RenderGroup =
  | { kind: 'gallery'; items: MediaBlockData[] }
  | { kind: 'single'; item: MediaBlockData }

function renderMediaBlocks(
  blocks: MediaBlockData[],
  accentColor: string,
  captionColor: string,
): React.ReactNode[] {
  // Group consecutive IMAGE blocks into galleries; HEADING etc. break runs
  const groups: RenderGroup[] = []

  for (const block of blocks) {
    if (block.type === 'IMAGE') {
      const last = groups[groups.length - 1]
      if (last?.kind === 'gallery') {
        last.items.push(block)
      } else {
        groups.push({ kind: 'gallery', items: [block] })
      }
    } else {
      groups.push({ kind: 'single', item: block })
    }
  }

  return groups.map((group, i) => {
    if (group.kind === 'gallery') {
      const sharedCaption = group.items.length > 1 ? undefined : group.items[0]?.caption
      return (
        <div key={`g-${i}`} style={{ marginBottom: 14 }}>
          <ImageGallery blocks={group.items} />
          {sharedCaption && <Caption text={sharedCaption} captionColor={captionColor} />}
        </div>
      )
    }

    const { item } = group

    if (item.type === 'HEADING') {
      return (
        <HeadingBlock
          key={item.id}
          block={item}
          accentColor={accentColor}
          captionColor={captionColor}
        />
      )
    }

    const isAmbient = item.type === 'AUDIO' || item.type === 'DOCUMENT'

    return (
      <div
        key={item.id}
        style={{
          marginBottom: 14,
          borderRadius: 14,
          overflow: isAmbient ? 'visible' : 'hidden',
          boxShadow: isAmbient ? 'none' : '0 2px 12px rgba(0,0,0,0.07)',
        }}
      >
        {item.type === 'VIDEO' && <VideoBlock block={item} accentColor={accentColor} />}
        {item.type === 'AUDIO' && <AudioBlock block={item} accentColor={accentColor} />}
        {item.type === 'DOCUMENT' && <DocumentBlock block={item} accentColor={accentColor} />}
        {item.type === 'VIDEO' && item.caption && (
          <Caption text={item.caption} captionColor={captionColor} />
        )}
      </div>
    )
  })
}

// ── Main exported component ────────────────────────────────────────────────────

export interface MediaBlockListProps {
  blocks: MediaBlockData[]
  accentColor: string
  /** true = dark background (BoldTemplate) → lighter caption text */
  darkBackground?: boolean
}

const DEFAULT_GROUP_ID = '__default__'
const DEFAULT_GROUP_NAME = 'General'
const DOCS_GROUP_ID = '__docs__'

interface ParsedGroup {
  id: string
  name: string
  blocks: MediaBlockData[]
}

export function MediaBlockList({
  blocks,
  accentColor,
  darkBackground = false,
}: MediaBlockListProps) {
  const sorted = [...blocks].sort((a, b) => a.displayOrder - b.displayOrder)
  const captionColor = darkBackground ? '#cbd5e1' : '#6b7280'

  // ── Separate documents and media ────────────────────────────────────────────
  const docBlocks = sorted.filter((b) => b.type === 'DOCUMENT')
  const mediaBlocks = sorted.filter((b) => b.type !== 'DOCUMENT')

  // ── Build named media groups ─────────────────────────────────────────────────
  const groupMap = new Map<string, ParsedGroup>()
  const groupOrder: string[] = []

  for (const b of mediaBlocks) {
    const gid = b.groupId ?? DEFAULT_GROUP_ID
    const gname = b.groupName ?? DEFAULT_GROUP_NAME
    if (!groupMap.has(gid)) {
      groupMap.set(gid, { id: gid, name: gname, blocks: [] })
      groupOrder.push(gid)
    }
    groupMap.get(gid)!.blocks.push(b)
  }

  const mediaGroups: ParsedGroup[] = groupOrder.map((gid) => groupMap.get(gid)!)

  const hasGroups = mediaGroups.length > 0
  const hasDocs = docBlocks.length > 0

  // ── Legacy flat mode: single group with no groupId, name it nothing ──────────
  // If there's only one group and it's the default, skip the group header
  const singleDefaultGroup = mediaGroups.length === 1 && mediaGroups[0]?.id === DEFAULT_GROUP_ID

  return (
    <>
      {/* ── Media groups ── */}
      {hasGroups &&
        mediaGroups.map((group, gi) => (
          <React.Fragment key={group.id}>
            {/* Show group header unless it's the only default group */}
            {!singleDefaultGroup && <GroupHeader name={group.name} accentColor={accentColor} />}
            {renderMediaBlocks(group.blocks, accentColor, captionColor)}
            {/* Spacer between groups */}
            {gi < mediaGroups.length - 1 && <div style={{ height: 8 }} />}
          </React.Fragment>
        ))}

      {/* ── Documents section ── */}
      {hasDocs && (
        <>
          {/* Spacer before downloads if there were media groups */}
          {hasGroups && <div style={{ height: 16 }} />}
          <DownloadsSectionHeader captionColor={captionColor} />
          {docBlocks.map((block) => (
            <div key={block.id} style={{ marginBottom: 10 }}>
              <DocumentBlock block={block} accentColor={accentColor} />
            </div>
          ))}
        </>
      )}
    </>
  )
}
