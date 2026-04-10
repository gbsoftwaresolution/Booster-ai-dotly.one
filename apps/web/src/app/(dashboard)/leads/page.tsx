'use client'

import type { JSX } from 'react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { getAccessToken } from '@/lib/supabase/client'
import { apiGet, apiDelete } from '@/lib/api'
import { StatusNotice } from '@/components/ui/StatusNotice'
import {
  Inbox,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Search,
  Download,
  Trash2,
} from 'lucide-react'
import { ContactDetailDrawer } from '@/components/crm/ContactDetailDrawer'
import { SelectField } from '@/components/ui/SelectField'
import { formatDate } from '@/lib/tz'
import { useUserTimezone } from '@/hooks/useUserLocale'

interface SubmissionContact {
  id: string
  name: string
  email?: string | null
  phone?: string | null
}

interface LeadSubmission {
  id: string
  leadFormId: string
  leadFormTitle: string | null
  cardHandle: string | null
  cardId: string | null
  answers: Record<string, string>
  submittedAt: string
  contact: SubmissionContact | null
}

interface LeadSubmissionsResponse {
  submissions: LeadSubmission[]
  total: number
  page: number
  limit: number
}

interface CardSummary {
  id: string
  handle: string
}

function timeAgo(dateStr: string, tz?: string | null): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(dateStr, tz ?? undefined)
}

