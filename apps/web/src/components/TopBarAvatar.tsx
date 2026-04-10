'use client'

import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'
import { Settings, LogOut } from 'lucide-react'
import { useSignOut } from '@/hooks/useSignOut'

interface TopBarAvatarProps {
  email: string | undefined
  name: string | undefined
}

export function TopBarAvatar({ email, name }: TopBarAvatarProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const { signingOut, handleSignOut } = useSignOut()
  const ref = useRef<HTMLDivElement>(null)

  const initial = (name?.[0] ?? email?.[0] ?? 'U').toUpperCase()
  const displayName = name ?? email ?? 'Account'

  // Close on outside click or Escape key
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  return (
    <div ref={ref} className="relative">
      <style>{`
        @keyframes avatar-menu {
          from { opacity: 0; transform: scale(.96) translateY(-6px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>

      {/* Avatar button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-[18px] text-xs font-bold text-white shadow-[0_18px_34px_-22px_rgba(14,165,233,0.75)] ring-2 ring-white/90 transition-transform hover:scale-[1.03] active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        style={{ background: 'linear-gradient(135deg,#38bdf8,#0ea5e9)' }}
      >
        {initial}
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-3 w-60 origin-top-right overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_28px_80px_-42px_rgba(15,23,42,0.38)]"
          style={{ animation: 'avatar-menu 0.18s cubic-bezier(.32,1.2,.56,1) both' }}
        >
          {/* User info header */}
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white shadow-sm"
              style={{ background: 'linear-gradient(135deg,#38bdf8,#0ea5e9)' }}
            >
              {initial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">{displayName}</p>
              {email && name && <p className="truncate text-[11px] text-gray-400">{email}</p>}
            </div>
          </div>

          {/* Actions */}
          <div className="p-2">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-white"
            >
              <Settings className="h-4 w-4 text-gray-400" />
              Settings
            </Link>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              className="flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
