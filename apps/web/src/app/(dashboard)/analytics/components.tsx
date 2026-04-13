'use client'

import { cn } from '@/lib/cn'

import type { JSX } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Download,
  Eye,
  MousePointerClick,
  Percent,
  RefreshCw,
  TrendingUp,
  Users,
  type LucideIcon,
} from 'lucide-react'

import { SelectField } from '@/components/ui/SelectField'

import {
  DATE_RANGE_OPTIONS,
  DEVICE_COLORS,
  formatActionLabel,
  getMaxInteractionValue,
} from './helpers'
import type { AnalyticsData, CardSummary, DashboardSummary } from './types'

function SkeletonCard(): JSX.Element {
  return <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
}

function formatImpactStat(value: number, singular: string, plural = `${singular}s`): string {
  return value === 1 ? `1 ${singular}` : `${value} ${plural}`
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number | string
  icon: LucideIcon
  color: string
}): JSX.Element {
  return (
    <div className="app-panel flex items-center gap-4 rounded-[24px] p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

export function AnalyticsLoadingShell(): JSX.Element {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <SkeletonCard key={item} />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
    </div>
  )
}

function AnalyticsHeroDesktop({
  cards,
  cardsLoading,
  dashboardSummary,
  focusMessage,
  loading,
  selectedCardId,
  selectedCardLabel,
  selectedCardHandle,
  dateRangeDays,
  exporting,
  onSelectCard,
  onSelectRange,
  onRefresh,
  onExport,
}: {
  cards: CardSummary[]
  cardsLoading: boolean
  dashboardSummary: DashboardSummary | null
  focusMessage: string
  loading: boolean
  selectedCardId: string | null
  selectedCardLabel: string
  selectedCardHandle: string
  dateRangeDays: number
  exporting: boolean
  onSelectCard: (value: string) => void
  onSelectRange: (value: number) => void
  onRefresh: () => void
  onExport: () => void
}): JSX.Element {
  const proofItems = [
    {
      label: 'Attention captured',
      value: cardsLoading ? '—' : formatImpactStat(dashboardSummary?.totalViews ?? 0, 'view'),
      detail: 'Profile views across your shared cards',
    },
    {
      label: 'Intent generated',
      value: cardsLoading ? '—' : formatImpactStat(dashboardSummary?.totalLeads ?? 0, 'lead'),
      detail: 'Leads collected from card activity',
    },
    {
      label: 'Cards working',
      value: cardsLoading
        ? '—'
        : formatImpactStat(dashboardSummary?.activeCards ?? 0, 'active card'),
      detail: 'Profiles currently helping you get discovered',
    },
  ]

  const metrics = [
    { label: 'Tracked Cards', value: cardsLoading ? '—' : cards.length },
    {
      label: 'Active Cards',
      value: cardsLoading ? '—' : (dashboardSummary?.activeCards ?? 0),
    },
    {
      label: 'Total Views',
      value: cardsLoading ? '—' : (dashboardSummary?.totalViews ?? 0),
    },
    {
      label: 'Total Leads',
      value: cardsLoading ? '—' : (dashboardSummary?.totalLeads ?? 0),
    },
  ]

  return (
    <div className="app-panel relative overflow-hidden rounded-[24px] px-6 py-6 sm:px-8 sm:py-7">
      <div
        className="absolute inset-0 opacity-90"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(circle at top left, rgba(99,102,241,0.14), transparent 34%), radial-gradient(circle at right center, rgba(34,211,238,0.10), transparent 28%), linear-gradient(135deg, rgba(255,255,255,0.94), rgba(248,250,252,0.98))',
        }}
      />
      <div className="relative grid gap-5 xl:grid-cols-[1.35fr_1fr] xl:items-start">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-600">
            <TrendingUp className="h-3.5 w-3.5" />
            Analytics
          </div>
          <h1 className="mt-3 text-2xl font-bold text-gray-900 sm:text-[2rem]">
            See what is driving card performance
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500 sm:text-[15px]">
            Monitor traffic, spot engagement patterns, and compare how your shared cards convert
            views into clicks and leads.
          </p>

          <div className="mt-4 grid gap-2 sm:max-w-3xl sm:grid-cols-3">
            {proofItems.map(({ label, value, detail }) => (
              <div
                key={label}
                className="rounded-[22px] border border-white/80 bg-white/80 px-4 py-3 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.16)]"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                  {label}
                </p>
                <p className="mt-1 text-sm font-bold text-gray-900">{value}</p>
                <p className="mt-1 text-xs text-gray-500">{detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-xl sm:grid-cols-4">
            {metrics.map(({ label, value }) => (
              <div
                key={label}
                className="rounded-[22px] border border-white/80 bg-white/85 px-3 py-3 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.2)]"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                  {label}
                </p>
                <p className="mt-1 text-sm font-bold text-gray-900 sm:text-base">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-medium text-gray-600 shadow-sm">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <Eye className="h-3.5 w-3.5" />
            </span>
            <span className="truncate">Focus: {focusMessage}</span>
          </div>
        </div>

        <div className="app-panel-subtle rounded-[24px] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
                Filters & Context
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                Change the lens on your data
              </p>
            </div>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-xs font-semibold uppercase tracking-wide text-indigo-600 shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {cards.length > 0 && (
              <SelectField
                value={selectedCardId ?? ''}
                onChange={(event) => onSelectCard(event.target.value)}
                aria-label="Select card"
                className="focus:border-indigo-500 focus:ring-indigo-100"
              >
                {cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    /{card.handle} {card.fields['name'] ? `— ${card.fields['name']}` : ''}
                  </option>
                ))}
              </SelectField>
            )}

            <div className="flex rounded-2xl border border-gray-300 bg-white">
              {DATE_RANGE_OPTIONS.map((option) => (
                <button
                  key={option.days}
                  type="button"
                  onClick={() => onSelectRange(option.days)}
                  aria-pressed={dateRangeDays === option.days}
                  className={[
                    'flex-1 px-3 py-3 text-sm font-medium transition-colors first:rounded-l-2xl last:rounded-r-2xl',
                    dateRangeDays === option.days
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-600 hover:bg-gray-50',
                  ].join(' ')}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] border border-white/80 bg-white/80 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Selected card
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-gray-900">
                  {selectedCardLabel}
                </p>
                <p className="truncate text-xs text-gray-400">{selectedCardHandle}</p>
              </div>
              <div className="rounded-[24px] border border-white/80 bg-white/80 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Range context
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  Last {dateRangeDays} days
                </p>
                <p className="text-xs text-gray-400">
                  Comparing views, clicks, leads, and traffic sources
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onExport}
              disabled={exporting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              <Download className="h-4 w-4 text-emerald-500" />
              {exporting ? 'Exporting…' : 'Export lead submissions CSV'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AnalyticsHeroMobile({
  cards,
  cardsLoading,
  dashboardSummary,
  focusMessage,
  loading,
  selectedCardId,
  selectedCardLabel,
  selectedCardHandle,
  dateRangeDays,
  exporting,
  onSelectCard,
  onSelectRange,
  onRefresh,
  onExport,
}: {
  cards: CardSummary[]
  cardsLoading: boolean
  dashboardSummary: DashboardSummary | null
  focusMessage: string
  loading: boolean
  selectedCardId: string | null
  selectedCardLabel: string
  selectedCardHandle: string
  dateRangeDays: number
  exporting: boolean
  onSelectCard: (value: string) => void
  onSelectRange: (value: number) => void
  onRefresh: () => void
  onExport: () => void
}): JSX.Element {
  const attentionCaptured = cardsLoading
    ? '—'
    : formatImpactStat(dashboardSummary?.totalViews ?? 0, 'view')
  const intentGenerated = cardsLoading
    ? '—'
    : formatImpactStat(dashboardSummary?.totalLeads ?? 0, 'lead')

  const metrics = [
    { label: 'Tracked', value: cardsLoading ? '—' : cards.length },
    { label: 'Active', value: cardsLoading ? '—' : (dashboardSummary?.activeCards ?? 0) },
    { label: 'Views', value: cardsLoading ? '—' : (dashboardSummary?.totalViews ?? 0) },
    { label: 'Leads', value: cardsLoading ? '—' : (dashboardSummary?.totalLeads ?? 0) },
  ]

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-white/80 bg-white/60 p-5 shadow-[0_8px_32px_-12px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      {/* Decorative background glows */}
      <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-indigo-400/20 blur-[40px] pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-sky-400/20 blur-[40px] pointer-events-none" />

      {/* Header section */}
      <div className="relative mb-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/50 bg-indigo-50/80 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 shadow-sm backdrop-blur-md">
          <TrendingUp className="h-3 w-3" />
          Analytics
        </div>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-800 leading-[1.1]">
          See what is driving <br />
          <span className="bg-gradient-to-r from-indigo-500 to-sky-500 bg-clip-text text-transparent">
            performance.
          </span>
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">
          {attentionCaptured} captured and {intentGenerated} generated across your shared cards.
        </p>
      </div>

      {/* Quick Metrics Grid */}
      <div className="relative mb-6 grid grid-cols-4 gap-2">
        {metrics.map(({ label, value }) => (
          <div
            key={label}
            className="flex flex-col items-center justify-center rounded-[20px] border border-white/60 bg-white/40 py-3 shadow-[0_2px_12px_-4px_rgba(15,23,42,0.05)] backdrop-blur-md"
          >
            <p className="text-[9px] font-extrabold uppercase tracking-widest text-slate-400">
              {label}
            </p>
            <p className="mt-0.5 text-lg font-black text-slate-800">{value}</p>
          </div>
        ))}
      </div>

      {/* Controls Area */}
      <div className="relative space-y-4 rounded-[24px] border-2 border-white/60 bg-white/40 p-4 shadow-inner backdrop-blur-lg">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500">
            Context
          </p>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-indigo-600 shadow-[0_4px_12px_-4px_rgba(79,70,229,0.3)] transition-transform active:scale-90 disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>
        </div>

        {cards.length > 0 && (
          <SelectField
            value={selectedCardId ?? ''}
            onChange={(event) => onSelectCard(event.target.value)}
            aria-label="Select card"
            className="w-full rounded-[16px] border whitespace-nowrap overflow-hidden text-ellipsis border-white/80 bg-white/80 px-4 py-2.5 text-[14px] font-bold text-slate-700 shadow-sm focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all"
          >
            {cards.map((card) => (
              <option key={card.id} value={card.id}>
                /{card.handle} {card.fields['name'] ? `— ${card.fields['name']}` : ''}
              </option>
            ))}
          </SelectField>
        )}

        {/* Date Ranges */}
        <div className="flex rounded-[16px] border border-white/60 bg-white/60 p-1 shadow-inner">
          {DATE_RANGE_OPTIONS.map((option) => (
            <button
              key={option.days}
              type="button"
              onClick={() => onSelectRange(option.days)}
              aria-pressed={dateRangeDays === option.days}
              className={cn(
                'flex-1 rounded-[12px] py-2 text-[13px] font-bold transition-all duration-300',
                dateRangeDays === option.days
                  ? 'bg-indigo-500 text-white shadow-[0_4px_16px_-4px_rgba(79,70,229,0.4)]'
                  : 'text-slate-500 hover:text-slate-800',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Export Button */}
        <button
          type="button"
          onClick={onExport}
          disabled={exporting}
          className="group relative flex w-full items-center justify-center gap-2 rounded-[16px] border-2 border-indigo-200/50 bg-indigo-50/50 px-4 py-3 text-[14px] font-bold text-indigo-700 transition-all hover:bg-white hover:border-indigo-300 hover:shadow-[0_8px_24px_-8px_rgba(79,70,229,0.2)] active:scale-[0.98] disabled:opacity-50 shadow-sm"
        >
          <Download className="h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
          {exporting ? 'Exporting…' : 'Export Leads CSV'}
        </button>
      </div>
    </div>
  )
}

export function AnalyticsHero(props: {
  cards: CardSummary[]
  cardsLoading: boolean
  dashboardSummary: DashboardSummary | null
  focusMessage: string
  loading: boolean
  selectedCardId: string | null
  selectedCardLabel: string
  selectedCardHandle: string
  dateRangeDays: number
  exporting: boolean
  onSelectCard: (value: string) => void
  onSelectRange: (value: number) => void
  onRefresh: () => void
  onExport: () => void
}): JSX.Element {
  return (
    <>
      <div className="hidden lg:block">
        <AnalyticsHeroDesktop {...props} />
      </div>
      <div className="block lg:hidden">
        <AnalyticsHeroMobile {...props} />
      </div>
    </>
  )
}

export function ExportWarningBanner({
  exportWarning,
  onDismiss,
}: {
  exportWarning: string | null
  onDismiss: () => void
}): JSX.Element | null {
  if (!exportWarning) return null

  return (
    <div
      role="status"
      className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700"
    >
      <span>{exportWarning}</span>
      <button type="button" onClick={onDismiss} className="ml-4 font-semibold underline">
        Dismiss
      </button>
    </div>
  )
}

export function EmptyCardsState(): JSX.Element {
  return (
    <div className="app-empty-state">
      <TrendingUp className="mx-auto mb-4 h-12 w-12 text-gray-300" />
      <p className="text-sm text-gray-500">Create a card and share it to see analytics here.</p>
    </div>
  )
}

export function AnalyticsSummarySection({
  loading,
  analyticsData,
  renderedRequestKey,
  activeRequestKey,
}: {
  loading: boolean
  analyticsData: AnalyticsData | null
  renderedRequestKey: string | null
  activeRequestKey: string
}): JSX.Element | null {
  if (loading && !analyticsData) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <SkeletonCard key={item} />
        ))}
      </div>
    )
  }

  if (!analyticsData || renderedRequestKey !== activeRequestKey) return null

  const savedLeads = analyticsData.summary.totalLeads
  const followUpSignal = analyticsData.summary.totalClicks + analyticsData.summary.totalLeads

  if (
    analyticsData.summary.totalViews === 0 &&
    analyticsData.summary.totalClicks === 0 &&
    analyticsData.summary.totalLeads === 0
  ) {
    return (
      <div className="app-empty-state">
        <TrendingUp className="mx-auto mb-4 h-12 w-12 text-gray-300" />
        <p className="text-sm font-medium text-gray-700">No data yet for this period</p>
        <p className="mt-1 text-sm text-gray-400">
          Share your card link to start collecting views and clicks.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="app-panel rounded-[24px] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            Proof of value
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{savedLeads} leads captured</p>
          <p className="mt-2 text-sm text-gray-500">
            People moved beyond viewing your profile and shared their details with you.
          </p>
        </div>
        <div className="app-panel rounded-[24px] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            Follow-up signal
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{followUpSignal} actions</p>
          <p className="mt-2 text-sm text-gray-500">
            Combined clicks and lead submissions show how much intent your cards are creating.
          </p>
        </div>
        <div className="app-panel rounded-[24px] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            Conversion quality
          </p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {analyticsData.summary.conversionRate}% view-to-lead rate
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Use this to judge whether your profile and follow-up flow are turning attention into
            real opportunities.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-5">
        <StatCard
          label="Total Views"
          value={analyticsData.summary.totalViews}
          icon={Eye}
          color="bg-indigo-500"
        />
        <StatCard
          label="Unique Visitors"
          value={analyticsData.summary.uniqueVisitors}
          icon={Users}
          color="bg-cyan-500"
        />
        <StatCard
          label="Total Clicks"
          value={analyticsData.summary.totalClicks}
          icon={MousePointerClick}
          color="bg-amber-500"
        />
        <StatCard
          label="Total Leads"
          value={analyticsData.summary.totalLeads}
          icon={TrendingUp}
          color="bg-emerald-500"
        />
        <StatCard
          label="Conversion Rate"
          value={`${analyticsData.summary.conversionRate}%`}
          icon={Percent}
          color="bg-violet-500"
        />
      </div>
    </div>
  )
}

export function InteractionActionsCard({
  dashboardSummary,
}: {
  dashboardSummary: DashboardSummary | null
}): JSX.Element | null {
  if (!dashboardSummary || dashboardSummary.interactionsByAction.length === 0) return null

  const max = getMaxInteractionValue(dashboardSummary.interactionsByAction)

  return (
    <div className="app-panel rounded-[24px] p-6">
      <h2 className="mb-4 text-base font-semibold text-gray-900">Interaction actions</h2>
      <div className="space-y-3">
        {dashboardSummary.interactionsByAction.slice(0, 10).map((item) => {
          const pct = (item.value / max) * 100
          return (
            <div key={item.name} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{formatActionLabel(item.name)}</span>
                <span className="font-medium text-gray-900">{item.value}</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100">
                <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function AnalyticsChartsSection({
  analyticsData,
  onExport,
}: {
  analyticsData: AnalyticsData | null
  onExport: () => void
}): JSX.Element | null {
  if (
    !analyticsData ||
    (analyticsData.summary.totalViews === 0 &&
      analyticsData.summary.totalClicks === 0 &&
      analyticsData.summary.totalLeads === 0)
  ) {
    return null
  }

  const totalReferrers = analyticsData.charts.referrers.reduce((sum, item) => sum + item.value, 0)

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Views over time</h2>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart
            data={analyticsData.charts.viewsByDay}
            margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickFormatter={(date) => {
                const parts = (date as string).split('-')
                return `${parts[1]}/${parts[2]}`
              }}
            />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip labelFormatter={(date) => String(date)} />
            <Legend />
            <Line
              type="monotone"
              dataKey="count"
              name="Views"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {analyticsData.charts.clicksByDay.some((item) => item.count > 0) && (
        <div className="app-panel rounded-[24px] p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Clicks over time</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart
              data={analyticsData.charts.clicksByDay}
              margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(date) => {
                  const parts = (date as string).split('-')
                  return `${parts[1]}/${parts[2]}`
                }}
              />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip labelFormatter={(date) => String(date)} />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                name="Clicks"
                stroke="#a855f7"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="app-panel rounded-[24px] p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Clicks by platform</h2>
          {analyticsData.charts.clicksByLink.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No click data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={analyticsData.charts.clicksByLink}
                layout={analyticsData.charts.clicksByLink.length > 6 ? 'vertical' : 'horizontal'}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                {analyticsData.charts.clicksByLink.length > 6 ? (
                  <>
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  </>
                ) : (
                  <>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  </>
                )}
                <Tooltip />
                <Bar dataKey="value" name="Clicks" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="app-panel rounded-[24px] p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Device breakdown</h2>
          {analyticsData.charts.deviceBreakdown.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">No device data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={analyticsData.charts.deviceBreakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  label={({ name, percent }) =>
                    `${String(name)} ${(Number(percent) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {analyticsData.charts.deviceBreakdown.map((_, idx) => (
                    <Cell key={idx} fill={DEVICE_COLORS[idx % DEVICE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="app-panel rounded-[26px] p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Top countries</h2>
          {analyticsData.charts.countryBreakdown.length === 0 ? (
            <div className="app-empty-state py-10">
              <p className="text-sm text-gray-400">No country data yet.</p>
            </div>
          ) : (
            <>
              <div className="space-y-2 sm:hidden">
                {analyticsData.charts.countryBreakdown.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between rounded-2xl bg-gray-50/90 px-4 py-3"
                  >
                    <span className="text-sm text-gray-700">{item.name}</span>
                    <span className="text-sm font-semibold text-gray-900">{item.value}</span>
                  </div>
                ))}
              </div>
              <table className="app-table hidden sm:table">
                <thead>
                  <tr className="text-left text-xs text-gray-500">
                    <th className="pb-2 font-medium">Country</th>
                    <th className="pb-2 text-right font-medium">Views</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {analyticsData.charts.countryBreakdown.map((item) => (
                    <tr key={item.name}>
                      <td className="py-2 text-gray-700">{item.name}</td>
                      <td className="py-2 text-right font-medium text-gray-900">{item.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        <div className="app-panel rounded-[26px] p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Top referrers</h2>
          {analyticsData.charts.referrers.length === 0 ? (
            <div className="app-empty-state py-10">
              <p className="text-sm text-gray-400">No referrer data yet.</p>
            </div>
          ) : (
            <>
              <div className="space-y-2 sm:hidden">
                {analyticsData.charts.referrers.map((item) => (
                  <div key={item.name} className="rounded-2xl bg-gray-50/90 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 text-sm text-gray-700">{item.name}</p>
                      <span className="shrink-0 text-sm font-semibold text-gray-900">
                        {item.value}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                      {totalReferrers > 0 ? ((item.value / totalReferrers) * 100).toFixed(1) : '0'}%
                      of referral traffic
                    </p>
                  </div>
                ))}
              </div>
              <table className="app-table hidden sm:table">
                <thead>
                  <tr className="text-left text-xs text-gray-500">
                    <th className="pb-2 font-medium">Referrer</th>
                    <th className="pb-2 text-right font-medium">Count</th>
                    <th className="pb-2 text-right font-medium">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {analyticsData.charts.referrers.map((item) => (
                    <tr key={item.name}>
                      <td className="max-w-[160px] truncate py-2 text-gray-700">{item.name}</td>
                      <td className="py-2 text-right font-medium text-gray-900">{item.value}</td>
                      <td className="py-2 text-right text-gray-500">
                        {totalReferrers > 0
                          ? ((item.value / totalReferrers) * 100).toFixed(1)
                          : '0'}
                        %
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>

      <div className="app-panel rounded-[26px] p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-gray-900">Leads</h2>
          <button
            type="button"
            onClick={onExport}
            className="app-touch-target inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-300 bg-white/85 px-3 py-2.5 text-sm text-gray-700 hover:bg-white"
          >
            <Download className="h-4 w-4" />
            Export lead submissions CSV
          </button>
        </div>
        <p className="text-sm text-gray-500">
          {analyticsData.summary.totalLeads > 0
            ? `${analyticsData.summary.totalLeads} leads captured in this period.`
            : 'No leads yet — share your card to start capturing contacts.'}
        </p>
      </div>
    </>
  )
}
