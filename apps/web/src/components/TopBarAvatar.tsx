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

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
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
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-52 origin-top-right rounded-xl border border-gray-200 bg-white shadow-lg ring-1 ring-black/5 focus:outline-none z-50">
          {/* User info */}
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
            {email && name && (
              <p className="text-xs text-gray-400 truncate">{email}</p>
            )}
          </div>

          {/* Actions */}
          <div className="py-1">
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <Settings className="h-4 w-4 text-gray-400" />
              Settings
            </Link>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
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
