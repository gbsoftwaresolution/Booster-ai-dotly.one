import React from 'react'
import type { CardRendererProps } from '@dotly/types'
import { AvatarBlock } from '../components/AvatarBlock'
import { SocialLinkList } from '../components/SocialLinkList'
import { SaveContactButton } from '../components/SaveContactButton'
import { LeadCaptureButton } from '../components/LeadCaptureButton'

/**
 * Normalize a user-entered URL:
 * - If it already has http:// or https://, return it unchanged.
 * - If it has a disallowed scheme (javascript:, data:, etc.), return '#'.
 * - Otherwise, prepend https://.
 */
function normalizeExternalUrl(url: string): string {
  if (!url) return '#'
  if (/^https?:\/\//i.test(url)) return url
  if (/^[a-z][a-z0-9+\-.]*:/i.test(url)) return '#' // block non-http schemes
  return `https://${url}`
}

function ContactChip({
  href,
  icon,
  label,
}: {
  href: string
  icon: React.ReactNode
  label: string
}) {
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: 20,
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        textDecoration: 'none',
        color: '#374151',
        fontSize: 13,
        fontWeight: 500,
        transition: 'background 0.12s',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ color: '#6b7280', display: 'flex', alignItems: 'center' }}>{icon}</span>
      {label}
    </a>
  )
}

/** Play button overlay for video thumbnails */
function PlayOverlay() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.42)',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.92)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#1f2937">
          <polygon points="5,3 19,12 5,21" />
        </svg>
      </div>
    </div>
  )
}

