'use client'

import Link from 'next/link'
import type { JSX } from 'react'
import { ArrowRight, Sparkles } from 'lucide-react'
import { APPS } from '@/components/navigation/apps-nav'

// ─── Coming soon apps ─────────────────────────────────────────────────────────

const COMING_SOON = [
  { label: 'Services', description: 'Sell & book your services online', emoji: '🛎️' },
  { label: 'Communication', description: 'Chat, calls & video meetings', emoji: '💬' },
  { label: 'Ecommerce', description: 'Mini online store for your brand', emoji: '🛒' },
  { label: 'Meetings', description: 'Structured meeting workflows', emoji: '🎥' },
]

// ─── AppLauncherGrid ──────────────────────────────────────────────────────────

export function AppLauncherGrid(): JSX.Element {
  return (
    <section className="mb-8">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">Your Workspace Apps</h2>
          <p className="text-sm text-gray-500">Each app is a full workspace — all connected</p>
        </div>
      </div>

      {/* Active apps grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {APPS.map((app) => (
          <Link
            key={app.id}
            href={app.href}
            className="group relative flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 overflow-hidden"
          >
            {/* Background gradient glow */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300"
              style={{ background: app.gradient }}
            />

            {/* App icon */}
            <div
              className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm"
              style={{ background: app.gradient }}
            >
              <app.icon className="h-6 w-6 text-white" />
            </div>

            <p className="text-[15px] font-bold text-gray-900">{app.label}</p>
            <p className="mt-1 text-xs text-gray-500 leading-relaxed">{app.description}</p>

            {/* Sub-pages preview */}
            <div className="mt-3 flex flex-wrap gap-1">
              {app.sections
                .flatMap((s) => s.items)
                .slice(0, 3)
                .map((item) => (
                  <span
                    key={item.href}
                    className="rounded-lg bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-500"
                  >
                    {item.label}
                  </span>
                ))}
            </div>

            <div
              className="mt-4 flex items-center gap-1 text-xs font-semibold"
              style={{ color: '#0ea5e9' }}
            >
              Open {app.label}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>

      {/* Coming soon row */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {COMING_SOON.map(({ label, description, emoji }) => (
          <div
            key={label}
            className="flex flex-col items-start rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-4"
          >
            <span className="mb-2 text-2xl">{emoji}</span>
            <p className="text-xs font-bold text-gray-500">{label}</p>
            <p className="mt-0.5 text-[10px] text-gray-400 leading-relaxed">{description}</p>
            <span className="mt-2 flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-gray-400">
              <Sparkles className="h-2.5 w-2.5" />
              Coming soon
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
