'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { JSX } from 'react'
import { cn } from '@/lib/cn'
import { hasPlanAccess } from '@/lib/billing-plans'
import { useBillingPlan } from '@/components/billing/BillingPlanProvider'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import { getActiveApp } from '@/components/navigation/apps-nav'
import type { AppDefinition } from '@/components/navigation/apps-nav'

// ─── AppSidebar ───────────────────────────────────────────────────────────────

interface AppSidebarProps {
  className?: string
}

export function AppSidebar({ className }: AppSidebarProps): JSX.Element {
  const pathname = usePathname()
  const app = getActiveApp(pathname)

  if (!app) return <></>

  return (
    <aside
      className={cn(
        'app-shell-surface hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-white/70 sticky top-0 lg:flex lg:flex-col',
        className,
      )}
    >
      <AppSidebarContent app={app} pathname={pathname} />
    </aside>
  )
}

// ─── Content (also used inside mobile drawer) ─────────────────────────────────

export function AppSidebarContent({
  app,
  pathname,
  onNavigate,
}: {
  app: AppDefinition
  pathname: string
  onNavigate?: () => void
}): JSX.Element {
  const { plan } = useBillingPlan()
  const visibleSections = app.sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.minPlan || hasPlanAccess(plan, item.minPlan)),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <nav className="flex h-full flex-col px-4 py-5" aria-label={`${app.label} navigation`}>
      {/* App header */}
      <div className="app-panel-subtle mb-6 flex items-center gap-3 rounded-[26px] px-3 py-3.5">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-sm"
          style={{ background: app.gradient }}
        >
          <app.icon className="h-4.5 w-4.5 text-white" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-bold leading-tight text-gray-950">{app.label}</p>
          <p className="truncate text-[11px] leading-tight text-gray-500">{app.description}</p>
        </div>
      </div>

      {/* Nav sections */}
      <div className="flex-1 space-y-6 overflow-y-auto pr-1">
        {visibleSections.map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">
              {section.title}
            </p>
            <ul className="space-y-1">
              {section.items.map(({ href, label, icon: Icon, badge }) => {
                const isActive = pathname === href || pathname.startsWith(href + '/')
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={onNavigate}
                      aria-current={isActive ? 'page' : undefined}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150',
                        isActive
                          ? 'bg-gray-950 text-white shadow-[0_20px_40px_-26px_rgba(15,23,42,0.9)]'
                          : 'text-gray-500 hover:bg-white/90 hover:text-gray-950 hover:shadow-[0_16px_34px_-28px_rgba(15,23,42,0.35)]',
                      )}
                    >
                      {isActive && (
                        <span
                          className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full"
                          style={{ background: app.gradient }}
                        />
                      )}
                      <Icon
                        className={cn(
                          'h-4 w-4 shrink-0',
                          isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600',
                        )}
                        aria-hidden="true"
                      />
                      <span className="flex-1 truncate">{label}</span>
                      {badge && (
                        <span className="ml-auto rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {badge}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Cross-app links */}
      {app.crossLinks && app.crossLinks.length > 0 && (
        <div className="mt-5 border-t border-slate-200/70 pt-4">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">
            Quick Links
          </p>
          <ul className="space-y-1">
            {app.crossLinks.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  className="group flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm font-medium text-gray-400 transition-all hover:bg-white/90 hover:text-gray-700"
                >
                  <Icon
                    className="h-3.5 w-3.5 shrink-0 text-gray-300 group-hover:text-gray-500"
                    aria-hidden="true"
                  />
                  <span className="flex-1 truncate text-xs">{label}</span>
                  <ExternalLink
                    className="h-3 w-3 opacity-0 group-hover:opacity-60"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Back to home */}
      <div className="mt-4 border-t border-slate-200/70 pt-4">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5 text-xs font-medium text-gray-400 transition-all hover:bg-white/90 hover:text-gray-700"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          All Apps
        </Link>
      </div>
    </nav>
  )
}
