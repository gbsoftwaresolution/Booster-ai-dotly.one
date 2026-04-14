import { getServerUserOrRedirect } from '@/lib/server-auth'
import { redirect } from 'next/navigation'
import type { JSX } from 'react'

export default async function StandaloneLayout({
  children,
}: {
  children: React.ReactNode
}): Promise<JSX.Element> {
  await getServerUserOrRedirect('/auth')

  return <>{children}</>
}
