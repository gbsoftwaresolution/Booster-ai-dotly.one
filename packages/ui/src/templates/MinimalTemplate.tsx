import React from 'react'
import type { CardRendererProps } from '@dotly/types'
import { AvatarBlock } from '../components/AvatarBlock'
import { SocialLinkList } from '../components/SocialLinkList'
import { SaveContactButton } from '../components/SaveContactButton'
import { LeadCaptureButton } from '../components/LeadCaptureButton'
import { MediaBlockList } from '../components/MediaBlockList'

type ExtendedFields = CardRendererProps['card']['fields'] & {
  whatsapp?: string
  mapUrl?: string
}

type ContactItem = {
  key: string
  href: string
  icon: React.ReactNode
  eyebrow: string
  label: string
  shortLabel: string
}

function normalizeExternalUrl(url: string) {
  if (!url) return '#'
  if (/^https?:\/\//i.test(url)) return url
  if (/^[a-z][a-z0-9+\-.]*:/i.test(url)) return '#' // block non-http schemes
  return `https://${url}`
}

function SectionHeading({ label, caption }: { label: string; caption?: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          fontSize: 12,
          lineHeight: 1.3,
          fontWeight: 700,
          color: '#5f6368',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      {caption && (
        <div
          style={{
            marginTop: 4,
            fontSize: 13,
            lineHeight: 1.5,
            color: '#5f6368',
          }}
        >
          {caption}
        </div>
      )}
    </div>
  )
}

function blend(colorA: string, colorB: string, amount: number) {
  const percentage = Math.max(0, Math.min(100, Math.round(amount * 100)))
  return `color-mix(in srgb, ${colorA} ${percentage}%, ${colorB})`
}

function ContactRow({
  href,
  icon,
  eyebrow,
  label,
  accentColor,
  secondaryColor,
  isLast,
}: {
  href: string
  icon: React.ReactNode
  eyebrow: string
  label: string
  accentColor: string
  secondaryColor: string
  isLast?: boolean
}) {
  const isExternal = href.startsWith('http')

  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '15px 18px',
        textDecoration: 'none',
        color: '#202124',
        borderBottom: isLast ? 'none' : '1px solid #eef1f4',
        WebkitTapHighlightColor: 'rgba(26, 115, 232, 0.08)',
        background: isLast
          ? 'transparent'
          : `linear-gradient(180deg, rgba(255,255,255,0.82) 0%, ${blend(secondaryColor, 'white', 0.12)} 100%)`,
      }}
    >
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 42,
          height: 42,
          borderRadius: 15,
          background: `linear-gradient(180deg, ${blend(accentColor, 'white', 0.08)} 0%, ${blend(secondaryColor, 'white', 0.24)} 100%)`,
          color: accentColor,
          flexShrink: 0,
          border: `1px solid ${blend(secondaryColor, 'white', 0.34)}`,
          boxShadow: `0 4px 12px ${blend(accentColor, 'transparent', 0.1)}`,
        }}
      >
        {icon}
      </span>

      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: 'block',
            fontSize: 12,
            fontWeight: 600,
            color: '#5f6368',
            marginBottom: 5,
          }}
        >
          {eyebrow}
        </span>
        <span
          style={{
            display: 'block',
            fontSize: 16,
            lineHeight: 1.35,
            fontWeight: 500,
            overflowWrap: 'anywhere',
          }}
        >
          {label}
        </span>
      </span>

      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: '#9aa0a6', flexShrink: 0 }}
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </a>
  )
}

