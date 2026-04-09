import React from 'react'
import type { CardRendererProps } from '@dotly/types'
import { AvatarBlock } from '../components/AvatarBlock'
import { SocialLinkList } from '../components/SocialLinkList'
import { MediaBlockList } from '../components/MediaBlockList'


function PhoneIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> }
function MsgIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg> }
function MailIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg> }
function GlobeIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path><path d="M2 12h20"></path></svg> }
function MapPinIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg> }


function UserPlusIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="22" y1="11" x2="16" y2="11"></line></svg> }
function DownloadIcon() { return <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> }

function normalizeExternalUrl(url: string): string {
  if (!url) return '#'
  if (/^https?:\/\//i.test(url)) return url
  if (/^[a-z][a-z0-9+\-.]*:/i.test(url)) return '#' 
  return `https://${url}`
}

const glassStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap');
  
  .glass-container {
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: #ffffff;
    background-color: #0b0f19;
  }

  .glass-card {
    background: rgba(255, 255, 255, 0.03);
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    border-left: 1px solid rgba(255, 255, 255, 0.1);
    border-right: 1px solid rgba(255, 255, 255, 0.02);
    border-bottom: 1px solid rgba(255, 255, 255, 0.02);
    border-radius: 28px;
    backdrop-filter: blur(32px);
    -webkit-backdrop-filter: blur(32px);
    box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.5), 0 0 20px -5px rgba(255, 255, 255, 0.03);
  }

  .glass-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    color: #ffffff;
    transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
    cursor: pointer;
  }
  
  .glass-btn:hover {
    background: rgba(255, 255, 255, 0.12);
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.25);
    box-shadow: 0 12px 24px -10px rgba(0, 0, 0, 0.4);
  }

  .glass-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(90px);
    opacity: 0.5;
    z-index: 0;
    animation-duration: 20s;
    animation-iteration-count: infinite;
    animation-direction: alternate;
    animation-timing-function: ease-in-out;
  }

  @keyframes orb-float-1 {
    0% { transform: translate(0, 0) scale(1); }
    100% { transform: translate(15%, 15%) scale(1.2); }
  }
  @keyframes orb-float-2 {
    0% { transform: translate(0, 0) scale(1.1); }
    100% { transform: translate(-15%, -15%) scale(0.9); }
  }
