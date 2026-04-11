'use client'

import React, { useState, useEffect, useCallback, type JSX } from 'react'
import { formatDate as tzFormatDate } from '@/lib/tz'
import { useUserTimezone } from '@/hooks/useUserLocale'
import {
  X,
  Mail,
  Phone,
  Building2,
  Globe,
  Tag,
  Clock,
  Briefcase,
  MapPin,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  Search,
  Loader2,
  Pencil,
  Check,
} from 'lucide-react'
import { SelectField } from '@/components/ui/SelectField'
import { getAccessToken } from '@/lib/supabase/client'
import { apiGet, apiPut, apiPatch, apiPost, apiDelete } from '@/lib/api'
import { ComposeEmailModal } from './ComposeEmailModal'

interface ContactNote {
  id: string
  content: string
  createdAt: string
}

interface ContactEmail {
  id: string
  subject: string
  sentAt: string
  openedAt: string | null
  clickedAt: string | null
}

interface ContactDeal {
  id: string
  title: string
  value: string | null
  currency: string
  stage: string
  closeDate: string | null
  probability: number | null
}

interface ContactTask {
  id: string
  title: string
  dueAt: string | null
  completed: boolean
  completedAt?: string | null
}

interface ContactCustomFieldValue {
  fieldId: string
  value: string
  field: {
    label: string
    fieldType: string
  }
}

interface CustomFieldDefinition {
  id: string
  label: string
  fieldType: string
  options?: string[] | null
}

interface DuplicateContact {
  id: string
  name: string
  email?: string | null
  company?: string | null
}

interface DuplicateGroup {
  reason: string
  contacts: DuplicateContact[]
}

export interface ContactDetail {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  company?: string | null
  title?: string | null
  website?: string | null
  address?: string | null
  notes?: string | null
  tags: string[]
  createdAt: string
  crmPipeline?: { stage: string } | null
  sourceCard?: { handle: string } | null
  timeline?: TimelineEvent[]
  contactNotes?: Array<{ id: string; content: string; createdAt: string }>
  deals?: Array<{
    id: string
    title: string
    value: string | null
    currency: string
    stage: string
    closeDate: string | null
    probability: number | null
  }>
  tasks?: Array<{ id: string; title: string; dueAt: string | null; completed: boolean }>
  customFieldValues?: Array<{
    fieldId: string
    value: string
    field: { label: string; fieldType: string }
  }>
  inferredIndustry?: string | null
  inferredCompanySize?: string | null
  inferredSeniority?: string | null
  inferredLinkedIn?: string | null
  enrichmentScore?: number | null
  enrichmentSummary?: string | null
  enrichedAt?: string | null
}

interface TimelineEvent {
  id: string
  event: string
  metadata: Record<string, unknown>
  createdAt: string
}

interface ContactDetailDrawerProps {
  contactId: string | null
  onClose: () => void
  onUpdate?: (contact: ContactDetail) => void
}

const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED', 'LOST'] as const
type Stage = (typeof STAGES)[number]

const DEAL_STAGES = ['PROSPECT', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'] as const

const STAGE_COLORS: Record<Stage, string> = {
  NEW: 'bg-gray-100 text-gray-700 border-gray-300',
  CONTACTED: 'bg-blue-100 text-blue-700 border-blue-300',
  QUALIFIED: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  CLOSED: 'bg-green-100 text-green-700 border-green-300',
  LOST: 'bg-red-100 text-red-700 border-red-300',
}

const STAGE_ACTIVE: Record<Stage, string> = {
  NEW: 'bg-gray-700 text-white',
  CONTACTED: 'bg-blue-600 text-white',
  QUALIFIED: 'bg-yellow-500 text-white',
  CLOSED: 'bg-green-600 text-white',
  LOST: 'bg-red-600 text-white',
}

const DEAL_STAGE_COLORS: Record<(typeof DEAL_STAGES)[number], string> = {
  PROSPECT: 'bg-gray-100 text-gray-700',
  PROPOSAL: 'bg-blue-100 text-blue-700',
  NEGOTIATION: 'bg-yellow-100 text-yellow-700',
  CLOSED_WON: 'bg-green-100 text-green-700',
  CLOSED_LOST: 'bg-red-100 text-red-700',
}

async function getToken(): Promise<string | undefined> {
  return getAccessToken()
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function getScoreClasses(score: number): string {
  if (score >= 75) return 'bg-green-100 text-green-700'
  if (score >= 50) return 'bg-yellow-100 text-yellow-700'
  return 'bg-gray-100 text-gray-600'
}

function getDealStageClasses(stage: string): string {
  return DEAL_STAGE_COLORS[stage as (typeof DEAL_STAGES)[number]] ?? 'bg-gray-100 text-gray-700'
}

function formatDate(dateStr: string | null | undefined, tz?: string | null): string {
  if (!dateStr) return ''
  return tzFormatDate(dateStr, tz ?? undefined)
}

function formatDateInputValue(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return new Date(dateStr).toISOString().slice(0, 10)
}

function formatCurrency(value: string | null, currency: string): string {
  if (!value) return 'No value'
  const amount = Number(value)
  if (Number.isNaN(amount)) return value
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function sortTasks(tasks: ContactTask[]): ContactTask[] {
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed)
    const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER
    const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER
    return aDue - bDue
  })
}

