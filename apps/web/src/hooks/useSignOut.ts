'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function clearClientAuthArtifacts() {
  if (typeof window === 'undefined') return

  try {
    const keysToRemove: string[] = ['dotly_notification_preferences']
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (!key) continue
      if (key.startsWith('dotly_memories_') || key.startsWith('dotly_saved_contact_')) {
        keysToRemove.push(key)
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key)
    }
  } catch {
    // Best-effort cleanup only.
  }
}

export function useSignOut() {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      clearClientAuthArtifacts()
      router.push('/auth')
      router.refresh()
    } finally {
      setSigningOut(false)
    }
  }

  return { signingOut, handleSignOut }
}
