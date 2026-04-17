'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { getAccessToken } from '@/lib/auth/client'
import { apiGet } from '@/lib/api'
import { getOnboardingNextStep } from '@/lib/onboarding'

async function getSignedInDestination(token: string): Promise<string> {
  try {
    const [user, cards] = await Promise.all([
      apiGet<{ name?: string | null; country?: string | null }>('/users/me', token),
      apiGet<{ items?: Array<{ id: string }> }>('/cards', token),
    ])

    const nextStep = getOnboardingNextStep({
      profileComplete: Boolean(user?.name?.trim()) && Boolean(user?.country?.trim()),
      hasCard: (cards.items?.length ?? 0) > 0,
    })

    return nextStep ? '/onboarding' : '/dashboard'
  } catch {
    return '/dashboard'
  }
}

export function AuthBoundary() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const isPublicPath =
      !pathname ||
      pathname === '/' ||
      pathname.startsWith('/auth') ||
      pathname === '/verify-email' ||
      pathname === '/reset-password' ||
      pathname === '/confirm-email-change' ||
      pathname.startsWith('/card/') ||
      pathname.startsWith('/pricing')

    if (pathname === '/' || pathname?.startsWith('/auth')) {
      void getAccessToken().then((token) => {
        if (token) {
          void getSignedInDestination(token).then((destination) => {
            router.replace(destination)
            router.refresh()
          })
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
