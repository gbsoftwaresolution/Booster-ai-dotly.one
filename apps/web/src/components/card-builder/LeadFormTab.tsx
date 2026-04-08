'use client'

import type { JSX } from 'react'
import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, GripVertical, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'
import { apiGet, apiPut } from '@/lib/api'
import { getAccessToken } from '@/lib/supabase/client'

// ── Types matching the backend ────────────────────────────────────────────────

type LeadFieldType = 'TEXT' | 'EMAIL' | 'PHONE' | 'URL' | 'TEXTAREA' | 'SELECT'

interface LeadField {
  id?: string
  label: string
  fieldType: LeadFieldType
  placeholder: string
  required: boolean
  displayOrder: number
  options: string[]
}

interface LeadForm {
  id?: string
  title: string
  description: string
  buttonText: string
  fields: LeadField[]
}

interface LeadFormTabProps {
  cardId: string
}

const FIELD_TYPE_LABELS: Record<LeadFieldType, string> = {
  TEXT: 'Short text',
  EMAIL: 'Email',
  PHONE: 'Phone',
  URL: 'URL',
  TEXTAREA: 'Long text',
  SELECT: 'Dropdown',
}

const FIELD_TYPE_ICONS: Record<LeadFieldType, JSX.Element> = {
  TEXT: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <polyline points="4 7 4 4 20 4 20 7" />
      <line x1="9" y1="20" x2="15" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
    </svg>
  ),
  EMAIL: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
  PHONE: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.59 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.56a16 16 0 0 0 6.53 6.53l1.62-1.62a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  URL: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  TEXTAREA: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="12" y2="16" />
    </svg>
  ),
  SELECT: (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M3 6h18M3 12h18M3 18h7" />
      <path d="m16 16 2 2 4-4" />
    </svg>
  ),
}

function newField(order: number): LeadField {
  return {
    label: '',
    fieldType: 'TEXT',
    placeholder: '',
    required: false,
    displayOrder: order,
    options: [],
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
      {children}
    </p>
  )
}

function TextInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 placeholder-gray-300 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/10"
      />
    </div>
  )
}

