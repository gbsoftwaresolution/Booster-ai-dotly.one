import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '../lib/api'

type BillingPlan = 'FREE' | 'PRO' | 'BUSINESS' | 'AGENCY' | 'ENTERPRISE'

interface AuthzState {
  plan: BillingPlan | null
  loading: boolean
  crmAllowed: boolean
  analyticsAllowed: boolean
  schedulingAllowed: boolean
  refresh: () => Promise<void>
}

const AuthzContext = createContext<AuthzState | null>(null)

function normalizePlan(plan: unknown): BillingPlan {
  switch (String(plan ?? '').toUpperCase()) {
    case 'PRO':
    case 'BUSINESS':
    case 'AGENCY':
    case 'ENTERPRISE':
      return String(plan).toUpperCase() as BillingPlan
    default:
      return 'FREE'
  }
}

export function AuthzProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<BillingPlan | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    try {
      const me = (await api.getMe()) as { plan?: string | null } | null
      setPlan(normalizePlan(me?.plan))
    } catch {
      setPlan(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const value = useMemo<AuthzState>(
    () => ({
      plan,
      loading,
      crmAllowed: plan !== null && plan !== 'FREE',
      analyticsAllowed: plan !== null && plan !== 'FREE',
      schedulingAllowed: plan !== null && plan !== 'FREE',
      refresh,
    }),
    [loading, plan],
  )

  return <AuthzContext.Provider value={value}>{children}</AuthzContext.Provider>
}

export function useAuthz(): AuthzState {
  const value = useContext(AuthzContext)
  if (!value) throw new Error('useAuthz must be used within AuthzProvider')
  return value
}
