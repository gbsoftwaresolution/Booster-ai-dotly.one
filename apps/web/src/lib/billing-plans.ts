export type BillingPlan = 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS' | 'AGENCY' | 'ENTERPRISE'

const PLAN_ORDER: BillingPlan[] = ['FREE', 'STARTER', 'PRO', 'BUSINESS', 'AGENCY', 'ENTERPRISE']

export function normalizePlan(plan?: string | null): BillingPlan {
  const normalized = plan?.toUpperCase()
  return PLAN_ORDER.includes(normalized as BillingPlan) ? (normalized as BillingPlan) : 'FREE'
}

export function hasPlanAccess(
  plan: BillingPlan | string | null | undefined,
  requiredPlan: BillingPlan,
): boolean {
  return PLAN_ORDER.indexOf(normalizePlan(plan)) >= PLAN_ORDER.indexOf(requiredPlan)
}

export function formatPlanName(plan: BillingPlan): string {
  return plan.charAt(0) + plan.slice(1).toLowerCase()
}
