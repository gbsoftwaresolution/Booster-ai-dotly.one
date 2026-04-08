'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getAccessToken } from '@/lib/supabase/client'
import { apiPost } from '@/lib/api'
import { CardTemplate } from '@dotly/types'
import { cn } from '@/lib/cn'
import { Check } from 'lucide-react'

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
      router.push(`/cards/${card.id}/edit`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create card')
      setLoading(false)
    }
  }

  const selectedMeta = TEMPLATES.find((t) => t.id === selected)!

  return (
    <div
      className="mx-auto max-w-2xl space-y-8"
      style={{ animation: 'create-fade 0.4s ease both' }}
    >
      <style>{`
        @keyframes create-fade {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: none; }
        }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Choose a template</h1>
        <p className="mt-1.5 text-sm text-gray-400">
          Pick a starting point — you can customise everything inside the editor.
        </p>
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-2 gap-3">
        {TEMPLATES.map((tmpl) => {
          const active = selected === tmpl.id
          return (
            <button
              key={tmpl.id}
              type="button"
              onClick={() => setSelected(tmpl.id)}
              className={cn(
                'group flex flex-col overflow-hidden rounded-2xl border-2 text-left transition-all duration-150 active:scale-[.98]',
                active
                  ? 'border-brand-500 shadow-md shadow-brand-500/15'
                  : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm',
              )}
            >
              {/* Visual preview */}
              <div className="relative h-36 w-full overflow-hidden bg-gray-50">
                {tmpl.preview}

                {/* Selected checkmark */}
                {active && (
                  <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 shadow-md">
                    <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                  </div>
                )}
              </div>

              {/* Label + description */}
              <div className="border-t border-gray-100 bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={cn('text-sm font-bold', active ? 'text-brand-600' : 'text-gray-900')}
                  >
                    {tmpl.label}
                  </p>
                  <div className="flex gap-1">
                    {tmpl.tags.map((tag) => (
                      <span
                        key={tag}
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          active ? 'bg-brand-100 text-brand-600' : 'bg-gray-100 text-gray-400',
                        )}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="mt-0.5 text-[11px] leading-relaxed text-gray-400">
                  {tmpl.description}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* CTA */}
      <button
        type="button"
        onClick={() => void handleCreate()}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-sky-400 py-4 text-sm font-bold text-white shadow-lg shadow-brand-500/25 transition-all hover:from-brand-600 hover:to-sky-500 hover:shadow-brand-500/30 active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              style={{ animation: 'spin .75s linear infinite' }}
            >
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            Creating card…
          </>
        ) : (
          `Start with ${selectedMeta.label} →`
        )}
      </button>
    </div>
  )
}
