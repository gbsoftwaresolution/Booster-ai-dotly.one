import { getServerAccessToken } from '@/lib/auth/session'
import { getOnboardingNextStep, getOnboardingState } from '@/lib/onboarding'
import { redirect } from 'next/navigation'
import type { JSX, ReactNode } from 'react'

export async function OnboardingGate({ children }: { children: ReactNode }): Promise<JSX.Element> {
  const token = await getServerAccessToken()
  if (!token) {
    redirect('/auth')
  }

  try {
    const state = await getOnboardingState(token)
    const nextStep = getOnboardingNextStep(state)

    if (nextStep) {
      redirect('/onboarding')
    }
  } catch {
    // Avoid tripping the global error boundary during first-login / first-card
    // races where onboarding state is briefly unavailable on the server.
  }

  return <>{children}</>
}
