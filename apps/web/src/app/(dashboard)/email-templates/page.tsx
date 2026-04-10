'use client'

import type { JSX } from 'react'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import { StatusNotice } from '@/components/ui/StatusNotice'
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api'
import { getAccessToken } from '@/lib/supabase/client'
import { formatDate } from '@/lib/tz'
import { useUserTimezone } from '@/hooks/useUserLocale'

const MERGE_TAGS = [
  '{{contact.name}}',
  '{{contact.email}}',
  '{{contact.company}}',
  '{{contact.title}}',
] as const

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  createdAt: string
  updatedAt: string
}

interface TemplateFormValues {
  name: string
  subject: string
  body: string
}

type TemplateField = keyof TemplateFormValues

const TEMPLATE_LIMITS: Record<TemplateField, number> = {
  name: 120,
  subject: 200,
  body: 5000,
}

const EMPTY_FORM: TemplateFormValues = {
  name: '',
  subject: '',
  body: '',
}

function subjectPreview(subject: string): string {
  return subject.trim() || 'No subject'
}

export default function EmailTemplatesPage(): JSX.Element {
  const userTz = useUserTimezone()
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<EmailTemplate | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      const data = await apiGet<EmailTemplate[]>('/email-templates', token)
      setTemplates(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load email templates')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTemplates()
  }, [loadTemplates])

  const openCreateModal = () => {
    setEditingTemplate(null)
    setDeleteError(null)
    setModalError(null)
    setShowModal(true)
  }

  const openEditModal = (template: EmailTemplate) => {
    setEditingTemplate(template)
    setDeleteError(null)
    setModalError(null)
    setShowModal(true)
  }

  const handleSave = useCallback(
    async (values: TemplateFormValues) => {
      setSubmitting(true)
      setError(null)
      setModalError(null)
      try {
        const token = await getAccessToken()
        if (editingTemplate) {
          const updated = await apiPatch<EmailTemplate>(
            `/email-templates/${editingTemplate.id}`,
            values,
            token,
          )
          setTemplates((prev) =>
            prev.map((template) => (template.id === updated.id ? updated : template)),
          )
        } else {
          const created = await apiPost<EmailTemplate>('/email-templates', values, token)
          setTemplates((prev) => [created, ...prev])
        }
        setShowModal(false)
        setEditingTemplate(null)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save template'
        setModalError(message)
      } finally {
        setSubmitting(false)
      }
    },
    [editingTemplate],
  )

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleteError(null)
    try {
      const token = await getAccessToken()
      await apiDelete(`/email-templates/${deleteTarget.id}`, token)
      setTemplates((prev) => prev.filter((template) => template.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete template'
      setDeleteError(message)
      setError(message)
    }
  }, [deleteTarget])

  return (
    <div className="space-y-6">
      <div className="app-panel flex flex-wrap items-center justify-between gap-4 rounded-[30px] px-6 py-6 sm:px-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
          <p className="mt-2 text-sm text-gray-500">
            Create reusable templates for outreach, follow-ups, and updates.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          New Template
        </button>
      </div>

      {error && <StatusNotice message={error} />}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="app-list-skeleton h-48 animate-pulse rounded-[24px]" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="app-empty-state">
          <FileText className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p className="text-sm font-medium text-gray-700">No templates yet</p>
          <p className="mt-1 text-sm text-gray-400">
            Save your first reusable email draft to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <div key={template.id} className="app-panel rounded-[24px] p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-semibold text-gray-900">
                    {template.name}
                  </h2>
                  <p className="mt-1 truncate text-sm text-gray-500">
                    {subjectPreview(template.subject)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(template)}
                    className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50"
                    aria-label={`Edit ${template.name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(template)}
                    className="rounded-lg border border-gray-300 p-2 text-red-600 hover:bg-red-50"
                    aria-label={`Delete ${template.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="app-panel-subtle mt-4 rounded-[20px] p-4">
                <p className="line-clamp-6 whitespace-pre-wrap text-sm text-gray-600">
                  {template.body}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                <span>Created {formatDate(template.createdAt, userTz)}</span>
                <span>Updated {formatDate(template.updatedAt, userTz)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <TemplateModal
          initialValues={
            editingTemplate
              ? {
                  name: editingTemplate.name,
                  subject: editingTemplate.subject,
                  body: editingTemplate.body,
                }
              : EMPTY_FORM
          }
          title={editingTemplate ? 'Edit Template' : 'New Template'}
          submitLabel={editingTemplate ? 'Save Changes' : 'Create Template'}
          submitting={submitting}
          onClose={() => {
            if (submitting) return
            setShowModal(false)
            setEditingTemplate(null)
            setModalError(null)
          }}
          submitError={modalError}
          onSubmit={(values) => void handleSave(values)}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          title="Delete template"
          message={`Delete "${deleteTarget.name}"? This cannot be undone.`}
          error={deleteError}
          onCancel={() => {
            setDeleteTarget(null)
            setDeleteError(null)
          }}
          onConfirm={() => void handleDelete()}
        />
      )}
    </div>
  )
}

