'use client'

import type { JSX } from 'react'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  QrCode,
  Plus,
  Eye,
  MousePointerClick,
  CreditCard,
  ChevronRight,
  Pencil,
  Users,
  Briefcase,
  CheckSquare,
  AlertCircle,
  Calendar,
  TrendingUp,
  Hand,
  X,
} from 'lucide-react'
import { getAccessToken, createClient } from '@/lib/supabase/client'
import { apiGet } from '@/lib/api'
import { cn } from '@/lib/cn'
import { AppLauncherGrid } from '@/components/shell/AppLauncherGrid'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CardSummary {
  id: string
  handle: string
  templateId: string
  isActive: boolean
  fields: Record<string, string>
}

interface AnalyticsSummary {
  totalViews: number
  totalClicks: number
  totalLeads: number
}

interface ContactRow {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  crmStage?: string
  createdAt: string
}

interface LeadSubmission {
  id: string
  cardId: string
  data: Record<string, string>
  createdAt: string
}

interface Deal {
  id: string
  title: string
  value: number
  currency: string
  stage: string
  closeDate?: string
  probability?: number
  contact?: { firstName: string; lastName: string }
}

interface TaskItem {
  id: string
  title: string
  dueAt?: string
  completed: boolean
  contact?: { firstName: string; lastName: string }
}

interface FunnelStage {
  stage: string
  count: number
}

interface CrmFunnel {
  stages: FunnelStage[]
  totalActive: number
}

interface AppointmentType {
  id: string
  title: string
  durationMinutes: number
  isActive: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

function dueDateLabel(dueAt?: string): { label: string; overdue: boolean } | null {
  if (!dueAt) return null
  const diff = new Date(dueAt).getTime() - Date.now()
  const d = Math.ceil(diff / 86_400_000)
  if (d < 0) return { label: `${Math.abs(d)}d overdue`, overdue: true }
  if (d === 0) return { label: 'Due today', overdue: false }
  if (d === 1) return { label: 'Due tomorrow', overdue: false }
  return { label: `Due in ${d}d`, overdue: false }
}

const STAGE_COLORS: Record<string, string> = {
  PROSPECT: 'bg-blue-100 text-blue-700',
  PROPOSAL: 'bg-yellow-100 text-yellow-700',
  NEGOTIATION: 'bg-orange-100 text-orange-700',
  CLOSED_WON: 'bg-green-100 text-green-700',
  CLOSED_LOST: 'bg-red-100 text-red-700',
  NEW: 'bg-gray-100 text-gray-600',
  CONTACTED: 'bg-blue-100 text-blue-700',
  QUALIFIED: 'bg-purple-100 text-purple-700',
  CLOSED: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-700',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
  hint,
  href,
}: {
  label: string
  value: number | string
  icon: React.ElementType
  color: string
  bg: string
  hint?: string
  href: string
}): JSX.Element {
  return (
    <Link
      href={href}
      className="app-panel flex flex-col gap-4 rounded-[26px] p-4 transition-shadow hover:shadow-[0_28px_60px_-36px_rgba(15,23,42,0.25)] active:shadow-none"
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-2xl', bg)}>
          <Icon className={cn('h-4 w-4', color)} aria-hidden="true" />
        </div>
        <span className="rounded-full bg-gray-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          Live
        </span>
      </div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">{label}</p>
        <p className={cn('mt-0.5 text-2xl font-bold tabular-nums', color)}>{value}</p>
        {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      </div>
    </Link>
  )
}

function SectionHeader({
  title,
  href,
  linkLabel = 'See all',
}: {
  title: string
  href: string
  linkLabel?: string
}): JSX.Element {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <Link href={href} className="flex items-center gap-0.5 text-xs font-medium text-brand-500">
        {linkLabel}
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}

function SkeletonList({ rows = 3 }: { rows?: number }): JSX.Element {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-2xl bg-gray-100" />
      ))}
    </div>
  )
}

