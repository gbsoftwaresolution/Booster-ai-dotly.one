'use client'

import type { JSX } from 'react'
import { useRef, useState } from 'react'
import { GripVertical, Pencil, Trash2 } from 'lucide-react'
import { SelectField } from '@/components/ui/SelectField'
import { apiPatch, apiPost } from '@/lib/api'
import { getAccessToken } from '@/lib/auth/client'
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap'
import { ModalBackdrop } from '@/components/crm/ModalBackdrop'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { EMPTY_FORM, FIELD_TYPE_LABELS } from './helpers'
import type { CustomField, FieldFormValues, FieldType } from './types'

export function CustomFieldFormModal({
  editingField,
  initialForm,
  onClose,
  onSaved,
}: {
  editingField: CustomField | null
  initialForm: FieldFormValues
  onClose: () => void
  onSaved: () => Promise<void> | void
}): JSX.Element {
  const [form, setForm] = useState<FieldFormValues>(initialForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  useDialogFocusTrap({
    active: true,
    containerRef: dialogRef,
    initialFocusRef: cancelButtonRef,
    onEscape: onClose,
  })

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
      payload.options =
        form.fieldType === 'SELECT'
          ? form.options
              .split(',')
              .map((option) => option.trim())
              .filter(Boolean)
          : []

      if (editingField) await apiPatch(`/crm/custom-fields/${editingField.id}`, payload, token)
      else await apiPost('/crm/custom-fields', payload, token)
      await onSaved()
      onClose()
    } catch (error: unknown) {
      setFormError(error instanceof Error ? error.message : 'Failed to save field')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-md transition-all sm:p-6">
      <div ref={dialogRef} className="relative mx-auto w-full max-w-md my-8 rounded-[24px] bg-white/95 leading-relaxed shadow-[0_24px_54px_-34px_rgba(15,23,42,0.3)] backdrop-blur-2xl ring-1 ring-white/60 sm:container">
        <div className="max-h-[70vh] overflow-y-auto p-8 custom-scrollbar">
          <h2 className="mb-8 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">
            {editingField ? 'Edit Custom Field' : 'New Custom Field'}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-slate-500">
                Label <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
                placeholder="e.g. LinkedIn URL, Lead Source"
                maxLength={100}
                className="w-full rounded-2xl border border-slate-200/60 bg-slate-50/50 px-4 py-3.5 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 hover:bg-white focus:border-indigo-500 focus:bg-white focus:ring-[3px] focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-slate-500">Field Type</label>
              <SelectField
                value={form.fieldType}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, fieldType: e.target.value as FieldType }))
                }
                className="focus:border-blue-500 focus:ring-blue-100"
              >
                {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((type) => (
                  <option key={type} value={type}>
                    {FIELD_TYPE_LABELS[type]}
                  </option>
                ))}
              </SelectField>
            </div>
            {form.fieldType === 'SELECT' && (
              <div>
                <label className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-slate-500">
                  Options <span className="font-normal text-gray-400">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={form.options}
                  onChange={(e) => setForm((prev) => ({ ...prev, options: e.target.value }))}
                  placeholder="Option A, Option B, Option C"
                  className="w-full rounded-2xl border border-slate-200/60 bg-slate-50/50 px-4 py-3.5 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 hover:bg-white focus:border-indigo-500 focus:bg-white focus:ring-[3px] focus:ring-indigo-500/20"
                />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-slate-500">Display Order</label>
              <input
                type="number"
                min={0}
                value={form.displayOrder}
                onChange={(e) => setForm((prev) => ({ ...prev, displayOrder: e.target.value }))}
                className="w-full rounded-2xl border border-slate-200/60 bg-slate-50/50 px-4 py-3.5 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 hover:bg-white focus:border-indigo-500 focus:bg-white focus:ring-[3px] focus:ring-indigo-500/20"
              />
            </div>
            {formError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>
            )}
          </div>
        </div>
        <div className="mt-0">
          <button
            ref={cancelButtonRef}
            onClick={onClose}
            className="app-touch-target w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:w-auto"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="app-touch-target w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 sm:w-auto"
          >
            {saving ? 'Saving...' : editingField ? 'Save Changes' : 'Create Field'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SortableFieldRow({
  field,
  deletingId,
  reordering,
  onEdit,
  onDelete,
}: {
  field: CustomField
  deletingId: string | null
  reordering: boolean
  onEdit: (field: CustomField) => void
  onDelete: (field: CustomField) => void
}): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative flex items-center gap-4 rounded-[24px] border border-slate-200/60 bg-white/60 p-5 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] hover:bg-white"
    >
      <button
        type="button"
        {...listeners}
        {...attributes}
        disabled={reordering || deletingId !== null}
        className="flex-shrink-0 cursor-grab text-gray-300 focus:outline-none hover:text-gray-500 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Drag to reorder"
      >
        <GripVertical size={16} />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-base font-bold text-slate-900">{field.label}</span>
          <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] uppercase tracking-wider font-bold text-indigo-600 ring-1 ring-inset ring-indigo-500/20">
            {FIELD_TYPE_LABELS[field.fieldType]}
          </span>
        </div>
        {field.fieldType === 'SELECT' && field.options.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {field.options.map((option) => (
              <span
                key={option}
                className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 border border-slate-200/50"
              >
                {option}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">
        <button
          onClick={() => onEdit(field)}
          disabled={reordering || deletingId !== null}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50"
          title="Edit"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => onDelete(field)}
          disabled={reordering || deletingId !== null}
          className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
          title="Delete"
        >
          {deletingId === field.id ? (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-b-2 border-red-500" />
          ) : (
            <Trash2 size={14} />
          )}
        </button>
      </div>
    </div>
  )
}

export function SortableFieldList({
  fields,
  deletingId,
  reordering,
  onEdit,
  onDelete,
  onReorder,
}: {
  fields: CustomField[]
  deletingId: string | null
  reordering: boolean
  onEdit: (field: CustomField) => void
  onDelete: (field: CustomField) => void
  onReorder: (activeId: string, overId: string) => void
}): JSX.Element {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) onReorder(String(active.id), String(over.id))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={fields.map((field) => field.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {fields.map((field) => (
            <SortableFieldRow
              key={field.id}
              field={field}
              deletingId={deletingId}
              reordering={reordering}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
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
        aria-labelledby="custom-fields-confirm-dialog-title"
        className="relative mx-auto w-full max-w-sm rounded-[24px] bg-white/95 p-6 sm:p-8 leading-relaxed shadow-[0_24px_54px_-34px_rgba(15,23,42,0.3)] backdrop-blur-2xl ring-1 ring-white/60 sm:container"
      >
        <h3 id="custom-fields-confirm-dialog-title" className="text-xl font-extrabold tracking-tight text-slate-900">
          {title}
        </h3>
        <p className="mt-2 text-sm font-medium text-slate-500">{message}</p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="app-touch-target rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="app-touch-target rounded-2xl bg-rose-500 px-5 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-rose-600 hover:shadow-lg"
          >
            Delete
          </button>
        </div>
      </div>
    </>
  )
}
