import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { JSX } from 'react'
import { AppRail } from '@/components/shell/AppRail'
import { AppSidebar } from '@/components/shell/AppSidebar'
import { MobileAppRail, MobileAppTopBar } from '@/components/shell/MobileAppShell'
import { TopBarAvatar } from '@/components/TopBarAvatar'

export default async function AppsLayout({
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
      {/* Desktop: thin app rail (far left) */}
      <AppRail />

      {/* Desktop: contextual per-app sidebar */}
      <AppSidebar />

      {/* Main content column */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header
          className="sticky top-0 z-30 flex h-14 shrink-0 items-center border-b border-gray-200 bg-white px-4 lg:px-5 gap-3"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          {/* Mobile: hamburger for app sidebar */}
          <div className="lg:hidden flex items-center gap-3">
            <MobileAppTopBar />
            {/* Wordmark */}
            <div className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg"
                style={{ background: 'linear-gradient(135deg,#38bdf8,#0ea5e9)' }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="3.5" fill="white" />
                  <circle
                    cx="8"
                    cy="8"
                    r="6.5"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeDasharray="3 2"
                  />
                </svg>
              </div>
              <span className="text-base font-bold text-gray-900">
                Dotly<span className="text-sky-500">.one</span>
              </span>
            </div>
          </div>

          <div className="flex-1" />

          <TopBarAvatar email={user.email} name={displayName} />
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 pb-28 lg:p-6 lg:pb-6">{children}</main>
      </div>

      {/* Mobile bottom app rail */}
      <MobileAppRail />
    </div>
  )
}