function QuickAction({
  href,
  label,
  icon,
  accentColor,
  secondaryColor,
}: {
  href: string
  label: string
  icon?: React.ReactNode
  accentColor: string
  secondaryColor: string
}) {
  const isExternal = href.startsWith('http')
  const isIconOnly = Boolean(icon)

  return (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      aria-label={label}
      title={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: isIconOnly ? 44 : undefined,
        height: isIconOnly ? 44 : undefined,
        padding: isIconOnly ? 0 : '10px 14px',
        borderRadius: 999,
        textDecoration: 'none',
        color: accentColor,
        background: `linear-gradient(180deg, rgba(255,255,255,0.82) 0%, ${blend(secondaryColor, 'white', 0.18)} 100%)`,
        border: `1px solid ${blend(secondaryColor, 'white', 0.42)}`,
        boxShadow: '0 6px 18px rgba(60,64,67,0.08)',
        backdropFilter: 'blur(12px)',
        fontSize: isIconOnly ? 0 : 13,
        fontWeight: 600,
        letterSpacing: 0,
        flexShrink: 0,
      }}
    >
      {isIconOnly ? icon : label}
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
  const fields = card.fields as ExtendedFields
  const primary = theme.primaryColor || '#1a73e8'
  const secondary = theme.secondaryColor || '#d2e3fc'
  const logoUrl = fields.logoUrl || theme.logoUrl
  const fontFamily =
    theme.fontFamily ||
    '"Google Sans", "Product Sans", "Avenir Next", "Segoe UI", Helvetica, Arial, sans-serif'
  const pageBackgroundTop = blend(secondary, 'white', 0.18)
  const pageBackgroundBottom = blend(primary, 'white', 0.08)
  const heroBorder = blend(secondary, 'white', 0.26)
  const heroSurface = blend(secondary, 'white', 0.12)
  const heroGlowPrimary = blend(primary, 'transparent', 0.16)
  const heroGlowSecondary = blend(secondary, 'transparent', 0.18)
  const heroGlowMixed = blend(blend(primary, secondary, 0.5), 'transparent', 0.14)
  const neutralSurface = `linear-gradient(180deg, rgba(255,255,255,0.96) 0%, ${blend(secondary, 'white', 0.1)} 100%)`
  const softSectionSurface = `linear-gradient(180deg, rgba(255,255,255,0.88) 0%, ${blend(secondary, 'white', 0.14)} 100%)`
  const footerDots = [primary, blend(primary, secondary, 0.5), secondary]

  const websiteHref = fields.website ? normalizeExternalUrl(fields.website) : ''
  const websiteLabel = fields.website ? fields.website.replace(/^https?:\/\//i, '') : ''
  const mapHref = fields.address
    ? fields.mapUrl
      ? normalizeExternalUrl(fields.mapUrl)
      : `https://maps.google.com/?q=${encodeURIComponent(fields.address)}`
    : ''

  const contactItems = [
    fields.phone
      ? {
          key: 'phone',
          href: `tel:${fields.phone}`,
          eyebrow: 'Phone',
          label: fields.phone,
          shortLabel: 'Call',
          icon: (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6.53 6.53l1.62-1.62a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          ),
        }
      : null,
    fields.whatsapp
      ? {
          key: 'whatsapp',
          href: `https://wa.me/${fields.whatsapp.replace(/\D/g, '')}`,
          eyebrow: 'WhatsApp',
          label: fields.whatsapp,
          shortLabel: 'Message',
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.556 4.116 1.527 5.845L.057 23.428a.75.75 0 0 0 .914.915l5.648-1.473A11.93 11.93 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.725 9.725 0 0 1-4.97-1.365l-.355-.21-3.685.96.983-3.596-.232-.371A9.718 9.718 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z" />
            </svg>
          ),
        }
      : null,
    fields.email
      ? {
          key: 'email',
          href: `mailto:${fields.email}`,
          eyebrow: 'Email',
          label: fields.email,
          shortLabel: 'Email',
          icon: (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          ),
        }
      : null,
    fields.website
      ? {
          key: 'website',
          href: websiteHref,
          eyebrow: 'Website',
          label: websiteLabel,
          shortLabel: 'Visit Site',
          icon: (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          ),
        }
      : null,
    fields.address
      ? {
          key: 'address',
          href: mapHref,
          eyebrow: 'Location',
          label: fields.address,
          shortLabel: 'Directions',
          icon: (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          ),
        }
      : null,
  ].filter(Boolean) as ContactItem[]

  const quickActions = contactItems.filter((item) => item.key !== 'address').slice(0, 3)
  const hasBio = Boolean(fields.bio)
  const hasSocialLinks = (socialLinks?.length ?? 0) > 0
  const hasMediaBlocks = (mediaBlocks?.length ?? 0) > 0

  return (
    <div
      style={{
        fontFamily,
        background: `linear-gradient(180deg, ${pageBackgroundTop} 0%, #f6f8fb 38%, ${pageBackgroundBottom} 100%)`,
        width: '100%',
        color: '#202124',
        minHeight: '100vh',
        WebkitFontSmoothing: 'antialiased',
        padding: '10px 10px 22px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 36,
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(250,251,253,0.98) 100%)',
            border: `1px solid ${heroBorder}`,
            boxShadow: '0 28px 64px rgba(15,23,42,0.10), 0 12px 28px rgba(60,64,67,0.08)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 5,
              background: `linear-gradient(90deg, ${primary} 0%, ${secondary} 100%)`,
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              position: 'relative',
              padding: '20px 18px 18px',
              background: theme.backgroundUrl
                ? `linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(248,250,255,0.94) 100%), url(${theme.backgroundUrl}) center/cover`
                : `linear-gradient(180deg, #ffffff 0%, ${heroSurface} 72%, ${blend(secondary, 'white', 0.2)} 100%)`,
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 58,
                left: -42,
                width: 170,
                height: 170,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${heroGlowPrimary} 0%, rgba(255,255,255,0) 72%)`,
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 18,
                right: -24,
                width: 148,
                height: 148,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${heroGlowSecondary} 0%, rgba(255,255,255,0) 72%)`,
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 96,
                right: 56,
                width: 94,
                height: 94,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${heroGlowMixed} 0%, rgba(255,255,255,0) 72%)`,
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: '14px',
                borderRadius: 28,
                border: '1px solid rgba(255,255,255,0.72)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.72)',
                pointerEvents: 'none',
              }}
            />
            <div style={{ textAlign: 'center', position: 'relative' }}>
              {logoUrl && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 72,
                    height: 44,
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.82)',
                    border: '1px solid rgba(255,255,255,0.92)',
                    marginBottom: 16,
                    padding: '7px 12px',
                    boxShadow: '0 10px 28px rgba(60,64,67,0.08)',
                    backdropFilter: 'blur(14px)',
                  }}
                >
                  <img
                    src={logoUrl}
                    alt={fields.company || fields.name || 'Brand mark'}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    padding: 9,
                    borderRadius: 34,
                    background:
                      'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(248,250,252,0.92) 100%)',
                    border: '1px solid rgba(255,255,255,0.92)',
                    boxShadow:
                      '0 18px 40px rgba(15,23,42,0.10), inset 0 1px 0 rgba(255,255,255,0.72)',
                    backdropFilter: 'blur(16px)',
                  }}
                >
                  <AvatarBlock
                    avatarUrl={fields.avatarUrl}
                    name={fields.name || 'User'}
                    size={108}
                    primaryColor={primary}
                  />
                </div>
              </div>

              <h1
                style={{
                  color: '#202124',
                  fontSize: 36,
                  fontWeight: 700,
                  margin: '0 0 8px',
                  letterSpacing: '-0.05em',
                  lineHeight: 1,
                }}
              >
                {fields.name || 'Your Name'}
              </h1>

              {(fields.title || fields.company) && (
                <p
                  style={{
                    color: '#5f6368',
                    fontSize: 16,
                    margin: '0 auto',
                    fontWeight: 400,
                    lineHeight: 1.4,
                    maxWidth: 400,
                  }}
                >
                  {[fields.title, fields.company].filter(Boolean).join(' at ')}
                </p>
              )}

              {fields.company && !logoUrl && (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '9px 14px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.82)',
                    border: '1px solid rgba(255,255,255,0.92)',
                    color: '#3c4043',
                    fontSize: 13,
                    fontWeight: 600,
                    marginTop: 12,
                    boxShadow: '0 10px 22px rgba(60,64,67,0.08)',
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: primary,
                      display: 'inline-block',
                    }}
                  />
                  {fields.company}
                </div>
              )}

              {quickActions.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    justifyContent: 'center',
                    marginTop: 18,
                  }}
                >
                  {quickActions.map((item) => (
                    <QuickAction
                      key={item.key}
                      href={item.href}
                      label={item.shortLabel}
                      icon={
                        item.key === 'phone' || item.key === 'whatsapp' || item.key === 'email'
                          ? item.icon
                          : undefined
                      }
                      accentColor={primary}
                      secondaryColor={secondary}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12, position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              padding: '0 12px 12px',
            }}
          >
            {(hasBio || hasSocialLinks) && (
              <div
                style={{
                  background: softSectionSurface,
                  border: `1px solid ${blend(secondary, 'white', 0.3)}`,
                  borderRadius: 24,
                  padding: '16px 16px 14px',
                  boxShadow: '0 10px 28px rgba(60,64,67,0.06)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <SectionHeading
                  label="About"
                  caption={
                    hasBio
                      ? undefined
                      : hasSocialLinks
                        ? 'Find the right place to connect.'
                        : undefined
                  }
                />

                {hasBio && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: 15,
                      lineHeight: 1.7,
                      color: '#3c4043',
                    }}
                  >
                    {fields.bio}
                  </p>
                )}

                {hasSocialLinks && (
                  <div style={{ marginTop: hasBio ? 14 : 0 }}>
                    <SocialLinkList
                      socialLinks={socialLinks}
                      onSocialLinkClick={onSocialLinkClick}
                      accentColor={primary}
                      socialButtonStyle={theme.socialButtonStyle ?? 'follow'}
                    />
                  </div>
                )}
              </div>
            )}

            {contactItems.length > 0 && (
              <div
                style={{
                  background: neutralSurface,
                  borderRadius: 24,
                  overflow: 'hidden',
                  border: `1px solid ${blend(secondary, 'white', 0.22)}`,
                  boxShadow: '0 10px 28px rgba(60,64,67,0.06)',
                }}
              >
                <div style={{ padding: '16px 16px 4px' }}>
                  <SectionHeading
                    label="Contact"
                    caption="Choose the channel that fits the conversation."
                  />
                </div>

                {contactItems.map((item, index) => (
                  <ContactRow
                    key={item.key}
                    href={item.href}
                    icon={item.icon}
                    eyebrow={item.eyebrow}
                    label={item.label}
                    accentColor={primary}
                    secondaryColor={secondary}
                    isLast={index === contactItems.length - 1}
                  />
                ))}
              </div>
            )}

            {hasMediaBlocks && (
              <div
                style={{
                  background: neutralSurface,
                  borderRadius: 24,
                  padding: 14,
                  border: `1px solid ${blend(secondary, 'white', 0.22)}`,
                  boxShadow: '0 10px 28px rgba(60,64,67,0.06)',
                }}
              >
                <SectionHeading label="Highlights" caption="Media, links, and featured moments." />
                <MediaBlockList blocks={mediaBlocks} accentColor={primary} darkBackground={false} />
              </div>
            )}

            <div
              style={{
                background: `linear-gradient(180deg, ${blend(secondary, 'white', 0.1)} 0%, ${blend(secondary, primary, 0.14)} 100%)`,
                borderRadius: 24,
                padding: '16px 14px 14px',
                border: `1px solid ${blend(secondary, 'white', 0.42)}`,
                boxShadow: `0 14px 30px ${blend(primary, 'transparent', 0.12)}`,
              }}
            >
              <SectionHeading
                label="Save or connect"
                caption="Keep the card handy or start a conversation now."
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <LeadCaptureButton
                  onLeadCapture={onLeadCapture}
                  mode={mode}
                  primaryColor={primary}
                  secondaryColor={secondary}
                  buttonStyle={theme.buttonStyle}
                />
                <SaveContactButton
                  card={card}
                  handle={card.handle}
                  onSaveContact={onSaveContact}
                  primaryColor={primary}
                  secondaryColor={secondary}
                  buttonStyle={theme.buttonStyle}
                />
              </div>
            </div>

            <div
              style={{
                textAlign: 'center',
                padding: '6px 10px 2px',
                color: '#5f6368',
              }}
            >
              <div
                style={{
                  display: 'inline-flex',
                  gap: 6,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 8,
                }}
              >
                {footerDots.map((color) => (
                  <span
                    key={color}
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: color,
                      display: 'inline-block',
                    }}
                  />
                ))}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>
                dotly.one/{card.handle}
              </div>
              <div style={{ fontSize: 12, marginTop: 6 }}>
                Designed to feel simple, useful, and quietly premium.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
