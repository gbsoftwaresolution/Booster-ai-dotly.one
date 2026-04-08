import React from 'react'
import type { CardRendererProps } from '@dotly/types'
import { AvatarBlock } from '../components/AvatarBlock'
import { SocialLinkList } from '../components/SocialLinkList'
import { SaveContactButton } from '../components/SaveContactButton'
import { LeadCaptureButton } from '../components/LeadCaptureButton'

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

  const hasContact = fields.phone || fields.email || fields.website

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
              style="icons"
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
                href={fields.website}
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
          </div>
        )}

        {/* ── Portfolio strip ── */}
        {mediaBlocks && mediaBlocks.length > 0 && (
          <div style={{ marginBottom: 22 }}>
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
                .map((block) => (
                  <div
                    key={block.id}
                    style={{
                      flexShrink: 0,
                      width: 110,
                      height: 110,
                      borderRadius: 14,
                      overflow: 'hidden',
                      background: '#e5e7eb',
                      position: 'relative',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.10)',
                    }}
                  >
                    {block.type === 'IMAGE' ? (
                      <img
                        src={block.url}
                        alt={block.caption ?? ''}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    ) : (
                      <>
                        {/* YouTube thumbnail */}
                        <img
                          src={`https://img.youtube.com/vi/${extractYouTubeId(block.url)}/mqdefault.jpg`}
                          alt={block.caption ?? 'video'}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                        <PlayOverlay />
                      </>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Divider */}
        <div style={{ height: 1, background: '#f1f5f9', marginBottom: 20 }} />

        {/* CTA buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <LeadCaptureButton onLeadCapture={onLeadCapture} mode={mode} primaryColor={primary} />
          <SaveContactButton
            card={card}
            handle={card.handle}
            onSaveContact={onSaveContact}
            primaryColor={primary}
          />
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#cbd5e1', marginTop: 20 }}>
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
    return u.searchParams.get('v') ?? ''
  } catch {
    return ''
  }
}
