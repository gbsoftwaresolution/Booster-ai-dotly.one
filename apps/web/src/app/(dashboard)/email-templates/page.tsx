'use client'

import type { JSX } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api'
import { getAccessToken } from '@/lib/supabase/client'
import { formatDate } from '@/lib/tz'
import { useUserTimezone } from '@/hooks/useUserLocale'

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
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<EmailTemplate | null>(null)

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
    setShowModal(true)
  }

  const openEditModal = (template: EmailTemplate) => {
    setEditingTemplate(template)
    setShowModal(true)
  }

  const handleSave = useCallback(
    async (values: TemplateFormValues) => {
      setSubmitting(true)
      setError(null)
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
        setError(err instanceof Error ? err.message : 'Failed to save template')
      } finally {
        setSubmitting(false)
      }
    },
    [editingTemplate],
  )

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      const token = await getAccessToken()
      await apiDelete(`/email-templates/${deleteTarget.id}`, token)
      setTemplates((prev) => prev.filter((template) => template.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template')
    }
  }, [deleteTarget])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
          <p className="mt-1 text-sm text-gray-500">
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

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
          <FileText className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p className="text-sm font-medium text-gray-700">No templates yet</p>
          <p className="mt-1 text-sm text-gray-400">
            Save your first reusable email draft to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
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

              <div className="mt-4 rounded-xl bg-gray-50 p-4">
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
          }}
          onSubmit={(values) => void handleSave(values)}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          title="Delete template"
          message={`Delete "${deleteTarget.name}"? This cannot be undone.`}
          onCancel={() => setDeleteTarget(null)}
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
  onClose,
  onSubmit,
}: {
  initialValues: TemplateFormValues
  title: string
  submitLabel: string
  submitting: boolean
  onClose: () => void
  onSubmit: (values: TemplateFormValues) => void
}): JSX.Element {
  const [values, setValues] = useState<TemplateFormValues>(initialValues)
  const [error, setError] = useState<string | null>(null)

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none'

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!values.name.trim() || !values.subject.trim() || !values.body.trim()) {
      setError('Name, subject, and body are required.')
      return
    }

    setError(null)
    onSubmit({
      name: values.name.trim(),
      subject: values.subject.trim(),
      body: values.body.trim(),
    })
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed inset-x-4 top-1/2 z-50 w-full max-w-2xl -translate-y-1/2 rounded-xl bg-white p-6 shadow-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-500">Save a reusable draft for future email sends.</p>
        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <input
            value={values.name}
            onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Template name"
            className={inputClass}
          />
          <input
            value={values.subject}
            onChange={(event) => setValues((prev) => ({ ...prev, subject: event.target.value }))}
            placeholder="Email subject"
            className={inputClass}
          />
          <textarea
            rows={12}
            value={values.body}
            onChange={(event) => setValues((prev) => ({ ...prev, body: event.target.value }))}
            placeholder="Write the email body..."
            className={inputClass}
          />
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3">
            <p className="mb-1.5 text-xs font-semibold text-indigo-700">Available merge tags</p>
            <div className="flex flex-wrap gap-2">
              {[
                '{{contact.name}}',
                '{{contact.email}}',
                '{{contact.company}}',
                '{{contact.title}}',
              ].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setValues((prev) => ({ ...prev, body: prev.body + tag }))}
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
  onCancel,
  onConfirm,
}: {
  title: string
  message: string
  onCancel: () => void
  onConfirm: () => void
}): JSX.Element {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onCancel} />
      <div className="fixed inset-x-4 top-1/2 z-50 w-full max-w-sm -translate-y-1/2 rounded-xl bg-white p-6 shadow-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <p className="mt-2 text-sm text-gray-500">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
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
