import Link from 'next/link'
import type { JSX } from 'react'
import { useEffect, useRef, useState } from 'react'
import { formatDate } from '@/lib/tz'
import { SelectField } from '@/components/ui/SelectField'
import {
  ContactDetail,
  type ContactDetail as ContactDetailType,
} from '@/components/crm/ContactDetailDrawer'
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Plus,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react'
import {
  avatarColour,
  EMAIL_REGEX,
  FORM_CONTROL_CLASS,
  getFocusableElements,
  getInitials,
  getScoreBadgeClass,
  isValidUrl,
  PHONE_REGEX,
  STAGE_BADGE,
  STAGE_DOT,
} from './helpers'
import {
  STAGES,
  type CardSummary,
  type ContactRow,
  type ImportContactsResponse,
  type Stage,
  type VisibleStageCounts,
} from './types'
import { apiPost } from '@/lib/api'
import { getAccessToken } from '@/lib/supabase/client'

export function ContactsHeader({
  focusMessage,
  loading,
  onAdd,
  onExport,
  onImport,
  total,
  visibleFromCards,
  visibleQualified,
  visibleStageCounts,
  visibleTagged,
  visibleWithEmail,
}: {
  focusMessage: string
  loading: boolean
  onAdd: () => void
  onExport: () => void
  onImport: () => void
  total: number
  visibleFromCards: number
  visibleQualified: number
  visibleStageCounts: VisibleStageCounts
  visibleTagged: number
  visibleWithEmail: number
}): JSX.Element {
  return (
    <>
      <div className="app-panel relative hidden overflow-hidden rounded-[24px] px-5 py-6 md:block md:px-8 md:py-7">
        <div
          className="absolute inset-0 opacity-90"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(circle at top left, rgba(59,130,246,0.14), transparent 34%), radial-gradient(circle at right center, rgba(168,85,247,0.10), transparent 28%), linear-gradient(135deg, rgba(255,255,255,0.94), rgba(248,250,252,0.98))',
          }}
        />
        <div className="relative grid gap-5 xl:grid-cols-[1.35fr_0.92fr] xl:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600">
              <Users className="h-3.5 w-3.5" />
              Contacts
            </div>
            <h1 className="mt-3 text-2xl font-bold text-gray-900 sm:text-[2rem]">
              Manage contacts and pipeline
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-500 sm:text-[15px]">
              Keep contacts clean, spot qualified leads, and move faster between import, follow-up,
              and pipeline work.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-xl sm:grid-cols-4">
              {[
                { label: 'Total', value: loading ? '—' : total },
                { label: 'Qualified', value: loading ? '—' : visibleQualified },
                { label: 'Tagged', value: loading ? '—' : visibleTagged },
                { label: 'Card Leads', value: loading ? '—' : visibleFromCards },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-[18px] bg-white/70 px-3 py-3 sm:rounded-[22px] sm:border sm:border-white/80 sm:bg-white/85 sm:shadow-[0_20px_40px_-32px_rgba(15,23,42,0.2)]"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-bold text-gray-900 sm:text-base">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onAdd}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_20px_40px_-28px_rgba(37,99,235,0.42)] transition-transform hover:-translate-y-0.5 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Add Contact
              </button>
              <button
                type="button"
                onClick={onImport}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Upload className="h-4 w-4 text-blue-500" />
                Import CSV
              </button>
              <button
                type="button"
                onClick={onExport}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Download className="h-4 w-4 text-violet-500" />
                Export CSV
              </button>
            </div>

            <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-medium text-gray-600 shadow-sm">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </span>
              <span className="truncate">Focus: {focusMessage}</span>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/70 bg-white/72 p-4 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.18)] sm:app-panel-subtle sm:rounded-[24px] sm:border-0 sm:bg-transparent sm:p-5 sm:shadow-none">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
                  CRM Snapshot
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">This page at a glance</p>
              </div>
              <Link
                href="/crm/analytics"
                className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-600 shadow-sm"
              >
                Analytics
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {[
                {
                  label: 'Qualified',
                  value: loading
                    ? '—'
                    : `${visibleStageCounts.QUALIFIED + visibleStageCounts.CLOSED}`,
                  detail: 'Qualified and closed in these results',
                  icon: CheckCircle2,
                  tone: 'bg-green-50 text-green-600',
                },
                {
                  label: 'Reachable',
                  value: loading ? '—' : `${visibleWithEmail}`,
                  detail: 'Visible contacts with email',
                  icon: FileText,
                  tone: 'bg-violet-50 text-violet-600',
                },
                {
                  label: 'New',
                  value: loading ? '—' : `${visibleStageCounts.NEW}`,
                  detail: 'Fresh contacts waiting for first touch',
                  icon: AlertTriangle,
                  tone: 'bg-amber-50 text-amber-600',
                },
              ].map(({ label, value, detail, icon: Icon, tone }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-[18px] bg-white/88 px-4 py-3 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.2)] sm:rounded-[24px] sm:border sm:border-white/80 sm:bg-white/80 sm:px-4 sm:shadow-none"
                >
                  <span
                    className={`${tone} flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {label}
                    </p>
                    <p className="truncate text-sm text-gray-500">{detail}</p>
                  </div>
                  <span className="shrink-0 text-lg font-bold tabular-nums text-gray-900">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        <div className="app-panel rounded-[26px] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-600">
                <Users className="h-3.5 w-3.5" />
                CRM Contacts
              </div>
              <h1 className="mt-3 text-xl font-bold text-gray-900">Contacts</h1>
              <p className="mt-1 text-sm text-gray-500">{focusMessage}</p>
            </div>
            <Link
              href="/crm/analytics"
              className="shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-blue-600"
            >
              Analytics
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: 'Total', value: loading ? '—' : total },
              { label: 'Qualified', value: loading ? '—' : visibleQualified },
              { label: 'Reachable', value: loading ? '—' : visibleWithEmail },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl bg-gray-50 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                  {label}
                </p>
                <p className="mt-1 text-base font-bold text-gray-900">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-3 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_-24px_rgba(37,99,235,0.45)]"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
          <button
            type="button"
            onClick={onImport}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm font-semibold text-gray-700"
          >
            <Upload className="h-4 w-4 text-blue-500" />
            Import
          </button>
          <button
            type="button"
            onClick={onExport}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-3 text-sm font-semibold text-gray-700"
          >
            <Download className="h-4 w-4 text-violet-500" />
            Export
          </button>
        </div>
      </div>
    </>
  )
}

export function ContactsBulkActionBar({
  bulkEditMode,
  bulkEditValue,
  bulkStage,
  onApplyBulkEdit,
  onApplyBulkStage,
  onBulkDelete,
  onBulkEditModeChange,
  onBulkEditValueChange,
  onBulkStageChange,
  onClearSelection,
  selectedCount,
}: {
  bulkEditMode: 'company' | 'tagsAdd' | 'tagsRemove' | ''
  bulkEditValue: string
  bulkStage: string
  onApplyBulkEdit: () => void
  onApplyBulkStage: () => void
  onBulkDelete: () => void
  onBulkEditModeChange: (value: 'company' | 'tagsAdd' | 'tagsRemove' | '') => void
  onBulkEditValueChange: (value: string) => void
  onBulkStageChange: (value: string) => void
  onClearSelection: () => void
  selectedCount: number
}): JSX.Element | null {
  if (selectedCount === 0) return null

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50/80 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-blue-700">{selectedCount} selected</span>
        <button
          type="button"
          onClick={onClearSelection}
          className="rounded-md p-1.5 text-blue-500 hover:bg-blue-100 sm:hidden"
          aria-label="Clear selection"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
        <div className="flex w-full flex-col sm:flex-row sm:items-center sm:gap-2">
          <SelectField
            value={bulkStage}
            onChange={(e) => onBulkStageChange(e.target.value)}
            className="sm:w-auto"
          >
            <option value="">Change stage…</option>
            {STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {stage.charAt(0) + stage.slice(1).toLowerCase()}
              </option>
            ))}
          </SelectField>
          {bulkStage && (
            <button
              type="button"
              onClick={onApplyBulkStage}
              className="mt-2 w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 sm:mt-0 sm:w-auto"
            >
              Apply
            </button>
          )}
        </div>

        <div className="flex w-full flex-col sm:flex-row sm:items-center sm:gap-2">
          <SelectField
            value={bulkEditMode}
            onChange={(e) =>
              onBulkEditModeChange(e.target.value as 'company' | 'tagsAdd' | 'tagsRemove' | '')
            }
            className="sm:w-auto"
          >
            <option value="">Bulk edit…</option>
            <option value="company">Set company</option>
            <option value="tagsAdd">Add tags</option>
            <option value="tagsRemove">Remove tags</option>
          </SelectField>
          {bulkEditMode && (
            <div className="mt-2 flex w-full flex-col sm:mt-0 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
              <input
                type="text"
                value={bulkEditValue}
                onChange={(e) => onBulkEditValueChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onApplyBulkEdit()
                }}
                placeholder={bulkEditMode === 'company' ? 'Company name' : 'Tags (comma-separated)'}
                className={`${FORM_CONTROL_CLASS} sm:w-auto`}
              />
              <button
                type="button"
                onClick={onApplyBulkEdit}
                className="mt-2 w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 sm:mt-0 sm:w-auto"
              >
                Confirm
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between sm:ml-auto sm:justify-start">
        <button
          type="button"
          onClick={onBulkDelete}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 sm:w-auto"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
        <button
          type="button"
          onClick={onClearSelection}
          className="ml-2 hidden rounded-lg p-2 text-blue-500 hover:bg-blue-100 sm:block"
          aria-label="Clear selection"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}

export function ContactsTableSection({
  displayedContacts,
  error,
  hasFilters,
  hasLoadedOnce,
  loading,
  onAdd,
  onDelete,
  onOpenContact,
  onRetry,
  onSelectAll,
  onToggleSelect,
  selectedIds,
  userTz,
}: {
  displayedContacts: ContactRow[]
  error: string | null
  hasFilters: boolean
  hasLoadedOnce: boolean
  loading: boolean
  onAdd: () => void
  onDelete: (id: string) => void
  onOpenContact: (id: string) => void
  onRetry: () => void
  onSelectAll: () => void
  onToggleSelect: (id: string) => void
  selectedIds: Set<string>
  userTz?: string | null
}): JSX.Element {
  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3, 4, 5].map((index) => (
          <div key={index} className="app-list-skeleton h-12 animate-pulse" />
        ))}
      </div>
    )
  }

  if (error && !hasLoadedOnce) {
    return (
      <div className="app-empty-state">
        <p className="app-empty-state-title">Contacts are unavailable</p>
        <p className="app-empty-state-text">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    )
  }

  if (displayedContacts.length === 0) {
    return <EmptyState hasFilters={hasFilters} onAdd={onAdd} />
  }

  return (
    <>
      <div className="space-y-3 md:hidden">
        <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <span className="text-sm font-medium text-gray-700">Visible contacts</span>
          <label className="flex items-center gap-2 text-sm text-gray-500">
            <input
              type="checkbox"
              aria-label="Select all"
              checked={
                selectedIds.size === displayedContacts.length && displayedContacts.length > 0
              }
              onChange={onSelectAll}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Select all
          </label>
        </div>

        {displayedContacts.map((contact) => {
          const stage = (contact.crmPipeline?.stage ?? 'NEW') as Stage
          return (
            <div key={contact.id} className="app-panel rounded-[24px] p-4 sm:p-5">
              <div className="flex items-start gap-3 sm:gap-4">
                <input
                  type="checkbox"
                  aria-label={`Select ${contact.name}`}
                  checked={selectedIds.has(contact.id)}
                  onChange={() => onToggleSelect(contact.id)}
                  className="mt-1.5 h-4 w-4 shrink-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => onOpenContact(contact.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ${avatarColour(contact.name)}`}
                    >
                      {getInitials(contact.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold text-gray-900">
                        {contact.name}
                      </p>
                      <p className="truncate text-sm text-gray-500">
                        {contact.email ?? contact.phone ?? 'No email or phone'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3.5 flex flex-wrap gap-1.5">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${STAGE_BADGE[stage]}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${STAGE_DOT[stage]}`} />
                      {stage.charAt(0) + stage.slice(1).toLowerCase()}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getScoreBadgeClass(contact.enrichmentScore)}`}
                    >
                      Score {contact.enrichmentScore ?? '—'}
                    </span>
                    {contact.sourceCard && (
                      <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
                        /{contact.sourceCard.handle}
                      </span>
                    )}
                  </div>

                  <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50/50 p-3 text-xs text-gray-500">
                    <div className="space-y-1">
                      <p className="flex items-center gap-1.5 text-gray-600">
                        <span className="font-medium text-gray-900">Company:</span>{' '}
                        {contact.company ?? 'None'}
                      </p>
                      {contact.tags && contact.tags.length > 0 && (
                        <p className="truncate">
                          <span className="font-medium text-gray-900">Tags:</span>{' '}
                          {contact.tags.slice(0, 2).join(', ')}
                          {contact.tags.length > 2 && ` +${contact.tags.length - 2}`}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-[11px] text-gray-400">
                      Added
                      <br />
                      {formatDate(contact.createdAt, userTz)}
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${contact.name}`}
                  onClick={() => onDelete(contact.id)}
                  className="mt-1 rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="hidden overflow-x-auto app-table-shell md:block">
        <table className="app-table">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={
                    selectedIds.size === displayedContacts.length && displayedContacts.length > 0
                  }
                  onChange={onSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Email
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 md:table-cell">
                Company
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 lg:table-cell">
                Source Card
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 lg:table-cell">
                Added
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Stage
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                Score
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayedContacts.map((contact) => {
              const stage = (contact.crmPipeline?.stage ?? 'NEW') as Stage
              return (
                <tr
                  key={contact.id}
                  className="cursor-pointer transition-colors hover:bg-blue-50/40"
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label={`Select ${contact.name}`}
                      checked={selectedIds.has(contact.id)}
                      onChange={() => onToggleSelect(contact.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onOpenContact(contact.id)}
                      className="flex w-full items-center gap-2.5 rounded-lg text-left outline-none transition-colors hover:text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColour(contact.name)}`}
                      >
                        {getInitials(contact.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">{contact.name}</p>
                        {contact.tags && contact.tags.length > 0 && (
                          <p className="truncate text-xs text-gray-400">
                            {contact.tags.slice(0, 2).join(', ')}
                            {contact.tags.length > 2 && ` +${contact.tags.length - 2}`}
                          </p>
                        )}
                      </div>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-500" onClick={() => onOpenContact(contact.id)}>
                    {contact.email ?? '—'}
                  </td>
                  <td
                    className="hidden px-4 py-3 text-gray-500 md:table-cell"
                    onClick={() => onOpenContact(contact.id)}
                  >
                    {contact.company ?? '—'}
                  </td>
                  <td
                    className="hidden px-4 py-3 lg:table-cell"
                    onClick={() => onOpenContact(contact.id)}
                  >
                    {contact.sourceCard ? (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        /{contact.sourceCard.handle}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td
                    className="hidden px-4 py-3 text-gray-500 lg:table-cell"
                    onClick={() => onOpenContact(contact.id)}
                  >
                    {formatDate(contact.createdAt, userTz)}
                  </td>
                  <td className="px-4 py-3" onClick={() => onOpenContact(contact.id)}>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_BADGE[stage]}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${STAGE_DOT[stage]}`} />
                      {stage.charAt(0) + stage.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={() => onOpenContact(contact.id)}>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getScoreBadgeClass(contact.enrichmentScore)}`}
                    >
                      {contact.enrichmentScore ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      aria-label={`Delete ${contact.name}`}
                      onClick={() => onDelete(contact.id)}
                      className="rounded p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

function EmptyState({
  hasFilters,
  onAdd,
}: {
  hasFilters: boolean
  onAdd: () => void
}): JSX.Element {
  return (
    <div className="app-empty-state py-20">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100">
        <Users className="h-8 w-8 text-gray-400" />
      </div>
      {hasFilters ? (
        <>
          <p className="text-sm font-semibold text-gray-700">No results found</p>
          <p className="mt-1 text-sm text-gray-400">Try adjusting your search or filter.</p>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-gray-800">No contacts yet</p>
          <p className="mt-1 max-w-xs text-sm text-gray-400">
            Add your first contact manually, import a CSV, or share your card to start capturing
            leads.
          </p>
          <button
            type="button"
            onClick={onAdd}
            className="mt-5 flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add your first contact
          </button>
        </>
      )}
    </div>
  )
}

export function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string
  onConfirm: () => void
  onCancel: () => void
}): JSX.Element {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousActiveElementRef.current = document.activeElement as HTMLElement | null
    cancelButtonRef.current?.focus()

    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
        return
      }

      if (e.key !== 'Tab' || !dialogRef.current) return
      const focusable = getFocusableElements(dialogRef.current)
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }

    document.addEventListener('keydown', handle)
    return () => {
      document.removeEventListener('keydown', handle)
      previousActiveElementRef.current?.focus()
    }
  }, [onCancel])

  return (
    <>
      <ModalBackdrop onClick={onCancel} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5 shadow-2xl sm:hidden"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300" />
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Confirm deletion</p>
            <p className="mt-1 text-sm text-gray-500">{message}</p>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onConfirm}
            className="w-full rounded-xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={onCancel}
            ref={cancelButtonRef}
            className="w-full rounded-xl border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        className="fixed inset-x-4 top-1/2 z-50 hidden w-full max-w-sm -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl sm:block sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
      >
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
            ref={cancelButtonRef}
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

export function AddContactModal({
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
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<'name' | 'email' | 'phone' | 'website' | 'notes', string>>
  >({})

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [onClose])

  const inputCls = FORM_CONTROL_CLASS.replace('text-gray-700', 'text-gray-900')
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1'

  const getInputClass = (field: keyof typeof fieldErrors) =>
    `${inputCls} ${fieldErrors[field] ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : ''}`

  const setFieldValue = (
    field: keyof typeof fieldErrors,
    setter: (value: string) => void,
    value: string,
  ) => {
    setter(value)
    setFieldErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const trimmedPhone = phone.trim()
    const trimmedCompany = company.trim()
    const trimmedTitle = title.trim()
    const trimmedWebsite = website.trim()
    const trimmedAddress = address.trim()
    const trimmedNotes = notes.trim()
    const nextFieldErrors: Partial<
      Record<'name' | 'email' | 'phone' | 'website' | 'notes', string>
    > = {}

    if (!trimmedName) nextFieldErrors.name = 'Full name is required.'
    else if (trimmedName.length < 2)
      nextFieldErrors.name = 'Full name must be at least 2 characters.'
    else if (trimmedName.length > 120)
      nextFieldErrors.name = 'Full name must be 120 characters or less.'

    if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail))
      nextFieldErrors.email = 'Enter a valid email address.'
    if (trimmedPhone && !PHONE_REGEX.test(trimmedPhone))
      nextFieldErrors.phone = 'Enter a valid phone number.'

    if (trimmedWebsite && !isValidUrl(trimmedWebsite)) {
      nextFieldErrors.website = 'Enter a valid website URL starting with http:// or https://.'
    } else if (trimmedWebsite.length > 500) {
      nextFieldErrors.website = 'Website must be 500 characters or less.'
    }

    if (trimmedNotes.length > 1000) nextFieldErrors.notes = 'Notes must be 1000 characters or less.'

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      setError('Fix the highlighted fields before submitting.')
      return
    }

    setFieldErrors({})
    setSubmitting(true)
    setError(null)
    try {
      const token = await getAccessToken()
      const parsedTags = tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
      await apiPost<ContactDetailType>(
        '/contacts',
        {
          name: trimmedName,
          email: trimmedEmail || undefined,
          phone: trimmedPhone || undefined,
          company: trimmedCompany || undefined,
          title: trimmedTitle || undefined,
          website: trimmedWebsite || undefined,
          address: trimmedAddress || undefined,
          notes: trimmedNotes || undefined,
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

  const inner = (
    <div className="overflow-y-auto" style={{ maxHeight: '80vh' }}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Add Contact</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <form noValidate onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="ac-name" className={labelCls}>
              Full name <span className="text-red-500">*</span>
            </label>
            <input
              id="ac-name"
              required
              minLength={2}
              maxLength={120}
              autoComplete="name"
              placeholder="Jane Doe"
              value={name}
              onChange={(e) => setFieldValue('name', setName, e.target.value)}
              aria-invalid={fieldErrors.name ? 'true' : 'false'}
              aria-describedby={fieldErrors.name ? 'ac-name-error' : undefined}
              className={getInputClass('name')}
            />
            {fieldErrors.name && (
              <p id="ac-name-error" className="mt-1 text-xs text-red-600">
                {fieldErrors.name}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="ac-email" className={labelCls}>
              Email
            </label>
            <input
              id="ac-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="jane@example.com"
              value={email}
              maxLength={254}
              onChange={(e) => setFieldValue('email', setEmail, e.target.value)}
              aria-invalid={fieldErrors.email ? 'true' : 'false'}
              aria-describedby={fieldErrors.email ? 'ac-email-error' : undefined}
              className={getInputClass('email')}
            />
            {fieldErrors.email && (
              <p id="ac-email-error" className="mt-1 text-xs text-red-600">
                {fieldErrors.email}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="ac-phone" className={labelCls}>
              Phone
            </label>
            <input
              id="ac-phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="+1 555 0100"
              value={phone}
              maxLength={20}
              onChange={(e) => setFieldValue('phone', setPhone, e.target.value)}
              aria-invalid={fieldErrors.phone ? 'true' : 'false'}
              aria-describedby={fieldErrors.phone ? 'ac-phone-error' : undefined}
              className={getInputClass('phone')}
            />
            {fieldErrors.phone && (
              <p id="ac-phone-error" className="mt-1 text-xs text-red-600">
                {fieldErrors.phone}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="ac-company" className={labelCls}>
              Company
            </label>
            <input
              id="ac-company"
              autoComplete="organization"
              maxLength={120}
              placeholder="Acme Inc."
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="ac-title" className={labelCls}>
              Job title
            </label>
            <input
              id="ac-title"
              autoComplete="organization-title"
              maxLength={120}
              placeholder="Founder"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="ac-website" className={labelCls}>
              Website
            </label>
            <input
              id="ac-website"
              type="url"
              inputMode="url"
              placeholder="https://acme.com"
              value={website}
              maxLength={500}
              onChange={(e) => setFieldValue('website', setWebsite, e.target.value)}
              aria-invalid={fieldErrors.website ? 'true' : 'false'}
              aria-describedby={fieldErrors.website ? 'ac-website-error' : undefined}
              className={getInputClass('website')}
            />
            {fieldErrors.website && (
              <p id="ac-website-error" className="mt-1 text-xs text-red-600">
                {fieldErrors.website}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="ac-address" className={labelCls}>
              Address
            </label>
            <input
              id="ac-address"
              autoComplete="street-address"
              maxLength={200}
              placeholder="New York, NY"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="ac-stage" className={labelCls}>
              Stage
            </label>
            <SelectField
              id="ac-stage"
              value={stage}
              onChange={(e) => setStage(e.target.value as Stage)}
              className=""
            >
              {STAGES.map((value) => (
                <option key={value} value={value}>
                  {value.charAt(0) + value.slice(1).toLowerCase()}
                </option>
              ))}
            </SelectField>
          </div>
          <div>
            <label htmlFor="ac-source" className={labelCls}>
              Source card
            </label>
            <SelectField
              id="ac-source"
              value={sourceCardId}
              onChange={(e) => setSourceCardId(e.target.value)}
              className=""
            >
              <option value="">None</option>
              {cards.map((card) => (
                <option key={card.id} value={card.id}>
                  /{card.handle}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="ac-tags" className={labelCls}>
              Tags <span className="text-gray-400">(comma-separated)</span>
            </label>
            <input
              id="ac-tags"
              placeholder="prospect, warm-lead"
              maxLength={300}
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="ac-notes" className={labelCls}>
              Notes
            </label>
            <textarea
              id="ac-notes"
              rows={3}
              maxLength={1000}
              placeholder="Anything worth remembering…"
              value={notes}
              onChange={(e) => setFieldValue('notes', setNotes, e.target.value)}
              aria-invalid={fieldErrors.notes ? 'true' : 'false'}
              aria-describedby={fieldErrors.notes ? 'ac-notes-error' : 'ac-notes-help'}
              className={getInputClass('notes')}
            />
            <div className="mt-1 flex items-center justify-between gap-2 text-xs">
              <span id="ac-notes-help" className="text-gray-400">
                Optional notes for internal context.
              </span>
              <span className={notes.length > 1000 ? 'text-red-600' : 'text-gray-400'}>
                {notes.length}/1000
              </span>
            </div>
            {fieldErrors.notes && (
              <p id="ac-notes-error" className="mt-1 text-xs text-red-600">
                {fieldErrors.notes}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create Contact'}
          </button>
        </div>
      </form>
    </div>
  )

  return (
    <>
      <ModalBackdrop onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-4 shadow-2xl sm:hidden">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300" />
        {inner}
      </div>
      <div className="fixed inset-x-4 top-1/2 z-50 hidden w-full max-w-lg -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl sm:block sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2">
        {inner}
      </div>
    </>
  )
}

export function ImportCsvModal({
  onClose,
  onImported,
}: {
  onClose: () => void
  onImported: () => void
}): JSX.Element {
  const [csv, setCsv] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportContactsResponse | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [onClose])

  const readFile = (file: File) => {
    if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
      setError('Please select a .csv file')
      return
    }
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (evt) => {
      setCsv((evt.target?.result as string) ?? '')
      setResult(null)
      setError(null)
    }
    reader.onerror = () => setError('Failed to read file')
    reader.readAsText(file, 'utf-8')
  }

  const handleImport = async () => {
    if (!csv.trim()) return
    setSubmitting(true)
    setError(null)
    setResult(null)
    try {
      const token = await getAccessToken()
      const response = await apiPost<ImportContactsResponse>('/contacts/import', { csv }, token)
      setResult(response)
      onImported()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import contacts')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <ModalBackdrop onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 z-50 w-full max-w-lg -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Import Contacts</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 space-y-4">
          <div
            role="button"
            tabIndex={0}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              const file = e.dataTransfer.files?.[0]
              if (file) readFile(file)
            }}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            className={[
              'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors',
              dragging
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50',
            ].join(' ')}
          >
            <FileText className={`mb-2 h-8 w-8 ${dragging ? 'text-blue-500' : 'text-gray-400'}`} />
            {fileName ? (
              <p className="text-sm font-medium text-blue-700">{fileName}</p>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-700">Drop your CSV here</p>
                <p className="mt-0.5 text-xs text-gray-400">or click to browse</p>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) readFile(file)
              }}
            />
          </div>
          <div>
            <label
              className="mb-1 block text-xs font-medium text-gray-600"
              htmlFor="import-csv-paste"
            >
              Or paste CSV content
            </label>
            <textarea
              id="import-csv-paste"
              rows={5}
              value={csv}
              onChange={(e) => {
                setCsv(e.target.value)
                setFileName(null)
                setResult(null)
                setError(null)
              }}
              placeholder={
                'name,email,phone,company,title\nJane Doe,jane@example.com,+1-555-0100,Acme,Founder'
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs text-gray-700 focus:border-blue-500 focus:outline-none"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {result && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
              Created {result.created} contact{result.created !== 1 ? 's' : ''}, skipped{' '}
              {result.skipped} duplicate{result.skipped !== 1 ? 's' : ''}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-gray-300 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              {result ? 'Done' : 'Cancel'}
            </button>
            {!result && (
              <button
                type="button"
                disabled={submitting || !csv.trim()}
                onClick={() => void handleImport()}
                className="flex-1 rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Importing…' : 'Import'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export function ModalBackdrop({
  onClick,
  tone = 'default',
}: {
  onClick?: () => void
  tone?: 'default' | 'drawer'
}): JSX.Element {
  return (
    <div
      className={
        tone === 'drawer'
          ? 'fixed inset-0 z-40 bg-black/40 backdrop-blur-sm'
          : 'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm'
      }
      onClick={onClick}
      aria-hidden="true"
    />
  )
}
