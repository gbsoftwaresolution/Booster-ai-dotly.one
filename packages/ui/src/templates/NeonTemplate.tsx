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

const neonStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Righteous&family=Jura:wght@400;600;700&display=swap');
  
  .neon-fade-in {
    animation: neonFadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  
  @keyframes neonFadeIn {
    0% {
      opacity: 0;
      transform: translateY(20px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .neon-action-button {
    transition: all 0.3s ease;
    overflow: hidden;
    position: relative;
    z-index: 1;
    text-transform: uppercase;
  }
  
  .neon-action-button:hover {
    transform: translateY(-2px);
  }
  
  .neon-link {
    transition: all 0.2s ease;
  }
  .neon-link:hover {
    filter: drop-shadow(0 0 8px currentColor);
  }

  .neon-border-box {
    transition: all 0.3s ease;
  }
  .neon-border-box:hover {
    box-shadow: 0 0 15px var(--neon-accent-hover, rgba(255, 0, 255, 0.3));
    border-color: var(--neon-accent-hover-border, #ff00ff) !important;
  }
`

export function NeonTemplate({
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
  
  const primary = theme.primaryColor || '#FF00FF' // Hyper magenta by default
  const bgColor = '#0A0A0A' 
  const surfaceColor = '#141414'
  const textColor = '#FFFFFF'
  const mutedTextColor = '#9CA3AF'
  const borderColor = '#27272A'

  const fontFamilyHeader = '"Righteous", "Inter", sans-serif'
  const fontFamilyBody = '"Jura", "Helvetica Neue", sans-serif'

  return (
    <>
      <style>{neonStyles}</style>
      <div
        className="neon-container"
        style={{
          '--neon-accent-hover': hexToRgba(primary, 0.4),
          '--neon-accent-hover-border': primary,
          width: '100%',
          minHeight: '100%',
          backgroundColor: bgColor,
          fontFamily: fontFamilyBody,
          color: textColor,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxSizing: 'border-box',
          paddingBottom: 80,
          position: 'relative',
          overflow: 'hidden',
        } as React.CSSProperties}
      >
        {/* Background ambient glows */}
        <div style={{
          position: 'absolute',
          top: '-10%', right: '-10%', width: '60%', height: '50%',
          background: `radial-gradient(ellipse, ${hexToRgba(primary, 0.2)} 0%, transparent 70%)`,
          filter: 'blur(60px)', zIndex: 0
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-10%', left: '-10%', width: '50%', height: '40%',
          background: `radial-gradient(circle, ${hexToRgba(theme.secondaryColor || '#00FFFF', 0.15)} 0%, transparent 70%)`,
          filter: 'blur(50px)', zIndex: 0
        }} />

        {/* Cover Block */}
        <div
          style={{
            width: '100%',
            height: 200,
            backgroundColor: surfaceColor,
            borderBottom: `1px solid ${hexToRgba(primary, 0.5)}`,
            boxShadow: `0 4px 30px ${hexToRgba(primary, 0.2)}`,
            display: 'flex',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 1,
            overflow: 'hidden'
          }}
        >
          {/* Intense line beam */}
          <div 
            style={{
               position: 'absolute',
               bottom: 0,
               left: 0,
               width: '100%',
               height: '2px',
               background: primary,
               boxShadow: `0 0 20px 4px ${primary}`,
            }}
          />
        </div>

        <div
          className="neon-fade-in"
          style={{
            width: '100%',
            maxWidth: 480,
            padding: '0 24px',
            marginTop: -80,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            zIndex: 2,
            animationDelay: '0.1s',
          }}
        >
          {/* Avatar Area */}
          <div
            style={{
              padding: 6,
              background: surfaceColor,
              borderRadius: '50%',
              boxShadow: `0 0 30px ${hexToRgba(primary, 0.5)}, inset 0 0 15px ${hexToRgba(primary, 0.3)}`,
              border: `3px solid ${primary}`,
            }}
          >
            <AvatarBlock
              avatarUrl={fields.avatarUrl}
              name={fields.name || 'User Profile'}
              size={140}
              primaryColor={primary}
            />
          </div>

          <div style={{ marginTop: 28, textAlign: 'center', width: '100%' }}>
            {fields.name && (
              <h1
                style={{
                  fontFamily: fontFamilyHeader,
                  fontSize: 36,
                  fontWeight: 400,
                  margin: 0,
                  color: textColor,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  textShadow: `0 0 10px ${hexToRgba(primary, 0.8)}, 0 0 20px ${hexToRgba(primary, 0.4)}`,
                }}
              >
                {fields.name}
              </h1>
            )}
            
            {(fields.title || fields.company) && (
              <h2
                style={{
                  fontFamily: fontFamilyBody,
                  fontSize: 16,
                  fontWeight: 600,
                  margin: '16px 0 0',
                  color: theme.secondaryColor || '#00FFFF',
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  textShadow: `0 0 8px ${hexToRgba(theme.secondaryColor || '#00FFFF', 0.6)}`,
                }}
              >
                {[fields.title, fields.company].filter(Boolean).join(' • ')}
              </h2>
            )}

            {fields.bio && (
              <p
                style={{
                  fontFamily: fontFamilyBody,
                  fontSize: 16,
                  fontWeight: 400,
                  lineHeight: 1.7,
                  marginTop: 24,
                  maxWidth: 420,
                  color: mutedTextColor,
                  marginInline: 'auto',
                }}
              >
                {fields.bio}
              </p>
            )}
          </div>

          {/* Contact Details */}
          {((fields.email || fields.phone || fields.website || fields.address)) && (
            <div
              className="neon-fade-in"
              style={{
                width: '100%',
                marginTop: 40,
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
                  <div 
                    key={i} 
                    className="neon-border-box"
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '18px 20px',
                      backgroundColor: 'rgba(20, 20, 20, 0.8)',
                      backdropFilter: 'blur(10px)',
                      border: `1px solid ${hexToRgba(primary, 0.3)}`,
                      borderRadius: 12,
                      fontSize: 15,
                    }}
                  >
                    <span style={{ color: primary, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: 12, fontWeight: 700, textShadow: `0 0 5px ${hexToRgba(primary, 0.5)}` }}>{item.label}</span>
                    {item.href ? (
                       <a href={item.href} target="_blank" rel="noopener noreferrer" className="neon-link" style={{ color: textColor, textDecoration: 'none', fontWeight: 600 }}>{item.val}</a>
                    ) : (
                       <span style={{ color: textColor, fontWeight: 600 }}>{item.val}</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Social Links */}
          {socialLinks && socialLinks.length > 0 && (
            <div
              className="neon-fade-in"
              style={{
                marginTop: 40,
                width: '100%',
                animationDelay: '0.3s',
                padding: '30px 0',
                borderTop: `1px dashed ${hexToRgba(primary, 0.4)}`,
                borderBottom: `1px dashed ${hexToRgba(primary, 0.4)}`,
              }}
            >
              <SocialLinkList
                socialLinks={socialLinks}
                onSocialLinkClick={onSocialLinkClick}
                socialButtonStyle={theme.socialButtonStyle || 'icons'}
                accentColor={primary}
              />
            </div>
          )}

          {/* Actions */}
          <div
            className="neon-fade-in"
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
                className="neon-action-button"
                onClick={onSaveContact}
                style={{
                  width: '100%',
                  padding: '18px 24px',
                  backgroundColor: primary,
                  color: bgColor,
                  border: 'none',
                  borderRadius: 12,
                  fontFamily: fontFamilyHeader,
                  fontSize: 14,
                  fontWeight: 400,
                  letterSpacing: '0.2em',
                  cursor: 'pointer',
                  boxShadow: `0 0 20px ${hexToRgba(primary, 0.6)}`,
                }}
              >
                Save Contact
              </button>
            )}

            {onLeadCapture && (
              <button
                className="neon-action-button"
                onClick={onLeadCapture}
                style={{
                  width: '100%',
                  padding: '18px 24px',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  color: primary,
                  border: `2px solid ${primary}`,
                  borderRadius: 12,
                  fontFamily: fontFamilyHeader,
                  fontSize: 14,
                  fontWeight: 400,
                  letterSpacing: '0.2em',
                  cursor: 'pointer',
                  boxShadow: `inset 0 0 15px ${hexToRgba(primary, 0.3)}, 0 0 15px ${hexToRgba(primary, 0.3)}`,
                  textShadow: `0 0 5px ${primary}`,
                }}
              >
                Exchange Contact
              </button>
            )}
          </div>

          {/* Media Blocks */}
          {mediaBlocks && mediaBlocks.length > 0 && (
            <div
              className="neon-fade-in"
              style={{
                marginTop: 50,
                width: '100%',
                animationDelay: '0.5s',
              }}
            >
              <h3 
                style={{ 
                  fontFamily: fontFamilyHeader, 
                  fontSize: 20, 
                  fontWeight: 400, 
                  textAlign: 'center',
                  color: textColor,
                  marginBottom: 28,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  textShadow: `0 0 12px ${hexToRgba(textColor, 0.5)}`,
                }}
              >
                Media & Links
              </h3>
              <MediaBlockList blocks={mediaBlocks} accentColor={primary} />
            </div>
          )}
          
          {/* Footer watermark */}
          <div style={{ marginTop: 70, textAlign: 'center' }}>
             <p style={{ 
               fontFamily: fontFamilyHeader, 
               fontSize: 10, 
               color: primary, 
               letterSpacing: '0.3em', 
               textTransform: 'uppercase',
               opacity: 0.6,
               textShadow: `0 0 5px ${hexToRgba(primary, 0.5)}`,
             }}>
               Powered by Dotly
             </p>
          </div>
        </div>
      </div>
    </>
  )
}
