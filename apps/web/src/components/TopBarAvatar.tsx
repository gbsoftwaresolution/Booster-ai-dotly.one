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
          className="absolute right-0 z-50 mt-3 w-64 origin-top-right overflow-hidden rounded-[28px] border border-white/20 bg-white/70 shadow-[0_32px_80px_-24px_rgba(15,23,42,0.35),inset_0_1px_2px_rgba(255,255,255,0.8)] backdrop-blur-2xl"
          style={{
            animation: 'avatar-menu 0.18s cubic-bezier(.32,1.2,.56,1) both',
            WebkitBackdropFilter: 'blur(30px)',
          }}
        >
          {/* User info header */}
          <div className="flex items-center gap-3 border-b border-gray-200/50 bg-white/40 px-4 py-4 pt-5 backdrop-blur-md">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[15px] font-bold text-white shadow-[0_8px_16px_-6px_rgba(14,165,233,0.5),inset_0_1px_1px_rgba(255,255,255,0.4)]"
              style={{ background: 'linear-gradient(135deg,#38bdf8,#0ea5e9)' }}
            >
              {initial}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold text-gray-900 tracking-tight">{displayName}</p>
              {email && name && <p className="truncate text-xs font-medium text-gray-500 mt-0.5">{email}</p>}
            </div>
          </div>

          {/* Actions */}
          <div className="p-2.5 space-y-1">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="group flex w-full items-center gap-3 rounded-[20px] px-3.5 py-3 text-[14px] font-semibold text-gray-700 transition-all hover:bg-white/80 hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] active:scale-[0.98]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-[14px] bg-gray-100/80 text-gray-500 group-hover:bg-gray-100 group-hover:text-gray-700 transition-colors">
                <Settings className="h-4 w-4" strokeWidth={2.5} />
              </div>
              Settings
            </Link>
            <div className="mx-3 my-1 border-t border-gray-200/50" />
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              className="group flex w-full items-center gap-3 rounded-[20px] px-3.5 py-3 text-[14px] font-semibold text-red-600 transition-all hover:bg-red-50/80 hover:shadow-[0_4px_12px_rgba(239,68,68,0.08)] active:scale-[0.98] disabled:opacity-50"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-[14px] bg-red-100/50 text-red-500 group-hover:bg-red-100 transition-colors">
                <LogOut className="h-4 w-4" strokeWidth={2.5} />
              </div>
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
