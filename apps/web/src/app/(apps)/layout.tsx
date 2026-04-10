import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { JSX } from 'react'
import { BillingPlanProvider } from '@/components/billing/BillingPlanProvider'
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
    <BillingPlanProvider>
      <div className="flex min-h-screen bg-transparent">
        <AppRail />
        <AppSidebar />

        <div className="flex flex-1 flex-col min-w-0">
          <header
            className="app-shell-surface sticky top-0 z-30 mx-2 mt-2 flex h-[calc(4.25rem+env(safe-area-inset-top))] shrink-0 items-center gap-3 rounded-[26px] px-4 lg:mx-3 lg:px-6"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
          >
            <div className="lg:hidden flex items-center gap-3">
              <MobileAppTopBar />
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

          <main className="flex-1 px-4 pb-36 pt-5 lg:px-6 lg:pb-10 lg:pt-7">{children}</main>
        </div>

        <MobileAppRail />
      </div>
    </BillingPlanProvider>
  )
}
