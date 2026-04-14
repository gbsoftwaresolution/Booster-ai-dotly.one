'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { JSX } from 'react'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { SelectField } from '@/components/ui/SelectField'
import { StatusNotice } from '@/components/ui/StatusNotice'
import { ContactDetailDrawer, type ContactDetail } from '@/components/crm/ContactDetailDrawer'
import { useUserTimezone } from '@/hooks/useUserLocale'
import { Search, Tag, ArrowUpDown, X } from 'lucide-react'
import {
  AddContactModal,
  ConfirmDialog,
  ContactsBulkActionBar,
  ContactsHeader,
  ContactsTableSection,
  ImportCsvModal,
} from './components'
import { FORM_CONTROL_CLASS, STAGE_DOT, STAGE_FILTER_ACTIVE } from './helpers'
import {
  useBulkContactActions,
  useContactSelection,
  useContactsLoader,
  useContactsMetadata,
  useContactsOverlays,
  useContactsPageActions,
  useContactsQueryState,
} from './hooks'
import type { ConfirmDialogState, ContactRow, ContactsSortBy, Stage } from './types'
import { STAGES } from './types'

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ContactsPage(): JSX.Element {
  const router = useRouter()
  const searchParams = useSearchParams()
  const userTz = useUserTimezone()
  const [contacts, setContacts] = useState<ContactRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const {
    search,
    setSearch,
    stageFilter,
    setStageFilter,
    tagFilter,
    setTagFilter,
    sortBy,
    setSortBy,
  } = useContactsQueryState(searchParams)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)

  const { cards, allTags, metadataError } = useContactsMetadata()
  const overlays = useContactsOverlays()

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const displayedContacts = contacts
  const selectionState = useContactSelection(displayedContacts)

  const syncQuery = useCallback(
    (
      next: Partial<{
        page: number
        search: string
        stage: string
        tag: string
        sortBy: ContactsSortBy
      }>,
    ) => {
      const params = new URLSearchParams(searchParams.toString())
      const nextPage = next.page ?? page
      const nextSearch = next.search ?? search
      const nextStage = next.stage ?? stageFilter
      const nextTag = next.tag ?? tagFilter
      const nextSort = next.sortBy ?? sortBy

      if (nextPage > 1) params.set('page', String(nextPage))
      else params.delete('page')
      if (nextSearch.trim()) params.set('search', nextSearch.trim())
      else params.delete('search')
      if (nextStage !== 'ALL') params.set('stage', nextStage)
      else params.delete('stage')
      if (nextTag) params.set('tag', nextTag)
      else params.delete('tag')
      if (nextSort !== 'date') params.set('sortBy', nextSort)
      else params.delete('sortBy')

      const query = params.toString()
      router.replace(query ? `?${query}` : window.location.pathname, { scroll: false })
    },
    [page, router, search, searchParams, sortBy, stageFilter, tagFilter],
  )

  const { loadContacts, LIMIT } = useContactsLoader({
    searchParams,
    pruneSelection: selectionState.pruneSelection,
    setContacts,
    setTotal,
    setPage,
    setLoading,
    setError,
    setPermissionDenied,
    setHasLoadedOnce,
  })

  const bulkState = useBulkContactActions({
    selectedIds: selectionState.selectedIds,
    setSelectedIds: selectionState.setSelectedIds,
    setContacts,
    loadContacts,
    page,
    setError,
    setConfirmDialog,
  })

  useEffect(() => {
    const requestedPage = Number(searchParams.get('page') ?? '1')
    const nextPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1
    const nextSearch = searchParams.get('search') ?? ''
    const nextStage = searchParams.get('stage') ?? 'ALL'
    const nextTag = searchParams.get('tag') ?? ''
    const nextSort =
      (searchParams.get('sortBy') as 'date' | 'name' | 'stage' | 'score' | null) ?? 'date'

    setSearch(nextSearch)
    setStageFilter(nextStage)
    setTagFilter(nextTag)
    setSortBy(nextSort)
    void loadContacts(nextPage, nextSearch, nextStage, nextTag, nextSort)
  }, [loadContacts, searchParams, setSearch, setSortBy, setStageFilter, setTagFilter])

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value)
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
      searchDebounceRef.current = setTimeout(() => {
        syncQuery({ page: 1, search: value })
      }, 300)
    },
    [setSearch, syncQuery],
  )

  const handleStageFilter = useCallback(
    (stage: string) => {
      setStageFilter(stage)
      syncQuery({ page: 1, stage })
    },
    [setStageFilter, syncQuery],
  )

  const handleTagFilter = useCallback(
    (tag: string) => {
      setTagFilter(tag)
      syncQuery({ page: 1, tag })
    },
    [setTagFilter, syncQuery],
  )

  const { handleDelete, handleExportCSV, refreshDrawerContact } = useContactsPageActions({
    drawerContactId: overlays.drawerContactId,
    loadContacts,
    page,
    setConfirmDialog,
    setContacts,
    setError,
    setExportError,
  })

  const totalPages = Math.max(1, Math.ceil(total / LIMIT))
  const visibleMetrics = useMemo(() => {
    const stageCounts: Record<Stage, number> = {
      NEW: 0,
      CONTACTED: 0,
      QUALIFIED: 0,
      CLOSED: 0,
      LOST: 0,
    }
    let withEmail = 0
    let tagged = 0
    let fromCards = 0
    let qualified = 0

    for (const contact of displayedContacts) {
      if (contact.email) withEmail += 1
      if ((contact.tags?.length ?? 0) > 0) tagged += 1
      if (contact.sourceCard) fromCards += 1
      const stage = (contact.crmPipeline?.stage ?? 'NEW') as Stage
      stageCounts[stage] += 1
      if (stage === 'QUALIFIED' || stage === 'CLOSED') qualified += 1
    }

    return {
      visibleWithEmail: withEmail,
      visibleTagged: tagged,
      visibleFromCards: fromCards,
      visibleQualified: qualified,
      visibleStageCounts: stageCounts,
    }
  }, [displayedContacts])
  const {
    visibleWithEmail,
    visibleTagged,
    visibleFromCards,
    visibleQualified,
    visibleStageCounts,
  } = visibleMetrics
  const focusMessage =
    selectionState.selectedIds.size > 0
      ? `${selectionState.selectedIds.size} contact${selectionState.selectedIds.size === 1 ? '' : 's'} selected.`
      : search.trim()
        ? `${total} matching contact${total === 1 ? '' : 's'} in search.`
        : stageFilter !== 'ALL'
          ? `${total} contact${total === 1 ? '' : 's'} in ${stageFilter.toLowerCase()}.`
          : total > 0
            ? `${visibleWithEmail} ready for outreach on this page.`
            : 'Add your first contact to start your pipeline.'

  return (
    <div className="space-y-6">
      <ContactsHeader
        focusMessage={focusMessage}
        loading={loading}
        onAdd={() => overlays.setShowAddModal(true)}
        onExport={() => void handleExportCSV()}
        onImport={() => overlays.setShowImportModal(true)}
        total={total}
        visibleFromCards={visibleFromCards}
        visibleQualified={visibleQualified}
        visibleStageCounts={visibleStageCounts}
        visibleTagged={visibleTagged}
        visibleWithEmail={visibleWithEmail}
      />

      {/* Export error */}
      {exportError && (
        <StatusNotice
          message={exportError}
          action={
            <button type="button" onClick={() => setExportError(null)}>
              <X className="h-4 w-4" />
            </button>
          }
        />
      )}

      {metadataError && <StatusNotice tone="warning" message={metadataError} liveMode="polite" />}

      {/* Filters row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        {/* Search */}
        <div className="relative w-full min-w-0 flex-1 sm:min-w-[200px] sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            aria-label="Search contacts"
            placeholder="Search contacts…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className={`${FORM_CONTROL_CLASS} pl-9`}
          />
        </div>

        {/* Tag filter */}
        {allTags.length > 0 && (
          <div className="relative w-full sm:w-auto">
            <Tag className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <SelectField
              aria-label="Filter by tag"
              value={tagFilter}
              onChange={(e) => handleTagFilter(e.target.value)}
              className="sm:w-auto"
            >
              <option value="">All tags</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </SelectField>
          </div>
        )}

        {/* Sort — client-side on current page */}
        <div className="relative w-full sm:w-auto">
          <ArrowUpDown className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <SelectField
            aria-label="Sort contacts"
            value={sortBy}
            onChange={(e) => {
              const nextSort = e.target.value as 'date' | 'name' | 'stage' | 'score'
              setSortBy(nextSort)
              syncQuery({ page: 1, sortBy: nextSort })
            }}
            className="sm:w-auto"
          >
            <option value="date">Newest first</option>
            <option value="name">Name A–Z</option>
            <option value="stage">By stage</option>
            <option value="score">By score</option>
          </SelectField>
        </div>
      </div>

      {/* Stage filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {(['ALL', ...STAGES] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => handleStageFilter(s)}
            className={[
              'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
              stageFilter === s
                ? (STAGE_FILTER_ACTIVE[s] ?? 'bg-blue-600 text-white')
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            ].join(' ')}
          >
            {s !== 'ALL' && (
              <span
                className={`h-1.5 w-1.5 rounded-full ${stageFilter === s ? 'bg-white/70' : (STAGE_DOT[s as Stage] ?? 'bg-gray-400')}`}
              />
            )}
            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <ContactsBulkActionBar
        bulkEditMode={bulkState.bulkEditMode}
        bulkEditValue={bulkState.bulkEditValue}
        bulkStage={bulkState.bulkStage}
        onApplyBulkEdit={() => void bulkState.handleBulkEdit()}
        onApplyBulkStage={() => void bulkState.handleBulkStageChange()}
        onBulkDelete={() => void bulkState.handleBulkDelete()}
        onBulkEditModeChange={(value) => {
          bulkState.setBulkEditMode(value)
          bulkState.setBulkEditValue('')
        }}
        onBulkEditValueChange={bulkState.setBulkEditValue}
        onBulkStageChange={bulkState.setBulkStage}
        onClearSelection={() => selectionState.setSelectedIds(new Set())}
        selectedCount={selectionState.selectedIds.size}
      />

      {/* Error banner */}
      {permissionDenied ? (
        <StatusNotice tone="warning" message="You do not have permission to view contacts." />
      ) : error ? (
        <StatusNotice
          message={error}
          action={
            <button
              type="button"
              onClick={() => void loadContacts(page, search, stageFilter, tagFilter, sortBy)}
              aria-label="Retry loading contacts"
            >
              Retry
            </button>
          }
        />
      ) : null}

      <div>
        <ContactsTableSection
          displayedContacts={displayedContacts}
          error={error}
          hasFilters={!!search || stageFilter !== 'ALL' || !!tagFilter}
          hasLoadedOnce={hasLoadedOnce}
          loading={loading}
          onAdd={() => overlays.setShowAddModal(true)}
          onDelete={(id) => void handleDelete(id)}
          onOpenContact={overlays.setDrawerContactId}
          onRetry={() => void loadContacts(page, search, stageFilter, tagFilter, sortBy)}
          onSelectAll={selectionState.selectAll}
          onToggleSelect={selectionState.toggleSelect}
          selectedIds={selectionState.selectedIds}
          userTz={userTz ?? undefined}
        />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => syncQuery({ page: page - 1 })}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors sm:flex-none"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => syncQuery({ page: page + 1 })}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors sm:flex-none"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {overlays.showAddModal && (
        <AddContactModal
          cards={cards}
          onClose={() => overlays.setShowAddModal(false)}
          onCreated={() => {
            overlays.setShowAddModal(false)
            void loadContacts(1)
          }}
        />
      )}

      {overlays.showImportModal && (
        <ImportCsvModal
          onClose={() => overlays.setShowImportModal(false)}
          onImported={() => void loadContacts(1)}
        />
      )}

      <ContactDetailDrawer
        contactId={overlays.drawerContactId}
        onClose={() => overlays.setDrawerContactId(null)}
        onUpdate={(updated) => {
          setContacts((prev) => prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)))
        }}
        onMutate={() => {
          void refreshDrawerContact()
        }}
      />

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
