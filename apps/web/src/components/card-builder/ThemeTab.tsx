'use client'

import type { JSX } from 'react'
import {
  CardTemplate,
  type CardThemeData,
  type ButtonStyle,
  type SocialButtonStyle,
} from '@dotly/types'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

// ── Template visual data ─────────────────────────────────────────────────────
const TEMPLATES: {
  id: CardTemplate
  label: string
  description: string
  /** Preview swatch: background + foreground colors shown in the mini card */
  bg: string
  accent: string
  textColor: string
}[] = [
  {
    id: CardTemplate.MINIMAL,
    label: 'Minimal',
    description: 'Clean & white',
    bg: 'bg-white',
    accent: 'bg-gray-900',
    textColor: 'text-gray-900',
  },
  {
    id: CardTemplate.BOLD,
    label: 'Bold',
    description: 'Dark & striking',
    bg: 'bg-gray-900',
    accent: 'bg-brand-500',
    textColor: 'text-white',
  },
  {
    id: CardTemplate.CREATIVE,
    label: 'Creative',
    description: 'Gradient & vibrant',
    bg: 'bg-gradient-to-br from-brand-400 to-purple-500',
    accent: 'bg-white',
    textColor: 'text-white',
  },
  {
    id: CardTemplate.CORPORATE,
    label: 'Corporate',
    description: 'Two-column pro',
    bg: 'bg-slate-100',
    accent: 'bg-slate-700',
    textColor: 'text-slate-900',
  },
  {
    id: CardTemplate.ELEGANT,
    label: 'Elegant',
    description: 'Luxury serif',
    bg: 'bg-[#FDFAF6]',
    accent: 'bg-[#9A7B4F]',
    textColor: 'text-[#1A1410]',
  },  {
    id: CardTemplate.DARK,
    label: 'Dark',
    description: 'Neon highlights',
    bg: 'bg-[#050505]',
    accent: 'bg-[#00E5FF]',
    textColor: 'text-[#F4F4F5]',
  },
  {
    id: CardTemplate.NEON,
    label: 'Neon',
    description: 'Vibrant & glowing',
    bg: 'bg-[#0A0A0A]',
    accent: 'bg-[#FF00FF]',
    textColor: 'text-[#FFFFFF]',
  },
  {
    id: CardTemplate.RETRO,
    label: 'Retro',
    description: 'Vintage Y2K style',
    bg: 'bg-[#F1F5F9]',
    accent: 'bg-[#FF90E8]',
    textColor: 'text-[#000000]',
  },
  {
    id: CardTemplate.GLASSMORPHISM,
    label: 'Glass',
    description: 'Deep frosted blur',
    bg: 'bg-[#0b0f19]',
    accent: 'bg-white/5 border border-white/10 backdrop-blur-xl',
    textColor: 'text-white',
  },
]

const FONT_OPTIONS = ['Inter', 'Roboto', 'Playfair Display', 'Space Grotesk', 'Lato', 'Montserrat']

const BUTTON_STYLES: {
  id: ButtonStyle
  label: string
  description: string
}[] = [
  {
    id: 'filled-icon-text',
    label: 'Filled + Icon & Text',
    description: 'Full-width filled button with icon and label',
  },
  {
    id: 'icon-text',
    label: 'Icon & Text',
    description: 'Outlined button with icon and label',
  },
  {
    id: 'filled-icon',
    label: 'Filled + Icon',
    description: 'Full-width filled button, icon only',
  },
  {
    id: 'icon',
    label: 'Icon Only',
    description: 'Compact circular icon button',
  },
]

const SOCIAL_BUTTON_STYLES: {
  id: SocialButtonStyle
  label: string
  description: string
}[] = [
  {
    id: 'follow',
    label: 'Follow Buttons',
    description: 'Full-width brand buttons — "Follow me on Facebook"',
  },
  {
    id: 'pills',
    label: 'Pills',
    description: 'Compact brand-coloured pill with icon + name',
  },
  {
    id: 'icons',
    label: 'Icon Circles',
    description: 'Small circular icon-only buttons',
  },
  {
    id: 'list',
    label: 'Text List',
    description: 'Inline icon + underlined platform name',
  },
]

interface ThemeTabProps {
  templateId: CardTemplate
  theme: CardThemeData
  onTemplateChange: (templateId: CardTemplate) => void
  onThemeChange: (updates: Partial<CardThemeData>) => void
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
        {label}
      </p>
      <div className="h-px flex-1 bg-gray-100" />
    </div>
  )
}

/** Small visual preview of a button style variant */
function ButtonStylePreview({ styleId }: { styleId: ButtonStyle }) {
  const isIcon = styleId === 'icon'
  const isFilled = styleId === 'filled-icon' || styleId === 'filled-icon-text'
  const hasText = styleId === 'icon-text' || styleId === 'filled-icon-text'

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center gap-1 rounded-full text-[10px] font-semibold',
        isIcon ? 'h-7 w-7' : hasText ? 'h-7 px-2.5' : 'h-7 w-16',
        isFilled ? 'bg-brand-500 text-white' : 'border border-brand-400 bg-white text-brand-500',
      )}
    >
      <svg
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4M12 7v6M9 10l3 3 3-3" />
      </svg>
      {hasText && <span>Save</span>}
    </div>
  )
}

