import React from 'react'
import type { CardRendererProps } from '@dotly/types'
import { AvatarBlock } from '../components/AvatarBlock'
import { SocialLinkList } from '../components/SocialLinkList'
import { SaveContactButton } from '../components/SaveContactButton'
import { LeadCaptureButton } from '../components/LeadCaptureButton'
import { MediaBlockList } from '../components/MediaBlockList'

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
  primary,
}: {
  href: string
  icon: React.ReactNode
  label: string
  primary: string
}) {
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 20px',
        borderRadius: 100,
        background: '#ffffff',
        border: '1px solid rgba(0,0,0,0.04)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.03)',
        textDecoration: 'none',
        color: '#1f2937',
        fontSize: 15,
        fontWeight: 600,
        transition: 'all 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)'
        e.currentTarget.style.boxShadow = '0 10px 24px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.04)'
        e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)'
        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.03)'
        e.currentTarget.style.borderColor = 'rgba(0,0,0,0.04)'
      }}
    >
      <span style={{ color: primary, display: 'flex', alignItems: 'center' }}>{icon}</span>
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
        background: 'rgba(0,0,0,0.15)',
        transition: 'background 0.3s',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.25)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff" style={{ marginLeft: 3 }}>
          <polygon points="6,3 20,12 6,21" />
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
    : `radial-gradient(120% 120% at 50% 0%, ${primary} 0%, ${secondary} 70%, #000000 100%)`

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
        fontFamily: theme.fontFamily || '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Icons", "Helvetica Neue", Helvetica, Arial, sans-serif',
        width: '100%',
        color: '#1a1a1a',
        minHeight: 300,
        position: 'relative',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      }}
    >
      {/* ── Gradient / photo header ── */}
      <div
        style={{
          ...headerBg,
          position: 'relative',
          paddingBottom: 80, // space for the card to float up
        }}
      >
        {/* Overlay — subtle dark scrim for readability */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: theme.backgroundUrl
              ? 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.7) 100%)'
              : 'linear-gradient(to bottom, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.4) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Header content */}
        <div
          style={{
            position: 'relative',
            padding: '64px 24px 32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          {/* Avatar with Apple-style glass ring */}
          <div
            style={{
              padding: 6,
              background: 'rgba(255,255,255,0.2)',
              border: '0.5px solid rgba(255,255,255,0.5)',
              borderRadius: '50%',
              boxShadow: '0 16px 40px rgba(0,0,0,0.2), inset 0 2px 8px rgba(255,255,255,0.4)',
              marginBottom: 24,
              backdropFilter: 'blur(30px) saturate(200%)',
              WebkitBackdropFilter: 'blur(30px) saturate(200%)',
            }}
          >
            <AvatarBlock
              avatarUrl={fields.avatarUrl}
              name={fields.name || 'User'}
              size={120}
              primaryColor={secondary}
            />
          </div>

          <h1
            style={{
              fontFamily: theme.fontFamily || '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif',
              color: '#ffffff',
              fontSize: 36,
              fontWeight: 800,
              margin: '0 0 8px',
              letterSpacing: '-0.04em',
              lineHeight: 1.1,
              textShadow: '0 4px 16px rgba(0,0,0,0.2)',
              textWrap: 'balance',
            }}
          >
            {fields.name || 'Your Name'}
          </h1>
          {fields.title && (
            <p
              style={{
                color: 'rgba(255,255,255,0.9)',
                fontSize: 17,
                margin: '0 0 4px',
                fontWeight: 600,
                textShadow: '0 2px 8px rgba(0,0,0,0.15)',
                letterSpacing: '-0.01em',
                textWrap: 'balance',
              }}
            >
              {fields.title}
            </p>
          )}
          {fields.company && (
            <p
              style={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: 15,
                margin: '0 0 28px',
                fontWeight: 500,
                textShadow: '0 1px 4px rgba(0,0,0,0.1)',
                letterSpacing: '0.01em',
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
              accentColor="#ffffff"
              socialButtonStyle={theme.socialButtonStyle ?? 'follow'}
            />
          )}
        </div>
      </div>

      {/* ── White content card — slides up from below ── */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '40px 40px 0 0',
          marginTop: -64,
          position: 'relative',
          zIndex: 1,
          padding: '36px 24px 48px',
          boxShadow: '0 -24px 64px rgba(0,0,0,0.12), 0 -4px 20px rgba(0,0,0,0.06)',
          borderTop: '0.5px solid rgba(255,255,255,0.8)',
        }}
      >
        {/* Drag handle hint */}
        <div
          style={{
            width: 48,
            height: 5,
            background: 'rgba(0,0,0,0.12)',
            borderRadius: 4,
            margin: '0 auto 36px',
          }}
        />

        {/* Bio */}
        {fields.bio && (
          <p
            style={{
              fontSize: 17,
              color: '#334155',
              lineHeight: 1.5,
              letterSpacing: '-0.022em',
              margin: '0 0 36px',
              textAlign: 'center',
              fontWeight: 400,
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
              gap: 12,
              justifyContent: 'center',
              marginBottom: 36,
            }}
          >
            {fields.phone && (
              <ContactChip
                href={`tel:${fields.phone}`}
                label={fields.phone}
                primary={primary}
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
                primary={primary}
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
                primary={primary}
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
                primary={primary}
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
                primary={primary}
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

        {/* Media blocks */}
        {mediaBlocks && mediaBlocks.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <MediaBlockList blocks={mediaBlocks} accentColor={primary} />
          </div>
        )}

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '32px 0 24px' }} />

        {/* CTA buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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