function TimelineItem({ event }: { event: TimelineEvent }): JSX.Element {
  const meta = event.metadata

  let label = event.event.replace(/_/g, ' ').toLowerCase()
  label = label.charAt(0).toUpperCase() + label.slice(1)

  if (event.event === 'LEAD_CAPTURED') label = 'Lead captured'
  else if (event.event === 'STAGE_CHANGED')
    label = `Stage: ${String(meta.from ?? '')} → ${String(meta.to ?? '')}`
  else if (event.event === 'NOTE_ADDED') label = 'Note added'
  else if (event.event === 'EMAIL_SENT') label = `Email sent: ${String(meta.subject ?? '')}`
  else if (event.event === 'CONTACT_UPDATED') label = 'Contact updated'
  else if (event.event === 'ENRICHMENT_QUEUED') label = 'AI enrichment queued'
  else if (event.event === 'ENRICHMENT_COMPLETED') label = 'AI enrichment completed'
  else if (event.event === 'ENRICHMENT_FAILED') label = 'AI enrichment failed'

  const dotColor =
    event.event === 'ENRICHMENT_FAILED'
      ? 'bg-red-400'
      : event.event === 'ENRICHMENT_COMPLETED'
        ? 'bg-green-400'
        : event.event === 'EMAIL_SENT'
          ? 'bg-blue-400'
          : 'bg-indigo-400'

  return (
    <div className="flex gap-3 py-2">
      <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
      <div>
        <p className="text-sm text-gray-700">{label}</p>
        {event.event === 'NOTE_ADDED' && Boolean(meta.content) && (
          <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{String(meta.content)}</p>
        )}
        {event.event === 'ENRICHMENT_FAILED' && Boolean(meta.error) && (
          <p className="mt-0.5 line-clamp-2 text-xs text-red-500">{String(meta.error)}</p>
        )}
        <p className="mt-0.5 text-xs text-gray-400">{timeAgo(event.createdAt)}</p>
      </div>
    </div>
  )
}

