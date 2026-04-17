'use client'

import type { JSX } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import type { PaginatedResponse } from '@dotly/types'
import { SelectField } from '@/components/ui/SelectField'
import { ContactDetailDrawer } from '@/components/crm/ContactDetailDrawer'
import { ModalBackdrop } from '@/components/crm/ModalBackdrop'
import { apiGet, apiPatch, apiPost } from '@/lib/api'
import { getAccessToken } from '@/lib/auth/client'
import { formatDate } from '@/lib/tz'
import { useUserTimezone } from '@/hooks/useUserLocale'
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap'
import {
  DEAL_INPUT_CLASS,
  formatCurrency,
  normalizePercent,
  STAGE_BADGES,
  STAGE_HEADER_COLORS,
  STAGE_LABELS,
  validateDealForm,
} from './helpers'
import { DEAL_STAGES, type ContactOption, type Deal, type DealStage } from './types'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'SGD', 'JPY'] as const

interface CreateDealModalProps {
  onClose: () => void
  onCreated: (deal: Deal) => void
}

interface EditDealModalProps {
  deal: Deal
  onClose: () => void
  onUpdated: (deal: Deal) => void
}

export function CreateDealModal({ onClose, onCreated }: CreateDealModalProps): JSX.Element {
  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const contactRequestIdRef = useRef(0)
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
    let active = true
    setError(null)
    const requestId = ++contactRequestIdRef.current
    void (async () => {
      try {
        const token = await getAccessToken()
        const params = new URLSearchParams({ limit: '50' })
        if (contactSearch.trim()) params.set('search', contactSearch.trim())
        const data = await apiGet<PaginatedResponse<ContactOption>>(
          `/contacts?${params.toString()}`,
          token,
        )
        if (!active || contactRequestIdRef.current !== requestId) return
        setContacts(data.items)
      } catch {
        if (!active || contactRequestIdRef.current !== requestId) return
        setError('Could not load matching contacts. Try again.')
      }
    })()
    return () => {
      active = false
    }
  }, [contactSearch])

  useDialogFocusTrap({
    active: true,
    containerRef: modalRef,
    initialFocusRef: closeButtonRef,
    onEscape: onClose,
  })

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
      const body: Record<string, unknown> = { title: validation.trimmedTitle, stage, currency }
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

  const selectedContact = contacts.find((contact) => contact.id === selectedContactId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-md transition-all sm:p-6">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-deal-dialog-title"
        className="relative mx-auto w-full max-w-lg my-8 rounded-[32px] bg-white/95 leading-relaxed shadow-[0_24px_54px_-34px_rgba(15,23,42,0.3)] backdrop-blur-2xl ring-1 ring-white/60 sm:container"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-8 py-6">
          <h2 id="create-deal-dialog-title" className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">
            New Deal
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close create deal dialog"
            className="app-touch-target flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>
        <div className="app-dialog-body-scroll px-8 py-6 custom-scrollbar max-h-[60vh] overflow-y-auto space-y-6">
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
          <div>
            <label
              htmlFor="create-deal-contact-search"
              className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-slate-500"
            >
              Contact <span className="text-red-500">*</span>
            </label>
            {selectedContact ? (
              <div className="flex items-center justify-between rounded-2xl border border-indigo-200 bg-indigo-50/80 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-indigo-900">{selectedContact.name}</p>
                  {selectedContact.email && (
                    <p className="text-xs text-indigo-600">{selectedContact.email}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedContactId('')}
                  aria-label="Clear selected contact"
                  className="text-indigo-400 hover:text-indigo-600"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  id="create-deal-contact-search"
                  type="text"
                  placeholder="Search contacts..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200/60 bg-slate-50/50 px-4 py-3.5 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 hover:bg-white focus:border-indigo-500 focus:bg-white focus:ring-[3px] focus:ring-indigo-500/20"
                />
                {contacts.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded-2xl border border-slate-200/60 bg-white/90 shadow-md backdrop-blur-xl custom-scrollbar">
                    {contacts.map((contact) => (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => setSelectedContactId(contact.id)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        <span className="font-medium text-gray-900">{contact.name}</span>
                        {contact.email && (
                          <span className="ml-2 text-xs text-gray-400">{contact.email}</span>
                        )}
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
          <DealFormFields
            mode="create"
            title={title}
            setTitle={setTitle}
            value={value}
            setValue={setValue}
            currency={currency}
            setCurrency={setCurrency}
            stage={stage}
            setStage={setStage}
            probability={probability}
            setProbability={setProbability}
            closeDate={closeDate}
            setCloseDate={setCloseDate}
            notes={notes}
            setNotes={setNotes}
            fieldErrors={fieldErrors}
            setFieldErrors={setFieldErrors}
          />
        </div>
        <div className="sticky bottom-0 mt-4 flex items-center justify-end gap-3 border-t border-slate-100 bg-white/50 p-6 backdrop-blur-md rounded-b-[32px]">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 sm:w-auto active:scale-95"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-lg active:scale-95 disabled:pointer-events-none disabled:opacity-60 sm:w-auto"
          >
            {saving ? 'Creating...' : 'Create Deal'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function EditDealModal({ deal, onClose, onUpdated }: EditDealModalProps): JSX.Element {
  const modalRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
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

  useEffect(() => {
    setTitle(deal.title)
    setValue(deal.value > 0 ? String(deal.value) : '')
    setCurrency(deal.currency || 'USD')
    setStage(deal.stage)
    setProbability(
      deal.probability > 0 ? String(Math.round(normalizePercent(deal.probability))) : '',
    )
    setCloseDate(deal.closeDate ? deal.closeDate.slice(0, 10) : '')
    setError(null)
    setFieldErrors({})
  }, [deal])

  useDialogFocusTrap({
    active: true,
    containerRef: modalRef,
    initialFocusRef: closeButtonRef,
    onEscape: onClose,
  })

  async function handleSubmit() {
    const validation = validateDealForm({ title, value, probability, closeDate, notes: '' })
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
        value: validation.parsedValue ?? 0,
        probability: validation.parsedProbability ?? 0,
        closeDate: validation.closeDateIso ?? null,
      }
      const updated = await apiPatch<Deal>(`/deals/${deal.id}`, body, token)
      onUpdated(updated)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update deal')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-md transition-all sm:p-6">
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-deal-dialog-title"
        className="relative mx-auto w-full max-w-lg my-8 rounded-[32px] bg-white/95 leading-relaxed shadow-[0_24px_54px_-34px_rgba(15,23,42,0.3)] backdrop-blur-2xl ring-1 ring-white/60 sm:container"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-8 py-6">
          <h2 id="edit-deal-dialog-title" className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">
            Edit Deal
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close edit deal dialog"
            className="app-touch-target flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>
        <div className="app-dialog-body-scroll px-8 py-6 custom-scrollbar max-h-[60vh] overflow-y-auto space-y-6">
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
          <DealFormFields
            mode="edit"
            title={title}
            setTitle={setTitle}
            value={value}
            setValue={setValue}
            currency={currency}
            setCurrency={setCurrency}
            stage={stage}
            setStage={setStage}
            probability={probability}
            setProbability={setProbability}
            closeDate={closeDate}
            setCloseDate={setCloseDate}
            notes=""
            setNotes={() => {}}
            fieldErrors={fieldErrors}
            setFieldErrors={setFieldErrors}
          />
        </div>
        <div className="sticky bottom-0 mt-4 flex items-center justify-end gap-3 border-t border-slate-100 bg-white/50 p-6 backdrop-blur-md rounded-b-[32px]">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 sm:w-auto active:scale-95"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-lg active:scale-95 disabled:pointer-events-none disabled:opacity-60 sm:w-auto"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DealFormFields({
  mode,
  title,
  setTitle,
  value,
  setValue,
  currency,
  setCurrency,
  stage,
  setStage,
  probability,
  setProbability,
  closeDate,
  setCloseDate,
  notes,
  setNotes,
  fieldErrors,
  setFieldErrors,
}: {
  mode: 'create' | 'edit'
  title: string
  setTitle: (value: string) => void
  value: string
  setValue: (value: string) => void
  currency: string
  setCurrency: (value: string) => void
  stage: DealStage
  setStage: (value: DealStage) => void
  probability: string
  setProbability: (value: string) => void
  closeDate: string
  setCloseDate: (value: string) => void
  notes: string
  setNotes: (value: string) => void
  fieldErrors: Partial<
    Record<'title' | 'contact' | 'value' | 'probability' | 'closeDate' | 'notes', string>
  >
  setFieldErrors: React.Dispatch<
    React.SetStateAction<
      Partial<Record<'title' | 'contact' | 'value' | 'probability' | 'closeDate' | 'notes', string>>
    >
  >
}): JSX.Element {
  return (
    <>
      <div>
        <label
          htmlFor={`${mode}-deal-title-input`}
          className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-slate-500"
        >
          Deal title <span className="text-red-500">*</span>
        </label>
        <input
          id={`${mode}-deal-title-input`}
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            setFieldErrors((prev) => ({ ...prev, title: undefined }))
          }}
          placeholder="e.g. Enterprise contract"
          maxLength={300}
          aria-invalid={fieldErrors.title ? 'true' : 'false'}
          aria-describedby={fieldErrors.title ? `${mode}-deal-title-error` : undefined}
          className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${fieldErrors.title ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`}
        />
        {fieldErrors.title && (
          <p id={`${mode}-deal-title-error`} className="mt-1 text-xs text-red-600">
            {fieldErrors.title}
          </p>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`${mode}-deal-value-input`}
            className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-slate-500"
          >
            Value
          </label>
          <input
            id={`${mode}-deal-value-input`}
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
            aria-describedby={fieldErrors.value ? `${mode}-deal-value-error` : undefined}
            className={`${DEAL_INPUT_CLASS} ${fieldErrors.value ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : ''}`}
          />
          {fieldErrors.value && (
            <p id={`${mode}-deal-value-error`} className="mt-1 text-xs text-red-600">
              {fieldErrors.value}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor={`${mode}-deal-currency-input`}
            className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-slate-500"
          >
            Currency
          </label>
          <SelectField
            id={`${mode}-deal-currency-input`}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="focus:border-indigo-500 focus:ring-indigo-100"
          >
            {CURRENCIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </SelectField>
        </div>
      </div>
      <div>
        <label
          htmlFor={`${mode}-deal-stage-input`}
          className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-slate-500"
        >
          Stage
        </label>
        <SelectField
          id={`${mode}-deal-stage-input`}
          value={stage}
          onChange={(e) => setStage(e.target.value as DealStage)}
          className="focus:border-indigo-500 focus:ring-indigo-100"
        >
          {DEAL_STAGES.map((option) => (
            <option key={option} value={option}>
              {STAGE_LABELS[option]}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`${mode}-deal-probability-input`}
            className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-slate-500"
          >
            Probability (%)
          </label>
          <input
            id={`${mode}-deal-probability-input`}
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
              fieldErrors.probability ? `${mode}-deal-probability-error` : undefined
            }
            className={`${DEAL_INPUT_CLASS} ${fieldErrors.probability ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : ''}`}
          />
          {fieldErrors.probability && (
            <p id={`${mode}-deal-probability-error`} className="mt-1 text-xs text-red-600">
              {fieldErrors.probability}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor={`${mode}-deal-close-date-input`}
            className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-slate-500"
          >
            Close date
          </label>
          <input
            id={`${mode}-deal-close-date-input`}
            type="date"
            value={closeDate}
            onChange={(e) => {
              setCloseDate(e.target.value)
              setFieldErrors((prev) => ({ ...prev, closeDate: undefined }))
            }}
            aria-invalid={fieldErrors.closeDate ? 'true' : 'false'}
            aria-describedby={fieldErrors.closeDate ? `${mode}-deal-close-date-error` : undefined}
            className={`${DEAL_INPUT_CLASS} ${fieldErrors.closeDate ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : ''}`}
          />
          {fieldErrors.closeDate && (
            <p id={`${mode}-deal-close-date-error`} className="mt-1 text-xs text-red-600">
              {fieldErrors.closeDate}
            </p>
          )}
          {mode === 'edit' && closeDate && (
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
      {mode === 'create' && (
        <div>
          <label
            htmlFor="create-deal-notes-input"
            className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-slate-500"
          >
            Notes
          </label>
          <textarea
            id="create-deal-notes-input"
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
      )}
    </>
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
        aria-labelledby="deals-confirm-dialog-title"
        className="app-confirm-panel"
      >
        <h3 id="deals-confirm-dialog-title" className="text-sm font-semibold text-gray-900">
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
