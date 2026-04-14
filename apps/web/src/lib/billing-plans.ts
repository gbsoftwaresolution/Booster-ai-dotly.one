export type BillingPlan = 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS' | 'AGENCY' | 'ENTERPRISE'

export type BillingDuration = 'MONTHLY' | 'SIX_MONTHS' | 'ANNUAL'

export type BillingFeatureValue = string | boolean

export interface BillingFeatureRow {
  label: string
  FREE: BillingFeatureValue
  STARTER: BillingFeatureValue
  PRO: BillingFeatureValue
  BUSINESS: BillingFeatureValue
  AGENCY: BillingFeatureValue
  ENTERPRISE: BillingFeatureValue
}

const PLAN_ORDER: BillingPlan[] = ['FREE', 'STARTER', 'PRO', 'BUSINESS', 'AGENCY', 'ENTERPRISE']

export const BILLING_PLAN_PRICES: Record<BillingPlan, Record<BillingDuration, number> | null> = {
  FREE: null,
  STARTER: { MONTHLY: 10, SIX_MONTHS: 50, ANNUAL: 99 },
  PRO: { MONTHLY: 20, SIX_MONTHS: 110, ANNUAL: 200 },
  BUSINESS: { MONTHLY: 50, SIX_MONTHS: 275, ANNUAL: 500 },
  AGENCY: { MONTHLY: 100, SIX_MONTHS: 550, ANNUAL: 1000 },
  ENTERPRISE: { MONTHLY: 199, SIX_MONTHS: 1095, ANNUAL: 1990 },
}

export const BILLING_FEATURE_MATRIX: BillingFeatureRow[] = [
  {
    label: 'Digital cards',
    FREE: '1 card',
    STARTER: '1 premium card',
    PRO: '3 cards',
    BUSINESS: '10 cards',
    AGENCY: '50 cards',
    ENTERPRISE: 'Unlimited',
  },
  {
    label: 'Analytics history',
    FREE: '7 days',
    STARTER: '30 days',
    PRO: '90 days',
    BUSINESS: '365 days',
    AGENCY: '365 days',
    ENTERPRISE: 'Unlimited',
  },
  {
    label: 'Lead capture',
    FREE: 'Basic',
    STARTER: true,
    PRO: true,
    BUSINESS: true,
    AGENCY: true,
    ENTERPRISE: true,
  },
  {
    label: 'CRM',
    FREE: false,
    STARTER: 'Basic CRM',
    PRO: 'Full CRM',
    BUSINESS: 'Full CRM',
    AGENCY: 'Full CRM',
    ENTERPRISE: 'Full CRM',
  },
  {
    label: 'Email signature',
    FREE: false,
    STARTER: true,
    PRO: true,
    BUSINESS: true,
    AGENCY: true,
    ENTERPRISE: true,
  },
  {
    label: 'Email templates',
    FREE: false,
    STARTER: true,
    PRO: true,
    BUSINESS: true,
    AGENCY: true,
    ENTERPRISE: true,
  },
  {
    label: 'Scheduling',
    FREE: false,
    STARTER: 'Basic scheduling',
    PRO: 'Full scheduling',
    BUSINESS: 'Full scheduling',
    AGENCY: 'Full scheduling',
    ENTERPRISE: 'Full scheduling',
  },
  {
    label: 'CSV export',
    FREE: false,
    STARTER: false,
    PRO: true,
    BUSINESS: true,
    AGENCY: true,
    ENTERPRISE: true,
  },
  {
    label: 'Custom domain',
    FREE: false,
    STARTER: false,
    PRO: true,
    BUSINESS: true,
    AGENCY: true,
    ENTERPRISE: true,
  },
  {
    label: 'Webhooks',
    FREE: false,
    STARTER: false,
    PRO: true,
    BUSINESS: true,
    AGENCY: true,
    ENTERPRISE: true,
  },
]

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

export function getPlanFeatureValue(
  row: BillingFeatureRow,
  plan: BillingPlan | string | null | undefined,
): BillingFeatureValue {
  return row[normalizePlan(plan)]
}
