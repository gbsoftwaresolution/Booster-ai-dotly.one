'use client'

import type { JSX } from 'react'
import { useState, useEffect, useCallback } from 'react'
import { getAccessToken } from '@/lib/supabase/client'
import { apiGet } from '@/lib/api'
import { Inbox, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'

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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

export default function LeadsPage(): JSX.Element {
  const [submissions, setSubmissions] = useState<LeadSubmission[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [cards, setCards] = useState<CardSummary[]>([])
  const [cardFilter, setCardFilter] = useState<string>('')

  const LIMIT = 20

  const loadSubmissions = useCallback(
    async (p = 1, cardId = cardFilter) => {
      setLoading(true)
      setError(null)
      try {
        const token = await getAccessToken()
        const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) })
        if (cardId) params.set('cardId', cardId)
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
        {/* Card filter */}
        <div>
          <select
            value={cardFilter}
            onChange={(e) => {
              setCardFilter(e.target.value)
              void loadSubmissions(1, e.target.value)
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All cards</option>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                /{c.handle}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
        <p className="text-sm text-gray-500">
          Total submissions:{' '}
          <span className="font-semibold text-gray-900">{total.toLocaleString()}</span>
        </p>
      </div>

      {/* Error */}
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded bg-gray-100" />
            ))}
          </div>
        ) : submissions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Inbox className="mb-4 h-12 w-12 text-gray-300" />
            <p className="text-sm font-medium text-gray-700">No lead submissions yet</p>
            <p className="mt-1 text-sm text-gray-400">
              Share your card and leads will appear here when people fill out your form.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
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
                    {timeAgo(sub.submittedAt)}
                  </td>
                  <td className="px-4 py-3">
                    {sub.contact ? (
                      <a
                        href={`/contacts`}
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                      >
                        View
                        <ExternalLink className="h-3 w-3" />
                      </a>
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
    </div>
  )
}
