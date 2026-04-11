'use client'

import Link from 'next/link'
import type { JSX } from 'react'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { CircleDot } from 'lucide-react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core'
import { getAccessToken } from '@/lib/supabase/client'
import { apiGet, apiPatch, isApiError } from '@/lib/api'
import { SelectField } from '@/components/ui/SelectField'
import { StatusNotice } from '@/components/ui/StatusNotice'
import { ContactDetailDrawer } from '@/components/crm/ContactDetailDrawer'

interface PipelineContact {
  id: string
  name: string
  company?: string | null
  email?: string | null
  createdAt: string
  crmPipeline?: { stage: string; updatedAt?: string } | null
  sourceCard?: { handle: string } | null
}

type PipelineData = Record<string, PipelineContact[]>

interface PipelineResponse {
  pipeline: PipelineData
  truncated: boolean
  visibleCount: number
}

interface NamedPipeline {
  id: string
  name: string
  stages: string[]
  isDefault: boolean
}

const DEFAULT_STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED', 'LOST'] as const
type DefaultStage = (typeof DEFAULT_STAGES)[number]

const DEFAULT_STAGE_LABELS: Record<DefaultStage, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  CLOSED: 'Closed',
  LOST: 'Lost',
}

const DEFAULT_STAGE_COLORS: Record<string, string> = {
  NEW: 'bg-gray-100 border-gray-200',
  CONTACTED: 'bg-blue-50 border-blue-200',
  QUALIFIED: 'bg-yellow-50 border-yellow-200',
  CLOSED: 'bg-green-50 border-green-200',
  LOST: 'bg-red-50 border-red-200',
}

// Cycle through a palette for custom pipeline stages
const PALETTE = [
  'bg-blue-50 border-blue-200',
  'bg-purple-50 border-purple-200',
  'bg-yellow-50 border-yellow-200',
  'bg-green-50 border-green-200',
  'bg-red-50 border-red-200',
  'bg-indigo-50 border-indigo-200',
  'bg-orange-50 border-orange-200',
]

function stageHeaderColor(stage: string, index: number): string {
  return (
    DEFAULT_STAGE_COLORS[stage] ?? PALETTE[index % PALETTE.length] ?? 'bg-gray-50 border-gray-200'
  )
}

async function getToken(): Promise<string | undefined> {
  return getAccessToken()
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1 day'
  return `${days} days`
}

