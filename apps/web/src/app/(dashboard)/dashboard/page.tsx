import type { JSX } from 'react'
import { Suspense } from 'react'
import { apiGet } from '@/lib/api'
import { getServerUserAndTokenOrRedirect } from '@/lib/server-auth'
import type { ItemsResponse, PaginatedResponse } from '@dotly/types'
import { DashboardContent, DashboardHero, SkeletonList } from './components'
import { isTaskOverdue } from './helpers'
import type {
  AppointmentType,
  CardSummary,
  ContactRow,
  CrmFunnel,
  DashboardAnalyticsSummary,
  Deal,
  LeadSubmission,
  TaskItem,
} from './types'

// ─── Data Fetching Functions ───────────────────────────────────────────────────

// Data loaders for Suspense Boundaries
async function fetchSummaryData(token: string) {
  // Catch individual failures cleanly
  try {
    return await apiGet<DashboardAnalyticsSummary>('/analytics/dashboard-summary', token)
  } catch (e) {
    return null
  }
}

async function fetchWidgetData(token: string) {
  const results = await Promise.allSettled([
    apiGet<ItemsResponse<CardSummary>>('/cards', token),
    apiGet<PaginatedResponse<ContactRow>>('/contacts?limit=5', token),
    apiGet<PaginatedResponse<LeadSubmission>>('/lead-submissions?limit=5', token),
    apiGet<PaginatedResponse<Deal>>('/deals?limit=5', token),
    apiGet<PaginatedResponse<TaskItem>>('/tasks?completed=false&limit=5', token),
    apiGet<CrmFunnel>('/crm/analytics/funnel', token),
    apiGet<ItemsResponse<AppointmentType>>('/scheduling/appointment-types', token),
  ])

  return {
    cards: results[0].status === 'fulfilled' ? results[0].value.items : [],
    contacts: results[1].status === 'fulfilled' ? results[1].value.items ?? [] : [],
    leads: results[2].status === 'fulfilled' ? results[2].value.items ?? [] : [],
    deals: results[3].status === 'fulfilled' ? results[3].value.items ?? [] : [],
    tasks: results[4].status === 'fulfilled' ? results[4].value.items ?? [] : [],
    funnel: results[5].status === 'fulfilled' ? results[5].value : null,
    appointmentTypes: results[6].status === 'fulfilled' ? results[6].value.items.filter((a) => a.isActive) : [],
    sectionErrors: results.filter(r => r.status === 'rejected').map((_, i) => String(i)) // Mapping error index simplified
  }
}

// ─── Server Components ────────────────────────────────────────────────────────

async function DashboardWidgetsLoader({ token, analyticsSummary }: { token: string, analyticsSummary: DashboardAnalyticsSummary | null }) {
  const data = await fetchWidgetData(token)
  
  const openDeals = data.deals
  const pipelineValue = analyticsSummary?.openPipelineValue ?? openDeals.reduce((sum, d) => sum + (d.value ?? 0), 0)
  const overdueTasks = data.tasks.filter(isTaskOverdue)
  const funnelMax = data.funnel ? Math.max(...data.funnel.stages.map((s) => s.count), 1) : 1
  const activeCards = analyticsSummary?.activeCards ?? data.cards.filter((card) => card.isActive).length
  const totalViews = analyticsSummary?.totalViews ?? 0
  const totalClicks = analyticsSummary?.totalClicks ?? 0
  const totalLeads = analyticsSummary?.totalLeads ?? 0
  const overdueTasksCount = analyticsSummary?.overdueTasksCount ?? overdueTasks.length

  return (
    <DashboardContent
      activeCards={activeCards}
      appointmentTypes={data.appointmentTypes}
      cards={data.cards}
      contacts={data.contacts}
      funnel={data.funnel}
      funnelMax={funnelMax}
      leads={data.leads}
      loading={false}
      openDeals={openDeals}
      overdueTasksCount={overdueTasksCount}
      pipelineValue={pipelineValue}
      sectionErrors={data.sectionErrors}
      tasks={data.tasks}
      totalClicks={totalClicks}
      totalLeads={totalLeads}
      totalViews={totalViews}
    />
  )
}

function DashboardContentSkeleton() {
  return (
    <div className="space-y-6 opacity-70">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1,2,3,4].map(i => <div key={i} className="h-32 rounded-[26px] bg-white ring-1 ring-gray-950/[0.03] animate-pulse" />)}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SkeletonList rows={4} />
        <SkeletonList rows={4} />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage(): Promise<JSX.Element> {
  const { user, token } = await getServerUserAndTokenOrRedirect('/auth')
  
  const userName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split('@')[0] ??
    'there'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  // Fetch the fastest, most critical piece of data (pre-computed summary) directly
  const analyticsSummary = await fetchSummaryData(token)

  const activeCards = analyticsSummary?.activeCards ?? 0
  const totalLeads = analyticsSummary?.totalLeads ?? 0
  const pipelineValue = analyticsSummary?.openPipelineValue ?? 0
  const openDealsCount = analyticsSummary?.openDealsCount ?? 0
  const overdueTasksCount = analyticsSummary?.overdueTasksCount ?? 0

  const focusMessage =
    overdueTasksCount > 0
      ? `${overdueTasksCount} task${overdueTasksCount === 1 ? '' : 's'} need attention today.`
      : openDealsCount > 0
        ? `${openDealsCount} active deal${openDealsCount === 1 ? '' : 's'} moving through your pipeline.`
        : activeCards > 0
          ? `${activeCards} card${activeCards === 1 ? '' : 's'} live and ready to share.`
          : 'Everything is calm. Use this space to build your next move.'

  return (
    <div className="space-y-5">
      <DashboardHero
        activeBookingTypes={0} /* Placeholder until widgets load, or could be fetched in summary */
        activeCards={activeCards}
        focusMessage={focusMessage}
        greeting={greeting}
        loading={false}
        pipelineValue={pipelineValue}
        sectionErrors={[]}
        totalLeads={totalLeads}
        userName={userName}
      />
      
      {/* Non-blocking data stream for the heavy CRM/API queries */}
      <Suspense fallback={<DashboardContentSkeleton />}>
        <DashboardWidgetsLoader token={token} analyticsSummary={analyticsSummary} />
      </Suspense>
    </div>
  )
}
