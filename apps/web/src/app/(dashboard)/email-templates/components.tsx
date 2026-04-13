'use client'

import type { FormEvent, JSX } from 'react'
import { useEffect, useId, useRef, useState } from 'react'
import { ArrowLeft, FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'

import { StatusNotice } from '@/components/ui/StatusNotice'
import { formatDate } from '@/lib/tz'

import { MERGE_TAGS, TEMPLATE_LIMITS, subjectPreview, validateTemplateForm } from './helpers'
import type { EmailTemplate, TemplateField, TemplateFormValues } from './types'

export function EmailTemplatesHeader({ onCreate }: { onCreate: () => void }): JSX.Element {
  return (
    <div className="app-panel flex flex-col gap-4 rounded-[30px] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Email Templates</h1>
          <p className="mt-1 text-sm text-gray-500">
            Create reusable templates for outreach, follow-ups, and updates.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onCreate}
        className="inline-flex shrink-0 items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-95"
      >
        <Plus className="h-5 w-5" />
        <span className="hidden sm:inline">New Template</span>
        <span className="sm:hidden">New</span>
      </button>
    </div>
  )
}

export function TemplatesGrid({
  loading,
  templates,
  userTz,
  onEdit,
  onDelete,
}: {
  loading: boolean
  templates: EmailTemplate[]
  userTz: string | null | undefined
  onEdit: (template: EmailTemplate) => void
  onDelete: (template: EmailTemplate) => void
}): JSX.Element {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div key={item} className="app-list-skeleton h-48 animate-pulse rounded-[24px]" />
        ))}
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="app-empty-state">
        <FileText className="mx-auto mb-4 h-12 w-12 text-gray-300" />
        <p className="text-sm font-medium text-gray-700">No templates yet</p>
        <p className="mt-1 text-sm text-gray-400">
          Save your first reusable email draft to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {templates.map((template) => (
        <div key={template.id} className="app-panel rounded-[24px] p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-semibold text-gray-900">{template.name}</h2>
              <p className="mt-1 truncate text-sm text-gray-500">
                {subjectPreview(template.subject)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onEdit(template)}
                className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50"
                aria-label={`Edit ${template.name}`}
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(template)}
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
  )
}

export function TemplateModal({
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
    setValues(initialValues)
    setError(submitError ?? null)
    setFieldErrors({})
  }, [initialValues, submitError])

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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting) return

    const result = validateTemplateForm(values)

    if (Object.keys(result.fieldErrors).length > 0) {
      setFieldErrors(result.fieldErrors)
      setError('Fix the highlighted fields before saving.')
      return
    }

    setFieldErrors({})
    setError(null)
    onSubmit(result.values)
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/10 backdrop-blur-2xl transition-all"
        onClick={onClose}
      />
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="fixed inset-[1rem] z-50 m-auto flex hidden h-[calc(100%-2rem)] max-h-[800px] w-[calc(100%-2rem)] max-w-2xl flex-col overflow-hidden rounded-[32px] bg-white shadow-2xl ring-1 ring-black/5 hover:ring-black/10 sm:block"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4 sm:px-8">
          <div>
            <h2 id={titleId} className="text-xl font-bold tracking-tight text-gray-900">
              {title}
            </h2>
            <p id={descriptionId} className="text-sm font-medium text-gray-500">
              Draft your reusable template message.
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          {error && (
            <div id={errorId} className="mb-6">
              <StatusNotice message={error} />
            </div>
          )}

          <form id="template-form" onSubmit={handleSubmit} className="space-y-6">
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
          <div className="rounded-[20px] border border-indigo-100 bg-indigo-50/50 p-4 ring-1 ring-inset ring-indigo-900/5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-600">Available merge tags</p>
            <div className="flex flex-wrap gap-2">
              {MERGE_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => insertMergeTag(tag)}
                  className="inline-flex items-center rounded-lg bg-white px-2.5 py-1.5 text-xs font-medium text-indigo-700 shadow-sm ring-1 ring-black/5 transition-all hover:bg-indigo-50 active:scale-95"
                >
                  {tag}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-indigo-500">
              Click a tag to insert it, or type it directly into subject or body.
            </p>
          </div>
        </form>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-100 bg-gray-50/50 px-6 py-4 backdrop-blur-md sm:px-8">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-black/5 transition-all hover:bg-gray-50 active:scale-95 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            form="template-form"
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-indigo-600 transition-all hover:bg-indigo-700 hover:ring-indigo-700 active:scale-95 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : submitLabel}
          </button>
        </div>
      </div>
      
      {/* Mobile Bottom Sheet Modal */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex h-[90vh] flex-col rounded-t-[32px] bg-white pb-safe shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.3)] ring-1 ring-black/5 transition-transform duration-300 sm:hidden"
        role="dialog"
      >
        <div className="flex shrink-0 items-center justify-center pt-3 pb-2">
          <div className="h-1.5 w-12 rounded-full bg-gray-200" />
        </div>
        <div className="flex shrink-0 items-center justify-between px-6 pb-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900">{title}</h2>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200"
          >
            <span className="sr-only">Close</span>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 13L13 1M1 1L13 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 pb-24">
          {error && (
            <div className="mb-6">
              <StatusNotice message={error} />
            </div>
          )}
          <form id="template-form-mobile" onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="template-name-mobile" className="mb-1.5 block text-sm font-semibold text-gray-700">
                Template name
              </label>
              <input
                id="template-name-mobile"
                value={values.name}
                onChange={(event) => updateField('name', event.target.value)}
                maxLength={TEMPLATE_LIMITS.name}
                className={getInputClass('name')}
              />
              {fieldErrors.name && (
                <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.name}</p>
              )}
            </div>
            <div>
              <label htmlFor="template-subject-mobile" className="mb-1.5 block text-sm font-semibold text-gray-700">
                Email subject
              </label>
              <input
                id="template-subject-mobile"
                value={values.subject}
                onChange={(event) => updateField('subject', event.target.value)}
                maxLength={TEMPLATE_LIMITS.subject}
                className={getInputClass('subject')}
              />
              {fieldErrors.subject && (
                <p className="mt-1 text-xs font-medium text-red-600">{fieldErrors.subject}</p>
              )}
            </div>
            <div>
              <label htmlFor="template-body-mobile" className="mb-1.5 block text-sm font-semibold text-gray-700">
                Email content
              </label>
              <textarea
                id="template-body-mobile"
                value={values.body}
                onChange={(event) => updateField('body', event.target.value)}
                maxLength={TEMPLATE_LIMITS.body}
                rows={8}
                className={getInputClass('body') + ' resize-none'}
              />
              {fieldErrors.body && (
                <p className="my-1 text-xs font-medium text-red-600">{fieldErrors.body}</p>
              )}
              
              <div className="mt-4 w-full pb-2">
                <div className="flex flex-wrap gap-2">
                  {MERGE_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => insertMergeTag(tag)}
                      className="inline-flex shrink-0 items-center whitespace-nowrap rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-1.5 text-xs font-semibold tracking-wide text-indigo-700 shadow-sm active:scale-95"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </form>
        </div>
        
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-gray-100 bg-white/90 px-6 py-4 pb-safe backdrop-blur-xl">
          <button
            form="template-form-mobile"
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-indigo-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 active:scale-[0.98] disabled:opacity-50"
          >
            {submitting ? 'Saving...' : submitLabel}
          </button>
        </div>
      </div>
    </>
  )
}

export function ConfirmDeleteDialog({
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