/** Small visual preview of a social button style variant */
function SocialButtonStylePreview({ styleId }: { styleId: SocialButtonStyle }) {
  // Facebook brand colour for the mini preview
  const fbBlue = '#1877F2'

  if (styleId === 'follow') {
    return (
      <div
        className="shrink-0 flex items-center gap-1.5 rounded-lg px-2 py-1 text-[9px] font-bold text-white"
        style={{ background: fbBlue, minWidth: 80 }}
      >
        {/* Facebook F icon */}
        <svg width="7" height="12" viewBox="0 0 10 20" fill="white" aria-hidden="true">
          <path d="M10 0H7C5.343 0 4 1.343 4 3v3H0v4h4v10h4V10h3l1-4H8V3a1 1 0 0 1 1-1h1V0z" />
        </svg>
        <span>Follow on Facebook</span>
      </div>
    )
  }

  if (styleId === 'pills') {
    return (
      <div
        className="shrink-0 flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold text-white"
        style={{ background: fbBlue }}
      >
        <svg width="7" height="12" viewBox="0 0 10 20" fill="white" aria-hidden="true">
          <path d="M10 0H7C5.343 0 4 1.343 4 3v3H0v4h4v10h4V10h3l1-4H8V3a1 1 0 0 1 1-1h1V0z" />
        </svg>
        <span>Facebook</span>
      </div>
    )
  }

  if (styleId === 'icons') {
    return (
      <div className="shrink-0 flex gap-1.5">
        {[fbBlue, '#E1306C', '#000'].map((bg) => (
          <div
            key={bg}
            className="h-6 w-6 rounded-full flex items-center justify-center"
            style={{ background: bg }}
          >
            <div className="h-2 w-2 rounded-full bg-white/60" />
          </div>
        ))}
      </div>
    )
  }

  // list
  return (
    <div className="shrink-0 flex items-center gap-1.5">
      <div
        className="h-5 w-5 rounded-full flex items-center justify-center"
        style={{ background: fbBlue }}
      >
        <svg width="5" height="9" viewBox="0 0 10 20" fill="white" aria-hidden="true">
          <path d="M10 0H7C5.343 0 4 1.343 4 3v3H0v4h4v10h4V10h3l1-4H8V3a1 1 0 0 1 1-1h1V0z" />
        </svg>
      </div>
      <span className="text-[9px] font-semibold text-brand-500 underline">Facebook</span>
    </div>
  )
}

