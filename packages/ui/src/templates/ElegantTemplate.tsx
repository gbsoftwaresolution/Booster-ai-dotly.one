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

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16) || 0
  const g = parseInt(hex.slice(3, 5), 16) || 0
  const b = parseInt(hex.slice(5, 7), 16) || 0
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const elegantStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&family=Lato:wght@300;400&display=swap');
  
  .elegant-fade-in {
    animation: elegantFadeIn 1s cubic-bezier(0.25, 0.8, 0.25, 1) both;
  }
  
  @keyframes elegantFadeIn {
    0% {
      opacity: 0;
      transform: translateY(15px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .elegant-button {
    transition: all 0.4s ease;
    overflow: hidden;
    position: relative;
  }
  .elegant-button::after {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.1);
    transition: width 0.6s ease, height 0.6s ease;
  }
  .elegant-button:hover::after {
    width: 300px;
    height: 300px;
  }
  .elegant-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 24px rgba(0,0,0,0.08);
  }
  
  .elegant-link {
    transition: color 0.3s ease;
  }
  .elegant-link:hover {
    opacity: 0.7;
  }
`

export function ElegantTemplate({
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
  
  const primary = theme.primaryColor || '#2C2B29'
  const bgColor = '#F9F8F6' 
  const surfaceColor = '#FFFFFF'
  const textColor = '#1A1817'
  const mutedTextColor = '#6E6B68'
  const borderColor = '#E8E4DF'

  const fontFamilySerif = '"Playfair Display", "Georgia", serif'
  const fontFamilySans = '"Lato", "Helvetica Neue", sans-serif'

  return (
    <>
      <style>{elegantStyles}</style>
      <div
        style={{
          width: '100%',
          minHeight: '100%',
          backgroundColor: bgColor,
          fontFamily: fontFamilySans,
          color: textColor,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxSizing: 'border-box',
          paddingBottom: 60,
        }}
      >
        {/* Cover / Accent block */}
        <div
          style={{
            width: '100%',
            height: 160,
            backgroundColor: surfaceColor,
            borderBottom: `1px solid ${borderColor}`,
            display: 'flex',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {/* Subtle pattern or gradient */}
          <div 
            style={{
               position: 'absolute',
               inset: 0,
               background: `radial-gradient(circle at 50% 120%, ${hexToRgba(primary, 0.05)} 0%, transparent 70%)`,
            }}
          />
        </div>

        <div
          className="elegant-fade-in"
          style={{
            width: '100%',
            maxWidth: 480,
            padding: '0 24px',
            marginTop: -60, // overlap cover
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            animationDelay: '0.1s',
          }}
        >
          {/* Avatar Area */}
          <div
            style={{
              padding: 6,
              background: surfaceColor,
              borderRadius: '50%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
            }}
          >
            <AvatarBlock
              avatarUrl={fields.avatarUrl}
              name={fields.name || 'User Profile'}
              size={120}
              primaryColor={primary}
            />
          </div>

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            {fields.name && (
              <h1
                style={{
                  fontFamily: fontFamilySerif,
                  fontSize: 32,
                  fontWeight: 500,
                  margin: 0,
                  color: textColor,
                  letterSpacing: '0.02em',
                }}
              >
                {fields.name}
              </h1>
            )}
            
            {(fields.title || fields.company) && (
              <h2
                style={{
                  fontFamily: fontFamilySans,
                  fontSize: 14,
                  fontWeight: 400,
                  margin: '12px 0 0',
                  color: mutedTextColor,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}
              >
                {[fields.title, fields.company].filter(Boolean).join(' • ')}
              </h2>
            )}

            {fields.bio && (
              <p
                style={{
                  fontFamily: fontFamilySerif,
                  fontSize: 16,
                  fontStyle: 'italic',
                  lineHeight: 1.8,
                  marginTop: 24,
                  maxWidth: 400,
                  color: mutedTextColor,
                }}
              >
                "{fields.bio}"
              </p>
            )}
          </div>

          {/* Contact Details (Email, Phone, Website) styled minimally */}
          {((fields.email || fields.phone || fields.website || fields.address)) && (
            <div
              className="elegant-fade-in"
              style={{
                width: '100%',
                marginTop: 32,
                padding: '24px 0',
                borderTop: `1px solid ${borderColor}`,
                borderBottom: `1px solid ${borderColor}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                animationDelay: '0.2s',
              }}
            >
              {[
                { val: fields.email, href: `mailto:${fields.email}`, label: 'Email' },
                { val: fields.phone, href: `tel:${fields.phone}`, label: 'Phone' },
                { val: fields.website, href: normalizeExternalUrl(fields.website || ''), label: 'Website' },
                { val: fields.address, href: null, label: 'Location' },
              ].map((item, i) => {
                if (!item.val) return null
                return (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
                    <span style={{ color: mutedTextColor, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 11 }}>{item.label}</span>
                    {item.href ? (
                       <a href={item.href} target="_blank" rel="noopener noreferrer" className="elegant-link" style={{ color: textColor, textDecoration: 'none', fontWeight: 500 }}>{item.val}</a>
                    ) : (
                       <span style={{ color: textColor, fontWeight: 500 }}>{item.val}</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Social Links */}
          {socialLinks && socialLinks.length > 0 && (
            <div
              className="elegant-fade-in"
              style={{
                marginTop: 32,
                width: '100%',
                animationDelay: '0.3s',
              }}
            >
              <SocialLinkList
                socialLinks={socialLinks}
                onSocialLinkClick={onSocialLinkClick}
                socialButtonStyle={theme.socialButtonStyle || 'pills'}
                accentColor={primary}
              />
            </div>
          )}

          {/* Actions */}
          <div
            className="elegant-fade-in"
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              marginTop: 40,
              animationDelay: '0.4s',
            }}
          >
            {onSaveContact && (
              <button
                className="elegant-button"
                onClick={onSaveContact}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  backgroundColor: primary,
                  color: '#fff',
                  border: 'none',
                  borderRadius: 0, // Sharp elegant edges or soft
                  fontFamily: fontFamilySans,
                  fontSize: 13,
                  fontWeight: 400,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Save Contact
              </button>
            )}

            {onLeadCapture && (
              <button
                className="elegant-button"
                onClick={onLeadCapture}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  backgroundColor: 'transparent',
                  color: textColor,
                  border: `1px solid ${textColor}`,
                  borderRadius: 0,
                  fontFamily: fontFamilySans,
                  fontSize: 13,
                  fontWeight: 400,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Exchange Contact
              </button>
            )}
          </div>

          {/* Media Blocks */}
          {mediaBlocks && mediaBlocks.length > 0 && (
            <div
              className="elegant-fade-in"
              style={{
                marginTop: 48,
                width: '100%',
                animationDelay: '0.5s',
              }}
            >
              <h3 
                style={{ 
                  fontFamily: fontFamilySerif, 
                  fontSize: 20, 
                  fontWeight: 400, 
                  textAlign: 'center',
                  color: textColor,
                  marginBottom: 24,
                  fontStyle: 'italic',
                }}
              >
                Portfolio & Media
              </h3>
              <MediaBlockList blocks={mediaBlocks} accentColor={primary} />
            </div>
          )}
          
          {/* Footer watermark */}
          <div style={{ marginTop: 60, textAlign: 'center' }}>
             <p style={{ fontFamily: fontFamilySans, fontSize: 10, color: mutedTextColor, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
               Powered by Dotly
             </p>
          </div>
        </div>
      </div>
    </>
  )
}
