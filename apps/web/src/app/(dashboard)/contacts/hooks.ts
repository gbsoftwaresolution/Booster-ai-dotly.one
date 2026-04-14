import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import type { ItemsResponse } from '@dotly/types'
import { apiDelete, apiDeleteWithBody, apiGet, apiPatch, ApiError, isApiError } from '@/lib/api'
import { readCachedData, saveCachedData } from '@/lib/pwa/cache'
import { incrementPwaMetric } from '@/lib/pwa/metrics'
import { enqueueContactBulkStageMutation } from '@/lib/pwa/queue'
import { getAccessToken } from '@/lib/supabase/client'
import type {
  CardSummary,
  ConfirmDialogState,
  ContactRow,
  ContactsResponse,
  ContactsSortBy,
} from './types'

export function useContactsMetadata() {
  const [cards, setCards] = useState<CardSummary[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [metadataError, setMetadataError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void (async () => {
      try {
        const token = await getAccessToken()
        const [cardsData, tagsData] = await Promise.all([
          apiGet<ItemsResponse<CardSummary>>('/cards', token),
          apiGet<string[]>('/contacts/tags', token),
        ])
        if (!active) return
        setCards(cardsData.items)
        setAllTags(tagsData)
        saveCachedData('contacts:metadata', { cards: cardsData.items, allTags: tagsData })
        setMetadataError(null)
      } catch (err) {
        if (!active) return
        const cached = readCachedData<{ cards: CardSummary[]; allTags: string[] }>('contacts:metadata')
        if (cached) {
          setCards(cached.data.cards)
          setAllTags(cached.data.allTags)
          setMetadataError('Showing last synced filters while offline.')
        } else {
          setMetadataError(
            err instanceof Error ? err.message : 'Could not load filters and source cards.',
          )
        }
      }
    })()
    return () => {
      active = false
    }
  }, [])

  return { cards, allTags, metadataError }
}

export function useBulkContactActions({
  selectedIds,
  setSelectedIds,
  setContacts,
  loadContacts,
  page,
  setError,
  setConfirmDialog,
}: {
  selectedIds: Set<string>
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>
  setContacts: React.Dispatch<React.SetStateAction<ContactRow[]>>
  loadContacts: (
    p?: number,
    s?: string,
    stage?: string,
    tag?: string,
    sort?: ContactsSortBy,
  ) => Promise<void>
  page: number
  setError: React.Dispatch<React.SetStateAction<string | null>>
  setConfirmDialog: React.Dispatch<React.SetStateAction<ConfirmDialogState | null>>
}) {
  const [bulkStage, setBulkStage] = useState<string>('')
  const [bulkEditMode, setBulkEditMode] = useState<'company' | 'tagsAdd' | 'tagsRemove' | ''>('')
  const [bulkEditValue, setBulkEditValue] = useState('')

  const handleBulkStageChange = useCallback(async () => {
    if (!bulkStage || selectedIds.size === 0) return
    setError(null)
    try {
      const token = await getAccessToken()
      await apiPatch('/contacts/bulk-stage', { ids: [...selectedIds], stage: bulkStage }, token)
      setSelectedIds(new Set())
      setBulkStage('')
      void loadContacts(page)
    } catch (err) {
      if (!navigator.onLine || (isApiError(err) && err.statusCode === 0)) {
        const queuedCount = enqueueContactBulkStageMutation({
          ids: [...selectedIds],
          stage: bulkStage,
        })
        setContacts((prev) =>
          prev.map((contact) =>
            selectedIds.has(contact.id)
              ? { ...contact, crmPipeline: { stage: bulkStage } }
              : contact,
          ),
        )
        setSelectedIds(new Set())
        setBulkStage('')
        setError(
          `You are offline. Stage change queued for sync. ${queuedCount} queued change${queuedCount === 1 ? '' : 's'} waiting.`,
        )
        return
      }

      setError('Failed to update stage for selected contacts. Please try again.')
    }
  }, [bulkStage, loadContacts, page, selectedIds, setContacts, setError, setSelectedIds])
  const handleBulkDelete = useCallback(() => {
    setConfirmDialog({
      message: `Delete ${selectedIds.size} contact${selectedIds.size !== 1 ? 's' : ''}? This cannot be undone.`,
      onConfirm: async () => {
        setError(null)
        try {
          const token = await getAccessToken()
          await apiDeleteWithBody('/contacts/bulk', { ids: [...selectedIds] }, token)
          setSelectedIds(new Set())
          void loadContacts(page)
        } catch {
          setError('Failed to delete selected contacts. Please try again.')
        }
      },
    })
  }, [loadContacts, page, selectedIds, setConfirmDialog, setError, setSelectedIds])

  const handleBulkEdit = useCallback(async () => {
    if (!bulkEditMode || selectedIds.size === 0) return
    const trimmedValue = bulkEditValue.trim()
    if (!trimmedValue) return
    setError(null)
    try {
      const token = await getAccessToken()
      const payload: {
        ids: string[]
        company?: string
        tagsAdd?: string[]
        tagsRemove?: string[]
      } = { ids: [...selectedIds] }

      if (bulkEditMode === 'company') {
        payload.company = trimmedValue
      } else {
        const parsedTags = trimmedValue
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
        if (parsedTags.length === 0) return
        if (bulkEditMode === 'tagsAdd') payload.tagsAdd = parsedTags
        if (bulkEditMode === 'tagsRemove') payload.tagsRemove = parsedTags
      }

      await apiPatch('/contacts/bulk-update', payload, token)
      setSelectedIds(new Set())
      setBulkEditMode('')
      setBulkEditValue('')
      void loadContacts(page)
    } catch {
      setError('Failed to update selected contacts. Please try again.')
    }
  }, [bulkEditMode, bulkEditValue, loadContacts, page, selectedIds, setError, setSelectedIds])

  return {
    bulkStage,
    setBulkStage,
    bulkEditMode,
    setBulkEditMode,
    bulkEditValue,
    setBulkEditValue,
    handleBulkStageChange,
    handleBulkDelete,
    handleBulkEdit,
  }
}

