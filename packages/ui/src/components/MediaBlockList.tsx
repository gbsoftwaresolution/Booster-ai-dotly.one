import React, { useState, useCallback, useEffect, useRef } from 'react'
import type { MediaBlockData } from '@dotly/types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractYouTubeId(url: string): string {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('?')[0] ?? ''
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

// ── Colors & config ───────────────────────────────────────────────────────────

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

const FORMAT_GRADIENTS: Record<ReturnType<typeof detectDocFormat>, string> = {
  pdf: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
  word: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
  excel: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
  powerpoint: 'linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)',
  csv: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)',
  zip: 'linear-gradient(135deg, #faf5ff 0%, #ede9fe 100%)',
  txt: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
  generic: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
}

// ── Inline keyframes injected once ───────────────────────────────────────────

const STYLE_ID = 'dotly-media-gallery-styles'

function injectStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ID)) return
  const el = document.createElement('style')
  el.id = STYLE_ID
  el.textContent = `
    @keyframes dotly-lb-in {
      from { opacity: 0; transform: scale(0.94); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes dotly-lb-backdrop-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes dotly-lb-content-in {
      from { opacity: 0; transform: translateY(18px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes dotly-pulse-ring {
      0%   { transform: scale(1);   opacity: 0.6; }
      70%  { transform: scale(1.55); opacity: 0; }
      100% { transform: scale(1.55); opacity: 0; }
    }
    .dotly-thumb {
      transition: transform 0.18s cubic-bezier(.34,1.56,.64,1), box-shadow 0.18s ease;
      will-change: transform;
    }
    .dotly-thumb:hover  { transform: scale(1.035); box-shadow: 0 8px 24px rgba(0,0,0,0.18); }
    .dotly-thumb:active { transform: scale(0.97);  box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
    .dotly-doc-card {
      transition: transform 0.16s cubic-bezier(.34,1.56,.64,1), box-shadow 0.16s ease;
    }
    .dotly-doc-card:hover  { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,0,0,0.10); }
    .dotly-doc-card:active { transform: translateY(0px);  box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .dotly-lb-arrow {
      transition: background 0.15s, transform 0.15s;
    }
    .dotly-lb-arrow:hover  { background: rgba(255,255,255,0.22) !important; transform: scale(1.08); }
    .dotly-lb-arrow:active { transform: scale(0.96); }
  `
  document.head.appendChild(el)
}

// ── SVG icons ─────────────────────────────────────────────────────────────────

function PlayIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="24" fill="rgba(0,0,0,0.52)" />
      <circle
        cx="24"
        cy="24"
        r="22"
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="1.5"
      />
      <polygon points="20,16 36,24 20,32" fill="white" />
    </svg>
  )
}

function MusicNoteIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" fill="white" stroke="none" fillOpacity="0.9" />
      <circle cx="18" cy="16" r="3" fill="white" stroke="none" fillOpacity="0.9" />
    </svg>
  )
}

function CloseIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function ChevronLeftIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

function ChevronRightIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function DownloadIcon({ size = 15, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function ImagePlaceholderIcon({
  size = 28,
  color = 'rgba(0,0,0,0.18)',
}: {
  size?: number
  color?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

// ── Doc format icon ───────────────────────────────────────────────────────────

function DocFormatIcon({
  format,
  size = 40,
}: {
  format: ReturnType<typeof detectDocFormat>
  size?: number
}) {
  const labels: Record<ReturnType<typeof detectDocFormat>, string> = {
    pdf: 'PDF',
    word: 'DOC',
    excel: 'XLS',
    powerpoint: 'PPT',
    csv: 'CSV',
    zip: 'ZIP',
    txt: 'TXT',
    generic: 'FILE',
  }
  const color = FORMAT_COLORS[format]
  const label = labels[format]
  const fontSize = label.length > 3 ? 8 : 10

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Shadow layer */}
      <rect x="2" y="3" width="36" height="36" rx="9" fill={color} fillOpacity="0.15" />
      {/* Main body */}
      <rect width="36" height="36" rx="8" fill={color} />
      {/* Fold ear */}
      <path d="M25 3 L33 11 L25 11 Z" fill="rgba(255,255,255,0.28)" />
      <path d="M25 3 L33 11" stroke="rgba(255,255,255,0.18)" strokeWidth="0.5" />
      {/* Inner lines suggesting content */}
      <line
        x1="9"
        y1="19"
        x2="27"
        y2="19"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="9"
        y1="23"
        x2="22"
        y2="23"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="9"
        y1="27"
        x2="24"
        y2="27"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Label */}
      <text
        x="18"
        y="15"
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight="900"
        fontFamily="'Arial Black',Arial,sans-serif"
        fill="white"
        letterSpacing="0.3"
      >
        {label}
      </text>
    </svg>
  )
}

// ── PDF first-page thumbnail (scaled iframe, falls back to DocFormatIcon) ────

function PdfPageThumb({ url, mimeType }: { url: string; mimeType: string | undefined }) {
  const [failed, setFailed] = React.useState(false)
  const format = detectDocFormat(mimeType, url)
  const isPdf = format === 'pdf'

  // Only attempt iframe preview for actual PDF files — not Google Docs / other doc types
  if (!isPdf || failed) {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <DocFormatIcon format={format} size={42} />
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: '#f8fafc',
      }}
    >
      {/* Transparent overlay blocks pointer events so clicks reach the mosaic button */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2 }} />
      <iframe
        src={`${url}#page=1&toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
        title="PDF preview"
        scrolling="no"
        onError={() => setFailed(true)}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 800,
          height: 800,
          transform: 'scale(0.25)',
          transformOrigin: '0 0',
          border: 'none',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
    </div>
  )
}

// ── Smart mosaic grid layout ──────────────────────────────────────────────────
// 1 block  → full-width (4:3)
// 2 blocks → 50/50 side-by-side (1:1 each)
// 3 blocks → hero left (2:3 tall) + 2 stacked right
// 4 blocks → 2×2 grid
// 5+       → 2×2 grid showing first 4, +N badge on last visible

const MAX_VISIBLE = 4

function MosaicGrid({
  blocks,
  accentColor,
  onOpen,
}: {
  blocks: MediaBlockData[]
  accentColor: string
  onOpen: (index: number) => void
}) {
  if (blocks.length === 0) return null

  const visible = blocks.slice(0, MAX_VISIBLE)
  const overflow = blocks.length - MAX_VISIBLE
  const count = visible.length

  if (count === 1) {
    return (
      <div style={{ borderRadius: 16, overflow: 'hidden' }}>
        <MediaThumb
          block={visible[0]!}
          accentColor={accentColor}
          aspectRatio="4/3"
          onClick={() => onOpen(0)}
        />
      </div>
    )
  }

  if (count === 2) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 4,
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {visible.map((block, i) => (
          <MediaThumb
            key={block.id}
            block={block}
            accentColor={accentColor}
            aspectRatio="1/1"
            onClick={() => onOpen(i)}
          />
        ))}
      </div>
    )
  }

  if (count === 3) {
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 4,
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {/* Hero left: spans both rows, fills full height set by right column */}
        <div style={{ gridRow: '1 / 3', display: 'flex', minHeight: 0 }}>
          <MediaThumb
            block={visible[0]!}
            accentColor={accentColor}
            aspectRatio="none"
            onClick={() => onOpen(0)}
          />
        </div>
        {/* Two equal cells stacked on the right — their combined height = hero height */}
        <MediaThumb
          block={visible[1]!}
          accentColor={accentColor}
          aspectRatio="1/1"
          onClick={() => onOpen(1)}
        />
        <MediaThumb
          block={visible[2]!}
          accentColor={accentColor}
          aspectRatio="1/1"
          onClick={() => onOpen(2)}
        />
      </div>
    )
  }

  // 4 items (with possible overflow badge on last)
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 4,
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      {visible.map((block, i) => {
        const isLast = i === MAX_VISIBLE - 1 && overflow > 0
        return (
          <div key={block.id} style={{ position: 'relative' }}>
            <MediaThumb
              block={block}
              accentColor={accentColor}
              aspectRatio="1/1"
              onClick={() => onOpen(i)}
            />
            {isLast && (
              <div
                onClick={() => onOpen(i)}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(0,0,0,0.58)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  backdropFilter: 'blur(2px)',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: 'white',
                    fontSize: 22,
                    fontWeight: 800,
                    letterSpacing: '-0.5px',
                    textShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  }}
                >
                  +{overflow + 1}
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Thumbnail ─────────────────────────────────────────────────────────────────

function MediaThumb({
  block,
  accentColor,
  aspectRatio = '1/1',
  onClick,
}: {
  block: MediaBlockData
  accentColor: string
  aspectRatio?: string
  onClick: () => void
}) {
  const url = block.url ?? ''
  const ytId = block.type === 'VIDEO' ? extractYouTubeId(url) : null
  const isYt = !!ytId
  const isVimeoUrl = block.type === 'VIDEO' && isVimeo(url)
  const isPdf = block.type === 'DOCUMENT'
  const isAudio = block.type === 'AUDIO'
  const isVideo = block.type === 'VIDEO'
  const isImage = block.type === 'IMAGE'

  const bgSrc = isImage ? url : isYt ? `https://img.youtube.com/vi/${ytId}/mqdefault.jpg` : null

  // Type-specific gradient backgrounds when no thumbnail
  const bgGradient = (() => {
    if (isVideo && !bgSrc)
      return `linear-gradient(145deg, ${accentColor}2a 0%, ${accentColor}10 100%)`
    if (isVimeoUrl && !bgSrc) return 'linear-gradient(145deg, #1ab7ea18 0%, #1ab7ea08 100%)'
    if (isAudio) return `linear-gradient(145deg, ${accentColor}22 0%, ${accentColor}0a 100%)`
    if (isPdf) {
      const fmt = detectDocFormat(block.mimeType, url)
      const c = FORMAT_COLORS[fmt]
      return `linear-gradient(145deg, ${c}18 0%, ${c}08 100%)`
    }
    return 'linear-gradient(145deg, #f1f5f9 0%, #e2e8f0 100%)'
  })()

  const label = block.caption || (isVideo ? 'Video' : isAudio ? 'Audio' : isPdf ? 'Document' : '')

  const typeLabel = isImage ? 'Photo' : isVideo ? 'Video' : isAudio ? 'Audio' : isPdf ? 'Doc' : ''

  const isFill = aspectRatio === 'none'

  return (
    <button
      type="button"
      onClick={onClick}
      className="dotly-thumb"
      style={{
        position: 'relative',
        width: '100%',
        ...(isFill
          ? { flex: 1, alignSelf: 'stretch', display: 'flex' }
          : { aspectRatio, display: 'block' }),
        background: bgGradient,
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        overflow: 'hidden',
      }}
    >
      {/* Background image */}
      {bgSrc && (
        <img
          src={bgSrc}
          alt={block.altText ?? label}
          loading="lazy"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      )}

      {/* Gradient scrim */}
      {bgSrc && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: isImage
              ? 'linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,0.52) 100%)'
              : 'rgba(0,0,0,0.22)',
          }}
        />
      )}

      {/* Centered icon: play, music, doc */}
      {isVideo && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <PlayIcon size={40} />
        </div>
      )}

      {isAudio && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Pulse ring */}
          <div
            style={{
              position: 'absolute',
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: accentColor,
              opacity: 0.25,
              animation: 'dotly-pulse-ring 2s ease-out infinite',
            }}
          />
          <div
            style={{
              width: 46,
              height: 46,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 16px ${accentColor}55`,
            }}
          >
            <MusicNoteIcon size={20} />
          </div>
        </div>
      )}

      {isPdf && <PdfPageThumb url={url} mimeType={block.mimeType} />}

      {/* Image placeholder when no src */}
      {isImage && !bgSrc && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ImagePlaceholderIcon size={32} />
        </div>
      )}

      {/* Type badge — top-left */}
      {typeLabel && (
        <div
          style={{
            position: 'absolute',
            top: 7,
            left: 7,
            background: 'rgba(0,0,0,0.42)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            borderRadius: 6,
            padding: '2px 6px',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 9,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.9)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {typeLabel}
          </p>
        </div>
      )}

      {/* Caption strip — bottom */}
      {label && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '14px 10px 8px',
            background: bgSrc
              ? 'linear-gradient(to top, rgba(0,0,0,0.62) 0%, transparent 100%)'
              : 'rgba(0,0,0,0.05)',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 600,
              color: bgSrc ? 'rgba(255,255,255,0.95)' : '#374151',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              textShadow: bgSrc ? '0 1px 4px rgba(0,0,0,0.5)' : 'none',
              lineHeight: 1.3,
            }}
          >
            {label}
          </p>
        </div>
      )}
    </button>
  )
}

// ── Lightbox content renderers ────────────────────────────────────────────────

function LightboxImage({ block }: { block: MediaBlockData }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <img
        src={block.url ?? undefined}
        alt={block.altText ?? block.caption ?? ''}
        style={{
          maxWidth: '100%',
          maxHeight: '75vh',
          objectFit: 'contain',
          borderRadius: 12,
          display: 'block',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}
      />
    </div>
  )
}

function LightboxVideo({ block, accentColor }: { block: MediaBlockData; accentColor: string }) {
  const url = block.url ?? ''
  const ytId = extractYouTubeId(url)
  const isVimeoUrl = isVimeo(url)
  const vimeoEmbed = isVimeoUrl ? vimeoEmbedUrl(url) : null
  const isDirectVideo =
    url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogg') || url.endsWith('.mov')

  if (ytId) {
    return (
      <div
        style={{
          position: 'relative',
          paddingBottom: '56.25%',
          width: '100%',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <iframe
          src={`https://www.youtube.com/embed/${ytId}?modestbranding=1&rel=0&autoplay=1`}
          title={block.caption ?? 'YouTube video'}
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
        />
      </div>
    )
  }

  if (vimeoEmbed) {
    return (
      <div
        style={{
          position: 'relative',
          paddingBottom: '56.25%',
          width: '100%',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <iframe
          src={`${vimeoEmbed}?autoplay=1`}
          title={block.caption ?? 'Vimeo video'}
          allowFullScreen
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
        />
      </div>
    )
  }

  if (isDirectVideo) {
    return (
      // eslint-disable-next-line jsx-a11y/media-has-caption
      <video
        controls
        autoPlay
        preload="metadata"
        style={{
          width: '100%',
          maxHeight: '70vh',
          borderRadius: 12,
          background: '#000',
          display: 'block',
        }}
      >
        <source src={url} />
      </video>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}bb 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 8px 28px ${accentColor}55`,
        }}
      >
        <PlayIcon size={32} />
      </div>
      <p style={{ margin: 0, color: 'white', fontWeight: 700, fontSize: 17, textAlign: 'center' }}>
        {block.caption || 'Watch video'}
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          background: accentColor,
          color: 'white',
          padding: '12px 28px',
          borderRadius: 12,
          fontWeight: 700,
          fontSize: 14,
          textDecoration: 'none',
          boxShadow: `0 4px 16px ${accentColor}55`,
        }}
      >
        Open link
      </a>
    </div>
  )
}

function LightboxAudio({ block, accentColor }: { block: MediaBlockData; accentColor: string }) {
  const url = block.url ?? ''

  if (isSpotify(url)) {
    const embed = spotifyEmbedUrl(url)
    if (embed) {
      return (
        <iframe
          src={`${embed}?utm_source=generator&theme=0`}
          width="100%"
          height="352"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          title={block.caption ?? 'Spotify'}
          style={{ border: 'none', borderRadius: 12, display: 'block' }}
        />
      )
    }
  }

  if (url.toLowerCase().includes('soundcloud.com')) {
    return (
      <iframe
        width="100%"
        height="166"
        scrolling="no"
        allow="autoplay"
        src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23${accentColor.replace('#', '')}&auto_play=true&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false`}
        title={block.caption ?? 'SoundCloud'}
        style={{ border: 'none', borderRadius: 12, display: 'block' }}
      />
    )
  }

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${accentColor}20 0%, ${accentColor}08 100%)`,
        border: `1px solid ${accentColor}28`,
        borderRadius: 20,
        padding: '28px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        alignItems: 'center',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 18,
          background: `linear-gradient(135deg, ${accentColor} 0%, ${accentColor}cc 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 8px 28px ${accentColor}55`,
        }}
      >
        <MusicNoteIcon size={28} />
      </div>
      {block.caption && (
        <p
          style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'white', textAlign: 'center' }}
        >
          {block.caption}
        </p>
      )}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        controls
        autoPlay
        src={url}
        preload="metadata"
        style={{ width: '100%', outline: 'none', borderRadius: 8 }}
      />
    </div>
  )
}

function LightboxPdf({ block }: { block: MediaBlockData }) {
  const url = block.url ?? ''
  const isGoogleDoc = url.includes('docs.google.com') || url.includes('slides.google.com')
  const previewUrl = isGoogleDoc
    ? url.includes('/pub')
      ? url
      : url.replace(/\/edit.*$/, '/preview')
    : url

  return (
    <div
      style={{
        width: '100%',
        height: '70vh',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
      }}
    >
      <iframe
        src={previewUrl}
        title={block.caption ?? 'Document'}
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
        allow="autoplay"
      />
    </div>
  )
}

// ── Lightbox overlay ──────────────────────────────────────────────────────────

interface LightboxProps {
  blocks: MediaBlockData[]
  initialIndex: number
  accentColor: string
  onClose: () => void
}

function Lightbox({ blocks, initialIndex, accentColor, onClose }: LightboxProps) {
  const [index, setIndex] = useState(initialIndex)
  const block = blocks[index]
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), [])
  const next = useCallback(
    () => setIndex((i) => Math.min(blocks.length - 1, i + 1)),
    [blocks.length],
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, prev, next])

  // Prevent body scroll while lightbox is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  if (!block) return null

  const hasMultiple = blocks.length > 1
  const isImg = block.type === 'IMAGE'
  const blurBg = isImg && block.url

  function handleTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    if (!t) return
    touchStartX.current = t.clientX
    touchStartY.current = t.clientY
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const t = e.changedTouches[0]
    if (!t || touchStartX.current === null || touchStartY.current === null) return
    const dx = t.clientX - touchStartX.current
    const dy = t.clientY - touchStartY.current
    // Only swipe horizontally (must exceed 48px, horizontal > vertical)
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next()
      else prev()
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  const typeLabel =
    block.type === 'IMAGE'
      ? 'Photo'
      : block.type === 'VIDEO'
        ? 'Video'
        : block.type === 'AUDIO'
          ? 'Audio'
          : 'Document'

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        animation: 'dotly-lb-backdrop-in 0.22s ease forwards',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      />

      {/* Blurred image backdrop for photos */}
      {blurBg && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${block.url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.12,
            filter: 'blur(40px)',
            transform: 'scale(1.1)',
          }}
        />
      )}

      {/* Top bar: type label + counter + close */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 10001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)',
        }}
      >
        <div
          style={{
            background: 'rgba(255,255,255,0.14)',
            backdropFilter: 'blur(8px)',
            borderRadius: 8,
            padding: '4px 10px',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 11,
              fontWeight: 700,
              color: 'rgba(255,255,255,0.9)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            {typeLabel}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {hasMultiple && (
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>
              {index + 1} / {blocks.length}
            </p>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.14)',
              backdropFilter: 'blur(8px)',
              border: 'none',
              borderRadius: 10,
              width: 38,
              height: 38,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            aria-label="Close"
          >
            <CloseIcon size={17} />
          </button>
        </div>
      </div>

      {/* Prev/next arrows */}
      {hasMultiple && index > 0 && (
        <button
          type="button"
          onClick={prev}
          className="dotly-lb-arrow"
          style={{
            position: 'fixed',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.14)',
            border: 'none',
            borderRadius: 12,
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10001,
          }}
          aria-label="Previous"
        >
          <ChevronLeftIcon size={22} />
        </button>
      )}
      {hasMultiple && index < blocks.length - 1 && (
        <button
          type="button"
          onClick={next}
          className="dotly-lb-arrow"
          style={{
            position: 'fixed',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(255,255,255,0.14)',
            border: 'none',
            borderRadius: 12,
            width: 44,
            height: 44,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10001,
          }}
          aria-label="Next"
        >
          <ChevronRightIcon size={22} />
        </button>
      )}

      {/* Content area */}
      <div
        key={index}
        style={{
          position: 'relative',
          zIndex: 10000,
          width: '100%',
          maxWidth: 580,
          padding: '72px 16px 80px',
          boxSizing: 'border-box',
          overflowY: 'auto',
          maxHeight: '100vh',
          animation: 'dotly-lb-content-in 0.26s cubic-bezier(.34,1.4,.64,1) forwards',
        }}
      >
        {block.type === 'IMAGE' && <LightboxImage block={block} />}
        {block.type === 'VIDEO' && <LightboxVideo block={block} accentColor={accentColor} />}
        {block.type === 'AUDIO' && <LightboxAudio block={block} accentColor={accentColor} />}
        {block.type === 'DOCUMENT' && <LightboxPdf block={block} />}

        {block.caption && block.type !== 'DOCUMENT' && (
          <p
            style={{
              marginTop: 14,
              textAlign: 'center',
              fontSize: 13,
              color: 'rgba(255,255,255,0.65)',
              fontStyle: 'italic',
              lineHeight: 1.5,
            }}
          >
            {block.caption}
          </p>
        )}
      </div>

      {/* Dot indicators */}
      {hasMultiple && (
        <div
          style={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 5,
            alignItems: 'center',
            zIndex: 10001,
          }}
        >
          {blocks.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              style={{
                width: i === index ? 22 : 6,
                height: 6,
                borderRadius: 3,
                background: i === index ? accentColor : 'rgba(255,255,255,0.28)',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.22s cubic-bezier(.34,1.56,.64,1)',
              }}
              aria-label={`Go to item ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Group header ──────────────────────────────────────────────────────────────

function GroupHeader({ name, accentColor }: { name: string; accentColor: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, marginTop: 2 }}>
      {/* Pill badge */}
      <div
        style={{
          flexShrink: 0,
          background: `linear-gradient(135deg, ${accentColor}22 0%, ${accentColor}10 100%)`,
          border: `1px solid ${accentColor}30`,
          borderRadius: 20,
          padding: '3px 10px',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: accentColor,
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </p>
      </div>
      <div
        style={{
          flex: 1,
          height: 1,
          background: `linear-gradient(to right, ${accentColor}28, transparent)`,
        }}
      />
    </div>
  )
}

// ── Downloads section header ──────────────────────────────────────────────────

function DownloadsSectionHeader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, marginTop: 2 }}>
      <div
        style={{
          flexShrink: 0,
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          border: '1px solid #fbbf2440',
          borderRadius: 20,
          padding: '3px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}
      >
        <DownloadIcon size={10} color="#b45309" />
        <p
          style={{
            margin: 0,
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#b45309',
            whiteSpace: 'nowrap',
          }}
        >
          Downloads
        </p>
      </div>
      <div
        style={{
          flex: 1,
          height: 1,
          background: 'linear-gradient(to right, #fbbf2440, transparent)',
        }}
      />
    </div>
  )
}

