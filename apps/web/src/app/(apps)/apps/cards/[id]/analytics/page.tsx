'use client'

import type { JSX } from 'react'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  BarChart2,
  Calendar,
  Eye,
  MessageCircleMore,
  MousePointerClick,
  Users,
  TrendingUp,
  Globe2,
  Smartphone,
  Monitor,
  Tablet,
  RefreshCw,
} from 'lucide-react'
import { getAccessToken } from '@/lib/auth/client'
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
    totalBookingsStarted: number
    totalBookingsCompleted: number
    totalWhatsappClicks: number
    totalLeadCaptureOpens: number
    totalLeadSubmissions: number
    conversionRate: number
  }
  charts: {
    viewsByDay: DayCount[]
    clicksByDay: DayCount[]
    deviceBreakdown: { name: string; value: number }[]
    countryBreakdown: { name: string; value: number }[]
    clicksByLink: { name: string; value: number }[]
    interactionsByAction: { name: string; value: number }[]
    referrers: { name: string; value: number }[]
  }
}

interface ServiceOrderItem {
  id: string
  paymentId: string
  serviceId: string
  serviceName: string
  customerName: string
  customerEmail: string
  amountUsdt: string
  status: 'INTENT_CREATED' | 'VERIFIED' | 'COMPLETED' | 'EXPIRED'
  txHash: string | null
  createdAt: string
  verifiedAt: string | null
  completedAt: string | null
}

interface ProductOrderItem {
  id: string
  paymentId: string
  productId: string
  productName: string
  customerName: string
  customerEmail: string
  amountUsdt: string
  status: 'INTENT_CREATED' | 'VERIFIED' | 'COMPLETED' | 'EXPIRED'
  txHash: string | null
  createdAt: string
  verifiedAt: string | null
  completedAt: string | null
}

interface WhatsappAutomationMessageItem {
  id: string
  senderName: string
  senderEmail: string | null
  message: string
  read: boolean
  createdAt: string
}

