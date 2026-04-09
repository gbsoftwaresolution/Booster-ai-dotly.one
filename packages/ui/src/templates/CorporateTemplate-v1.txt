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

function SidebarContactRow({
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
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        textDecoration: 'none',
        color: 'rgba(255,255,255,0.9)',
        fontSize: 12,
        fontWeight: 500,
        lineHeight: 1.4,
        padding: '6px 8px',
        margin: '0 -8px',
        borderRadius: 6,
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
      }}
    >
      <span
        style={{
          flexShrink: 0,
          color: 'rgba(255,255,255,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 16,
        }}
      >
        {icon}
      </span>
      <span style={{ wordBreak: 'break-word', letterSpacing: '-0.01em' }}>{label}</span>
    </a>
  )
}

function QuickActionButton({
  href,
  iconNode,
  label,
  primary,
}: {
  href: string
  iconNode: React.ReactNode
  label: string
  primary: string
}) {
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        textDecoration: 'none',
        transition: 'all 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: '#ffffff',
          border: '1px solid rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        {iconNode}
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>{label}</span>
    </a>
  )
}

export function CorporateTemplate({
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
  const primary = theme.primaryColor || '#0f172a'

  return (
    <div
      style={{
        fontFamily: theme.fontFamily || '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        background: '#ffffff',
        width: '100%',
        color: '#0f172a',
        minHeight: 300,
        overflow: 'hidden',
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
      }}
    >
      {/* ── Top accent bar ── */}
      <div
        style={{
          height: 6,
          background: `linear-gradient(90deg, ${primary} 0%, ${primary}CC 100%)`,
        }}
      />

      {/* ── Two-column header ── */}
      <div style={{ display: 'flex', minHeight: 200, background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        {/* LEFT — colored sidebar */}
        <div
          style={{
            width: 140,
            flexShrink: 0,
            background: `linear-gradient(160deg, ${primary} 0%, ${primary}E6 100%)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '32px 16px 28px',
            gap: 20,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: 'inset -2px 0 10px rgba(0,0,0,0.1)',
          }}
        >
          {/* Subtle radial highlight */}
          <div
            style={{
              position: 'absolute',
              top: -60,
              left: -60,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)',
              pointerEvents: 'none',
              filter: 'blur(20px)',
            }}
          />

          {/* Avatar with white ring */}
          <div
            style={{
              padding: 4,
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: '50%',
              position: 'relative',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            }}
          >
            <AvatarBlock
              avatarUrl={fields.avatarUrl}
              name={fields.name || 'User'}
              size={80}
              primaryColor={primary}
            />
          </div>

          {/* Contact details */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              width: '100%',
              marginTop: 8,
            }}
          >
            {fields.phone && (
              <SidebarContactRow
                href={`tel:${fields.phone}`}
                label={fields.phone}
                icon={
                  <svg
                    width="11"
                    height="11"
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
              <SidebarContactRow
                href={`https://wa.me/${fields.whatsapp.replace(/\D/g, '')}`}
                label={fields.whatsapp}
                icon={
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.556 4.116 1.527 5.845L.057 23.428a.75.75 0 0 0 .914.915l5.648-1.473A11.93 11.93 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.725 9.725 0 0 1-4.97-1.365l-.355-.21-3.685.96.983-3.596-.232-.371A9.718 9.718 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z" />
                  </svg>
                }
              />
            )}
            {fields.email && (
              <SidebarContactRow
                href={`mailto:${fields.email}`}
                label={fields.email}
                icon={
                  <svg
                    width="11"
                    height="11"
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
              <SidebarContactRow
                href={normalizeExternalUrl(fields.website)}
                label={fields.website.replace(/^https?:\/\//, '')}
                icon={
                  <svg
                    width="11"
                    height="11"
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
              <SidebarContactRow
                href={
                  fields.mapUrl
                    ? normalizeExternalUrl(fields.mapUrl)
                    : `https://maps.google.com/?q=${encodeURIComponent(fields.address)}`
                }
                label={fields.address}
                icon={
                  <svg
                    width="11"
                    height="11"
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
        </div>

        {/* RIGHT — identity + social */}
        <div
          style={{
            flex: 1,
            padding: '40px 32px 32px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            background: '#ffffff',
          }}
        >
          {/* Company logo */}
          {theme.logoUrl && (
            <img
              src={theme.logoUrl}
              alt="company logo"
              style={{
                height: 36,
                marginBottom: 20,
                objectFit: 'contain',
                alignSelf: 'flex-start',
              }}
            />
          )}

          {/* Company name */}
          {fields.company && (
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: primary,
                textTransform: 'uppercase',
                letterSpacing: 1.5,
                margin: '0 0 10px',
                opacity: 0.8,
              }}
            >
              {fields.company}
            </p>
          )}

          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: '#0f172a',
              margin: '0 0 8px',
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
            }}
          >
            {fields.name || 'Your Name'}
          </h1>

          {fields.title && (
            <p
              style={{
                fontSize: 15,
                color: '#64748b',
                margin: '0 0 24px',
                fontWeight: 500,
                letterSpacing: '-0.01em',
              }}
            >
              {fields.title}
            </p>
          )}

          {/* Social links — list style */}
          {(socialLinks?.length ?? 0) > 0 && (
            <SocialLinkList
              socialLinks={socialLinks}
              onSocialLinkClick={onSocialLinkClick}
              accentColor={primary}
              socialButtonStyle={theme.socialButtonStyle ?? 'follow'}
            />
          )}
        </div>
      </div>

      {/* ── Bottom section ── */}
      <div style={{ padding: '36px 32px 40px', background: '#f8fafc' }}>
        {/* Bio */}
        {fields.bio && (
          <p
            style={{
              fontSize: 15,
              color: '#475569',
              lineHeight: 1.6,
              margin: '0 0 32px',
              letterSpacing: '-0.01em',
              fontWeight: 400,
            }}
          >
            {fields.bio}
          </p>
        )}

        {/* Quick Actions (Call, Chat, Email) */}
        {(fields.phone || fields.whatsapp || fields.email) && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginBottom: 36 }}>
            {fields.phone && (
              <QuickActionButton
                href={`tel:${fields.phone}`}
                iconNode={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6.53 6.53l1.62-1.62a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>}
                label="Call"
                primary={primary}
              />
            )}
            {fields.whatsapp && (
              <QuickActionButton
                href={`https://wa.me/${fields.whatsapp.replace(/\D/g, '')}`}
                iconNode={<svg width="22" height="22" viewBox="0 0 24 24" fill={primary}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.556 4.116 1.527 5.845L.057 23.428a.75.75 0 0 0 .914.915l5.648-1.473A11.93 11.93 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.725 9.725 0 0 1-4.97-1.365l-.355-.21-3.685.96.983-3.596-.232-.371A9.718 9.718 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/></svg>}
                label="Chat"
                primary={primary}
              />
            )}
            {fields.email && (
              <QuickActionButton
                href={`mailto:${fields.email}`}
                iconNode={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6" /></svg>}
                label="Email"
                primary={primary}
              />
            )}
          </div>
        )}

        {/* Media blocks */}
        {mediaBlocks && mediaBlocks.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <MediaBlockList blocks={mediaBlocks} accentColor={primary} darkBackground={false} />
          </div>
        )}

        {/* CTA buttons — side by side */}
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <LeadCaptureButton
              onLeadCapture={onLeadCapture}
              mode={mode}
              primaryColor={primary}
              buttonStyle={theme.buttonStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <SaveContactButton
              card={card}
              handle={card.handle}
              onSaveContact={onSaveContact}
              primaryColor={primary}
              buttonStyle={theme.buttonStyle}
            />
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 500, color: '#94a3b8', marginTop: 24, letterSpacing: 0.5 }}>
          dotly.one/{card.handle}
        </p>
      </div>
    </div>
  )
}
