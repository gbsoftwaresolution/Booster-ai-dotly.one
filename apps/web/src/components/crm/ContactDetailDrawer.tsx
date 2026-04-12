'use client'

import React, { useState, useEffect, useCallback, useId, type JSX } from 'react'
import { CONTACT_STAGES, type ContactDetailResponse } from '@dotly/types'
import { X, Mail, Phone, Building2, Globe, Briefcase, MapPin, Search, Loader2 } from 'lucide-react'
import { useUserTimezone } from '@/hooks/useUserLocale'
import { apiGet, apiPut, apiPatch, apiPost } from '@/lib/api'
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap'
import { ComposeEmailModal } from './ComposeEmailModal'
import { ModalBackdrop } from './ModalBackdrop'
import {
  getInitials,
  getScoreClasses,
  getToken,
  sortTasks,
  STAGE_ACTIVE,
  STAGE_COLORS,
} from './contact-detail-drawer/helpers'
import {
  useContactCustomFields,
  useContactDeals,
  useContactEmailHistory,
  useContactNotes,
  useContactTags,
  useContactTasks,
} from './contact-detail-drawer/hooks'
import {
  ConfirmDrawerDialog,
  ContactCustomFieldsSection,
  ContactDealsSection,
  ContactEmailHistorySection,
  ContactEnrichmentSection,
  ContactNotesSection,
  ContactTagsSection,
  ContactTasksSection,
  ContactTimelineSection,
  EditableField,
} from './contact-detail-drawer/sections'
import type {
  ContactDetail,
  ContactDetailDrawerProps,
  ContactDeal,
  ContactTask,
  DuplicateContact,
  DuplicateGroup,
} from './contact-detail-drawer/types'

const STAGES = CONTACT_STAGES
type Stage = (typeof STAGES)[number]

export type { ContactDetail, ContactDetailDrawerProps } from './contact-detail-drawer/types'

function normalizeContactDetail(data: ContactDetailResponse): ContactDetail {
  return {
    ...data,
    tags: data.tags ?? [],
    createdAt: data.createdAt ?? '',
    contactNotes: data.contactNotes ?? [],
    tasks: sortTasks((data.tasks as ContactTask[] | undefined) ?? []),
    deals: ((data.deals as ContactDeal[] | undefined) ?? []).map((deal) => ({
      ...deal,
      value: deal.value == null ? null : String(deal.value),
      probability: deal.probability == null ? null : Number(deal.probability),
    })),
    customFieldValues: (data.customFieldValues ?? []).map((value) => ({
      ...value,
      field: {
        label: value.field?.label ?? '',
        fieldType: value.field?.fieldType ?? 'TEXT',
      },
    })),
  }
}

