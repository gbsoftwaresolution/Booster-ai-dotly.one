import type { ReactNode } from 'react'
import { requirePlanAccess } from '@/lib/server-plan-access'

export default async function DomainsGuardLayout({ children }: { children: ReactNode }) {
  await requirePlanAccess('PRO')
  return children
}