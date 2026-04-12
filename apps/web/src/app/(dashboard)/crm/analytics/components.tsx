'use client'

import Link from 'next/link'
import type { JSX } from 'react'
import { ArrowLeft, BarChart3, DollarSign, Target, TrendingUp } from 'lucide-react'

import {
  buildSourceBreakdownRows,
  CONTACT_STAGE_COLORS,
  DEAL_STAGE_COLORS,
  DEAL_STAGE_LABELS,
  formatCurrency,
  formatPercent,
} from './helpers'
import type { DealStage, DealStageSummary, FunnelAnalyticsResponse } from './types'

export function CrmAnalyticsHeader({
  dateFrom,
  dateTo,
  loading,
  totalActive,
  onDateFromChange,
  onDateToChange,
  onApply,
  onClear,
}: {
  dateFrom: string
  dateTo: string
  loading: boolean
  totalActive: number
  onDateFromChange: (value: string) => void
  onDateToChange: (value: string) => void
  onApply: () => void
  onClear: () => void
}): JSX.Element {
  return (
    <div className="app-panel flex flex-wrap items-start justify-between gap-4 rounded-[30px] px-6 py-6 sm:px-8">
      <div>
        <Link
          href="/contacts"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to contacts
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">CRM Analytics</h1>
        <p className="mt-2 text-sm text-gray-500">
          Contact funnel performance and deal revenue metrics.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="app-panel-subtle flex items-center gap-2 rounded-[20px] px-4 py-2">
          <label className="text-xs font-medium text-gray-500">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => onDateFromChange(event.target.value)}
            className="text-sm text-gray-700 focus:outline-none"
          />
          <label className="text-xs font-medium text-gray-500">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(event) => onDateToChange(event.target.value)}
            className="text-sm text-gray-700 focus:outline-none"
          />
          <button
            type="button"
            onClick={onApply}
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Apply
          </button>
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          )}
        </div>
        <div className="app-panel rounded-[24px] px-5 py-4 text-right">
          <p className="text-sm text-gray-500">Total active contacts</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {loading ? '...' : totalActive.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  )
}

export function DealRevenueSection({
  loading,
  dealCurrency,
  totalPipeline,
  weightedPipeline,
  winRate,
  wonDealsCount,
  closedDealsCount,
  avgWonDeal,
}: {
  loading: boolean
  dealCurrency: string
  totalPipeline: number
  weightedPipeline: number
  winRate: number | null
  wonDealsCount: number
  closedDealsCount: number
  avgWonDeal: number | null
}): JSX.Element {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
        <DollarSign className="h-4 w-4 text-indigo-600" />
        Deal Revenue
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard
          label="Total pipeline"
          value={loading ? '...' : formatCurrency(totalPipeline, dealCurrency)}
        />
        <MetricCard
          label="Weighted pipeline"
          value={loading ? '...' : formatCurrency(weightedPipeline, dealCurrency)}
          accentClass="text-indigo-700"
          hint="value × probability"
        />
        <MetricCard
          label="Win rate"
          value={loading ? '...' : winRate != null ? `${Math.round(winRate)}%` : '—'}
          accentClass="text-green-700"
          hint={
            closedDealsCount > 0
              ? `${wonDealsCount} won / ${closedDealsCount} closed`
              : 'no closed deals yet'
          }
        />
        <MetricCard
          label="Avg won deal"
          value={
            loading ? '...' : avgWonDeal != null ? formatCurrency(avgWonDeal, dealCurrency) : '—'
          }
        />
      </div>
    </section>
  )
}

function MetricCard({
  label,
  value,
  hint,
  accentClass = 'text-gray-900',
}: {
  label: string
  value: string
  hint?: string
  accentClass?: string
}): JSX.Element {
  return (
    <div className="app-panel rounded-[24px] px-5 py-4">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${accentClass}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-gray-400">{hint}</p> : null}
    </div>
  )
}

export function PipelineValueSection({
  loading,
  dealsCount,
  dealCurrency,
  summaries,
  maxValue,
}: {
  loading: boolean
  dealsCount: number
  dealCurrency: string
  summaries: DealStageSummary[]
  maxValue: number
}): JSX.Element {
  return (
    <section className="app-panel rounded-[28px] p-5">
      <div className="mb-5 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-indigo-600" />
        <h2 className="text-base font-semibold text-gray-900">Pipeline value by stage</h2>
      </div>
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="h-10 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : dealsCount === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">No deals yet.</p>
      ) : (
        <div className="space-y-3">
          {summaries.map(({ stage, count, value }) => {
            const barWidth = `${Math.max((value / maxValue) * 100, value > 0 ? 10 : 0)}%`
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
  )
}

export function ContactFunnelSection({
  loading,
  funnelData,
  funnelMaxCount,
}: {
  loading: boolean
  funnelData: FunnelAnalyticsResponse | null
  funnelMaxCount: number
}): JSX.Element {
  return (
    <section className="app-panel rounded-[28px] p-5">
      <div className="mb-5 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-indigo-600" />
        <h2 className="text-base font-semibold text-gray-900">Contact stage funnel</h2>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="h-12 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : !funnelData || funnelData.stages.length === 0 ? (
        <div className="app-empty-state rounded-none border-0 shadow-none">
          <BarChart3 className="mb-4 h-12 w-12 text-gray-300" />
          <p className="text-sm font-medium text-gray-700">No stage data yet</p>
          <p className="mt-1 text-sm text-gray-400">Active CRM contacts will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {funnelData.stages.map((stage) => {
            const percentOfTotal =
              funnelData.totalActive > 0 ? (stage.count / funnelData.totalActive) * 100 : 0
            const width = `${Math.max((stage.count / funnelMaxCount) * 100, stage.count > 0 ? 12 : 0)}%`

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
  )
}

export function ConversionRatesSection({
  loading,
  funnelData,
}: {
  loading: boolean
  funnelData: FunnelAnalyticsResponse | null
}): JSX.Element {
  return (
    <section className="app-table-shell overflow-hidden">
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
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-12 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : !funnelData || funnelData.conversions.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-gray-500">
          No conversion data available.
        </div>
      ) : (
        <table className="app-table">
          <thead>
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Transition
              </th>
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Rate
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100/80">
            {funnelData.conversions.map((conversion) => (
              <tr
                key={`${conversion.from}-${conversion.to}`}
                className="transition hover:bg-white/65"
              >
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
  )
}

export function SourceBreakdownSection({
  sourceBreakdown,
}: {
  sourceBreakdown?: Array<{ source: string; count: number }>
}): JSX.Element | null {
  if (!sourceBreakdown || sourceBreakdown.length === 0) return null

  const rows = buildSourceBreakdownRows(sourceBreakdown)

  return (
    <section className="app-table-shell overflow-hidden">
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
        {rows.map((row) => (
          <div key={row.source} className="flex items-center gap-4 px-5 py-3">
            <div className="w-32 shrink-0 truncate text-sm font-medium text-gray-700">
              {row.source}
            </div>
            <div className="flex-1">
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-indigo-500"
                  style={{ width: `${row.percent}%` }}
                />
              </div>
            </div>
            <div className="w-16 shrink-0 text-right text-sm text-gray-500">
              {row.count} ({row.percent}%)
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