export function ContactDetailDrawer({
  contactId,
  onClose,
  onUpdate,
  onMutate,
}: ContactDetailDrawerProps): JSX.Element | null {
  const drawerRef = React.useRef<HTMLDivElement>(null)
  const closeButtonRef = React.useRef<HTMLButtonElement>(null)
  const mergeDialogRef = React.useRef<HTMLDivElement>(null)
  const mergeCloseButtonRef = React.useRef<HTMLButtonElement>(null)
  const loadRequestIdRef = React.useRef(0)
  const reenrichTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const drawerTitleId = useId()
  const tagInputId = useId()
  const taskTitleInputId = useId()
  const taskDueAtInputId = useId()
  const dealTitleInputId = useId()
  const dealValueInputId = useId()
  const dealCurrencyInputId = useId()
  const dealStageInputId = useId()
  const dealCloseDateInputId = useId()

  const [contact, setContact] = useState<ContactDetail | null>(null)
  const userTz = useUserTimezone()
  const [loading, setLoading] = useState(false)
  const [drawerError, setDrawerError] = useState<string | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const [composeOpen, setComposeOpen] = useState(false)
  const [reenriching, setReenriching] = useState(false)
  const [mergeModalOpen, setMergeModalOpen] = useState(false)
  const [loadingDuplicates, setLoadingDuplicates] = useState(false)
  const [mergeCandidates, setMergeCandidates] = useState<DuplicateContact[]>([])
  const [mergingDuplicateId, setMergingDuplicateId] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<
    | { type: 'note'; id: string; label: string }
    | { type: 'task'; id: string; label: string }
    | { type: 'deal'; id: string; label: string }
    | null
  >(null)

  useDialogFocusTrap({
    active: Boolean(contactId) && !composeOpen && !mergeModalOpen,
    containerRef: drawerRef,
    initialFocusRef: closeButtonRef,
    onEscape: onClose,
  })

  useDialogFocusTrap({
    active: mergeModalOpen,
    containerRef: mergeDialogRef,
    initialFocusRef: mergeCloseButtonRef,
    onEscape: () => setMergeModalOpen(false),
  })

  const clearReenrichTimer = useCallback(() => {
    if (reenrichTimerRef.current) {
      clearTimeout(reenrichTimerRef.current)
      reenrichTimerRef.current = null
    }
  }, [])

  const loadContact = useCallback(async (id: string) => {
    const requestId = ++loadRequestIdRef.current
    setLoading(true)
    setDrawerError(null)
    try {
      const token = await getToken()
      const data = await apiGet<ContactDetailResponse>(`/contacts/${id}`, token)
      if (loadRequestIdRef.current !== requestId) return
      setContact(normalizeContactDetail(data))
    } catch (err) {
      if (loadRequestIdRef.current !== requestId) return
      setDrawerError(err instanceof Error ? err.message : 'Failed to load contact')
    } finally {
      if (loadRequestIdRef.current !== requestId) return
      setLoading(false)
    }
  }, [])

  const notesState = useContactNotes({ contact, setContact, loadContact, onMutate, setDrawerError })
  const tasksState = useContactTasks({ contact, setContact, onMutate, setDrawerError })
  const dealsState = useContactDeals({ contact, setContact, onMutate, setDrawerError })
  const tagsState = useContactTags({ contact, setContact, onMutate, setDrawerError })
  const customFieldsState = useContactCustomFields({
    contactId,
    contact,
    setContact,
    setDrawerError,
  })
  const emailHistoryState = useContactEmailHistory({ contactId })

  const resetTransientState = useCallback(() => {
    clearReenrichTimer()
    notesState.resetNotesState()
    tasksState.resetTasksState()
    dealsState.resetDealsState()
    tagsState.resetTagsState()
    customFieldsState.resetCustomFieldsState()
    emailHistoryState.resetEmailHistoryState()
    setMergeModalOpen(false)
    setLoadingDuplicates(false)
    setMergeCandidates([])
    setMergingDuplicateId(null)
    setConfirmAction(null)
    setReenriching(false)
  }, [
    clearReenrichTimer,
    customFieldsState,
    dealsState,
    emailHistoryState,
    notesState,
    tagsState,
    tasksState,
  ])

  useEffect(() => {
    if (contactId) {
      void loadContact(contactId)
      return
    }
    loadRequestIdRef.current += 1
    resetTransientState()
    setContact(null)
    setDrawerError(null)
  }, [contactId, loadContact, resetTransientState])

  useEffect(() => () => clearReenrichTimer(), [clearReenrichTimer])

  const saveField = useCallback(
    async (field: string, value: string) => {
      if (!contact) return
      try {
        const token = await getToken()
        const updated = await apiPut<ContactDetailResponse>(
          `/contacts/${contact.id}`,
          { [field]: value },
          token,
        )
        const normalized = normalizeContactDetail(updated)
        setContact((prev) => (prev ? { ...prev, ...normalized } : prev))
        onUpdate?.(normalized)
        onMutate?.()
      } catch (err) {
        setDrawerError(err instanceof Error ? err.message : 'Failed to save field')
      }
    },
    [contact, onMutate, onUpdate],
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
        onMutate?.()
      } catch (err) {
        setDrawerError(err instanceof Error ? err.message : 'Failed to update stage')
      }
    },
    [contact, onMutate],
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
    clearReenrichTimer()
    const previousEnrichedAt = contact.enrichedAt
    const currentRequestId = loadRequestIdRef.current
    try {
      const token = await getToken()
      await apiPost(`/contacts/${contact.id}/enrich`, {}, token)
      const currentContactId = contact.id
      let attempts = 0
      const poll = async () => {
        attempts++
        try {
          const refreshed = await apiGet<ContactDetailResponse>(
            `/contacts/${currentContactId}`,
            await getToken(),
          )
          if (loadRequestIdRef.current !== currentRequestId || contactId !== currentContactId)
            return
          if (refreshed.enrichedAt !== previousEnrichedAt) {
            await loadContact(currentContactId)
            setReenriching(false)
            return
          }
        } catch {
          // ignore poll errors
        }
        if (attempts < 15) {
          reenrichTimerRef.current = setTimeout(() => void poll(), 2000)
        } else {
          void loadContact(currentContactId)
          setReenriching(false)
        }
      }
      reenrichTimerRef.current = setTimeout(() => void poll(), 2000)
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : 'Failed to start enrichment')
      setReenriching(false)
    }
  }, [clearReenrichTimer, contact, contactId, loadContact])

  if (!contactId) return null

  const notes = contact?.contactNotes ?? []
  const tasks = contact?.tasks ?? []
  const deals = contact?.deals ?? []

  return (
    <>
      <ModalBackdrop onClick={onClose} tone="drawer" />
      <div
        ref={drawerRef}
        className="app-side-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby={drawerTitleId}
      >
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-200 bg-white/92 px-5 py-4 backdrop-blur-xl">
          {contact && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-sm font-bold text-white">
              {getInitials(contact.name)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            {editingName && contact ? (
              <input
                autoFocus
                aria-label="Contact name"
                className="w-full rounded border border-indigo-300 px-2 py-1 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={async () => {
                  setEditingName(false)
                  if (editName.trim() && editName !== contact.name)
                    await saveField('name', editName.trim())
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
                <span id={drawerTitleId}>{loading ? 'Loading...' : (contact?.name ?? '')}</span>
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
              className="app-touch-target hidden items-center gap-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 sm:inline-flex"
            >
              <Search className="h-3.5 w-3.5" />
              Find Duplicates
            </button>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              aria-label="Close contact details"
              className="app-touch-target rounded-xl p-2.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-4">
          <button
            type="button"
            onClick={() => void openMergeModal()}
            className="app-touch-target inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 sm:hidden"
          >
            <Search className="h-4 w-4" />
            Find Duplicates
          </button>

          {drawerError && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span className="shrink-0 font-semibold">Error:</span>
              <span>{drawerError}</span>
              <button
                type="button"
                className="app-touch-target ml-auto shrink-0 rounded-full p-2 text-red-400 hover:bg-red-100 hover:text-red-600"
                onClick={() => setDrawerError(null)}
                aria-label="Dismiss error"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="h-8 animate-pulse rounded bg-gray-100" />
              ))}
            </div>
          )}

          {contact && (
            <>
              <section>
                <div className="rounded-[24px] border border-gray-100 bg-white p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Overview</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Core details, pipeline position, and key identifiers.
                      </p>
                    </div>
                    {contact.sourceCard && (
                      <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                        Source: /{contact.sourceCard.handle}
                      </span>
                    )}
                  </div>
                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">
                        Stage
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {STAGES.map((stage) => {
                          const isActive = contact.crmPipeline?.stage === stage
                          return (
                            <button
                              key={stage}
                              type="button"
                              onClick={() => void handleStageChange(stage)}
                              aria-pressed={isActive}
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
                    </div>
                    <div className="space-y-2">
                      {[
                        { field: 'email', label: 'Email', icon: Mail, value: contact.email },
                        { field: 'phone', label: 'Phone', icon: Phone, value: contact.phone },
                        {
                          field: 'company',
                          label: 'Company',
                          icon: Building2,
                          value: contact.company,
                        },
                        { field: 'title', label: 'Title', icon: Briefcase, value: contact.title },
                        { field: 'website', label: 'Website', icon: Globe, value: contact.website },
                        {
                          field: 'address',
                          label: 'Address',
                          icon: MapPin,
                          value: contact.address,
                        },
                      ].map(({ field, label, icon: Icon, value }) => (
                        <EditableField
                          key={field}
                          label={label}
                          icon={Icon}
                          value={value ?? ''}
                          onSave={(nextValue) => saveField(field, nextValue)}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <ContactTagsSection
                tags={contact.tags}
                tagInputId={tagInputId}
                newTag={tagsState.newTag}
                setNewTag={tagsState.setNewTag}
                addTag={tagsState.addTag}
                removeTag={tagsState.removeTag}
              />
              <ContactTasksSection
                tasks={tasks}
                userTz={userTz}
                updatingTaskId={tasksState.updatingTaskId}
                deletingTaskId={tasksState.deletingTaskId}
                toggleTask={tasksState.toggleTask}
                setConfirmAction={setConfirmAction}
                taskTitleInputId={taskTitleInputId}
                taskDueAtInputId={taskDueAtInputId}
                taskTitle={tasksState.taskTitle}
                setTaskTitle={tasksState.setTaskTitle}
                taskDueAt={tasksState.taskDueAt}
                setTaskDueAt={tasksState.setTaskDueAt}
                addTask={tasksState.addTask}
                addingTask={tasksState.addingTask}
              />
              <ContactDealsSection
                deals={deals}
                userTz={userTz}
                dealsExpanded={dealsState.dealsExpanded}
                setDealsExpanded={dealsState.setDealsExpanded}
                updatingDealId={dealsState.updatingDealId}
                deletingDealId={dealsState.deletingDealId}
                setConfirmAction={setConfirmAction}
                updateDealStage={dealsState.updateDealStage}
                dealTitleInputId={dealTitleInputId}
                dealValueInputId={dealValueInputId}
                dealCurrencyInputId={dealCurrencyInputId}
                dealStageInputId={dealStageInputId}
                dealCloseDateInputId={dealCloseDateInputId}
                dealForm={dealsState.dealForm}
                setDealForm={dealsState.setDealForm}
                addDeal={dealsState.addDeal}
                addingDeal={dealsState.addingDeal}
              />
              <ContactCustomFieldsSection
                contact={contact}
                customFieldsExpanded={customFieldsState.customFieldsExpanded}
                setCustomFieldsExpanded={customFieldsState.setCustomFieldsExpanded}
                customFieldsError={customFieldsState.customFieldsError}
                customFields={customFieldsState.customFields}
                saveCustomFieldValue={customFieldsState.saveCustomFieldValue}
                savingCustomFieldId={customFieldsState.savingCustomFieldId}
              />
              <ContactNotesSection
                notes={notes}
                editingNoteId={notesState.editingNoteId}
                editNoteContent={notesState.editNoteContent}
                setEditNoteContent={notesState.setEditNoteContent}
                saveEditNote={notesState.saveEditNote}
                savingEditNoteId={notesState.savingEditNoteId}
                cancelEditNote={notesState.cancelEditNote}
                startEditNote={notesState.startEditNote}
                setConfirmAction={setConfirmAction}
                deletingNoteId={notesState.deletingNoteId}
                newNote={notesState.newNote}
                setNewNote={notesState.setNewNote}
                addNote={notesState.addNote}
                addingNote={notesState.addingNote}
              />
              {contact.timeline && contact.timeline.length > 0 && (
                <ContactTimelineSection timeline={contact.timeline} />
              )}
              <ContactEmailHistorySection
                emailHistoryExpanded={emailHistoryState.emailHistoryExpanded}
                setEmailHistoryExpanded={emailHistoryState.setEmailHistoryExpanded}
                emailsError={emailHistoryState.emailsError}
                emails={emailHistoryState.emails}
              />
              <ContactEnrichmentSection
                contact={contact}
                reenriching={reenriching}
                handleReenrich={handleReenrich}
              />
            </>
          )}
        </div>

        {contact?.email && (
          <div className="sticky bottom-0 border-t border-gray-200 bg-white/92 px-5 py-4 backdrop-blur-xl">
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
        <div className="app-dialog-shell z-[60] px-0 sm:px-4">
          <div
            ref={mergeDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="merge-contacts-dialog-title"
            className="app-dialog-panel max-w-lg"
          >
            <div className="app-modal-header">
              <div>
                <h3
                  id="merge-contacts-dialog-title"
                  className="text-base font-semibold text-gray-900"
                >
                  Duplicate Contacts
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Merge another record into this contact.
                </p>
              </div>
              <button
                ref={mergeCloseButtonRef}
                type="button"
                onClick={() => setMergeModalOpen(false)}
                aria-label="Close duplicate contacts dialog"
                className="app-touch-target rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="app-modal-body app-dialog-body-scroll space-y-3">
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
                      className="app-touch-target rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {mergingDuplicateId === candidate.id
                        ? 'Merging...'
                        : 'Merge into this contact'}
                    </button>
                  </div>
                ))
              ) : (
                <div className="app-empty-state rounded-none border-0 px-0 py-10 shadow-none">
                  <Search className="mb-4 h-10 w-10 text-slate-300" />
                  <p className="app-empty-state-title">No duplicates found</p>
                  <p className="app-empty-state-text mt-1">
                    We could not find another contact that looks like a confident merge candidate.
                  </p>
                </div>
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

      {confirmAction && (
        <ConfirmDrawerDialog
          title={`Delete ${confirmAction.type}`}
          message={`Delete "${confirmAction.label || confirmAction.type}"? This action cannot be undone.`}
          onCancel={() => setConfirmAction(null)}
          onConfirm={() => {
            const action = confirmAction
            setConfirmAction(null)
            if (action.type === 'note') {
              void notesState.deleteNote(action.id)
              return
            }
            if (action.type === 'task') {
              void tasksState.deleteTask(action.id)
              return
            }
            void dealsState.deleteDeal(action.id)
          }}
        />
      )}
    </>
  )
}