`

export function GlassmorphismTemplate({
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
  
  const primary = theme.primaryColor || '#6366F1'
  const secondary = theme.secondaryColor || '#A855F7'

  return (
    <>
      <style>{glassStyles}</style>
      <div
        className="glass-container"
        style={{
          width: '100%',
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          boxSizing: 'border-box',
          padding: '60px 20px 80px',
          position: 'relative',
          overflow: 'hidden'
        } as React.CSSProperties}
      >
        <div 
          className="glass-orb" 
          style={{
            top: '-10%', left: '-20%', width: '70vw', height: '70vw', maxWidth: 500, maxHeight: 500,
            background: primary, animationName: 'orb-float-1'
          }} 
        />
        <div 
          className="glass-orb" 
          style={{
            bottom: '10%', right: '-15%', width: '60vw', height: '60vw', maxWidth: 450, maxHeight: 450,
            background: secondary, animationName: 'orb-float-2'
          }} 
        />

        <div 
          className="glass-card"
          style={{
            width: '100%',
            maxWidth: 460,
            padding: '40px 32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div style={{
            padding: 4,
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '50%',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
          }}>
            <AvatarBlock
              avatarUrl={fields.avatarUrl}
              name={fields.name || 'User Profile'}
              size={110}
              primaryColor="#ffffff"
            />
          </div>

          <div style={{ marginTop: 24, textAlign: 'center', width: '100%' }}>
            {fields.name && (
              <h1 style={{ fontSize: 32, fontWeight: 600, margin: 0, letterSpacing: '-0.02em', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
                {fields.name}
              </h1>
            )}
            
            {(fields.title || fields.company) && (
              <h2 style={{ fontSize: 15, fontWeight: 400, margin: '8px 0 0', opacity: 0.8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                {[fields.title, fields.company].filter(Boolean).join(' • ')}
              </h2>
            )}

            {fields.bio && (
              <p style={{ fontSize: 15, fontWeight: 300, lineHeight: 1.6, marginTop: 20, opacity: 0.75 }}>
                 {fields.bio}
              </p>
            )}
          </div>

                    {((fields.email || fields.phone || fields.website || fields.address)) && (
            <>
              {/* Quick Action Buttons */}
              <div style={{ display: 'flex', gap: 12, marginTop: 32, justifyContent: 'center', width: '100%', flexWrap: 'wrap' }}>
                {[
                  { show: !!fields.phone, href: `tel:${fields.phone}`, label: 'Call', icon: <PhoneIcon /> },
                  { show: !!fields.phone, href: `sms:${fields.phone}`, label: 'Chat', icon: <MsgIcon /> },
                  { show: !!fields.email, href: `mailto:${fields.email}`, label: 'Email', icon: <MailIcon /> },
                  { show: !!fields.website, href: normalizeExternalUrl(fields.website || ''), label: 'Web', icon: <GlobeIcon /> },
                  { show: !!fields.address, href: `https://maps.google.com/?q=${encodeURIComponent(fields.address || '')}`, label: 'Map', icon: <MapPinIcon /> }
                ].filter(a => a.show).map((action, i) => (
                   <a 
                     key={i} 
                     href={action.href} 
                     target="_blank" 
                     rel="noopener noreferrer" 
                     className="glass-btn" 
                     style={{ 
                       display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                       width: 64, height: 60, borderRadius: 20, textDecoration: 'none', gap: 6
                     }}
                     title={action.label}
                   >
                     {action.icon}
                     <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{action.label}</span>
                   </a>
                ))}
              </div>

              {/* Detailed Values Row */}
              <div style={{ width: '100%', marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { val: fields.email, href: `mailto:${fields.email}`, label: 'Email', icon: <MailIcon /> },
                  { val: fields.phone, href: `tel:${fields.phone}`, label: 'Phone', icon: <PhoneIcon /> },
                  { val: fields.website, href: normalizeExternalUrl(fields.website || ''), label: 'Website', icon: <GlobeIcon /> },
                  { val: fields.address, href: null, label: 'Location', icon: <MapPinIcon /> },
                ].map((item, i) => {
                  if (!item.val) return null
                  return (
                    <div 
                      key={i} 
                      className="glass-btn"
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        padding: '16px 20px',
                        fontSize: 14,
                        gap: 16
                      }}
                    >
                      <div style={{ opacity: 0.7, display: 'flex' }}>{item.icon}</div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                         <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{item.label}</span>
                         {item.href ? (
                            <a href={item.href} target="_blank" rel="noopener noreferrer" style={{ color: '#fff', textDecoration: 'none', fontWeight: 500 }}>{item.val}</a>
                         ) : (
                            <span style={{ fontWeight: 500 }}>{item.val}</span>
                         )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {socialLinks && socialLinks.length > 0 && (
            <div style={{ marginTop: 36, width: '100%', paddingTop: 28, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <SocialLinkList
                socialLinks={socialLinks}
                onSocialLinkClick={onSocialLinkClick}
                socialButtonStyle={theme.socialButtonStyle || 'icons'}
                accentColor="#ffffff"
              />
            </div>
          )}

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16, marginTop: 36 }}>
            {onSaveContact && (
              <button className="glass-btn" onClick={onSaveContact} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '18px', fontSize: 15, fontWeight: 600, letterSpacing: '0.02em', background: 'rgba(255, 255, 255, 0.1)' }}>
                <DownloadIcon />
                Save Contact
              </button>
            )}

            {onLeadCapture && (
              <button className="glass-btn" onClick={onLeadCapture} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '18px', fontSize: 15, fontWeight: 500, letterSpacing: '0.02em' }}>
                <UserPlusIcon />
                Connect with me
              </button>
            )}
          </div>

          {mediaBlocks && mediaBlocks.length > 0 && (
            <div style={{ marginTop: 40, width: '100%' }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, textAlign: 'center', marginBottom: 20, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Featured</h3>
              <MediaBlockList blocks={mediaBlocks} accentColor="#ffffff" />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
