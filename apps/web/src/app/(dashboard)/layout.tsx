import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { JSX } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { TopBarAvatar } from '@/components/TopBarAvatar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}): Promise<JSX.Element> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth')
  }

  const displayName =
    (user.user_metadata?.['full_name'] as string | undefined) ??
    (user.user_metadata?.['name'] as string | undefined) ??
    undefined

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar — full-width on mobile (no hamburger offset needed anymore) */}
        <header
          className="flex h-14 items-center border-b border-gray-200 bg-white px-4 lg:px-6"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          {/* Logo wordmark — visible only on mobile where sidebar is hidden */}
          <div className="flex flex-1 items-center gap-2 lg:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-white">
              <span className="text-xs font-bold">D</span>
            </div>
            <span className="text-base font-bold text-gray-900">Dotly.one</span>
          </div>

          {/* Spacer on desktop so avatar stays right-aligned */}
          <div className="hidden lg:flex lg:flex-1" />

          <TopBarAvatar email={user.email} name={displayName} />
        </header>

        {/* Page content — extra bottom padding on mobile to clear the tab bar */}
        <main className="flex-1 overflow-auto p-4 pb-24 lg:p-6 lg:pb-6">{children}</main>
      </div>
    </div>
  )
}
