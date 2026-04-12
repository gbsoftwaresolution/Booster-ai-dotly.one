'use client'

import type { JSX } from 'react'
import { useState, useEffect } from 'react'
import { getAccessToken, createClient } from '@/lib/supabase/client'
import { apiGet } from '@/lib/api'
import type { ItemsResponse, PaginatedResponse } from '@dotly/types'
import { DashboardContent, DashboardHero } from './components'
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage(): JSX.Element {
  const [cards, setCards] = useState<CardSummary[]>([])
  const [contacts, setContacts] = useState<ContactRow[]>([])
  const [leads, setLeads] = useState<LeadSubmission[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [funnel, setFunnel] = useState<CrmFunnel | null>(null)
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([])
  const [analyticsSummary, setAnalyticsSummary] = useState<DashboardAnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sectionErrors, setSectionErrors] = useState<string[]>([])
  const [userName, setUserName] = useState<string>('there')
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setLoadError(null)
      setSectionErrors([])
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUserName(
        (user?.user_metadata?.full_name as string | undefined) ??
          user?.email?.split('@')[0] ??
          'there',
      )

      let token = ''
      try {
        token = (await getAccessToken()) ?? ''
      } catch {
        setLoadError('Authentication error. Please refresh.')
        setLoading(false)
        return
      }

      const results = await Promise.allSettled([
        apiGet<ItemsResponse<CardSummary>>('/cards', token),
        apiGet<PaginatedResponse<ContactRow>>('/contacts?limit=5', token),
        apiGet<PaginatedResponse<LeadSubmission>>('/lead-submissions?limit=5', token),
        apiGet<PaginatedResponse<Deal>>('/deals?limit=5', token),
        apiGet<PaginatedResponse<TaskItem>>('/tasks?completed=false&limit=5', token),
        apiGet<CrmFunnel>('/crm/analytics/funnel', token),
        apiGet<ItemsResponse<AppointmentType>>('/scheduling/appointment-types', token),
        apiGet<DashboardAnalyticsSummary>('/analytics/dashboard-summary', token),
      ])

      const nextSectionErrors: string[] = []

      if (results[0].status === 'fulfilled') setCards(results[0].value.items)
      else nextSectionErrors.push('cards')

      if (results[1].status === 'fulfilled') setContacts(results[1].value.items ?? [])
      else nextSectionErrors.push('contacts')
      if (results[2].status === 'fulfilled') setLeads(results[2].value.items ?? [])
      else nextSectionErrors.push('lead submissions')
      if (results[3].status === 'fulfilled') setDeals(results[3].value.items ?? [])
      else nextSectionErrors.push('deals')
      if (results[4].status === 'fulfilled') setTasks(results[4].value.items ?? [])
      else nextSectionErrors.push('tasks')
      if (results[5].status === 'fulfilled') setFunnel(results[5].value)
      else nextSectionErrors.push('funnel analytics')
      if (results[6].status === 'fulfilled')
        setAppointmentTypes(results[6].value.items.filter((a) => a.isActive))
      else nextSectionErrors.push('scheduling')
      if (results[7].status === 'fulfilled') setAnalyticsSummary(results[7].value)
      else nextSectionErrors.push('dashboard summary')

      setSectionErrors(nextSectionErrors)
      setLoadError(
        nextSectionErrors.length > 0
          ? `Some sections are unavailable: ${nextSectionErrors.join(', ')}.`
          : null,
      )

      setLoading(false)
    }
    void load()
  }, [reloadToken])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const openDeals = deals
  const pipelineValue =
    analyticsSummary?.openPipelineValue ?? deals.reduce((sum, d) => sum + (d.value ?? 0), 0)
  const overdueTasks = tasks.filter(isTaskOverdue)
  const funnelMax = funnel ? Math.max(...funnel.stages.map((s) => s.count), 1) : 1
  const activeCards = analyticsSummary?.activeCards ?? cards.filter((card) => card.isActive).length
  const totalViews = analyticsSummary?.totalViews ?? 0
  const totalClicks = analyticsSummary?.totalClicks ?? 0
  const totalLeads = analyticsSummary?.totalLeads ?? 0
  const pendingTasksCount = analyticsSummary?.pendingTasksCount ?? tasks.length
  const overdueTasksCount = analyticsSummary?.overdueTasksCount ?? overdueTasks.length
  const openDealsCount = analyticsSummary?.openDealsCount ?? openDeals.length
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
      {loadError && (
        <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700 shadow-[0_16px_32px_-24px_rgba(239,68,68,0.35)]">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => setReloadToken((current) => current + 1)}
            className="ml-4 rounded-full p-1 text-red-400 hover:bg-red-100 hover:text-red-600"
          >
            Retry
          </button>
        </div>
      )}
      <DashboardHero
        activeBookingTypes={appointmentTypes.length}
        activeCards={activeCards}
        focusMessage={focusMessage}
        greeting={greeting}
        loading={loading}
        onRetry={() => setReloadToken((current) => current + 1)}
        pipelineValue={pipelineValue}
        sectionErrors={sectionErrors}
        totalLeads={totalLeads}
        userName={userName}
      />
      <DashboardContent
        activeCards={activeCards}
        appointmentTypes={appointmentTypes}
        cards={cards}
        contacts={contacts}
        funnel={funnel}
        funnelMax={funnelMax}
        leads={leads}
        loading={loading}
        openDeals={openDeals}
        overdueTasksCount={overdueTasksCount}
        pipelineValue={pipelineValue}
        sectionErrors={sectionErrors}
        tasks={tasks}
        totalClicks={totalClicks}
        totalLeads={totalLeads}
        totalViews={totalViews}
      />
    </div>
  )
}
