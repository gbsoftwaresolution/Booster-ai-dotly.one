'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAccessToken } from '@/lib/auth/client'
import { apiPost, isApiError } from '@/lib/api'
import { CardTemplate } from '@dotly/types'
import { cn } from '@/lib/cn'
import { Check } from 'lucide-react'

function getCardPlanLimitMessage(error: unknown): string | null {
  if (!isApiError(error) || error.code !== 'PLAN_LIMIT_REACHED') return null

  const details =
    error.details && typeof error.details === 'object'
      ? (error.details as { limit?: unknown })
      : undefined
  const limit = typeof details?.limit === 'number' ? details.limit : 1

  if (limit === 1) {
    return 'Your current plan allows 1 card. Upgrade to Pro to create up to 3 cards.'
  }

  return `Your current plan allows ${limit} cards. Upgrade your billing plan to add more.`
}

// ── Template visual data ───────────────────────────────────────────────────────

const TEMPLATES: {
  id: CardTemplate
  label: string
  description: string
  tags: string[]
  preview: React.ReactNode
}[] = [
  {
    id: CardTemplate.MINIMAL,
    label: 'Minimal',
    description: 'Clean white layout with centered content — timeless and versatile.',
    tags: ['Professional', 'Clean'],
    preview: (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-white p-3">
        <div className="h-8 w-8 rounded-full bg-gray-200" />
        <div className="h-2 w-20 rounded-full bg-gray-300" />
        <div className="h-1.5 w-14 rounded-full bg-gray-200" />
        <div className="mt-1 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-5 w-5 rounded-full bg-gray-100" />
          ))}
        </div>
        <div className="mt-1 h-6 w-24 rounded-full bg-gray-900" />
      </div>
    ),
  },
  {
    id: CardTemplate.BOLD,
    label: 'Bold',
    description: 'Dark background with a strong typographic presence — makes a statement.',
    tags: ['Creative', 'Dark'],
    preview: (
      <div className="flex h-full w-full flex-col items-start gap-2 bg-[#0f1117] p-3">
        <div
          className="h-1 w-full rounded-full"
          style={{ background: 'linear-gradient(90deg,#0ea5e9,#6366f1)' }}
        />
        <div className="mt-1 h-8 w-8 rounded-full bg-sky-500" />
        <div className="h-2 w-20 rounded-full bg-white/70" />
        <div className="h-1.5 w-14 rounded-full bg-white/30" />
        <div className="mt-1 flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-5 w-5 rounded-full bg-white/10" />
          ))}
        </div>
        <div className="mt-auto h-6 w-full rounded-lg bg-sky-500/20" />
      </div>
    ),
  },
  {
    id: CardTemplate.CREATIVE,
    label: 'Creative',
    description: 'Gradient header with a media portfolio strip — built for creators.',
    tags: ['Creator', 'Vibrant'],
    preview: (
      <div className="flex h-full w-full flex-col gap-0 overflow-hidden">
        {/* Gradient header */}
        <div
          className="flex flex-col items-center gap-1.5 px-3 pb-3 pt-4"
          style={{ background: 'linear-gradient(135deg,#0ea5e9,#6366f1)' }}
        >
          <div className="h-9 w-9 rounded-full border-2 border-white bg-white/30" />
          <div className="h-2 w-16 rounded-full bg-white/80" />
          <div className="h-1.5 w-10 rounded-full bg-white/50" />
        </div>
        {/* Content card */}
        <div className="flex flex-1 flex-col gap-1.5 bg-white px-3 pb-2 pt-2">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-8 flex-1 rounded-lg bg-gray-100" />
            ))}
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-100" />
          <div className="h-1.5 w-3/4 rounded-full bg-gray-100" />
        </div>
      </div>
    ),
  },
  {
    id: CardTemplate.CORPORATE,
    label: 'Corporate',
    description: 'Two-column layout with company branding — built for enterprise.',
    tags: ['Business', 'Structured'],
    preview: (
      <div className="flex h-full w-full overflow-hidden">
        {/* Left sidebar */}
        <div className="flex w-1/3 flex-col items-center gap-2 bg-slate-700 px-2 py-3">
          <div className="h-8 w-8 rounded-full bg-white/30" />
          <div className="h-1.5 w-10 rounded-full bg-white/50" />
          <div className="h-1 w-8 rounded-full bg-white/30" />
          <div className="mt-2 flex flex-col gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-1 w-10 rounded-full bg-white/20" />
            ))}
          </div>
        </div>
        {/* Right content */}
        <div className="flex flex-1 flex-col gap-2 bg-slate-50 p-2">
          <div className="h-1.5 w-full rounded-full bg-slate-200" />
          <div className="h-1.5 w-3/4 rounded-full bg-slate-200" />
          <div className="h-1.5 w-1/2 rounded-full bg-slate-200" />
          <div className="mt-1 flex flex-col gap-1">
            {[0, 1].map((i) => (
              <div key={i} className="flex items-center gap-1">
                <div className="h-3 w-3 rounded bg-slate-300" />
                <div className="h-1.5 flex-1 rounded-full bg-slate-200" />
              </div>
            ))}
          </div>
          <div className="mt-auto h-5 w-full rounded-lg bg-slate-700/20" />
        </div>
      </div>
    ),
  },
  {
    id: CardTemplate.ELEGANT,
    label: 'Elegant',
    description: 'Luxury design, muted tones and serif typography — for a refined presence.',
    tags: ['Luxury', 'Premium'],
    preview: (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#FDFAF6] p-3 border border-[#E8E4DF]">
        <div className="h-10 w-10 rounded-full border border-gray-300 bg-[#FFFFFF] shadow-sm flex items-center justify-center">
          <div className="h-8 w-8 rounded-full bg-[#9A7B4F] opacity-70" />
        </div>
        <div className="h-1.5 w-20 rounded-none bg-[#1A1817]" />
        <div className="h-1 w-16 rounded-none bg-[#6E6B68]" />
        <div className="mt-2 w-full border-t border-[#E8E4DF] pt-2 flex flex-col gap-1 items-center">
          <div className="h-1 w-24 rounded-none bg-[#2C2B29] opacity-80" />
          <div className="h-1 w-16 rounded-none bg-[#2C2B29] opacity-60" />
        </div>
      </div>
    ),
  },
  {
    id: CardTemplate.DARK,
    label: 'Dark',
    description: 'Dark-mode first design with neon highlights — futuristic and striking.',
    tags: ['Neon', 'Future'],
    preview: (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#050505] p-3 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-[#00E5FF] rounded-full blur-[24px] opacity-20"></div>
        <div className="h-9 w-9 rounded-full border border-[#00E5FF] bg-[#121212] z-10 shadow-[0_0_8px_rgba(0,229,255,0.4)]" />
        <div className="h-2 w-16 bg-[#F4F4F5] z-10" />
        <div className="h-1.5 w-12 bg-[#00E5FF] z-10 opacity-90" />
        <div className="mt-2 flex w-full flex-col gap-1 z-10">
          {[0, 1].map((i) => (
            <div key={i} className="h-3 w-full rounded border border-[#27272A] bg-[#121212]" />
          ))}
        </div>
      </div>
    ),
  },
  {
    id: CardTemplate.NEON,
    label: 'Neon',
    description: 'Vibrant, glow effects — ideal for nightlife/entertainment.',
    tags: ['Nightlife', 'Vibrant'],
    preview: (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#0A0A0A] p-3 relative overflow-hidden">
        {/* Extreme glowing backgrounds */}
        <div className="absolute top-0 right-0 w-16 h-16 bg-[#FF00FF] rounded-full blur-[30px] opacity-30"></div>
        <div className="absolute bottom-0 left-0 w-16 h-16 bg-[#00FFFF] rounded-full blur-[30px] opacity-20"></div>

        {/* Avatar area */}
        <div className="h-9 w-9 rounded-full border-2 border-[#FF00FF] bg-[#141414] z-10 shadow-[0_0_12px_rgba(255,0,255,0.6)]" />
        <div className="h-2 w-16 bg-[#FFFFFF] z-10 shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
        <div className="h-1.5 w-12 bg-[#00FFFF] z-10 opacity-90 shadow-[0_0_4px_rgba(0,255,255,0.5)]" />

        <div className="mt-2 flex w-full flex-col gap-1.5 z-10">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-4 w-full rounded-md border border-[#FF00FF] bg-black/40 shadow-[0_0_8px_rgba(255,0,255,0.2)]"
            />
          ))}
        </div>
      </div>
    ),
  },
  {
    id: CardTemplate.RETRO,
    label: 'Retro',
    description: 'Vintage or Y2K aesthetic.',
    tags: ['Y2K', 'Vintage', 'Fun'],
    preview: (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[#F1F5F9] p-3 relative overflow-hidden border-4 border-[#FF90E8]">
        <div className="absolute top-0 left-0 right-0 h-4 bg-[#FF90E8] border-b-2 border-black flex items-center px-1">
          <div className="h-1.5 w-1.5 bg-white border border-black"></div>
        </div>
        <div className="h-9 w-9 rounded-none border-2 border-black bg-white z-10 shadow-[2px_2px_0_black] mt-3" />
        <div className="h-2 w-16 bg-black z-10" />
        <div className="h-1.5 w-12 bg-black z-10 opacity-70" />

        <div className="mt-2 flex w-full flex-col gap-1.5 z-10">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-4 w-full border-2 border-black bg-white shadow-[2px_2px_0_black]"
            />
          ))}
        </div>
      </div>
    ),
  },
  {
    id: CardTemplate.GLASSMORPHISM,
    label: 'Glassmorphism',
    description: 'Frosted-glass cards with blur/transparency effects.',
    tags: ['Modern', 'Blur', 'Clean'],
    preview: (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-500 p-3 relative overflow-hidden">
        <div className="absolute -top-4 -left-4 w-16 h-16 bg-[#6366F1] rounded-full blur-[20px] opacity-60"></div>
        <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-[#EC4899] rounded-full blur-[20px] opacity-60"></div>

        <div className="h-9 w-9 rounded-full border border-white/40 bg-white/20 backdrop-blur-md z-10 shadow-lg" />
        <div className="h-2 w-16 bg-white z-10 rounded-full opacity-90 shadow-sm" />
        <div className="h-1.5 w-12 bg-white/70 z-10 rounded-full" />

        <div className="mt-2 flex w-full flex-col gap-1.5 z-10">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-4 w-full rounded-md border border-white/20 bg-white/10 backdrop-blur-md shadow-sm"
            />
          ))}
        </div>
      </div>
    ),
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CreateCardPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<CardTemplate>(CardTemplate.MINIMAL)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCreate = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      const card = await apiPost<{ id: string }>('/cards', { templateId: selected }, token)
      router.push(`/apps/cards/${card.id}/edit`)
    } catch (err) {
      setError(getCardPlanLimitMessage(err) ?? (err instanceof Error ? err.message : 'Failed to create card'))
      setLoading(false)
    }
  }

  const selectedMeta = TEMPLATES.find((t) => t.id === selected)!

  return (
    <div
      className="mx-auto max-w-5xl space-y-8 pb-32 sm:pb-12"
      style={{ animation: 'create-fade 0.5s cubic-bezier(0.16, 1, 0.3, 1) both' }}
    >
      <style>{`
        @keyframes create-fade {
          from { opacity: 0; transform: translateY(20px); filter: blur(8px); }
          to   { opacity: 1; transform: none; filter: blur(0px); }
        }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      {/* Header */}
      <div className="flex flex-col items-center text-center space-y-3 px-4 sm:px-0 mt-4 sm:mt-8 mb-8 sm:mb-12">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600">
          Choose a Template
        </h1>
        <p className="max-w-xl text-base text-gray-500">
          Pick a starting point for your new card. You can customize everything inside the editor.
        </p>
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {TEMPLATES.map((tmpl) => {
          const active = selected === tmpl.id
          return (
            <button
              key={tmpl.id}
              type="button"
              onClick={() => setSelected(tmpl.id)}
              className={cn(
                'group relative flex flex-col overflow-hidden rounded-[24px] border-2 text-left transition-all duration-300 active:scale-[0.98]',
                active
                  ? 'border-sky-500 shadow-xl shadow-sky-500/20 bg-white ring-2 ring-sky-500/20'
                  : 'border-transparent bg-white shadow-sm ring-1 ring-gray-950/5 hover:border-gray-200 hover:shadow-md',
              )}
            >
              {/* Visual preview */}
              <div className="relative h-48 w-full overflow-hidden bg-gray-50 sm:h-56">
                {tmpl.preview}
                <div className={cn(
                  "absolute inset-0 bg-sky-500/10 transition-opacity duration-300",
                  active ? "opacity-100" : "opacity-0 group-hover:opacity-50"
                )} />

                {/* Selected checkmark */}
                <div className={cn(
                  "absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-white shadow-lg shadow-sky-500/30 transition-all duration-300",
                  active ? "scale-100 opacity-100" : "scale-50 opacity-0"
                )}>
                  <Check className="h-4 w-4" strokeWidth={3} />
                </div>
              </div>

              {/* Label + description */}
              <div className="flex flex-col flex-1 p-5">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className={cn('text-lg font-bold', active ? 'text-gray-900' : 'text-gray-900')}>
                    {tmpl.label}
                  </p>
                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {tmpl.tags.map((tag) => (
                      <span
                        key={tag}
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-semibold tracking-wide shadow-sm',
                          active 
                            ? 'bg-sky-100 text-sky-700 ring-1 ring-sky-200' 
                            : 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
                        )}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-gray-500">
                  {tmpl.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Floating Action Bar (Sticky Bottom) */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-white/80 pb-safe backdrop-blur-2xl ring-1 ring-gray-950/5 shadow-[0_-8px_32px_-12px_rgba(0,0,0,0.1)] sm:sticky sm:bottom-auto sm:mt-12 sm:rounded-[32px] sm:bg-white/90 sm:px-6 sm:py-6 sm:shadow-2xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4 sm:p-0">
          
          <div className="hidden sm:flex flex-col">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Selected Template</p>
            <p className="text-lg font-bold text-gray-900">{selectedMeta.label}</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex w-full items-center gap-3 rounded-2xl border border-red-100 bg-red-50/80 backdrop-blur-sm px-4 py-3 sm:w-auto sm:max-w-md">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <div className="flex-1">
                <p className="text-[13px] font-medium text-red-800 leading-tight">{error}</p>
                {error.includes('Upgrade to Pro') && (
                  <a
                    href="/settings/billing?plan=PRO&duration=MONTHLY"
                    className="mt-1 inline-block text-[13px] font-bold text-red-600 hover:text-red-700 hover:underline"
                  >
                    Upgrade in billing &rarr;
                  </a>
                )}
              </div>
            </div>
          )}

          {/* CTA */}
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={loading}
            className="flex w-full sm:w-auto min-w-[200px] items-center justify-center gap-2 rounded-full py-3.5 px-8 text-sm font-bold text-white shadow-lg transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', boxShadow: '0 8px 24px -8px rgba(14,165,233, 0.6)' }}
          >
            {loading ? (
              <>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  style={{ animation: 'spin .75s linear infinite' }}
                >
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Creating...
              </>
            ) : (
              <>Start with {selectedMeta.label} &rarr;</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
