import type { ReactNode } from 'react'
import { requirePlanAccess } from '@/lib/server-plan-access'

export default async function ContactsGuardLayout({ children }: { children: ReactNode }) {
  await requirePlanAccess('STARTER')
  return children
}