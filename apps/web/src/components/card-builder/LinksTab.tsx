'use client'

import type { JSX } from 'react'
import { useState, useRef } from 'react'
import type { SocialLinkData } from '@dotly/types'
import { SocialPlatform } from '@dotly/types'
import { Trash2, Plus, Link2, ExternalLink, Globe } from 'lucide-react'
import {
  FaLinkedinIn,
  FaXTwitter,
  FaInstagram,
  FaGithub,
  FaYoutube,
  FaTiktok,
  FaWhatsapp,
  FaFacebookF,
} from 'react-icons/fa6'
import { SiCalendly } from 'react-icons/si'
import { LuCalendarDays } from 'react-icons/lu'
import { cn } from '@/lib/cn'
import type { IconType } from 'react-icons'

interface LinksTabProps {
  links: SocialLinkData[]
  onChange: (links: SocialLinkData[]) => void
}

// ── Platform metadata ────────────────────────────────────────────────────────
const PLATFORM_META: Record<
  string,
  {
    label: string
    color: string
    dot: string
    placeholder: string
    Icon: IconType | null
    iconBg: string
  }
> = {
  LINKEDIN: {
    label: 'LinkedIn',
    color: 'bg-[#0A66C2]',
    dot: 'bg-[#0A66C2]',
    placeholder: 'https://linkedin.com/in/username',
    Icon: FaLinkedinIn,
    iconBg: '#0A66C2',
  },
  TWITTER: {
    label: 'Twitter / X',
    color: 'bg-black',
    dot: 'bg-black',
    placeholder: 'https://x.com/username',
    Icon: FaXTwitter,
    iconBg: '#000000',
  },
  INSTAGRAM: {
    label: 'Instagram',
    color: 'bg-[#E1306C]',
    dot: 'bg-[#E1306C]',
    placeholder: 'https://instagram.com/username',
    Icon: FaInstagram,
    iconBg: '#E1306C',
  },
  GITHUB: {
    label: 'GitHub',
    color: 'bg-gray-900',
    dot: 'bg-gray-900',
    placeholder: 'https://github.com/username',
    Icon: FaGithub,
    iconBg: '#171515',
  },
  YOUTUBE: {
    label: 'YouTube',
    color: 'bg-[#FF0000]',
    dot: 'bg-[#FF0000]',
    placeholder: 'https://youtube.com/@channel',
    Icon: FaYoutube,
    iconBg: '#FF0000',
  },
  TIKTOK: {
    label: 'TikTok',
    color: 'bg-black',
    dot: 'bg-black',
    placeholder: 'https://tiktok.com/@username',
    Icon: FaTiktok,
    iconBg: '#010101',
  },
  WHATSAPP: {
    label: 'WhatsApp',
    color: 'bg-[#25D366]',
    dot: 'bg-[#25D366]',
    placeholder: 'https://wa.me/15550000000',
    Icon: FaWhatsapp,
    iconBg: '#25D366',
  },
  FACEBOOK: {
    label: 'Facebook',
    color: 'bg-[#1877F2]',
    dot: 'bg-[#1877F2]',
    placeholder: 'https://facebook.com/username',
    Icon: FaFacebookF,
    iconBg: '#1877F2',
  },
  CALENDLY: {
    label: 'Calendly',
    color: 'bg-[#0069FF]',
    dot: 'bg-[#0069FF]',
    placeholder: 'https://calendly.com/username',
    Icon: SiCalendly,
    iconBg: '#0069FF',
  },
  CALCOM: {
    label: 'Cal.com',
    color: 'bg-gray-800',
    dot: 'bg-gray-800',
    placeholder: 'https://cal.com/username',
    Icon: LuCalendarDays,
    iconBg: '#111827',
  },
  CUSTOM: {
    label: 'Custom URL',
    color: 'bg-gray-500',
    dot: 'bg-gray-400',
    placeholder: 'https://your-link.com',
    Icon: null,
    iconBg: '#64748b',
  },
}

const PLATFORM_OPTIONS = Object.values(SocialPlatform)

// ── Platform icon renderer ────────────────────────────────────────────────────
function PlatformIcon({
  platform,
  size = 16,
  className,
}: {
  platform: string
  size?: number
  className?: string
}): JSX.Element {
  const m = PLATFORM_META[platform] ?? PLATFORM_META['CUSTOM']
  if (!m) return <Globe size={size} className={className} />

  const { Icon, iconBg } = m

  return (
    <span
      className="inline-flex items-center justify-center rounded-full shrink-0"
      style={{
        width: size + 14,
        height: size + 14,
        backgroundColor: iconBg,
      }}
    >
      {Icon ? <Icon size={size} color="#ffffff" /> : <Globe size={size} className="text-white" />}
    </span>
  )
}

