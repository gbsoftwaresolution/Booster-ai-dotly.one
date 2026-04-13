'use client'

import { ArrowLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { JSX } from 'react'

function formatPart(part: string): string {
  if (part.toLowerCase() === 'email-templates') return 'Email Templates'
  return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
}

export function DynamicBreadcrumbs(): JSX.Element | null {
  const pathname = usePathname()
  const router = useRouter()

  if (!pathname) return null

  // e.g. /apps/cards/email-templates -> ["apps", "cards", "email-templates"]
  const parts = pathname.split('/').filter(Boolean)
  
  if (parts.length === 0) return null
  
  // Define standard prefix bases apps routing might use:
  const isAppRoute = parts[0] === 'apps' || parts[0] === 'dashboard'
  
  // The relevant parts to build the breadcrumb navigation.
  // If we're under '/apps', the first real section is 'cards' or something else
  const pathParts = isAppRoute ? parts.slice(1) : parts

  const LogoIcon = () => (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] shadow-[0_2px_8px_-2px_rgba(14,165,233,0.5)] ring-1 ring-inset ring-white/20 sm:hidden"
      style={{ background: 'linear-gradient(135deg,#38bdf8,#0ea5e9)' }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="3.5" fill="white" />
        <circle cx="8" cy="8" r="6.5" stroke="white" strokeWidth="1.5" strokeDasharray="3 2" />
      </svg>
    </div>
  )

  if (pathParts.length === 0) {
    return (
      <div className="flex items-center gap-3">
        <LogoIcon />
        <span className="text-base font-bold text-gray-900">
          Dotly<span className="text-sky-500">.one</span>
        </span>
      </div>
    )
  }

  // If we are at the top level of an app (e.g. /apps/cards), just show CARDS
  if (pathParts.length === 1 && pathParts[0]) {
    return (
      <div className="flex items-center gap-3">
        <LogoIcon />
        <h1 className="text-base font-bold tracking-tight text-gray-900 uppercase">
          {formatPart(pathParts[0])}
        </h1>
      </div>
    )
  }

  // If we are deeper (e.g. /apps/cards/email-templates)
  const isDeep = pathParts.length > 1
  const lastPart = pathParts[pathParts.length - 1]
  const parentParts = pathParts.slice(0, -1)

  if (!lastPart) return null

  return (
    <div className="flex items-center gap-2">
      {isDeep && (
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/5 ring-1 ring-black/10 transition-all hover:bg-black/10 active:scale-95 mr-1"
        >
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </button>
      )}
      <div className="flex items-center gap-1.5 text-sm font-semibold">
        {parentParts.map((part) => (
          <div key={part} className="flex items-center gap-1.5">
            <span className="text-gray-400 uppercase tracking-widest text-[11px] truncate max-w-[80px] sm:max-w-none">
              {formatPart(part)}
            </span>
            <ChevronRight className="h-3 w-3 text-gray-300 shrink-0" />
          </div>
        ))}
        <h1 className="text-[15px] font-bold tracking-tight text-gray-900 capitalize truncate max-w-[150px] sm:max-w-none">
          {formatPart(lastPart)}
        </h1>
      </div>
    </div>
  )
}