const RANGES = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
] as const

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Returns ISO-8601 datetime for N days ago (start-of-day UTC) */
function isoFrom(days: number): string {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

/** Returns ISO-8601 datetime for end-of-today UTC — ensures the full current day is included */
function isoTo(): string {
  const d = new Date()
  d.setUTCHours(23, 59, 59, 999)
  return d.toISOString()
}

function fmtDay(iso: string) {
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

function fmtActionLabel(name: string) {
  return name
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/** Immutable sort helper — never mutates the source array */
function sortedDesc<T extends { value: number }>(arr: T[]): T[] {
  return [...arr].sort((a, b) => b.value - a.value)
}

// ── Sub-components ─────────────────────────────────────────────────────────────

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
    <div className="app-panel flex flex-col gap-3 rounded-[24px] p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-xl', color)}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="text-3xl font-extrabold tracking-tight text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}

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
      <div className="h-1.5 w-full rounded-full bg-gray-100" role="presentation">
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

/** Day-by-day bar chart with hover + keyboard/focus tooltip */
function DayChart({ data, color = '#0ea5e9' }: { data: DayCount[]; color?: string }) {
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null)
  if (!data.length) return <p className="py-4 text-center text-xs text-gray-300">No data</p>

  const max = Math.max(...data.map((d) => d.count), 1)
  const stride = data.length > 20 ? Math.ceil(data.length / 7) : data.length > 10 ? 2 : 1

  return (
    <div className="relative mt-2" role="img" aria-label="Day-by-day bar chart">
      <div className="flex h-28 items-end gap-0.5 sm:gap-1">
        {data.map((d, i) => {
          const pct = (d.count / max) * 100
          const isActive = focusedIdx === i
          return (
            <div
              key={d.date}
              role="button"
              tabIndex={0}
              aria-label={`${fmtDay(d.date)}: ${d.count}`}
              className="group relative flex flex-1 flex-col items-center outline-none"
              onMouseEnter={() => setFocusedIdx(i)}
              onMouseLeave={() => setFocusedIdx(null)}
              onFocus={() => setFocusedIdx(i)}
              onBlur={() => setFocusedIdx(null)}
            >
              {isActive && (
                <div
                  className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap rounded-xl bg-gray-900 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-lg"
                  style={{ pointerEvents: 'none' }}
                  role="tooltip"
                >
                  <div>{fmtDay(d.date)}</div>
                  <div className="text-center" style={{ color }}>
                    {d.count}
                  </div>
                </div>
              )}
              <div
                className="w-full rounded-t-sm transition-all duration-150"
                style={{
                  height: `${Math.max(pct, 2)}%`,
                  background: isActive ? color : `${color}99`,
                  minHeight: 2,
                }}
              />
            </div>
          )
        })}
      </div>
      <div className="mt-1 flex gap-0.5 sm:gap-1" aria-hidden="true">
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
  const [cardInfo, setCardInfo] = useState<{
    name: string
    title: string
    company: string
    handle: string
    avatarUrl: string
    isActive: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [serviceOrders, setServiceOrders] = useState<ServiceOrderItem[]>([])
  const [productOrders, setProductOrders] = useState<ProductOrderItem[]>([])
  const [whatsappAutomationMessages, setWhatsappAutomationMessages] = useState<
    WhatsappAutomationMessageItem[]
  >([])
  const [refreshing, setRefreshing] = useState(false)
  // Ref to cancel in-flight requests when range changes or component unmounts
  const abortRef = useRef<AbortController | null>(null)

  const load = useCallback(
    async (silent = false) => {
      // Cancel any pending request
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      if (!silent) setLoading(true)
      else setRefreshing(true)
      setError(null)
      try {
        const token = await getAccessToken()
        const from = isoFrom(range.days)
        const to = isoTo()
        const [result, cardData, ordersData, productOrdersData, whatsappMessagesData] =
          await Promise.all([
            apiGet<AnalyticsData>(
              `/cards/${id}/analytics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
              token,
              controller.signal,
            ),
            cardInfo
              ? Promise.resolve(null)
              : apiGet<any>(`/cards/${id}`, token, controller.signal).catch(() => null),
            apiGet<{ items: ServiceOrderItem[] }>(
              `/cards/${id}/service-orders`,
              token,
              controller.signal,
            ),
            apiGet<{ items: ProductOrderItem[] }>(
              `/cards/${id}/product-orders`,
              token,
              controller.signal,
            ),
            apiGet<{ items: WhatsappAutomationMessageItem[] }>(
              `/cards/${id}/whatsapp-automation-messages`,
              token,
              controller.signal,
            ),
          ])
        // Only update state if this request wasn't superseded
        if (!controller.signal.aborted) {
          setData(result)
          setServiceOrders(ordersData.items ?? [])
          setProductOrders(productOrdersData.items ?? [])
          setWhatsappAutomationMessages(whatsappMessagesData.items ?? [])
          if (cardData) {
            const fields = cardData.fields || {}
            setCardInfo({
              name: fields.name || fields.fullName || cardData.handle || 'Untitled Card',
              title: fields.title || '',
              company: fields.company || '',
              handle: cardData.handle || id,
              avatarUrl: fields.avatarUrl || '',
              isActive: cardData.isActive ?? false,
            })
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Failed to load analytics')
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    },
    [cardInfo, id, range],
  )

  useEffect(() => {
    void load()
    return () => {
      abortRef.current?.abort()
    }
  }, [load])

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

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader id={id} />
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-2xl border border-red-100 bg-red-50 py-10 text-center"
        >
          <BarChart2 className="h-8 w-8 text-red-300" aria-hidden="true" />
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

  if (!data) {
    return (
      <div className="space-y-4">
        <PageHeader id={id} />
        <div className="app-empty-state">
          <BarChart2 className="h-8 w-8 text-gray-300" aria-hidden="true" />
          <p className="text-sm text-gray-400">No analytics data yet</p>
        </div>
      </div>
    )
  }

  const { summary, charts } = data

  // Sort immutably — never mutate the API response arrays
  const sortedDevices = sortedDesc(charts.deviceBreakdown)
  const sortedLinks = sortedDesc(charts.clicksByLink)
  const sortedActions = sortedDesc(charts.interactionsByAction)

  const maxDevice = Math.max(...sortedDevices.map((d) => d.value), 1)
  const maxCountry = Math.max(...charts.countryBreakdown.map((d) => d.value), 1)
  const maxLink = Math.max(...sortedLinks.map((d) => d.value), 1)
  const maxAction = Math.max(...sortedActions.map((d) => d.value), 1)
  const maxReferrer = Math.max(...charts.referrers.map((d) => d.value), 1)

  const deviceIcon = (name: string) =>
    name === 'mobile' ? Smartphone : name === 'tablet' ? Tablet : Monitor

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="app-panel flex items-center justify-between rounded-[28px] px-5 py-4">
        <PageHeader id={id} />
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={refreshing}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 transition-all hover:border-sky-200 hover:text-sky-500 active:scale-90 disabled:opacity-40"
          title="Refresh"
          aria-label="Refresh analytics"
        >
          <RefreshCw
            className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Selected Card Badge exactly like Cards list */}
      {cardInfo && (
        <div className="app-panel group relative flex items-center gap-4 rounded-[26px] p-4 transition-all duration-200">
          {cardInfo.avatarUrl ? (
            <div
              role="img"
              aria-label={cardInfo.name}
              className="h-[52px] w-[52px] shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm"
              style={{
                backgroundImage: `url(${cardInfo.avatarUrl})`,
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
              }}
            />
          ) : (
            <div
              className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ring-2 ring-white"
              style={{ background: 'linear-gradient(135deg,#38bdf8,#0ea5e9)' }}
              aria-hidden="true"
            >
              {(cardInfo.name || 'C')
                .split(' ')
                .map((n) => n[0] || '')
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-gray-900">{cardInfo.name}</p>
            {(cardInfo.title || cardInfo.company) && (
              <p className="truncate text-xs text-gray-500">
                {[cardInfo.title, cardInfo.company].filter(Boolean).join(' \u00b7 ')}
              </p>
            )}
            <p className="truncate text-[11px] text-gray-300 mt-0.5">dotly.one/{cardInfo.handle}</p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
                cardInfo.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400',
              )}
            >
              {cardInfo.isActive ? 'Live' : 'Draft'}
            </span>

            <a
              href={`https://dotly.one/${cardInfo.handle}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white transition-all active:scale-90 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-500 text-gray-400',
              )}
            >
              <Globe2 className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Range selector */}
      <div
        role="group"
        aria-label="Date range"
        className="app-panel-subtle flex w-fit items-center gap-1 rounded-[20px] p-1.5"
      >
        {RANGES.map((r) => (
          <button
            key={r.label}
            type="button"
            onClick={() => setRange(r)}
            aria-pressed={range.label === r.label}
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
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
        <StatCard
          icon={Calendar}
          label="Bookings"
          value={fmtNum(summary.totalBookingsStarted)}
          sub="Booking CTA opens"
          color="bg-cyan-50 text-cyan-500"
        />
        <StatCard
          icon={MessageCircleMore}
          label="WhatsApp"
          value={fmtNum(summary.totalWhatsappClicks)}
          sub="Chat CTA starts"
          color="bg-emerald-50 text-emerald-500"
        />
        <StatCard
          icon={MousePointerClick}
          label="Lead Opens"
          value={fmtNum(summary.totalLeadCaptureOpens)}
          sub="Lead form opens"
          color="bg-violet-50 text-violet-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Lead Submits"
          value={fmtNum(summary.totalLeadSubmissions)}
          sub="Completed lead forms"
          color="bg-fuchsia-50 text-fuchsia-500"
        />
      </div>

      {/* Views over time */}
      <div className="app-panel rounded-[28px] p-5">
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

      <div className="app-panel rounded-[28px] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">WhatsApp automation</h3>
            <p className="text-xs text-gray-400">
              Recent guided WhatsApp handoffs recorded for this card
            </p>
          </div>
          <span className="text-xs font-semibold text-gray-400">
            {whatsappAutomationMessages.length} total
          </span>
        </div>
        {whatsappAutomationMessages.length === 0 ? (
          <p className="text-sm text-gray-400">
            No automation handoffs yet. Enable WhatsApp automation in the card editor to guide chat
            visitors.
          </p>
        ) : (
          <div className="space-y-3">
            {whatsappAutomationMessages.map((item) => (
              <div key={item.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{item.senderName}</p>
                    <p className="mt-1 text-sm text-gray-600">
                      {item.senderEmail || 'No email provided'}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-gray-500">
                      {item.message.replace('[WhatsApp automation] ', '')}
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-3 py-1 text-[10px] font-semibold',
                      item.read ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
                    )}
                  >
                    {item.read ? 'Read' : 'Unread'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clicks over time */}
      {charts.clicksByDay.some((d) => d.count > 0) && (
        <div className="app-panel rounded-[28px] p-5">
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
        <div className="app-panel rounded-[28px] p-5">
          <h3 className="mb-4 text-sm font-bold text-gray-900">Devices</h3>
          {sortedDevices.length === 0 ? (
            <p className="text-xs text-gray-300">No data yet</p>
          ) : (
            <div className="space-y-3">
              {sortedDevices.map((item) => {
                const DevIcon = deviceIcon(item.name)
                return (
                  <div key={item.name} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
                      <DevIcon className="h-3.5 w-3.5" aria-hidden="true" />
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
        <div className="app-panel rounded-[28px] p-5">
          <div className="mb-4 flex items-center gap-2">
            <Globe2 className="h-4 w-4 text-gray-300" aria-hidden="true" />
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
        {sortedLinks.length > 0 && (
          <div className="app-panel rounded-[28px] p-5">
            <h3 className="mb-4 text-sm font-bold text-gray-900">Links clicked</h3>
            <div className="space-y-3">
              {sortedLinks.slice(0, 8).map((item) => (
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

        {/* Interaction actions */}
        {sortedActions.length > 0 && (
          <div className="app-panel rounded-[28px] p-5">
            <h3 className="mb-4 text-sm font-bold text-gray-900">Interaction actions</h3>
            <div className="space-y-3">
              {sortedActions.slice(0, 10).map((item) => (
                <BarRow
                  key={item.name}
                  label={fmtActionLabel(item.name)}
                  value={item.value}
                  max={maxAction}
                  color="#10b981"
                />
              ))}
            </div>
          </div>
        )}

        {/* Referrers */}
        {charts.referrers.length > 0 && (
          <div className="app-panel rounded-[28px] p-5">
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

      <div className="app-panel rounded-[28px] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Service orders</h3>
            <p className="text-xs text-gray-400">
              Recent fixed-price service payments from this card
            </p>
          </div>
          <span className="text-xs font-semibold text-gray-400">{serviceOrders.length} total</span>
        </div>
        {serviceOrders.length === 0 ? (
          <p className="text-sm text-gray-400">
            No service orders yet. Publish a fixed-price offer on this card to start collecting
            payments.
          </p>
        ) : (
          <div className="space-y-3">
            {serviceOrders.map((order) => (
              <div key={order.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{order.serviceName}</p>
                    <p className="mt-1 text-sm text-gray-600">
                      {order.customerName} · {order.customerEmail}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(order.createdAt).toLocaleString()} · {order.amountUsdt} USDT
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-[10px] font-semibold text-white">
                    {order.status.replace('_', ' ')}
                  </span>
                </div>
                {order.txHash && (
                  <p className="mt-2 break-all font-mono text-[11px] text-gray-400">
                    {order.txHash}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="app-panel rounded-[28px] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Product orders</h3>
            <p className="text-xs text-gray-400">Recent store purchases from this card</p>
          </div>
          <span className="text-xs font-semibold text-gray-400">{productOrders.length} total</span>
        </div>
        {productOrders.length === 0 ? (
          <p className="text-sm text-gray-400">
            No product orders yet. Publish store items to start collecting storefront payments.
          </p>
        ) : (
          <div className="space-y-3">
            {productOrders.map((order) => (
              <div key={order.id} className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{order.productName}</p>
                    <p className="mt-1 text-sm text-gray-600">
                      {order.customerName} · {order.customerEmail}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {new Date(order.createdAt).toLocaleString()} · {order.amountUsdt} USDT
                    </p>
                  </div>
                  <span className="rounded-full bg-fuchsia-600 px-3 py-1 text-[10px] font-semibold text-white">
                    {order.status.replace('_', ' ')}
                  </span>
                </div>
                {order.txHash && (
                  <p className="mt-2 break-all font-mono text-[11px] text-gray-400">
                    {order.txHash}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Empty state — no views at all */}
      {summary.totalViews === 0 && (
        <div className="app-empty-state">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50">
            <BarChart2 className="h-6 w-6 text-gray-300" aria-hidden="true" />
          </span>
          <h3 className="text-sm font-bold text-gray-700">No views yet</h3>
          <p className="max-w-[240px] text-xs text-gray-400">
            Share your card link to start seeing analytics here.
          </p>
          <Link
            href={`/apps/cards/${id}/edit`}
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
        href={`/apps/cards/${id}/edit`}
        className="app-panel-subtle flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-gray-600 transition-colors hover:bg-white"
        aria-label="Back to editor"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      </Link>
      <div>
        <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
        <p className="text-xs text-gray-400">Card performance overview</p>
      </div>
    </div>
  )
}
