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

function DarkContactRow({
  href,
  svgPath,
  iconNode,
  label,
  primary,
}: {
  href: string
  svgPath?: string
  iconNode?: React.ReactNode
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
        alignItems: 'center',
        gap: 16,
        padding: '16px 20px',
        borderRadius: 18,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        textDecoration: 'none',
        color: '#e5e7eb',
        fontSize: 15,
        fontWeight: 500,
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 44,
          height: 44,
          borderRadius: 14,
          background: `linear-gradient(135deg, ${primary}12 0%, ${primary}04 100%)`,
          border: `1px solid ${primary}40`,
          boxShadow: `0 4px 16px ${primary}20`,
        }}
      >
        {iconNode ?? (
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke={primary}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={svgPath} />
          </svg>
        )}
      </div>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingTop: 2 }}>
        {label}
      </span>
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
        transition: 'all 0.2s ease',
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
          background: `linear-gradient(135deg, ${primary}25 0%, ${primary}05 100%)`,
          border: `1px solid ${primary}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 8px 16px ${primary}15`,
        }}
      >
        {iconNode}
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#e5e7eb' }}>{label}</span>
    </a>
  )
}

export function BoldTemplate({
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
  const primary = theme.primaryColor || '#0ea5e9'

  return (
    <div
      style={{
        fontFamily: theme.fontFamily || 'Inter, sans-serif',
        background: '#0f1117',
        width: '100%',
        color: '#f9fafb',
        minHeight: 300,
        overflow: 'hidden',
      }}
    >
      {/* ── Accent top bar with gradient ── */}
      <div
        style={{
          height: 6,
          background: `linear-gradient(90deg, ${primary} 0%, ${primary}88 100%)`,
        }}
      />

      {/* ── Header ── */}
      <div
        style={{
          position: 'relative',
          padding: '44px 24px 36px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: `radial-gradient(ellipse at top, rgba(255,255,255,0.05) 0%, transparent 70%), linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%)`,
        }}
      >
        {/* Radial glow */}
        <div
          style={{
            position: 'absolute',
            top: -100,
            right: -60,
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${primary}25 0%, transparent 70%)`,
            pointerEvents: 'none',
            filter: 'blur(30px)',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 24, position: 'relative' }}>
          <div
            style={{
              padding: 4,
              borderRadius: '50%',
              background: `linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.02) 100%)`,
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: `0 12px 40px ${primary}30`,
            }}
          >
            <div style={{ borderRadius: '50%', overflow: 'hidden' }}>
              <AvatarBlock
                avatarUrl={fields.avatarUrl}
                name={fields.name || 'User'}
                size={88}
                primaryColor={primary}
              />
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                fontSize: 32,
                fontWeight: 800,
                margin: '0 0 8px',
                color: '#ffffff',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                textWrap: 'balance',
              }}
            >
              {fields.name || 'Your Name'}
            </h1>
            {(fields.title || fields.company) && (
              <p
                style={{
                  fontSize: 14,
                  margin: 0,
                  fontWeight: 600,
                  lineHeight: 1.5,
                  letterSpacing: '0.01em',
                  textWrap: 'balance',
                }}
              >
                {[fields.title, fields.company]
                  .filter(Boolean)
                  .map((text, i, arr) => (
                    <span key={i} style={{ color: i === 0 ? primary : '#9ca3af' }}>
                      {text}
                      {i < arr.length - 1 && <span style={{ color: '#4b5563', margin: '0 6px' }}>//</span>}
                    </span>
                  ))}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '32px 24px 36px', display: 'flex', flexDirection: 'column', gap: 32 }}>
        {/* Bio */}
        {fields.bio && (
          <p style={{ fontSize: 15, color: '#9ca3af', lineHeight: 1.8, margin: 0, fontWeight: 400 }}>{fields.bio}</p>
        )}

        {/* Quick Actions (Call, Chat, Email) */}
        {(fields.phone || fields.whatsapp || fields.email) && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: -8 }}>
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

        {/* Contact */}
        {(fields.phone || fields.whatsapp || fields.email || fields.website || fields.address) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {fields.phone && (
              <DarkContactRow
                href={`tel:${fields.phone}`}
                svgPath="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6.53 6.53l1.62-1.62a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"
                label={fields.phone}
                primary={primary}
              />
            )}
            {fields.whatsapp && (
              <DarkContactRow
                href={`https://wa.me/${fields.whatsapp.replace(/\D/g, '')}`}
                iconNode={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill={primary}>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.556 4.116 1.527 5.845L.057 23.428a.75.75 0 0 0 .914.915l5.648-1.473A11.93 11.93 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.725 9.725 0 0 1-4.97-1.365l-.355-.21-3.685.96.983-3.596-.232-.371A9.718 9.718 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z" />
                  </svg>
                }
                label={fields.whatsapp}
                primary={primary}
              />
            )}
            {fields.email && (
              <DarkContactRow
                href={`mailto:${fields.email}`}
                svgPath="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6"
                label={fields.email}
                primary={primary}
              />
            )}
            {fields.website && (
              <DarkContactRow
                href={normalizeExternalUrl(fields.website)}
                svgPath="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
                label={fields.website.replace(/^https?:\/\//, '')}
                primary={primary}
              />
            )}
            {fields.address && (
              <DarkContactRow
                href={
                  fields.mapUrl
                    ? normalizeExternalUrl(fields.mapUrl)
                    : `https://maps.google.com/?q=${encodeURIComponent(fields.address)}`
                }
                svgPath="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z M15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0"
                label={fields.address}
                primary={primary}
              />
            )}
          </div>
        )}

        {/* Accent divider */}
        <div
          style={{
            height: 1,
            background: `linear-gradient(90deg, ${primary}44 0%, transparent 100%)`,
          }}
        />

        {/* Social links */}
        <SocialLinkList
          socialLinks={socialLinks}
          onSocialLinkClick={onSocialLinkClick}
          accentColor={primary}
          socialButtonStyle={theme.socialButtonStyle ?? 'follow'}
        />

        {/* Media blocks */}
        {mediaBlocks && mediaBlocks.length > 0 && (
          <div>
            <MediaBlockList blocks={mediaBlocks} accentColor={primary} darkBackground />
          </div>
        )}

        {/* CTA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 12 }}>
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

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <p style={{ fontSize: 13, color: '#4b5563', margin: 0, fontWeight: 600, letterSpacing: '0.04em' }}>
            dotly.one/{card.handle}
          </p>
        </div>
      </div>
    </div>
  )
}
