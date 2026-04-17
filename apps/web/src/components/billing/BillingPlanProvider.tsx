'use client'

import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiGet } from '@/lib/api'
import { BillingPlan, normalizePlan } from '@/lib/billing-plans'
import { getAccessToken } from '@/lib/auth/client'
import type { BillingSummaryResponse } from '@dotly/types'

interface BillingPlanContextValue {
  plan: BillingPlan
  loading: boolean
  refresh: () => Promise<void>
}

const BillingPlanContext = createContext<BillingPlanContextValue | null>(null)

export function BillingPlanProvider({ children }: { children: ReactNode }) {
  const [plan, setPlan] = useState<BillingPlan>('FREE')
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getAccessToken()
      if (!token) {
        return
      }

      const billing = await apiGet<BillingSummaryResponse>('/billing', token)
      setPlan(normalizePlan(billing?.plan))
    } catch {
      // Preserve the last known plan on transient auth/network failures.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo(() => ({ plan, loading, refresh }), [plan, loading, refresh])

  return <BillingPlanContext.Provider value={value}>{children}</BillingPlanContext.Provider>
}

export function useBillingPlan(): BillingPlanContextValue {
  const context = useContext(BillingPlanContext)
  if (!context) {
    throw new Error('useBillingPlan must be used within BillingPlanProvider')
  }

  return context
}
