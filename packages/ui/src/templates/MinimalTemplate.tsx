import React from 'react'
import type { CardRendererProps } from '@dotly/types'
import { AvatarBlock } from '../components/AvatarBlock'
import { SocialLinkList } from '../components/SocialLinkList'
import { SaveContactButton } from '../components/SaveContactButton'
import { LeadCaptureButton } from '../components/LeadCaptureButton'

/** Shared contact row for Minimal */
function ContactRow({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        borderRadius: 12,
        background: '#f8fafc',
        border: '1px solid #f1f5f9',
        textDecoration: 'none',
        color: '#374151',
        fontSize: 14,
        transition: 'background 0.12s',
      }}
    >
      <span style={{ flexShrink: 0, color: '#6b7280' }}>{icon}</span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </a>
  )
}

export function MinimalTemplate({
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

  const hasContact = fields.phone || fields.email || fields.website || fields.address

  return (
    <div
      style={{
        fontFamily: theme.fontFamily || 'Inter, sans-serif',
        background: '#ffffff',
        width: '100%',
        color: '#1a1a1a',
        minHeight: 300,
      }}
    >
      {/* ── Hero header — colored top bar + avatar ── */}
      <div style={{ position: 'relative', background: primary, paddingBottom: 52 }}>
        {/* Subtle pattern overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.15) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ padding: '32px 24px 0', textAlign: 'center', position: 'relative' }}>
          {/* Name + title over the color band */}
          <h1
            style={{
              color: '#fff',
              fontSize: 26,
              fontWeight: 800,
              margin: '0 0 4px',
              letterSpacing: '-0.3px',
              lineHeight: 1.2,
              textShadow: '0 1px 4px rgba(0,0,0,0.15)',
            }}
          >
            {fields.name || 'Your Name'}
          </h1>
          {fields.title && (
            <p
              style={{
                color: 'rgba(255,255,255,0.85)',
                fontSize: 15,
                margin: '0 0 2px',
                fontWeight: 500,
              }}
            >
              {fields.title}
            </p>
          )}
          {fields.company && (
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, margin: '0 0 16px' }}>
              {fields.company}
            </p>
          )}
        </div>
      </div>

      {/* ── Avatar — floated to overlap the color band ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: -48,
          marginBottom: 12,
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div
          style={{
            padding: 4,
            background: '#fff',
            borderRadius: '50%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          }}
        >
          <AvatarBlock
            avatarUrl={fields.avatarUrl}
            name={fields.name || 'User'}
            size={88}
            primaryColor={primary}
          />
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '0 20px 24px' }}>
        {/* Bio */}
        {fields.bio && (
          <p
            style={{
              fontSize: 14,
              color: '#4b5563',
              lineHeight: 1.7,
              margin: '0 0 20px',
              textAlign: 'center',
            }}
          >
            {fields.bio}
          </p>
        )}

        {/* Contact rows */}
        {hasContact && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {fields.phone && (
              <ContactRow
                href={`tel:${fields.phone}`}
                icon={
                  <svg
                    width="15"
                    height="15"
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
                label={fields.phone}
              />
            )}
            {fields.email && (
              <ContactRow
                href={`mailto:${fields.email}`}
                icon={
                  <svg
                    width="15"
                    height="15"
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
                label={fields.email}
              />
            )}
            {fields.website && (
              <ContactRow
                href={fields.website}
                icon={
                  <svg
                    width="15"
                    height="15"
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
                label={fields.website.replace(/^https?:\/\//, '')}
              />
            )}
            {fields.address && (
              <ContactRow
                href={`https://maps.google.com/?q=${encodeURIComponent(fields.address)}`}
                icon={
                  <svg
                    width="15"
                    height="15"
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
                label={fields.address}
              />
            )}
          </div>
        )}

        {/* Divider */}
        {(socialLinks?.length ?? 0) > 0 && (
          <div style={{ height: 1, background: '#f1f5f9', marginBottom: 16 }} />
        )}

        {/* Social links */}
        <div style={{ marginBottom: 20 }}>
          <SocialLinkList
            socialLinks={socialLinks}
            onSocialLinkClick={onSocialLinkClick}
            accentColor={primary}
            style="pills"
          />
        </div>

        {/* Media blocks */}
        {mediaBlocks && mediaBlocks.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            {[...mediaBlocks]
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((block) => (
                <div
                  key={block.id}
                  style={{
                    marginBottom: 12,
                    borderRadius: 14,
                    overflow: 'hidden',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                  }}
                >
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
                    <p
                      style={{ fontSize: 12, color: '#9ca3af', margin: '6px 0 0', paddingLeft: 2 }}
                    >
                      {block.caption}
                    </p>
                  )}
                </div>
              ))}
          </div>
        )}

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

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: 11, color: '#cbd5e1', marginTop: 20 }}>
          dotly.one/{card.handle}
        </p>
      </div>
    </div>
  )
}
