'use client'

import type { JSX } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BarChart3, TrendingUp, DollarSign, Target } from 'lucide-react'
import { apiGet } from '@/lib/api'
import { getAccessToken } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FunnelStage {
  stage: string
  count: number
}

interface FunnelConversion {
  from: string
  to: string
  rate: number
}

interface FunnelAnalyticsResponse {
  stages: FunnelStage[]
  conversions: FunnelConversion[]
  totalActive: number
  sourceBreakdown?: Array<{ source: string; count: number }>
}

interface Deal {
  id: string
  title: string
  value: number
  currency: string
  stage: string
  probability: number
  closeDate: string | null
  contact: { id: string; name: string } | null
}

type DealStage = 'PROSPECT' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST'

const DEAL_STAGES: DealStage[] = [
  'PROSPECT',
  'PROPOSAL',
  'NEGOTIATION',
  'CLOSED_WON',
  'CLOSED_LOST',
]

const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  PROSPECT: 'Prospect',
  PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation',
  CLOSED_WON: 'Closed Won',
  CLOSED_LOST: 'Closed Lost',
}

const DEAL_STAGE_COLORS: Record<DealStage, string> = {
  PROSPECT: 'bg-blue-500',
  PROPOSAL: 'bg-yellow-500',
  NEGOTIATION: 'bg-purple-500',
  CLOSED_WON: 'bg-green-500',
  CLOSED_LOST: 'bg-red-400',
}

const CONTACT_STAGE_COLORS: Record<string, string> = {
  NEW: 'bg-gray-500',
  CONTACTED: 'bg-blue-500',
  QUALIFIED: 'bg-yellow-500',
  CLOSED: 'bg-green-500',
  LOST: 'bg-red-500',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPercent(value: number): string {
  const normalized = value <= 1 ? value * 100 : value
  return `${Math.round(normalized)}%`
}

function formatCurrency(value: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `$${value.toLocaleString()}`
  }
}