// ── Document card (downloads section) ────────────────────────────────────────

function DocumentBlock({ block, accentColor }: { block: MediaBlockData; accentColor: string }) {
  const url = block.url ?? ''
  const isGoogleDoc = url.includes('docs.google.com') || url.includes('slides.google.com')

  if (isGoogleDoc) {
    const previewUrl = url.includes('/pub') ? url : url.replace(/\/edit.*$/, '/preview')
    return (
      <div
        style={{ borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}
      >
        <iframe
          src={previewUrl}
          title={block.caption ?? 'Document'}
          loading="lazy"
          style={{ width: '100%', height: 280, border: 'none', display: 'block' }}
          allow="autoplay"
        />
        {block.caption && (
          <div
            style={{ padding: '8px 14px', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}
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
  const fmtColor = FORMAT_COLORS[format]
  const fmtGradient = FORMAT_GRADIENTS[format]

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
      className="dotly-doc-card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        background: fmtGradient,
        border: `1.5px solid ${fmtColor}22`,
        borderRadius: 16,
        textDecoration: 'none',
        color: '#1f2937',
        cursor: 'pointer',
      }}
    >
      {/* Icon with glow */}
      <div
        style={{
          flexShrink: 0,
          filter: `drop-shadow(0 4px 10px ${fmtColor}44)`,
        }}
      >
        <DocFormatIcon format={format} size={44} />
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 700,
            color: '#111827',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            lineHeight: 1.35,
          }}
        >
          {title}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 4 }}>
          <span
            style={{
              display: 'inline-block',
              background: fmtColor,
              color: 'white',
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.05em',
              padding: '2px 6px',
              borderRadius: 5,
              lineHeight: 1.6,
            }}
          >
            {ext}
          </span>
          {block.fileSize ? (
            <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>
              {formatFileSize(block.fileSize)}
            </span>
          ) : null}
        </div>
      </div>

      {/* Download arrow with accent ring */}
      <div
        style={{
          flexShrink: 0,
          width: 34,
          height: 34,
          borderRadius: 10,
          background: `${fmtColor}14`,
          border: `1.5px solid ${fmtColor}28`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <DownloadIcon size={15} color={fmtColor} />
      </div>
    </a>
  )
}

// ── Main exported component ────────────────────────────────────────────────────

export interface MediaBlockListProps {
  blocks: MediaBlockData[]
  accentColor: string
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
  const [lightbox, setLightbox] = useState<{ groupBlocks: MediaBlockData[]; index: number } | null>(
    null,
  )

  // Inject styles once on mount
  useEffect(() => {
    injectStyles()
  }, [])

  const sorted = [...blocks].sort((a, b) => a.displayOrder - b.displayOrder)

  // Separate downloads from media groups
  const docBlocks = sorted.filter(
    (b) => b.type === 'DOCUMENT' && (b.groupId === DOCS_GROUP_ID || !b.groupId),
  )
  const mediaOnlyBlocks = sorted.filter(
    (b) => !(b.type === 'DOCUMENT' && (b.groupId === DOCS_GROUP_ID || !b.groupId)),
  )

  // Build named media groups
  const groupMap = new Map<string, ParsedGroup>()
  const groupOrder: string[] = []

  for (const b of mediaOnlyBlocks) {
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
  const singleDefaultGroup = mediaGroups.length === 1 && mediaGroups[0]?.id === DEFAULT_GROUP_ID

  // Suppress darkBackground lint — kept in props for API compat but not needed with current design
  void darkBackground

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ── Media groups ── */}
      {hasGroups &&
        mediaGroups.map((group) => (
          <div key={group.id}>
            {!singleDefaultGroup && <GroupHeader name={group.name} accentColor={accentColor} />}
            <MosaicGrid
              blocks={group.blocks}
              accentColor={accentColor}
              onOpen={(i) => setLightbox({ groupBlocks: group.blocks, index: i })}
            />
          </div>
        ))}

      {/* ── Downloads ── */}
      {hasDocs && (
        <div>
          {hasGroups && <div style={{ height: 4 }} />}
          <DownloadsSectionHeader />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {docBlocks.map((block) => (
              <DocumentBlock key={block.id} block={block} accentColor={accentColor} />
            ))}
          </div>
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightbox && (
        <Lightbox
          blocks={lightbox.groupBlocks}
          initialIndex={lightbox.index}
          accentColor={accentColor}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  )
}
