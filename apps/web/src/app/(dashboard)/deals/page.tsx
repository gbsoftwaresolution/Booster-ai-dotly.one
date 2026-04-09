'use client'

import type { JSX } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BriefcaseBusiness, Plus, Trash2, X } from 'lucide-react'
import { ContactDetailDrawer } from '@/components/crm/ContactDetailDrawer'
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api'
import { getAccessToken } from '@/lib/supabase/client'

interface Deal {
  id: string
  title: string
  value: number
  currency: string
  stage: DealStage
  closeDate: string | null
  probability: number
  contact: {
    id: string
    name: string
    email: string | null
  } | null
}

interface ContactOption {
  id: string
  name: string
  email: string | null
}

const DEAL_STAGES = ['PROSPECT', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'] as const
type DealStage = (typeof DEAL_STAGES)[number]

const STAGE_LABELS: Record<DealStage, string> = {
  PROSPECT: 'Prospect',
  PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation',
  CLOSED_WON: 'Closed Won',
  CLOSED_LOST: 'Closed Lost',
}

const STAGE_HEADER_COLORS: Record<DealStage, string> = {
  PROSPECT: 'bg-blue-50 border-blue-200',
  PROPOSAL: 'bg-yellow-50 border-yellow-200',
  NEGOTIATION: 'bg-purple-50 border-purple-200',
  CLOSED_WON: 'bg-green-50 border-green-200',
  CLOSED_LOST: 'bg-gray-100 border-gray-200',
}

const STAGE_BADGES: Record<DealStage, string> = {
  PROSPECT: 'bg-blue-100 text-blue-700',
  PROPOSAL: 'bg-yellow-100 text-yellow-700',
  NEGOTIATION: 'bg-purple-100 text-purple-700',
  CLOSED_WON: 'bg-green-100 text-green-700',
  CLOSED_LOST: 'bg-red-100 text-red-700',
}

function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `$${value.toLocaleString()}`
  }
}