export function ThemeTab({
  templateId,
  theme,
  onTemplateChange,
  onThemeChange,
}: ThemeTabProps): JSX.Element {
  return (
    <div className="space-y-6">
      {/* ── Template picker ── */}
      <div className="space-y-3">
        <SectionHeader label="Template" />
        <div className="grid grid-cols-2 gap-3">
          {TEMPLATES.map((tmpl) => {
            const active = templateId === tmpl.id
            return (
              <button
                key={tmpl.id}
                type="button"
                onClick={() => onTemplateChange(tmpl.id)}
                className={cn(
                  'relative flex flex-col items-start overflow-hidden rounded-2xl border-2 transition-all duration-150 active:scale-95',
                  active
                    ? 'border-brand-500 shadow-md shadow-brand-500/20'
                    : 'border-gray-100 hover:border-gray-300',
                )}
              >
                {/* Mini card swatch */}
                <div className={cn('flex h-24 w-full flex-col gap-2 p-3', tmpl.bg)}>
                  {/* Avatar line */}
                  <div className="flex items-center gap-2">
                    <div className={cn('h-7 w-7 shrink-0 rounded-full', tmpl.accent)} />
                    <div className="flex flex-col gap-1">
                      <div className={cn('h-1.5 w-14 rounded-full opacity-70', tmpl.accent)} />
                      <div className={cn('h-1 w-10 rounded-full opacity-40', tmpl.accent)} />
                    </div>
                  </div>
                  {/* Content lines */}
                  <div className="flex flex-col gap-1 pl-1">
                    <div className={cn('h-1 w-full rounded-full opacity-30', tmpl.accent)} />
                    <div className={cn('h-1 w-3/4 rounded-full opacity-20', tmpl.accent)} />
                  </div>
                  {/* CTA pill */}
                  <div className={cn('mt-auto self-start rounded-full px-2 py-0.5', tmpl.accent)}>
                    <div className="h-1 w-8 rounded-full bg-white/50" />
                  </div>
                </div>

                {/* Label area */}
                <div className="w-full bg-white px-3 py-2.5">
                  <p className="text-xs font-bold text-gray-900">{tmpl.label}</p>
                  <p className="text-[10px] text-gray-400">{tmpl.description}</p>
                </div>

                {/* Selected checkmark */}
                {active && (
                  <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 shadow">
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Colors ── */}
      <div className="space-y-4">
        <SectionHeader label="Colors" />

        {/* Primary color */}
        <div>
          <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Primary
          </p>
          <div className="flex items-center gap-3">
            <label className="relative h-11 w-14 cursor-pointer overflow-hidden rounded-xl border-2 border-gray-200 hover:border-brand-400 transition-colors">
              <input
                type="color"
                value={theme.primaryColor}
                onChange={(e) => onThemeChange({ primaryColor: e.target.value })}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              <div
                className="h-full w-full rounded-[9px]"
                style={{ background: theme.primaryColor }}
              />
            </label>
            <input
              type="text"
              value={theme.primaryColor}
              onChange={(e) => {
                const v = e.target.value
                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onThemeChange({ primaryColor: v })
              }}
              className={cn(
                'flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-3 font-mono text-sm text-gray-900 uppercase',
                'focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400',
              )}
              placeholder="#000000"
              maxLength={7}
            />
          </div>
        </div>

        {/* Secondary color */}
        <div>
          <p className="mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Secondary
          </p>
          <div className="flex items-center gap-3">
            <label className="relative h-11 w-14 cursor-pointer overflow-hidden rounded-xl border-2 border-gray-200 hover:border-brand-400 transition-colors">
              <input
                type="color"
                value={theme.secondaryColor}
                onChange={(e) => onThemeChange({ secondaryColor: e.target.value })}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              <div
                className="h-full w-full rounded-[9px]"
                style={{ background: theme.secondaryColor }}
              />
            </label>
            <input
              type="text"
              value={theme.secondaryColor}
              onChange={(e) => {
                const v = e.target.value
                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onThemeChange({ secondaryColor: v })
              }}
              className={cn(
                'flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-3 font-mono text-sm text-gray-900 uppercase',
                'focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400',
              )}
              placeholder="#ffffff"
              maxLength={7}
            />
          </div>
        </div>
      </div>

      {/* ── Font ── */}
      <div className="space-y-3">
        <SectionHeader label="Typography" />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Font Family</p>
        <div className="grid grid-cols-1 gap-2">
          {FONT_OPTIONS.map((font) => {
            const active = theme.fontFamily === font
            return (
              <button
                key={font}
                type="button"
                onClick={() => onThemeChange({ fontFamily: font })}
                className={cn(
                  'flex items-center justify-between rounded-2xl border-2 px-4 py-3 transition-all duration-150 active:scale-[0.98]',
                  active
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white',
                )}
              >
                <span
                  className={cn(
                    'text-base',
                    active ? 'text-brand-700 font-semibold' : 'text-gray-700',
                  )}
                  style={{ fontFamily: font }}
                >
                  {font}
                </span>
                {active && <Check className="h-4 w-4 text-brand-500" strokeWidth={2.5} />}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Button Style ── */}
      <div className="space-y-3">
        <SectionHeader label="Button Style" />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">CTA Buttons</p>
        <div className="grid grid-cols-1 gap-2">
          {BUTTON_STYLES.map((style) => {
            const active = (theme.buttonStyle ?? 'filled-icon-text') === style.id
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => onThemeChange({ buttonStyle: style.id })}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-all duration-150 active:scale-[0.98]',
                  active
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white',
                )}
              >
                {/* Mini preview */}
                <ButtonStylePreview styleId={style.id} />
                <span className="flex-1 min-w-0">
                  <span
                    className={cn(
                      'block text-sm font-semibold',
                      active ? 'text-brand-700' : 'text-gray-800',
                    )}
                  >
                    {style.label}
                  </span>
                  <span className="block text-[11px] text-gray-400 mt-0.5">
                    {style.description}
                  </span>
                </span>
                {active && <Check className="h-4 w-4 shrink-0 text-brand-500" strokeWidth={2.5} />}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Social Links Style ── */}
      <div className="space-y-3">
        <SectionHeader label="Social Links" />
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Button Style</p>
        <div className="grid grid-cols-1 gap-2">
          {SOCIAL_BUTTON_STYLES.map((style) => {
            const active = (theme.socialButtonStyle ?? 'follow') === style.id
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => onThemeChange({ socialButtonStyle: style.id })}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-all duration-150 active:scale-[0.98]',
                  active
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white',
                )}
              >
                <SocialButtonStylePreview styleId={style.id} />
                <span className="flex-1 min-w-0">
                  <span
                    className={cn(
                      'block text-sm font-semibold',
                      active ? 'text-brand-700' : 'text-gray-800',
                    )}
                  >
                    {style.label}
                  </span>
                  <span className="block text-[11px] text-gray-400 mt-0.5">
                    {style.description}
                  </span>
                </span>
                {active && <Check className="h-4 w-4 shrink-0 text-brand-500" strokeWidth={2.5} />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
