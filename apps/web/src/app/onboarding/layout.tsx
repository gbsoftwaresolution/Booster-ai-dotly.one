import { getOnboardingNextStep, getOnboardingState } from '@/lib/onboarding'
import { getServerSessionAccessTokenOrRedirect } from '@/lib/server-auth'
import { redirect } from 'next/navigation'
import type { JSX, ReactNode } from 'react'

export default async function OnboardingLayout({
  children,
}: {
  children: ReactNode
}): Promise<JSX.Element> {
  const token = await getServerSessionAccessTokenOrRedirect('/auth?next=%2Fonboarding')

  try {
    const state = await getOnboardingState(token)
    if (!getOnboardingNextStep(state)) {
      redirect('/dashboard')
    }
  } catch {
    // Let the client onboarding page render and show its inline recovery UI
    // instead of tripping the global error boundary on transient first-login races.
  }

  return <>{children}</>
}
