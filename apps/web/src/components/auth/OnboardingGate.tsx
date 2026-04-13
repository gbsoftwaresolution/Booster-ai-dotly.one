import { createClient } from '@/lib/supabase/server'
import { getOnboardingNextStep, getOnboardingState } from '@/lib/onboarding'
import { redirect } from 'next/navigation'
import type { JSX, ReactNode } from 'react'

export async function OnboardingGate({ children }: { children: ReactNode }): Promise<JSX.Element> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const token = session?.access_token
  if (!token) {
    redirect('/auth')
  }

  const state = await getOnboardingState(token)
  const nextStep = getOnboardingNextStep(state)

  if (nextStep) {
    redirect('/onboarding')
  }

  return <>{children}</>
}
