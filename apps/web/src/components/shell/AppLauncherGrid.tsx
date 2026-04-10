'use client'

import Link from 'next/link'
import type { JSX } from 'react'
import {
  ArrowRight,
  MessagesSquare,
  MonitorPlay,
  ShoppingBag,
  Sparkles,
  ConciergeBell,
} from 'lucide-react'
import { APPS } from '@/components/navigation/apps-nav'

// ─── Coming soon apps ─────────────────────────────────────────────────────────

const COMING_SOON = [
  { label: 'Services', description: 'Sell & book your services online', icon: ConciergeBell },
  { label: 'Communication', description: 'Chat, calls & video meetings', icon: MessagesSquare },
  { label: 'Ecommerce', description: 'Mini online store for your brand', icon: ShoppingBag },
  { label: 'Meetings', description: 'Structured meeting workflows', icon: MonitorPlay },
]

// ─── AppLauncherGrid ──────────────────────────────────────────────────────────

export function AppLauncherGrid(): JSX.Element {
  return (
    <section className="mb-8">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-950">Your Workspace Apps</h2>
          <p className="text-sm text-gray-500">
            Each app is a focused workspace with shared data and a cleaner cross-app flow
          </p>
        </div>
      </div>

      {/* Active apps grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {APPS.map((app) => (
          <Link
            key={app.id}
            href={app.href}
            className="app-panel group relative flex flex-col overflow-hidden rounded-[28px] p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_30px_70px_-38px_rgba(15,23,42,0.35)]"
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

            <p className="text-[15px] font-bold text-gray-950">{app.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">{app.description}</p>

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
        {COMING_SOON.map(({ label, description, icon: Icon }) => (
          <div
            key={label}
            className="app-panel-subtle flex flex-col items-start rounded-[24px] border border-dashed border-slate-200 p-4"
          >
            <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sky-600 shadow-sm">
              <Icon className="h-5 w-5" />
            </span>
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
