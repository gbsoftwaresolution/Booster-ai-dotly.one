'use client'

import type { JSX } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api'
import { getAccessToken } from '@/lib/supabase/client'

type FieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'URL' | 'SELECT'

interface CustomField {
  id: string
  label: string
  fieldType: FieldType
  options: string[]
  displayOrder: number
  createdAt: string
  updatedAt: string
}

interface FieldFormValues {
  label: string
  fieldType: FieldType
  options: string // comma-separated, only for SELECT
  displayOrder: string
}

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  TEXT: 'Text',
  NUMBER: 'Number',
  DATE: 'Date',
  URL: 'URL',
  SELECT: 'Dropdown (Select)',
}

const EMPTY_FORM: FieldFormValues = {
  label: '',
  fieldType: 'TEXT',
  options: '',
  displayOrder: '0',
}

export default function CustomFieldsPage(): JSX.Element {
  const [fields, setFields] = useState<CustomField[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingField, setEditingField] = useState<CustomField | null>(null)
  const [form, setForm] = useState<FieldFormValues>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchFields = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      const data = await apiGet<CustomField[]>('/crm/custom-fields', token)
      setFields(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load custom fields')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchFields()
  }, [fetchFields])

  function openCreate() {
    setEditingField(null)
    setForm({ ...EMPTY_FORM, displayOrder: String(fields.length) })
    setFormError(null)
    setShowModal(true)
  }

  function openEdit(field: CustomField) {
    setEditingField(field)
    setForm({
      label: field.label,
      fieldType: field.fieldType,
      options: field.options.join(', '),
      displayOrder: String(field.displayOrder),
    })
    setFormError(null)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingField(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  async function handleSave() {
    if (!form.label.trim()) {
      setFormError('Label is required')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const token = await getAccessToken()
      const payload: Record<string, unknown> = {
        label: form.label.trim(),
        fieldType: form.fieldType,
        displayOrder: parseInt(form.displayOrder, 10) || 0,
      }
      if (form.fieldType === 'SELECT') {
        payload.options = form.options
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean)
      } else {
        payload.options = []
      }

      if (editingField) {
        await apiPatch(`/crm/custom-fields/${editingField.id}`, payload, token)
      } else {
        await apiPost('/crm/custom-fields', payload, token)
      }
      closeModal()
      await fetchFields()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save field')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(fieldId: string) {
    if (
      !confirm(
        'Delete this custom field? All values stored against this field will also be removed.',
      )
    )
      return
    setDeletingId(fieldId)
    try {
      const token = await getAccessToken()
      await apiDelete(`/crm/custom-fields/${fieldId}`, token)
      await fetchFields()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete field')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Custom Fields</h1>
          <p className="text-sm text-gray-500 mt-1">
            Define extra fields that appear on every contact record in your CRM.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          Add Field
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {/* Empty state */}
      {!loading && fields.length === 0 && (
        <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <GripVertical size={40} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-gray-700 font-semibold mb-1">No custom fields yet</h3>
          <p className="text-sm text-gray-400 mb-4">
            Add fields like &quot;LinkedIn URL&quot;, &quot;Lead Source&quot;, or &quot;Preferred
            Contact&quot;.
          </p>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Add your first field
          </button>
        </div>
      )}

      {/* Field list */}
      {!loading && fields.length > 0 && (
        <div className="space-y-2">
          {fields.map((field) => (
            <div
              key={field.id}
              className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-xl hover:shadow-sm transition-shadow"
            >
              <GripVertical size={16} className="text-gray-300 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-900 truncate">{field.label}</span>
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                    {FIELD_TYPE_LABELS[field.fieldType]}
                  </span>
                </div>
                {field.fieldType === 'SELECT' && field.options.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {field.options.map((opt) => (
                      <span
                        key={opt}
                        className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
                      >
                        {opt}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => openEdit(field)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Edit"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => void handleDelete(field.id)}
                  disabled={deletingId === field.id}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                  title="Delete"
                >
                  {deletingId === field.id ? (
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-red-500" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              {editingField ? 'Edit Custom Field' : 'New Custom Field'}
            </h2>

            <div className="space-y-4">
              {/* Label */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. LinkedIn URL, Lead Source"
                  maxLength={100}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Field Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Field Type</label>
                <select
                  value={form.fieldType}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fieldType: e.target.value as FieldType }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((t) => (
                    <option key={t} value={t}>
                      {FIELD_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Options (only for SELECT) */}
              {form.fieldType === 'SELECT' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Options <span className="text-gray-400 font-normal">(comma-separated)</span>
                  </label>
                  <input
                    type="text"
                    value={form.options}
                    onChange={(e) => setForm((f) => ({ ...f, options: e.target.value }))}
                    placeholder="Option A, Option B, Option C"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Display Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  min={0}
                  value={form.displayOrder}
                  onChange={(e) => setForm((f) => ({ ...f, displayOrder: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Error */}
              {formError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{formError}</p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingField ? 'Save Changes' : 'Create Field'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