export function ContactDetailDrawer({
  contactId,
  onClose,
  onUpdate,
}: ContactDetailDrawerProps): JSX.Element | null {
  const drawerRef = React.useRef<HTMLDivElement>(null)
  const previousActiveElementRef = React.useRef<HTMLElement | null>(null)
  const [contact, setContact] = useState<ContactDetail | null>(null)
  const userTz = useUserTimezone()
  const [loading, setLoading] = useState(false)
  const [drawerError, setDrawerError] = useState<string | null>(null)
  const [newTag, setNewTag] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const [composeOpen, setComposeOpen] = useState(false)
  const [reenriching, setReenriching] = useState(false)
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([])
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editNoteContent, setEditNoteContent] = useState('')
  const [savingEditNoteId, setSavingEditNoteId] = useState<string | null>(null)
  const [emails, setEmails] = useState<ContactEmail[]>([])
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDueAt, setTaskDueAt] = useState('')
  const [addingTask, setAddingTask] = useState(false)
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)
  const [dealsExpanded, setDealsExpanded] = useState(false)
  const [addingDeal, setAddingDeal] = useState(false)
  const [deletingDealId, setDeletingDealId] = useState<string | null>(null)
  const [updatingDealId, setUpdatingDealId] = useState<string | null>(null)
  const [mergeModalOpen, setMergeModalOpen] = useState(false)
  const [loadingDuplicates, setLoadingDuplicates] = useState(false)
  const [mergeCandidates, setMergeCandidates] = useState<DuplicateContact[]>([])
  const [mergingDuplicateId, setMergingDuplicateId] = useState<string | null>(null)
  const [dealForm, setDealForm] = useState({
    title: '',
    value: '',
    currency: 'USD',
    stage: 'PROSPECT',
    closeDate: '',
  })

  const loadContact = useCallback(async (id: string) => {
    setLoading(true)
    setDrawerError(null)
    try {
      const token = await getToken()
      const [data, fullTimeline, threadedNotes, tasks, deals, fieldDefinitions, emailHistory] =
        await Promise.all([
          apiGet<ContactDetail>(`/contacts/${id}`, token),
          apiGet<TimelineEvent[]>(`/contacts/${id}/timeline`, token).catch(() => null),
          apiGet<ContactNote[]>(`/contacts/${id}/notes`, token).catch(() => null),
          apiGet<ContactTask[]>(`/contacts/${id}/tasks`, token).catch(() => null),
          apiGet<ContactDeal[]>(`/contacts/${id}/deals`, token).catch(() => null),
          apiGet<CustomFieldDefinition[]>(`/crm/custom-fields`, token).catch(() => []),
          apiGet<ContactEmail[]>(`/contacts/${id}/emails`, token).catch(() => []),
        ])

      setEmails(emailHistory)
      setContact({
        ...data,
        timeline: fullTimeline ?? data.timeline,
        contactNotes: threadedNotes ?? data.contactNotes ?? [],
        tasks: sortTasks(tasks ?? (data.tasks as ContactTask[] | undefined) ?? []),
        deals: deals ?? (data.deals as ContactDeal[] | undefined) ?? [],
      })
      setCustomFields(fieldDefinitions)
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : 'Failed to load contact')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (contactId) void loadContact(contactId)
  }, [contactId, loadContact])

  useEffect(() => {
    if (!contactId) return
    previousActiveElementRef.current = document.activeElement as HTMLElement | null

    const focusFirst = () => {
      if (!drawerRef.current) return
      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )
      focusable[0]?.focus()
    }

    queueMicrotask(focusFirst)

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }

      if (e.key !== 'Tab' || !drawerRef.current) return

      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )
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
    document.addEventListener('keydown', handler)
    return () => {
      document.removeEventListener('keydown', handler)
      previousActiveElementRef.current?.focus()
    }
  }, [contactId, onClose])

  const saveField = useCallback(
    async (field: string, value: string) => {
      if (!contact) return
      try {
        const token = await getToken()
        const updated = await apiPut<ContactDetail>(
          `/contacts/${contact.id}`,
          { [field]: value },
          token,
        )
        setContact((prev) => (prev ? { ...prev, ...updated } : prev))
        onUpdate?.(updated)
      } catch (err) {
        setDrawerError(err instanceof Error ? err.message : 'Failed to save field')
      }
    },
    [contact, onUpdate],
  )

  const handleStageChange = useCallback(
    async (stage: Stage) => {
      if (!contact) return
      try {
        const token = await getToken()
        await apiPatch(`/contacts/${contact.id}/stage`, { stage }, token)
        setContact((prev) =>
          prev ? { ...prev, crmPipeline: { ...prev.crmPipeline, stage } } : prev,
        )
      } catch (err) {
        setDrawerError(err instanceof Error ? err.message : 'Failed to update stage')
      }
    },
    [contact],
  )

  const addTag = useCallback(async () => {
    if (!contact || !newTag.trim()) return
    const tags = [...contact.tags, newTag.trim()]
    try {
      const token = await getToken()
      await apiPut(`/contacts/${contact.id}`, { tags }, token)
      setContact((prev) => (prev ? { ...prev, tags } : prev))
      setNewTag('')
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : 'Failed to add tag')
    }
  }, [contact, newTag])

  const removeTag = useCallback(
    async (tag: string) => {
      if (!contact) return
      const tags = contact.tags.filter((t) => t !== tag)
      try {
        const token = await getToken()
        await apiPut(`/contacts/${contact.id}`, { tags }, token)
        setContact((prev) => (prev ? { ...prev, tags } : prev))
      } catch (err) {
        setDrawerError(err instanceof Error ? err.message : 'Failed to remove tag')
      }
    },
    [contact],
  )

  const addNote = useCallback(async () => {
    if (!contact || !newNote.trim()) return
    const content = newNote.trim()
    setAddingNote(true)
    try {
      const token = await getToken()
      await apiPost(`/contacts/${contact.id}/notes`, { content }, token)
      setNewNote('')
      setContact((prev) => (prev ? { ...prev, notes: content } : prev))
      await loadContact(contact.id)
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : 'Failed to add note')
    } finally {
      setAddingNote(false)
    }
  }, [contact, loadContact, newNote])

  const deleteNote = useCallback(
    async (noteId: string) => {
      if (!contact) return
      setDeletingNoteId(noteId)
      try {
        const token = await getToken()
        await apiDelete(`/contacts/${contact.id}/notes/${noteId}`, token)
        setContact((prev) =>
          prev
            ? {
                ...prev,
                contactNotes: (prev.contactNotes ?? []).filter((note) => note.id !== noteId),
              }
            : prev,
        )
      } catch (err) {
        setDrawerError(err instanceof Error ? err.message : 'Failed to delete note')
      } finally {
        setDeletingNoteId(null)
      }
    },
    [contact],
  )

  const startEditNote = useCallback((note: ContactNote) => {
    setEditingNoteId(note.id)
    setEditNoteContent(note.content)
  }, [])

  const cancelEditNote = useCallback(() => {
    setEditingNoteId(null)
    setEditNoteContent('')
  }, [])

  const saveEditNote = useCallback(
    async (noteId: string) => {
      if (!contact || !editNoteContent.trim()) return
      setSavingEditNoteId(noteId)
      try {
        const token = await getToken()
        await apiPatch(
          `/contacts/${contact.id}/notes/${noteId}`,
          { content: editNoteContent.trim() },
          token,
        )
        setContact((prev) =>
          prev
            ? {
                ...prev,
                contactNotes: (prev.contactNotes ?? []).map((n) =>
                  n.id === noteId ? { ...n, content: editNoteContent.trim() } : n,
                ),
              }
            : prev,
        )
        setEditingNoteId(null)
        setEditNoteContent('')
      } catch (err) {
        setDrawerError(err instanceof Error ? err.message : 'Failed to update note')
      } finally {
        setSavingEditNoteId(null)
      }
    },
    [contact, editNoteContent],
  )
  const addTask = useCallback(async () => {
    if (!contact || !taskTitle.trim()) return
    setAddingTask(true)
    try {
      const token = await getToken()
      const created = await apiPost<ContactTask>(
        `/contacts/${contact.id}/tasks`,
        {
          title: taskTitle.trim(),
          dueAt: taskDueAt || undefined,
        },
        token,
      )
      setContact((prev) =>
        prev
          ? {
              ...prev,
              tasks: sortTasks([created, ...((prev.tasks as ContactTask[] | undefined) ?? [])]),
            }
          : prev,
      )
      setTaskTitle('')
      setTaskDueAt('')
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : 'Failed to add task')
    } finally {
      setAddingTask(false)
    }
  }, [contact, taskDueAt, taskTitle])

  const toggleTask = useCallback(async (task: ContactTask) => {
    setUpdatingTaskId(task.id)
    try {
      const token = await getToken()
      const updated = await apiPatch<ContactTask>(
        `/tasks/${task.id}`,
        {
          completed: !task.completed,
        },
        token,
      )
      setContact((prev) =>
        prev
          ? {
              ...prev,
              tasks: sortTasks(
                ((prev.tasks as ContactTask[] | undefined) ?? []).map((item) =>
                  item.id === task.id ? updated : item,
                ),
              ),
            }
          : prev,
      )
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : 'Failed to update task')
    } finally {
      setUpdatingTaskId(null)
    }
  }, [])

  const deleteTask = useCallback(async (taskId: string) => {
    setDeletingTaskId(taskId)
    try {
      const token = await getToken()
      await apiDelete(`/tasks/${taskId}`, token)
      setContact((prev) =>
        prev
          ? {
              ...prev,
              tasks: ((prev.tasks as ContactTask[] | undefined) ?? []).filter(
                (t) => t.id !== taskId,
              ),
            }
          : prev,
      )
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : 'Failed to delete task')
    } finally {
      setDeletingTaskId(null)
    }
  }, [])

  const addDeal = useCallback(async () => {
    if (!contact || !dealForm.title.trim()) return
    setAddingDeal(true)
    try {
      const token = await getToken()
      const created = await apiPost<ContactDeal>(
        `/contacts/${contact.id}/deals`,
        {
          title: dealForm.title.trim(),
          value: dealForm.value ? Number(dealForm.value) : undefined,
          currency: dealForm.currency,
          stage: dealForm.stage,
          closeDate: dealForm.closeDate || undefined,
        },
        token,
      )
      setContact((prev) =>
        prev
          ? { ...prev, deals: [created, ...((prev.deals as ContactDeal[] | undefined) ?? [])] }
          : prev,
      )
      setDealForm({
        title: '',
        value: '',
        currency: 'USD',
        stage: 'PROSPECT',
        closeDate: '',
      })
      setDealsExpanded(false)
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : 'Failed to add deal')
    } finally {
      setAddingDeal(false)
    }
  }, [contact, dealForm])

  const updateDealStage = useCallback(async (dealId: string, stage: string) => {
    setUpdatingDealId(dealId)
    try {
      const token = await getToken()
      const updated = await apiPatch<ContactDeal>(`/deals/${dealId}`, { stage }, token)
      setContact((prev) =>
        prev
          ? {
              ...prev,
              deals: ((prev.deals as ContactDeal[] | undefined) ?? []).map((deal) =>
                deal.id === dealId ? updated : deal,
              ),
            }
          : prev,
      )
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : 'Failed to update deal')
    } finally {
      setUpdatingDealId(null)
    }
  }, [])

  const deleteDeal = useCallback(async (dealId: string) => {
    setDeletingDealId(dealId)
    try {
      const token = await getToken()
      await apiDelete(`/deals/${dealId}`, token)
      setContact((prev) =>
        prev
          ? {
              ...prev,
              deals: ((prev.deals as ContactDeal[] | undefined) ?? []).filter(
                (deal) => deal.id !== dealId,
              ),
            }
          : prev,
      )
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : 'Failed to delete deal')
    } finally {
      setDeletingDealId(null)
    }
  }, [])

  const saveCustomFieldValue = useCallback(
    async (fieldId: string, value: string) => {
      if (!contact) return
      try {
        const token = await getToken()
        await apiPut(`/contacts/${contact.id}/custom-fields/${fieldId}`, { value }, token)
        const fieldDefinition = customFields.find((field) => field.id === fieldId)
        if (!fieldDefinition) return
        setContact((prev) => {
          if (!prev) return prev
          const existingValues = prev.customFieldValues ?? []
          const nextValue = {
            fieldId,
            value,
            field: { label: fieldDefinition.label, fieldType: fieldDefinition.fieldType },
          }
          const hasExisting = existingValues.some((item) => item.fieldId === fieldId)
          return {
            ...prev,
            customFieldValues: hasExisting
              ? existingValues.map((item) => (item.fieldId === fieldId ? nextValue : item))
              : [...existingValues, nextValue],
          }
        })
      } catch (err) {
        setDrawerError(err instanceof Error ? err.message : 'Failed to save custom field')
      }
    },
    [contact, customFields],
  )

  const openMergeModal = useCallback(async () => {
    if (!contact) return
    setMergeModalOpen(true)
    setLoadingDuplicates(true)
    try {
      const token = await getToken()
      const groups = await apiGet<DuplicateGroup[]>(`/crm/duplicates`, token)
      const duplicates = groups
        .filter((group) => group.contacts.some((candidate) => candidate.id === contact.id))
        .flatMap((group) => group.contacts.filter((candidate) => candidate.id !== contact.id))

      const uniqueDuplicates = Array.from(
        new Map(duplicates.map((item) => [item.id, item])).values(),
      )
      setMergeCandidates(uniqueDuplicates)
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : 'Failed to find duplicates')
      setMergeCandidates([])
    } finally {
      setLoadingDuplicates(false)
    }
  }, [contact])

  const mergeDuplicate = useCallback(
    async (duplicateId: string) => {
      if (!contact) return
      setMergingDuplicateId(duplicateId)
      try {
        const token = await getToken()
        await apiPost(`/contacts/${contact.id}/merge`, { duplicateId }, token)
        setMergeCandidates((prev) => prev.filter((candidate) => candidate.id !== duplicateId))
        await loadContact(contact.id)
      } catch (err) {
        setDrawerError(err instanceof Error ? err.message : 'Failed to merge duplicate')
      } finally {
        setMergingDuplicateId(null)
      }
    },
    [contact, loadContact],
  )

  const handleReenrich = useCallback(async () => {
    if (!contact) return
    setReenriching(true)
    const previousEnrichedAt = contact.enrichedAt
    try {
      const token = await getToken()
      await apiPost(`/contacts/${contact.id}/enrich`, {}, token)
      const currentContactId = contact.id
      let attempts = 0

      const poll = async () => {
        attempts++
        try {
          const refreshed = await apiGet<ContactDetail>(
            `/contacts/${currentContactId}`,
            await getToken(),
          )
          if (refreshed.enrichedAt !== previousEnrichedAt) {
            await loadContact(currentContactId)
            setReenriching(false)
            return
          }
        } catch {
          // ignore poll errors
        }

        if (attempts < 15) {
          setTimeout(() => void poll(), 2000)
        } else {
          void loadContact(currentContactId)
          setReenriching(false)
        }
      }

      setTimeout(() => void poll(), 2000)
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : 'Failed to start enrichment')
      setReenriching(false)
    }
  }, [contact, loadContact])

  if (!contactId) return null

  const notes = contact?.contactNotes ?? []
  const tasks = (contact?.tasks as ContactTask[] | undefined) ?? []
  const deals = (contact?.deals as ContactDeal[] | undefined) ?? []

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div
        ref={drawerRef}
        className="app-panel fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col rounded-l-[32px] border-l border-white/80 shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-4">
          {contact && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-sm font-bold text-white">
              {getInitials(contact.name)}
            </div>
          )}

          <div className="min-w-0 flex-1">
            {editingName && contact ? (
              <input
                autoFocus
                className="w-full rounded border border-indigo-300 px-2 py-1 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={async () => {
                  setEditingName(false)
                  if (editName.trim() && editName !== contact.name) {
                    await saveField('name', editName.trim())
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur()
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingName(true)
                  setEditName(contact?.name ?? '')
                }}
                className="block truncate text-left text-base font-semibold text-gray-900 hover:text-indigo-600"
              >
                {loading ? 'Loading...' : (contact?.name ?? '')}
              </button>
            )}

            <div className="mt-1 flex flex-wrap items-center gap-2">
              {contact?.crmPipeline && (
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[contact.crmPipeline.stage as Stage] ?? STAGE_COLORS.NEW}`}
                >
                  {contact.crmPipeline.stage}
                </span>
              )}
              {contact?.enrichmentScore != null && (
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getScoreClasses(contact.enrichmentScore)}`}
                >
                  Score: {contact.enrichmentScore}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void openMergeModal()}
              className="app-touch-target inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              <Search className="h-3.5 w-3.5" />
              Find Duplicates
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close contact details"
              className="app-touch-target rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
          {drawerError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span className="shrink-0 font-semibold">Error:</span>
              <span>{drawerError}</span>
              <button
                type="button"
                className="ml-auto shrink-0 rounded-full p-1 text-red-400 hover:bg-red-100 hover:text-red-600"
                onClick={() => setDrawerError(null)}
                aria-label="Dismiss error"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 animate-pulse rounded bg-gray-100" />
              ))}
            </div>
          )}

          {contact && (
            <>
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Contact Info
                </h3>
                <div className="space-y-2">
                  {[
                    { field: 'email', label: 'Email', icon: Mail, value: contact.email },
                    { field: 'phone', label: 'Phone', icon: Phone, value: contact.phone },
                    { field: 'company', label: 'Company', icon: Building2, value: contact.company },
                    { field: 'title', label: 'Title', icon: Briefcase, value: contact.title },
                    { field: 'website', label: 'Website', icon: Globe, value: contact.website },
                    { field: 'address', label: 'Address', icon: MapPin, value: contact.address },
                  ].map(({ field, label, icon: Icon, value }) => (
                    <EditableField
                      key={field}
                      label={label}
                      icon={Icon}
                      value={value ?? ''}
                      onSave={(v) => saveField(field, v)}
                    />
                  ))}
                  {contact.sourceCard && (
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 shrink-0 text-gray-400" />
                      <span className="text-xs text-gray-500">Source:</span>
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                        /{contact.sourceCard.handle}
                      </span>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Stage
                </h3>
                <div className="flex flex-wrap gap-2">
                  {STAGES.map((stage) => {
                    const isActive = contact.crmPipeline?.stage === stage
                    return (
                      <button
                        key={stage}
                        type="button"
                        onClick={() => void handleStageChange(stage)}
                        className={[
                          'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                          isActive ? STAGE_ACTIVE[stage] : STAGE_COLORS[stage],
                        ].join(' ')}
                      >
                        {stage}
                      </button>
                    )
                  })}
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {contact.tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => void removeTag(tag)}
                        className="ml-1 text-gray-400 hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="Add tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void addTag()
                    }}
                    className="rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-xs text-gray-500 focus:border-indigo-400 focus:outline-none"
                  />
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Tasks
                  </h3>
                  <span className="text-xs text-gray-400">{tasks.length}</span>
                </div>
                <div className="app-panel-subtle space-y-3 rounded-[24px] p-3">
                  {tasks.length > 0 ? (
                    <div className="space-y-2">
                      {tasks.map((task) => {
                        const overdue =
                          Boolean(task.dueAt) &&
                          !task.completed &&
                          new Date(task.dueAt as string) < new Date()

                        return (
                          <div
                            key={task.id}
                            className="flex items-start gap-3 rounded-lg border border-gray-100 px-3 py-2"
                          >
                            <input
                              type="checkbox"
                              checked={task.completed}
                              disabled={updatingTaskId === task.id}
                              onChange={() => void toggleTask(task)}
                              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <div className="min-w-0 flex-1">
                              <p
                                className={[
                                  'text-sm',
                                  task.completed ? 'text-gray-400 line-through' : 'text-gray-700',
                                ].join(' ')}
                              >
                                {task.title}
                              </p>
                              {task.dueAt && (
                                <p
                                  className={`mt-0.5 text-xs ${overdue ? 'text-red-600' : 'text-gray-400'}`}
                                >
                                  Due {formatDate(task.dueAt, userTz)}
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => void deleteTask(task.id)}
                              disabled={deletingTaskId === task.id}
                              className="app-touch-target text-gray-400 hover:text-red-500 disabled:opacity-50"
                              aria-label="Delete task"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No tasks yet.</p>
                  )}

                  <div className="flex flex-col gap-2 border-t border-gray-100 pt-3">
                    <input
                      type="text"
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') void addTask()
                      }}
                      placeholder="Add task title"
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={taskDueAt}
                        onChange={(e) => setTaskDueAt(e.target.value)}
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                      <button
                        type="button"
                        onClick={() => void addTask()}
                        disabled={addingTask || !taskTitle.trim()}
                        className="app-touch-target inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4" />
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Deals
                  </h3>
                  <button
                    type="button"
                    onClick={() => setDealsExpanded((prev) => !prev)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    {dealsExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                    {dealsExpanded ? 'Hide form' : 'Add deal'}
                  </button>
                </div>

                <div className="app-panel-subtle space-y-3 rounded-[24px] p-3">
                  {deals.length > 0 ? (
                    <div className="space-y-2">
                      {deals.map((deal) => (
                        <div key={deal.id} className="rounded-lg border border-gray-100 px-3 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-gray-800">
                                {deal.title}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <span
                                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getDealStageClasses(deal.stage)}`}
                                >
                                  {deal.stage}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatCurrency(deal.value, deal.currency)}
                                </span>
                                {deal.closeDate && (
                                  <span className="text-xs text-gray-400">
                                    Close {formatDate(deal.closeDate, userTz)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => void deleteDeal(deal.id)}
                              disabled={deletingDealId === deal.id}
                              className="app-touch-target text-gray-400 hover:text-red-500 disabled:opacity-50"
                              aria-label="Delete deal"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-3 flex items-center gap-2">
                            <SelectField
                              value={deal.stage}
                              onChange={(e) => void updateDealStage(deal.id, e.target.value)}
                              disabled={updatingDealId === deal.id}
                              className="app-touch-target rounded-xl px-3 py-2.5 pr-9 text-xs focus:border-indigo-400 focus:ring-indigo-100"
                            >
                              {DEAL_STAGES.map((stage) => (
                                <option key={stage} value={stage}>
                                  {stage}
                                </option>
                              ))}
                            </SelectField>
                            {deal.probability != null && (
                              <span className="text-xs text-gray-400">
                                {deal.probability}% probability
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No deals yet.</p>
                  )}

                  {dealsExpanded && (
                    <div className="space-y-2 border-t border-gray-100 pt-3">
                      <input
                        type="text"
                        value={dealForm.title}
                        onChange={(e) =>
                          setDealForm((prev) => ({ ...prev, title: e.target.value }))
                        }
                        placeholder="Deal title"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          min="0"
                          value={dealForm.value}
                          onChange={(e) =>
                            setDealForm((prev) => ({ ...prev, value: e.target.value }))
                          }
                          placeholder="Value"
                          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                        <SelectField
                          value={dealForm.currency}
                          onChange={(e) =>
                            setDealForm((prev) => ({ ...prev, currency: e.target.value }))
                          }
                          className="rounded-xl px-3 py-2.5 pr-9 focus:border-indigo-400 focus:ring-indigo-100"
                        >
                          {['USD', 'EUR', 'GBP'].map((currency) => (
                            <option key={currency} value={currency}>
                              {currency}
                            </option>
                          ))}
                        </SelectField>
                        <SelectField
                          value={dealForm.stage}
                          onChange={(e) =>
                            setDealForm((prev) => ({ ...prev, stage: e.target.value }))
                          }
                          className="rounded-xl px-3 py-2.5 pr-9 focus:border-indigo-400 focus:ring-indigo-100"
                        >
                          {DEAL_STAGES.map((stage) => (
                            <option key={stage} value={stage}>
                              {stage}
                            </option>
                          ))}
                        </SelectField>
                        <input
                          type="date"
                          value={dealForm.closeDate}
                          onChange={(e) =>
                            setDealForm((prev) => ({ ...prev, closeDate: e.target.value }))
                          }
                          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => void addDeal()}
                        disabled={addingDeal || !dealForm.title.trim()}
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4" />
                        Add Deal
                      </button>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Custom Fields
                  </h3>
                </div>

                {customFields.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 px-4 py-4 text-sm text-gray-400">
                    No custom fields.{' '}
                    <a
                      href="/crm/custom-fields"
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      Manage custom fields
                    </a>
                  </div>
                ) : (
                  <div className="app-panel-subtle space-y-2 rounded-[24px] p-3">
                    {customFields.map((field) => {
                      const existingValue = (contact.customFieldValues ?? []).find(
                        (value) => value.fieldId === field.id,
                      )

                      return (
                        <EditableCustomField
                          key={field.id}
                          field={field}
                          value={existingValue?.value ?? ''}
                          onSave={(value) => void saveCustomFieldValue(field.id, value)}
                        />
                      )
                    })}
                  </div>
                )}
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Notes
                  </h3>
                  <span className="text-xs text-gray-400">{notes.length}</span>
                </div>

                <div className="app-panel-subtle space-y-3 rounded-[24px] p-3">
                  {notes.length > 0 ? (
                    <div className="space-y-2">
                      {notes.map((note) => (
                        <div key={note.id} className="rounded-lg border border-gray-100 px-3 py-2">
                          {editingNoteId === note.id ? (
                            <div className="space-y-2">
                              <textarea
                                rows={3}
                                value={editNoteContent}
                                onChange={(e) => setEditNoteContent(e.target.value)}
                                className="w-full rounded-lg border border-indigo-300 p-2 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => void saveEditNote(note.id)}
                                  disabled={savingEditNoteId === note.id || !editNoteContent.trim()}
                                  className="app-touch-target inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                                >
                                  <Check className="h-3 w-3" />
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditNote}
                                  className="app-touch-target rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start justify-between gap-3">
                                <p className="whitespace-pre-wrap text-sm text-gray-700">
                                  {note.content}
                                </p>
                                <div className="flex shrink-0 gap-1">
                                  <button
                                    type="button"
                                    onClick={() => startEditNote(note)}
                                    className="app-touch-target text-gray-400 hover:text-indigo-500"
                                    aria-label="Edit note"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void deleteNote(note.id)}
                                    disabled={deletingNoteId === note.id}
                                    className="app-touch-target text-gray-400 hover:text-red-500 disabled:opacity-50"
                                    aria-label="Delete note"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                              <p className="mt-2 text-xs text-gray-400">
                                {timeAgo(note.createdAt)}
                              </p>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No notes yet.</p>
                  )}

                  <div className="border-t border-gray-100 pt-3">
                    <textarea
                      rows={3}
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add a note..."
                      className="w-full rounded-lg border border-gray-200 p-3 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={() => void addNote()}
                        disabled={addingNote || !newNote.trim()}
                        className="app-touch-target inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        <Plus className="h-4 w-4" />
                        Add Note
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {contact.timeline && contact.timeline.length > 0 && (
                <section>
                  <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <Clock className="h-3.5 w-3.5" />
                    Timeline
                  </h3>
                  <div className="divide-y divide-gray-100">
                    {contact.timeline.map((event) => (
                      <TimelineItem key={event.id} event={event} />
                    ))}
                  </div>
                </section>
              )}

              {emails.length > 0 && (
                <section>
                  <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <Mail className="h-3.5 w-3.5" />
                    Email History
                    <span className="ml-auto font-normal normal-case text-gray-400">
                      {emails.length}
                    </span>
                  </h3>
                  <div className="space-y-2 rounded-xl border border-gray-200 p-3">
                    {emails.map((email) => (
                      <div key={email.id} className="rounded-lg border border-gray-100 px-3 py-2">
                        <p className="truncate text-sm font-medium text-gray-800">
                          {email.subject || '(no subject)'}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <span className="text-xs text-gray-400">{timeAgo(email.sentAt)}</span>
                          {email.openedAt && (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                              Opened
                            </span>
                          )}
                          {email.clickedAt && (
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                              Clicked
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    AI Enrichment
                  </h3>
                  <button
                    type="button"
                    onClick={() => void handleReenrich()}
                    disabled={reenriching}
                    className="app-touch-target rounded-xl bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-100 disabled:opacity-50"
                  >
                    {reenriching
                      ? 'Queuing...'
                      : contact.enrichedAt
                        ? 'Re-enrich'
                        : 'Enrich with AI'}
                  </button>
                </div>

                {(() => {
                  const lastEnrichEvent = contact.timeline
                    ?.filter((e) => ['ENRICHMENT_COMPLETED', 'ENRICHMENT_FAILED'].includes(e.event))
                    .at(0)

                  if (lastEnrichEvent?.event === 'ENRICHMENT_FAILED') {
                    return (
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                        <strong>Enrichment failed:</strong>{' '}
                        {String(lastEnrichEvent.metadata.error ?? 'Unknown error')}
                      </div>
                    )
                  }

                  return null
                })()}

                {contact.enrichedAt ? (
                  <div className="space-y-3">
                    {contact.enrichmentScore != null && (
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                          <span>Confidence</span>
                          <span className="font-medium text-gray-700">
                            {contact.enrichmentScore}/100
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-1.5 rounded-full bg-indigo-500"
                            style={{ width: `${contact.enrichmentScore}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {contact.enrichmentSummary && (
                      <p className="rounded-lg bg-gray-50 p-3 text-sm italic text-gray-600">
                        {contact.enrichmentSummary}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {contact.inferredIndustry && (
                        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                          {contact.inferredIndustry}
                        </span>
                      )}
                      {contact.inferredSeniority && (
                        <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700">
                          {contact.inferredSeniority}
                        </span>
                      )}
                      {contact.inferredCompanySize && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                          {contact.inferredCompanySize} employees
                        </span>
                      )}
                    </div>

                    {contact.inferredLinkedIn &&
                      /^https:\/\/(www\.)?linkedin\.com\//.test(contact.inferredLinkedIn) && (
                        <a
                          href={contact.inferredLinkedIn}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                        >
                          Inferred LinkedIn: {contact.inferredLinkedIn}
                        </a>
                      )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">
                    No enrichment data yet. Click &ldquo;Enrich with AI&rdquo; to analyse this
                    contact.
                  </p>
                )}
              </section>
            </>
          )}
        </div>

        {contact?.email && (
          <div className="border-t border-gray-200 px-5 py-4">
            <button
              type="button"
              onClick={() => setComposeOpen(true)}
              className="app-touch-target flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Mail className="h-4 w-4" />
              Send Email
            </button>
          </div>
        )}
      </div>

      {mergeModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
          <div className="app-panel w-full max-w-lg rounded-[28px] shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Duplicate Contacts</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Merge another record into this contact.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMergeModalOpen(false)}
                className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-3 overflow-y-auto px-5 py-4">
              {loadingDuplicates ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching for duplicates...
                </div>
              ) : mergeCandidates.length > 0 ? (
                mergeCandidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800">{candidate.name}</p>
                      <p className="truncate text-xs text-gray-500">
                        {[candidate.email, candidate.company].filter(Boolean).join(' • ')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void mergeDuplicate(candidate.id)}
                      disabled={mergingDuplicateId === candidate.id}
                      className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {mergingDuplicateId === candidate.id
                        ? 'Merging...'
                        : 'Merge into this contact'}
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400">No duplicates found for this contact.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {composeOpen && contact?.email && (
        <ComposeEmailModal
          contactId={contact.id}
          contactName={contact.name}
          contactEmail={contact.email}
          onClose={() => setComposeOpen(false)}
        />
      )}
    </>
  )
}

function EditableCustomField({
  field,
  value,
  onSave,
}: {
  field: CustomFieldDefinition
  value: string
  onSave: (value: string) => void
}): JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    setDraft(value)
  }, [value])

  if (editing) {
    return (
      <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 px-3 py-2">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500">
          {field.label}
        </p>
        {field.fieldType === 'SELECT' ? (
          <SelectField
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              setEditing(false)
              onSave(draft)
            }}
            className="rounded-xl border-indigo-300 px-3 py-2.5 pr-9 text-sm focus:border-indigo-500 focus:ring-indigo-100"
          >
            <option value="">Select an option</option>
            {(field.options ?? []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </SelectField>
        ) : (
          <input
            autoFocus
            type={
              field.fieldType === 'NUMBER'
                ? 'number'
                : field.fieldType === 'DATE'
                  ? 'date'
                  : field.fieldType === 'URL'
                    ? 'url'
                    : 'text'
            }
            value={field.fieldType === 'DATE' ? formatDateInputValue(draft) : draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              setEditing(false)
              onSave(draft)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
            }}
            className="w-full rounded border border-indigo-300 px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        )}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="flex w-full items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-left hover:bg-gray-50"
    >
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{field.label}</p>
        <p className="mt-1 truncate text-sm text-gray-700">
          {value || `Add ${field.label.toLowerCase()}...`}
        </p>
      </div>
    </button>
  )
}

function EditableField({
  label,
  icon: Icon,
  value,
  onSave,
}: {
  label: string
  icon: typeof Mail
  value: string
  onSave: (v: string) => void
}): JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    setDraft(value)
  }, [value])

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-gray-400" />
        <input
          autoFocus
          className="flex-1 rounded border border-indigo-300 px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setEditing(false)
            onSave(draft)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
          }}
          placeholder={label}
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="flex w-full items-center gap-2 rounded px-0 py-1 text-left hover:bg-gray-50"
    >
      <Icon className="h-4 w-4 shrink-0 text-gray-400" />
      {value ? (
        <span className="text-sm text-gray-700">{value}</span>
      ) : (
        <span className="text-sm text-gray-400">Add {label.toLowerCase()}...</span>
      )}
    </button>
  )
}
