'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function AuthBoundary() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.replace(`/auth?next=${encodeURIComponent(pathname || '/dashboard')}`)
        router.refresh()
      }
    })

    return () => subscription.unsubscribe()
  }, [pathname, router])

  return null
}
