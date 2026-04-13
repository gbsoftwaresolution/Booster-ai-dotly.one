'use client'

import type { JSX } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  Briefcase,
  Calendar,
  CheckSquare,
  ChevronRight,
  CreditCard,
  Eye,
  Hand,
  MousePointerClick,
  Pencil,
  Plus,
  QrCode,
  TrendingUp,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { AppLauncherGrid } from '@/components/shell/AppLauncherGrid'
import { dueDateLabel, formatCurrency, STAGE_COLORS, timeAgo } from './helpers'
import type {
  AppointmentType,
  CardSummary,
  ContactRow,
  CrmFunnel,
  Deal,
  LeadSubmission,
  TaskItem,
} from './types'

export function StatCard({
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
      className={`group relative flex flex-col gap-4 rounded-[32px] p-5 transition-all duration-500 hover:-translate-y-1 border border-gray-950/[0.04] bg-white/70 backdrop-blur-xl shadow-[0_4px_24px_-12px_rgba(15,23,42,0.06)] hover:shadow-[0_24px_52px_-20px_rgba(15,23,42,0.12)] active:scale-[0.98] overflow-hidden`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-3">
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-[20px] transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-inner ring-1 ring-inset ring-gray-950/[0.04]', bg)}>
          <Icon className={cn('h-5 w-5', color)} aria-hidden="true" />
        </div>
        <span className="rounded-full bg-gray-950/[0.03] px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-gray-500 group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors shadow-sm">
          Live
        </span>
      </div>
      <div className="relative">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400 group-hover:text-gray-500 transition-colors">{label}</p>
        <p className="mt-1.5 text-3xl font-black tabular-nums tracking-tighter text-gray-950">{value}</p>
        {hint && <p className="mt-2 text-[12px] font-medium text-gray-400">{hint}</p>}
      </div>
    </Link>
  )
}

export function SectionHeader({
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

export function SkeletonList({ rows = 3 }: { rows?: number }): JSX.Element {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex h-[72px] items-center justify-between rounded-[24px] bg-white ring-1 ring-gray-950/[0.03] px-4 shadow-[0_4px_12px_-8px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-2">
            <div className="h-3.5 w-32 animate-pulse rounded-full bg-gray-200/60" />
            <div className="h-2.5 w-24 animate-pulse rounded-full bg-gray-100" />
          </div>
          <div className="h-5 w-16 animate-pulse rounded-full bg-gray-100" />
        </div>
      ))}
    </div>
  )
}

