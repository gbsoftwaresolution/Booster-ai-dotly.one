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

const darkStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&family=Inter:wght@300;400;500;600&display=swap');
  
  .dark-fade-in {
    animation: darkFadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  
  @keyframes darkFadeIn {
    0% {
      opacity: 0;
      transform: translateY(20px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .neon-button {
    transition: all 0.3s ease;
    overflow: hidden;
    position: relative;
    z-index: 1;
  }
  
  .neon-button::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    z-index: -1;
    background: inherit;
    filter: blur(8px);
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  .neon-button:hover::before {
    opacity: 0.6;
  }
  .neon-button:hover {
    transform: translateY(-2px);
  }
  
  .dark-link {
    transition: all 0.2s ease;
  }
  .dark-link:hover {
    filter: drop-shadow(0 0 5px currentColor);
  }
`

export function DarkTemplate({
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
  
  const primary = theme.primaryColor || '#00E5FF' // Neon cyan by default
  const bgColor = '#050505' 
  const surfaceColor = '#121212'
  const textColor = '#F4F4F5'
  const mutedTextColor = '#A1A1AA'
  const borderColor = '#27272A'

  const fontFamilyHeader = '"Syncopate", "Inter", sans-serif'
  const fontFamilyBody = '"Inter", "Helvetica Neue", sans-serif'

  return (
    <>
      <style>{darkStyles}</style>
      <div
        style={{
          width: '100%',
          minHeight: '100%',
          backgroundColor: bgColor,
          fontFamily: fontFamilyBody,
          color: textColor,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxSizing: 'border-box',
          paddingBottom: 60,
        }}
      >
        {/* Neon Cover Block */}
        <div
          style={{
            width: '100%',
            height: 180,
            backgroundColor: surfaceColor,
            borderBottom: `1px solid \${borderColor}`,
            display: 'flex',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Aggressive glowing orb */}
          <div 
            style={{
               position: 'absolute',
               bottom: '-50%',
               left: '50%',
               transform: 'translateX(-50%)',
               width: '80%',
               height: '100%',
               background: `radial-gradient(ellipse at center, \${hexToRgba(primary, 0.4)} 0%, transparent 70%)`,
               filter: 'blur(30px)',
            }}
          />
          {/* Subtle grid pattern overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `linear-gradient(to right, \${borderColor} 1px, transparent 1px), linear-gradient(to bottom, \${borderColor} 1px, transparent 1px)`,
              backgroundSize: '30px 30px',
              opacity: 0.2,
            }}
          />
        </div>

        <div
          className="dark-fade-in"
          style={{
            width: '100%',
            maxWidth: 480,
            padding: '0 24px',
            marginTop: -70, // overlap cover slightly more
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            animationDelay: '0.1s',
          }}
        >
          {/* Neon Avatar Ring */}
          <div
            style={{
              padding: 4,
              background: bgColor,
              borderRadius: '50%',
              boxShadow: `0 0 20px \${hexToRgba(primary, 0.3)}, inset 0 0 10px \${hexToRgba(primary, 0.2)}`,
              border: `2px solid \${hexToRgba(primary, 0.5)}`,
            }}
          >
            <AvatarBlock
              avatarUrl={fields.avatarUrl}
              name={fields.name || 'User Profile'}
              size={120}
              primaryColor={primary}
            />
          </div>

          <div style={{ marginTop: 24, textAlign: 'center', width: '100%' }}>
            {fields.name && (
              <h1
                style={{
                  fontFamily: fontFamilyHeader,
                  fontSize: 28,
                  fontWeight: 700,
                  margin: 0,
                  color: textColor,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  textShadow: `0 0 15px \${hexToRgba(textColor, 0.3)}`,
                }}
              >
                {fields.name}
              </h1>
            )}
            
            {(fields.title || fields.company) && (
              <h2
                style={{
                  fontFamily: fontFamilyBody,
                  fontSize: 14,
                  fontWeight: 500,
                  margin: '12px 0 0',
                  color: primary,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  textShadow: `0 0 8px \${hexToRgba(primary, 0.4)}`,
                }}
              >
                {[fields.title, fields.company].filter(Boolean).join(' • ')}
              </h2>
            )}

            {fields.bio && (
              <p
                style={{
                  fontFamily: fontFamilyBody,
                  fontSize: 15,
                  fontWeight: 400,
                  lineHeight: 1.6,
                  marginTop: 20,
                  maxWidth: 400,
                  color: mutedTextColor,
                  marginInline: 'auto',
                }}
              >
                {fields.bio}
              </p>
            )}
          </div>

          {/* Contact Details in Neon Bordered Boxes */}
          {((fields.email || fields.phone || fields.website || fields.address)) && (
            <div
              className="dark-fade-in"
              style={{
                width: '100%',
                marginTop: 36,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                animationDelay: '0.2s',
              }}
            >
              {[
                { val: fields.email, href: `mailto:\${fields.email}`, label: 'Email' },
                { val: fields.phone, href: `tel:\${fields.phone}`, label: 'Phone' },
                { val: fields.website, href: normalizeExternalUrl(fields.website || ''), label: 'Website' },
                { val: fields.address, href: null, label: 'Location' },
              ].map((item, i) => {
                if (!item.val) return null
                return (
                  <div 
                    key={i} 
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '16px',
                      backgroundColor: surfaceColor,
                      border: `1px solid \${borderColor}`,
                      borderRadius: 8,
                      boxShadow: `inset 0 0 20px \${hexToRgba(primary, 0.02)}`,
                      fontSize: 14 
                    }}
                  >
                    <span style={{ color: mutedTextColor, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 11, fontWeight: 600 }}>{item.label}</span>
                    {item.href ? (
                       <a href={item.href} target="_blank" rel="noopener noreferrer" className="dark-link" style={{ color: textColor, textDecoration: 'none', fontWeight: 500 }}>{item.val}</a>
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
              className="dark-fade-in"
              style={{
                marginTop: 36,
                width: '100%',
                animationDelay: '0.3s',
                padding: '24px 0',
                borderTop: `1px solid \${borderColor}`,
                borderBottom: `1px solid \${borderColor}`,
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
            className="dark-fade-in"
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              marginTop: 36,
              animationDelay: '0.4s',
            }}
          >
            {onSaveContact && (
              <button
                className="neon-button"
                onClick={onSaveContact}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  backgroundColor: primary,
                  color: bgColor, // contrast text
                  border: 'none',
                  borderRadius: 8,
                  fontFamily: fontFamilyHeader,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  boxShadow: `0 0 15px \${hexToRgba(primary, 0.4)}`,
                }}
              >
                Save Contact
              </button>
            )}

            {onLeadCapture && (
              <button
                className="neon-button"
                onClick={onLeadCapture}
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  backgroundColor: 'transparent',
                  color: primary,
                  border: `2px solid \${primary}`,
                  borderRadius: 8,
                  fontFamily: fontFamilyHeader,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  boxShadow: `inset 0 0 10px \${hexToRgba(primary, 0.2)}, 0 0 10px \${hexToRgba(primary, 0.2)}`,
                }}
              >
                Exchange Contact
              </button>
            )}
          </div>

          {/* Media Blocks */}
          {mediaBlocks && mediaBlocks.length > 0 && (
            <div
              className="dark-fade-in"
              style={{
                marginTop: 48,
                width: '100%',
                animationDelay: '0.5s',
              }}
            >
              <h3 
                style={{ 
                  fontFamily: fontFamilyHeader, 
                  fontSize: 16, 
                  fontWeight: 700, 
                  textAlign: 'center',
                  color: textColor,
                  marginBottom: 24,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  textShadow: `0 0 10px \${hexToRgba(textColor, 0.2)}`,
                }}
              >
                Media & Links
              </h3>
              <MediaBlockList blocks={mediaBlocks} accentColor={primary} />
            </div>
          )}
          
          {/* Footer watermark */}
          <div style={{ marginTop: 60, textAlign: 'center' }}>
             <p style={{ 
               fontFamily: fontFamilyHeader, 
               fontSize: 9, 
               color: mutedTextColor, 
               letterSpacing: '0.25em', 
               textTransform: 'uppercase',
               opacity: 0.5 
             }}>
               Powered by Dotly
             </p>
          </div>
        </div>
      </div>
    </>
  )
}
