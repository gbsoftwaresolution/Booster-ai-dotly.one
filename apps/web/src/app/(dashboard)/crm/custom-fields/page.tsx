'use client'

import type { JSX } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-react'
import { StatusNotice } from '@/components/ui/StatusNotice'
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api'
import { getAccessToken } from '@/lib/supabase/client'
import type { ItemsResponse } from '@dotly/types'
import { arrayMove } from '@dnd-kit/sortable'
import { ConfirmDialog, CustomFieldFormModal, SortableFieldList } from './components'
import { EMPTY_FORM } from './helpers'
import type { CustomField, FieldFormValues } from './types'

export default function CustomFieldsPage(): JSX.Element {
  const [fields, setFields] = useState<CustomField[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingField, setEditingField] = useState<CustomField | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [reordering, setReordering] = useState(false)
  const [confirmDeleteField, setConfirmDeleteField] = useState<CustomField | null>(null)

  const fetchFields = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      const data = await apiGet<ItemsResponse<CustomField>>('/crm/custom-fields', token)
      setFields(data.items)
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
    setShowModal(true)
  }

  function openEdit(field: CustomField) {
    setEditingField(field)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingField(null)
  }

  async function handleDelete(fieldId: string) {
    setDeletingId(fieldId)
    setError(null)
    try {
      const token = await getAccessToken()
      await apiDelete(`/crm/custom-fields/${fieldId}`, token)
      await fetchFields()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete field')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleReorder(activeId: string, overId: string) {
    if (reordering) return
    const oldIndex = fields.findIndex((f) => f.id === activeId)
    const newIndex = fields.findIndex((f) => f.id === overId)
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return

    const reordered = arrayMove(fields, oldIndex, newIndex)
    // Optimistic update
    setFields(reordered)
    setReordering(true)
    try {
      const token = await getAccessToken()
      await Promise.all(
        reordered.map((f, idx) =>
          apiPatch(`/crm/custom-fields/${f.id}`, { displayOrder: idx }, token),
        ),
      )
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reorder fields')
      await fetchFields() // revert on error
    } finally {
      setReordering(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="app-panel flex items-center justify-between rounded-[30px] px-6 py-6 sm:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-500/80">
            CRM Setup
          </p>
          <h1 className="mt-2 text-2xl font-bold text-gray-900">Custom Fields</h1>
          <p className="mt-2 text-sm text-gray-500">
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
      {error && <StatusNotice message={error} />}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}

      {/* Empty state */}
      {!loading && fields.length === 0 && (
        <div className="app-empty-state">
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

      {/* Field list — sortable via drag-and-drop */}
      {!loading && fields.length > 0 && (
        <SortableFieldList
          fields={fields}
          deletingId={deletingId}
          reordering={reordering}
          onEdit={openEdit}
          onDelete={setConfirmDeleteField}
          onReorder={handleReorder}
        />
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <CustomFieldFormModal
          editingField={editingField}
          initialForm={
            editingField
              ? {
                  label: editingField.label,
                  fieldType: editingField.fieldType,
                  options: editingField.options.join(', '),
                  displayOrder: String(editingField.displayOrder),
                }
              : { ...EMPTY_FORM, displayOrder: String(fields.length) }
          }
          onClose={closeModal}
          onSaved={fetchFields}
        />
      )}

      {confirmDeleteField ? (
        <ConfirmDialog
          title="Delete custom field?"
          message="Delete this custom field? All values stored against this field will also be removed."
          onCancel={() => setConfirmDeleteField(null)}
          onConfirm={() => {
            const fieldId = confirmDeleteField.id
            setConfirmDeleteField(null)
            void handleDelete(fieldId)
          }}
        />
      ) : null}
    </div>
  )
}