export function LinksTab({ links, onChange }: LinksTabProps): JSX.Element {
  const idCounterRef = useRef(1000)
  const [selected, setSelected] = useState<SocialPlatform>(SocialPlatform.LINKEDIN)
  const [newUrl, setNewUrl] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(links.length === 0)

  const meta = (platform: string): (typeof PLATFORM_META)[keyof typeof PLATFORM_META] =>
    PLATFORM_META[platform] ??
    (PLATFORM_META['CUSTOM'] as (typeof PLATFORM_META)[keyof typeof PLATFORM_META])

  const addLink = () => {
    if (!newUrl.trim()) return
    try {
      new URL(newUrl)
    } catch {
      setUrlError('Please enter a valid URL')
      return
    }
    setUrlError(null)
    const link: SocialLinkData = {
      id: `new-${idCounterRef.current++}`,
      platform: selected,
      url: newUrl,
      displayOrder: links.length,
    }
    onChange([...links, link])
    setNewUrl('')
    setShowAddForm(false)
  }

  const removeLink = (id: string) => {
    onChange(links.filter((l) => l.id !== id).map((l, i) => ({ ...l, displayOrder: i })))
  }

  return (
    <div className="space-y-4">
      {/* ── Existing links ── */}
      {links.length > 0 && (
        <div className="space-y-2">
          {links.map((link) => {
            const m = meta(link.platform)
            return (
              <div
                key={link.id}
                className="app-panel-subtle flex items-center gap-3 rounded-[24px] px-4 py-3 transition-all hover:bg-white hover:shadow-[0_18px_40px_-30px_rgba(15,23,42,0.2)]"
              >
                {/* Platform icon */}
                <PlatformIcon platform={link.platform} size={14} />

                {/* Platform name + url */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{m.label}</p>
                  <p className="truncate text-xs text-gray-400">{link.url}</p>
                </div>

                {/* Open link */}
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-lg p-1.5 text-gray-300 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>

                {/* Remove */}
                <button
                  type="button"
                  onClick={() => removeLink(link.id)}
                  className="shrink-0 rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Empty state ── */}
      {links.length === 0 && !showAddForm && (
        <div className="app-panel-subtle flex flex-col items-center gap-2 rounded-[24px] border border-dashed border-gray-200 py-8 text-center">
          <Link2 className="h-8 w-8 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">No links yet</p>
          <p className="text-xs text-gray-400">Add your social profiles and custom links</p>
        </div>
      )}

      {/* ── Add link form ── */}
      {showAddForm ? (
        <div className="rounded-[28px] border border-brand-100 bg-brand-50/55 p-4 shadow-[0_24px_60px_-42px_rgba(14,165,233,0.28)] space-y-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            Add Social Link
          </p>

          {/* Platform icon grid */}
          <div className="grid grid-cols-4 gap-2">
            {PLATFORM_OPTIONS.map((p) => {
              const m = meta(p)
              const active = selected === p
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setSelected(p as SocialPlatform)
                    setNewUrl('')
                    setUrlError(null)
                  }}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border-2 py-2.5 px-1 transition-all',
                    active
                      ? 'border-brand-400 bg-white shadow-sm'
                      : 'border-transparent bg-white/60 hover:bg-white hover:border-gray-200',
                  )}
                >
                  <PlatformIcon platform={p} size={14} />
                  <span className="text-[9px] font-semibold text-gray-600 leading-tight text-center">
                    {m.label.replace(' / ', '/').replace('Custom URL', 'Custom')}
                  </span>
                </button>
              )
            })}
          </div>

          {/* URL input */}
          <div>
            <div
              className={cn(
                'flex items-center gap-2.5 rounded-2xl border bg-white px-3.5 py-3',
                'transition-all focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-500/20',
                urlError ? 'border-red-300' : 'border-gray-200',
              )}
            >
              <Link2 className="h-4 w-4 shrink-0 text-gray-400" />
              <input
                type="url"
                value={newUrl}
                onChange={(e) => {
                  setNewUrl(e.target.value)
                  setUrlError(null)
                }}
                onKeyDown={(e) => e.key === 'Enter' && addLink()}
                placeholder={meta(selected).placeholder}
                className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 outline-none"
              />
            </div>
            {urlError && <p className="mt-1.5 px-1 text-xs text-red-500">{urlError}</p>}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false)
                setNewUrl('')
                setUrlError(null)
              }}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={addLink}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-white shadow-sm shadow-brand-500/25 hover:bg-brand-600 transition-colors active:scale-95"
            >
                      <Plus className="h-5 w-5 transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(14,165,233,0.1)_0%,transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              Add Link
            </button>
          </div>
        </div>
      ) : (
        /* ── Show form button ── */
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/50 py-3.5 text-sm font-semibold text-brand-600 hover:border-brand-400 hover:bg-brand-50 transition-all active:scale-95"
        >
                  <Plus className="h-5 w-5 transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(14,165,233,0.1)_0%,transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          Add Link
        </button>
      )}
    </div>
  )
}