function normalizeProb(p: number): number {
  return p <= 1 ? p * 100 : p
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CrmAnalyticsPage(): JSX.Element {
  const [funnelData, setFunnelData] = useState<FunnelAnalyticsResponse | null>(null)
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const loadData = useCallback(
    async (from = dateFrom, to = dateTo) => {
      setLoading(true)
      setError(null)
      try {
        const token = await getAccessToken()
        const funnelParams = new URLSearchParams()
        if (from) funnelParams.set('dateFrom', from)
        if (to) funnelParams.set('dateTo', to)
        const funnelUrl = `/crm/analytics/funnel${funnelParams.toString() ? `?${funnelParams.toString()}` : ''}`
        const [funnel, dealsData] = await Promise.all([
          apiGet<FunnelAnalyticsResponse>(funnelUrl, token),
          apiGet<Deal[]>('/deals', token),
        ])
        setFunnelData(funnel)
        setDeals(dealsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    },
    [dateFrom, dateTo],
  )

  useEffect(() => {
    void loadData()
  }, [loadData])

  const funnelMaxCount = useMemo(
    () => Math.max(...(funnelData?.stages.map((s) => s.count) ?? [0]), 1),
    [funnelData],
  )

  // Deal metrics
  const dealCurrency = deals[0]?.currency ?? 'USD'
  const totalPipeline = useMemo(() => deals.reduce((s, d) => s + d.value, 0), [deals])
  const weightedPipeline = useMemo(
    () =>
      deals
        .filter((d) => d.stage !== 'CLOSED_LOST')
        .reduce((s, d) => s + d.value * normalizeProb(d.probability) * 0.01, 0),
    [deals],
  )
  const wonDeals = useMemo(() => deals.filter((d) => d.stage === 'CLOSED_WON'), [deals])
  const closedDeals = useMemo(
    () => deals.filter((d) => d.stage === 'CLOSED_WON' || d.stage === 'CLOSED_LOST'),
    [deals],
  )
  const winRate = closedDeals.length > 0 ? (wonDeals.length / closedDeals.length) * 100 : null
  const avgWonDeal =
    wonDeals.length > 0 ? wonDeals.reduce((s, d) => s + d.value, 0) / wonDeals.length : null

  const dealsByStage = useMemo(() => {
    return DEAL_STAGES.map((stage) => {
      const stageDeals = deals.filter((d) => d.stage === stage)
      const value = stageDeals.reduce((s, d) => s + d.value, 0)
      return { stage, count: stageDeals.length, value }
    })
  }, [deals])

  const maxDealStageValue = useMemo(
    () => Math.max(...dealsByStage.map((s) => s.value), 1),
    [dealsByStage],
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <a
            href="/contacts"
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to contacts
          </a>
          <h1 className="text-2xl font-bold text-gray-900">CRM Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Contact funnel performance and deal revenue metrics.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Date range filter */}
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm">
            <label className="text-xs font-medium text-gray-500">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-sm text-gray-700 focus:outline-none"
            />
            <label className="text-xs font-medium text-gray-500">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-sm text-gray-700 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void loadData(dateFrom, dateTo)}
              disabled={loading}
              className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Apply
            </button>
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => {
                  setDateFrom('')
                  setDateTo('')
                  void loadData('', '')
                }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Clear
              </button>
            )}
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 text-right shadow-sm">
            <p className="text-sm text-gray-500">Total active contacts</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {loading ? '...' : (funnelData?.totalActive ?? 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={() => void loadData()} className="font-semibold underline">
            Retry
          </button>
        </div>
      )}

      {/* ── Deal Revenue KPIs ── */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
          <DollarSign className="h-4 w-4 text-indigo-600" />
          Deal Revenue
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Total pipeline
            </p>
            <p className="mt-1 text-xl font-bold text-gray-900">
              {loading ? '...' : formatCurrency(totalPipeline, dealCurrency)}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Weighted pipeline
            </p>
            <p className="mt-1 text-xl font-bold text-indigo-700">
              {loading ? '...' : formatCurrency(weightedPipeline, dealCurrency)}
            </p>
            <p className="mt-1 text-xs text-gray-400">value × probability</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Win rate</p>
            <p className="mt-1 text-xl font-bold text-green-700">
              {loading ? '...' : winRate != null ? `${Math.round(winRate)}%` : '—'}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {closedDeals.length > 0
                ? `${wonDeals.length} won / ${closedDeals.length} closed`
                : 'no closed deals yet'}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Avg won deal
            </p>
            <p className="mt-1 text-xl font-bold text-gray-900">
              {loading
                ? '...'
                : avgWonDeal != null
                  ? formatCurrency(avgWonDeal, dealCurrency)
                  : '—'}
            </p>
          </div>
        </div>
      </section>

      {/* ── Deal pipeline by stage ── */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-indigo-600" />
          <h2 className="text-base font-semibold text-gray-900">Pipeline value by stage</h2>
        </div>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : deals.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No deals yet.</p>
        ) : (
          <div className="space-y-3">
            {dealsByStage.map(({ stage, count, value }) => {
              const barWidth = `${Math.max((value / maxDealStageValue) * 100, value > 0 ? 10 : 0)}%`
              const color = DEAL_STAGE_COLORS[stage as DealStage] ?? 'bg-indigo-500'
              return (
                <div
                  key={stage}
                  className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px] md:items-center"
                >
                  <div className="h-10 rounded-full bg-gray-100 p-1">
                    <div
                      className={`flex h-full items-center rounded-full px-4 text-xs font-semibold text-white ${color}`}
                      style={{ width: barWidth }}
                    >
                      {DEAL_STAGE_LABELS[stage as DealStage]}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm">
                    <span className="font-medium text-gray-900">
                      {DEAL_STAGE_LABELS[stage as DealStage]}
                    </span>
                    <span className="text-gray-500">
                      {count} deal{count !== 1 ? 's' : ''}
                    </span>
                    <span className="font-semibold text-indigo-600">
                      {formatCurrency(value, dealCurrency)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Contact stage funnel ── */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-indigo-600" />
          <h2 className="text-base font-semibold text-gray-900">Contact stage funnel</h2>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-gray-100" />
            ))}
          </div>
        ) : !funnelData || funnelData.stages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="mb-4 h-12 w-12 text-gray-300" />
            <p className="text-sm font-medium text-gray-700">No stage data yet</p>
            <p className="mt-1 text-sm text-gray-400">Active CRM contacts will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {funnelData.stages.map((stage) => {
              const percentOfTotal =
                funnelData.totalActive > 0 ? (stage.count / funnelData.totalActive) * 100 : 0
              const width = `${Math.max(
                (stage.count / funnelMaxCount) * 100,
                stage.count > 0 ? 12 : 0,
              )}%`
              return (
                <div
                  key={stage.stage}
                  className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px] md:items-center"
                >
                  <div className="h-12 rounded-full bg-gray-100 p-1">
                    <div
                      className={`flex h-full items-center rounded-full px-4 text-sm font-semibold text-white ${CONTACT_STAGE_COLORS[stage.stage] ?? 'bg-indigo-500'}`}
                      style={{ width }}
                    >
                      {stage.stage}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                    <span className="font-medium text-gray-900">{stage.stage}</span>
                    <span className="text-gray-500">{stage.count.toLocaleString()}</span>
                    <span className="font-semibold text-indigo-600">
                      {formatPercent(percentOfTotal)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Conversion rates ── */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-indigo-600" />
            <h2 className="text-base font-semibold text-gray-900">Stage conversion rates</h2>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Stage-to-stage conversion across your active contact pipeline.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        ) : !funnelData || funnelData.conversions.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-gray-500">
            No conversion data available.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Transition
                </th>
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {funnelData.conversions.map((conversion) => (
                <tr key={`${conversion.from}-${conversion.to}`} className="hover:bg-gray-50">
                  <td className="px-5 py-4 font-medium text-gray-900">
                    {conversion.from} {'→'} {conversion.to}
                  </td>
                  <td className="px-5 py-4 text-indigo-600">{formatPercent(conversion.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ── Source Breakdown ── */}
      {funnelData?.sourceBreakdown && funnelData.sourceBreakdown.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-indigo-600" />
              <h2 className="text-base font-semibold text-gray-900">Contact source breakdown</h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              How contacts were acquired (by card handle or direct creation).
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {funnelData.sourceBreakdown
              .sort((a, b) => b.count - a.count)
              .map((row) => {
                const total = funnelData.sourceBreakdown!.reduce((s, r) => s + r.count, 0)
                const pct = total > 0 ? Math.round((row.count / total) * 100) : 0
                return (
                  <div key={row.source} className="flex items-center gap-4 px-5 py-3">
                    <div className="w-32 shrink-0 truncate text-sm font-medium text-gray-700">
                      {row.source}
                    </div>
                    <div className="flex-1">
                      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-2 rounded-full bg-indigo-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-16 shrink-0 text-right text-sm text-gray-500">
                      {row.count} ({pct}%)
                    </div>
                  </div>
                )
              })}
          </div>
        </section>
      )}
    </div>
  )
}
