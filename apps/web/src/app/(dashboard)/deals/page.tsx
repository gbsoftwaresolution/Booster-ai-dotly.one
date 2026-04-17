'use client'

import type { JSX } from 'react'
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { BriefcaseBusiness, Pencil, Plus, Trash2, X, Target, TrendingUp } from 'lucide-react'
import { ContactDetailDrawer } from '@/components/crm/ContactDetailDrawer'
import { SelectField } from '@/components/ui/SelectField'
import { StatusNotice } from '@/components/ui/StatusNotice'
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api'
import { getAccessToken } from '@/lib/auth/client'
import type { PaginatedResponse } from '@dotly/types'
import { formatDate } from '@/lib/tz'
import { useUserTimezone } from '@/hooks/useUserLocale'
import { ConfirmDialog, CreateDealModal, EditDealModal } from './components'
import {
  formatCurrency,
  normalizePercent,
  STAGE_BADGES,
  STAGE_HEADER_COLORS,
  STAGE_LABELS,
} from './helpers'
import {
  DEALS_STAGE_LIMIT,
  DEAL_STAGES,
  type Deal,
  type DealsSummary,
  type DealStage,
} from './types'

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DealsPage(): JSX.Element {
  const userTz = useUserTimezone()
  const searchId = 'deals-page-search'
  const stageFilterId = 'deals-page-stage-filter'
  const [stageDeals, setStageDeals] = useState<Record<DealStage, PaginatedResponse<Deal>>>(() =>
    DEAL_STAGES.reduce(
      (acc, stage) => {
        acc[stage] = { items: [], total: 0, page: 1, limit: DEALS_STAGE_LIMIT, totalPages: 1 }
        return acc
      },
      {} as Record<DealStage, PaginatedResponse<Deal>>,
    ),
  )
  const [summary, setSummary] = useState<DealsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [stageErrors, setStageErrors] = useState<Partial<Record<DealStage, string>>>({})
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [busyDealIds, setBusyDealIds] = useState<Set<string>>(new Set())
  const [drawerContactId, setDrawerContactId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  const [stageFilter, setStageFilter] = useState<DealStage | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const deferredSearch = useDeferredValue(search)

  const loadDeals = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSummaryError(null)
    setStageErrors({})
    try {
      const token = await getAccessToken()
      const requestedStages = stageFilter === 'ALL' ? DEAL_STAGES : [stageFilter]
      const [summaryResult, ...stageResponses] = await Promise.allSettled([
        apiGet<DealsSummary>('/deals/summary', token),
        ...requestedStages.map((stage) => {
          const params = new URLSearchParams({
            stage,
            limit: String(DEALS_STAGE_LIMIT),
          })
          if (deferredSearch.trim()) params.set('search', deferredSearch.trim())
          return apiGet<PaginatedResponse<Deal>>(`/deals?${params.toString()}`, token)
        }),
      ])

      const nextStageDeals = DEAL_STAGES.reduce(
        (acc, stage) => {
          acc[stage] = { items: [], total: 0, page: 1, limit: DEALS_STAGE_LIMIT, totalPages: 1 }
          return acc
        },
        {} as Record<DealStage, PaginatedResponse<Deal>>,
      )
      const nextStageErrors: Partial<Record<DealStage, string>> = {}

      requestedStages.forEach((stage, index) => {
        const response = stageResponses[index]
        if (response && response.status === 'fulfilled') {
          nextStageDeals[stage] = response.value as PaginatedResponse<Deal>
        } else if (response?.status === 'rejected') {
          nextStageErrors[stage] =
            response.reason instanceof Error ? response.reason.message : 'Stage unavailable.'
        }
      })

      if (summaryResult.status === 'fulfilled') {
        setSummary(summaryResult.value)
      } else {
        setSummaryError(
          summaryResult.reason instanceof Error
            ? summaryResult.reason.message
            : 'Deal summary is temporarily unavailable.',
        )
      }
      setStageDeals(nextStageDeals)
      setStageErrors(nextStageErrors)
      setHasLoadedOnce(true)

      const failedStages = stageResponses.filter((result) => result.status === 'rejected').length
      if (failedStages === requestedStages.length) {
        throw new Error('Failed to load deals board.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deals')
    } finally {
      setLoading(false)
    }
  }, [deferredSearch, stageFilter])

  useEffect(() => {
    void loadDeals()
  }, [loadDeals])

  const stagesToRender = useMemo(
    () => (stageFilter === 'ALL' ? DEAL_STAGES : [stageFilter]),
    [stageFilter],
  )
  const visibleDeals = useMemo(
    () => stagesToRender.flatMap((stage) => stageDeals[stage]?.items ?? []),
    [stageDeals, stagesToRender],
  )
  const totalPipelineValue = summary?.totalPipelineValue ?? 0
  const weightedPipelineValue = summary?.weightedPipelineValue ?? 0
  const winRate =
    summary && summary.closedDeals > 0 ? (summary.wonDeals / summary.closedDeals) * 100 : null
  const pipelineCurrency = visibleDeals[0]?.currency || 'USD'
  const activeDealsCount = summary?.activeDeals ?? 0
  const nextClosingDeal = summary?.nextClosingDeal ?? null
  const truncatedStages = stagesToRender.filter(
    (stage) => stageDeals[stage].total > stageDeals[stage].items.length,
  )
  const focusMessage = nextClosingDeal?.closeDate
    ? `${nextClosingDeal.title} is the nearest close target on ${formatDate(nextClosingDeal.closeDate, userTz)}.`
    : activeDealsCount > 0
      ? `${activeDealsCount} live deal${activeDealsCount === 1 ? '' : 's'} are moving through your pipeline.`
      : 'Create your first deal to start tracking revenue opportunities.'
  const hasActiveFilters = stageFilter !== 'ALL' || search.trim().length > 0

  const setBusy = (dealId: string, busy: boolean) => {
    setBusyDealIds((prev) => {
      const next = new Set(prev)
      if (busy) next.add(dealId)
      else next.delete(dealId)
      return next
    })
  }

  const handleStageChange = useCallback(
    async (deal: Deal, newStage: DealStage) => {
      if (deal.stage === newStage) return
      setBusy(deal.id, true)
      setError(null)
      try {
        const token = await getAccessToken()
        await apiPatch<Deal>(`/deals/${deal.id}`, { stage: newStage }, token)
        void loadDeals()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update deal stage')
      } finally {
        setBusy(deal.id, false)
      }
    },
    [loadDeals],
  )

  const handleDelete = useCallback(async (dealId: string) => {
    setConfirmDeleteId(dealId)
  }, [])

  const confirmDelete = useCallback(
    async (dealId: string) => {
      setConfirmDeleteId(null)
      setBusy(dealId, true)
      setError(null)
      try {
        const token = await getAccessToken()
        await apiDelete(`/deals/${dealId}`, token)
        void loadDeals()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete deal')
      } finally {
        setBusy(dealId, false)
      }
    },
    [loadDeals],
  )

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-[24px] border border-slate-200/60 bg-white/60 p-4 sm:p-6 backdrop-blur-xl mb-6 shadow-sm">
        {/* Background glows */}
                        <div className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #94a3b8 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className="relative z-10 flex flex-col items-start justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50/50 px-3 py-1 shadow-inner backdrop-blur-sm">
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Sales Pipeline</span>
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Active <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-600">Deals</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm font-medium text-slate-500 sm:text-base">
              Track revenue opportunities, keep stage movement clear, and stay focused on the deals most likely to close.
            </p>
          </div>
          
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            {/* Quick Stats in Header */}
            <div className="flex gap-4 rounded-2xl border border-sky-100 bg-sky-50/50 px-5 py-4 backdrop-blur-md">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pipeline Value</p>
                    <p className="mt-1 flex items-baseline gap-2 text-2xl font-bold tracking-tight text-slate-900">
                        {loading ? '—' : formatCurrency(totalPipelineValue, pipelineCurrency)}
                    </p>
                </div>
                <div className="h-10 w-px bg-slate-200/60" />
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Win Rate</p>
                    <p className="mt-1 flex items-baseline gap-2 text-2xl font-bold tracking-tight text-slate-900">
                        {loading ? '—' : winRate != null ? `${Math.round(winRate)}%` : '—'}
                    </p>
                </div>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="group relative flex items-center gap-2 overflow-hidden rounded-2xl bg-white px-5 py-4 text-sm font-bold text-slate-900 shadow-lg transition-all hover:scale-105 active:scale-95"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-100 to-emerald-100 opacity-0 transition-opacity group-hover:opacity-100" />
              <Plus className="relative z-10 h-4 w-4" />
              <span className="relative z-10">New Deal</span>
            </button>
          </div>
        </div>
        
        {/* Pipeline Focus Message */}
        <div className="relative z-10 mt-8 flex max-w-2xl items-start gap-3 rounded-2xl border border-sky-200/50 bg-sky-50/50 px-5 py-4 text-sm shadow-inner backdrop-blur-md">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-500">
                <Target className="h-3 w-3" />
            </span>
            <div className="min-w-0">
                <p className="font-bold text-sky-900">Pipeline focus</p>
                <p className="mt-0.5 text-[13px] font-medium text-sky-700/80">{focusMessage}</p>
            </div>
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="group relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-slate-200/60 bg-white/60 p-4 backdrop-blur-xl transition-all">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <div className="relative w-full sm:w-auto">
            <label htmlFor={searchId} className="sr-only">
              Search deals or contacts
            </label>
            <input
              id={searchId}
              type="text"
              placeholder="Search deals or contacts..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
              }}
              className="w-full rounded-xl border border-slate-200/60 bg-white/80 py-2.5 pl-4 pr-10 text-sm font-medium text-slate-900 shadow-sm transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-indigo-500/20 sm:w-80"
            />
          </div>
          <label htmlFor={stageFilterId} className="sr-only">
            Filter deals by stage
          </label>
          <SelectField
            id={stageFilterId}
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as DealStage | 'ALL')}
            className="w-full rounded-xl border border-slate-200/60 bg-white/80 py-2.5 pl-4 pr-10 text-sm font-medium text-slate-900 shadow-sm transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-indigo-500/20 cursor-pointer sm:w-48"
          >
            <option value="ALL">All stages</option>
            {DEAL_STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </SelectField>
        </div>
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={() => {
              setStageFilter('ALL')
              setSearch('')
            }}
            className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {error && <StatusNotice message={error} liveMode="assertive" />}
      {summaryError && <StatusNotice tone="warning" message={summaryError} liveMode="polite" />}

      {truncatedStages.length > 0 && !loading && (
        <StatusNotice
          tone="info"
          liveMode="polite"
          message={`Board view shows the ${DEALS_STAGE_LIMIT} most recent matching deals per stage. Refine the search or stage filter to inspect a narrower slice.`}
        />
      )}

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {DEAL_STAGES.map((stage) => (
            <div
              key={stage}
              className="app-list-skeleton h-72 w-72 shrink-0 animate-pulse rounded-[24px]"
            />
          ))}
        </div>
      ) : error && !hasLoadedOnce ? (
        <div className="relative overflow-hidden rounded-[24px] border border-white/80 bg-white/60 px-6 py-12 text-center backdrop-blur-xl shadow-sm transition-all m-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-50 to-teal-50/50 shadow-inner mb-6"><BriefcaseBusiness size={32} className="text-emerald-400" /></div>
          <p className="text-xl font-extrabold text-slate-900 mb-2">Deals are unavailable</p>
          <p className="mx-auto max-w-sm text-sm font-medium text-slate-500 mb-8">{error}</p>
          <button
            type="button"
            onClick={() => void loadDeals()}
            className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-lg active:scale-95"
          >
            Retry
          </button>
        </div>
      ) : visibleDeals.length === 0 ? (
        <div className="relative overflow-hidden rounded-[24px] border border-white/80 bg-white/60 px-6 py-12 text-center backdrop-blur-xl shadow-sm transition-all m-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-50 to-teal-50/50 shadow-inner mb-6"><BriefcaseBusiness size={32} className="text-emerald-400" /></div>
          <p className="text-xl font-extrabold text-slate-900 mb-2">
            {summary?.totalDeals === 0 ? 'No deals yet' : 'No deals match your filters'}
          </p>
          <p className="mx-auto max-w-sm text-sm font-medium text-slate-500 mb-8">
            {summary?.totalDeals === 0
              ? 'Click "New Deal" to create your first deal.'
              : 'Try adjusting your search or stage filter.'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {visibleDeals.map((deal) => {
              const busy = busyDealIds.has(deal.id)

              return (
                <div key={deal.id} className="group relative rounded-2xl border border-slate-200/60 bg-white/60 p-5 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">{deal.title}</h2>
                      {deal.contact ? (
                        <button
                          type="button"
                          onClick={() => setDrawerContactId(deal.contact?.id ?? null)}
                          className="mt-1 block truncate text-sm text-indigo-600 hover:underline"
                        >
                          {deal.contact.name}
                        </button>
                      ) : (
                        <p className="mt-1 text-sm text-gray-400">No contact</p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STAGE_BADGES[deal.stage]}`}
                    >
                      {STAGE_LABELS[deal.stage]}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-gray-50/90 p-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Value
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {formatCurrency(deal.value, deal.currency || 'USD')}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Probability
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {Math.round(normalizePercent(deal.probability))}%
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Close date
                      </p>
                      <p className="mt-1 text-[13px] font-medium text-slate-500">
                        {deal.closeDate ? formatDate(deal.closeDate, userTz) : 'No close date'}
                      </p>
                      {deal.contact?.email && (
                        <p className="mt-1 truncate text-[13px] font-medium text-slate-500">{deal.contact.email}</p>
                      )}
                    </div>
                  </div>

                  <SelectField
                    aria-label={`Move ${deal.title} to a different stage`}
                    value={deal.stage}
                    disabled={busy}
                    onChange={(event) =>
                      void handleStageChange(deal, event.target.value as DealStage)
                    }
                    className="mt-4 w-full rounded-xl border border-slate-200/60 bg-slate-50/50 py-2.5 pl-4 pr-10 text-sm font-medium text-slate-900 shadow-sm transition-all focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-indigo-500/20"
                  >
                    {DEAL_STAGES.map((option) => (
                      <option key={option} value={option}>
                        {STAGE_LABELS[option]}
                      </option>
                    ))}
                  </SelectField>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setEditingDeal(deal)}
                      className="app-touch-target inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider text-slate-600 shadow-sm ring-1 ring-inset ring-slate-200 transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
                      aria-label={`Edit ${deal.title}`}
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void handleDelete(deal.id)}
                      className="app-touch-target inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider text-rose-600 shadow-sm ring-1 ring-inset ring-rose-200 transition-all hover:bg-rose-50 hover:shadow-md active:scale-95 disabled:pointer-events-none disabled:opacity-50"
                      aria-label={`Delete ${deal.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="hidden gap-4 overflow-x-auto pb-4 md:flex">
            {stagesToRender.map((stage) => {
              const stageData = stageDeals[stage]
              const stageItems = stageData.items

              return (
                <div key={stage} className="flex w-[340px] shrink-0 flex-col rounded-3xl border border-slate-200/60 bg-slate-50/50 backdrop-blur-xl">
                  <div
                    className={`flex items-center justify-between rounded-t-3xl border-b border-slate-200/60 bg-white/60 px-5 py-4 backdrop-blur-md`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-[15px] font-bold tracking-tight text-slate-900">
                          {STAGE_LABELS[stage]}
                        </h2>
                        <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                          {stageData.total} deal{stageData.total === 1 ? '' : 's'}
                          {stageData.total > stageItems.length
                            ? ` · showing ${stageItems.length}`
                            : ''}
                        </p>
                      </div>
                      <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-white px-2 text-[11px] font-bold text-slate-600 shadow-sm ring-1 ring-inset ring-slate-200">
                        {stageData.total}
                      </span>
                    </div>
                  </div>

                  <div className="flex min-h-[260px] flex-1 flex-col gap-3 p-3">
                    {stageErrors[stage] ? (
                      <div className="py-8 text-center">
                        <p className="text-sm text-amber-700">{stageErrors[stage]}</p>
                        <button
                          type="button"
                          onClick={() => void loadDeals()}
                          className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          Retry stage
                        </button>
                      </div>
                    ) : stageItems.length === 0 ? (
                      <p className="py-8 text-center text-sm text-gray-400">
                        No deals in this stage
                      </p>
                    ) : (
                      stageItems.map((deal) => {
                        const busy = busyDealIds.has(deal.id)

                        return (
                          <div key={deal.id} className="group relative rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <h3 className="truncate text-[15px] font-bold tracking-tight text-slate-900">
                                  {deal.title}
                                </h3>
                                {deal.contact ? (
                                  <button
                                    type="button"
                                    onClick={() => setDrawerContactId(deal.contact?.id ?? null)}
                                    className="mt-1 block truncate text-sm text-indigo-600 hover:underline"
                                  >
                                    {deal.contact.name}
                                  </button>
                                ) : (
                                  <p className="mt-1 text-sm text-gray-400">No contact</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => setEditingDeal(deal)}
                                  className="rounded-xl bg-slate-50 p-2 text-slate-400 opacity-0 transition-opacity ring-1 ring-inset ring-slate-200/60 hover:bg-white hover:text-slate-600 group-hover:opacity-100 disabled:opacity-50"
                                  aria-label={`Edit ${deal.title}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void handleDelete(deal.id)}
                                  className="rounded-xl bg-slate-50 p-2 text-rose-400 opacity-0 transition-opacity ring-1 ring-inset ring-slate-200/60 hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 disabled:opacity-50"
                                  aria-label={`Delete ${deal.title}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between">
                              <span className="text-base font-extrabold tracking-tight text-emerald-600">
                                {formatCurrency(deal.value, deal.currency || 'USD')}
                              </span>
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_BADGES[deal.stage]}`}
                              >
                                {STAGE_LABELS[deal.stage]}
                              </span>
                            </div>

                            <div className="mt-3 space-y-1 text-[13px] font-medium text-slate-500">
                              <p>
                                Close date:{' '}
                                {deal.closeDate
                                  ? formatDate(deal.closeDate, userTz)
                                  : 'No close date'}
                              </p>
                              <p>Probability: {Math.round(normalizePercent(deal.probability))}%</p>
                              {deal.contact?.email && (
                                <p className="truncate">{deal.contact.email}</p>
                              )}
                            </div>

                            <SelectField
                              aria-label={`Move ${deal.title} to a different stage`}
                              value={deal.stage}
                              disabled={busy}
                              onChange={(event) =>
                                void handleStageChange(deal, event.target.value as DealStage)
                              }
                              className="mt-4 rounded-xl px-3 py-2.5 pr-10 focus:border-indigo-500 focus:ring-indigo-100"
                            >
                              {DEAL_STAGES.map((option) => (
                                <option key={option} value={option}>
                                  {STAGE_LABELS[option]}
                                </option>
                              ))}
                            </SelectField>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {showCreateModal && (
        <CreateDealModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false)
            void loadDeals()
          }}
        />
      )}

      {editingDeal && (
        <EditDealModal
          deal={editingDeal}
          onClose={() => setEditingDeal(null)}
          onUpdated={() => {
            setEditingDeal(null)
            void loadDeals()
          }}
        />
      )}

      <ContactDetailDrawer contactId={drawerContactId} onClose={() => setDrawerContactId(null)} />

      {confirmDeleteId && (
        <ConfirmDialog
          title="Delete deal"
          message="Delete this deal? This cannot be undone."
          onConfirm={() => {
            void confirmDelete(confirmDeleteId)
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  )
}