export function CardAnalyticsRow({ card }: { card: CardSummary }): JSX.Element {
  const name = (card.fields['name'] as string | undefined) ?? card.handle
  const title = (card.fields['title'] as string | undefined) ?? ''
  const initials = name
    .split(' ')
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <Link
      href={`/apps/cards/${card.id}/edit`}
      className="app-panel group flex items-center gap-3 rounded-[24px] p-4 transition-all duration-300 ring-1 ring-gray-950/[0.04] bg-white hover:-translate-y-0.5 hover:shadow-[0_24px_52px_-20px_rgba(15,23,42,0.12)] hover:ring-brand-500/20 active:scale-[0.98] active:shadow-none"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-sm font-bold text-brand-600 ring-1 ring-inset ring-brand-500/20 transition-transform duration-300 group-hover:scale-105">
        {initials || '?'}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
        {title && <p className="truncate text-xs text-gray-400">{title}</p>}
        <p className="truncate text-[11px] text-gray-300">dotly.one/{card.handle}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 text-[11px] text-gray-400">
        <span>{card.isActive ? 'Active card' : 'Draft card'}</span>
        <span>Open to edit</span>
      </div>
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

export function DashboardHero({
  activeBookingTypes,
  activeCards,
  focusMessage,
  greeting,
  loading,
  onRetry,
  pipelineValue,
  sectionErrors,
  totalLeads,
  userName,
}: {
  activeBookingTypes: number
  activeCards: number
  focusMessage: string
  greeting: string
  loading: boolean
  onRetry?: () => void
  pipelineValue: number
  sectionErrors: string[]
  totalLeads: number
  userName: string
}): JSX.Element {
  const summaryStats = [
    {
      label: 'Live Cards',
      value: loading
        ? '—'
        : sectionErrors.includes('dashboard summary')
          ? 'Unavailable'
          : activeCards,
      note: 'Ready to share',
      accent: 'from-sky-500 via-cyan-400 to-blue-500',
      badge: 'Cards',
    },
    {
      label: 'Leads Captured',
      value: loading
        ? '—'
        : sectionErrors.includes('dashboard summary')
          ? 'Unavailable'
          : totalLeads,
      note: 'Inbound momentum',
      accent: 'from-emerald-500 via-lime-400 to-teal-500',
      badge: 'CRM',
    },
    {
      label: 'Pipeline Value',
      value:
        loading ||
        sectionErrors.includes('deals') ||
        sectionErrors.includes('dashboard summary')
          ? '—'
          : formatCurrency(pipelineValue),
      note: 'Revenue in play',
      accent: 'from-violet-500 via-fuchsia-400 to-pink-500',
      badge: 'Deals',
    },
    {
      label: 'Active Booking Types',
      value: loading || sectionErrors.includes('scheduling') ? '—' : activeBookingTypes,
      note: 'Calendar live',
      accent: 'from-amber-500 via-orange-400 to-rose-500',
      badge: 'Booking',
    },
  ]

  const glanceItems = [
    {
      label: 'Revenue pipeline',
      value:
        loading ||
        sectionErrors.includes('deals') ||
        sectionErrors.includes('dashboard summary')
          ? 'Unavailable'
          : formatCurrency(pipelineValue),
      detail: sectionErrors.includes('deals')
        ? 'Pipeline data is temporarily unavailable'
        : 'Revenue opportunities are active',
      icon: Briefcase,
      tone: 'bg-green-50 text-green-600',
    },
    {
      label: 'Task pressure',
      value: loading ? '—' : 'Live',
      detail: 'Task attention and follow-up status',
      icon: CheckSquare,
      tone: 'bg-orange-50 text-orange-600',
    },
    {
      label: 'CRM activity',
      value: loading || sectionErrors.includes('dashboard summary') ? 'Unavailable' : 'Live',
      detail: 'CRM activity and engagement signals',
      icon: Users,
      tone: 'bg-purple-50 text-purple-600',
    },
  ]

  return (
    <div className="relative overflow-hidden rounded-[34px] px-5 py-5 sm:px-6 sm:py-6 shadow-[0_24px_52px_-20px_rgba(15,23,42,0.12)] ring-1 ring-gray-950/[0.04] bg-white transition-all">
      {/* High-end unified mesh background effect */}
      <div 
        className="absolute inset-0 opacity-[0.65] saturate-[1.1] " 
        style={{
          background: `
            radial-gradient(90% 90% at 10% 10%, rgba(56,189,248,0.12) 0%, transparent 100%),
            radial-gradient(100% 100% at 85% 20%, rgba(168,85,247,0.10) 0%, transparent 100%),
            radial-gradient(120% 120% at 50% 110%, rgba(16,185,129,0.08) 0%, transparent 100%)
          `
        }} 
      />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] mix-blend-overlay"></div>
      
      <div className="relative space-y-6 lg:hidden">
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-gray-950/[0.04] bg-white/60 backdrop-blur-md px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-brand-600 shadow-sm">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75"></span>
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-500"></span>
                </span>
                {greeting}
              </div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black tracking-tight text-gray-950">{userName}</h1>
                <span className="flex h-8 w-8 items-center justify-center rounded-[14px] bg-gradient-to-br from-brand-100 to-sky-50 text-brand-600 shadow-inner">
                  <Hand className="h-4 w-4" />
                </span>
              </div>
              <p className="max-w-[280px] text-[13px] leading-relaxed text-gray-500 font-medium">
                Your business pulse at a glance.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {summaryStats.map(({ label, value, note, accent, badge }) => (
              <div
                key={label}
                className="group rounded-[24px] border border-gray-950/[0.04] bg-white/70 backdrop-blur-md p-4 transition-all duration-300 hover:bg-white shadow-[0_4px_24px_-12px_rgba(15,23,42,0.1)] hover:shadow-[0_12px_32px_-12px_rgba(15,23,42,0.15)] hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className={cn('h-1.5 w-8 rounded-full bg-gradient-to-r', accent)} />
                  <span className="rounded-md bg-gray-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-gray-500">
                    {badge}
                  </span>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
                  {label}
                </p>
                <p className="mt-0.5 text-2xl font-black tracking-tight text-gray-950">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3">
            {glanceItems.map(({ label, value, detail, icon: Icon, tone }) => (
              <div
                key={label}
                className="group flex items-center gap-4 rounded-[26px] border border-gray-950/[0.04] bg-white/70 backdrop-blur-md px-5 py-4 transition-all duration-300 hover:bg-white shadow-[0_4px_24px_-12px_rgba(15,23,42,0.1)] hover:shadow-[0_12px_32px_-12px_rgba(15,23,42,0.15)] hover:-translate-y-0.5"
              >
                <span
                  className={cn(
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] transition-transform duration-300 group-hover:scale-110 shadow-inner',
                    tone,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1 transition-transform duration-300 group-hover:translate-x-1">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 group-hover:text-gray-500 transition-colors">
                    {label}
                  </p>
                  <p className="truncate text-[13px] font-medium text-gray-500 mt-0.5">{detail}</p>
                </div>
                <span className="shrink-0 rounded-full bg-gray-950 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-white shadow-[0_4px_12px_-4px_rgba(15,23,42,0.4)]">
                  {value}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/apps/cards/create"
              className="group inline-flex items-center justify-center gap-2 rounded-[20px] bg-gray-950 px-5 py-4 text-[14px] font-bold text-white shadow-[0_12px_24px_-8px_rgba(15,23,42,0.4)] transition-all duration-300 hover:shadow-[0_24px_48px_-12px_rgba(15,23,42,0.5)] hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110" />
              Create Card
            </Link>
            <Link
              href="/apps/cards/analytics"
              className="group inline-flex items-center justify-center gap-2 rounded-[20px] border border-gray-950/[0.06] bg-white/70 backdrop-blur-md px-5 py-4 text-[14px] font-bold text-gray-700 shadow-sm transition-all duration-300 hover:bg-white hover:shadow-[0_12px_32px_-12px_rgba(15,23,42,0.1)] hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <TrendingUp className="h-4 w-4 text-brand-500 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:scale-110" />
              View Analytics
            </Link>
          </div>

          <div className="inline-flex max-w-full items-center gap-2.5 rounded-full border border-gray-950/[0.04] bg-white/70 backdrop-blur-md px-3.5 py-2.5 text-[12px] font-semibold text-gray-700 shadow-[0_4px_12px_-4px_rgba(15,23,42,0.06)] hover:bg-white transition-colors cursor-default">
            <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-sky-50 ring-1 ring-inset ring-brand-500/10">
              <span className="absolute -inset-[3px] animate-pulse rounded-full border border-brand-500/20"></span>
              <AlertCircle className="h-3.5 w-3.5 text-brand-600" />
            </div>
            <span className="truncate pr-2 tracking-tight">Focus: {focusMessage}</span>
          </div>
        </div>
      </div>

      <div className="relative hidden lg:grid xl:grid-cols-[1fr_1fr] lg:gap-12 xl:items-center">
        <div className="xl:pr-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-950/[0.04] bg-white/70 backdrop-blur-md px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.24em] text-brand-600 shadow-sm transition-colors hover:bg-white cursor-default">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75"></span>
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-500"></span>
            </span>
            {greeting}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <h1 className="bg-gradient-to-br from-gray-950 to-gray-700 bg-clip-text text-transparent text-4xl font-black tracking-tighter sm:text-[3rem] leading-[1.1]">
              {userName}
            </h1>
            <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-gradient-to-br from-brand-100 to-sky-50 text-brand-600 shadow-[inset_0_2px_4px_rgba(255,255,255,0.7)] ring-1 ring-inset ring-brand-500/10 hover:scale-110 transition-transform duration-300">
              <Hand className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-4 max-w-lg text-[15px] font-medium leading-[1.7] text-gray-500">
            Welcome to your command center. Here&apos;s the live pulse of your operations today, highlighting momentum and areas that need attention.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-gray-400">
            <span className="rounded-full border border-gray-950/[0.04] bg-white/70 backdrop-blur-md px-4 py-2 opacity-80 shadow-[0_4px_24px_-12px_rgba(15,23,42,0.1)] hover:opacity-100 transition-opacity cursor-default">
              Live Workspace Pulse
            </span>
            <span className="text-gray-300">•</span>
            <span className="text-brand-500 opacity-80 hover:opacity-100 transition-opacity cursor-default">
              Revenue / CRM / Booking
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {summaryStats.map(({ label, value, note, accent, badge }) => (
            <div
              key={label}
              className="group relative flex flex-col justify-between overflow-hidden rounded-[30px] border border-gray-950/[0.04] bg-white/70 backdrop-blur-md p-6 transition-all duration-500 hover:bg-white hover:-translate-y-1 hover:shadow-[0_24px_52px_-20px_rgba(15,23,42,0.12)]"
            >
              <div className={cn('absolute inset-x-0 -top-px h-[2px] w-1/2 opacity-0 bg-gradient-to-r transition-all duration-500 group-hover:w-full group-hover:opacity-100', accent)} />
              
              <div>
                <div className="flex items-start justify-between gap-2 mb-4">
                  <span className="rounded-full bg-gray-50/80 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-gray-400 group-hover:bg-gray-100 group-hover:text-gray-600 transition-colors">
                    {badge}
                  </span>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400 group-hover:text-gray-500 transition-colors h-8">
                  {label}
                </p>
                <p className="mt-2 text-4xl font-black tabular-nums tracking-tighter text-gray-950">{value}</p>
                <p className="mt-2 text-[12px] font-medium text-gray-400">{note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative mt-8 hidden lg:flex items-center justify-between border-t border-gray-950/[0.04] pt-8">
        <div className="inline-flex max-w-full items-center gap-2.5 rounded-full border border-gray-950/[0.04] bg-white/70 backdrop-blur-md px-3.5 py-2 text-[12px] font-semibold text-gray-700 shadow-[0_4px_12px_-4px_rgba(15,23,42,0.06)] hover:bg-white transition-colors cursor-default">
          <div className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-sky-50 ring-1 ring-inset ring-brand-500/10">
            <span className="absolute -inset-[3px] animate-pulse rounded-full border border-brand-500/20"></span>
            <AlertCircle className="h-3.5 w-3.5 text-brand-600" />
          </div>
          <span className="truncate pr-2 tracking-tight">Focus: {focusMessage}</span>
        </div>

        <div className="flex flex-row gap-4">
          <Link
            href="/apps/cards/analytics"
            className="group inline-flex items-center justify-center gap-2.5 rounded-[22px] border border-gray-950/[0.06] bg-white/70 backdrop-blur-md px-6 py-4 text-[14px] font-bold text-gray-700 shadow-[0_4px_12px_-4px_rgba(15,23,42,0.06)] transition-all duration-300 hover:bg-white hover:shadow-[0_12px_32px_-12px_rgba(15,23,42,0.1)] hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <TrendingUp className="h-4 w-4 text-brand-500 transition-transform duration-300 group-hover:-translate-y-0.5" />
            View Analytics
          </Link>
          <Link
            href="/apps/cards/create"
            className="group inline-flex items-center justify-center gap-2.5 rounded-[22px] bg-gray-950 px-7 py-4 text-[14px] font-bold text-white shadow-[0_12px_24px_-8px_rgba(15,23,42,0.4)] transition-all duration-300 hover:shadow-[0_24px_48px_-12px_rgba(15,23,42,0.5)] hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
            Create Card
          </Link>
        </div>
      </div>
    </div>
  )
}

export function DashboardContent({
  activeCards,
  appointmentTypes,
  cards,
  contacts,
  funnel,
  funnelMax,
  leads,
  loading,
  openDeals,
  overdueTasksCount,
  pipelineValue,
  sectionErrors,
  tasks,
  totalClicks,
  totalLeads,
  totalViews,
}: {
  activeCards: number
  appointmentTypes: AppointmentType[]
  cards: CardSummary[]
  contacts: ContactRow[]
  funnel: CrmFunnel | null
  funnelMax: number
  leads: LeadSubmission[]
  loading: boolean
  openDeals: Deal[]
  overdueTasksCount: number
  pipelineValue: number
  sectionErrors: string[]
  tasks: TaskItem[]
  totalClicks: number
  totalLeads: number
  totalViews: number
}): JSX.Element {
  return (
    <>
      <AppLauncherGrid />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Card Views"
          value={loading ? '—' : totalViews}
          icon={Eye}
          color="text-blue-600"
          bg="bg-blue-50"
          hint={
            loading
              ? 'Loading performance'
              : `${activeCards} live card${activeCards === 1 ? '' : 's'}`
          }
          href="/apps/cards/analytics"
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
          color={overdueTasksCount > 0 ? 'text-red-600' : 'text-orange-600'}
          bg={overdueTasksCount > 0 ? 'bg-red-50' : 'bg-orange-50'}
          hint={
            loading
              ? 'Loading tasks'
              : overdueTasksCount > 0
                ? `${overdueTasksCount} overdue`
                : 'Everything on track'
          }
          href="/tasks"
        />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <div>
            <SectionHeader title="Recent Leads" href="/leads" />
            {loading ? (
              <SkeletonList rows={3} />
            ) : sectionErrors.includes('lead submissions') ? (
              <div className="flex flex-col items-center justify-center rounded-[32px] border border-amber-200/60 bg-amber-50/50 py-10 text-center shadow-inner">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[20px] bg-amber-100/50 ring-1 ring-amber-200/50">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                </div>
                <p className="text-[13px] font-semibold text-amber-900">Leads unavailable</p>
                <p className="mt-1 text-[12px] font-medium text-amber-700/80">Experiencing temporary delays.</p>
              </div>
            ) : leads.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-[32px] border border-gray-950/[0.04] bg-gray-50/50 py-10 text-center shadow-inner">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[20px] bg-gray-100/80 ring-1 ring-gray-950/[0.04]">
                  <TrendingUp className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-[13px] font-semibold text-gray-900">No leads captured</p>
                <p className="mt-1 text-[12px] font-medium text-gray-500">Wait for visitors to submit info.</p>
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
                      className="group app-panel-subtle flex items-center justify-between rounded-[24px] px-4 py-3 bg-white ring-1 ring-gray-950/[0.04] transition-all duration-300 hover:bg-gray-50/[0.4] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-500/5 hover:ring-brand-500/20 active:scale-[0.98]"
                    >
                      <div className="min-w-0 transition-transform group-hover:translate-x-1 duration-300">
                        <p className="truncate text-sm font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">{name}</p>
                        {email && <p className="truncate text-xs text-gray-400">{email}</p>}
                      </div>
                      <span className="ml-3 shrink-0 text-xs font-medium text-gray-400 group-hover:text-brand-400 transition-colors flex items-center gap-1">
                        {timeAgo(lead.createdAt)}
                        <ChevronRight className="h-3 w-3 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
          <div>
            <SectionHeader title="Recent Contacts" href="/contacts" />
            {loading ? (
              <SkeletonList rows={3} />
            ) : sectionErrors.includes('contacts') ? (
              <div className="flex flex-col items-center justify-center rounded-[32px] border border-amber-200/60 bg-amber-50/50 py-10 text-center shadow-inner">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[20px] bg-amber-100/50 ring-1 ring-amber-200/50">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                </div>
                <p className="text-[13px] font-semibold text-amber-900">Contacts unavailable</p>
                <p className="mt-1 text-[12px] font-medium text-amber-700/80">Experiencing temporary delays.</p>
              </div>
            ) : contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-[32px] border border-gray-950/[0.04] bg-gray-50/50 py-10 text-center shadow-inner">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[20px] bg-gray-100/80 ring-1 ring-gray-950/[0.04]">
                  <Users className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-[13px] font-semibold text-gray-900">No contacts yet</p>
                <p className="mt-2 text-[12px] font-medium text-gray-500">
                  <Link href="/contacts" className="text-brand-500 hover:text-brand-600 transition-colors">
                    Add someone manually
                  </Link>
                  {' '}to start.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {contacts.map((contact) => (
                  <Link
                    key={contact.id}
                    href="/contacts"
                    className="group app-panel-subtle flex items-center justify-between rounded-[24px] px-4 py-3 bg-white ring-1 ring-gray-950/[0.04] transition-all duration-300 hover:bg-gray-50/[0.4] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-500/5 hover:ring-brand-500/20 active:scale-[0.98]"
                  >
                    <div className="min-w-0 transition-transform group-hover:translate-x-1 duration-300">
                      <p className="truncate text-sm font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">{contact.name}</p>
                      {contact.email && (
                        <p className="truncate text-xs text-gray-400">{contact.email}</p>
                      )}
                    </div>
                    <div className="ml-3 flex shrink-0 items-center justify-end gap-2">
                       {contact.crmPipeline?.stage && (
                         <span
                           className={cn(
                             'rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
                             STAGE_COLORS[contact.crmPipeline.stage] ?? 'bg-gray-100 text-gray-500',
                           )}
                         >
                           {contact.crmPipeline.stage.replace('_', ' ')}
                         </span>
                       )}
                       <ChevronRight className="h-3.5 w-3.5 text-brand-400 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
                     </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-gray-900">Pending Tasks</h2>
                {overdueTasksCount > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    {overdueTasksCount} overdue
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
            ) : sectionErrors.includes('tasks') ? (
              <div className="flex flex-col items-center justify-center rounded-[32px] border border-amber-200/60 bg-amber-50/50 py-10 text-center shadow-inner">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[20px] bg-amber-100/50 ring-1 ring-amber-200/50">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                </div>
                <p className="text-[13px] font-semibold text-amber-900">Tasks unavailable</p>
                <p className="mt-1 text-[12px] font-medium text-amber-700/80">Experiencing temporary delays.</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-[32px] border border-gray-950/[0.04] bg-gray-50/50 py-10 text-center shadow-inner">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[20px] bg-gray-100/80 ring-1 ring-gray-950/[0.04]">
                  <CheckSquare className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-[13px] font-semibold text-gray-900">All caught up</p>
                <p className="mt-1 text-[12px] font-medium text-gray-500">No pending tasks on your plate.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.slice(0, 5).map((task) => {
                  const due = dueDateLabel(task.dueAt)
                  return (
                    <Link
                      key={task.id}
                      href="/tasks"
                      className="group app-panel-subtle flex items-start justify-between rounded-[24px] px-4 py-3 bg-white ring-1 ring-gray-950/[0.04] transition-all duration-300 hover:bg-gray-50/[0.4] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-500/5 hover:ring-brand-500/20 active:scale-[0.98]"
                    >
                      <div className="min-w-0 transition-transform group-hover:translate-x-1 duration-300">
                        <p className="truncate text-sm font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">{task.title}</p>
                        {task.contact && (
                          <p className="text-xs text-gray-400">
                            {task.contact.name ?? 'Unknown contact'}
                          </p>
                        )}
                      </div>
                      <div className="ml-3 flex mt-0.5 shrink-0 items-center justify-end gap-2">
                        {due && (
                          <span
                            className={cn(
                              'text-[11px] uppercase tracking-wider font-semibold',
                              due.overdue ? 'text-red-500' : 'text-gray-400',
                            )}
                          >
                            {due.label}
                          </span>
                        )}
                        <ChevronRight className="h-3 w-3 text-brand-400 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        <div className="space-y-5">
          <div>
            <SectionHeader title="Active Deals" href="/deals" />
            {loading ? (
              <SkeletonList rows={3} />
            ) : sectionErrors.includes('deals') ? (
              <div className="flex flex-col items-center justify-center rounded-[32px] border border-amber-200/60 bg-amber-50/50 py-10 text-center shadow-inner">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[20px] bg-amber-100/50 ring-1 ring-amber-200/50">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                </div>
                <p className="text-[13px] font-semibold text-amber-900">Deals unavailable</p>
                <p className="mt-1 text-[12px] font-medium text-amber-700/80">Experiencing temporary delays.</p>
              </div>
            ) : openDeals.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-[32px] border border-gray-950/[0.04] bg-gray-50/50 py-10 text-center shadow-inner">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[20px] bg-gray-100/80 ring-1 ring-gray-950/[0.04]">
                  <Briefcase className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-[13px] font-semibold text-gray-900">No open deals</p>
                <p className="mt-2 text-[12px] font-medium text-gray-500">
                  <Link href="/deals" className="text-brand-500 hover:text-brand-600 transition-colors">
                    Add a new deal
                  </Link>
                  {' '}to start.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-[20px] bg-gradient-to-r from-green-50 to-emerald-50 px-5 py-3 ring-1 ring-green-100/50">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-green-700">Pipeline value</span>
                  </div>
                  <span className="text-base font-black tabular-nums tracking-tight text-green-700">
                    {formatCurrency(pipelineValue)}
                  </span>
                </div>
                {openDeals.slice(0, 5).map((deal) => (
                  <Link
                    key={deal.id}
                    href="/deals"
                    className="group app-panel-subtle flex items-center justify-between rounded-[24px] px-4 py-3 bg-white ring-1 ring-gray-950/[0.04] transition-all duration-300 hover:bg-gray-50/[0.4] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-500/5 hover:ring-brand-500/20 active:scale-[0.98]"
                  >
                    <div className="min-w-0 transition-transform group-hover:translate-x-1 duration-300">
                      <p className="truncate text-sm font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">{deal.title}</p>
                      {deal.contact && (
                        <p className="text-xs text-gray-400">
                          {deal.contact.name ?? 'Unknown contact'}
                        </p>
                      )}
                    </div>
                    <div className="ml-3 flex shrink-0 items-center justify-end gap-3">
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[13px] font-bold tabular-nums text-gray-900">
                          {formatCurrency(deal.value, deal.currency)}
                        </span>
                        <span
                          className={cn(
                            'rounded-full px-2 py-[1px] text-[9px] font-bold uppercase tracking-wider',
                            STAGE_COLORS[deal.stage] ?? 'bg-gray-100 text-gray-500',
                          )}
                        >
                          {deal.stage.replace('_', ' ')}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-brand-400 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
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
                <div className="relative overflow-hidden rounded-[32px] border border-gray-950/[0.04] bg-white/70 backdrop-blur-xl p-6 shadow-[0_4px_24px_-12px_rgba(15,23,42,0.06)] space-y-5">
                  <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] mix-blend-overlay"></div>
                  {funnel.stages.map((stage) => (
                    <div key={stage.stage} className="group relative z-10">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500 group-hover:text-gray-700 transition-colors">{stage.stage}</span>
                        <span className="rounded-full bg-gray-950/[0.03] px-2.5 py-0.5 text-[11px] font-black tabular-nums text-gray-900 shadow-sm transition-transform group-hover:scale-105">
                          {stage.count}
                        </span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-950/[0.04] shadow-inner">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-500 shadow-md transition-all duration-1000 ease-out"
                          style={{ width: `${Math.round((stage.count / funnelMax) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="relative z-10 pt-4 border-t border-gray-950/[0.04] flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">Total Active</span>
                    <span className="text-[15px] font-black tabular-nums text-gray-950">{funnel.totalActive} contacts</span>
                  </div>
                </div>
              ) : null}
            </div>
          )}
          <div>
            <SectionHeader title="My Cards" href="/apps/cards" />
            {loading ? (
              <SkeletonList rows={2} />
            ) : sectionErrors.includes('cards') ? (
              <div className="app-panel-subtle flex flex-col items-center rounded-[28px] border-2 border-dashed border-amber-200 py-10 text-center">
                <CreditCard className="mb-3 h-10 w-10 text-amber-300" />
                <p className="text-sm font-medium text-amber-700">
                  Cards are temporarily unavailable
                </p>
                <p className="mt-1 text-xs text-amber-600">Retry to load your card inventory.</p>
              </div>
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
                  <CardAnalyticsRow key={card.id} card={card} />
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
          {!loading && appointmentTypes.length > 0 && (
            <div>
              <SectionHeader
                title="Scheduling"
                href="/apps/scheduling/appointment-types"
                linkLabel="Manage"
              />
              <div className="space-y-2">
                {appointmentTypes.slice(0, 4).map((appointmentType) => (
                  <Link
                    key={appointmentType.id}
                    href="/apps/scheduling/appointment-types"
                    className="app-panel-subtle flex items-center justify-between rounded-[24px] px-4 py-3 transition-shadow hover:shadow-[0_20px_40px_-30px_rgba(15,23,42,0.24)]"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 shrink-0 text-brand-400" />
                      <span className="text-sm font-semibold text-gray-900">
                        {appointmentType.name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {appointmentType.durationMins} min
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {!loading && cards.length > 0 && (
        <div className="relative overflow-hidden rounded-[34px] border border-gray-950/[0.04] bg-white/70 backdrop-blur-xl shadow-[0_4px_24px_-12px_rgba(15,23,42,0.06)]">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] mix-blend-overlay"></div>
          <div className="relative grid grid-cols-3 divide-x divide-gray-950/[0.04]">
            {[
              { label: 'Total Views', value: totalViews, icon: Eye, color: 'text-blue-600', ring: 'ring-blue-100/50', bg: 'bg-blue-50/50' },
              {
                label: 'Link Clicks',
                value: totalClicks,
                icon: MousePointerClick,
                color: 'text-purple-600',
                ring: 'ring-purple-100/50',
                bg: 'bg-purple-50/50'
              },
              {
                label: 'Leads Captured',
                value: totalLeads,
                icon: TrendingUp,
                color: 'text-green-600',
                ring: 'ring-green-100/50',
                bg: 'bg-green-50/50'
              },
            ].map(({ label, value, icon: Icon, color, ring, bg }) => (
              <div key={label} className="group relative flex flex-col items-center justify-center p-8 transition-colors duration-500 hover:bg-white/60">
                <div className={cn('mb-4 flex h-12 w-12 items-center justify-center rounded-[20px] shadow-inner ring-1 ring-inset transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-110 group-hover:rotate-3', ring, bg)}>
                  <Icon className={cn('h-5 w-5', color)} />
                </div>
                <p className={cn('text-3xl font-black tabular-nums tracking-tighter text-gray-950 transition-transform duration-500 group-hover:-translate-y-0.5')}>{value}</p>
                <p className="mt-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400 transition-transform duration-500 group-hover:-translate-y-0.5 group-hover:text-gray-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <div>
        <h2 className="mb-4 text-base font-semibold text-gray-900">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: 'New Card',
              href: '/apps/cards/create',
              icon: CreditCard,
              color: 'text-brand-500',
              bg: 'bg-brand-50',
              ring: 'ring-brand-100/50',
            },
            {
              label: 'Add Contact',
              href: '/contacts',
              icon: Users,
              color: 'text-purple-600',
              bg: 'bg-purple-50',
              ring: 'ring-purple-100/50',
            },
            {
              label: 'New Deal',
              href: '/deals',
              icon: Briefcase,
              color: 'text-green-600',
              bg: 'bg-green-50',
              ring: 'ring-green-100/50',
            },
            {
              label: 'Add Task',
              href: '/tasks',
              icon: CheckSquare,
              color: 'text-orange-600',
              bg: 'bg-orange-50',
              ring: 'ring-orange-100/50',
            },
          ].map(({ label, href, icon: Icon, color, bg, ring }) => (
            <Link
              key={label}
              href={href}
              className="group relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-[32px] border border-gray-950/[0.04] bg-white/70 backdrop-blur-xl p-6 shadow-[0_4px_24px_-12px_rgba(15,23,42,0.06)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_52px_-20px_rgba(15,23,42,0.12)] active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] mix-blend-overlay"></div>
              <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <div className={cn('relative flex h-14 w-14 items-center justify-center rounded-[22px] shadow-inner ring-1 ring-inset transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3', bg, ring)}>
                <Icon className={cn('h-6 w-6', color)} />
              </div>
              <span className="relative text-[13px] font-bold text-gray-900 transition-colors group-hover:text-brand-600">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