export function useContactSelection(displayedContacts: ContactRow[]) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const pruneSelection = useCallback((visibleIds: string[]) => {
    setSelectedIds((prev) => {
      const visible = new Set(visibleIds)
      return new Set([...prev].filter((id) => visible.has(id)))
    })
  }, [])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    if (selectedIds.size === displayedContacts.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(displayedContacts.map((contact) => contact.id)))
    }
  }, [displayedContacts, selectedIds.size])

  return { selectedIds, setSelectedIds, pruneSelection, toggleSelect, selectAll }
}

export function useContactsQueryState(searchParams: ReturnType<typeof useSearchParams>) {
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '')
  const [stageFilter, setStageFilter] = useState<string>(() => searchParams.get('stage') ?? 'ALL')
  const [tagFilter, setTagFilter] = useState<string>(() => searchParams.get('tag') ?? '')
  const [sortBy, setSortBy] = useState<ContactsSortBy>(
    () => (searchParams.get('sortBy') as ContactsSortBy | null) ?? 'date',
  )

  return {
    search,
    setSearch,
    stageFilter,
    setStageFilter,
    tagFilter,
    setTagFilter,
    sortBy,
    setSortBy,
  }
}

export function useContactsLoader({
  searchParams,
  pruneSelection,
  setContacts,
  setTotal,
  setPage,
  setLoading,
  setError,
  setPermissionDenied,
  setHasLoadedOnce,
}: {
  searchParams: ReturnType<typeof useSearchParams>
  pruneSelection: (visibleIds: string[]) => void
  setContacts: React.Dispatch<React.SetStateAction<ContactRow[]>>
  setTotal: React.Dispatch<React.SetStateAction<number>>
  setPage: React.Dispatch<React.SetStateAction<number>>
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  setError: React.Dispatch<React.SetStateAction<string | null>>
  setPermissionDenied: React.Dispatch<React.SetStateAction<boolean>>
  setHasLoadedOnce: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const contactsRequestIdRef = useRef(0)
  const LIMIT = 20

  const loadContacts = useCallback(
    async (
      p = 1,
      s = searchParams.get('search') ?? '',
      stage = searchParams.get('stage') ?? 'ALL',
      tag = searchParams.get('tag') ?? '',
      sort = (searchParams.get('sortBy') as ContactsSortBy | null) ?? 'date',
    ) => {
      const requestId = ++contactsRequestIdRef.current
      setLoading(true)
      setError(null)
      setPermissionDenied(false)
      try {
        const token = await getAccessToken()
        const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) })
        if (s) params.set('search', s)
        if (stage !== 'ALL') params.set('stage', stage)
        if (tag) params.set('tag', tag)
        if (sort !== 'date') params.set('sortBy', sort)
        const data = await apiGet<ContactsResponse>(`/contacts?${params.toString()}`, token)
        if (contactsRequestIdRef.current !== requestId) return
        setContacts(data.items)
        saveCachedData(`contacts:list:${params.toString()}`, data)
        pruneSelection(data.items.map((contact) => contact.id))
        setTotal(data.total)
        setPage(data.page)
        setHasLoadedOnce(true)
      } catch (err) {
        if (contactsRequestIdRef.current !== requestId) return
        const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) })
        if (s) params.set('search', s)
        if (stage !== 'ALL') params.set('stage', stage)
        if (tag) params.set('tag', tag)
        if (sort !== 'date') params.set('sortBy', sort)
        const cached = readCachedData<ContactsResponse>(`contacts:list:${params.toString()}`)
        if (cached && (!navigator.onLine || (isApiError(err) && err.statusCode === 0))) {
          setContacts(cached.data.items)
          pruneSelection(cached.data.items.map((contact) => contact.id))
          setTotal(cached.data.total)
          setPage(cached.data.page)
          setHasLoadedOnce(true)
          setError('Showing last synced contacts while offline.')
          incrementPwaMetric('pwa_offline_contacts_fallback')
          return
        }
        if (isApiError(err) && (err.statusCode === 403 || err.statusCode === 401)) {
          setPermissionDenied(true)
          setError('You do not have permission to view contacts.')
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load contacts')
        }
      } finally {
        if (contactsRequestIdRef.current !== requestId) return
        setLoading(false)
      }
    },
    [
      pruneSelection,
      searchParams,
      setContacts,
      setError,
      setHasLoadedOnce,
      setLoading,
      setPage,
      setPermissionDenied,
      setTotal,
    ],
  )

  return { loadContacts, LIMIT }
}

