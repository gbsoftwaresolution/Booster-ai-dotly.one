'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getAccessToken } from '@/lib/auth/client'
function getDecisionPath(pathname: string | null): string {
  const next = pathname && pathname !== '/' && pathname !== '/auth' ? pathname : '/dashboard'
  return `/auth/continue?next=${encodeURIComponent(next)}`
}

export function AuthBoundary() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const isPublicPath =
      !pathname ||
      pathname === '/' ||
      pathname.startsWith('/auth') ||
      pathname === '/success' ||
      pathname === '/verify-email' ||
      pathname === '/reset-password' ||
      pathname === '/confirm-email-change' ||
      pathname.startsWith('/link/') ||
      pathname.startsWith('/card/') ||
      pathname.startsWith('/pricing')

    if (pathname === '/' || pathname?.startsWith('/auth')) {
      void getAccessToken().then((token) => {
        if (token) {
          router.replace(getDecisionPath(pathname))
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
