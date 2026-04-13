'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { JSX } from 'react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/cn'
import { Home, X, Menu, QrCode } from 'lucide-react'
import { APPS, getActiveApp } from '@/components/navigation/apps-nav'
import { AppSidebarContent } from '@/components/shell/AppSidebar'
import { useSignOut } from '@/hooks/useSignOut'
import { LogOut, Settings } from 'lucide-react'

// ─── Mobile bottom rail ───────────────────────────────────────────────────────

export function MobileAppRail(): JSX.Element {
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { signingOut, handleSignOut } = useSignOut()

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false)
  }, [pathname])

  // Lock body scroll when drawer open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [drawerOpen])

  const activeApp = getActiveApp(pathname)
  const isHome = pathname === '/dashboard'

  return (
    <>
      {/* Bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden"
        aria-label="App navigation"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div
          className="mx-3 mb-3 flex items-stretch justify-between rounded-[32px] border border-white/70 bg-white/88 px-2 py-1 shadow-[0_30px_70px_-28px_rgba(15,23,42,0.42)]"
          style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
        >
          {/* Home */}
          <Link
            href="/dashboard"
            className="app-touch-target flex flex-1 flex-col items-center justify-center gap-1.5 py-2 transition-opacity active:opacity-60"
            aria-current={isHome ? 'page' : undefined}
          >
            <span className={cn('flex h-8 w-14 items-center justify-center rounded-full transition-all duration-200', isHome ? 'bg-gray-950 shadow-[0_12px_24px_-16px_rgba(15,23,42,0.8)]' : 'bg-transparent')}>
              <Home className={cn('h-5 w-5 transition-colors duration-200', isHome ? 'text-white' : 'text-gray-400')} />
            </span>
            <span className={cn('text-[10px] font-bold tracking-wide', isHome ? 'text-gray-950' : 'text-gray-400')}>Home</span>
          </Link>

          {/* Cards App */}
          {(() => {
            const app = APPS[0]!
            const isActive = pathname.startsWith(`/apps/${app.id}`)
            return (
              <Link
                key={app.id}
                href={app.href}
                className="app-touch-target flex flex-1 flex-col items-center justify-center gap-1.5 py-2 transition-opacity active:opacity-60"
                aria-current={isActive ? 'page' : undefined}
              >
                <span
                  className={cn('flex h-8 w-14 items-center justify-center rounded-full transition-all duration-200')}
                  style={isActive ? { background: app.gradient, boxShadow: '0 12px 24px -16px rgba(15,23,42,0.75)' } : {}}
                >
                  <app.icon className={cn('h-5 w-5 transition-colors duration-200', isActive ? 'text-white' : 'text-gray-400')} />
                </span>
                <span className={cn('text-[10px] font-bold tracking-wide', isActive ? 'text-gray-950' : 'text-gray-400')}>{app.label}</span>
              </Link>
            )
          })()}

          {/* Center Elevated QR Button */}
          <div className="relative flex flex-[0.8] items-center justify-center pointer-events-none">
            <Link
              href="/qr"
              aria-label="Scan QR"
              className="absolute -top-[20px] flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-brand-400 to-brand-600 shadow-[0_14px_28px_-6px_rgba(14,165,233,0.6)] ring-[6px] ring-white transition-all duration-300 active:scale-95 hover:scale-105 pointer-events-auto"
            >
              <QrCode className="h-6 w-6 text-white drop-shadow-md" />
            </Link>
          </div>

          {/* CRM App */}
          {(() => {
            const app = APPS[1]!
            const isActive = pathname.startsWith(`/apps/${app.id}`)
            return (
              <Link
                key={app.id}
                href={app.href}
                className="app-touch-target flex flex-1 flex-col items-center justify-center gap-1.5 py-2 transition-opacity active:opacity-60"
                aria-current={isActive ? 'page' : undefined}
              >
                <span
                  className={cn('flex h-8 w-14 items-center justify-center rounded-full transition-all duration-200')}
                  style={isActive ? { background: app.gradient, boxShadow: '0 12px 24px -16px rgba(15,23,42,0.75)' } : {}}
                >
                  <app.icon className={cn('h-5 w-5 transition-colors duration-200', isActive ? 'text-white' : 'text-gray-400')} />
                </span>
                <span className={cn('text-[10px] font-bold tracking-wide', isActive ? 'text-gray-950' : 'text-gray-400')}>{app.label}</span>
              </Link>
            )
          })()}

          {/* More / Menu */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="app-touch-target flex flex-1 flex-col items-center justify-center gap-1.5 py-2 transition-opacity active:opacity-60"
            aria-label="More options"
          >
            <span className="flex h-8 w-14 items-center justify-center rounded-full bg-transparent">
              <Menu className="h-5 w-5 text-gray-400" />
            </span>
            <span className="text-[10px] font-bold tracking-wide text-gray-400">More</span>
          </button>
        </div>
      </nav>

      {/* Slide-up drawer with app context nav or full nav list */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 lg:hidden"
            aria-hidden="true"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[82vh] overflow-y-auto rounded-t-[32px] border-t border-slate-200 bg-white shadow-2xl lg:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Handle + header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <span className="text-sm font-semibold text-gray-950">
                {activeApp ? activeApp.label : 'Navigate'}
              </span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="app-touch-target rounded-full p-2 text-gray-400 hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* If inside an app — show that app's nav */}
            {activeApp ? (
              <div className="px-3 py-3">
                <AppSidebarContent
                  app={activeApp}
                  pathname={pathname}
                  onNavigate={() => setDrawerOpen(false)}
                />
              </div>
            ) : (
              /* Otherwise — show all apps grid */
              <div className="px-5 py-5">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {APPS.map((app) => (
                    <Link
                      key={app.id}
                      href={app.href}
                      onClick={() => setDrawerOpen(false)}
                      className="app-panel-subtle flex flex-col items-center gap-2 rounded-[24px] p-4 text-center transition-colors hover:bg-white active:bg-gray-100"
                    >
                      <span
                        className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm"
                        style={{ background: app.gradient }}
                      >
                        <app.icon className="h-6 w-6 text-white" />
                      </span>
                      <span className="text-xs font-semibold text-gray-700">{app.label}</span>
                      <span className="text-[10px] text-gray-400 leading-tight">
                        {app.description}
                      </span>
                    </Link>
                  ))}
                </div>

                <div className="mt-5 flex gap-2 border-t border-gray-100 pt-4">
                  <Link
                    href="/settings"
                    onClick={() => setDrawerOpen(false)}
                    className="app-panel-subtle flex flex-1 items-center gap-2 rounded-2xl px-3 py-3 text-sm font-medium text-gray-600 hover:bg-white"
                  >
                    <Settings className="h-4 w-4 text-gray-400" />
                    Settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setDrawerOpen(false)
                      void handleSignOut()
                    }}
                    disabled={signingOut}
                    className="flex flex-1 items-center gap-2 rounded-2xl border border-red-100 bg-red-50/80 px-3 py-3 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <LogOut className="h-4 w-4" />
                    {signingOut ? 'Signing out…' : 'Sign out'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}
