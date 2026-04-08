'use client'

import type { JSX } from 'react'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  BarChart2,
  Eye,
  MousePointerClick,
  Users,
  TrendingUp,
  Globe2,
  Smartphone,
  Monitor,
  RefreshCw,
} from 'lucide-react'
import { getAccessToken } from '@/lib/supabase/client'
import { apiGet } from '@/lib/api'
import { cn } from '@/lib/cn'

// ── Types ──────────────────────────────────────────────────────────────────────

interface DayCount {
  date: string
  count: number
}

interface AnalyticsData {
  summary: {
    totalViews: number
    totalClicks: number
    totalLeads: number
    uniqueVisitors: number
    conversionRate: string
  }
  charts: {
    viewsByDay: DayCount[]
    clicksByDay: DayCount[]
    deviceBreakdown: { name: string; value: number }[]
    countryBreakdown: { name: string; value: number }[]
    clicksByLink: { name: string; value: number }[]
    referrers: { name: string; value: number }[]
  }
}

const RANGES = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
] as const

// ── Helpers ────────────────────────────────────────────────────────────────────

function isoFrom(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]!
}

function isoTo() {
  return new Date().toISOString().split('T')[0]!
}

function fmtDay(iso: string) {
  // e.g. "2025-04-02" → "Apr 2"
  const [, m, d] = iso.split('-')
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  return `${months[Number(m) - 1]} ${Number(d)}`
}

function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

// ── Sub-components ─────────────────────────────────────────────────────────────

/** Animated stat card */
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  sub?: string
  color: string
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-xl', color)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="text-3xl font-extrabold tracking-tight text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

