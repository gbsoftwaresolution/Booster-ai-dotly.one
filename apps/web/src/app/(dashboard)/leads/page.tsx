'use client'

import type { JSX } from 'react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { getAccessToken } from '@/lib/supabase/client'
import { apiGet, apiDelete } from '@/lib/api'
import { StatusNotice } from '@/components/ui/StatusNotice'
import { useUserTimezone } from '@/hooks/useUserLocale'
import type { ItemsResponse, PaginatedResponse } from '@dotly/types'
import {
  LeadsBulkActions,
  LeadsConfirmDialog,
  LeadsContent,
  LeadsDrawer,
  LeadsHeader,
  LeadsPagination,
  LeadsToolbar,
} from './components'
import { API_URL, buildExportFileName, LEADS_LIMIT } from './helpers'
import type { CardSummary, LeadSubmission } from './types'

type LeadSubmissionsResponse = PaginatedResponse<LeadSubmission>

export default function LeadsPage(): JSX.Element {
  const userTz = useUserTimezone()
  const [submissions, setSubmissions] = useState<LeadSubmission[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [drawerContactId, setDrawerContactId] = useState<string | null>(null)

  const [cards, setCards] = useState<CardSummary[]>([])
  const [cardFilter, setCardFilter] = useState<string>('')
  const [search, setSearch] = useState('')

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadSubmissions = useCallback(
    async (p = 1, cardId = cardFilter, s = search) => {
      setLoading(true)
      setError(null)
      try {
        const token = await getAccessToken()
        const params = new URLSearchParams({ page: String(p), limit: String(LEADS_LIMIT) })
        if (cardId) params.set('cardId', cardId)
        if (s) params.set('search', s)
        const data = await apiGet<LeadSubmissionsResponse>(
          `/lead-submissions?${params.toString()}`,
          token,
        )
        setSubmissions(data.items)
        setSelectedIds((prev) => {
          const visibleIds = new Set(data.items.map((submission) => submission.id))
          return new Set([...prev].filter((id) => visibleIds.has(id)))
        })
        setTotal(data.total)
        setPage(data.page)
        setHasLoadedOnce(true)
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
        const data = await apiGet<ItemsResponse<CardSummary>>('/cards', token)
        setCards(data.items)
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
      if (search.trim()) params.set('search', search.trim())
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)
      const res = await fetch(`${API_URL}/lead-submissions/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token ?? ''}` },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId))
      if (!res.ok) {
        const message = await res.text().catch(() => '')
        if (message.includes('CSV export is available on Pro.')) {
          throw new Error(
            'CSV export is available on Pro. Upgrade in billing to export lead submissions.',
          )
        }
        throw new Error(`Export failed: ${res.status}`)
      }
      const csv = await res.text()
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = buildExportFileName()
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(
        err instanceof DOMException && err.name === 'AbortError'
          ? 'Lead export timed out. Please try again.'
          : err instanceof Error
            ? err.message
            : 'Export failed',
      )
    }
  }, [cardFilter, search])

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
    try {
      const token = await getAccessToken()
      const ids = [...selectedIds]
      const results = await Promise.allSettled(
        ids.map((id) => apiDelete(`/lead-submissions/${id}`, token)),
      )
      const succeededIds = ids.filter((_, index) => results[index]?.status === 'fulfilled')
      const failedCount = results.length - succeededIds.length

      if (succeededIds.length > 0) {
        setSubmissions((prev) => prev.filter((submission) => !succeededIds.includes(submission.id)))
        setSelectedIds((prev) => new Set([...prev].filter((id) => !succeededIds.includes(id))))
      }

      if (failedCount > 0) {
        setError(
          failedCount === results.length
            ? 'Failed to delete selected submissions.'
            : `Deleted ${succeededIds.length} submission(s), but ${failedCount} failed.`,
        )
      }

      void loadSubmissions(page, cardFilter, search)
    } catch {
      setError('Failed to delete one or more submissions.')
    }
  }, [selectedIds, loadSubmissions, page, cardFilter, search])

  const totalPages = Math.max(1, Math.ceil(total / LEADS_LIMIT))

  return (
    <div className="space-y-6">
      <LeadsHeader
        cardFilter={cardFilter}
        cards={cards}
        onCardFilter={handleCardFilter}
        onExport={() => void handleExportCSV()}
      />

      <LeadsToolbar search={search} total={total} onSearchChange={handleSearchChange} />

      <LeadsBulkActions
        selectedCount={selectedIds.size}
        onDelete={() => setShowBulkDeleteConfirm(true)}
        onClear={() => setSelectedIds(new Set())}
      />

      {error && <StatusNotice message={error} />}

      <LeadsContent
        loading={loading}
        error={error}
        hasLoadedOnce={hasLoadedOnce}
        submissions={submissions}
        selectedIds={selectedIds}
        search={search}
        cardFilter={cardFilter}
        page={page}
        userTz={userTz}
        onRetry={() => void loadSubmissions(page, cardFilter, search)}
        onSelectAll={selectAll}
        onToggleSelect={toggleSelect}
        onOpenContact={setDrawerContactId}
      />

      <LeadsPagination
        page={page}
        total={total}
        totalPages={totalPages}
        onPrevious={() => void loadSubmissions(page - 1)}
        onNext={() => void loadSubmissions(page + 1)}
      />

      <LeadsDrawer drawerContactId={drawerContactId} onClose={() => setDrawerContactId(null)} />

      {showBulkDeleteConfirm && selectedIds.size > 0 ? (
        <LeadsConfirmDialog
          title="Delete selected submissions?"
          message={`Delete ${selectedIds.size} submission(s)? This cannot be undone.`}
          onCancel={() => setShowBulkDeleteConfirm(false)}
          onConfirm={() => {
            setShowBulkDeleteConfirm(false)
            void handleBulkDelete()
          }}
        />
      ) : null}
    </div>
  )
}