function TemplateModal({
  initialValues,
  title,
  submitLabel,
  submitting,
  submitError,
  onClose,
  onSubmit,
}: {
  initialValues: TemplateFormValues
  title: string
  submitLabel: string
  submitting: boolean
  submitError?: string | null
  onClose: () => void
  onSubmit: (values: TemplateFormValues) => void
}): JSX.Element {
  const [values, setValues] = useState<TemplateFormValues>(initialValues)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<TemplateField, string>>>({})
  const modalRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null)
  const titleId = useId()
  const descriptionId = useId()
  const errorId = useId()

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none'

  const getInputClass = (field: TemplateField) =>
    `${inputClass} ${fieldErrors[field] ? 'border-red-300 focus:border-red-500' : ''}`

  const updateField = (field: TemplateField, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }))
    setError(null)
    setFieldErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  useEffect(() => {
    nameInputRef.current?.focus()
  }, [])

  useEffect(() => {
    setError(submitError ?? null)
  }, [submitError])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab' || !modalRef.current) return

      const focusableElements = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled])',
        ),
      )

      if (focusableElements.length === 0) return

      const first = focusableElements[0]
      const last = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const insertMergeTag = (tag: string) => {
    const textarea = bodyTextareaRef.current
    if (!textarea) {
      setValues((prev) => ({ ...prev, body: `${prev.body}${tag}` }))
      return
    }

    const start = textarea.selectionStart ?? values.body.length
    const end = textarea.selectionEnd ?? values.body.length
    const nextBody = `${values.body.slice(0, start)}${tag}${values.body.slice(end)}`

    setValues((prev) => ({ ...prev, body: nextBody }))

    queueMicrotask(() => {
      textarea.focus()
      const cursor = start + tag.length
      textarea.setSelectionRange(cursor, cursor)
    })
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (submitting) return

    const nextValues = {
      name: values.name.trim(),
      subject: values.subject.trim(),
      body: values.body.trim(),
    }
    const nextFieldErrors: Partial<Record<TemplateField, string>> = {}

    if (!nextValues.name) {
      nextFieldErrors.name = 'Template name is required.'
    } else if (nextValues.name.length < 2) {
      nextFieldErrors.name = 'Template name must be at least 2 characters.'
    } else if (nextValues.name.length > TEMPLATE_LIMITS.name) {
      nextFieldErrors.name = `Template name must be ${TEMPLATE_LIMITS.name} characters or less.`
    }

    if (!nextValues.subject) {
      nextFieldErrors.subject = 'Email subject is required.'
    } else if (nextValues.subject.length > TEMPLATE_LIMITS.subject) {
      nextFieldErrors.subject = `Email subject must be ${TEMPLATE_LIMITS.subject} characters or less.`
    }

    if (!nextValues.body) {
      nextFieldErrors.body = 'Email body is required.'
    } else if (nextValues.body.length < 5) {
      nextFieldErrors.body = 'Email body must be at least 5 characters.'
    } else if (nextValues.body.length > TEMPLATE_LIMITS.body) {
      nextFieldErrors.body = `Email body must be ${TEMPLATE_LIMITS.body} characters or less.`
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      setError('Fix the highlighted fields before saving.')
      return
    }

    setFieldErrors({})
    setError(null)
    onSubmit(nextValues)
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="app-panel fixed inset-x-4 top-1/2 z-50 w-full max-w-2xl -translate-y-1/2 rounded-[28px] p-6 shadow-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
      >
        <h2 id={titleId} className="text-lg font-semibold text-gray-900">
          {title}
        </h2>
        <p id={descriptionId} className="mt-1 text-sm text-gray-500">
          Save a reusable draft for future email sends.
        </p>
        {error && (
          <div id={errorId} className="mt-4">
            <StatusNotice message={error} />
          </div>
        )}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="template-name" className="mb-1 block text-sm font-medium text-gray-700">
              Template name
            </label>
            <input
              ref={nameInputRef}
              id="template-name"
              value={values.name}
              onChange={(event) => updateField('name', event.target.value)}
              maxLength={TEMPLATE_LIMITS.name}
              className={getInputClass('name')}
              aria-invalid={fieldErrors.name ? 'true' : 'false'}
              aria-describedby={
                fieldErrors.name ? 'template-name-error' : error ? errorId : undefined
              }
            />
            {fieldErrors.name && (
              <p id="template-name-error" className="mt-1 text-xs text-red-600">
                {fieldErrors.name}
              </p>
            )}
          </div>
          <div>
            <label
              htmlFor="template-subject"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Email subject
            </label>
            <input
              id="template-subject"
              value={values.subject}
              onChange={(event) => updateField('subject', event.target.value)}
              maxLength={TEMPLATE_LIMITS.subject}
              className={getInputClass('subject')}
              aria-invalid={fieldErrors.subject ? 'true' : 'false'}
              aria-describedby={
                fieldErrors.subject ? 'template-subject-error' : error ? errorId : undefined
              }
            />
            <div className="mt-1 flex items-center justify-between gap-2 text-xs text-gray-400">
              <span>What recipients see in their inbox.</span>
              <span>
                {values.subject.length}/{TEMPLATE_LIMITS.subject}
              </span>
            </div>
            {fieldErrors.subject && (
              <p id="template-subject-error" className="mt-1 text-xs text-red-600">
                {fieldErrors.subject}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="template-body" className="mb-1 block text-sm font-medium text-gray-700">
              Email body
            </label>
            <textarea
              ref={bodyTextareaRef}
              id="template-body"
              rows={12}
              value={values.body}
              onChange={(event) => updateField('body', event.target.value)}
              placeholder="Write the email body..."
              maxLength={TEMPLATE_LIMITS.body}
              className={getInputClass('body')}
              aria-invalid={fieldErrors.body ? 'true' : 'false'}
              aria-describedby={
                fieldErrors.body ? 'template-body-error' : error ? errorId : undefined
              }
            />
            <div className="mt-1 flex items-center justify-between gap-2 text-xs text-gray-400">
              <span>Use merge tags where you want contact details inserted automatically.</span>
              <span>
                {values.body.length}/{TEMPLATE_LIMITS.body}
              </span>
            </div>
            {fieldErrors.body && (
              <p id="template-body-error" className="mt-1 text-xs text-red-600">
                {fieldErrors.body}
              </p>
            )}
          </div>
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3">
            <p className="mb-1.5 text-xs font-semibold text-indigo-700">Available merge tags</p>
            <div className="flex flex-wrap gap-2">
              {MERGE_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => insertMergeTag(tag)}
                  className="rounded bg-white px-2 py-0.5 font-mono text-xs text-indigo-600 shadow-sm ring-1 ring-indigo-200 hover:bg-indigo-100"
                >
                  {tag}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-indigo-500">
              Click a tag to insert it, or type it directly into subject or body.
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? 'Saving...' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

function ConfirmDeleteDialog({
  title,
  message,
  error,
  onCancel,
  onConfirm,
}: {
  title: string
  message: string
  error?: string | null
  onCancel: () => void
  onConfirm: () => void
}): JSX.Element {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const titleId = useId()

  useEffect(() => {
    cancelButtonRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled])'),
      )
      if (focusableElements.length === 0) return

      const first = focusableElements[0]
      const last = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="app-panel fixed inset-x-4 top-1/2 z-50 w-full max-w-sm -translate-y-1/2 rounded-[28px] p-6 shadow-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
      >
        <h2 id={titleId} className="text-base font-semibold text-gray-900">
          {title}
        </h2>
        <p className="mt-2 text-sm text-gray-500">{message}</p>
        {error && (
          <div className="mt-4">
            <StatusNotice message={error} />
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </>
  )
}
