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
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-[24px] border border-slate-200/60 bg-white/60 p-4 sm:p-6 backdrop-blur-xl mb-6 shadow-sm">
        {/* Background glows */}
                        <div className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #94a3b8 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className="relative z-10 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50/50 px-3 py-1 shadow-inner backdrop-blur-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600">CRM Setup</span>
            </div>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Custom <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Fields</span>
            </h1>
            <p className="mt-3 max-w-xl text-sm font-medium text-slate-500 sm:text-base">
              Define extra fields that appear on every contact record in your CRM. Adapt Dotly perfectly to your business model.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="group relative flex items-center gap-2 overflow-hidden rounded-2xl bg-white px-5 py-3.5 text-sm font-bold text-slate-900 shadow-lg transition-all hover:scale-105 active:scale-95"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-indigo-100 opacity-0 transition-opacity group-hover:opacity-100" />
            <Plus className="relative z-10 h-4 w-4" />
            <span className="relative z-10">Add Field</span>
          </button>
        </div>
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
        <div className="relative overflow-hidden rounded-[24px] border border-white/80 bg-white/60 px-6 py-12 text-center backdrop-blur-xl shadow-sm transition-all">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-indigo-50/50 shadow-inner mb-6">
            <GripVertical size={32} className="text-blue-400" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 mb-2">No custom fields yet</h3>
          <p className="mx-auto max-w-sm text-sm font-medium text-slate-500 mb-8">
            Add fields like &quot;LinkedIn URL&quot;, &quot;Lead Source&quot;, or &quot;Preferred Contact&quot; to capture exactly what you need.
          </p>
          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-slate-800 hover:shadow-lg active:scale-95"
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
