'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { JSX } from 'react'
import { cn } from '@/lib/cn'
import {
  LayoutDashboard,
  CreditCard,
  Users,
  Kanban,
  BarChart3,
  Settings,
  UsersRound,
  FileSignature,
  LogOut,
} from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/cards', label: 'My Cards', icon: CreditCard },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/crm', label: 'CRM', icon: Kanban },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/email-signature', label: 'Signature', icon: FileSignature },
  { href: '/team', label: 'Team', icon: UsersRound },
  { href: '/settings', label: 'Settings', icon: Settings },
]

// Five primary destinations surfaced in the mobile bottom tab bar.
const bottomTabs = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/cards', label: 'Cards', icon: CreditCard },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

function useSignOut() {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/auth')
    } finally {
      setSigningOut(false)
    }
  }
  return { signingOut, handleSignOut }
}

// ─── Desktop sidebar ──────────────────────────────────────────────────────────

function DesktopSidebar(): JSX.Element {
  const pathname = usePathname()
  const { signingOut, handleSignOut } = useSignOut()

  return (
    <aside className="hidden w-64 shrink-0 border-r border-gray-200 bg-white lg:flex lg:flex-col">
      <nav className="flex h-full flex-col px-3 py-4" aria-label="Main navigation">
        {/* Logo */}
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white">
            <span className="text-xs font-bold">D</span>
          </div>
          <span className="text-lg font-bold text-gray-900">Dotly.one</span>
        </div>

        {/* Nav items */}
        <ul className="flex-1 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand-50 text-brand-600'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Sign out */}
        <div className="border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
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

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden"
      aria-label="Mobile navigation"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Frosted glass backing — same as iOS tab bar */}
      <div
        className="flex items-stretch border-t border-gray-200/70 bg-white/85"
        style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
      >
        {bottomTabs.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? 'page' : undefined}
              className="flex flex-1 flex-col items-center justify-center gap-[3px] py-2 transition-opacity active:opacity-60"
            >
              {/* Pill highlight behind icon when active */}
              <span
                className={cn(
                  'flex h-7 w-12 items-center justify-center rounded-full transition-all duration-200',
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
      </div>
    </nav>
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
