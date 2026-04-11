'use client'

import type { JSX } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BriefcaseBusiness,
  Pencil,
  Plus,
  Trash2,
  X,
  Target,
  TrendingUp,
  CircleDollarSign,
} from 'lucide-react'
import { ContactDetailDrawer } from '@/components/crm/ContactDetailDrawer'
import { SelectField } from '@/components/ui/SelectField'
import { StatusNotice } from '@/components/ui/StatusNotice'
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api'
import { getAccessToken } from '@/lib/supabase/client'
import { formatDate } from '@/lib/tz'
import { useUserTimezone } from '@/hooks/useUserLocale'

interface Deal {
  id: string
  title: string
  value: number
  currency: string
  stage: DealStage
  closeDate: string | null
  probability: number
  contact: {
    id: string
    name: string
    email: string | null
  } | null
}

interface ContactOption {
  id: string
  name: string
  email: string | null
}

const DEAL_STAGES = ['PROSPECT', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'] as const
type DealStage = (typeof DEAL_STAGES)[number]

const STAGE_LABELS: Record<DealStage, string> = {
  PROSPECT: 'Prospect',
  PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation',
  CLOSED_WON: 'Closed Won',
  CLOSED_LOST: 'Closed Lost',
}

const STAGE_HEADER_COLORS: Record<DealStage, string> = {
  PROSPECT: 'bg-blue-50 border-blue-200',
  PROPOSAL: 'bg-yellow-50 border-yellow-200',
  NEGOTIATION: 'bg-purple-50 border-purple-200',
  CLOSED_WON: 'bg-green-50 border-green-200',
  CLOSED_LOST: 'bg-gray-100 border-gray-200',
}

const DEAL_INPUT_CLASS =
  'w-full rounded-[18px] border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-900 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.22)] outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'

const STAGE_BADGES: Record<DealStage, string> = {
  PROSPECT: 'bg-blue-100 text-blue-700',
  PROPOSAL: 'bg-yellow-100 text-yellow-700',
  NEGOTIATION: 'bg-purple-100 text-purple-700',
  CLOSED_WON: 'bg-green-100 text-green-700',
  CLOSED_LOST: 'bg-red-100 text-red-700',
}

function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `$${value.toLocaleString()}`
  }
}

function normalizePercent(value: number): number {
  return value <= 1 ? value * 100 : value
}

function isValidDateInput(value: string): boolean {
  if (!value) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime())
}

function validateDealForm(values: {
  title: string
  selectedContactId?: string
  value: string
  probability: string
  closeDate: string
  notes: string
}): {
  fieldErrors: Partial<
    Record<'title' | 'contact' | 'value' | 'probability' | 'closeDate' | 'notes', string>
  >
  trimmedTitle: string
  trimmedNotes: string
  parsedValue?: number
  parsedProbability?: number
  closeDateIso?: string | null
} {
  const trimmedTitle = values.title.trim()
  const trimmedNotes = values.notes.trim()
  const nextFieldErrors: Partial<
    Record<'title' | 'contact' | 'value' | 'probability' | 'closeDate' | 'notes', string>
  > = {}
  let parsedValue: number | undefined
  let parsedProbability: number | undefined
  let closeDateIso: string | null | undefined

  if (!trimmedTitle) {
    nextFieldErrors.title = 'Deal title is required.'
  }

  if (values.selectedContactId !== undefined && !values.selectedContactId) {
    nextFieldErrors.contact = 'Please select a contact.'
  }

  if (values.value.trim()) {
    parsedValue = Number(values.value)
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
      nextFieldErrors.value = 'Value must be a non-negative number.'
    }
  }

  if (values.probability.trim()) {
    parsedProbability = Number(values.probability)
    if (!Number.isInteger(parsedProbability) || parsedProbability < 0 || parsedProbability > 100) {
      nextFieldErrors.probability = 'Probability must be a whole number between 0 and 100.'
    }
  }

  if (values.closeDate) {
    if (!isValidDateInput(values.closeDate)) {
      nextFieldErrors.closeDate = 'Close date must be a valid date.'
    } else {
      closeDateIso = new Date(`${values.closeDate}T00:00:00.000Z`).toISOString()
    }
  }

  if (trimmedNotes.length > 5000) {
    nextFieldErrors.notes = 'Notes must be 5000 characters or less.'
  }

  return {
    fieldErrors: nextFieldErrors,
    trimmedTitle,
    trimmedNotes,
    parsedValue,
    parsedProbability,
    closeDateIso,
  }
}

