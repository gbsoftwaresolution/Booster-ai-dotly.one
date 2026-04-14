import type { ReactNode } from 'react'
import { requirePlanAccess } from '@/lib/server-plan-access'

export default async function TeamGuardLayout({ children }: { children: ReactNode }) {
  await requirePlanAccess('BUSINESS')
  return children
}