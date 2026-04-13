import { createClient } from '@/lib/supabase/server'
import { getOnboardingNextStep, getOnboardingState } from '@/lib/onboarding'
import { redirect } from 'next/navigation'
import type { JSX, ReactNode } from 'react'

export default async function OnboardingLayout({
  children,
}: {
  children: ReactNode
}): Promise<JSX.Element> {
  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const token = session?.access_token
  if (!token) {
    redirect('/auth?next=%2Fonboarding')
  }

  const state = await getOnboardingState(token)
  if (!getOnboardingNextStep(state)) {
    redirect('/dashboard')
  }

  return <>{children}</>
}
