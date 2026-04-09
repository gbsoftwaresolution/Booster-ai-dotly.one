'use client'

import type { JSX } from 'react'
import { useState, useEffect, useCallback } from 'react'
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
import { apiGet, apiPatch } from '@/lib/api'
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

const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED', 'LOST'] as const
type Stage = (typeof STAGES)[number]

const STAGE_LABELS: Record<Stage, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  CLOSED: 'Closed',
  LOST: 'Lost',
}

const STAGE_HEADER_COLORS: Record<Stage, string> = {
  NEW: 'bg-gray-100 border-gray-200',
  CONTACTED: 'bg-blue-50 border-blue-200',
  QUALIFIED: 'bg-yellow-50 border-yellow-200',
  CLOSED: 'bg-green-50 border-green-200',
  LOST: 'bg-red-50 border-red-200',
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
      className="cursor-grab rounded-lg border border-gray-200 bg-white p-3 shadow-sm active:cursor-grabbing select-none"
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
  contacts,
  onOpenContact,
}: {
  stage: Stage
  contacts: PipelineContact[]
  onOpenContact: (id: string) => void
}): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  return (
    <div className="flex w-64 shrink-0 flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Column header */}
      <div className={`rounded-t-xl border-b px-4 py-3 ${STAGE_HEADER_COLORS[stage]}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">{STAGE_LABELS[stage]}</h3>
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
          <p className="py-4 text-center text-xs text-gray-400">Drop cards here</p>
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
  const [pipeline, setPipeline] = useState<PipelineData>({})
  const [truncated, setTruncated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [drawerContactId, setDrawerContactId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const loadPipeline = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      const data = await apiGet<PipelineResponse>('/crm/pipeline', token)
      setPipeline(data.pipeline)
      setTruncated(data.truncated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pipeline')
    } finally {
      setLoading(false)
    }
  }, [])

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
    (contactId: string): Stage | null => {
      for (const stage of STAGES) {
        if ((pipeline[stage] ?? []).some((c) => c.id === contactId)) return stage
      }
      return null
    },
    [pipeline],
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
      const targetStage = String(over.id) as Stage

      const sourceStage = findContactStage(contactId)
      if (!sourceStage || sourceStage === targetStage) return

      // Optimistic UI
      const contact = (pipeline[sourceStage] ?? []).find((c) => c.id === contactId)
      if (!contact) return

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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">CRM Pipeline</h1>
        <p className="mt-1 text-sm text-gray-500">
          Drag contacts between stages to update their pipeline status.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void loadPipeline()}
            className="font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Truncation warning */}
      {truncated && !loading && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
          Showing the first 200 contacts. Use the{' '}
          <a href="/contacts" className="font-semibold underline">
            Contacts page
          </a>{' '}
          to view and filter all contacts.
        </div>
      )}

      {/* Toast */}
      {toast && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{toast}</div>}

      {/* Loading skeleton */}
      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((s) => (
            <div key={s} className="h-64 w-64 shrink-0 animate-pulse rounded-xl bg-gray-100" />
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
            {STAGES.map((stage) => (
              <DroppableColumn
                key={stage}
                stage={stage}
                contacts={pipeline[stage] ?? []}
                onOpenContact={setDrawerContactId}
              />
            ))}
          </div>

          {/* Drag overlay */}
          <DragOverlay>
            {activeContact ? (
              <div className="cursor-grabbing rounded-lg border border-indigo-300 bg-white p-3 shadow-xl opacity-95 w-56">
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
