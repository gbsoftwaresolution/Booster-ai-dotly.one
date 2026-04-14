import { redirect } from 'next/navigation'
import type { BillingSummaryResponse } from '@dotly/types'
import type { BillingPlan } from '@/lib/billing-plans'
import { hasPlanAccess, normalizePlan } from '@/lib/billing-plans'
import { getServerApiUrl } from '@/lib/server-api'
import { getServerSessionAccessTokenOrRedirect } from '@/lib/server-auth'

async function getBillingPlan(): Promise<BillingPlan> {
  const accessToken = await getServerSessionAccessTokenOrRedirect('/auth')

  try {
    const response = await fetch(`${getServerApiUrl()}/billing`, {
      headers: { Authorization: `Bearer ${accessToken}` },
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