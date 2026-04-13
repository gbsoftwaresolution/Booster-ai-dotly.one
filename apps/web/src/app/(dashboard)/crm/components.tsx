'use client'

import Link from 'next/link'
import type { JSX } from 'react'
import { CircleDot } from 'lucide-react'
import { DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core'

import { SelectField } from '@/components/ui/SelectField'

import { getInitials, timeAgo } from './helpers'
import type { NamedPipeline, PipelineContact } from './types'

export function KanbanCard({
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
      className="app-panel cursor-grab select-none rounded-[22px] p-3 active:cursor-grabbing"
    >
      <div className="flex items-start gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white">
          {getInitials(contact.name)}
        </div>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              onOpen()
            }}
            className="block w-full truncate text-left text-sm font-semibold text-gray-900 hover:text-indigo-600"
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

export function DroppableColumn({
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
      <div className={`rounded-t-[24px] border-b px-4 py-3 ${colorClass}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">{stageLabel}</h3>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-gray-600 shadow-sm">
            {contacts.length}
          </span>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={[
          'min-h-[200px] flex flex-1 flex-col gap-2 rounded-b-xl p-3 transition-colors',
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

export function CrmHeader({
  namedPipelines,
  selectedPipelineId,
  onPipelineChange,
}: {
  namedPipelines: NamedPipeline[]
  selectedPipelineId: string
  onPipelineChange: (value: string) => void
}): JSX.Element {
  return (
    <div className="app-panel flex flex-wrap items-start justify-between gap-4 rounded-[24px] px-6 py-6 sm:px-8">
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

      {namedPipelines.length > 0 && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Pipeline:</label>
          <SelectField
            value={selectedPipelineId}
            onChange={(event) => onPipelineChange(event.target.value)}
            className="min-w-[190px] rounded-xl px-3 py-2.5 pr-10 focus:border-indigo-500 focus:ring-indigo-100"
          >
            <option value="">Default stages</option>
            {namedPipelines.map((pipeline) => (
              <option key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
                {pipeline.isDefault ? ' (default)' : ''}
              </option>
            ))}
          </SelectField>
        </div>
      )}
    </div>
  )
}

export function TruncationNotice(): JSX.Element {
  return (
    <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
      Showing the first 200 contacts. Use the{' '}
      <Link href="/contacts" className="font-semibold underline">
        Contacts page
      </Link>{' '}
      to view and filter all contacts.
    </div>
  )
}

export function PipelineSkeleton({ stages }: { stages: string[] }): JSX.Element {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((stage) => (
        <div
          key={stage}
          className="app-list-skeleton h-64 w-64 shrink-0 animate-pulse rounded-[24px]"
        />
      ))}
    </div>
  )
}

export function ActiveContactOverlay({
  activeContact,
}: {
  activeContact: PipelineContact | null
}): JSX.Element {
  return (
    <DragOverlay>
      {activeContact ? (
        <div className="app-panel w-56 cursor-grabbing rounded-[22px] p-3 opacity-95 shadow-xl">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white">
              {getInitials(activeContact.name)}
            </div>
            <div>
              <p className="truncate text-sm font-semibold text-gray-900">{activeContact.name}</p>
              {activeContact.company && (
                <p className="truncate text-xs text-gray-500">{activeContact.company}</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </DragOverlay>
  )
}
