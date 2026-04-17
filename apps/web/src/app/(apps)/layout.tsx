import { getServerUserOrRedirect } from '@/lib/server-auth'
import type { JSX } from 'react'
import { BillingPlanProvider } from '@/components/billing/BillingPlanProvider'
import { OnboardingGate } from '@/components/auth/OnboardingGate'
import { AppRail } from '@/components/shell/AppRail'
import { AppSidebar } from '@/components/shell/AppSidebar'
import { MobileAppRail } from '@/components/shell/MobileAppShell'
import { TopBarAvatar } from '@/components/TopBarAvatar'
import { DynamicBreadcrumbs } from '@/components/shell/DynamicBreadcrumbs'

export default async function AppsLayout({
  children,
}: {
  children: React.ReactNode
}): Promise<JSX.Element> {
  const user = await getServerUserOrRedirect('/auth')

  const displayName = user.name ?? undefined

  return (
    <OnboardingGate>
      <BillingPlanProvider>
        <div className="flex min-h-screen bg-transparent">
          <AppRail />
          <AppSidebar />

          <div className="flex flex-1 flex-col min-w-0">
            <header
              className="app-shell-surface sticky top-0 z-30 mx-2 mt-2 flex h-[calc(4.25rem+env(safe-area-inset-top))] shrink-0 items-center gap-3 rounded-[26px] px-4 lg:mx-3 lg:px-6"
              style={{ paddingTop: 'env(safe-area-inset-top)' }}
            >
              <div className="flex items-center gap-3">
                <DynamicBreadcrumbs />
              </div>

              <div className="flex-1" />

              <TopBarAvatar email={user.email} name={displayName} />
            </header>

            <main className="flex-1 px-4 pb-36 pt-5 lg:px-6 lg:pb-10 lg:pt-7">{children}</main>
          </div>

          <MobileAppRail />
        </div>
      </BillingPlanProvider>
    </OnboardingGate>
  )
}
