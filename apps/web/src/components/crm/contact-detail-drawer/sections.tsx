'use client'

import Link from 'next/link'
import React, { useEffect, useState, type JSX } from 'react'
import {
  Check,
  ChevronDown,
  ChevronRight,
  Mail,
  Pencil,
  Plus,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import {
  DEAL_STAGES,
  contactTimelineEventColor,
  contactTimelineEventLabel,
  relativeTimeLabel,
} from '@dotly/types'
import { SelectField } from '@/components/ui/SelectField'
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap'
import { formatCurrency, formatDate, formatDateInputValue, getDealStageClasses } from './helpers'
import type {
  ConfirmIntent,
  ContactDeal,
  ContactDetail,
  ContactEmail,
  ContactNote,
  ContactTask,
  CustomFieldDefinition,
  TimelineEvent,
} from './types'

function TimelineItem({ event }: { event: TimelineEvent }): JSX.Element {
  const meta = event.metadata
  const dotColor = contactTimelineEventColor(event)

  return (
    <div className="flex gap-3 py-2">
      <div className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
      <div>
        <p className="text-sm text-gray-700">{contactTimelineEventLabel(event)}</p>
        {event.event === 'NOTE_ADDED' && Boolean(meta.content) && (
          <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{String(meta.content)}</p>
        )}
        {event.event === 'ENRICHMENT_FAILED' && Boolean(meta.error) && (
          <p className="mt-0.5 line-clamp-2 text-xs text-red-500">{String(meta.error)}</p>
        )}
        <p className="mt-0.5 text-xs text-gray-400">{relativeTimeLabel(event.createdAt)}</p>
      </div>
    </div>
  )
}

export function ContactTimelineSection({ timeline }: { timeline: TimelineEvent[] }): JSX.Element {
  return (
    <section>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
        Timeline
      </h3>
      <div className="divide-y divide-gray-100">
        {timeline.map((event) => (
          <TimelineItem key={event.id} event={event} />
        ))}
      </div>
    </section>
  )
}

export function ContactDealsSection({
  deals,
  userTz,
  dealsExpanded,
  setDealsExpanded,
  updatingDealId,
  deletingDealId,
  setConfirmAction,
  updateDealStage,
  dealTitleInputId,
  dealValueInputId,
  dealCurrencyInputId,
  dealStageInputId,
  dealCloseDateInputId,
  dealForm,
  setDealForm,
  addDeal,
  addingDeal,
}: {
  deals: ContactDeal[]
  userTz?: string | null
  dealsExpanded: boolean
  setDealsExpanded: React.Dispatch<React.SetStateAction<boolean>>
  updatingDealId: string | null
  deletingDealId: string | null
  setConfirmAction: React.Dispatch<React.SetStateAction<ConfirmIntent | null>>
  updateDealStage: (dealId: string, stage: string) => Promise<void>
  dealTitleInputId: string
  dealValueInputId: string
  dealCurrencyInputId: string
  dealStageInputId: string
  dealCloseDateInputId: string
  dealForm: { title: string; value: string; currency: string; stage: string; closeDate: string }
  setDealForm: React.Dispatch<
    React.SetStateAction<{
      title: string
      value: string
      currency: string
      stage: string
      closeDate: string
    }>
  >
  addDeal: () => Promise<void>
  addingDeal: boolean
}): JSX.Element {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Deals</h3>
          <p className="mt-1 text-sm text-gray-500">
            Commercial opportunities linked to this contact.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDealsExpanded((prev) => !prev)}
          aria-expanded={dealsExpanded}
          aria-controls="contact-deals-form"
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
            {deals.map((deal) => {
              const busy = updatingDealId === deal.id || deletingDealId === deal.id

              return (
                <div key={deal.id} className="rounded-lg border border-gray-100 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-800">{deal.title}</p>
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
                      onClick={() =>
                        setConfirmAction({ type: 'deal', id: deal.id, label: deal.title })
                      }
                      disabled={busy}
                      className="app-touch-target text-gray-400 hover:text-red-500 disabled:opacity-50"
                      aria-label={`Delete deal ${deal.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <SelectField
                      aria-label={`Update ${deal.title} stage`}
                      value={deal.stage}
                      onChange={(e) => void updateDealStage(deal.id, e.target.value)}
                      disabled={busy}
                      className="app-touch-target rounded-xl px-3 py-2.5 pr-9 text-xs focus:border-indigo-400 focus:ring-indigo-100"
                    >
                      {DEAL_STAGES.map((stage) => (
                        <option key={stage} value={stage}>
                          {stage.replace('_', ' ')}
                        </option>
                      ))}
                    </SelectField>
                    {deal.probability != null && (
                      <span className="text-xs text-gray-400">{deal.probability}% probability</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No deals yet.</p>
        )}

        {dealsExpanded && (
          <div id="contact-deals-form" className="space-y-2 border-t border-gray-100 pt-3">
            <label htmlFor={dealTitleInputId} className="sr-only">
              Deal title
            </label>
            <input
              id={dealTitleInputId}
              type="text"
              value={dealForm.title}
              onChange={(e) => setDealForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Deal title"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <div className="grid grid-cols-2 gap-2">
              <label htmlFor={dealValueInputId} className="sr-only">
                Deal value
              </label>
              <input
                id={dealValueInputId}
                type="number"
                min="0"
                value={dealForm.value}
                onChange={(e) => setDealForm((prev) => ({ ...prev, value: e.target.value }))}
                placeholder="Value"
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <SelectField
                id={dealCurrencyInputId}
                aria-label="Deal currency"
                value={dealForm.currency}
                onChange={(e) => setDealForm((prev) => ({ ...prev, currency: e.target.value }))}
                className="rounded-xl px-3 py-2.5 pr-9 focus:border-indigo-400 focus:ring-indigo-100"
              >
                {['USD', 'EUR', 'GBP'].map((currency) => (
                  <option key={currency} value={currency}>
                    {currency}
                  </option>
                ))}
              </SelectField>
              <SelectField
                id={dealStageInputId}
                aria-label="Deal stage"
                value={dealForm.stage}
                onChange={(e) => setDealForm((prev) => ({ ...prev, stage: e.target.value }))}
                className="rounded-xl px-3 py-2.5 pr-9 focus:border-indigo-400 focus:ring-indigo-100"
              >
                {DEAL_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </SelectField>
              <label htmlFor={dealCloseDateInputId} className="sr-only">
                Deal close date
              </label>
              <input
                id={dealCloseDateInputId}
                type="date"
                value={dealForm.closeDate}
                onChange={(e) => setDealForm((prev) => ({ ...prev, closeDate: e.target.value }))}
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
  )
}

export function ContactNotesSection({
  notes,
  editingNoteId,
  editNoteContent,
  setEditNoteContent,
  saveEditNote,
  savingEditNoteId,
  cancelEditNote,
  startEditNote,
  setConfirmAction,
  deletingNoteId,
  newNote,
  setNewNote,
  addNote,
  addingNote,
}: {
  notes: ContactNote[]
  editingNoteId: string | null
  editNoteContent: string
  setEditNoteContent: React.Dispatch<React.SetStateAction<string>>
  saveEditNote: (noteId: string) => Promise<void>
  savingEditNoteId: string | null
  cancelEditNote: () => void
  startEditNote: (note: ContactNote) => void
  setConfirmAction: React.Dispatch<React.SetStateAction<ConfirmIntent | null>>
  deletingNoteId: string | null
  newNote: string
  setNewNote: React.Dispatch<React.SetStateAction<string>>
  addNote: () => Promise<void>
  addingNote: boolean
}): JSX.Element {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Notes</h3>
        <span className="text-xs font-medium text-gray-500">{notes.length}</span>
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
                      <p className="whitespace-pre-wrap text-sm text-gray-700">{note.content}</p>
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
                          onClick={() =>
                            setConfirmAction({
                              type: 'note',
                              id: note.id,
                              label: note.content.slice(0, 60),
                            })
                          }
                          disabled={deletingNoteId === note.id}
                          className="app-touch-target text-gray-400 hover:text-red-500 disabled:opacity-50"
                          aria-label="Delete note"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-400">
                      {relativeTimeLabel(note.createdAt)}
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
  )
}

export function ContactTasksSection({
  tasks,
  userTz,
  updatingTaskId,
  deletingTaskId,
  toggleTask,
  setConfirmAction,
  taskTitleInputId,
  taskDueAtInputId,
  taskTitle,
  setTaskTitle,
  taskDueAt,
  setTaskDueAt,
  addTask,
  addingTask,
}: {
  tasks: ContactTask[]
  userTz?: string | null
  updatingTaskId: string | null
  deletingTaskId: string | null
  toggleTask: (task: ContactTask) => Promise<void>
  setConfirmAction: React.Dispatch<React.SetStateAction<ConfirmIntent | null>>
  taskTitleInputId: string
  taskDueAtInputId: string
  taskTitle: string
  setTaskTitle: React.Dispatch<React.SetStateAction<string>>
  taskDueAt: string
  setTaskDueAt: React.Dispatch<React.SetStateAction<string>>
  addTask: () => Promise<void>
  addingTask: boolean
}): JSX.Element {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Execution</h3>
          <p className="mt-1 text-sm text-gray-500">
            Keep active tasks and deals moving from one place.
          </p>
        </div>
      </div>
      <div className="app-panel-subtle space-y-3 rounded-[24px] p-3">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">Tasks</p>
            <p className="mt-1 text-sm text-gray-500">Open follow-ups tied to this contact.</p>
          </div>
          <span className="text-xs font-medium text-gray-500">{tasks.length}</span>
        </div>
        {tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.map((task) => {
              const dueAt = task.dueAt
              const overdue = dueAt ? !task.completed && new Date(dueAt) < new Date() : false
              const busy = updatingTaskId === task.id || deletingTaskId === task.id
              return (
                <div
                  key={task.id}
                  className="flex items-start gap-3 rounded-lg border border-gray-100 px-3 py-2"
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    disabled={busy}
                    onChange={() => void toggleTask(task)}
                    aria-label={`${task.completed ? 'Mark incomplete' : 'Mark complete'}: ${task.title}`}
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
                      <p className={`mt-0.5 text-xs ${overdue ? 'text-red-600' : 'text-gray-400'}`}>
                        Due {formatDate(task.dueAt, userTz)}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmAction({ type: 'task', id: task.id, label: task.title })
                    }
                    disabled={busy}
                    className="app-touch-target text-gray-400 hover:text-red-500 disabled:opacity-50"
                    aria-label={`Delete task ${task.title}`}
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
          <label htmlFor={taskTitleInputId} className="sr-only">
            Task title
          </label>
          <input
            id={taskTitleInputId}
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
            <label htmlFor={taskDueAtInputId} className="sr-only">
              Task due date
            </label>
            <input
              id={taskDueAtInputId}
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
  )
}

export function ContactCustomFieldsSection({
  contact,
  customFieldsExpanded,
  setCustomFieldsExpanded,
  customFieldsError,
  customFields,
  saveCustomFieldValue,
  savingCustomFieldId,
}: {
  contact: ContactDetail
  customFieldsExpanded: boolean
  setCustomFieldsExpanded: React.Dispatch<React.SetStateAction<boolean>>
  customFieldsError: string | null
  customFields: CustomFieldDefinition[]
  saveCustomFieldValue: (fieldId: string, value: string) => Promise<void>
  savingCustomFieldId: string | null
}): JSX.Element {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Additional context</h3>
          <p className="mt-1 text-sm text-gray-500">
            Structured fields, notes, history, and enrichment signals.
          </p>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
          Custom Fields
        </h3>
        <button
          type="button"
          onClick={() => setCustomFieldsExpanded((prev) => !prev)}
          aria-expanded={customFieldsExpanded}
          aria-controls="contact-custom-fields"
          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          {customFieldsExpanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          {customFieldsExpanded ? 'Hide' : 'Show'}
        </button>
      </div>

      {!customFieldsExpanded ? (
        <div className="rounded-xl border border-dashed border-gray-200 px-4 py-4 text-sm text-gray-400">
          Load custom field definitions only when you need to review or edit them.
        </div>
      ) : customFieldsError ? (
        <div className="rounded-xl border border-dashed border-amber-200 px-4 py-4 text-sm text-amber-700">
          {customFieldsError}
        </div>
      ) : customFields.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 px-4 py-4 text-sm text-gray-400">
          No custom fields.{' '}
          <Link href="/crm/custom-fields" className="font-medium text-indigo-600 hover:underline">
            Manage custom fields
          </Link>
        </div>
      ) : (
        <div id="contact-custom-fields" className="app-panel-subtle space-y-2 rounded-[24px] p-3">
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
                saving={savingCustomFieldId === field.id}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}

export function ContactTagsSection({
  tags,
  tagInputId,
  newTag,
  setNewTag,
  addTag,
  removeTag,
}: {
  tags: string[]
  tagInputId: string
  newTag: string
  setNewTag: React.Dispatch<React.SetStateAction<string>>
  addTag: () => Promise<void>
  removeTag: (tag: string) => Promise<void>
}): JSX.Element {
  return (
    <section>
      <div className="rounded-[24px] border border-gray-100 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Tags</h3>
            <p className="mt-1 text-sm text-gray-500">
              Keep segmentation and routing context attached to this contact.
            </p>
          </div>
          <span className="text-xs font-medium text-gray-500">{tags.length}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700"
            >
              {tag}
              <button
                type="button"
                onClick={() => void removeTag(tag)}
                aria-label={`Remove tag ${tag}`}
                className="ml-1 text-gray-400 hover:text-red-500"
              >
                ×
              </button>
            </span>
          ))}
          <label htmlFor={tagInputId} className="sr-only">
            Add tag
          </label>
          <input
            id={tagInputId}
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
      </div>
    </section>
  )
}

export function ContactEnrichmentSection({
  contact,
  reenriching,
  handleReenrich,
}: {
  contact: ContactDetail
  reenriching: boolean
  handleReenrich: () => Promise<void>
}): JSX.Element {
  const lastEnrichEvent = contact.timeline
    ?.filter((event) => ['ENRICHMENT_COMPLETED', 'ENRICHMENT_FAILED'].includes(event.event))
    .at(0)

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
          AI Enrichment
        </h3>
        <button
          type="button"
          onClick={() => void handleReenrich()}
          disabled={reenriching}
          className="app-touch-target rounded-xl bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-100 disabled:opacity-50"
        >
          {reenriching ? 'Queuing...' : contact.enrichedAt ? 'Re-enrich' : 'Enrich with AI'}
        </button>
      </div>

      {lastEnrichEvent?.event === 'ENRICHMENT_FAILED' && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <strong>Enrichment failed:</strong>{' '}
          {String(lastEnrichEvent.metadata.error ?? 'Unknown error')}
        </div>
      )}

      {contact.enrichedAt ? (
        <div className="space-y-3">
          {contact.enrichmentScore != null && (
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                <span>Confidence</span>
                <span className="font-medium text-gray-700">{contact.enrichmentScore}/100</span>
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
          No enrichment data yet. Click &ldquo;Enrich with AI&rdquo; to analyse this contact.
        </p>
      )}
    </section>
  )
}

export function ContactEmailHistorySection({
  emailHistoryExpanded,
  setEmailHistoryExpanded,
  emailsError,
  emails,
}: {
  emailHistoryExpanded: boolean
  setEmailHistoryExpanded: React.Dispatch<React.SetStateAction<boolean>>
  emailsError: string | null
  emails: ContactEmail[]
}): JSX.Element {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
          Email History
        </h3>
        <button
          type="button"
          onClick={() => setEmailHistoryExpanded((prev) => !prev)}
          aria-expanded={emailHistoryExpanded}
          aria-controls="contact-email-history"
          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          {emailHistoryExpanded ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
          {emailHistoryExpanded ? 'Hide' : 'Load'}
        </button>
      </div>

      {emailHistoryExpanded && emailsError ? (
        <p className="text-sm text-amber-700">{emailsError}</p>
      ) : emailHistoryExpanded && emails.length > 0 ? (
        <div id="contact-email-history" className="space-y-2 rounded-xl border border-gray-200 p-3">
          {emails.map((email) => (
            <div key={email.id} className="rounded-lg border border-gray-100 px-3 py-2">
              <p className="truncate text-sm font-medium text-gray-800">
                {email.subject || '(no subject)'}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-400">{relativeTimeLabel(email.sentAt)}</span>
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
      ) : emailHistoryExpanded ? (
        <p className="text-sm text-gray-400">No emails yet.</p>
      ) : (
        <p className="text-sm text-gray-400">Load email history on demand.</p>
      )}
    </section>
  )
}

export function ConfirmDrawerDialog({
  title,
  message,
  onCancel,
  onConfirm,
}: {
  title: string
  message: string
  onCancel: () => void
  onConfirm: () => void
}): JSX.Element {
  const dialogRef = React.useRef<HTMLDivElement>(null)
  const cancelButtonRef = React.useRef<HTMLButtonElement>(null)

  useDialogFocusTrap({
    active: true,
    containerRef: dialogRef,
    initialFocusRef: cancelButtonRef,
    onEscape: onCancel,
  })

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/40" onClick={onCancel} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="contact-drawer-confirm-title"
        className="app-confirm-panel z-[80]"
      >
        <h3 id="contact-drawer-confirm-title" className="text-sm font-semibold text-gray-900">
          {title}
        </h3>
        <p className="mt-1 text-sm text-gray-600">{message}</p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="app-touch-target rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="app-touch-target rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </>
  )
}

function EditableCustomField({
  field,
  value,
  onSave,
  saving,
}: {
  field: CustomFieldDefinition
  value: string
  onSave: (value: string) => void
  saving: boolean
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
            aria-label={field.label}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => {
              if (saving) return
              setEditing(false)
              onSave(draft)
            }}
            disabled={saving}
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
            aria-label={field.label}
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
              if (saving) return
              setEditing(false)
              onSave(draft)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
            }}
            disabled={saving}
            className="w-full rounded border border-indigo-300 px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        )}
        {saving && <p className="mt-2 text-xs text-indigo-600">Saving...</p>}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      disabled={saving}
      className="flex w-full items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-left hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
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

export function EditableField({
  label,
  icon: Icon,
  value,
  onSave,
}: {
  label: string
  icon: LucideIcon
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
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-gray-400" />
        <input
          autoFocus
          aria-label={label}
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
