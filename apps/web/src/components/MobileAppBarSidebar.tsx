'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useBillingPlan } from '@/components/billing/BillingPlanProvider'
import { getVisibleDashboardNavSections } from '@/components/navigation/dashboard-nav'
import { cn } from '@/lib/cn'
import { useSignOut } from '@/hooks/useSignOut'

export function MobileAppBarSidebar(): React.JSX.Element {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { signingOut, handleSignOut } = useSignOut()
  const { plan } = useBillingPlan()
  const visibleSections = getVisibleDashboardNavSections(plan)

  useEffect(() => {
    if (!open) {
      return
    }

    const previousOverflow = document.body.style.overflow

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 lg:hidden"
        aria-label="Open navigation menu"
        aria-expanded={open}
        aria-controls="mobile-dashboard-sidebar"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm lg:hidden"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />

          <aside
            id="mobile-dashboard-sidebar"
            className="fixed inset-y-0 left-0 z-50 flex w-[84vw] max-w-[320px] flex-col border-r border-slate-200 bg-white shadow-2xl lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation menu"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4">
              <Link
                href="/dashboard"
                className="flex items-center gap-3"
                onClick={() => setOpen(false)}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl"
                  style={{ background: 'linear-gradient(135deg,#38bdf8,#0ea5e9)' }}
                >
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <circle cx="8" cy="8" r="3.5" fill="white" />
                    <circle
                      cx="8"
                      cy="8"
                      r="6.5"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeDasharray="3 2"
                    />
                  </svg>
                </div>
                <span className="text-[17px] font-extrabold tracking-tight text-gray-900">
                  Dotly<span className="text-brand-500">.one</span>
                </span>
              </Link>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Mobile main navigation">
              {visibleSections.map((section) => (
                <div key={section.title} className="mb-5 last:mb-0">
                  <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                    {section.title}
                  </p>
                  <ul className="space-y-1">
                    {section.items.map(({ href, label, icon: Icon }) => {
                      const isActive = pathname === href || pathname.startsWith(href + '/')

                      return (
                        <li key={href}>
                          <Link
                            href={href}
                            onClick={() => setOpen(false)}
                            aria-current={isActive ? 'page' : undefined}
                            className={cn(
                              'group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition-all',
                              isActive
                                ? 'bg-brand-50 text-brand-600 shadow-sm ring-1 ring-brand-100'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                            )}
                          >
                            <span
                              className={cn(
                                'flex h-9 w-9 items-center justify-center rounded-xl transition-colors',
                                isActive ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-500',
                              )}
                            >
                              <Icon className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <span>{label}</span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
            </nav>

            <div
              className="border-t border-gray-100 px-3 py-3"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
            >
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  void handleSignOut()
                }}
                disabled={signingOut}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-500">
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>{signingOut ? 'Signing out…' : 'Sign out'}</span>
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  )
}
