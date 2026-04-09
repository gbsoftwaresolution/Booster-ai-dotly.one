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
  Webhook,
  Inbox,
  CheckSquare,
  Mail,
  DollarSign,
  GitBranch,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/cards', label: 'My Cards', icon: CreditCard },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/leads', label: 'Lead Submissions', icon: Inbox },
  { href: '/deals', label: 'Deals', icon: DollarSign },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/crm', label: 'CRM', icon: Kanban },
  { href: '/pipelines', label: 'Pipelines', icon: GitBranch },
  { href: '/crm/custom-fields', label: 'Custom Fields', icon: SlidersHorizontal },
  { href: '/crm/analytics', label: 'CRM Analytics', icon: TrendingUp },
  { href: '/email-templates', label: 'Email Templates', icon: Mail },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/email-signature', label: 'Signature', icon: FileSignature },
  { href: '/team', label: 'Team', icon: UsersRound },
  { href: '/settings/webhooks', label: 'Webhooks', icon: Webhook },
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
    <aside className="hidden w-60 shrink-0 border-r border-gray-100 bg-white lg:flex lg:flex-col">
      <nav className="flex h-full flex-col px-3 py-5" aria-label="Main navigation">
        {/* Wordmark */}
        <div className="mb-7 flex items-center gap-2.5 px-2">
          {/* Dot icon mark */}
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
            style={{ background: 'linear-gradient(135deg,#38bdf8,#0ea5e9)' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
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
        </div>

        {/* Nav items */}
        <ul className="flex-1 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/')
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-brand-50 text-brand-600'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900',
                  )}
                >
                  {/* Active accent line */}
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

        {/* Sign out */}
        <div className="border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={signingOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-400 transition-all hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
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
