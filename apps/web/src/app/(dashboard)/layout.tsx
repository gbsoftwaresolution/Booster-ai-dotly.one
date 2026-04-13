import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { JSX } from 'react'
import { BillingPlanProvider } from '@/components/billing/BillingPlanProvider'
import { AppRail } from '@/components/shell/AppRail'
import { TopBarAvatar } from '@/components/TopBarAvatar'
import { MobileAppRail } from '@/components/shell/MobileAppShell'
import { DynamicBreadcrumbs } from '@/components/shell/DynamicBreadcrumbs'

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
    <BillingPlanProvider>
      <div className="flex min-h-screen bg-transparent">
        <AppRail />

        <div className="flex flex-1 flex-col min-w-0">
          <header
            className="sticky top-0 z-30 mx-2 mt-2 flex h-[calc(4.25rem+env(safe-area-inset-top))] shrink-0 items-center justify-between gap-3 rounded-[32px] border border-gray-950/[0.04] bg-white/70 backdrop-blur-xl px-4 shadow-[0_8px_32px_-12px_rgba(15,23,42,0.08)] lg:mx-4 lg:mt-4 lg:px-6 transition-all duration-500"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
          >
            <div className="absolute inset-0 rounded-[32px] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] mix-blend-overlay pointer-events-none"></div>
            
            <div className="relative flex flex-1 items-center gap-3">
              <DynamicBreadcrumbs />
            </div>

            <div className="relative hidden lg:flex lg:flex-1" />

            <div className="relative z-10">
              <TopBarAvatar email={user.email} name={displayName} />
            </div>
          </header>

          <main className="flex-1 px-4 pb-36 pt-6 lg:px-8 lg:pb-10 lg:pt-8">{children}</main>
        </div>

        <MobileAppRail />
      </div>
    </BillingPlanProvider>
  )
}