// ─── Create Deal Modal ────────────────────────────────────────────────────────

interface CreateDealModalProps {
  onClose: () => void
  onCreated: (deal: Deal) => void
}

function CreateDealModal({ onClose, onCreated }: CreateDealModalProps): JSX.Element {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)
  const [contacts, setContacts] = useState<ContactOption[]>([])
  const [contactSearch, setContactSearch] = useState('')
  const [selectedContactId, setSelectedContactId] = useState('')
  const [title, setTitle] = useState('')
  const [value, setValue] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [stage, setStage] = useState<DealStage>('PROSPECT')
  const [probability, setProbability] = useState('')
  const [closeDate, setCloseDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<'title' | 'contact' | 'value' | 'probability' | 'closeDate' | 'notes', string>>
  >({})

  useEffect(() => {
    previousActiveElementRef.current = document.activeElement as HTMLElement | null

    void (async () => {
      try {
        const token = await getAccessToken()
        const params = new URLSearchParams({ limit: '50' })
        if (contactSearch.trim()) params.set('search', contactSearch.trim())
        const data = await apiGet<{ contacts: ContactOption[] }>(
          `/contacts?${params.toString()}`,
          token,
        )
        setContacts(data.contacts)
      } catch {
        setError('Could not load matching contacts. Try again.')
      }
    })()
  }, [contactSearch])

  useEffect(() => {
    const focusable = modalRef.current?.querySelector<HTMLElement>(
      'input, button, textarea, select',
    )
    focusable?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousActiveElementRef.current?.focus()
    }
  }, [onClose])

  async function handleSubmit() {
    const validation = validateDealForm({
      title,
      selectedContactId,
      value,
      probability,
      closeDate,
      notes,
    })

    if (Object.keys(validation.fieldErrors).length > 0) {
      setFieldErrors(validation.fieldErrors)
      setError('Fix the highlighted fields before creating the deal.')
      return
    }

    setSaving(true)
    setError(null)
    setFieldErrors({})
    try {
      const token = await getAccessToken()
      const body: Record<string, unknown> = {
        title: validation.trimmedTitle,
        stage,
        currency,
      }
      if (validation.parsedValue !== undefined) body.value = validation.parsedValue
      if (validation.parsedProbability !== undefined)
        body.probability = validation.parsedProbability
      if (validation.closeDateIso) body.closeDate = validation.closeDateIso
      if (validation.trimmedNotes) body.notes = validation.trimmedNotes

      const created = await apiPost<Deal>(`/contacts/${selectedContactId}/deals`, body, token)
      onCreated(created)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create deal')
    } finally {
      setSaving(false)
    }
  }

  const selectedContact = contacts.find((c) => c.id === selectedContactId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-deal-title"
        className="app-panel w-full max-w-lg rounded-[28px] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 id="create-deal-title" className="text-lg font-bold text-gray-900">
            New Deal
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          {/* Contact picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact <span className="text-red-500">*</span>
            </label>
            {selectedContact ? (
              <div className="flex items-center justify-between rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-indigo-900">{selectedContact.name}</p>
                  {selectedContact.email && (
                    <p className="text-xs text-indigo-600">{selectedContact.email}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedContactId('')}
                  className="text-indigo-400 hover:text-indigo-600"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {contacts.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                    {contacts.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedContactId(c.id)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        <span className="font-medium text-gray-900">{c.name}</span>
                        {c.email && <span className="ml-2 text-gray-400 text-xs">{c.email}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {fieldErrors.contact && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.contact}</p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deal title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setFieldErrors((prev) => ({ ...prev, title: undefined }))
              }}
              placeholder="e.g. Enterprise contract"
              maxLength={300}
              aria-invalid={fieldErrors.title ? 'true' : 'false'}
              aria-describedby={fieldErrors.title ? 'create-deal-title-error' : undefined}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${fieldErrors.title ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`}
            />
            {fieldErrors.title && (
              <p id="create-deal-title-error" className="mt-1 text-xs text-red-600">
                {fieldErrors.title}
              </p>
            )}
          </div>

          {/* Value + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value)
                  setFieldErrors((prev) => ({ ...prev, value: undefined }))
                }}
                placeholder="0"
                aria-invalid={fieldErrors.value ? 'true' : 'false'}
                aria-describedby={fieldErrors.value ? 'create-deal-value-error' : undefined}
                className={`${DEAL_INPUT_CLASS} ${fieldErrors.value ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : ''}`}
              />
              {fieldErrors.value && (
                <p id="create-deal-value-error" className="mt-1 text-xs text-red-600">
                  {fieldErrors.value}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <SelectField
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="focus:border-indigo-500 focus:ring-indigo-100"
              >
                {['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'SGD', 'JPY'].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>

          {/* Stage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
            <SelectField
              value={stage}
              onChange={(e) => setStage(e.target.value as DealStage)}
              className="focus:border-indigo-500 focus:ring-indigo-100"
            >
              {DEAL_STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </SelectField>
          </div>

          {/* Probability + Close date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Probability (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={probability}
                onChange={(e) => {
                  setProbability(e.target.value)
                  setFieldErrors((prev) => ({ ...prev, probability: undefined }))
                }}
                placeholder="50"
                aria-invalid={fieldErrors.probability ? 'true' : 'false'}
                aria-describedby={
                  fieldErrors.probability ? 'create-deal-probability-error' : undefined
                }
                className={`${DEAL_INPUT_CLASS} ${fieldErrors.probability ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : ''}`}
              />
              {fieldErrors.probability && (
                <p id="create-deal-probability-error" className="mt-1 text-xs text-red-600">
                  {fieldErrors.probability}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Close date</label>
              <input
                type="date"
                value={closeDate}
                onChange={(e) => {
                  setCloseDate(e.target.value)
                  setFieldErrors((prev) => ({ ...prev, closeDate: undefined }))
                }}
                aria-invalid={fieldErrors.closeDate ? 'true' : 'false'}
                aria-describedby={
                  fieldErrors.closeDate ? 'create-deal-close-date-error' : undefined
                }
                className={`${DEAL_INPUT_CLASS} ${fieldErrors.closeDate ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : ''}`}
              />
              {fieldErrors.closeDate && (
                <p id="create-deal-close-date-error" className="mt-1 text-xs text-red-600">
                  {fieldErrors.closeDate}
                </p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value)
                setFieldErrors((prev) => ({ ...prev, notes: undefined }))
              }}
              rows={3}
              maxLength={5000}
              placeholder="Deal context, next steps..."
              aria-invalid={fieldErrors.notes ? 'true' : 'false'}
              aria-describedby={fieldErrors.notes ? 'create-deal-notes-error' : undefined}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${fieldErrors.notes ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`}
            />
            {fieldErrors.notes && (
              <p id="create-deal-notes-error" className="mt-1 text-xs text-red-600">
                {fieldErrors.notes}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Creating...' : 'Create Deal'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit Deal Modal ──────────────────────────────────────────────────────────

interface EditDealModalProps {
  deal: Deal
  onClose: () => void
  onUpdated: (deal: Deal) => void
}

function EditDealModal({ deal, onClose, onUpdated }: EditDealModalProps): JSX.Element {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)
  const [title, setTitle] = useState(deal.title)
  const [value, setValue] = useState(deal.value > 0 ? String(deal.value) : '')
  const [currency, setCurrency] = useState(deal.currency || 'USD')
  const [stage, setStage] = useState<DealStage>(deal.stage)
  const [probability, setProbability] = useState(
    deal.probability > 0 ? String(Math.round(normalizePercent(deal.probability))) : '',
  )
  const [closeDate, setCloseDate] = useState(deal.closeDate ? deal.closeDate.slice(0, 10) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<'title' | 'value' | 'probability' | 'closeDate', string>>
  >({})

  async function handleSubmit() {
    const validation = validateDealForm({
      title,
      value,
      probability,
      closeDate,
      notes: '',
    })

    if (Object.keys(validation.fieldErrors).length > 0) {
      setFieldErrors(validation.fieldErrors)
      setError('Fix the highlighted fields before saving the deal.')
      return
    }

    setSaving(true)
    setError(null)
    setFieldErrors({})
    try {
      const token = await getAccessToken()
      const body: Record<string, unknown> = {
        title: validation.trimmedTitle,
        stage,
        currency,
      }
      body.value = validation.parsedValue ?? 0
      body.probability = validation.parsedProbability ?? 0
      body.closeDate = validation.closeDateIso ?? null

      const updated = await apiPatch<Deal>(`/deals/${deal.id}`, body, token)
      onUpdated(updated)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update deal')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    previousActiveElementRef.current = document.activeElement as HTMLElement | null
    const focusable = modalRef.current?.querySelector<HTMLElement>(
      'input, button, textarea, select',
    )
    focusable?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousActiveElementRef.current?.focus()
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-deal-title"
        className="app-panel w-full max-w-lg rounded-[28px] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 id="edit-deal-title" className="text-lg font-bold text-gray-900">
            Edit Deal
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-4">
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deal title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                setFieldErrors((prev) => ({ ...prev, title: undefined }))
              }}
              maxLength={300}
              aria-invalid={fieldErrors.title ? 'true' : 'false'}
              aria-describedby={fieldErrors.title ? 'edit-deal-title-error' : undefined}
              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${fieldErrors.title ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`}
            />
            {fieldErrors.title && (
              <p id="edit-deal-title-error" className="mt-1 text-xs text-red-600">
                {fieldErrors.title}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value)
                  setFieldErrors((prev) => ({ ...prev, value: undefined }))
                }}
                placeholder="0"
                aria-invalid={fieldErrors.value ? 'true' : 'false'}
                aria-describedby={fieldErrors.value ? 'edit-deal-value-error' : undefined}
                className={`${DEAL_INPUT_CLASS} ${fieldErrors.value ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : ''}`}
              />
              {fieldErrors.value && (
                <p id="edit-deal-value-error" className="mt-1 text-xs text-red-600">
                  {fieldErrors.value}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <SelectField
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="focus:border-indigo-500 focus:ring-indigo-100"
              >
                {['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'SGD', 'JPY'].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
            <SelectField
              value={stage}
              onChange={(e) => setStage(e.target.value as DealStage)}
              className="focus:border-indigo-500 focus:ring-indigo-100"
            >
              {DEAL_STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </SelectField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Probability (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={probability}
                onChange={(e) => {
                  setProbability(e.target.value)
                  setFieldErrors((prev) => ({ ...prev, probability: undefined }))
                }}
                placeholder="50"
                aria-invalid={fieldErrors.probability ? 'true' : 'false'}
                aria-describedby={
                  fieldErrors.probability ? 'edit-deal-probability-error' : undefined
                }
                className={`${DEAL_INPUT_CLASS} ${fieldErrors.probability ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : ''}`}
              />
              {fieldErrors.probability && (
                <p id="edit-deal-probability-error" className="mt-1 text-xs text-red-600">
                  {fieldErrors.probability}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Close date</label>
              <input
                type="date"
                value={closeDate}
                onChange={(e) => {
                  setCloseDate(e.target.value)
                  setFieldErrors((prev) => ({ ...prev, closeDate: undefined }))
                }}
                aria-invalid={fieldErrors.closeDate ? 'true' : 'false'}
                aria-describedby={fieldErrors.closeDate ? 'edit-deal-close-date-error' : undefined}
                className={`${DEAL_INPUT_CLASS} ${fieldErrors.closeDate ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : ''}`}
              />
              {fieldErrors.closeDate && (
                <p id="edit-deal-close-date-error" className="mt-1 text-xs text-red-600">
                  {fieldErrors.closeDate}
                </p>
              )}
              {closeDate && (
                <button
                  type="button"
                  onClick={() => setCloseDate('')}
                  className="mt-1 text-xs text-gray-400 hover:text-red-500"
                >
                  Clear date
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DealsPage(): JSX.Element {
  const userTz = useUserTimezone()
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyDealIds, setBusyDealIds] = useState<Set<string>>(new Set())
  const [drawerContactId, setDrawerContactId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null)
  const [stageFilter, setStageFilter] = useState<DealStage | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const loadDeals = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      const data = await apiGet<Deal[]>('/deals', token)
      setDeals(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deals')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDeals()
  }, [loadDeals])

  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      if (stageFilter !== 'ALL' && deal.stage !== stageFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (
          !deal.title.toLowerCase().includes(q) &&
          !(deal.contact?.name ?? '').toLowerCase().includes(q)
        )
          return false
      }
      return true
    })
  }, [deals, stageFilter, search])

  const groupedDeals = useMemo(() => {
    return DEAL_STAGES.reduce(
      (acc, stage) => {
        acc[stage] = filteredDeals.filter((deal) => deal.stage === stage)
        return acc
      },
      {} as Record<DealStage, Deal[]>,
    )
  }, [filteredDeals])

  const totalPipelineValue = useMemo(
    () => deals.reduce((sum, deal) => sum + deal.value, 0),
    [deals],
  )

  // Weighted pipeline = sum(value * probability)
  const weightedPipelineValue = useMemo(
    () =>
      deals
        .filter((d) => d.stage !== 'CLOSED_LOST')
        .reduce((sum, deal) => sum + deal.value * normalizePercent(deal.probability) * 0.01, 0),
    [deals],
  )

  const wonDeals = useMemo(() => deals.filter((d) => d.stage === 'CLOSED_WON'), [deals])
  const closedDeals = useMemo(
    () => deals.filter((d) => d.stage === 'CLOSED_WON' || d.stage === 'CLOSED_LOST'),
    [deals],
  )
  const winRate = closedDeals.length > 0 ? (wonDeals.length / closedDeals.length) * 100 : null

  const pipelineCurrency = deals[0]?.currency || 'USD'
  const activeDeals = deals.filter(
    (deal) => deal.stage !== 'CLOSED_WON' && deal.stage !== 'CLOSED_LOST',
  )
  const nextClosingDeal = [...activeDeals]
    .filter((deal) => Boolean(deal.closeDate))
    .sort((a, b) => new Date(a.closeDate ?? 0).getTime() - new Date(b.closeDate ?? 0).getTime())[0]
  const focusMessage = nextClosingDeal?.closeDate
    ? `${nextClosingDeal.title} is the nearest close target on ${formatDate(nextClosingDeal.closeDate, userTz)}.`
    : activeDeals.length > 0
      ? `${activeDeals.length} live deal${activeDeals.length === 1 ? '' : 's'} are moving through your pipeline.`
      : 'Create your first deal to start tracking revenue opportunities.'

  const setBusy = (dealId: string, busy: boolean) => {
    setBusyDealIds((prev) => {
      const next = new Set(prev)
      if (busy) next.add(dealId)
      else next.delete(dealId)
      return next
    })
  }

  const handleStageChange = useCallback(async (deal: Deal, newStage: DealStage) => {
    if (deal.stage === newStage) return
    setBusy(deal.id, true)
    setError(null)
    setDeals((prev) =>
      prev.map((item) => (item.id === deal.id ? { ...item, stage: newStage } : item)),
    )
    try {
      const token = await getAccessToken()
      const updated = await apiPatch<Deal>(`/deals/${deal.id}`, { stage: newStage }, token)
      setDeals((prev) => prev.map((item) => (item.id === deal.id ? updated : item)))
    } catch (err) {
      setDeals((prev) => prev.map((item) => (item.id === deal.id ? deal : item)))
      setError(err instanceof Error ? err.message : 'Failed to update deal stage')
    } finally {
      setBusy(deal.id, false)
    }
  }, [])

  const handleDelete = useCallback(async (dealId: string) => {
    setConfirmDeleteId(dealId)
  }, [])

  const confirmDelete = useCallback(async (dealId: string) => {
    setConfirmDeleteId(null)
    setBusy(dealId, true)
    setError(null)
    try {
      const token = await getAccessToken()
      await apiDelete(`/deals/${dealId}`, token)
      setDeals((prev) => prev.filter((deal) => deal.id !== dealId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete deal')
    } finally {
      setBusy(dealId, false)
    }
  }, [])

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="app-panel relative overflow-hidden rounded-[34px] px-6 py-6 sm:px-8 sm:py-7">
        <div
          className="absolute inset-0 opacity-90"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(circle at top left, rgba(99,102,241,0.14), transparent 34%), radial-gradient(circle at right center, rgba(59,130,246,0.10), transparent 28%), linear-gradient(135deg, rgba(255,255,255,0.94), rgba(248,250,252,0.98))',
          }}
        />
        <div className="relative grid gap-5 xl:grid-cols-[1.35fr_0.92fr] xl:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-600">
              <BriefcaseBusiness className="h-3.5 w-3.5" />
              Revenue
            </div>
            <h1 className="mt-3 text-2xl font-bold text-gray-900 sm:text-[2rem]">
              Manage your sales pipeline with clearer momentum
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-500 sm:text-[15px]">
              Track live opportunities, surface likely wins, and keep your team focused on the deals
              that are closest to revenue.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-xl sm:grid-cols-4">
              {[
                { label: 'Active Deals', value: loading ? '—' : activeDeals.length },
                {
                  label: 'Pipeline Value',
                  value: loading ? '—' : formatCurrency(totalPipelineValue, pipelineCurrency),
                },
                {
                  label: 'Weighted Value',
                  value: loading ? '—' : formatCurrency(weightedPipelineValue, pipelineCurrency),
                },
                {
                  label: 'Win Rate',
                  value: loading ? '—' : winRate != null ? `${Math.round(winRate)}%` : '—',
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-[22px] border border-white/80 bg-white/85 px-3 py-3 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.2)]"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-bold text-gray-900 sm:text-base">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_20px_40px_-28px_rgba(79,70,229,0.42)] transition-transform hover:-translate-y-0.5 hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                New Deal
              </button>
              <button
                type="button"
                onClick={() => {
                  setStageFilter('ALL')
                  setSearch('')
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                <Target className="h-4 w-4 text-indigo-500" />
                Clear filters
              </button>
            </div>

            <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-medium text-gray-600 shadow-sm">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                <TrendingUp className="h-3.5 w-3.5" />
              </span>
              <span className="truncate">Focus: {focusMessage}</span>
            </div>
          </div>

          <div className="app-panel-subtle rounded-[30px] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Pipeline Snapshot
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  Revenue health at a glance
                </p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-600 shadow-sm">
                Live
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {[
                {
                  label: 'Likely revenue',
                  value: loading ? '—' : formatCurrency(weightedPipelineValue, pipelineCurrency),
                  detail: 'Probability-adjusted pipeline based on current deal stages',
                  icon: CircleDollarSign,
                  tone: 'bg-indigo-50 text-indigo-600',
                },
                {
                  label: 'Closed wins',
                  value: loading ? '—' : `${wonDeals.length}`,
                  detail: 'Deals already converted into revenue',
                  icon: TrendingUp,
                  tone: 'bg-green-50 text-green-600',
                },
                {
                  label: 'Nearest close target',
                  value: loading
                    ? '—'
                    : nextClosingDeal?.closeDate
                      ? formatDate(nextClosingDeal.closeDate, userTz)
                      : 'None',
                  detail: nextClosingDeal
                    ? nextClosingDeal.title
                    : 'No dated close target in active deals',
                  icon: Target,
                  tone: 'bg-amber-50 text-amber-600',
                },
              ].map(({ label, value, detail, icon: Icon, tone }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-[24px] border border-white/80 bg-white/80 px-4 py-3"
                >
                  <span
                    className={`${tone} flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {label}
                    </p>
                    <p className="truncate text-sm text-gray-500">{detail}</p>
                  </div>
                  <span className="shrink-0 text-lg font-bold tabular-nums text-gray-900">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="app-panel rounded-[24px] px-5 py-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Total pipeline
          </p>
          <p className="mt-1 text-xl font-bold text-gray-900">
            {formatCurrency(totalPipelineValue, pipelineCurrency)}
          </p>
        </div>
        <div className="app-panel rounded-[24px] px-5 py-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
            Weighted pipeline
          </p>
          <p className="mt-1 text-xl font-bold text-indigo-700">
            {formatCurrency(weightedPipelineValue, pipelineCurrency)}
          </p>
        </div>
        <div className="app-panel rounded-[24px] px-5 py-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Win rate</p>
          <p className="mt-1 text-xl font-bold text-green-700">
            {winRate != null ? `${Math.round(winRate)}%` : '—'}
          </p>
        </div>
        <div className="app-panel rounded-[24px] px-5 py-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Avg won deal</p>
          <p className="mt-1 text-xl font-bold text-gray-900">
            {wonDeals.length > 0
              ? formatCurrency(
                  wonDeals.reduce((s, d) => s + d.value, 0) / wonDeals.length,
                  pipelineCurrency,
                )
              : '—'}
          </p>
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-wrap gap-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Search deals or contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 rounded-xl border border-gray-300 py-2 pl-3 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <SelectField
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value as DealStage | 'ALL')}
          className="rounded-xl px-3 py-2.5 pr-10 focus:border-indigo-500 focus:ring-indigo-100"
        >
          <option value="ALL">All stages</option>
          {DEAL_STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </SelectField>
      </div>

      {error && <StatusNotice message={error} />}

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {DEAL_STAGES.map((stage) => (
            <div
              key={stage}
              className="app-list-skeleton h-72 w-72 shrink-0 animate-pulse rounded-[24px]"
            />
          ))}
        </div>
      ) : filteredDeals.length === 0 ? (
        <div className="app-empty-state">
          <BriefcaseBusiness className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p className="text-sm font-medium text-gray-700">
            {deals.length === 0 ? 'No deals yet' : 'No deals match your filters'}
          </p>
          <p className="mt-1 text-sm text-gray-400">
            {deals.length === 0
              ? 'Click "New Deal" to create your first deal.'
              : 'Try adjusting your search or stage filter.'}
          </p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {DEAL_STAGES.map((stage) => {
            const stageDeals = groupedDeals[stage]
            const stageTotal = stageDeals.reduce((sum, deal) => sum + deal.value, 0)

            return (
              <div key={stage} className="app-panel flex w-80 shrink-0 flex-col rounded-[24px]">
                <div
                  className={`rounded-t-[24px] border-b px-4 py-3 ${STAGE_HEADER_COLORS[stage]}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-sm font-semibold text-gray-800">{STAGE_LABELS[stage]}</h2>
                      <p className="mt-1 text-xs text-gray-500">
                        {formatCurrency(stageTotal, stageDeals[0]?.currency || pipelineCurrency)}
                      </p>
                    </div>
                    <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-2 text-xs font-bold text-gray-600 shadow-sm">
                      {stageDeals.length}
                    </span>
                  </div>
                </div>

                <div className="flex min-h-[260px] flex-1 flex-col gap-3 p-3">
                  {stageDeals.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-400">No deals in this stage</p>
                  ) : (
                    stageDeals.map((deal) => {
                      const busy = busyDealIds.has(deal.id)

                      return (
                        <div key={deal.id} className="app-panel-subtle rounded-[22px] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <h3 className="truncate text-sm font-semibold text-gray-900">
                                {deal.title}
                              </h3>
                              {deal.contact ? (
                                <button
                                  type="button"
                                  onClick={() => setDrawerContactId(deal.contact?.id ?? null)}
                                  className="mt-1 block truncate text-sm text-indigo-600 hover:underline"
                                >
                                  {deal.contact.name}
                                </button>
                              ) : (
                                <p className="mt-1 text-sm text-gray-400">No contact</p>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => setEditingDeal(deal)}
                                className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                                aria-label={`Edit ${deal.title}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => void handleDelete(deal.id)}
                                className="rounded-lg border border-gray-300 p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                                aria-label={`Delete ${deal.title}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-lg font-bold text-gray-900">
                              {formatCurrency(deal.value, deal.currency || 'USD')}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_BADGES[deal.stage]}`}
                            >
                              {STAGE_LABELS[deal.stage]}
                            </span>
                          </div>

                          <div className="mt-3 space-y-1 text-sm text-gray-500">
                            <p>
                              Close date:{' '}
                              {deal.closeDate
                                ? formatDate(deal.closeDate, userTz)
                                : 'No close date'}
                            </p>
                            <p>Probability: {Math.round(normalizePercent(deal.probability))}%</p>
                            {deal.contact?.email && (
                              <p className="truncate">{deal.contact.email}</p>
                            )}
                          </div>

                          <SelectField
                            value={deal.stage}
                            disabled={busy}
                            onChange={(event) =>
                              void handleStageChange(deal, event.target.value as DealStage)
                            }
                            className="mt-4 rounded-xl px-3 py-2.5 pr-10 focus:border-indigo-500 focus:ring-indigo-100"
                          >
                            {DEAL_STAGES.map((option) => (
                              <option key={option} value={option}>
                                {STAGE_LABELS[option]}
                              </option>
                            ))}
                          </SelectField>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreateModal && (
        <CreateDealModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(deal) => setDeals((prev) => [deal, ...prev])}
        />
      )}

      {editingDeal && (
        <EditDealModal
          deal={editingDeal}
          onClose={() => setEditingDeal(null)}
          onUpdated={(updated) => {
            setDeals((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
            setEditingDeal(null)
          }}
        />
      )}

      <ContactDetailDrawer contactId={drawerContactId} onClose={() => setDrawerContactId(null)} />

      {confirmDeleteId && (
        <ConfirmDialog
          message="Delete this deal? This cannot be undone."
          onConfirm={() => {
            void confirmDelete(confirmDeleteId)
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  )
}

// ─── ConfirmDialog ────────────────────────────────────────────────────────────

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string
  onConfirm: () => void
  onCancel: () => void
}): JSX.Element {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onCancel} aria-hidden="true" />
      <div className="fixed inset-x-4 top-1/2 z-50 w-full max-w-sm -translate-y-1/2 rounded-xl bg-white p-6 shadow-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2">
        <h3 className="text-sm font-semibold text-gray-900">Confirm</h3>
        <p className="mt-1 text-sm text-gray-500">{message}</p>
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