export default function LeadsPage(): JSX.Element {
  const userTz = useUserTimezone()
  const [submissions, setSubmissions] = useState<LeadSubmission[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [drawerContactId, setDrawerContactId] = useState<string | null>(null)

  const [cards, setCards] = useState<CardSummary[]>([])
  const [cardFilter, setCardFilter] = useState<string>('')
  const [search, setSearch] = useState('')

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const LIMIT = 20

  const loadSubmissions = useCallback(
    async (p = 1, cardId = cardFilter, s = search) => {
      setLoading(true)
      setError(null)
      try {
        const token = await getAccessToken()
        const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) })
        if (cardId) params.set('cardId', cardId)
        if (s) params.set('search', s)
        const data = await apiGet<LeadSubmissionsResponse>(
          `/lead-submissions?${params.toString()}`,
          token,
        )
        setSubmissions(data.submissions)
        setTotal(data.total)
        setPage(p)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load lead submissions')
      } finally {
        setLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cardFilter],
  )

  useEffect(() => {
    void loadSubmissions(1)
    void (async () => {
      try {
        const token = await getAccessToken()
        const data = await apiGet<CardSummary[]>('/cards', token)
        setCards(data)
      } catch {
        /* ignore */
      }
    })()
  }, [loadSubmissions])

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value)
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
      searchDebounceRef.current = setTimeout(() => {
        void loadSubmissions(1, cardFilter, value)
      }, 300)
    },
    [loadSubmissions, cardFilter],
  )

  const handleCardFilter = useCallback(
    (cardId: string) => {
      setCardFilter(cardId)
      void loadSubmissions(1, cardId, search)
    },
    [loadSubmissions, search],
  )

  const handleExportCSV = useCallback(async () => {
    try {
      const token = await getAccessToken()
      const params = new URLSearchParams()
      if (cardFilter) params.set('cardId', cardFilter)
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? ''}/contacts/export?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token ?? ''}` } },
      )
      if (!res.ok) {
        const message = await res.text().catch(() => '')
        if (message.includes('CSV export is available on Pro.')) {
          throw new Error('CSV export is available on Pro. Upgrade in billing to export leads.')
        }
        throw new Error(`Export failed: ${res.status}`)
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
  }, [cardFilter])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    if (selectedIds.size === submissions.length && submissions.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(submissions.map((s) => s.id)))
    }
  }, [submissions, selectedIds.size])

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return
    if (!window.confirm(`Delete ${selectedIds.size} submission(s)? This cannot be undone.`)) return
    try {
      const token = await getAccessToken()
      await Promise.all([...selectedIds].map((id) => apiDelete(`/lead-submissions/${id}`, token)))
      setSelectedIds(new Set())
      void loadSubmissions(page, cardFilter, search)
    } catch {
      setError('Failed to delete one or more submissions.')
    }
  }, [selectedIds, loadSubmissions, page, cardFilter, search])

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Submissions</h1>
          <p className="mt-1 text-sm text-gray-500">
            All form submissions from your public card pages.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Card filter */}
          <SelectField
            value={cardFilter}
            onChange={(e) => handleCardFilter(e.target.value)}
            className="min-w-[170px] rounded-xl px-3 py-2.5 pr-10 focus:border-indigo-500 focus:ring-indigo-100"
          >
            <option value="">All cards</option>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                /{c.handle}
              </option>
            ))}
          </SelectField>

          <button
            type="button"
            onClick={() => void handleExportCSV()}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Search + stats bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <span className="text-sm text-gray-500">{total.toLocaleString()} total</span>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <span className="text-sm font-medium text-red-700">{selectedIds.size} selected</span>
          <button
            type="button"
            onClick={() => void handleBulkDelete()}
            className="flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete selected
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-gray-500 hover:underline"
          >
            Clear
          </button>
        </div>
      )}

      {/* Error */}
      {error && <StatusNotice message={error} />}

      {/* Table */}
      <div className="app-table-shell overflow-x-auto">
        {loading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="app-list-skeleton h-14 animate-pulse" />
            ))}
          </div>
        ) : submissions.length === 0 ? (
          <div className="app-empty-state py-16">
            <Inbox className="mb-4 h-12 w-12 text-gray-300" />
            <p className="text-sm font-medium text-gray-700">No lead submissions yet</p>
            <p className="mt-1 text-sm text-gray-400">
              Share your card and leads will appear here when people fill out your form.
            </p>
          </div>
        ) : (
          <table className="app-table">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === submissions.length && submissions.length > 0}
                    onChange={selectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 hidden md:table-cell">
                  Card / Form
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 hidden lg:table-cell">
                  Submitted Answers
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  When
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  CRM
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {submissions.map((sub) => (
                <tr key={sub.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(sub.id)}
                      onChange={() => toggleSelect(sub.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3">
                    {sub.contact ? (
                      <div>
                        <p className="font-medium text-gray-900">{sub.contact.name}</p>
                        {sub.contact.email && (
                          <p className="text-xs text-gray-500">{sub.contact.email}</p>
                        )}
                        {sub.contact.phone && (
                          <p className="text-xs text-gray-400">{sub.contact.phone}</p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No contact linked</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="space-y-0.5">
                      {sub.cardHandle && (
                        <span className="inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                          /{sub.cardHandle}
                        </span>
                      )}
                      {sub.leadFormTitle && (
                        <p className="text-xs text-gray-500">{sub.leadFormTitle}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell max-w-xs">
                    <div className="space-y-1">
                      {Object.entries(sub.answers ?? {})
                        .slice(0, 3)
                        .map(([key, val]) => (
                          <p key={key} className="text-xs text-gray-600 truncate">
                            <span className="font-medium text-gray-400">{key}:</span> {String(val)}
                          </p>
                        ))}
                      {Object.keys(sub.answers ?? {}).length > 3 && (
                        <p className="text-xs text-gray-400">
                          +{Object.keys(sub.answers).length - 3} more
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {timeAgo(sub.submittedAt, userTz)}
                  </td>
                  <td className="px-4 py-3">
                    {sub.contact ? (
                      <button
                        type="button"
                        onClick={() => setDrawerContactId(sub.contact!.id)}
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                      >
                        View
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => void loadSubmissions(page - 1)}
              className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => void loadSubmissions(page + 1)}
              className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <ContactDetailDrawer contactId={drawerContactId} onClose={() => setDrawerContactId(null)} />
    </div>
  )
}
