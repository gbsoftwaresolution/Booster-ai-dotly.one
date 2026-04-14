'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { JSX } from 'react'
import { BrandLogo } from '@/components/BrandLogo'
import { cn } from '@/lib/cn'
import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { useBillingPlan } from '@/components/billing/BillingPlanProvider'
import { PwaInstallButton } from '@/components/PwaInstallButton'
import {
  getVisibleDashboardBottomTabs,
  getVisibleDashboardMoreSections,
  getVisibleDashboardNavSections,
} from '@/components/navigation/dashboard-nav'
import { useSignOut } from '@/hooks/useSignOut'

// ─── Desktop sidebar ──────────────────────────────────────────────────────────

function DesktopSidebar(): JSX.Element {
  const pathname = usePathname()
  const { signingOut, handleSignOut } = useSignOut()
  const { plan } = useBillingPlan()
  const visibleSections = getVisibleDashboardNavSections(plan)

  return (
    <aside className="app-shell-surface hidden w-64 shrink-0 lg:flex lg:flex-col">
      <nav className="flex h-full flex-col px-3 py-5" aria-label="Main navigation">
        {/* Wordmark */}
        <div className="app-panel-subtle mb-7 flex items-center gap-3 rounded-[24px] px-3 py-3.5">
          <BrandLogo size={32} iconClassName="rounded-xl" textClassName="text-[17px]" />
        </div>

        <div className="flex-1 overflow-y-auto pr-1">
          {visibleSections.map((section) => (
            <div key={section.title} className="mb-5 last:mb-0">
              <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                {section.title}
              </p>
              <ul className="space-y-0.5">
                {section.items.map(({ href, label, icon: Icon }) => {
                  const isActive = pathname === href || pathname.startsWith(href + '/')
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        aria-current={isActive ? 'page' : undefined}
                        className={cn(
                          'group relative flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium transition-all duration-150',
                          isActive
                            ? 'bg-brand-50 text-brand-600'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900',
                        )}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-brand-500" />
                        )}
                        <Icon
                          className={cn(
                            'h-4 w-4 shrink-0 transition-colors',
                            isActive ? 'text-brand-500' : 'text-gray-400 group-hover:text-gray-600',
                          )}
                          aria-hidden="true"
                        />
                        {label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100 pt-3">
          <PwaInstallButton
            className="app-touch-target flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium text-gray-500 transition-all hover:bg-sky-50 hover:text-sky-700"
            label="Install app"
          />
        </div>

        {/* Sign out */}
        <div className="border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            className="app-touch-target flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium text-gray-400 transition-all hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </nav>
    </aside>
  )
}

// ─── Mobile bottom tab bar (Apple Human Interface Guidelines style) ───────────

function MobileBottomNav(): JSX.Element {
  const pathname = usePathname()
  const { signingOut, handleSignOut } = useSignOut()
  const [moreOpen, setMoreOpen] = useState(false)
  const { plan } = useBillingPlan()
  const visibleBottomTabs = getVisibleDashboardBottomTabs(plan)
  const visibleMoreSections = getVisibleDashboardMoreSections(plan)

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
        aria-label="Mobile navigation"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {/* Solid backing for clear mobile nav contrast */}
        <div className="flex items-stretch border-t border-gray-200 bg-white">
          {visibleBottomTabs.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className="app-touch-target flex flex-1 flex-col items-center justify-center gap-[3px] py-2 transition-opacity active:opacity-60"
              >
                <span
                  className={cn(
                    'flex h-9 w-14 items-center justify-center rounded-full transition-all duration-200',
                    isActive ? 'bg-brand-500' : 'bg-transparent',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-[18px] w-[18px] transition-colors duration-200',
                      isActive ? 'text-white' : 'text-gray-400',
                    )}
                    aria-hidden="true"
                  />
                </span>
                <span
                  className={cn(
                    'text-[10px] font-medium leading-none tracking-wide transition-colors duration-200',
                    isActive ? 'text-brand-600' : 'text-gray-400',
                  )}
                >
                  {label}
                </span>
              </Link>
            )
          })}

          {/* More tab */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="app-touch-target flex flex-1 flex-col items-center justify-center gap-[3px] py-2 transition-opacity active:opacity-60"
            aria-label="More navigation options"
          >
            <span className="flex h-9 w-14 items-center justify-center rounded-full">
              <svg
                className="h-[18px] w-[18px] text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden="true"
              >
                <circle cx="5" cy="12" r="1.5" fill="currentColor" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                <circle cx="19" cy="12" r="1.5" fill="currentColor" />
              </svg>
            </span>
            <span className="text-[10px] font-medium leading-none tracking-wide text-gray-400">
              More
            </span>
          </button>
        </div>
      </nav>

      {/* More drawer */}
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 lg:hidden"
            aria-hidden="true"
            onClick={() => setMoreOpen(false)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[30px] bg-white pb-safe lg:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <span className="text-sm font-semibold text-gray-900">More</span>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
                aria-label="Close"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <nav className="max-h-[60vh] overflow-y-auto px-3 py-3">
              {visibleMoreSections.map((section) => (
                <div key={section.title} className="mb-4 last:mb-0">
                  <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                    {section.title}
                  </p>
                  <ul className="space-y-0.5">
                    {section.items.map(({ href, label, icon: Icon }) => {
                      const isActive = pathname === href || pathname.startsWith(href + '/')
                      return (
                        <li key={href}>
                          <Link
                            href={href}
                            onClick={() => setMoreOpen(false)}
                            aria-current={isActive ? 'page' : undefined}
                            className={cn(
                              'app-touch-target flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all',
                              isActive
                                ? 'bg-brand-50 text-brand-600'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                            )}
                          >
                            <Icon
                              className={cn(
                                'h-4 w-4 shrink-0',
                                isActive ? 'text-brand-500' : 'text-gray-400',
                              )}
                              aria-hidden="true"
                            />
                            {label}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
              <div className="mt-3 border-t border-gray-100 pt-3">
                <PwaInstallButton
                  className="app-touch-target flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-gray-600 hover:bg-sky-50 hover:text-sky-700"
                  label="Install app"
                />
              </div>
              <div className="mt-3 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setMoreOpen(false)
                    void handleSignOut()
                  }}
                  disabled={signingOut}
                  className="app-touch-target flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {signingOut ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            </nav>
          </div>
        </>
      )}
    </>
  )
}

// ─── Exported composite ───────────────────────────────────────────────────────

export function Sidebar(): JSX.Element {
  return (
    <>
      <DesktopSidebar />
      <MobileBottomNav />
    </>
  )
}
