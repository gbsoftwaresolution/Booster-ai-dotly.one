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
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-14 animate-pulse rounded-2xl bg-gray-100" />
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
  onRetry: () => void
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
    <div className="app-panel relative overflow-hidden rounded-[34px] px-5 py-5 sm:px-6 sm:py-6">
      <div
        className="absolute inset-0 opacity-90"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(circle at top left, rgba(56,189,248,0.2), transparent 32%), radial-gradient(circle at right center, rgba(168,85,247,0.16), transparent 28%), radial-gradient(circle at bottom left, rgba(16,185,129,0.14), transparent 24%), linear-gradient(135deg, rgba(255,255,255,0.94), rgba(248,250,252,0.98))',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute -left-10 top-6 h-32 w-32 rounded-full bg-sky-200/40 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute right-0 top-0 h-40 w-40 rounded-full bg-fuchsia-200/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-1/3 h-24 w-24 rounded-full bg-emerald-200/30 blur-2xl"
      />
      <div className="relative space-y-5 lg:hidden">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-brand-500 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                {greeting}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-[-0.03em] text-gray-950">{userName}</h1>
                <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-cyan-50 text-sky-600 shadow-inner">
                  <Hand className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-2 max-w-md text-sm text-gray-500">
                A mobile-friendly snapshot of what needs attention and what is already moving.
              </p>
            </div>
            <span className="rounded-full border border-white/80 bg-white/90 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 shadow-sm">
              Mobile
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {summaryStats.map(({ label, value, note, accent, badge }) => (
              <div
                key={label}
                className="rounded-[24px] border border-white/80 bg-white/90 px-3 py-3 shadow-[0_20px_40px_-30px_rgba(15,23,42,0.22)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                    {label}
                  </p>
                  <span className="rounded-full bg-gray-950 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                    {badge}
                  </span>
                </div>
                <p className="mt-2 text-base font-bold text-gray-950">{value}</p>
                <p className="mt-1 text-[11px] text-gray-400">{note}</p>
                <div className={cn('mt-3 h-1.5 rounded-full bg-gradient-to-r', accent)} />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            {glanceItems.map(({ label, value, detail, icon: Icon, tone }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-[24px] border border-white/80 bg-white/90 px-4 py-3 shadow-[0_18px_36px_-32px_rgba(15,23,42,0.18)]"
              >
                <span
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-inner',
                    tone,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {label}
                  </p>
                  <p className="truncate text-sm text-gray-500">{detail}</p>
                </div>
                <span className="shrink-0 rounded-full bg-gray-950 px-2.5 py-1 text-xs font-bold text-white">
                  {value}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row">
            <Link
              href="/apps/cards/create"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-950 px-4 py-3 text-sm font-semibold text-white shadow-[0_22px_42px_-26px_rgba(15,23,42,0.56)] transition-transform hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" />
              Create Card
            </Link>
            <Link
              href="/apps/cards/analytics"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-white"
            >
              <TrendingUp className="h-4 w-4 text-brand-500" />
              View Analytics
            </Link>
          </div>

          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-white/80 bg-white/90 px-3 py-2 text-xs font-medium text-gray-600 shadow-sm">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-brand-50 to-sky-50 text-brand-500">
              <AlertCircle className="h-3.5 w-3.5" />
            </span>
            <span className="truncate">Focus: {focusMessage}</span>
          </div>
        </div>
      </div>

      <div className="relative hidden gap-5 lg:grid xl:grid-cols-[1.35fr_0.9fr] xl:items-start">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-brand-500 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            {greeting}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-[-0.04em] text-gray-950 sm:text-[2.2rem]">
              {userName}
            </h1>
            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-cyan-50 text-sky-600 shadow-inner">
              <Hand className="h-4 w-4" />
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-gray-500 sm:text-[15px]">
            Here&apos;s your business overview for today, with the areas that need attention and the
            momentum already building.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-medium text-gray-500">
            <span className="rounded-full border border-white/80 bg-white/90 px-3 py-1.5 shadow-sm">
              Live workspace pulse
            </span>
            <span className="rounded-full border border-white/80 bg-white/70 px-3 py-1.5 shadow-sm">
              Revenue + CRM + Booking
            </span>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:max-w-2xl sm:grid-cols-4">
            {summaryStats.map(({ label, value, note, accent, badge }) => (
              <div
                key={label}
                className="rounded-[24px] border border-white/80 bg-white/85 px-4 py-3 shadow-[0_22px_44px_-32px_rgba(15,23,42,0.22)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                    {label}
                  </p>
                  <span className="rounded-full bg-gray-950 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">
                    {badge}
                  </span>
                </div>
                <p className="mt-2 text-sm font-bold text-gray-900 sm:text-base">{value}</p>
                <p className="mt-1 text-[11px] text-gray-400">{note}</p>
                <div className={cn('mt-3 h-1.5 rounded-full bg-gradient-to-r', accent)} />
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/apps/cards/create"
              className="inline-flex items-center gap-2 rounded-2xl bg-gray-950 px-4 py-3 text-sm font-semibold text-white shadow-[0_24px_46px_-26px_rgba(15,23,42,0.56)] transition-transform hover:-translate-y-0.5"
            >
              <Plus className="h-4 w-4" />
              Create Card
            </Link>
            <Link
              href="/apps/cards/analytics"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-white"
            >
              <TrendingUp className="h-4 w-4 text-brand-500" />
              View Analytics
            </Link>
          </div>
          <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full border border-white/80 bg-white/90 px-3 py-2 text-xs font-medium text-gray-600 shadow-sm">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-brand-50 to-sky-50 text-brand-500">
              <AlertCircle className="h-3.5 w-3.5" />
            </span>
            <span className="truncate">Focus: {focusMessage}</span>
          </div>
        </div>
        <div className="app-panel-subtle rounded-[32px] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
                Today At A Glance
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">Your operating snapshot</p>
            </div>
            <span className="rounded-full border border-white/80 bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-500 shadow-sm">
              Overview
            </span>
          </div>
          <div className="mt-4 space-y-3">
            {glanceItems.map(({ label, value, detail, icon: Icon, tone }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-[24px] border border-white/80 bg-white/85 px-4 py-3 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.16)]"
              >
                <span
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-inner',
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
                <span className="shrink-0 rounded-full bg-gray-950 px-3 py-1 text-xs font-bold tabular-nums text-white">
                  {value}
                </span>
              </div>
            ))}
          </div>
          {sectionErrors.length > 0 && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-4 text-xs font-semibold text-brand-500 hover:text-brand-600"
            >
              Retry unavailable sections
            </button>
          )}
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
              <div className="app-panel-subtle rounded-[26px] border-2 border-dashed border-amber-200 py-8 text-center text-sm text-amber-700">
                Recent leads are temporarily unavailable.
              </div>
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
          <div>
            <SectionHeader title="Recent Contacts" href="/contacts" />
            {loading ? (
              <SkeletonList rows={3} />
            ) : sectionErrors.includes('contacts') ? (
              <div className="app-panel-subtle rounded-[26px] border-2 border-dashed border-amber-200 py-8 text-center text-sm text-amber-700">
                Recent contacts are temporarily unavailable.
              </div>
            ) : contacts.length === 0 ? (
              <div className="app-panel-subtle rounded-[26px] border-2 border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
                No contacts yet.{' '}
                <Link href="/contacts" className="text-brand-500 underline">
                  Add one
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {contacts.map((contact) => (
                  <Link
                    key={contact.id}
                    href="/contacts"
                    className="app-panel-subtle flex items-center justify-between rounded-[24px] px-4 py-3 transition-shadow hover:shadow-[0_20px_40px_-30px_rgba(15,23,42,0.24)]"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{contact.name}</p>
                      {contact.email && (
                        <p className="truncate text-xs text-gray-400">{contact.email}</p>
                      )}
                    </div>
                    {contact.crmPipeline?.stage && (
                      <span
                        className={cn(
                          'ml-3 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                          STAGE_COLORS[contact.crmPipeline.stage] ?? 'bg-gray-100 text-gray-500',
                        )}
                      >
                        {contact.crmPipeline.stage}
                      </span>
                    )}
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
              <div className="app-panel-subtle rounded-[26px] border-2 border-dashed border-amber-200 py-8 text-center text-sm text-amber-700">
                Tasks are temporarily unavailable.
              </div>
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
                            {task.contact.name ?? 'Unknown contact'}
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
        <div className="space-y-5">
          <div>
            <SectionHeader title="Active Deals" href="/deals" />
            {loading ? (
              <SkeletonList rows={3} />
            ) : sectionErrors.includes('deals') ? (
              <div className="app-panel-subtle rounded-[26px] border-2 border-dashed border-amber-200 py-8 text-center text-sm text-amber-700">
                Active deals are temporarily unavailable.
              </div>
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
                          {deal.contact.name ?? 'Unknown contact'}
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
                  {funnel.stages.map((stage) => (
                    <div key={stage.stage}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-gray-600">{stage.stage}</span>
                        <span className="font-semibold tabular-nums text-gray-900">
                          {stage.count}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                        <div
                          className="h-2 rounded-full bg-brand-500 transition-all"
                          style={{ width: `${Math.round((stage.count / funnelMax) * 100)}%` }}
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
        <div className="app-panel grid grid-cols-3 divide-x divide-gray-100 rounded-[28px]">
          {[
            { label: 'Total Views', value: totalViews, icon: Eye, color: 'text-blue-600' },
            {
              label: 'Link Clicks',
              value: totalClicks,
              icon: MousePointerClick,
              color: 'text-purple-600',
            },
            {
              label: 'Leads Captured',
              value: totalLeads,
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
      <Link
        href="/apps/cards/create"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+68px)] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 shadow-lg shadow-brand-500/30 transition-transform active:scale-95 lg:hidden"
        aria-label="Create card"
      >
        <QrCode className="h-6 w-6 text-white" aria-hidden="true" />
      </Link>
    </>
  )
}