function KanbanCard({
  contact,
  onOpen,
}: {
  contact: PipelineContact
  onOpen: () => void
}): JSX.Element {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: contact.id })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      aria-label={`Drag to reorder ${contact.name}`}
      className="app-panel cursor-grab rounded-[22px] p-3 active:cursor-grabbing select-none"
    >
      <div className="flex items-start gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white">
          {getInitials(contact.name)}
        </div>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onOpen()
            }}
            className="block w-full text-left text-sm font-semibold text-gray-900 hover:text-indigo-600 truncate"
          >
            {contact.name}
          </button>
          {contact.company && <p className="truncate text-xs text-gray-500">{contact.company}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {contact.sourceCard && (
              <span className="rounded-full bg-indigo-100 px-1.5 py-0.5 text-xs font-medium text-indigo-700">
                /{contact.sourceCard.handle}
              </span>
            )}
            <span className="text-xs text-gray-400">
              {timeAgo(contact.crmPipeline?.updatedAt ?? contact.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function DroppableColumn({
  stage,
  stageLabel,
  colorClass,
  contacts,
  onOpenContact,
}: {
  stage: string
  stageLabel: string
  colorClass: string
  contacts: PipelineContact[]
  onOpenContact: (id: string) => void
}): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  return (
    <div className="app-panel flex w-64 shrink-0 flex-col rounded-[24px]">
      {/* Column header */}
      <div className={`rounded-t-[24px] border-b px-4 py-3 ${colorClass}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">{stageLabel}</h3>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-600 shadow-sm">
            {contacts.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className={[
          'flex flex-1 flex-col gap-2 p-3 min-h-[200px] transition-colors rounded-b-xl',
          isOver ? 'bg-indigo-50' : '',
        ].join(' ')}
      >
        {contacts.length === 0 ? (
          <p className="py-4 text-center text-xs text-gray-400">No contacts in this stage</p>
        ) : (
          contacts.map((contact) => (
            <KanbanCard
              key={contact.id}
              contact={contact}
              onOpen={() => onOpenContact(contact.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default function CrmPage(): JSX.Element {
  const stageMoveRequestIdsRef = useRef<Record<string, number>>({})
  const [pipeline, setPipeline] = useState<PipelineData>({})
  const [truncated, setTruncated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [drawerContactId, setDrawerContactId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Named pipelines
  const [namedPipelines, setNamedPipelines] = useState<NamedPipeline[]>([])
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('') // '' = default

  // Derive active stages list from selected pipeline or fall back to defaults.
  // Wrapped in useMemo so the array reference is stable between renders and
  // does not invalidate useCallback dependencies unnecessarily.
  const activeStages: string[] = useMemo(
    () =>
      selectedPipelineId
        ? (namedPipelines.find((p) => p.id === selectedPipelineId)?.stages ?? [...DEFAULT_STAGES])
        : [...DEFAULT_STAGES],
    [selectedPipelineId, namedPipelines],
  )

  const stageLabelFor = (stage: string): string =>
    DEFAULT_STAGE_LABELS[stage as DefaultStage] ?? stage

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  // Load named pipelines once
  useEffect(() => {
    void (async () => {
      try {
        const token = await getToken()
        const data = await apiGet<NamedPipeline[]>('/pipelines', token)
        setNamedPipelines(data)
        // Auto-select default pipeline if exists
        const def = data.find((p) => p.isDefault)
        if (def) setSelectedPipelineId(def.id)
      } catch {
        // silently ignore — named pipelines are optional
      }
    })()
  }, [])

  const loadPipeline = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (selectedPipelineId) {
        // Load contacts assigned to this specific pipeline
        const contacts = await apiGet<PipelineContact[]>(
          `/pipelines/${selectedPipelineId}/contacts`,
          token,
        )
        // Group by crmPipeline.stage
        const grouped: PipelineData = {}
        for (const stage of activeStages) grouped[stage] = []
        for (const contact of contacts) {
          const stage = contact.crmPipeline?.stage ?? activeStages[0] ?? 'NEW'
          if (!grouped[stage]) grouped[stage] = []
          grouped[stage].push(contact)
        }
        setPipeline(grouped)
        setTruncated(contacts.length >= 200)
      } else {
        const data = await apiGet<PipelineResponse>('/crm/pipeline', token)
        setPipeline(data.pipeline)
        setTruncated(data.truncated)
      }
    } catch (err) {
      if (isApiError(err) && (err.statusCode === 403 || err.statusCode === 401)) {
        setPermissionDenied(true)
        setError('You do not have permission to view the CRM pipeline.')
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load pipeline')
      }
    } finally {
      setLoading(false)
    }
  }, [selectedPipelineId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void loadPipeline()
  }, [loadPipeline])

  // Find the active contact for drag overlay
  const activeContact = activeId
    ? (Object.values(pipeline)
        .flat()
        .find((c) => c.id === activeId) ?? null)
    : null

  const findContactStage = useCallback(
    (contactId: string): string | null => {
      for (const stage of activeStages) {
        if ((pipeline[stage] ?? []).some((c) => c.id === contactId)) return stage
      }
      return null
    },
    [pipeline, activeStages],
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }

  const handleDragOver = (_event: DragOverEvent) => {
    // Could implement live preview here; keeping it simple for now
  }

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveId(null)
      const { active, over } = event
      if (!over) return

      const contactId = String(active.id)
      const targetStage = String(over.id)

      const sourceStage = findContactStage(contactId)
      if (!sourceStage || sourceStage === targetStage) return

      // Optimistic UI
      const contact = (pipeline[sourceStage] ?? []).find((c) => c.id === contactId)
      if (!contact) return
      const requestId = (stageMoveRequestIdsRef.current[contactId] ?? 0) + 1
      stageMoveRequestIdsRef.current[contactId] = requestId

      setPipeline((prev) => {
        const next = { ...prev }
        next[sourceStage] = (next[sourceStage] ?? []).filter((c) => c.id !== contactId)
        next[targetStage] = [
          { ...contact, crmPipeline: { ...contact.crmPipeline, stage: targetStage } },
          ...(next[targetStage] ?? []),
        ]
        return next
      })

      try {
        const token = await getToken()
        await apiPatch(`/contacts/${contactId}/stage`, { stage: targetStage }, token)
      } catch {
        if (stageMoveRequestIdsRef.current[contactId] !== requestId) return
        // Revert
        setPipeline((prev) => {
          const next = { ...prev }
          next[targetStage] = (next[targetStage] ?? []).filter((c) => c.id !== contactId)
          next[sourceStage] = [contact, ...(next[sourceStage] ?? [])]
          return next
        })
        setToast('Failed to update stage. Change reverted.')
        setTimeout(() => setToast(null), 4000)
      }
    },
    [pipeline, findContactStage],
  )

  const handleCloseDrawer = useCallback(() => setDrawerContactId(null), [])

  const handleDrawerUpdate = useCallback(
    (updated: import('@/components/crm/ContactDetailDrawer').ContactDetail) => {
      // Reflect stage change in pipeline
      if (updated.crmPipeline) {
        void loadPipeline()
      }
    },
    [loadPipeline],
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="app-panel flex flex-wrap items-start justify-between gap-4 rounded-[30px] px-6 py-6 sm:px-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600">
            <CircleDot className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-500/80">
              Pipeline
            </p>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">CRM Pipeline</h1>
            <p className="mt-2 text-sm text-gray-500">
              Drag contacts between stages to update their pipeline status.
            </p>
          </div>
        </div>

        {/* Pipeline selector */}
        {namedPipelines.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 font-medium">Pipeline:</label>
            <SelectField
              value={selectedPipelineId}
              onChange={(e) => setSelectedPipelineId(e.target.value)}
              className="min-w-[190px] rounded-xl px-3 py-2.5 pr-10 focus:border-indigo-500 focus:ring-indigo-100"
            >
              <option value="">Default stages</option>
              {namedPipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.isDefault ? ' (default)' : ''}
                </option>
              ))}
            </SelectField>
          </div>
        )}
      </div>

      {/* Error */}
      {permissionDenied ? (
        <StatusNotice
          tone="warning"
          message="You do not have permission to view the CRM pipeline."
        />
      ) : error ? (
        <StatusNotice
          message={error}
          action={
            <button
              type="button"
              onClick={() => void loadPipeline()}
              className="font-semibold underline"
            >
              Retry
            </button>
          }
        />
      ) : null}

      {/* Truncation warning */}
      {truncated && !loading && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
          Showing the first 200 contacts. Use the{' '}
          <Link href="/contacts" className="font-semibold underline">
            Contacts page
          </Link>{' '}
          to view and filter all contacts.
        </div>
      )}

      {/* Toast */}
      {toast && <StatusNotice message={toast} />}

      {/* Loading skeleton */}
      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {activeStages.map((s) => (
            <div
              key={s}
              className="app-list-skeleton h-64 w-64 shrink-0 animate-pulse rounded-[24px]"
            />
          ))}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={(e) => void handleDragEnd(e)}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {activeStages.map((stage, idx) => (
              <DroppableColumn
                key={stage}
                stage={stage}
                stageLabel={stageLabelFor(stage)}
                colorClass={stageHeaderColor(stage, idx)}
                contacts={pipeline[stage] ?? []}
                onOpenContact={setDrawerContactId}
              />
            ))}
          </div>

          {/* Drag overlay */}
          <DragOverlay>
            {activeContact ? (
              <div className="app-panel w-56 cursor-grabbing rounded-[22px] p-3 opacity-95 shadow-xl">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white">
                    {getInitials(activeContact.name)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {activeContact.name}
                    </p>
                    {activeContact.company && (
                      <p className="text-xs text-gray-500 truncate">{activeContact.company}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Contact Detail Drawer */}
      <ContactDetailDrawer
        contactId={drawerContactId}
        onClose={handleCloseDrawer}
        onUpdate={handleDrawerUpdate}
      />
    </div>
  )
}