export function CreativeTemplate({
  card,
  theme,
  socialLinks,
  mediaBlocks,
  mode,
  onLeadCapture,
  onSaveContact,
  onSocialLinkClick,
}: CardRendererProps) {
  const fields = card.fields
  const primary = theme.primaryColor || '#6366f1'
  const secondary = theme.secondaryColor || '#f59e0b'

  const gradient = theme.backgroundUrl
    ? undefined
    : `linear-gradient(145deg, ${primary} 0%, ${secondary} 100%)`

  const headerBg: React.CSSProperties = theme.backgroundUrl
    ? {
        backgroundImage: `url(${theme.backgroundUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : { background: gradient }

  const hasContact =
    fields.phone || fields.whatsapp || fields.email || fields.website || fields.address

  return (
    <div
      style={{
        fontFamily: theme.fontFamily || 'Inter, sans-serif',
        width: '100%',
        color: '#1a1a1a',
        minHeight: 300,
        position: 'relative',
      }}
    >
      {/* ── Gradient / photo header ── */}
      <div
        style={{
          ...headerBg,
          position: 'relative',
          paddingBottom: 64, // space for the card to float up
        }}
      >
        {/* Overlay — subtle dark scrim for readability */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: theme.backgroundUrl
              ? 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 100%)'
              : 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.22) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Header content */}
        <div
          style={{
            position: 'relative',
            padding: '40px 24px 16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          {/* Avatar with white ring */}
          <div
            style={{
              padding: 3,
              background: 'rgba(255,255,255,0.85)',
              borderRadius: '50%',
              boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
              marginBottom: 16,
            }}
          >
            <AvatarBlock
              avatarUrl={fields.avatarUrl}
              name={fields.name || 'User'}
              size={92}
              primaryColor={secondary}
            />
          </div>

          <h1
            style={{
              color: '#ffffff',
              fontSize: 28,
              fontWeight: 800,
              margin: '0 0 4px',
              letterSpacing: '-0.4px',
              lineHeight: 1.15,
              textShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            {fields.name || 'Your Name'}
          </h1>
          {fields.title && (
            <p
              style={{
                color: 'rgba(255,255,255,0.9)',
                fontSize: 15,
                margin: '0 0 2px',
                fontWeight: 500,
                textShadow: '0 1px 4px rgba(0,0,0,0.2)',
              }}
            >
              {fields.title}
            </p>
          )}
          {fields.company && (
            <p
              style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: 13,
                margin: '0 0 20px',
                textShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}
            >
              {fields.company}
            </p>
          )}

          {/* Social links row — icon-only circles over gradient */}
          {(socialLinks?.length ?? 0) > 0 && (
            <SocialLinkList
              socialLinks={socialLinks}
              onSocialLinkClick={onSocialLinkClick}
              accentColor="rgba(255,255,255,0.92)"
              socialButtonStyle={theme.socialButtonStyle ?? 'follow'}
            />
          )}
        </div>
      </div>

      {/* ── White content card — slides up from below ── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '24px 24px 0 0',
          marginTop: -40,
          position: 'relative',
          zIndex: 1,
          padding: '28px 20px 28px',
        }}
      >
        {/* Drag handle hint */}
        <div
          style={{
            width: 36,
            height: 4,
            background: '#e2e8f0',
            borderRadius: 2,
            margin: '0 auto 24px',
          }}
        />

        {/* Bio */}
        {fields.bio && (
          <p
            style={{
              fontSize: 14,
              color: '#4b5563',
              lineHeight: 1.75,
              margin: '0 0 22px',
              textAlign: 'center',
            }}
          >
            {fields.bio}
          </p>
        )}

        {/* Contact chips — centered wrapping row */}
        {hasContact && (
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              justifyContent: 'center',
              marginBottom: 22,
            }}
          >
            {fields.phone && (
              <ContactChip
                href={`tel:${fields.phone}`}
                label={fields.phone}
                icon={
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6.53 6.53l1.62-1.62a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                }
              />
            )}
            {fields.whatsapp && (
              <ContactChip
                href={`https://wa.me/${fields.whatsapp.replace(/\D/g, '')}`}
                label={fields.whatsapp}
                icon={
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.556 4.116 1.527 5.845L.057 23.428a.75.75 0 0 0 .914.915l5.648-1.473A11.93 11.93 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.725 9.725 0 0 1-4.97-1.365l-.355-.21-3.685.96.983-3.596-.232-.371A9.718 9.718 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z" />
                  </svg>
                }
              />
            )}
            {fields.email && (
              <ContactChip
                href={`mailto:${fields.email}`}
                label={fields.email}
                icon={
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                }
              />
            )}
            {fields.website && (
              <ContactChip
                href={normalizeExternalUrl(fields.website)}
                label={fields.website.replace(/^https?:\/\//, '')}
                icon={
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                }
              />
            )}
            {fields.address && (
              <ContactChip
                href={
                  fields.mapUrl
                    ? normalizeExternalUrl(fields.mapUrl)
                    : `https://maps.google.com/?q=${encodeURIComponent(fields.address)}`
                }
                label={fields.address}
                icon={
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                }
              />
            )}
          </div>
        )}

        {/* ── Portfolio strip ── */}
        {mediaBlocks && mediaBlocks.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            {/* Section heading: use HEADING blocks if present, else fall back to "Portfolio" */}
            {(() => {
              const headingBlocks = [...mediaBlocks]
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .filter((b) => b.type === 'HEADING')
              if (headingBlocks.length > 0) {
                return headingBlocks.map((hb) => (
                  <p
                    key={hb.id}
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: primary,
                      textTransform: 'uppercase',
                      letterSpacing: 1.2,
                      marginBottom: 10,
                    }}
                  >
                    {hb.caption || 'Section'}
                  </p>
                ))
              }
              return (
                <p
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: 1.2,
                    marginBottom: 10,
                  }}
                >
                  Portfolio
                </p>
              )
            })()}
            <div
              style={{
                display: 'flex',
                gap: 10,
                overflowX: 'auto',
                paddingBottom: 4,
                // hide scrollbar visually but keep scrollable
                msOverflowStyle: 'none',
              }}
            >
              {[...mediaBlocks]
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .filter((block) => block.type !== 'HEADING')
                .map((block) => {
                  const tileStyle: React.CSSProperties = {
                    flexShrink: 0,
                    width: 110,
                    height: 110,
                    borderRadius: 14,
                    overflow: 'hidden',
                    background: '#e5e7eb',
                    position: 'relative',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.10)',
                  }

                  if (block.type === 'IMAGE') {
                    const content = (
                      <img
                        src={block.url ?? undefined}
                        alt={block.altText ?? block.caption ?? ''}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    )
                    return (
                      <div key={block.id} style={tileStyle}>
                        {block.linkUrl ? (
                          <a
                            href={block.linkUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'block', width: '100%', height: '100%' }}
                          >
                            {content}
                          </a>
                        ) : (
                          content
                        )}
                      </div>
                    )
                  }

                  if (block.type === 'VIDEO') {
                    const videoUrl = block.url ?? undefined
                    const thumbUrl = getVideoThumbnail(block.url ?? '')
                    return (
                      <a
                        key={block.id}
                        href={videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={block.caption ?? 'Watch video'}
                        aria-label={block.caption ?? 'Watch video'}
                        style={{ ...tileStyle, display: 'block', textDecoration: 'none' }}
                      >
                        {thumbUrl ? (
                          <img
                            src={thumbUrl}
                            alt={block.caption ?? 'video thumbnail'}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block',
                            }}
                            onError={(e) => {
                              // Hide broken thumbnail; play overlay + background remain visible
                              ;(e.target as HTMLImageElement).style.display = 'none'
                            }}
                          />
                        ) : (
                          /* Generic video icon for non-YouTube/Vimeo URLs */
                          <div
                            style={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: '#1e293b',
                            }}
                          >
                            <svg
                              width="32"
                              height="32"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="rgba(255,255,255,0.7)"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                              <line x1="7" y1="2" x2="7" y2="22" />
                              <line x1="17" y1="2" x2="17" y2="22" />
                              <line x1="2" y1="12" x2="22" y2="12" />
                              <line x1="2" y1="7" x2="7" y2="7" />
                              <line x1="2" y1="17" x2="7" y2="17" />
                              <line x1="17" y1="17" x2="22" y2="17" />
                              <line x1="17" y1="7" x2="22" y2="7" />
                            </svg>
                          </div>
                        )}
                        <PlayOverlay />
                      </a>
                    )
                  }

                  if (block.type === 'AUDIO') {
                    return (
                      <a
                        key={block.id}
                        href={block.url ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={block.caption ?? 'Audio'}
                        style={{
                          ...tileStyle,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          background: '#f1f5f9',
                          textDecoration: 'none',
                        }}
                      >
                        <svg
                          width="28"
                          height="28"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={secondary}
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M9 18V5l12-2v13" />
                          <circle cx="6" cy="18" r="3" />
                          <circle cx="18" cy="16" r="3" />
                        </svg>
                        {block.caption && (
                          <span
                            style={{
                              fontSize: 10,
                              color: '#64748b',
                              textAlign: 'center',
                              padding: '0 6px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: '100%',
                            }}
                          >
                            {block.caption}
                          </span>
                        )}
                      </a>
                    )
                  }

                  // DOCUMENT
                  return (
                    <a
                      key={block.id}
                      href={block.url ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={block.caption ?? 'Document'}
                      style={{
                        ...tileStyle,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        background: '#f1f5f9',
                        textDecoration: 'none',
                      }}
                    >
                      <svg
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke={secondary}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                      {block.caption && (
                        <span
                          style={{
                            fontSize: 10,
                            color: '#64748b',
                            textAlign: 'center',
                            padding: '0 6px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '100%',
                          }}
                        >
                          {block.caption}
                        </span>
                      )}
                    </a>
                  )
                })}
            </div>
          </div>
        )}

        {/* Divider */}
        <div style={{ height: 1, background: '#f1f5f9', marginBottom: 20 }} />

        {/* CTA buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <LeadCaptureButton
            onLeadCapture={onLeadCapture}
            mode={mode}
            primaryColor={primary}
            buttonStyle={theme.buttonStyle}
          />
          <SaveContactButton
            card={card}
            handle={card.handle}
            onSaveContact={onSaveContact}
            primaryColor={primary}
            buttonStyle={theme.buttonStyle}
          />
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 20 }}>
          dotly.one/{card.handle}
        </p>
      </div>
    </div>
  )
}

function extractYouTubeId(url: string): string {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1)
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v') ?? ''
    return ''
  } catch {
    return ''
  }
}

function extractVimeoId(url: string): string {
  try {
    const u = new URL(url)
    if (u.hostname.includes('vimeo.com')) {
      // pathname is like /123456789 or /channels/foo/123456789
      const parts = u.pathname.split('/').filter(Boolean)
      // last numeric segment is the video ID
      for (let i = parts.length - 1; i >= 0; i--) {
        const part = parts[i]
        if (part && /^\d+$/.test(part)) return part
      }
    }
    return ''
  } catch {
    return ''
  }
}

/**
 * Returns a thumbnail URL for a video URL, or null if none can be derived.
 * YouTube  → img.youtube.com/vi/{id}/mqdefault.jpg
 * Vimeo    → vumbnail.com/{id}.jpg  (free Vimeo thumbnail proxy)
 * Other    → null (caller should show a generic icon)
 */
function getVideoThumbnail(url: string): string | null {
  if (!url) return null
  const ytId = extractYouTubeId(url)
  if (ytId) return `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`
  const vimeoId = extractVimeoId(url)
  if (vimeoId) return `https://vumbnail.com/${vimeoId}.jpg`
  return null
}
