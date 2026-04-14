'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { JSX } from 'react'
import { BrandLogo } from '@/components/BrandLogo'
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
      className="group relative flex items-center justify-center p-1"
    >
      {/* Active indicator pill */}
      {isActive && (
        <span className="absolute -left-3 h-[22px] w-[4px] rounded-r-full bg-brand-500 shadow-[0_0_12px_rgba(14,165,233,0.8)] transition-all duration-300" />
      )}

      <span
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-[18px] border transition-all duration-500',
          isActive
            ? 'scale-110 border-white/20 bg-white/10 shadow-[0_12px_24px_-8px_rgba(0,0,0,0.5)] ring-1 ring-inset ring-white/10 backdrop-blur-md'
            : 'border-transparent bg-transparent opacity-60 hover:scale-110 hover:border-white/10 hover:bg-white/5 hover:opacity-100 hover:shadow-lg',
        )}
        style={isActive && gradient ? { background: gradient } : {}}
      >
        <Icon className={cn('h-5 w-5 text-white transition-transform duration-500', isActive ? 'scale-110 drop-shadow-md' : '', isHome && 'h-5 w-5')} aria-hidden="true" />
      </span>

      {/* Tooltip */}
      <span className="pointer-events-none absolute left-[calc(100%+16px)] z-50 hidden origin-left scale-95 opacity-0 whitespace-nowrap rounded-[10px] border border-white/10 bg-gray-950/90 backdrop-blur-md px-3 py-2 text-[13px] font-bold tracking-wide text-white shadow-[0_16px_32px_-12px_rgba(0,0,0,0.6)] transition-all duration-200 group-hover:scale-100 group-hover:opacity-100 group-hover:block">
        {label}
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
      className={cn(
        'sticky top-0 hidden h-screen w-[88px] shrink-0 flex-col items-center gap-3 border-r border-gray-950/5 px-2 py-6 lg:flex',
        className,
      )}
      style={{
        background: '#040b16',
      }}
    >
      <Link
        href="/dashboard"
        aria-label="Dotly home"
        className="mb-6 flex items-center justify-center transition-all duration-500 hover:scale-[1.05]"
      >
        <BrandLogo
          size={56}
          showText={false}
          priority
          iconClassName="rounded-[20px] shadow-[0_0_24px_-8px_rgba(14,165,233,0.5)]"
        />
      </Link>

      {/* Divider */}
      <div className="mb-3 h-px w-12 bg-white/5" />

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
      <div className="my-3 h-px w-12 bg-white/5" />

      {/* Settings */}
      <RailItem
        href="/settings"
        label="Settings"
        icon={Settings}
        gradient="linear-gradient(135deg,#6b7280,#4b5563)"
        isActive={isSettingsActive}
      />

      {/* Sign out */}
      <button
        type="button"
        onClick={() => void handleSignOut()}
        disabled={signingOut}
        aria-label="Sign out"
        className="group relative mt-2 flex items-center justify-center p-1"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-transparent opacity-50 transition-all duration-500 hover:scale-110 hover:bg-white/5 hover:opacity-100 hover:text-red-400">
          <LogOut className="h-5 w-5 text-white transition-colors group-hover:text-red-400" aria-hidden="true" />
        </span>
        <span className="pointer-events-none absolute left-[calc(100%+16px)] z-50 hidden origin-left scale-95 opacity-0 whitespace-nowrap rounded-[10px] border border-white/10 bg-gray-950/90 backdrop-blur-md px-3 py-2 text-[13px] font-bold tracking-wide text-white shadow-[0_16px_32px_-12px_rgba(0,0,0,0.6)] transition-all duration-200 group-hover:scale-100 group-hover:opacity-100 group-hover:block">
          Sign out
        </span>
      </button>
    </div>
  )
}
