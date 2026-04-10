'use client'

import type { JSX } from 'react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { getAccessToken } from '@/lib/supabase/client'
import { apiGet } from '@/lib/api'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  RefreshCw,
  Download,
  TrendingUp,
  Eye,
  MousePointerClick,
  Users,
  Percent,
  type LucideIcon,
} from 'lucide-react'

interface CardSummary {
  id: string
  handle: string
  fields: Record<string, string>
}

interface AnalyticsData {
  summary: {
    totalViews: number
    totalClicks: number
    totalLeads: number
    uniqueVisitors: number
    conversionRate: number
  }
  charts: {
    viewsByDay: { date: string; count: number }[]
    clicksByDay: { date: string; count: number }[]
    deviceBreakdown: { name: string; value: number }[]
    countryBreakdown: { name: string; value: number }[]
    clicksByLink: { name: string; value: number }[]
    referrers: { name: string; value: number }[]
  }
}

interface DashboardSummary {
  totalViews: number
  totalClicks: number
  totalLeads: number
  totalCards: number
  activeCards: number
  interactionsByAction: { name: string; value: number }[]
  truncated: boolean
}

const DEVICE_COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981']
const DATE_RANGE_OPTIONS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
]

function SkeletonCard(): JSX.Element {
  return <div className="h-24 animate-pulse rounded-xl bg-gray-100" />
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

function fmtActionLabel(name: string) {
  return name
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export default function AnalyticsPage(): JSX.Element {
  const [cards, setCards] = useState<CardSummary[]>([])
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [dateRangeDays, setDateRangeDays] = useState(30)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [cardsLoading, setCardsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Load cards
  useEffect(() => {
    async function loadCards() {
      try {
        const token = await getAccessToken()
        const data = await apiGet<CardSummary[]>('/cards', token)
        const summary = await apiGet<DashboardSummary>('/analytics/dashboard-summary', token)
        setCards(data)
        setDashboardSummary(summary)
        const first = data[0]
        if (first) setSelectedCardId(first.id)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cards')
      } finally {
        setCardsLoading(false)
      }
    }
    void loadCards()
  }, [])

  // Load analytics when card or date range changes
  const loadAnalytics = useCallback(async () => {
    if (!selectedCardId) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      const to = new Date()
      to.setUTCHours(23, 59, 59, 999)
      const from = new Date(Date.now() - dateRangeDays * 24 * 60 * 60 * 1000)
      from.setUTCHours(0, 0, 0, 0)
      const data = await apiGet<AnalyticsData>(
        `/cards/${selectedCardId}/analytics?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`,
        token,
        controller.signal,
      )
      if (controller.signal.aborted) return
      setAnalyticsData(data)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      if (!abortRef.current?.signal.aborted) setLoading(false)
    }
  }, [selectedCardId, dateRangeDays])

  useEffect(() => {
    void loadAnalytics()
  }, [loadAnalytics])

  const [exportWarning, setExportWarning] = useState<string | null>(null)

  const selectedCard = cards.find((card) => card.id === selectedCardId) ?? null
  const selectedCardLabel =
    selectedCard?.fields['name']?.trim() ||
    (selectedCard ? `/${selectedCard.handle}` : 'No card selected')
  const selectedCardHandle = selectedCard ? `/${selectedCard.handle}` : 'No card selected'
  const focusMessage = analyticsData
    ? analyticsData.summary.totalViews > 0
      ? `${selectedCardLabel} generated ${analyticsData.summary.totalViews} views and ${analyticsData.summary.totalClicks} clicks in the last ${dateRangeDays} days.`
      : `No traffic yet in the last ${dateRangeDays} days. Share ${selectedCardHandle} to start collecting data.`
    : cards.length > 0
      ? `Tracking ${cards.length} card${cards.length === 1 ? '' : 's'} with ${dashboardSummary?.activeCards ?? 0} active right now.`
      : 'Create and share a card to begin collecting analytics.'

  const exportLeadsCSV = useCallback(async () => {
    setExportWarning(null)
    try {
      const token = await getAccessToken()
      const params = new URLSearchParams()
      if (selectedCardId) params.set('cardId', selectedCardId)
      const to = new Date()
      to.setUTCHours(23, 59, 59, 999)
      const from = new Date(Date.now() - dateRangeDays * 24 * 60 * 60 * 1000)
      from.setUTCHours(0, 0, 0, 0)
      params.set('from', from.toISOString())
      params.set('to', to.toISOString())
      const apiBase = process.env.NEXT_PUBLIC_API_URL ?? ''
      const res = await fetch(`${apiBase}/contacts/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token ?? ''}` },
      })
      if (!res.ok) {
        const message = await res.text().catch(() => '')
        if (message.includes('CSV export is available on Pro.')) {
          throw new Error('CSV export is available on Pro. Upgrade in billing to export leads.')
        }
        throw new Error(`Export failed: ${res.status}`)
      }
      // Surface truncation notice if the server capped the export
      if (res.headers.get('x-export-truncated') === 'true') {
        const count = res.headers.get('x-export-row-count') ?? '10000'
        setExportWarning(
          `Export limited to ${Number(count).toLocaleString()} rows. Use the API for full data.`,
        )
      }
      const csv = await res.text()
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    }
  }, [selectedCardId, dateRangeDays])

  if (cardsLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-100" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="app-panel relative overflow-hidden rounded-[34px] px-6 py-6 sm:px-8 sm:py-7">
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

            <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-xl sm:grid-cols-4">
              {[
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
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-[22px] border border-white/80 bg-white/85 px-3 py-3 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.2)]"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
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

          <div className="app-panel-subtle rounded-[30px] p-4 sm:p-5">
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
                onClick={() => void loadAnalytics()}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-indigo-600 shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {cards.length > 0 && (
                <select
                  value={selectedCardId ?? ''}
                  onChange={(e) => setSelectedCardId(e.target.value)}
                  aria-label="Select card"
                  className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-3 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {cards.map((card) => (
                    <option key={card.id} value={card.id}>
                      /{card.handle} {card.fields['name'] ? `— ${card.fields['name']}` : ''}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex rounded-2xl border border-gray-300 bg-white">
                {DATE_RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.days}
                    type="button"
                    onClick={() => setDateRangeDays(opt.days)}
                    aria-pressed={dateRangeDays === opt.days}
                    className={[
                      'flex-1 px-3 py-3 text-sm font-medium transition-colors first:rounded-l-2xl last:rounded-r-2xl',
                      dateRangeDays === opt.days
                        ? 'bg-indigo-600 text-white'
                        : 'text-gray-600 hover:bg-gray-50',
                    ].join(' ')}
                  >
                    {opt.label}
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
                onClick={() => void exportLeadsCSV()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Download className="h-4 w-4 text-emerald-500" />
                Export Leads CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Export truncation warning */}
      {exportWarning && (
        <div
          role="status"
          className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700"
        >
          <span>{exportWarning}</span>
          <button
            type="button"
            onClick={() => setExportWarning(null)}
            className="ml-4 font-semibold underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadAnalytics()}
            className="ml-4 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty card state */}
      {cards.length === 0 && (
        <div className="app-empty-state">
          <TrendingUp className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p className="text-sm text-gray-500">Create a card and share it to see analytics here.</p>
        </div>
      )}

      {/* Stats summary */}
      {loading && !analyticsData ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : analyticsData ? (
        analyticsData.summary.totalViews === 0 &&
        analyticsData.summary.totalClicks === 0 &&
        analyticsData.summary.totalLeads === 0 ? (
          <div className="app-empty-state">
            <TrendingUp className="mx-auto mb-4 h-12 w-12 text-gray-300" />
            <p className="text-sm font-medium text-gray-700">No data yet for this period</p>
            <p className="mt-1 text-sm text-gray-400">
              Share your card link to start collecting views and clicks.
            </p>
          </div>
        ) : (
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
        )
      ) : null}

      {dashboardSummary && dashboardSummary.interactionsByAction.length > 0 && (
        <div className="app-panel rounded-[28px] p-6">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Interaction actions</h2>
          <div className="space-y-3">
            {dashboardSummary.interactionsByAction.slice(0, 10).map((item) => {
              const max = Math.max(...dashboardSummary.interactionsByAction.map((a) => a.value), 1)
              const pct = (item.value / max) * 100
              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{fmtActionLabel(item.name)}</span>
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
      )}

      {/* Charts and detail sections — only shown when there is actual data */}
      {analyticsData &&
        (analyticsData.summary.totalViews > 0 ||
          analyticsData.summary.totalClicks > 0 ||
          analyticsData.summary.totalLeads > 0) && (
          <>
            {/* Views over time line chart */}
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
                    tickFormatter={(d) => {
                      const parts = (d as string).split('-')
                      return `${parts[1]}/${parts[2]}`
                    }}
                  />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip labelFormatter={(d) => String(d)} />
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

            {/* Clicks over time line chart */}
            {analyticsData.charts.clicksByDay.some((d) => d.count > 0) && (
              <div className="app-panel rounded-[28px] p-6">
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
                      tickFormatter={(d) => {
                        const parts = (d as string).split('-')
                        return `${parts[1]}/${parts[2]}`
                      }}
                    />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip labelFormatter={(d) => String(d)} />
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

            {/* Clicks by platform + Device donut */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Clicks by platform */}
              <div className="app-panel rounded-[28px] p-6">
                <h2 className="mb-4 text-base font-semibold text-gray-900">Clicks by platform</h2>
                {analyticsData.charts.clicksByLink.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">No click data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={analyticsData.charts.clicksByLink}
                      layout={
                        analyticsData.charts.clicksByLink.length > 6 ? 'vertical' : 'horizontal'
                      }
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      {analyticsData.charts.clicksByLink.length > 6 ? (
                        <>
                          <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            tick={{ fontSize: 11 }}
                            width={80}
                          />
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

              {/* Device breakdown donut */}
              <div className="app-panel rounded-[28px] p-6">
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

            {/* Countries + Referrers */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Top countries */}
              <div className="app-panel rounded-[26px] p-6">
                <h2 className="mb-4 text-base font-semibold text-gray-900">Top countries</h2>
                {analyticsData.charts.countryBreakdown.length === 0 ? (
                  <div className="app-empty-state py-10">
                    <p className="text-sm text-gray-400">No country data yet.</p>
                  </div>
                ) : (
                  <table className="app-table">
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
                          <td className="py-2 text-right font-medium text-gray-900">
                            {item.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Top referrers */}
              <div className="app-panel rounded-[26px] p-6">
                <h2 className="mb-4 text-base font-semibold text-gray-900">Top referrers</h2>
                {analyticsData.charts.referrers.length === 0 ? (
                  <div className="app-empty-state py-10">
                    <p className="text-sm text-gray-400">No referrer data yet.</p>
                  </div>
                ) : (
                  <table className="app-table">
                    <thead>
                      <tr className="text-left text-xs text-gray-500">
                        <th className="pb-2 font-medium">Referrer</th>
                        <th className="pb-2 text-right font-medium">Count</th>
                        <th className="pb-2 text-right font-medium">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(() => {
                        const total = analyticsData.charts.referrers.reduce(
                          (s, r) => s + r.value,
                          0,
                        )
                        return analyticsData.charts.referrers.map((item) => (
                          <tr key={item.name}>
                            <td className="py-2 text-gray-700 truncate max-w-[160px]">
                              {item.name}
                            </td>
                            <td className="py-2 text-right font-medium text-gray-900">
                              {item.value}
                            </td>
                            <td className="py-2 text-right text-gray-500">
                              {total > 0 ? ((item.value / total) * 100).toFixed(1) : '0'}%
                            </td>
                          </tr>
                        ))
                      })()}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Leads section */}
            <div className="app-panel rounded-[26px] p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">Leads</h2>
                <button
                  type="button"
                  onClick={() => void exportLeadsCSV()}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white/85 px-3 py-1.5 text-sm text-gray-700 hover:bg-white"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
              </div>
              <p className="text-sm text-gray-500">
                {analyticsData.summary.totalLeads > 0
                  ? `${analyticsData.summary.totalLeads} leads captured in this period.`
                  : 'No leads yet — share your card to start capturing contacts.'}
              </p>
            </div>
          </>
        )}
    </div>
  )
}
