'use client'

import type { JSX } from 'react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { getAccessToken } from '@/lib/supabase/client'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api'
import { ContactDetailDrawer, type ContactDetail } from '@/components/crm/ContactDetailDrawer'
import {
  Plus,
  Search,
  Download,
  Trash2,
  Users,
  AlertTriangle,
  Tag,
  ArrowUpDown,
} from 'lucide-react'

interface ContactRow {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  company?: string | null
  tags?: string[]
  createdAt: string
  crmPipeline?: { stage: string } | null
  sourceCard?: { handle: string } | null
}

interface ContactsResponse {
  contacts: ContactRow[]
  total: number
  page: number
  limit: number
}

interface CardSummary {
  id: string
  handle: string
}

const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED', 'LOST'] as const
type Stage = (typeof STAGES)[number]

const STAGE_BADGE: Record<Stage, string> = {
  NEW: 'bg-gray-100 text-gray-700',
  CONTACTED: 'bg-blue-100 text-blue-700',
  QUALIFIED: 'bg-yellow-100 text-yellow-700',
  CLOSED: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-700',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function ContactsPage(): JSX.Element {
  const [contacts, setContacts] = useState<ContactRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<string>('ALL')
  const [tagFilter, setTagFilter] = useState<string>('')
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'stage'>('date')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkStage, setBulkStage] = useState<string>('')

  const [showAddModal, setShowAddModal] = useState(false)
  const [drawerContactId, setDrawerContactId] = useState<string | null>(null)

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string
    onConfirm: () => void
  } | null>(null)

  const [cards, setCards] = useState<CardSummary[]>([])

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const LIMIT = 20

  // Derive all unique tags from loaded contacts for the tag filter dropdown
  const allTags = Array.from(new Set(contacts.flatMap((c) => c.tags ?? []))).sort()

  // Client-side tag filter + sort applied on top of server-paginated results
  const displayedContacts = contacts
    .filter((c) => !tagFilter || (c.tags ?? []).includes(tagFilter))
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'stage') {
        const stageOrder = { NEW: 0, CONTACTED: 1, QUALIFIED: 2, CLOSED: 3, LOST: 4 }
        const aStage = (a.crmPipeline?.stage ?? 'NEW') as keyof typeof stageOrder
        const bStage = (b.crmPipeline?.stage ?? 'NEW') as keyof typeof stageOrder
        return (stageOrder[aStage] ?? 0) - (stageOrder[bStage] ?? 0)
      }
      // default: date desc (server already sorts this way)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

  const loadContacts = useCallback(
    async (p = 1, s = search, stage = stageFilter) => {
      setLoading(true)
      setError(null)
      try {
        const token = await getAccessToken()
        const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) })
        if (s) params.set('search', s)
        if (stage !== 'ALL') params.set('stage', stage)
        const data = await apiGet<ContactsResponse>(`/contacts?${params.toString()}`, token)
        setContacts(data.contacts)
        setTotal(data.total)
        setPage(p)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load contacts')
      } finally {
        setLoading(false)
      }
    },
    [search, stageFilter],
  )

  useEffect(() => {
    void loadContacts(1, search, stageFilter)
    void (async () => {
      try {
        const token = await getAccessToken()
        const data = await apiGet<CardSummary[]>('/cards', token)
        setCards(data)
      } catch {
        /* ignore */
      }
    })()
  }, [loadContacts, search, stageFilter])

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value)
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
      searchDebounceRef.current = setTimeout(() => {
        void loadContacts(1, value, stageFilter)
      }, 300)
    },
    [loadContacts, stageFilter],
  )

  const handleStageFilter = useCallback(
    (stage: string) => {
      setStageFilter(stage)
      void loadContacts(1, search, stage)
    },
    [loadContacts, search],
  )

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(contacts.map((c) => c.id)))
    }
  }, [contacts, selectedIds.size])

  const handleBulkStageChange = useCallback(async () => {
    if (!bulkStage || selectedIds.size === 0) return
    try {
      const token = await getAccessToken()
      // M1: Use the real bulk API endpoint — single request instead of N individual PATCHes.
      await apiPatch('/contacts/bulk-stage', { ids: [...selectedIds], stage: bulkStage }, token)
      setSelectedIds(new Set())
      setBulkStage('')
      void loadContacts(page)
    } catch {
      setError('Failed to update stage for one or more contacts. Please try again.')
    }
  }, [bulkStage, selectedIds, loadContacts, page])

  const handleBulkDelete = useCallback(async () => {
    setConfirmDialog({
      message: `Delete ${selectedIds.size} contact(s)? This cannot be undone.`,
      onConfirm: async () => {
        try {
          const token = await getAccessToken()
          // M1: Use the real bulk delete API endpoint — single request instead of N DELETEs.
          // The bulk endpoint uses DELETE with a body containing the IDs.
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/contacts/bulk`,
            {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ ids: [...selectedIds] }),
            },
          )
          if (!res.ok) throw new Error(`API error ${res.status}`)
          setSelectedIds(new Set())
          void loadContacts(page)
        } catch {
          setError('Failed to delete one or more contacts. Please try again.')
        }
      },
    })
  }, [selectedIds, loadContacts, page])

  const handleDelete = useCallback(
    async (id: string) => {
      setConfirmDialog({
        message: 'Delete this contact? This cannot be undone.',
        onConfirm: async () => {
          const token = await getAccessToken()
          await apiDelete(`/contacts/${id}`, token)
          void loadContacts(page)
        },
      })
    },
    [loadContacts, page],
  )

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your leads and connections.</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/api/export/contacts"
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </a>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Add Contact
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Tag filter */}
        {allTags.length > 0 && (
          <div className="relative">
            <Tag className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white py-2 pl-8 pr-3 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All tags</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Sort */}
        <div className="relative">
          <ArrowUpDown className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'name' | 'stage')}
            className="rounded-lg border border-gray-300 bg-white py-2 pl-8 pr-3 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none"
          >
            <option value="date">Newest first</option>
            <option value="name">Name A–Z</option>
            <option value="stage">By stage</option>
          </select>
        </div>

        {/* Stage filters */}
        <div className="flex flex-wrap gap-1.5">
          {['ALL', ...STAGES].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleStageFilter(s)}
              className={[
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                stageFilter === s
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              ].join(' ')}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
          <span className="text-sm font-medium text-indigo-700">{selectedIds.size} selected</span>
          <select
            value={bulkStage}
            onChange={(e) => setBulkStage(e.target.value)}
            className="rounded-md border border-indigo-300 bg-white px-2 py-1.5 text-sm text-gray-700"
          >
            <option value="">Change stage...</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {bulkStage && (
            <button
              type="button"
              onClick={() => void handleBulkStageChange()}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Apply
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleBulkDelete()}
            className="flex items-center gap-1.5 rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      )}

      {/* Error */}
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-gray-100" />
            ))}
          </div>
        ) : displayedContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="mb-4 h-12 w-12 text-gray-300" />
            {total === 0 && !search && stageFilter === 'ALL' && !tagFilter ? (
              <>
                <p className="text-sm font-medium text-gray-700">No contacts yet</p>
                <p className="mt-1 text-sm text-gray-400">
                  Add your first contact or share your card to start capturing leads.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-700">No results found</p>
                <p className="mt-1 text-sm text-gray-400">Try adjusting your search or filter.</p>
              </>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === contacts.length && contacts.length > 0}
                    onChange={selectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 hidden md:table-cell">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 hidden lg:table-cell">
                  Source Card
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 hidden lg:table-cell">
                  Date Added
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Stage
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayedContacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(contact.id)}
                      onChange={() => toggleSelect(contact.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3" onClick={() => setDrawerContactId(contact.id)}>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white">
                        {getInitials(contact.name)}
                      </div>
                      <span className="font-medium text-gray-900">{contact.name}</span>
                    </div>
                  </td>
                  <td
                    className="px-4 py-3 text-gray-500"
                    onClick={() => setDrawerContactId(contact.id)}
                  >
                    {contact.email ?? '—'}
                  </td>
                  <td
                    className="px-4 py-3 text-gray-500 hidden md:table-cell"
                    onClick={() => setDrawerContactId(contact.id)}
                  >
                    {contact.company ?? '—'}
                  </td>
                  <td
                    className="px-4 py-3 hidden lg:table-cell"
                    onClick={() => setDrawerContactId(contact.id)}
                  >
                    {contact.sourceCard ? (
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                        /{contact.sourceCard.handle}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td
                    className="px-4 py-3 text-gray-500 hidden lg:table-cell"
                    onClick={() => setDrawerContactId(contact.id)}
                  >
                    {new Date(contact.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3" onClick={() => setDrawerContactId(contact.id)}>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_BADGE[(contact.crmPipeline?.stage as Stage) ?? 'NEW'] ?? ''}`}
                    >
                      {contact.crmPipeline?.stage ?? 'NEW'}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => void handleDelete(contact.id)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
              onClick={() => void loadContacts(page - 1)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => void loadContacts(page + 1)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddModal && (
        <AddContactModal
          cards={cards}
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            setShowAddModal(false)
            void loadContacts(1)
          }}
        />
      )}

      {/* Contact Detail Drawer */}
      <ContactDetailDrawer
        contactId={drawerContactId}
        onClose={() => setDrawerContactId(null)}
        onUpdate={(updated) => {
          setContacts((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)))
        }}
      />

      {/* Confirm Delete Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={() => {
            void confirmDialog.onConfirm()
            setConfirmDialog(null)
          }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  )
}

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string
  onConfirm: () => void
  onCancel: () => void
}): JSX.Element {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onCancel} />
      <div className="fixed inset-x-4 top-1/2 z-50 w-full max-w-sm -translate-y-1/2 rounded-xl bg-white p-6 shadow-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900">Confirm deletion</h3>
            <p className="mt-1 text-sm text-gray-500">{message}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </>
  )
}

function AddContactModal({
  cards,
  onClose,
  onCreated,
}: {
  cards: CardSummary[]
  onClose: () => void
  onCreated: () => void
}): JSX.Element {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [title, setTitle] = useState('')
  const [website, setWebsite] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState('')
  const [sourceCardId, setSourceCardId] = useState('')
  const [stage, setStage] = useState<Stage>('NEW')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputCls =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const token = await getAccessToken()
      const parsedTags = tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
      await apiPost<ContactDetail>(
        '/contacts',
        {
          name,
          email: email || undefined,
          phone: phone || undefined,
          company: company || undefined,
          title: title || undefined,
          website: website || undefined,
          address: address || undefined,
          notes: notes || undefined,
          tags: parsedTags.length > 0 ? parsedTags : undefined,
          sourceCardId: sourceCardId || undefined,
          stage,
        },
        token,
      )
      onCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create contact')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 z-50 w-full max-w-md -translate-y-1/2 overflow-y-auto max-h-[90vh] rounded-xl bg-white p-6 shadow-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Add Contact</h2>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3">
          <input
            required
            placeholder="Full Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
          <input
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputCls}
          />
          <input
            placeholder="Company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className={inputCls}
          />
          <input
            placeholder="Job Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputCls}
          />
          <input
            placeholder="Website (https://...)"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className={inputCls}
          />
          <input
            placeholder="Address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={inputCls}
          />
          <textarea
            placeholder="Notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputCls}
          />
          <input
            placeholder="Tags (comma-separated)"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className={inputCls}
          />
          <select
            value={sourceCardId}
            onChange={(e) => setSourceCardId(e.target.value)}
            className={inputCls}
          >
            <option value="">No source card</option>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                /{c.handle}
              </option>
            ))}
          </select>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value as Stage)}
            className={inputCls}
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Contact'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
