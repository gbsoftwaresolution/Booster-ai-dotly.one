import React from 'react'
import type { CardRendererProps } from '@dotly/types'
import { AvatarBlock } from '../components/AvatarBlock'
import { SocialLinkList } from '../components/SocialLinkList'
import { SaveContactButton } from '../components/SaveContactButton'
import { LeadCaptureButton } from '../components/LeadCaptureButton'

function DarkContactRow({
  href,
  svgPath,
  label,
  primary,
}: {
  href: string
  svgPath: string
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
        gap: 10,
        padding: '8px 12px',
        borderRadius: 10,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.08)',
        textDecoration: 'none',
        color: '#d1d5db',
        fontSize: 13,
        transition: 'background 0.12s',
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke={primary}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={svgPath} />
      </svg>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
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
          height: 5,
          background: `linear-gradient(90deg, ${primary} 0%, ${primary}88 100%)`,
        }}
      />

      {/* ── Header ── */}
      <div
        style={{
          position: 'relative',
          padding: '28px 24px 24px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Radial glow */}
        <div
          style={{
            position: 'absolute',
            top: -60,
            right: -60,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${primary}22 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 18, position: 'relative' }}>
          <AvatarBlock
            avatarUrl={fields.avatarUrl}
            name={fields.name || 'User'}
            size={78}
            primaryColor={primary}
          />
          <div style={{ minWidth: 0 }}>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 800,
                margin: '0 0 4px',
                color: '#f9fafb',
                letterSpacing: '-0.3px',
                lineHeight: 1.2,
              }}
            >
              {fields.name || 'Your Name'}
            </h1>
            {fields.title && (
              <p style={{ fontSize: 14, color: primary, margin: '0 0 2px', fontWeight: 600 }}>
                {fields.title}
              </p>
            )}
            {fields.company && (
              <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{fields.company}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '20px 24px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Bio */}
        {fields.bio && (
          <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.7, margin: 0 }}>{fields.bio}</p>
        )}

        {/* Contact */}
        {(fields.phone || fields.email || fields.website) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {fields.phone && (
              <DarkContactRow
                href={`tel:${fields.phone}`}
                svgPath="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6.53 6.53l1.62-1.62a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"
                label={fields.phone}
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
                href={fields.website}
                svgPath="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
                label={fields.website.replace(/^https?:\/\//, '')}
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
          style="pills"
        />

        {/* Media blocks */}
        {mediaBlocks && mediaBlocks.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[...mediaBlocks]
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((block) => (
                <div key={block.id} style={{ borderRadius: 14, overflow: 'hidden' }}>
                  {block.type === 'VIDEO' ? (
                    <iframe
                      src={block.url}
                      title={block.caption ?? 'video'}
                      allowFullScreen
                      style={{ width: '100%', height: 200, border: 'none', display: 'block' }}
                    />
                  ) : (
                    <img
                      src={block.url}
                      alt={block.caption ?? ''}
                      style={{ width: '100%', display: 'block' }}
                    />
                  )}
                  {block.caption && (
                    <p style={{ fontSize: 12, color: '#6b7280', margin: '6px 0 0' }}>
                      {block.caption}
                    </p>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* CTA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <LeadCaptureButton onLeadCapture={onLeadCapture} mode={mode} primaryColor={primary} />
          <SaveContactButton
            card={card}
            handle={card.handle}
            onSaveContact={onSaveContact}
            primaryColor={primary}
          />
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#374151', marginTop: 4 }}>
          dotly.one/{card.handle}
        </p>
      </div>
    </div>
  )
}
