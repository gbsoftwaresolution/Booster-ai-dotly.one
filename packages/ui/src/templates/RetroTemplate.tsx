import React from 'react'
import type { CardRendererProps } from '@dotly/types'
import { AvatarBlock } from '../components/AvatarBlock'
import { SocialLinkList } from '../components/SocialLinkList'
import { MediaBlockList } from '../components/MediaBlockList'

function normalizeExternalUrl(url: string): string {
  if (!url) return '#'
  if (/^https?:\/\//i.test(url)) return url
  if (/^[a-z][a-z0-9+\-.]*:/i.test(url)) return '#' // block non-http schemes
  return `https://${url}`
}

const retroStyles = `
  @import url('https://fonts.googleapis.com/css2?family=VT323&family=Silkscreen&display=swap');
  
  .retro-button {
    background: #E2E8F0;
    border: 2px solid #000;
    box-shadow: 4px 4px 0 #000;
    transition: all 0.1s ease;
    cursor: pointer;
  }
  .retro-button:active {
    transform: translate(4px, 4px);
    box-shadow: 0px 0px 0 #000;
  }
  
  .retro-box {
    border: 2px solid #000;
    box-shadow: 6px 6px 0 #000;
    background: #fff;
  }
`

export function RetroTemplate({
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
  
  // Y2K/Retro default palette
  const primary = theme.primaryColor || '#FF90E8' // Hot pastel pink
  const secondary = theme.secondaryColor || '#90E0EF' // Cyan/Blue
  const bgColor = '#F1F5F9'
  
  const headerFont = '"VT323", monospace'
  const bodyFont = '"Silkscreen", monospace'

  return (
    <>
      <style>{retroStyles}</style>
      <div
        style={{
          width: '100%',
          minHeight: '100%',
          backgroundColor: secondary,
          backgroundImage: `radial-gradient(${primary} 2px, transparent 2px)`,
          backgroundSize: '20px 20px',
          fontFamily: bodyFont,
          color: '#000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxSizing: 'border-box',
          padding: '40px 20px 80px',
          position: 'relative',
        } as React.CSSProperties}
      >
        <div 
          className="retro-box"
          style={{
            width: '100%',
            maxWidth: 480,
            padding: 30,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          {/* Header Bar like an OS window */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 30,
            background: primary,
            borderBottom: '2px solid #000',
            display: 'flex',
            alignItems: 'center',
            padding: '0 10px',
          }}>
            <div style={{fontWeight: 'bold', fontSize: 14}}>{fields.name || 'PROFILE.EXE'}</div>
            <div style={{marginLeft: 'auto', display: 'flex', gap: 4}}>
               <div style={{width: 12, height: 12, background: '#fff', border: '2px solid #000'}} />
               <div style={{width: 12, height: 12, background: '#fff', border: '2px solid #000'}} />
            </div>
          </div>
          
          <div style={{ marginTop: 20 }}>
            <AvatarBlock
              avatarUrl={fields.avatarUrl}
              name={fields.name || 'User Profile'}
              size={120}
              primaryColor={primary}
            />
          </div>

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            {fields.name && (
              <h1 style={{ fontFamily: headerFont, fontSize: 42, margin: 0, letterSpacing: '0.05em' }}>
                {fields.name}
              </h1>
            )}
            
            {(fields.title || fields.company) && (
              <h2 style={{ fontSize: 13, margin: '8px 0 0', textTransform: 'uppercase' }}>
                {[fields.title, fields.company].filter(Boolean).join(' @ ')}
              </h2>
            )}

            {fields.bio && (
              <p style={{ fontSize: 12, lineHeight: 1.5, marginTop: 16 }}>
                 {fields.bio}
              </p>
            )}
          </div>

          {/* Contact Details */}
          {((fields.email || fields.phone || fields.website || fields.address)) && (
            <div
              style={{
                width: '100%',
                marginTop: 30,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {[
                { val: fields.email, href: `mailto:${fields.email}`, label: 'Email' },
                { val: fields.phone, href: `tel:${fields.phone}`, label: 'Phone' },
                { val: fields.website, href: normalizeExternalUrl(fields.website || ''), label: 'Web' },
                { val: fields.address, href: null, label: 'Loc' },
              ].map((item, i) => {
                if (!item.val) return null
                return (
                  <div 
                    key={i} 
                    className="retro-button"
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      padding: '12px 16px',
                      fontSize: 12,
                    }}
                  >
                    <span style={{ fontWeight: 'bold', marginRight: 16, width: 50 }}>{item.label}:</span>
                    {item.href ? (
                       <a href={item.href} target="_blank" rel="noopener noreferrer" style={{ color: '#000', textDecoration: 'none' }}>{item.val}</a>
                    ) : (
                       <span>{item.val}</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {socialLinks && socialLinks.length > 0 && (
            <div style={{ marginTop: 30, width: '100%' }}>
              <div style={{textAlign: 'center', marginBottom: 12, fontSize: 12, fontWeight: 'bold'}}>SOCIALS</div>
              <SocialLinkList
                socialLinks={socialLinks}
                onSocialLinkClick={onSocialLinkClick}
                socialButtonStyle={theme.socialButtonStyle || 'icons'}
                accentColor={primary}
              />
            </div>
          )}

          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              marginTop: 32,
            }}
          >
            {onSaveContact && (
              <button
                className="retro-button"
                onClick={onSaveContact}
                style={{
                  width: '100%',
                  padding: '16px',
                  fontFamily: headerFont,
                  fontSize: 24,
                  fontWeight: 'bold',
                }}
              >
                SAVE CONTACT
              </button>
            )}

            {onLeadCapture && (
              <button
                className="retro-button"
                onClick={onLeadCapture}
                style={{
                  width: '100%',
                  padding: '16px',
                  fontFamily: headerFont,
                  fontSize: 24,
                  fontWeight: 'bold',
                  background: primary,
                }}
              >
                EXCHANGE
              </button>
            )}
          </div>

          {mediaBlocks && mediaBlocks.length > 0 && (
            <div style={{ marginTop: 40, width: '100%' }}>
              <div style={{textAlign: 'center', marginBottom: 12, fontSize: 12, fontWeight: 'bold'}}>MEDIA</div>
              <MediaBlockList blocks={mediaBlocks} accentColor={primary} />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