export function useContactsOverlays() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [drawerContactId, setDrawerContactId] = useState<string | null>(null)

  return {
    showAddModal,
    setShowAddModal,
    showImportModal,
    setShowImportModal,
    drawerContactId,
    setDrawerContactId,
  }
}

export function useContactsPageActions({
  drawerContactId,
  loadContacts,
  page,
  setConfirmDialog,
  setContacts,
  setError,
  setExportError,
}: {
  drawerContactId: string | null
  loadContacts: (
    page?: number,
    search?: string,
    stage?: string,
    tag?: string,
    sort?: ContactsSortBy,
  ) => Promise<void>
  page: number
  setConfirmDialog: React.Dispatch<React.SetStateAction<ConfirmDialogState | null>>
  setContacts: React.Dispatch<React.SetStateAction<ContactRow[]>>
  setError: React.Dispatch<React.SetStateAction<string | null>>
  setExportError: React.Dispatch<React.SetStateAction<string | null>>
}) {
  const handleExportCSV = useCallback(async () => {
    setExportError(null)
    try {
      const token = await getAccessToken()
      const csv = await apiGet<string>('/contacts/export', token)
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      if (err instanceof ApiError && err.message.includes('CSV export is available on Pro.')) {
        setExportError('CSV export is available on Pro. Upgrade in billing to export contacts.')
        return
      }
      setExportError(err instanceof Error ? err.message : 'Export failed')
    }
  }, [setExportError])

  const handleDelete = useCallback(
    async (id: string) => {
      setConfirmDialog({
        message: 'Delete this contact? This cannot be undone.',
        onConfirm: async () => {
          setError(null)
          try {
            const token = await getAccessToken()
            await apiDelete(`/contacts/${id}`, token)
            void loadContacts(page)
          } catch (err) {
            setError(
              err instanceof Error ? err.message : 'Failed to delete contact. Please try again.',
            )
          }
        },
      })
    },
    [loadContacts, page, setConfirmDialog, setError],
  )

  const refreshDrawerContact = useCallback(async () => {
    if (!drawerContactId) return
    try {
      const token = await getAccessToken()
      const refreshed = await apiGet<ContactRow>(`/contacts/${drawerContactId}`, token)
      setContacts((prev) =>
        prev.map((contact) =>
          contact.id === refreshed.id ? { ...contact, ...refreshed } : contact,
        ),
      )
    } catch {
      void loadContacts(page)
    }
  }, [drawerContactId, loadContacts, page, setContacts])

  return {
    handleDelete,
    handleExportCSV,
    refreshDrawerContact,
  }
}
