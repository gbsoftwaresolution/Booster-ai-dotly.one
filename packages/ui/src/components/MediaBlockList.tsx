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

  // Direct video file (.mp4, .webm, etc.) — use <video> not <iframe>
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

  // Unknown platform — show a styled open-link card rather than a broken iframe
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
          {/* External link icon */}
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

  // SoundCloud embed
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

  // Native audio player
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
          {/* Waveform icon */}
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

function DocumentBlock({ block, accentColor }: { block: MediaBlockData; accentColor: string }) {
  const url = block.url ?? ''
  // Google Docs / Slides — use their native preview embed
  const isGoogleDoc = url.includes('docs.google.com') || url.includes('slides.google.com')

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

  // PDF and everything else — download/open card
  const filename = (() => {
    try {
      return decodeURIComponent(url.split('/').pop() ?? 'document').replace(/\?.*$/, '')
    } catch {
      return 'document'
    }
  })()

  return (
    <a
      href={block.linkUrl || url || undefined}
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
        transition: 'all 0.12s',
      }}
    >
      {/* PDF icon */}
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
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
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
          {block.caption || filename}
        </p>
        <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Tap to open</p>
      </div>

      {/* Arrow */}
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

// ── Heading block ─────────────────────────────────────────────────────────────

function HeadingBlock({
  block,
  accentColor,
  captionColor,
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

function ImageGallery({ blocks, accentColor }: { blocks: MediaBlockData[]; accentColor: string }) {
  if (blocks.length === 1) {
    const block = blocks[0]!
    return (
      <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden' }}>
        <ImageBlock block={block} />
      </div>
    )
  }

  // 2-col mosaic — first image is tall on the left when odd count
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
        // Make the first item span 2 rows when count is odd for a hero effect
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

// ── Main exported component ────────────────────────────────────────────────────

export interface MediaBlockListProps {
  blocks: MediaBlockData[]
  accentColor: string
  /** true = dark background (BoldTemplate) → lighter caption text */
  darkBackground?: boolean
}

export function MediaBlockList({
  blocks,
  accentColor,
  darkBackground = false,
}: MediaBlockListProps) {
  const sorted = [...blocks].sort((a, b) => a.displayOrder - b.displayOrder)
  const captionColor = darkBackground ? '#cbd5e1' : '#6b7280'

  // ── Group consecutive IMAGE blocks into galleries ────────────────────────────
  type Group =
    | { kind: 'gallery'; items: MediaBlockData[] }
    | { kind: 'single'; item: MediaBlockData }

  const groups: Group[] = []

  for (const block of sorted) {
    if (block.type === 'IMAGE') {
      const last = groups[groups.length - 1]
      if (last?.kind === 'gallery') {
        last.items.push(block)
      } else {
        groups.push({ kind: 'gallery', items: [block] })
      }
    } else {
      // HEADING, VIDEO, AUDIO, DOCUMENT — all break gallery runs
      groups.push({ kind: 'single', item: block })
    }
  }

  return (
    <>
      {groups.map((group, i) => {
        // ── Gallery ─────────────────────────────────────────────────────────
        if (group.kind === 'gallery') {
          const sharedCaption = group.items.length > 1 ? undefined : group.items[0]?.caption

          return (
            <div key={`g-${i}`} style={{ marginBottom: 14 }}>
              <ImageGallery blocks={group.items} accentColor={accentColor} />
              {sharedCaption && <Caption text={sharedCaption} captionColor={captionColor} />}
            </div>
          )
        }

        // ── Single non-image block ───────────────────────────────────────────
        const { item } = group

        // Heading — renders as a section label, no card wrapper
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
              borderRadius: isAmbient ? 14 : 14,
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
      })}
    </>
  )
}
