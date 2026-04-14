import { redirect } from 'next/navigation'
import type { BillingSummaryResponse } from '@dotly/types'
import type { BillingPlan } from '@/lib/billing-plans'
import { hasPlanAccess, normalizePlan } from '@/lib/billing-plans'
import { getServerApiUrl } from '@/lib/server-api'
import { createClient } from '@/lib/supabase/server'

async function getBillingPlan(): Promise<BillingPlan> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/auth')
  }

  try {
    const response = await fetch(`${getServerApiUrl()}/billing`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: 'no-store',
    })

    if (!response.ok) {
      return 'FREE'
    }

    const billing = (await response.json()) as BillingSummaryResponse
    return normalizePlan(billing?.plan)
  } catch {
    return 'FREE'
  }
}

export async function requirePlanAccess(requiredPlan: BillingPlan): Promise<BillingPlan> {
  const plan = await getBillingPlan()

  if (!hasPlanAccess(plan, requiredPlan)) {
    redirect('/settings/billing')
  }

  return plan
}