'use client'

import type { JSX } from 'react'
import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import type { PaginatedResponse } from '@dotly/types'
import { apiGet, apiPatch, apiPost } from '@/lib/api'
import { getAccessToken } from '@/lib/supabase/client'
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap'
import { ModalBackdrop } from '@/components/crm/ModalBackdrop'
import type { TaskItem } from './types'
import { parseTaskDueAt, toDatetimeLocal } from './helpers'

export function EditTaskModal({
  task,
  onClose,
  onSaved,
}: {
  task: TaskItem
  onClose: () => void
  onSaved: (task: TaskItem) => void
}): JSX.Element {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [title, setTitle] = useState(task.title)
  const [dueAt, setDueAt] = useState(toDatetimeLocal(task.dueAt))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'title' | 'dueAt', string>>>({})

  useEffect(() => {
    setTitle(task.title)
    setDueAt(toDatetimeLocal(task.dueAt))
    setError(null)
    setFieldErrors({})
  }, [task])

  useDialogFocusTrap({
    active: true,
    containerRef: dialogRef,
    initialFocusRef: closeButtonRef,
    onEscape: onClose,
  })

  async function handleSave() {
    const trimmedTitle = title.trim()
    const dueAtIso = parseTaskDueAt(dueAt)
    const nextFieldErrors: Partial<Record<'title' | 'dueAt', string>> = {}
    if (!trimmedTitle) nextFieldErrors.title = 'Title is required.'
    if (dueAtIso === undefined) nextFieldErrors.dueAt = 'Due date must be a valid date and time.'
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      setError('Fix the highlighted fields before saving.')
      return
    }

    setSaving(true)
    setError(null)
    setFieldErrors({})
    try {
      const token = await getAccessToken()
      const updated = await apiPatch<TaskItem>(
        `/tasks/${task.id}`,
        { title: trimmedTitle, dueAt: dueAtIso },
        token,
      )
      onSaved(updated)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save task')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="app-dialog-shell">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-task-dialog-title"
        className="app-dialog-panel max-w-md"
      >
        <div className="app-modal-header">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-500/80">
              Follow-ups
            </p>
            <h2 id="edit-task-dialog-title" className="mt-1 text-lg font-bold text-gray-900">
              Edit Task
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Update the task title or timing without leaving your workflow.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close edit task dialog"
            className="app-touch-target rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <span className="sr-only">Close</span>
            <X size={20} />
          </button>
        </div>
        <div className="app-modal-body app-dialog-body-scroll space-y-4">
          <div>
            <label
              htmlFor="edit-task-title"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-task-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setFieldErrors((prev) => ({ ...prev, title: undefined }))
              }}
              maxLength={500}
              aria-invalid={fieldErrors.title ? 'true' : 'false'}
              aria-describedby={fieldErrors.title ? 'edit-task-title-error' : undefined}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${fieldErrors.title ? 'border-red-300 focus:ring-red-100' : 'border-gray-300 focus:ring-indigo-500'}`}
            />
            {fieldErrors.title && (
              <p id="edit-task-title-error" className="mt-1 text-xs text-red-600">
                {fieldErrors.title}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="edit-task-due-at"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Due date
            </label>
            <input
              id="edit-task-due-at"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => {
                setDueAt(e.target.value)
                setFieldErrors((prev) => ({ ...prev, dueAt: undefined }))
              }}
              aria-invalid={fieldErrors.dueAt ? 'true' : 'false'}
              aria-describedby={fieldErrors.dueAt ? 'edit-task-due-error' : undefined}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${fieldErrors.dueAt ? 'border-red-300 focus:ring-red-100' : 'border-gray-300 focus:ring-indigo-500'}`}
            />
            {fieldErrors.dueAt && (
              <p id="edit-task-due-error" className="mt-1 text-xs text-red-600">
                {fieldErrors.dueAt}
              </p>
            )}
            {dueAt && (
              <button
                type="button"
                onClick={() => setDueAt('')}
                className="mt-1 text-xs text-gray-400 hover:text-red-500"
              >
                Clear due date
              </button>
            )}
          </div>
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>
        <div className="app-dialog-footer">
          <button
            type="button"
            onClick={onClose}
            className="app-touch-target w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="app-touch-target w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 sm:w-auto"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function CreateTaskModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (task: TaskItem) => void
}): JSX.Element | null {
  const createContactRequestIdRef = useRef(0)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([])
  const [contactSearch, setContactSearch] = useState('')
  const [contactId, setContactId] = useState('')
  const [title, setTitle] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contactLoadError, setContactLoadError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<'contact' | 'title' | 'dueAt', string>>
  >({})
  const [contactsLoading, setContactsLoading] = useState(false)
  const [contactReloadNonce, setContactReloadNonce] = useState(0)

  useDialogFocusTrap({
    active: open,
    containerRef: dialogRef,
    initialFocusRef: closeButtonRef,
    onEscape: onClose,
  })

  useEffect(() => {
    if (!open) return
    const requestId = ++createContactRequestIdRef.current
    void (async () => {
      try {
        setContactLoadError(null)
        setContactsLoading(true)
        const token = await getAccessToken()
        const params = new URLSearchParams({ limit: '50' })
        if (contactSearch.trim()) params.set('search', contactSearch.trim())
        const data = await apiGet<PaginatedResponse<{ id: string; name: string }>>(
          `/contacts?${params.toString()}`,
          token,
        )
        if (createContactRequestIdRef.current !== requestId) return
        setContacts(data.items)
      } catch {
        if (createContactRequestIdRef.current !== requestId) return
        setContactLoadError('Could not load matching contacts. Try again.')
      } finally {
        if (createContactRequestIdRef.current !== requestId) return
        setContactsLoading(false)
      }
    })()
  }, [contactReloadNonce, contactSearch, open])

  useEffect(() => {
    if (!open) return
    setTitle('')
    setDueAt('')
    setContactId('')
    setContactSearch('')
    setContacts([])
    setError(null)
    setContactLoadError(null)
    setFieldErrors({})
  }, [open])

  if (!open) return null

  async function handleCreateTask() {
    const trimmedTitle = title.trim()
    const dueAtIso = parseTaskDueAt(dueAt)
    const nextFieldErrors: Partial<Record<'contact' | 'title' | 'dueAt', string>> = {}
    if (!trimmedTitle) nextFieldErrors.title = 'Title is required.'
    if (!contactId) nextFieldErrors.contact = 'Please select a contact.'
    if (dueAtIso === undefined) nextFieldErrors.dueAt = 'Due date must be a valid date and time.'
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      setError('Fix the highlighted fields before creating the task.')
      return
    }

    setSaving(true)
    setError(null)
    setFieldErrors({})
    try {
      const token = await getAccessToken()
      const body: Record<string, unknown> = { title: trimmedTitle }
      if (dueAtIso) body.dueAt = dueAtIso
      const created = await apiPost<TaskItem>(`/contacts/${contactId}/tasks`, body, token)
      onCreated(created)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="app-dialog-shell">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-task-dialog-title"
        className="app-dialog-panel max-w-md"
      >
        <div className="app-modal-header">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-500/80">
              Follow-ups
            </p>
            <h2 id="create-task-dialog-title" className="mt-1 text-lg font-bold text-gray-900">
              New Task
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Create a clear next step and connect it to the right contact.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close create task dialog"
            className="app-touch-target rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <span className="sr-only">Close</span>
            <X size={20} />
          </button>
        </div>
        <div className="app-modal-body app-dialog-body-scroll space-y-4">
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
          <div>
            <label
              htmlFor="create-task-contact-search"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Contact <span className="text-red-500">*</span>
            </label>
            {contactId ? (
              <div className="flex items-center justify-between rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2">
                <p className="text-sm font-medium text-indigo-900">
                  {contacts.find((contact) => contact.id === contactId)?.name ?? contactId}
                </p>
                <button
                  type="button"
                  onClick={() => setContactId('')}
                  aria-label="Clear selected contact"
                  className="text-indigo-400 hover:text-indigo-600"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  id="create-task-contact-search"
                  type="text"
                  placeholder="Search contacts..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {contactLoadError && (
                  <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    <p role="status">{contactLoadError}</p>
                    <button
                      type="button"
                      onClick={() => setContactReloadNonce((current) => current + 1)}
                      className="mt-2 font-semibold underline"
                    >
                      Retry
                    </button>
                  </div>
                )}
                {contactsLoading ? (
                  <div className="rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm text-gray-500">
                    Loading matching contacts...
                  </div>
                ) : null}
                {contacts.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                    {contacts.map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => setContactId(contact.id)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        {contact.name}
                      </button>
                    ))}
                  </div>
                )}
                {!contactsLoading &&
                !contactLoadError &&
                contactSearch.trim() &&
                contacts.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 bg-white px-3 py-3 text-sm text-gray-500">
                    No matching contacts found.
                  </div>
                ) : null}
              </div>
            )}
            {fieldErrors.contact && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.contact}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="create-task-title"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="create-task-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setFieldErrors((prev) => ({ ...prev, title: undefined }))
              }}
              maxLength={500}
              placeholder="e.g. Follow up with proposal"
              aria-invalid={fieldErrors.title ? 'true' : 'false'}
              aria-describedby={fieldErrors.title ? 'create-task-title-error' : undefined}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${fieldErrors.title ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`}
            />
            {fieldErrors.title && (
              <p id="create-task-title-error" className="mt-1 text-xs text-red-600">
                {fieldErrors.title}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="create-task-due-at"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Due date
            </label>
            <input
              id="create-task-due-at"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => {
                setDueAt(e.target.value)
                setFieldErrors((prev) => ({ ...prev, dueAt: undefined }))
              }}
              aria-invalid={fieldErrors.dueAt ? 'true' : 'false'}
              aria-describedby={fieldErrors.dueAt ? 'create-task-due-error' : undefined}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${fieldErrors.dueAt ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`}
            />
            {fieldErrors.dueAt && (
              <p id="create-task-due-error" className="mt-1 text-xs text-red-600">
                {fieldErrors.dueAt}
              </p>
            )}
            {dueAt && (
              <button
                type="button"
                onClick={() => setDueAt('')}
                className="mt-1 text-xs text-gray-400 hover:text-red-500"
              >
                Clear due date
              </button>
            )}
          </div>
        </div>
        <div className="app-dialog-footer">
          <button
            type="button"
            onClick={onClose}
            className="app-touch-target w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleCreateTask()}
            disabled={saving}
            className="app-touch-target w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 sm:w-auto"
          >
            {saving ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}): JSX.Element {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  useDialogFocusTrap({
    active: true,
    containerRef: dialogRef,
    initialFocusRef: cancelButtonRef,
    onEscape: onCancel,
  })

  return (
    <>
      <ModalBackdrop onClick={onCancel} tone="drawer" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tasks-confirm-dialog-title"
        className="app-confirm-panel"
      >
        <h3 id="tasks-confirm-dialog-title" className="text-sm font-semibold text-gray-900">
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
