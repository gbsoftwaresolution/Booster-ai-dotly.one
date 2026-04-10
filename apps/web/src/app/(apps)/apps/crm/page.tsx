'use client'

import type { JSX } from 'react'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Users,
  Inbox,
  DollarSign,
  CheckSquare,
  Kanban,
  ArrowRight,
  Plus,
  TrendingUp,
  CreditCard,
  Calendar,
  Zap,
} from 'lucide-react'
import { getAccessToken } from '@/lib/supabase/client'
import { apiGet } from '@/lib/api'
import { cn } from '@/lib/cn'
import { StatusNotice } from '@/components/ui/StatusNotice'

interface ContactRow {
  id: string
  firstName: string
  lastName: string
  email: string
  crmStage?: string
  createdAt: string
}

interface CRMOverview {
  contacts: ContactRow[]
  recentCount: number
  dealCount: number
  leadCount: number
}

interface DealRow {
  id: string
}

interface LeadSubmissionRow {
  id: string
}

function StatPill({
  label,
  value,
  icon: Icon,
  color,
  href,
}: {
  label: string
  value: number
  icon: React.ElementType
  color: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="app-panel group flex items-center gap-4 rounded-[24px] p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl shrink-0', color)}>
        <Icon className="h-5 w-5 text-white" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
        <p className="text-xs font-medium text-gray-500">{label}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-1 shrink-0" />
    </Link>
  )
}

export default function CRMDashboard(): JSX.Element {
  const [data, setData] = useState<CRMOverview>({
    contacts: [],
    recentCount: 0,
    dealCount: 0,
    leadCount: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      const [contactsRes, dealsRes, leadsRes] = await Promise.all([
        apiGet<{ contacts: ContactRow[]; total?: number }>('/contacts?limit=5', token),
        apiGet<DealRow[]>('/deals', token),
        apiGet<{ submissions: LeadSubmissionRow[]; total: number }>(
          '/lead-submissions?limit=1',
          token,
        ),
      ])
      setData({
        contacts: contactsRes.contacts ?? [],
        recentCount: contactsRes.total ?? (contactsRes.contacts ?? []).length,
        dealCount: dealsRes.length,
        leadCount: leadsRes.total ?? leadsRes.submissions.length,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load CRM overview.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  return (
    <div className="space-y-8">
      {error && <StatusNotice message={error} />}

      {/* Header */}
      <div className="app-panel flex items-center justify-between rounded-[30px] px-6 py-6 sm:px-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM</h1>
          <p className="mt-2 text-sm text-gray-500">
            Contacts, pipeline, deals and tasks in one place
          </p>
        </div>
        <Link
          href="/apps/crm/contacts"
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg,#a78bfa,#7c3aed)' }}
        >
          <Plus className="h-4 w-4" />
          Add Contact
        </Link>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatPill
            label="Contacts"
            value={data.recentCount}
            icon={Users}
            color="bg-violet-500"
            href="/apps/crm/contacts"
          />
          <StatPill
            label="Deals"
            value={data.dealCount}
            icon={DollarSign}
            color="bg-emerald-500"
            href="/apps/crm/deals"
          />
          <StatPill
            label="Lead Submissions"
            value={data.leadCount}
            icon={Inbox}
            color="bg-sky-500"
            href="/apps/crm/leads"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent contacts */}
        <section className="app-panel overflow-hidden rounded-[28px]">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">Recent Contacts</h2>
            <Link
              href="/apps/crm/contacts"
              className="text-xs font-medium text-violet-600 hover:underline"
            >
              View all
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3 p-5">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : data.contacts.length === 0 ? (
            <div className="app-empty-state rounded-none border-0 shadow-none">
              <Users className="h-8 w-8 text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">No contacts yet</p>
              <Link
                href="/apps/crm/contacts"
                className="mt-2 text-xs text-violet-600 hover:underline"
              >
                Add your first contact
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {data.contacts.slice(0, 5).map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-5 py-3">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg,#a78bfa,#7c3aed)' }}
                  >
                    {c.firstName[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {c.firstName} {c.lastName}
                    </p>
                    <p className="text-xs text-gray-400 truncate">{c.email}</p>
                  </div>
                  {c.crmStage && (
                    <span className="shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-600">
                      {c.crmStage}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* CRM links */}
        <section className="app-panel overflow-hidden rounded-[28px]">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">CRM Tools</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {[
              {
                href: '/apps/crm/deals',
                label: 'Deals',
                desc: 'Track and manage opportunities',
                icon: DollarSign,
              },
              {
                href: '/apps/crm/tasks',
                label: 'Tasks',
                desc: 'Manage follow-ups and to-dos',
                icon: CheckSquare,
              },
              {
                href: '/apps/crm/leads',
                label: 'Lead Submissions',
                desc: 'Contacts from your cards',
                icon: Inbox,
              },
              {
                href: '/apps/crm/pipeline',
                label: 'Pipeline',
                desc: 'Visual Kanban pipeline',
                icon: Kanban,
              },
            ].map(({ href, label, desc, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/70"
              >
                <Icon className="h-4 w-4 shrink-0 text-violet-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <p className="text-xs text-gray-400 truncate">{desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-1 shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Quick links to other CRM tools */}
      <section>
        <h2 className="mb-4 text-base font-semibold text-gray-900">CRM Tools</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            {
              href: '/apps/crm/pipeline',
              label: 'Pipeline',
              icon: Kanban,
              color: 'bg-violet-50',
              iconColor: 'text-violet-500',
            },
            {
              href: '/apps/crm/pipelines',
              label: 'Pipelines',
              icon: TrendingUp,
              color: 'bg-emerald-50',
              iconColor: 'text-emerald-500',
            },
            {
              href: '/apps/crm/custom-fields',
              label: 'Custom Fields',
              icon: CheckSquare,
              color: 'bg-amber-50',
              iconColor: 'text-amber-500',
            },
            {
              href: '/apps/crm/analytics',
              label: 'CRM Analytics',
              icon: TrendingUp,
              color: 'bg-sky-50',
              iconColor: 'text-sky-500',
            },
          ].map(({ href, label, icon: Icon, color, iconColor }) => (
            <Link
              key={href}
              href={href}
              className="app-panel group flex flex-col items-center gap-2 rounded-[24px] p-4 text-center transition-all hover:shadow-md"
            >
              <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', color)}>
                <Icon className={cn('h-5 w-5', iconColor)} />
              </span>
              <span className="text-xs font-semibold text-gray-700">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Cross-app links */}
      <section className="app-panel-subtle rounded-[28px] border border-dashed border-gray-200 p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
          Connected Apps
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/apps/cards"
            className="flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-sky-200 hover:text-sky-700"
          >
            <CreditCard className="h-4 w-4 text-sky-500" />
            Cards — Lead captures feed here
            <Zap className="h-3.5 w-3.5 text-sky-400" />
          </Link>
          <Link
            href="/apps/scheduling"
            className="flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-emerald-200 hover:text-emerald-700"
          >
            <Calendar className="h-4 w-4 text-emerald-500" />
            Scheduling — Book contact meetings
            <Zap className="h-3.5 w-3.5 text-emerald-400" />
          </Link>
        </div>
      </section>
    </div>
  )
}
