'use client'

import type { JSX } from 'react'
import { CardTemplate, type CardThemeData } from '@dotly/types'
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
]

const FONT_OPTIONS = ['Inter', 'Roboto', 'Playfair Display', 'Space Grotesk', 'Lato', 'Montserrat']

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
    </div>
  )
}
