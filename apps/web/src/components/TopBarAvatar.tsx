'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Settings, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface TopBarAvatarProps {
  email: string | undefined
  name: string | undefined
}

export function TopBarAvatar({ email, name }: TopBarAvatarProps): React.JSX.Element {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
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
        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm ring-2 ring-white transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        style={{ background: 'linear-gradient(135deg,#38bdf8,#0ea5e9)' }}
      >
        {initial}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2.5 w-56 origin-top-right rounded-2xl border border-gray-100 bg-white shadow-xl shadow-gray-200/60 z-50 overflow-hidden"
          style={{ animation: 'avatar-menu 0.18s cubic-bezier(.32,1.2,.56,1) both' }}
        >
          {/* User info header */}
          <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3.5">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm"
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
          <div className="p-1.5">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Settings className="h-4 w-4 text-gray-400" />
              Settings
            </Link>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
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
