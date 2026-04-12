'use client'

import type { JSX } from 'react'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { ItemsResponse } from '@dotly/types'

import { ContactDetailDrawer } from '@/components/crm/ContactDetailDrawer'
import { StatusNotice } from '@/components/ui/StatusNotice'
import { apiGet, apiPatch, isApiError } from '@/lib/api'

import {
  ActiveContactOverlay,
  CrmHeader,
  DroppableColumn,
  PipelineSkeleton,
  TruncationNotice,
} from './components'
import { DEFAULT_STAGES, getStageLabel, getToken, stageHeaderColor } from './helpers'
import type { NamedPipeline, PipelineContact, PipelineData, PipelineResponse } from './types'

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
  const [namedPipelines, setNamedPipelines] = useState<NamedPipeline[]>([])
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('')

  const activeStages: string[] = useMemo(
    () =>
      selectedPipelineId
        ? (namedPipelines.find((pipelineItem) => pipelineItem.id === selectedPipelineId)
            ?.stages ?? [...DEFAULT_STAGES])
        : [...DEFAULT_STAGES],
    [selectedPipelineId, namedPipelines],
  )

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  useEffect(() => {
    void (async () => {
      try {
        const token = await getToken()
        const data = await apiGet<ItemsResponse<NamedPipeline>>('/pipelines', token)
        setNamedPipelines(data.items)
        const defaultPipeline = data.items.find((pipelineItem) => pipelineItem.isDefault)
        if (defaultPipeline) setSelectedPipelineId(defaultPipeline.id)
      } catch {
        // Named pipelines are optional.
      }
    })()
  }, [])

  const loadPipeline = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const token = await getToken()

      if (selectedPipelineId) {
        const contacts = await apiGet<ItemsResponse<PipelineContact>>(
          `/pipelines/${selectedPipelineId}/contacts`,
          token,
        )

        const grouped: PipelineData = {}
        for (const stage of activeStages) grouped[stage] = []
        for (const contact of contacts.items) {
          const stage = contact.crmPipeline?.stage ?? activeStages[0] ?? 'NEW'
          if (!grouped[stage]) grouped[stage] = []
          grouped[stage].push(contact)
        }

        setPipeline(grouped)
        setTruncated(contacts.items.length >= 200)
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
  }, [activeStages, selectedPipelineId])

  useEffect(() => {
    void loadPipeline()
  }, [loadPipeline])

  const activeContact = activeId
    ? (Object.values(pipeline)
        .flat()
        .find((contact) => contact.id === activeId) ?? null)
    : null

  const findContactStage = useCallback(
    (contactId: string): string | null => {
      for (const stage of activeStages) {
        if ((pipeline[stage] ?? []).some((contact) => contact.id === contactId)) return stage
      }
      return null
    },
    [pipeline, activeStages],
  )

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  function handleDragOver(_event: DragOverEvent) {
    // Keep the live preview simple.
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

      const contact = (pipeline[sourceStage] ?? []).find((item) => item.id === contactId)
      if (!contact) return

      const requestId = (stageMoveRequestIdsRef.current[contactId] ?? 0) + 1
      stageMoveRequestIdsRef.current[contactId] = requestId

      setPipeline((prev) => {
        const next = { ...prev }
        next[sourceStage] = (next[sourceStage] ?? []).filter((item) => item.id !== contactId)
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

        setPipeline((prev) => {
          const next = { ...prev }
          next[targetStage] = (next[targetStage] ?? []).filter((item) => item.id !== contactId)
          next[sourceStage] = [contact, ...(next[sourceStage] ?? [])]
          return next
        })
        setToast('Failed to update stage. Change reverted.')
        setTimeout(() => setToast(null), 4000)
      }
    },
    [findContactStage, pipeline],
  )

  const handleCloseDrawer = useCallback(() => setDrawerContactId(null), [])

  const handleDrawerUpdate = useCallback(
    (updated: import('@/components/crm/ContactDetailDrawer').ContactDetail) => {
      if (updated.crmPipeline) {
        void loadPipeline()
      }
    },
    [loadPipeline],
  )

  return (
    <div className="space-y-6">
      <CrmHeader
        namedPipelines={namedPipelines}
        selectedPipelineId={selectedPipelineId}
        onPipelineChange={setSelectedPipelineId}
      />

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

      {truncated && !loading && <TruncationNotice />}

      {toast && <StatusNotice message={toast} />}

      {loading ? (
        <PipelineSkeleton stages={activeStages} />
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={(event) => void handleDragEnd(event)}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {activeStages.map((stage, index) => (
              <DroppableColumn
                key={stage}
                stage={stage}
                stageLabel={getStageLabel(stage)}
                colorClass={stageHeaderColor(stage, index)}
                contacts={pipeline[stage] ?? []}
                onOpenContact={setDrawerContactId}
              />
            ))}
          </div>

          <ActiveContactOverlay activeContact={activeContact} />
        </DndContext>
      )}

      <ContactDetailDrawer
        contactId={drawerContactId}
        onClose={handleCloseDrawer}
        onUpdate={handleDrawerUpdate}
      />
    </div>
  )
}
