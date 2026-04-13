'use client'

import type { JSX } from 'react'
import { useRef } from 'react'

import { StatusNotice } from '@/components/ui/StatusNotice'
import { SelectField } from '@/components/ui/SelectField'
import { ContactDetailDrawer } from '@/components/crm/ContactDetailDrawer'
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap'
import { formatDate } from '@/lib/tz'
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Inbox,
  Search,
  Trash2,
} from 'lucide-react'

import { LEADS_LIMIT, timeAgo } from './helpers'
import type { CardSummary, LeadSubmission } from './types'

export function LeadsHeader({
  cardFilter,
  cards,
  onCardFilter,
  onExport,
}: {
  cardFilter: string
  cards: CardSummary[]
  onCardFilter: (cardId: string) => void
  onExport: () => void
}): JSX.Element {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-slate-200/60 bg-white/60 p-4 sm:p-6 backdrop-blur-xl mb-6 shadow-sm">
      {/* Background glows */}
                  <div className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #94a3b8 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50/50 px-3 py-1 shadow-inner backdrop-blur-sm mb-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600">Lead Generation</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Lead <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">Submissions</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm font-medium text-slate-500 sm:text-base">
            All form submissions captured right from your public card pages. Turn interactions into opportunities.
          </p>
        </div>
        
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative min-w-[160px]">
            <SelectField
              value={cardFilter}
              onChange={(event) => onCardFilter(event.target.value)}
              className="w-full appearance-none rounded-2xl border border-slate-200/60 bg-white/60 px-4 py-3.5 text-sm font-bold text-slate-900 transition-all hover:bg-white focus:border-violet-500 focus:bg-white focus:ring-[3px] focus:ring-violet-500/20 sm:w-auto"
            >
              <option value="" className="text-gray-900 bg-white">All cards</option>
              {cards.map((card) => (
                <option key={card.id} value={card.id} className="text-gray-900 bg-white">
                  /{card.handle}
                </option>
              ))}
            </SelectField>
          </div>

          <button
            type="button"
            onClick={onExport}
            className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-white px-5 py-3.5 text-sm font-bold text-slate-900 shadow-lg transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-violet-100 to-indigo-100 opacity-0 transition-opacity group-hover:opacity-100" />
            <Download className="relative z-10 h-4 w-4" />
            <span className="relative z-10">Export CSV</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export function LeadsToolbar({
  search,
  total,
  onSearchChange,
}: {
  search: string
  total: number
  onSearchChange: (value: string) => void
}): JSX.Element {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="relative w-full min-w-0 flex-1 sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="w-full rounded-2xl border border-slate-200/60 bg-white/60 py-3.5 pr-4 pl-12 text-sm font-medium text-slate-900 shadow-sm transition-all backdrop-blur-xl placeholder:text-slate-400 hover:bg-white focus:border-violet-500 focus:bg-white focus:ring-[3px] focus:ring-violet-500/20"
        />
      </div>
      <span className="text-sm text-gray-500">{total.toLocaleString()} total</span>
    </div>
  )
}

export function LeadsBulkActions({
  selectedCount,
  onDelete,
  onClear,
}: {
  selectedCount: number
  onDelete: () => void
  onClear: () => void
}): JSX.Element | null {
  if (selectedCount === 0) return null

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-rose-200/50 bg-rose-50/50 px-6 py-4 backdrop-blur-md shadow-sm sm:flex-row sm:flex-wrap sm:items-center">
      <span className="text-sm font-medium text-red-700">{selectedCount} selected</span>
      <button
        type="button"
        onClick={onDelete}
        className="app-touch-target inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider text-rose-600 shadow-sm ring-1 ring-inset ring-rose-200 transition-all hover:bg-rose-50 hover:shadow-md active:scale-95"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete selected
      </button>
      <button
        type="button"
        onClick={onClear}
        className="app-touch-target text-left text-sm text-gray-500 hover:underline sm:ml-auto"
      >
        Clear
      </button>
    </div>
  )
}