function FieldTypeSelect({
  value,
  onChange,
}: {
  value: LeadFieldType
  onChange: (v: LeadFieldType) => void
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as LeadFieldType)}
        className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 pr-8 text-sm text-gray-900 outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/10"
      >
        {(Object.keys(FIELD_TYPE_LABELS) as LeadFieldType[]).map((t) => (
          <option key={t} value={t}>
            {FIELD_TYPE_LABELS[t]}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
    </div>
  )
}

function FieldCard({
  field,
  index,
  total,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  field: LeadField
  index: number
  total: number
  onChange: (f: LeadField) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const [expanded, setExpanded] = useState(!field.label)

  function updateOptions(raw: string) {
    onChange({
      ...field,
      options: raw
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    })
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Drag handle (visual only) */}
        <div className="flex flex-col gap-0.5 text-gray-300 shrink-0">
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Type badge */}
        <span className="flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-500 shrink-0">
          {FIELD_TYPE_ICONS[field.fieldType]}
          {FIELD_TYPE_LABELS[field.fieldType]}
        </span>

        {/* Label preview */}
        <span className="flex-1 min-w-0 text-sm font-medium text-gray-800 truncate">
          {field.label || <span className="text-gray-300 italic">Untitled field</span>}
        </span>

        {field.required && (
          <span className="shrink-0 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-500">
            Required
          </span>
        )}

        {/* Reorder */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="flex h-6 w-6 items-center justify-center rounded-lg text-gray-300 hover:bg-gray-100 hover:text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Move up"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="flex h-6 w-6 items-center justify-center rounded-lg text-gray-300 hover:bg-gray-100 hover:text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Move down"
          >
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setExpanded((x) => !x)}
          className="flex h-6 w-6 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 transition-colors shrink-0"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 transition-transform duration-200',
              expanded && 'rotate-180',
            )}
          />
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={onDelete}
          className="flex h-6 w-6 items-center justify-center rounded-lg text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors shrink-0"
          aria-label="Remove field"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/60 px-3 py-3 flex flex-col gap-3">
          {/* Label + Type */}
          <div className="grid grid-cols-2 gap-2">
            <TextInput
              label="Label"
              value={field.label}
              onChange={(v) => onChange({ ...field, label: v })}
              placeholder="e.g. Company"
            />
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                Type
              </label>
              <FieldTypeSelect
                value={field.fieldType}
                onChange={(v) => onChange({ ...field, fieldType: v })}
              />
            </div>
          </div>

          {/* Placeholder */}
          <TextInput
            label="Placeholder"
            value={field.placeholder}
            onChange={(v) => onChange({ ...field, placeholder: v })}
            placeholder="e.g. Acme Inc."
          />

          {/* SELECT options */}
          {field.fieldType === 'SELECT' && (
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                Options (one per line)
              </label>
              <textarea
                rows={4}
                value={field.options.join('\n')}
                onChange={(e) => updateOptions(e.target.value)}
                placeholder={'Option A\nOption B\nOption C'}
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-300 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-500/10 resize-none"
              />
            </div>
          )}

          {/* Required toggle */}
          <label className="flex cursor-pointer items-center gap-2.5">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={field.required}
                onChange={(e) => onChange({ ...field, required: e.target.checked })}
              />
              <div
                className={cn(
                  'h-5 w-9 rounded-full transition-colors duration-200',
                  field.required ? 'bg-brand-500' : 'bg-gray-200',
                )}
              />
              <div
                className={cn(
                  'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200',
                  field.required ? 'left-[18px]' : 'left-0.5',
                )}
              />
            </div>
            <span className="text-sm font-medium text-gray-700">Required</span>
          </label>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function LeadFormTab({ cardId }: LeadFormTabProps): JSX.Element {
  const [form, setForm] = useState<LeadForm>({
    title: 'Connect with me',
    description: "Leave your details and I'll be in touch.",
    buttonText: 'Connect',
    fields: [],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<'saved' | 'error' | null>(null)

  // Load existing form
  useEffect(() => {
    async function load() {
      try {
        const token = await getAccessToken()
        const data = await apiGet<LeadForm>(`/cards/${cardId}/lead-form`, token)
        setForm(data)
      } catch {
        // no form yet — defaults are already set
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [cardId])

  const updateField = useCallback((index: number, updated: LeadField) => {
    setForm((f) => {
      const fields = [...f.fields]
      fields[index] = updated
      return { ...f, fields }
    })
  }, [])

  const deleteField = useCallback((index: number) => {
    setForm((f) => {
      const fields = f.fields
        .filter((_, i) => i !== index)
        .map((fld, i) => ({ ...fld, displayOrder: i }))
      return { ...f, fields }
    })
  }, [])

  const moveField = useCallback((index: number, dir: -1 | 1) => {
    setForm((f) => {
      const fields = [...f.fields]
      const target = index + dir
      if (target < 0 || target >= fields.length) return f
      ;[fields[index], fields[target]] = [fields[target]!, fields[index]!]
      return { ...f, fields: fields.map((fld, i) => ({ ...fld, displayOrder: i })) }
    })
  }, [])

  const addField = useCallback(() => {
    setForm((f) => ({
      ...f,
      fields: [...f.fields, newField(f.fields.length)],
    }))
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaveMsg(null)
    try {
      const token = await getAccessToken()
      const saved = await apiPut<LeadForm>(`/cards/${cardId}/lead-form`, form, token)
      setForm(saved)
      setSaveMsg('saved')
      setTimeout(() => setSaveMsg(null), 3000)
    } catch {
      setSaveMsg('error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Form settings */}
      <section>
        <SectionLabel>Form Settings</SectionLabel>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-col gap-3 shadow-sm">
          <TextInput
            label="Title"
            value={form.title}
            onChange={(v) => setForm((f) => ({ ...f, title: v }))}
            placeholder="Connect with me"
          />
          <TextInput
            label="Description"
            value={form.description}
            onChange={(v) => setForm((f) => ({ ...f, description: v }))}
            placeholder="Leave your details and I'll be in touch."
          />
          <TextInput
            label="Button text"
            value={form.buttonText}
            onChange={(v) => setForm((f) => ({ ...f, buttonText: v }))}
            placeholder="Connect"
          />
        </div>
      </section>

      {/* Fields */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <SectionLabel>Fields ({form.fields.length}/20)</SectionLabel>
        </div>

        {form.fields.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-8 text-center">
            <p className="text-sm text-gray-400">No custom fields yet.</p>
            <p className="text-xs text-gray-300 mt-1">
              Default fields (name, email, phone) will be shown.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {form.fields.map((field, i) => (
              <FieldCard
                key={i}
                field={field}
                index={i}
                total={form.fields.length}
                onChange={(updated) => updateField(i, updated)}
                onDelete={() => deleteField(i)}
                onMoveUp={() => moveField(i, -1)}
                onMoveDown={() => moveField(i, 1)}
              />
            ))}
          </div>
        )}

        {/* Add field button */}
        {form.fields.length < 20 && (
          <button
            type="button"
            onClick={addField}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-2.5 text-sm font-medium text-gray-400 transition-colors hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50"
          >
            <Plus className="h-4 w-4" />
            Add field
          </button>
        )}
      </section>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className={cn(
            'flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm',
            saveMsg === 'error'
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-brand-500 hover:bg-brand-600 shadow-brand-500/25',
          )}
        >
          {saving ? 'Saving…' : 'Save form'}
        </button>
        {saveMsg === 'saved' && (
          <span className="flex items-center gap-1 text-xs font-medium text-green-600">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Saved
          </span>
        )}
        {saveMsg === 'error' && (
          <span className="text-xs font-medium text-red-500">Save failed</span>
        )}
      </div>
    </div>
  )
}
