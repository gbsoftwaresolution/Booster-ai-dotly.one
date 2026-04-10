'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { JSX } from 'react'
import { cn } from '@/lib/cn'
import { Home, Settings } from 'lucide-react'
import { APPS } from '@/components/navigation/apps-nav'
import { useSignOut } from '@/hooks/useSignOut'
import { LogOut } from 'lucide-react'

// ─── Tooltip helper ───────────────────────────────────────────────────────────

function RailItem({
  href,
  label,
  icon: Icon,
  gradient,
  isActive,
  isHome,
}: {
  href: string
  label: string
  icon: React.ElementType
  gradient?: string
  isActive: boolean
  isHome?: boolean
}): JSX.Element {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      className="group relative flex items-center justify-center"
    >
      {/* Active indicator pill */}
      {isActive && (
        <span className="absolute left-0 h-6 w-[3px] rounded-r-full bg-white opacity-90" />
      )}

      <span
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-200',
          isActive
            ? 'scale-105 shadow-lg ring-2 ring-white/20'
            : 'opacity-60 hover:opacity-100 hover:scale-105',
        )}
        style={
          isActive
            ? { background: gradient ?? 'rgba(255,255,255,0.2)' }
            : { background: 'rgba(255,255,255,0.12)' }
        }
      >
        <Icon className={cn('h-5 w-5 text-white', isHome && 'h-4.5 w-4.5')} aria-hidden="true" />
      </span>

      {/* Tooltip */}
      <span className="pointer-events-none absolute left-full ml-3 z-50 hidden whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-xl group-hover:block">
        {label}
        <span className="absolute -left-1 top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
      </span>
    </Link>
  )
}

// ─── AppRail ──────────────────────────────────────────────────────────────────

interface AppRailProps {
  className?: string
}

export function AppRail({ className }: AppRailProps): JSX.Element {
  const pathname = usePathname()
  const { signingOut, handleSignOut } = useSignOut()

  const isHomeActive = pathname === '/dashboard'
  const isSettingsActive = pathname.startsWith('/settings') || pathname.startsWith('/team')

  return (
    <div
      className={cn('hidden lg:flex flex-col items-center w-[64px] shrink-0 py-4 gap-1 sticky top-0 h-screen', className)}
      style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)' }}
    >
      {/* Wordmark dot */}
      <Link
        href="/dashboard"
        aria-label="Dotly home"
        className="mb-4 flex h-9 w-9 items-center justify-center rounded-2xl transition-transform hover:scale-105"
        style={{ background: 'linear-gradient(135deg,#38bdf8,#0ea5e9)' }}
      >
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="3.5" fill="white" />
          <circle cx="8" cy="8" r="6.5" stroke="white" strokeWidth="1.5" strokeDasharray="3 2" />
        </svg>
      </Link>

      {/* Divider */}
      <div className="mb-2 h-px w-8 bg-white/10" />

      {/* Home */}
      <RailItem href="/dashboard" label="Home" icon={Home} isActive={isHomeActive} isHome />

      {/* App icons */}
      {APPS.map((app) => {
        const isActive = pathname.startsWith(`/apps/${app.id}`)
        return (
          <RailItem
            key={app.id}
            href={app.href}
            label={app.label}
            icon={app.icon}
            gradient={app.gradient}
            isActive={isActive}
          />
        )
      })}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Divider */}
      <div className="mb-1 h-px w-8 bg-white/10" />

      {/* Settings */}
      <RailItem
        href="/settings"
        label="Settings"
        icon={Settings}
        gradient="linear-gradient(135deg,#9ca3af,#6b7280)"
        isActive={isSettingsActive}
      />

      {/* Sign out */}
      <button
        type="button"
        onClick={() => void handleSignOut()}
        disabled={signingOut}
        aria-label="Sign out"
        className="group relative mt-1 flex items-center justify-center"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 opacity-50 transition-all hover:bg-red-500/80 hover:opacity-100">
          <LogOut className="h-4 w-4 text-white" aria-hidden="true" />
        </span>
        <span className="pointer-events-none absolute left-full ml-3 z-50 hidden whitespace-nowrap rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-xl group-hover:block">
          Sign out
          <span className="absolute -left-1 top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
        </span>
      </button>
    </div>
  )
}