export function LeadsContent({
  loading,
  error,
  hasLoadedOnce,
  submissions,
  selectedIds,
  search,
  cardFilter,
  page,
  userTz,
  onRetry,
  onSelectAll,
  onToggleSelect,
  onOpenContact,
}: {
  loading: boolean
  error: string | null
  hasLoadedOnce: boolean
  submissions: LeadSubmission[]
  selectedIds: Set<string>
  search: string
  cardFilter: string
  page: number
  userTz?: string | null
  onRetry: () => void
  onSelectAll: () => void
  onToggleSelect: (id: string) => void
  onOpenContact: (contactId: string) => void
}): JSX.Element {
  return (
    <div className="app-table-shell overflow-x-auto">
      {loading ? (
        <div className="space-y-3 p-4">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="app-list-skeleton h-14 animate-pulse" />
          ))}
        </div>
      ) : error && !hasLoadedOnce ? (
        <div className="app-empty-state py-16">
          <Inbox className="mb-4 h-12 w-12 text-gray-300" />
          <p className="text-sm font-medium text-gray-700">Lead submissions are unavailable</p>
          <p className="mt-1 text-sm text-gray-400">{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      ) : submissions.length === 0 ? (
        <div className="app-empty-state py-16">
          <Inbox className="mb-4 h-12 w-12 text-gray-300" />
          <p className="text-sm font-medium text-gray-700">
            {search.trim() || cardFilter
              ? 'No lead submissions match your filters'
              : 'No lead submissions yet'}
          </p>
          <p className="mt-1 text-sm text-gray-400">
            {search.trim() || cardFilter
              ? 'Try adjusting your search or selected card.'
              : 'Share your card and leads will appear here when people fill out your form.'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3 p-4 md:hidden">
            <div className="group relative flex items-center justify-between rounded-2xl border border-slate-200/60 bg-white/60 p-5 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)]">
              <span className="text-sm font-medium text-gray-700">Visible submissions</span>
              <label className="flex items-center gap-2 text-sm text-gray-500">
                <input
                  type="checkbox"
                  checked={selectedIds.size === submissions.length && submissions.length > 0}
                  onChange={onSelectAll}
                  className="rounded border-gray-300"
                />
                Select all
              </label>
            </div>

            {submissions.map((submission) => (
              <div key={submission.id} className="app-panel rounded-[24px] p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(submission.id)}
                    onChange={() => onToggleSelect(submission.id)}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300"
                    aria-label={`Select submission ${submission.id}`}
                  />
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {submission.contact ? (
                          <>
                            <p className="truncate text-base font-semibold text-gray-900">
                              {submission.contact.name}
                            </p>
                            {submission.contact.email && (
                              <p className="truncate text-sm text-gray-500">
                                {submission.contact.email}
                              </p>
                            )}
                            {submission.contact.phone && (
                              <p className="truncate text-sm text-gray-400">
                                {submission.contact.phone}
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="text-sm italic text-gray-400">No contact linked</span>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                        {timeAgo(submission.submittedAt, userTz)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      {submission.cardHandle && (
                        <span className="rounded-full bg-violet-100/50 px-3 py-1 font-bold text-violet-700 ring-1 ring-inset ring-violet-500/20">
                          /{submission.cardHandle}
                        </span>
                      )}
                      {submission.leadFormTitle && (
                        <span className="rounded-full bg-slate-100/50 px-3 py-1 font-bold text-slate-600 ring-1 ring-inset ring-slate-500/10">
                          {submission.leadFormTitle}
                        </span>
                      )}
                    </div>

                    <div className="rounded-2xl bg-slate-50/80 p-4 ring-1 ring-inset ring-slate-100">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-400">
                        Submitted Answers
                      </p>
                      <div className="mt-2 space-y-1.5">
                        {Object.entries(submission.answers ?? {})
                          .slice(0, 3)
                          .map(([key, value]) => (
                            <p key={key} className="text-sm text-gray-600">
                              <span className="font-medium text-gray-400">{key}:</span>{' '}
                              {String(value)}
                            </p>
                          ))}
                        {Object.keys(submission.answers ?? {}).length > 3 && (
                          <p className="text-xs text-gray-400">
                            +{Object.keys(submission.answers).length - 3} more answers
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-gray-500">
                        Submitted {formatDate(submission.submittedAt, userTz ?? undefined)}
                      </p>
                      {submission.contact ? (
                        <button
                          type="button"
                          onClick={() => onOpenContact(submission.contact!.id)}
                          className="app-touch-target inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider text-violet-600 shadow-sm ring-1 ring-inset ring-violet-200 transition-all hover:bg-violet-50 hover:shadow-md active:scale-95"
                        >
                          View in CRM
                          <ExternalLink className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:block">
            <table className="app-table">
              <thead className="bg-slate-50/80 backdrop-blur-sm">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === submissions.length && submissions.length > 0}
                      onChange={onSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Contact
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 md:table-cell">
                    Card / Form
                  </th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 lg:table-cell">
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
                {submissions.map((submission) => (
                  <tr key={submission.id} className="transition-colors hover:bg-slate-50/60">
                    <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(submission.id)}
                        onChange={() => onToggleSelect(submission.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      {submission.contact ? (
                        <div>
                          <p className="font-medium text-gray-900">{submission.contact.name}</p>
                          {submission.contact.email && (
                            <p className="text-xs text-gray-500">{submission.contact.email}</p>
                          )}
                          {submission.contact.phone && (
                            <p className="text-xs text-gray-400">{submission.contact.phone}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs italic text-gray-400">No contact linked</span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">
                      <div className="space-y-0.5">
                        {submission.cardHandle && (
                          <span className="inline-block rounded-full bg-violet-100/50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-violet-700 ring-1 ring-inset ring-violet-500/20">
                            /{submission.cardHandle}
                          </span>
                        )}
                        {submission.leadFormTitle && (
                          <p className="text-xs text-gray-500">{submission.leadFormTitle}</p>
                        )}
                      </div>
                    </td>
                    <td className="hidden max-w-xs px-4 py-3 lg:table-cell">
                      <div className="space-y-1">
                        {Object.entries(submission.answers ?? {})
                          .slice(0, 3)
                          .map(([key, value]) => (
                            <p key={key} className="truncate text-xs text-gray-600">
                              <span className="font-medium text-gray-400">{key}:</span>{' '}
                              {String(value)}
                            </p>
                          ))}
                        {Object.keys(submission.answers ?? {}).length > 3 && (
                          <p className="text-xs text-gray-400">
                            +{Object.keys(submission.answers).length - 3} more
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                      {timeAgo(submission.submittedAt, userTz)}
                    </td>
                    <td className="px-4 py-3">
                      {submission.contact ? (
                        <button
                          type="button"
                          onClick={() => onOpenContact(submission.contact!.id)}
                          className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                        >
                          View
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export function LeadsPagination({
  page,
  total,
  totalPages,
  onPrevious,
  onNext,
}: {
  page: number
  total: number
  totalPages: number
  onPrevious: () => void
  onNext: () => void
}): JSX.Element | null {
  if (totalPages <= 1) return null

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-gray-500">
        Showing {(page - 1) * LEADS_LIMIT + 1}-{Math.min(page * LEADS_LIMIT, total)} of {total}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={page === 1}
          onClick={onPrevious}
          className="app-touch-target flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider text-slate-600 shadow-sm ring-1 ring-inset ring-slate-200 transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95 disabled:pointer-events-none disabled:opacity-50 sm:flex-none"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>
        <button
          type="button"
          disabled={page === totalPages}
          onClick={onNext}
          className="app-touch-target flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[13px] font-bold uppercase tracking-wider text-slate-600 shadow-sm ring-1 ring-inset ring-slate-200 transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95 disabled:pointer-events-none disabled:opacity-50 sm:flex-none"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export function LeadsConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}): JSX.Element {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  useDialogFocusTrap({
    active: true,
    containerRef: dialogRef,
    initialFocusRef: cancelButtonRef,
    onEscape: onCancel,
  })

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-md transition-all" onClick={onCancel} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="leads-confirm-dialog-title"
        className="app-confirm-panel"
      >
        <h3 id="leads-confirm-dialog-title" className="text-sm font-semibold text-gray-900">
          {title}
        </h3>
        <p className="mt-1 text-sm text-gray-600">{message}</p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="app-touch-target rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="app-touch-target rounded-2xl bg-rose-500 px-5 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-rose-600 hover:shadow-lg"
          >
            Delete
          </button>
        </div>
      </div>
    </>
  )
}

export function LeadsDrawer({
  drawerContactId,
  onClose,
}: {
  drawerContactId: string | null
  onClose: () => void
}): JSX.Element {
  return <ContactDetailDrawer contactId={drawerContactId} onClose={onClose} />
}
