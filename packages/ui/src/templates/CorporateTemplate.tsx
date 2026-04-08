import React from 'react'
import type { CardRendererProps } from '@dotly/types'
import { AvatarBlock } from '../components/AvatarBlock'
import { SocialLinkList } from '../components/SocialLinkList'
import { SaveContactButton } from '../components/SaveContactButton'
import { LeadCaptureButton } from '../components/LeadCaptureButton'

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
        alignItems: 'flex-start',
        gap: 8,
        textDecoration: 'none',
        color: 'rgba(255,255,255,0.75)',
        fontSize: 12,
        lineHeight: 1.4,
        wordBreak: 'break-all',
        padding: '4px 0',
      }}
    >
      <span
        style={{
          flexShrink: 0,
          marginTop: 1,
          color: 'rgba(255,255,255,0.5)',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {icon}
      </span>
      <span>{label}</span>
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
        fontFamily: theme.fontFamily || 'Inter, sans-serif',
        background: '#ffffff',
        width: '100%',
        color: '#1a1a1a',
        minHeight: 300,
        overflow: 'hidden',
      }}
    >
      {/* ── Top accent bar ── */}
      <div
        style={{
          height: 5,
          background: `linear-gradient(90deg, ${primary} 0%, ${primary}99 100%)`,
        }}
      />

      {/* ── Two-column header ── */}
      <div style={{ display: 'flex', minHeight: 180 }}>
        {/* LEFT — colored sidebar */}
        <div
          style={{
            width: 140,
            flexShrink: 0,
            background: primary,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '28px 12px 24px',
            gap: 16,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle radial highlight */}
          <div
            style={{
              position: 'absolute',
              top: -40,
              left: -40,
              width: 160,
              height: 160,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.07)',
              pointerEvents: 'none',
            }}
          />

          {/* Avatar with white ring */}
          <div
            style={{
              padding: 3,
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '50%',
              position: 'relative',
            }}
          >
            <AvatarBlock
              avatarUrl={fields.avatarUrl}
              name={fields.name || 'User'}
              size={72}
              primaryColor={primary}
            />
          </div>

          {/* Sidebar divider */}
          <div
            style={{
              width: '80%',
              height: 1,
              background: 'rgba(255,255,255,0.15)',
            }}
          />

          {/* Contact details */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              width: '100%',
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
                href={fields.website}
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
                href={`https://maps.google.com/?q=${encodeURIComponent(fields.address)}`}
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
            padding: '22px 20px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          {/* Company logo */}
          {theme.logoUrl && (
            <img
              src={theme.logoUrl}
              alt="company logo"
              style={{
                height: 28,
                marginBottom: 10,
                objectFit: 'contain',
                alignSelf: 'flex-start',
              }}
            />
          )}

          {/* Company name */}
          {fields.company && (
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: primary,
                textTransform: 'uppercase',
                letterSpacing: 1.2,
                margin: '0 0 6px',
                opacity: 0.7,
              }}
            >
              {fields.company}
            </p>
          )}

          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: primary,
              margin: '0 0 4px',
              lineHeight: 1.2,
              letterSpacing: '-0.3px',
            }}
          >
            {fields.name || 'Your Name'}
          </h1>

          {fields.title && (
            <p
              style={{
                fontSize: 13,
                color: '#64748b',
                margin: '0 0 16px',
                fontWeight: 500,
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
              style="list"
            />
          )}
        </div>
      </div>

      {/* ── Bottom section ── */}
      <div style={{ padding: '20px 20px 24px' }}>
        {/* Bio */}
        {fields.bio && (
          <p
            style={{
              fontSize: 14,
              color: '#374151',
              lineHeight: 1.75,
              margin: '0 0 20px',
            }}
          >
            {fields.bio}
          </p>
        )}

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
                    borderRadius: 12,
                    overflow: 'hidden',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                    border: '1px solid #f1f5f9',
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
                      style={{
                        fontSize: 12,
                        color: '#94a3b8',
                        margin: 0,
                        padding: '6px 10px',
                        background: '#f8fafc',
                      }}
                    >
                      {block.caption}
                    </p>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* CTA buttons — side by side */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <LeadCaptureButton onLeadCapture={onLeadCapture} mode={mode} primaryColor={primary} />
          </div>
          <div style={{ flex: 1 }}>
            <SaveContactButton
              card={card}
              handle={card.handle}
              onSaveContact={onSaveContact}
              primaryColor={primary}
            />
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#cbd5e1', marginTop: 18 }}>
          dotly.one/{card.handle}
        </p>
      </div>
    </div>
  )
}