/** Minimal SVG sparkline */
function Sparkline({
  data,
  color = '#0ea5e9',
  height = 56,
}: {
  data: DayCount[]
  color?: string
  height?: number
}) {
  if (!data.length) return null
  const max = Math.max(...data.map((d) => d.count), 1)
  const w = 100
  const h = height
  const pts = data.map((d, i) => {
    const x = data.length === 1 ? w / 2 : (i / (data.length - 1)) * w
    const y = h - (d.count / max) * (h - 4) - 2
    return `${x},${y}`
  })
  const polyline = pts.join(' ')

  // Area path
  const firstPt = pts[0]!.split(',')
  const lastPt = pts[pts.length - 1]!.split(',')
  const area = `M${firstPt[0]},${h} L${polyline} L${lastPt[0]},${h} Z`

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#grad-${color.replace('#', '')})`} />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Labelled bar chart row */
function BarRow({
  label,
  value,
  max,
  color = '#0ea5e9',
}: {
  label: string
  value: number
  max: number
  color?: string
}) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="truncate max-w-[60%] font-medium text-gray-700">{label}</span>
        <span className="shrink-0 font-semibold text-gray-500">{fmtNum(value)}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100">
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

/** Day-by-day chart with hover tooltip */
function DayChart({ data, color = '#0ea5e9' }: { data: DayCount[]; color?: string }) {
  const [hovered, setHovered] = useState<number | null>(null)
  if (!data.length) return <p className="py-4 text-center text-xs text-gray-300">No data</p>

  const max = Math.max(...data.map((d) => d.count), 1)

  // Only show every Nth label to avoid crowding
  const stride = data.length > 20 ? Math.ceil(data.length / 7) : data.length > 10 ? 2 : 1

  return (
    <div className="relative mt-2">
      {/* Bars */}
      <div className="flex h-28 items-end gap-0.5 sm:gap-1">
        {data.map((d, i) => {
          const pct = (d.count / max) * 100
          const isHovered = hovered === i
          return (
            <div
              key={d.date}
              className="group relative flex flex-1 flex-col items-center"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Tooltip */}
              {isHovered && (
                <div
                  className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap rounded-xl bg-gray-900 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg"
                  style={{ pointerEvents: 'none' }}
                >
                  <div>{fmtDay(d.date)}</div>
                  <div className="text-center" style={{ color }}>
                    {d.count}
                  </div>
                </div>
              )}
              {/* Bar */}
              <div
                className="w-full rounded-t-sm transition-all duration-150"
                style={{
                  height: `${Math.max(pct, 2)}%`,
                  background: isHovered ? color : `${color}99`,
                  minHeight: 2,
                }}
              />
            </div>
          )
        })}
      </div>

      {/* X-axis labels */}
      <div className="mt-1 flex gap-0.5 sm:gap-1">
        {data.map((d, i) => (
          <div key={d.date} className="flex-1 text-center">
            {i % stride === 0 && (
              <span className="text-[9px] text-gray-300">{fmtDay(d.date).split(' ')[0]}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function CardAnalyticsPage(): JSX.Element {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [range, setRange] = useState<(typeof RANGES)[number]>(RANGES[1]!)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      else setRefreshing(true)
      setError(null)
      try {
        const token = await getAccessToken()
        const from = isoFrom(range.days)
        const to = isoTo()
        const result = await apiGet<AnalyticsData>(
          `/cards/${id}/analytics?from=${from}&to=${to}`,
          token,
        )
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [id, range],
  )

  useEffect(() => {
    void load()
  }, [load])

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4">
        <PageHeader id={id} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
        <div className="h-48 animate-pulse rounded-2xl bg-gray-100" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="h-52 animate-pulse rounded-2xl bg-gray-100" />
          <div className="h-52 animate-pulse rounded-2xl bg-gray-100" />
        </div>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader id={id} />
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-100 bg-red-50 py-10 text-center">
          <BarChart2 className="h-8 w-8 text-red-300" />
          <p className="text-sm font-medium text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 active:scale-95"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!data) return <></>

  const { summary, charts } = data
  const maxDevice = Math.max(...charts.deviceBreakdown.map((d) => d.value), 1)
  const maxCountry = Math.max(...charts.countryBreakdown.map((d) => d.value), 1)
  const maxLink = Math.max(...charts.clicksByLink.map((d) => d.value), 1)
  const maxReferrer = Math.max(...charts.referrers.map((d) => d.value), 1)

  const deviceIcon = (name: string) => (name === 'mobile' ? Smartphone : Monitor)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <PageHeader id={id} />
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={refreshing}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 transition-all hover:border-sky-200 hover:text-sky-500 active:scale-90 disabled:opacity-40"
          title="Refresh"
          aria-label="Refresh analytics"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
        </button>
      </div>

      {/* Range selector */}
      <div className="flex items-center gap-1 rounded-2xl border border-gray-100 bg-white p-1 shadow-sm w-fit">
        {RANGES.map((r) => (
          <button
            key={r.label}
            type="button"
            onClick={() => setRange(r)}
            className={cn(
              'rounded-xl px-4 py-1.5 text-xs font-semibold transition-all',
              range.label === r.label
                ? 'bg-sky-500 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={Eye}
          label="Views"
          value={fmtNum(summary.totalViews)}
          sub={`${fmtNum(summary.uniqueVisitors)} unique`}
          color="bg-sky-50 text-sky-500"
        />
        <StatCard
          icon={MousePointerClick}
          label="Link Clicks"
          value={fmtNum(summary.totalClicks)}
          color="bg-purple-50 text-purple-500"
        />
        <StatCard
          icon={Users}
          label="Leads"
          value={fmtNum(summary.totalLeads)}
          color="bg-green-50 text-green-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Conversion"
          value={`${summary.conversionRate}%`}
          sub="views → leads"
          color="bg-orange-50 text-orange-500"
        />
      </div>

      {/* Views over time */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Views over time</h3>
            <p className="text-xs text-gray-400">Daily card views · last {range.days} days</p>
          </div>
          <span className="text-xs font-semibold text-gray-300">
            {fmtNum(summary.totalViews)} total
          </span>
        </div>
        <DayChart data={charts.viewsByDay} color="#0ea5e9" />
      </div>

      {/* Clicks over time */}
      {charts.clicksByDay.some((d) => d.count > 0) && (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Link clicks over time</h3>
              <p className="text-xs text-gray-400">Daily link clicks · last {range.days} days</p>
            </div>
            <span className="text-xs font-semibold text-gray-300">
              {fmtNum(summary.totalClicks)} total
            </span>
          </div>
          <DayChart data={charts.clicksByDay} color="#a855f7" />
        </div>
      )}

      {/* 2-column breakdowns */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Device breakdown */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-gray-900">Devices</h3>
          {charts.deviceBreakdown.length === 0 ? (
            <p className="text-xs text-gray-300">No data yet</p>
          ) : (
            <div className="space-y-3">
              {charts.deviceBreakdown
                .sort((a, b) => b.value - a.value)
                .map((item) => {
                  const DevIcon = deviceIcon(item.name)
                  return (
                    <div key={item.name} className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
                        <DevIcon className="h-3.5 w-3.5" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <BarRow
                          label={item.name.charAt(0).toUpperCase() + item.name.slice(1)}
                          value={item.value}
                          max={maxDevice}
                          color="#0ea5e9"
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        {/* Top countries */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-gray-300" />
            <h3 className="text-sm font-bold text-gray-900">Countries</h3>
          </div>
          {charts.countryBreakdown.length === 0 ? (
            <p className="text-xs text-gray-300">No data yet</p>
          ) : (
            <div className="space-y-3">
              {charts.countryBreakdown.slice(0, 8).map((item) => (
                <BarRow
                  key={item.name}
                  label={item.name === 'unknown' ? 'Unknown' : item.name}
                  value={item.value}
                  max={maxCountry}
                  color="#0ea5e9"
                />
              ))}
            </div>
          )}
        </div>

        {/* Top links clicked */}
        {charts.clicksByLink.length > 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-gray-900">Links clicked</h3>
            <div className="space-y-3">
              {charts.clicksByLink
                .sort((a, b) => b.value - a.value)
                .slice(0, 8)
                .map((item) => (
                  <BarRow
                    key={item.name}
                    label={item.name}
                    value={item.value}
                    max={maxLink}
                    color="#a855f7"
                  />
                ))}
            </div>
          </div>
        )}

        {/* Referrers */}
        {charts.referrers.length > 0 && (
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-gray-900">Referrers</h3>
            <div className="space-y-3">
              {charts.referrers.slice(0, 8).map((item) => (
                <BarRow
                  key={item.name}
                  label={
                    item.name === 'direct'
                      ? 'Direct'
                      : (item.name.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] ?? item.name)
                  }
                  value={item.value}
                  max={maxReferrer}
                  color="#f59e0b"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Empty state — no views at all */}
      {summary.totalViews === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50">
            <BarChart2 className="h-6 w-6 text-gray-300" />
          </span>
          <h3 className="text-sm font-bold text-gray-700">No views yet</h3>
          <p className="max-w-[240px] text-xs text-gray-400">
            Share your card link to start seeing analytics here.
          </p>
          <Link
            href={`/cards/${id}/edit`}
            className="mt-1 rounded-xl bg-sky-500 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-600 active:scale-95 transition-all"
          >
            Go to editor
          </Link>
        </div>
      )}
    </div>
  )
}

// ── PageHeader component ───────────────────────────────────────────────────────

function PageHeader({ id }: { id: string }) {
  return (
    <div className="flex items-center gap-3">
      <Link
        href={`/cards/${id}/edit`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
        aria-label="Back to editor"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <div>
        <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
        <p className="text-xs text-gray-400">Card performance overview</p>
      </div>
    </div>
  )
}
