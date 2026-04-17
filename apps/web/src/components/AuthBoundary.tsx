'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getAccessToken } from '@/lib/auth/client'

export function AuthBoundary() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const isPublicPath =
      !pathname ||
      pathname === '/' ||
      pathname.startsWith('/auth') ||
      pathname.startsWith('/card/') ||
      pathname.startsWith('/pricing')

    if (pathname === '/' || pathname?.startsWith('/auth')) {
      void getAccessToken().then((token) => {
        if (token) {
          router.replace('/onboarding')
          router.refresh()
        }
      })
    }

    if (isPublicPath) return

    let cancelled = false
    void getAccessToken().then((token) => {
      if (!token && !cancelled) {
        router.replace(`/auth?next=${encodeURIComponent(pathname || '/dashboard')}`)
        router.refresh()
      }
    })

    return () => {
      cancelled = true
    }
  }, [pathname, router])

  return null
}