function formatDate(value: string | null): string {
  if (!value) return 'No close date'
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function normalizePercent(value: number): number {
  return value <= 1 ? value * 100 : value
}

// ─── Create Deal Modal ────────────────────────────────────────────────────────

interface CreateDealModalProps {
  onClose: () => void
  onCreated: (deal: Deal) => void
}

function CreateDealModal({ onClose, onCreated }: CreateDealModalProps): JSX.Element {
  const [contacts, setContacts] = useState<ContactOption[]>([])
  const [contactSearch, setContactSearch] = useState('')
  const [selectedContactId, setSelectedContactId] = useState('')
  const [title, setTitle] = useState('')
  const [value, setValue] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [stage, setStage] = useState<DealStage>('PROSPECT')
  const [probability, setProbability] = useState('')
  const [closeDate, setCloseDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const token = await getAccessToken()
        const params = new URLSearchParams({ limit: '50' })
        if (contactSearch.trim()) params.set('search', contactSearch.trim())
        const data = await apiGet<{ contacts: ContactOption[] }>(
          `/contacts?${params.toString()}`,
          token,
        )
        setContacts(data.contacts)
      } catch {
        // silently ignore contact search errors
      }
    })()
  }, [contactSearch])

  async function handleSubmit() {
    if (!title.trim()) {
      setError('Deal title is required')
      return
    }
    if (!selectedContactId) {
      setError('Please select a contact')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const token = await getAccessToken()
      const body: Record<string, unknown> = {
        title: title.trim(),
        stage,
        currency,
      }
      if (value) body.value = parseFloat(value)
      if (probability) body.probability = parseFloat(probability) / 100
      if (closeDate) body.closeDate = new Date(closeDate).toISOString()
      if (notes.trim()) body.notes = notes.trim()

      const created = await apiPost<Deal>(`/contacts/${selectedContactId}/deals`, body, token)
      onCreated(created)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create deal')
    } finally {
      setSaving(false)
    }
  }

  const selectedContact = contacts.find((c) => c.id === selectedContactId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">New Deal</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          {/* Contact picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact <span className="text-red-500">*</span>
            </label>
            {selectedContact ? (
              <div className="flex items-center justify-between rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-indigo-900">{selectedContact.name}</p>
                  {selectedContact.email && (
                    <p className="text-xs text-indigo-600">{selectedContact.email}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedContactId('')}
                  className="text-indigo-400 hover:text-indigo-600"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {contacts.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                    {contacts.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedContactId(c.id)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        <span className="font-medium text-gray-900">{c.name}</span>
                        {c.email && <span className="ml-2 text-gray-400 text-xs">{c.email}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deal title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Enterprise contract"
              maxLength={300}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Value + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'SGD', 'JPY'].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as DealStage)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {DEAL_STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          {/* Probability + Close date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Probability (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={probability}
                onChange={(e) => setProbability(e.target.value)}
                placeholder="50"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Close date</label>
              <input
                type="date"
                value={closeDate}
                onChange={(e) => setCloseDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Deal context, next steps..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Deal'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DealsPage(): JSX.Element {
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyDealIds, setBusyDealIds] = useState<Set<string>>(new Set())
  const [drawerContactId, setDrawerContactId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [stageFilter, setStageFilter] = useState<DealStage | 'ALL'>('ALL')
  const [search, setSearch] = useState('')

  const loadDeals = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      const data = await apiGet<Deal[]>('/deals', token)
      setDeals(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deals')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDeals()
  }, [loadDeals])

  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      if (stageFilter !== 'ALL' && deal.stage !== stageFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (
          !deal.title.toLowerCase().includes(q) &&
          !(deal.contact?.name ?? '').toLowerCase().includes(q)
        )
          return false
      }
      return true
    })
  }, [deals, stageFilter, search])

  const groupedDeals = useMemo(() => {
    return DEAL_STAGES.reduce(
      (acc, stage) => {
        acc[stage] = filteredDeals.filter((deal) => deal.stage === stage)
        return acc
      },
      {} as Record<DealStage, Deal[]>,
    )
  }, [filteredDeals])

  const totalPipelineValue = useMemo(
    () => deals.reduce((sum, deal) => sum + deal.value, 0),
    [deals],
  )

  // Weighted pipeline = sum(value * probability)
  const weightedPipelineValue = useMemo(
    () =>
      deals
        .filter((d) => d.stage !== 'CLOSED_LOST')
        .reduce((sum, deal) => sum + deal.value * normalizePercent(deal.probability) * 0.01, 0),
    [deals],
  )

  const wonDeals = useMemo(() => deals.filter((d) => d.stage === 'CLOSED_WON'), [deals])
  const closedDeals = useMemo(
    () => deals.filter((d) => d.stage === 'CLOSED_WON' || d.stage === 'CLOSED_LOST'),
    [deals],
  )
  const winRate = closedDeals.length > 0 ? (wonDeals.length / closedDeals.length) * 100 : null

  const pipelineCurrency = deals[0]?.currency || 'USD'

  const setBusy = (dealId: string, busy: boolean) => {
    setBusyDealIds((prev) => {
      const next = new Set(prev)
      if (busy) next.add(dealId)
      else next.delete(dealId)
      return next
    })
  }

  const handleStageChange = useCallback(async (deal: Deal, newStage: DealStage) => {
    if (deal.stage === newStage) return
    setBusy(deal.id, true)
    setError(null)
    setDeals((prev) =>
      prev.map((item) => (item.id === deal.id ? { ...item, stage: newStage } : item)),
    )
    try {
      const token = await getAccessToken()
      const updated = await apiPatch<Deal>(`/deals/${deal.id}`, { stage: newStage }, token)
      setDeals((prev) => prev.map((item) => (item.id === deal.id ? updated : item)))
    } catch (err) {
      setDeals((prev) => prev.map((item) => (item.id === deal.id ? deal : item)))
      setError(err instanceof Error ? err.message : 'Failed to update deal stage')
    } finally {
      setBusy(deal.id, false)
    }
  }, [])

  const handleDelete = useCallback(async (dealId: string) => {
    if (!window.confirm('Delete this deal? This cannot be undone.')) return
    setBusy(dealId, true)
    setError(null)
    try {
      const token = await getAccessToken()
      await apiDelete(`/deals/${dealId}`, token)
      setDeals((prev) => prev.filter((deal) => deal.id !== dealId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete deal')
    } finally {
      setBusy(dealId, false)
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deals</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your sales pipeline across prospecting, proposals, and closed revenue.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          New Deal
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Total pipeline
          </p>
          <p className="mt-1 text-xl font-bold text-gray-900">
            {formatCurrency(totalPipelineValue, pipelineCurrency)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Weighted pipeline
          </p>
          <p className="mt-1 text-xl font-bold text-indigo-700">
            {formatCurrency(weightedPipelineValue, pipelineCurrency)}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Win rate</p>
          <p className="mt-1 text-xl font-bold text-green-700">
            {winRate != null ? `${Math.round(winRate)}%` : '—'}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Avg won deal</p>
          <p className="mt-1 text-xl font-bold text-gray-900">
            {wonDeals.length > 0
              ? formatCurrency(
                  wonDeals.reduce((s, d) => s + d.value, 0) / wonDeals.length,
                  pipelineCurrency,
                )
              : '—'}
          </p>
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Search deals or contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 rounded-xl border border-gray-300 py-2 pl-3 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value as DealStage | 'ALL')}
          className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="ALL">All stages</option>
          {DEAL_STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {DEAL_STAGES.map((stage) => (
            <div key={stage} className="h-72 w-72 shrink-0 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : filteredDeals.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
          <BriefcaseBusiness className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p className="text-sm font-medium text-gray-700">
            {deals.length === 0 ? 'No deals yet' : 'No deals match your filters'}
          </p>
          <p className="mt-1 text-sm text-gray-400">
            {deals.length === 0
              ? 'Click "New Deal" to create your first deal.'
              : 'Try adjusting your search or stage filter.'}
          </p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {DEAL_STAGES.map((stage) => {
            const stageDeals = groupedDeals[stage]
            const stageTotal = stageDeals.reduce((sum, deal) => sum + deal.value, 0)

            return (
              <div
                key={stage}
                className="flex w-80 shrink-0 flex-col rounded-xl border border-gray-200 bg-white shadow-sm"
              >
                <div className={`rounded-t-xl border-b px-4 py-3 ${STAGE_HEADER_COLORS[stage]}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-gray-800">{STAGE_LABELS[stage]}</h2>
                      <p className="mt-1 text-xs text-gray-500">
                        {formatCurrency(stageTotal, stageDeals[0]?.currency || pipelineCurrency)}
                      </p>
                    </div>
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-2 text-xs font-bold text-gray-600 shadow-sm">
                      {stageDeals.length}
                    </span>
                  </div>
                </div>

                <div className="flex min-h-[260px] flex-1 flex-col gap-3 p-3">
                  {stageDeals.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-400">No deals in this stage</p>
                  ) : (
                    stageDeals.map((deal) => {
                      const busy = busyDealIds.has(deal.id)

                      return (
                        <div
                          key={deal.id}
                          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <h3 className="truncate text-sm font-semibold text-gray-900">
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
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleDelete(deal.id)}
                              className="rounded-lg border border-gray-300 p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                              aria-label={`Delete ${deal.title}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-lg font-bold text-gray-900">
                              {formatCurrency(deal.value, deal.currency || 'USD')}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_BADGES[deal.stage]}`}
                            >
                              {STAGE_LABELS[deal.stage]}
                            </span>
                          </div>

                          <div className="mt-3 space-y-1 text-sm text-gray-500">
                            <p>Close date: {formatDate(deal.closeDate)}</p>
                            <p>Probability: {Math.round(normalizePercent(deal.probability))}%</p>
                            {deal.contact?.email && (
                              <p className="truncate">{deal.contact.email}</p>
                            )}
                          </div>

                          <select
                            value={deal.stage}
                            disabled={busy}
                            onChange={(event) =>
                              void handleStageChange(deal, event.target.value as DealStage)
                            }
                            className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                          >
                            {DEAL_STAGES.map((option) => (
                              <option key={option} value={option}>
                                {STAGE_LABELS[option]}
                              </option>
                            ))}
                          </select>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreateModal && (
        <CreateDealModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(deal) => setDeals((prev) => [deal, ...prev])}
        />
      )}

      <ContactDetailDrawer contactId={drawerContactId} onClose={() => setDrawerContactId(null)} />
    </div>
  )
}
