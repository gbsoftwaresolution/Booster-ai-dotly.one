'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { JSX } from 'react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/cn'
import { Home, X, Menu } from 'lucide-react'
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
          className="mx-3 mb-3 flex items-stretch rounded-[30px] border border-white/70 bg-white/88 px-1 py-1.5 shadow-[0_30px_70px_-28px_rgba(15,23,42,0.42)]"
          style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
        >
          {/* Home tab */}
          <Link
            href="/dashboard"
            className="app-touch-target flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-opacity active:opacity-60"
            aria-current={isHome ? 'page' : undefined}
          >
            <span
              className={cn(
                'flex h-9 w-14 items-center justify-center rounded-full transition-all duration-200',
                isHome
                  ? 'bg-gray-950 shadow-[0_14px_28px_-18px_rgba(15,23,42,0.8)]'
                  : 'bg-transparent',
              )}
            >
              <Home
                className={cn(
                  'h-[17px] w-[17px] transition-colors duration-200',
                  isHome ? 'text-white' : 'text-gray-400',
                )}
              />
            </span>
            <span
              className={cn(
                'text-[10px] font-semibold',
                isHome ? 'text-gray-950' : 'text-gray-400',
              )}
            >
              Home
            </span>
          </Link>

          {/* App tabs */}
          {APPS.map((app) => {
            const isActive = pathname.startsWith(`/apps/${app.id}`)
            return (
              <Link
                key={app.id}
                href={app.href}
                className="app-touch-target flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-opacity active:opacity-60"
                aria-current={isActive ? 'page' : undefined}
              >
                <span
                  className={cn(
                    'flex h-9 w-14 items-center justify-center rounded-full transition-all duration-200',
                  )}
                  style={
                    isActive
                      ? {
                          background: app.gradient,
                          boxShadow: '0 14px 28px -18px rgba(15,23,42,0.75)',
                        }
                      : {}
                  }
                >
                  <app.icon
                    className={cn(
                      'h-[17px] w-[17px] transition-colors duration-200',
                      isActive ? 'text-white' : 'text-gray-400',
                    )}
                  />
                </span>
                <span
                  className={cn(
                    'text-[10px] font-semibold',
                    isActive ? 'text-gray-950' : 'text-gray-400',
                  )}
                >
                  {app.label}
                </span>
              </Link>
            )
          })}

          {/* More / drawer toggle */}
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="app-touch-target flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-opacity active:opacity-60"
            aria-label="More options"
          >
            <span className="flex h-9 w-14 items-center justify-center rounded-full">
              <Menu className="h-[17px] w-[17px] text-gray-400" />
            </span>
            <span className="text-[10px] font-semibold text-gray-400">More</span>
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
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[82vh] overflow-y-auto rounded-t-[32px] border-t border-white/70 bg-white/96 shadow-2xl lg:hidden"
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
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
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

// ─── Mobile top bar (hamburger when inside an app) ────────────────────────────

export function MobileAppTopBar(): JSX.Element {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const activeApp = getActiveApp(pathname)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!activeApp) return <></>

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] border border-white/80 bg-white/90 text-gray-700 shadow-[0_16px_32px_-24px_rgba(15,23,42,0.5)] lg:hidden"
        aria-label={`Open ${activeApp.label} navigation`}
      >
        <Menu className="h-4 w-4" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 lg:hidden"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <aside
            className="fixed inset-y-0 left-0 z-50 w-[84vw] max-w-[340px] border-r border-white/70 bg-white/96 shadow-2xl lg:hidden"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg"
                  style={{ background: activeApp.gradient }}
                >
                  <activeApp.icon className="h-3.5 w-3.5 text-white" />
                </div>
                <span className="text-sm font-bold text-gray-900">{activeApp.label}</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto h-full pb-20">
              <AppSidebarContent
                app={activeApp}
                pathname={pathname}
                onNavigate={() => setOpen(false)}
              />
            </div>
          </aside>
        </>
      )}
    </>
  )
}