function CardAnalyticsRow({
  card,
  onLoaded,
}: {
  card: CardSummary
  onLoaded?: (cardId: string, summary: AnalyticsSummary) => void
}): JSX.Element {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)

  const load = useCallback(async () => {
    try {
      const token = await getAccessToken()
      const data = await apiGet<AnalyticsSummary>(`/cards/${card.id}/analytics/summary`, token)
      setSummary(data)
      onLoaded?.(card.id, data)
    } catch {
      // silently ignore
    }
  }, [card.id, onLoaded])

  useEffect(() => {
    void load()
    const interval = setInterval(() => void load(), 60_000)
    return () => clearInterval(interval)
  }, [load])

  const name = (card.fields['name'] as string | undefined) ?? card.handle
  const title = (card.fields['title'] as string | undefined) ?? ''
  const initials = name
    .split(' ')
    .map((n) => n[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <Link
      href={`/apps/cards/${card.id}/edit`}
      className="app-panel group flex items-center gap-3 rounded-[24px] p-4 transition-shadow hover:shadow-[0_24px_52px_-34px_rgba(15,23,42,0.24)] active:shadow-none"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">
        {initials || '?'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
        {title && <p className="truncate text-xs text-gray-400">{title}</p>}
        <p className="truncate text-[11px] text-gray-300">dotly.one/{card.handle}</p>
      </div>
      {summary ? (
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold tabular-nums text-blue-600">
              {summary.totalViews}
            </span>
            <Eye className="h-3 w-3 text-gray-300" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold tabular-nums text-purple-600">
              {summary.totalClicks}
            </span>
            <MousePointerClick className="h-3 w-3 text-gray-300" />
          </div>
        </div>
      ) : (
        <div className="flex shrink-0 flex-col gap-1.5">
          <div className="h-3 w-10 animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-8 animate-pulse rounded bg-gray-100" />
        </div>
      )}
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-semibold',
            card.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400',
          )}
        >
          {card.isActive ? 'Live' : 'Draft'}
        </span>
        <Pencil className="h-3.5 w-3.5 text-gray-300 transition-colors group-hover:text-brand-400" />
      </div>
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage(): JSX.Element {
  const [cards, setCards] = useState<CardSummary[]>([])
  const [cardStats, setCardStats] = useState<Map<string, AnalyticsSummary>>(new Map())
  const [contacts, setContacts] = useState<ContactRow[]>([])
  const [leads, setLeads] = useState<LeadSubmission[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [funnel, setFunnel] = useState<CrmFunnel | null>(null)
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('there')

  const handleCardLoaded = useCallback((cardId: string, summary: AnalyticsSummary) => {
    setCardStats((prev) => {
      const next = new Map(prev)
      next.set(cardId, summary)
      return next
    })
  }, [])

  const totalStats = Array.from(cardStats.values()).reduce(
    (acc, s) => ({
      views: acc.views + s.totalViews,
      clicks: acc.clicks + s.totalClicks,
      leads: acc.leads + s.totalLeads,
    }),
    { views: 0, clicks: 0, leads: 0 },
  )

  useEffect(() => {
    async function load() {
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
        apiGet<CardSummary[]>('/cards', token),
        apiGet<{ contacts: ContactRow[]; total: number }>('/contacts?limit=5', token),
        apiGet<{ submissions: LeadSubmission[]; total: number }>(
          '/lead-submissions?limit=5',
          token,
        ),
        apiGet<Deal[]>('/deals', token),
        apiGet<TaskItem[]>('/tasks?completed=false', token),
        apiGet<CrmFunnel>('/crm/analytics/funnel', token),
        apiGet<AppointmentType[]>('/scheduling/appointment-types', token),
      ])

      if (results[0].status === 'fulfilled') setCards(results[0].value)
      else setLoadError('Failed to load cards.')

      if (results[1].status === 'fulfilled') setContacts(results[1].value.contacts ?? [])
      if (results[2].status === 'fulfilled') setLeads(results[2].value.submissions ?? [])
      if (results[3].status === 'fulfilled') setDeals(results[3].value ?? [])
      if (results[4].status === 'fulfilled') setTasks(results[4].value ?? [])
      if (results[5].status === 'fulfilled') setFunnel(results[5].value)
      if (results[6].status === 'fulfilled')
        setAppointmentTypes((results[6].value ?? []).filter((a) => a.isActive))

      setLoading(false)
    }
    void load()
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const openDeals = deals.filter((d) => d.stage !== 'CLOSED_WON' && d.stage !== 'CLOSED_LOST')
  const pipelineValue = openDeals.reduce((sum, d) => sum + (d.value ?? 0), 0)
  const overdueTasks = tasks.filter((t) => t.dueAt && new Date(t.dueAt) < new Date())
  const funnelMax = funnel ? Math.max(...funnel.stages.map((s) => s.count), 1) : 1
  const activeCards = cards.filter((card) => card.isActive).length
  const focusMessage =
    overdueTasks.length > 0
      ? `${overdueTasks.length} task${overdueTasks.length === 1 ? '' : 's'} need attention today.`
      : openDeals.length > 0
        ? `${openDeals.length} active deal${openDeals.length === 1 ? '' : 's'} moving through your pipeline.`
        : activeCards > 0
          ? `${activeCards} card${activeCards === 1 ? '' : 's'} live and ready to share.`
          : 'Everything is calm. Use this space to build your next move.'

  return (
    <div className="space-y-5">
      {/* Error banner */}
      {loadError && (
        <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-700 shadow-[0_16px_32px_-24px_rgba(239,68,68,0.35)]">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => setLoadError(null)}
            className="ml-4 rounded-full p-1 text-red-400 hover:bg-red-100 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Greeting ── */}
      <div className="app-panel relative overflow-hidden rounded-[34px] px-5 py-5 sm:px-6 sm:py-6">
        <div
          className="absolute inset-0 opacity-90"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(circle at top left, rgba(56,189,248,0.14), transparent 34%), radial-gradient(circle at right center, rgba(168,85,247,0.12), transparent 28%), linear-gradient(135deg, rgba(255,255,255,0.92), rgba(248,250,252,0.96))',
          }}
        />
        <div className="relative grid gap-5 xl:grid-cols-[1.35fr_0.9fr] xl:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-500">
              {greeting}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-950 sm:text-[2rem]">{userName}</h1>
              <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
                <Hand className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-gray-500 sm:text-[15px]">
              Here&apos;s your business overview for today, with the areas that need attention and
              the momentum already building.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-xl sm:grid-cols-4">
              {[
                { label: 'Live Cards', value: loading ? '—' : activeCards },
                { label: 'Leads Captured', value: loading ? '—' : totalStats.leads },
                {
                  label: 'Pipeline Value',
                  value: loading ? '—' : formatCurrency(pipelineValue),
                },
                { label: 'Active Booking Types', value: loading ? '—' : appointmentTypes.length },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-[22px] border border-white/80 bg-white/80 px-3 py-3 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.24)]"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-bold text-gray-900 sm:text-base">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/apps/cards/create"
                className="inline-flex items-center gap-2 rounded-2xl bg-gray-950 px-4 py-3 text-sm font-semibold text-white shadow-[0_20px_40px_-28px_rgba(15,23,42,0.5)] transition-transform hover:-translate-y-0.5"
              >
                <Plus className="h-4 w-4" />
                Create Card
              </Link>
              <Link
                href="/analytics"
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                <TrendingUp className="h-4 w-4 text-brand-500" />
                View Analytics
              </Link>
            </div>

            <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full bg-white/85 px-3 py-2 text-xs font-medium text-gray-600 shadow-sm">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-brand-500">
                <AlertCircle className="h-3.5 w-3.5" />
              </span>
              <span className="truncate">Focus: {focusMessage}</span>
            </div>
          </div>

          <div className="app-panel-subtle rounded-[30px] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Today At A Glance
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">Your operating snapshot</p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-500 shadow-sm">
                Overview
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {[
                {
                  label: 'Revenue pipeline',
                  value: loading ? '—' : formatCurrency(pipelineValue),
                  detail: `${openDeals.length} open deal${openDeals.length === 1 ? '' : 's'}`,
                  icon: Briefcase,
                  tone: 'bg-green-50 text-green-600',
                },
                {
                  label: 'Task pressure',
                  value: loading ? '—' : `${tasks.length}`,
                  detail:
                    overdueTasks.length > 0
                      ? `${overdueTasks.length} overdue right now`
                      : 'No overdue tasks',
                  icon: CheckSquare,
                  tone:
                    overdueTasks.length > 0
                      ? 'bg-red-50 text-red-600'
                      : 'bg-orange-50 text-orange-600',
                },
                {
                  label: 'CRM activity',
                  value: loading ? '—' : `${funnel?.totalActive ?? contacts.length}`,
                  detail: funnel ? 'Active contacts in funnel' : 'Recent contacts loaded',
                  icon: Users,
                  tone: 'bg-purple-50 text-purple-600',
                },
              ].map(({ label, value, detail, icon: Icon, tone }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-[24px] border border-white/80 bg-white/80 px-4 py-3"
                >
                  <span
                    className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl',
                      tone,
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {label}
                    </p>
                    <p className="truncate text-sm text-gray-500">{detail}</p>
                  </div>
                  <span className="shrink-0 text-lg font-bold tabular-nums text-gray-900">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── App Launcher ── */}
      <AppLauncherGrid />

      {/* ── 4-tile stat grid ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Card Views"
          value={loading ? '—' : totalStats.views}
          icon={Eye}
          color="text-blue-600"
          bg="bg-blue-50"
          hint={
            loading
              ? 'Loading performance'
              : `${activeCards} live card${activeCards === 1 ? '' : 's'}`
          }
          href="/analytics"
        />
        <StatCard
          label="Contacts"
          value={loading ? '—' : contacts.length}
          icon={Users}
          color="text-purple-600"
          bg="bg-purple-50"
          hint={
            loading
              ? 'Loading CRM activity'
              : `${funnel?.totalActive ?? contacts.length} active in CRM`
          }
          href="/contacts"
        />
        <StatCard
          label="Open Deals"
          value={loading ? '—' : openDeals.length}
          icon={Briefcase}
          color="text-green-600"
          bg="bg-green-50"
          hint={loading ? 'Loading pipeline' : formatCurrency(pipelineValue)}
          href="/deals"
        />
        <StatCard
          label="Pending Tasks"
          value={loading ? '—' : tasks.length}
          icon={CheckSquare}
          color={overdueTasks.length > 0 ? 'text-red-600' : 'text-orange-600'}
          bg={overdueTasks.length > 0 ? 'bg-red-50' : 'bg-orange-50'}
          hint={
            loading
              ? 'Loading tasks'
              : overdueTasks.length > 0
                ? `${overdueTasks.length} overdue`
                : 'Everything on track'
          }
          href="/tasks"
        />
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* ── LEFT COLUMN ── */}
        <div className="space-y-5">
          {/* Recent Leads */}
          <div>
            <SectionHeader title="Recent Leads" href="/leads" />
            {loading ? (
              <SkeletonList rows={3} />
            ) : leads.length === 0 ? (
              <div className="app-panel-subtle rounded-[26px] border-2 border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
                No leads captured yet.
              </div>
            ) : (
              <div className="space-y-2">
                {leads.map((lead) => {
                  const name =
                    lead.data['name'] ??
                    lead.data['fullName'] ??
                    lead.data['firstName'] ??
                    'Unknown'
                  const email = lead.data['email'] ?? ''
                  return (
                    <Link
                      key={lead.id}
                      href="/leads"
                      className="app-panel-subtle flex items-center justify-between rounded-[24px] px-4 py-3 transition-shadow hover:shadow-[0_20px_40px_-30px_rgba(15,23,42,0.24)]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
                        {email && <p className="truncate text-xs text-gray-400">{email}</p>}
                      </div>
                      <span className="ml-3 shrink-0 text-xs text-gray-400">
                        {timeAgo(lead.createdAt)}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recent Contacts */}
          <div>
            <SectionHeader title="Recent Contacts" href="/contacts" />
            {loading ? (
              <SkeletonList rows={3} />
            ) : contacts.length === 0 ? (
              <div className="app-panel-subtle rounded-[26px] border-2 border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
                No contacts yet.{' '}
                <Link href="/contacts" className="text-brand-500 underline">
                  Add one
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {contacts.map((c) => (
                  <Link
                    key={c.id}
                    href="/contacts"
                    className="app-panel-subtle flex items-center justify-between rounded-[24px] px-4 py-3 transition-shadow hover:shadow-[0_20px_40px_-30px_rgba(15,23,42,0.24)]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {c.firstName} {c.lastName}
                      </p>
                      {c.email && <p className="truncate text-xs text-gray-400">{c.email}</p>}
                    </div>
                    {c.crmStage && (
                      <span
                        className={cn(
                          'ml-3 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          STAGE_COLORS[c.crmStage] ?? 'bg-gray-100 text-gray-500',
                        )}
                      >
                        {c.crmStage}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Pending Tasks */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-gray-900">Pending Tasks</h2>
                {overdueTasks.length > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {overdueTasks.length} overdue
                  </span>
                )}
              </div>
              <Link
                href="/tasks"
                className="flex items-center gap-0.5 text-xs font-medium text-brand-500"
              >
                See all <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            {loading ? (
              <SkeletonList rows={3} />
            ) : tasks.length === 0 ? (
              <div className="app-panel-subtle rounded-[26px] border-2 border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
                All caught up — no pending tasks.
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.slice(0, 5).map((task) => {
                  const due = dueDateLabel(task.dueAt)
                  return (
                    <Link
                      key={task.id}
                      href="/tasks"
                      className="app-panel-subtle flex items-start justify-between rounded-[24px] px-4 py-3 transition-shadow hover:shadow-[0_20px_40px_-30px_rgba(15,23,42,0.24)]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{task.title}</p>
                        {task.contact && (
                          <p className="text-xs text-gray-400">
                            {task.contact.firstName} {task.contact.lastName}
                          </p>
                        )}
                      </div>
                      {due && (
                        <span
                          className={cn(
                            'ml-3 mt-0.5 shrink-0 text-xs font-semibold',
                            due.overdue ? 'text-red-500' : 'text-gray-400',
                          )}
                        >
                          {due.label}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-5">
          {/* Active Deals */}
          <div>
            <SectionHeader title="Active Deals" href="/deals" />
            {loading ? (
              <SkeletonList rows={3} />
            ) : openDeals.length === 0 ? (
              <div className="app-panel-subtle rounded-[26px] border-2 border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
                No open deals.{' '}
                <Link href="/deals" className="text-brand-500 underline">
                  Add one
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-xl bg-green-50 px-4 py-2">
                  <span className="text-xs font-medium text-green-700">Pipeline value</span>
                  <span className="text-sm font-bold text-green-700">
                    {formatCurrency(pipelineValue)}
                  </span>
                </div>
                {openDeals.slice(0, 5).map((deal) => (
                  <Link
                    key={deal.id}
                    href="/deals"
                    className="app-panel-subtle flex items-center justify-between rounded-[24px] px-4 py-3 transition-shadow hover:shadow-[0_20px_40px_-30px_rgba(15,23,42,0.24)]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{deal.title}</p>
                      {deal.contact && (
                        <p className="text-xs text-gray-400">
                          {deal.contact.firstName} {deal.contact.lastName}
                        </p>
                      )}
                    </div>
                    <div className="ml-3 flex shrink-0 flex-col items-end gap-1">
                      <span className="text-sm font-bold text-gray-900">
                        {formatCurrency(deal.value, deal.currency)}
                      </span>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          STAGE_COLORS[deal.stage] ?? 'bg-gray-100 text-gray-500',
                        )}
                      >
                        {deal.stage.replace('_', ' ')}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* CRM Funnel */}
          {(loading || funnel) && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">CRM Funnel</h2>
                <Link
                  href="/crm"
                  className="flex items-center gap-0.5 text-xs font-medium text-brand-500"
                >
                  View CRM <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              {loading ? (
                <SkeletonList rows={4} />
              ) : funnel && funnel.stages.length > 0 ? (
                <div className="app-panel rounded-[26px] p-4 space-y-2.5">
                  {funnel.stages.map((s) => (
                    <div key={s.stage}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-600">{s.stage}</span>
                        <span className="font-semibold tabular-nums text-gray-900">{s.count}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-2 rounded-full bg-brand-500 transition-all"
                          style={{ width: `${Math.round((s.count / funnelMax) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <p className="pt-1 text-xs text-gray-400">
                    {funnel.totalActive} total active contacts
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {/* My Cards */}
          <div>
            <SectionHeader title="My Cards" href="/apps/cards" />
            {loading ? (
              <SkeletonList rows={2} />
            ) : cards.length === 0 ? (
              <div className="app-panel-subtle flex flex-col items-center rounded-[28px] border-2 border-dashed border-gray-200 py-10 text-center">
                <CreditCard className="mb-3 h-10 w-10 text-gray-200" />
                <p className="text-sm font-medium text-gray-500">No cards yet</p>
                <p className="mt-1 text-xs text-gray-400">
                  Create your first digital card to start sharing.
                </p>
                <Link
                  href="/apps/cards/create"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
                >
                  <Plus className="h-4 w-4" />
                  Create card
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {cards.slice(0, 3).map((card) => (
                  <CardAnalyticsRow key={card.id} card={card} onLoaded={handleCardLoaded} />
                ))}
                {cards.length > 3 && (
                  <Link
                    href="/apps/cards"
                    className="app-panel-subtle flex w-full items-center justify-center gap-1.5 rounded-[24px] py-3 text-sm font-medium text-gray-500 hover:bg-white"
                  >
                    View all {cards.length} cards
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Scheduling — only shown if active appointment types exist */}
          {!loading && appointmentTypes.length > 0 && (
            <div>
              <SectionHeader
                title="Scheduling"
                href="/apps/scheduling/appointment-types"
                linkLabel="Manage"
              />
              <div className="space-y-2">
                {appointmentTypes.slice(0, 4).map((at) => (
                  <Link
                    key={at.id}
                    href="/apps/scheduling/appointment-types"
                    className="app-panel-subtle flex items-center justify-between rounded-[24px] px-4 py-3 transition-shadow hover:shadow-[0_20px_40px_-30px_rgba(15,23,42,0.24)]"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 shrink-0 text-brand-400" />
                      <span className="text-sm font-semibold text-gray-900">{at.title}</span>
                    </div>
                    <span className="text-xs text-gray-400">{at.durationMinutes} min</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Card performance summary bar ── */}
      {!loading && cards.length > 0 && (
        <div className="app-panel grid grid-cols-3 divide-x divide-gray-100 rounded-[28px]">
          {[
            { label: 'Total Views', value: totalStats.views, icon: Eye, color: 'text-blue-600' },
            {
              label: 'Link Clicks',
              value: totalStats.clicks,
              icon: MousePointerClick,
              color: 'text-purple-600',
            },
            {
              label: 'Leads Captured',
              value: totalStats.leads,
              icon: TrendingUp,
              color: 'text-green-600',
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex flex-col items-center gap-1 py-4">
              <Icon className={cn('h-4 w-4', color)} />
              <p className={cn('text-xl font-bold tabular-nums', color)}>{value}</p>
              <p className="text-[11px] text-gray-400">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Quick Actions ── */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-gray-900">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: 'New Card',
              href: '/apps/cards/create',
              icon: CreditCard,
              color: 'text-brand-500',
              bg: 'bg-brand-50',
            },
            {
              label: 'Add Contact',
              href: '/contacts',
              icon: Users,
              color: 'text-purple-600',
              bg: 'bg-purple-50',
            },
            {
              label: 'New Deal',
              href: '/deals',
              icon: Briefcase,
              color: 'text-green-600',
              bg: 'bg-green-50',
            },
            {
              label: 'Add Task',
              href: '/tasks',
              icon: CheckSquare,
              color: 'text-orange-600',
              bg: 'bg-orange-50',
            },
          ].map(({ label, href, icon: Icon, color, bg }) => (
            <Link
              key={label}
              href={href}
              className="app-panel flex flex-col items-center gap-2 rounded-[24px] p-4 transition-shadow hover:shadow-[0_24px_52px_-34px_rgba(15,23,42,0.24)] active:scale-95"
            >
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', bg)}>
                <Icon className={cn('h-5 w-5', color)} />
              </div>
              <span className="text-xs font-semibold text-gray-700">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Mobile QR FAB ── */}
      <Link
        href="/apps/cards/create"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+68px)] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 shadow-lg shadow-brand-500/30 transition-transform active:scale-95 lg:hidden"
        aria-label="Create card"
      >
        <QrCode className="h-6 w-6 text-white" aria-hidden="true" />
      </Link>
    </div>
  )
}
