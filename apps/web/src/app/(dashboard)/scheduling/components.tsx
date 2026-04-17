'use client'

import type { JSX } from 'react'
import { useEffect, useRef, useState } from 'react'
import { StatusNotice } from '@/components/ui/StatusNotice'
import { SelectField } from '@/components/ui/SelectField'
import { apiPost, apiPut } from '@/lib/api'
import { getAccessToken } from '@/lib/auth/client'
import { Plus, Trash2, X } from 'lucide-react'
import { ModalBackdrop } from '@/components/crm/ModalBackdrop'
import {
  ALL_DAYS,
  ALL_TIMEZONES,
  DAY_LABEL,
  QUESTION_TYPE_LABELS,
  SCHEDULING_CONTROL_CLASS,
} from './helpers'
import type {
  AppointmentType,
  AvailabilityRule,
  BookingQuestion,
  BookingQuestionType,
  DayOfWeek,
} from './types'

interface AvailabilityEditorProps {
  initial: AvailabilityRule[]
  onSave: (rules: { dayOfWeek: DayOfWeek; startTime: string; endTime: string }[]) => void
  onClose: () => void
}

interface AptTypeFormProps {
  initial?: Partial<AppointmentType>
  onSave: (data: {
    name: string
    slug: string
    description: string
    durationMins: number
    color: string
    bufferDays: number
    bufferAfterMins: number
    location: string
    isActive: boolean
    timezone: string
    depositEnabled: boolean
    depositAmountUsdt: string
  }) => Promise<void>
  onClose: () => void
}

type AppointmentTypeFieldErrorKey =
  | 'name'
  | 'slug'
  | 'description'
  | 'durationMins'
  | 'bufferDays'
  | 'bufferAfterMins'
  | 'location'
  | 'depositAmountUsdt'

interface QuestionsBuilderProps {
  appointmentTypeId: string
  initial: BookingQuestion[]
  onSave: () => void
  onClose: () => void
}

function CenteredDialogShell({
  children,
  className = 'max-w-lg',
  onClose,
}: {
  children: React.ReactNode
  className?: string
  onClose: () => void
}): JSX.Element {
  return (
    <>
      <ModalBackdrop onClick={onClose} tone="drawer" zIndexClass="z-50" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <div
          className={`app-panel flex max-h-[90vh] w-full flex-col rounded-[28px] shadow-2xl ${className}`}
        >
          {children}
        </div>
      </div>
    </>
  )
}

export function AvailabilityEditor({
  initial,
  onSave,
  onClose,
}: AvailabilityEditorProps): JSX.Element {
  const [dayWindows, setDayWindows] = useState<
    Record<DayOfWeek, { startTime: string; endTime: string }[]>
  >(() => {
    const map = Object.fromEntries(ALL_DAYS.map((day) => [day, []])) as unknown as Record<
      DayOfWeek,
      { startTime: string; endTime: string }[]
    >
    if (initial.length === 0) {
      ALL_DAYS.slice(0, 5).forEach((day) => {
        map[day] = [{ startTime: '09:00', endTime: '17:00' }]
      })
    } else {
      for (const rule of initial) {
        map[rule.dayOfWeek].push({ startTime: rule.startTime, endTime: rule.endTime })
      }
    }
    return map
  })
  const [validationError, setValidationError] = useState<string | null>(null)

  function addWindow(day: DayOfWeek) {
    setDayWindows((prev) => ({
      ...prev,
      [day]: [...prev[day], { startTime: '09:00', endTime: '17:00' }],
    }))
  }

  function removeWindow(day: DayOfWeek, index: number) {
    setDayWindows((prev) => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index),
    }))
  }

  function updateWindow(
    day: DayOfWeek,
    index: number,
    field: 'startTime' | 'endTime',
    value: string,
  ) {
    setValidationError(null)
    setDayWindows((prev) => ({
      ...prev,
      [day]: prev[day].map((window, i) => (i === index ? { ...window, [field]: value } : window)),
    }))
  }

  function handleSave() {
    for (const day of ALL_DAYS) {
      for (const window of dayWindows[day]) {
        if (window.startTime >= window.endTime) {
          setValidationError(
            `${DAY_LABEL[day]}: start time must be before end time (${window.startTime} – ${window.endTime}).`,
          )
          return
        }
      }
    }
    const rules: { dayOfWeek: DayOfWeek; startTime: string; endTime: string }[] = []
    for (const day of ALL_DAYS) {
      for (const window of dayWindows[day]) {
        rules.push({ dayOfWeek: day, startTime: window.startTime, endTime: window.endTime })
      }
    }
    onSave(rules)
  }

  return (
    <CenteredDialogShell className="max-w-lg" onClose={onClose}>
      <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 p-5">
        <h3 className="text-lg font-semibold text-slate-900">Edit Availability</h3>
        <button onClick={onClose} className="app-touch-target rounded-lg p-2 hover:bg-slate-100">
          <X className="h-5 w-5 text-slate-500" />
        </button>
      </div>
      <div className="app-dialog-body-scroll space-y-4 p-5">
        {validationError && (
          <StatusNotice tone="warning" message={validationError} liveMode="polite" />
        )}
        {ALL_DAYS.map((day) => {
          const windows = dayWindows[day]
          const isActive = windows.length > 0
          return (
            <div key={day} className="rounded-xl border border-slate-100 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={`text-sm font-semibold ${isActive ? 'text-slate-900' : 'text-slate-400'}`}
                >
                  {DAY_LABEL[day]}
                </span>
                <button
                  type="button"
                  onClick={() => addWindow(day)}
                  className="app-touch-target inline-flex items-center gap-1 rounded-lg px-2 py-2 text-sm font-medium text-sky-600 hover:bg-sky-50"
                >
                  <Plus className="h-3.5 w-3.5" /> Add window
                </button>
              </div>
              {windows.length === 0 ? (
                <span className="text-xs text-slate-400">Unavailable</span>
              ) : (
                <div className="space-y-2">
                  {windows.map((window, index) => (
                    <div key={index} className="flex flex-wrap items-center gap-2">
                      <input
                        type="time"
                        value={window.startTime}
                        onChange={(e) => updateWindow(day, index, 'startTime', e.target.value)}
                        className="rounded-lg border border-slate-200/60 px-3 py-1.5 text-sm"
                      />
                      <span className="text-slate-400">—</span>
                      <input
                        type="time"
                        value={window.endTime}
                        onChange={(e) => updateWindow(day, index, 'endTime', e.target.value)}
                        className="rounded-lg border border-slate-200/60 px-3 py-1.5 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeWindow(day, index)}
                        className="app-touch-target ml-auto rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="sticky bottom-0 mt-4 flex items-center justify-end gap-3 border-t border-slate-100 bg-white/50 p-6 backdrop-blur-md rounded-b-[32px]">
        <button
          onClick={onClose}
          className="app-touch-target w-full rounded-lg border border-slate-200/60 px-4 py-2.5 text-sm hover:bg-slate-50 sm:w-auto"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="app-touch-target w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-sky-700 sm:w-auto"
        >
          Save Availability
        </button>
      </div>
    </CenteredDialogShell>
  )
}

export function AptTypeForm({ initial, onSave, onClose }: AptTypeFormProps): JSX.Element {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)
  const [name, setName] = useState(initial?.name ?? '')
  const [slug, setSlug] = useState(initial?.slug ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [durationMins, setDurationMins] = useState(initial?.durationMins ?? 30)
  const [color, setColor] = useState(initial?.color ?? '#0ea5e9')
  const [bufferDays, setBufferDays] = useState(initial?.bufferDays ?? 60)
  const [bufferAfterMins, setBufferAfterMins] = useState(initial?.bufferAfterMins ?? 0)
  const [location, setLocation] = useState(initial?.location ?? '')
  const [isActive, setIsActive] = useState(initial?.isActive ?? true)
  const [timezone, setTimezone] = useState(
    initial?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
  )
  const [depositEnabled, setDepositEnabled] = useState(initial?.depositEnabled ?? false)
  const [depositAmountUsdt, setDepositAmountUsdt] = useState(initial?.depositAmountUsdt ?? '')
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<AppointmentTypeFieldErrorKey, string>>
  >({})

  const inputClass = (field?: keyof typeof fieldErrors) =>
    `${SCHEDULING_CONTROL_CLASS} ${field && fieldErrors[field] ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : ''}`

  const clearFieldError = (field: keyof typeof fieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  function handleNameChange(value: string) {
    setName(value)
    if (!slugTouched) {
      setSlug(
        value
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, ''),
      )
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    const trimmedName = name.trim()
    const normalizedSlug = slug
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    const trimmedDescription = description.trim()
    const trimmedLocation = location.trim()
    const nextFieldErrors: Partial<Record<AppointmentTypeFieldErrorKey, string>> = {}

    if (!trimmedName) nextFieldErrors.name = 'Name is required.'
    else if (trimmedName.length < 2) nextFieldErrors.name = 'Name must be at least 2 characters.'
    else if (trimmedName.length > 120) nextFieldErrors.name = 'Name must be 120 characters or less.'
    if (!normalizedSlug) nextFieldErrors.slug = 'Slug is required.'
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug))
      nextFieldErrors.slug = 'Use lowercase letters, numbers, and hyphens only.'
    else if (normalizedSlug.length > 100)
      nextFieldErrors.slug = 'Slug must be 100 characters or less.'
    if (trimmedDescription.length > 2000)
      nextFieldErrors.description = 'Description must be 2000 characters or less.'
    if (!Number.isFinite(durationMins) || durationMins < 5 || durationMins > 480)
      nextFieldErrors.durationMins = 'Duration must be between 5 and 480 minutes.'
    if (!Number.isFinite(bufferDays) || bufferDays < 0 || bufferDays > 365)
      nextFieldErrors.bufferDays = 'Booking window must be between 0 and 365 days.'
    if (!Number.isFinite(bufferAfterMins) || bufferAfterMins < 0 || bufferAfterMins > 240)
      nextFieldErrors.bufferAfterMins = 'Buffer after must be between 0 and 240 minutes.'
    if (trimmedLocation.length > 500)
      nextFieldErrors.location = 'Location must be 500 characters or less.'
    if (depositEnabled) {
      const normalizedDeposit = depositAmountUsdt.trim()
      if (!normalizedDeposit) {
        nextFieldErrors.depositAmountUsdt = 'Deposit amount is required when deposits are enabled.'
      } else if (!/^\d+(?:\.\d{1,2})?$/.test(normalizedDeposit)) {
        nextFieldErrors.depositAmountUsdt = 'Use a valid USDT amount with up to 2 decimals.'
      }
    }

    if (!timezone || !ALL_TIMEZONES.includes(timezone)) {
      setError('Select a valid timezone.')
      return
    }
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      setError('Fix the highlighted fields before saving.')
      setSlug(normalizedSlug)
      return
    }

    setFieldErrors({})
    setError(null)
    setSlug(normalizedSlug)
    setSaving(true)
    try {
      await onSave({
        name: trimmedName,
        slug: normalizedSlug,
        description: trimmedDescription,
        durationMins,
        color,
        bufferDays,
        bufferAfterMins,
        location: trimmedLocation,
        isActive,
        timezone,
        depositEnabled,
        depositAmountUsdt: depositEnabled ? depositAmountUsdt.trim() : '',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save appointment type.')
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
    <CenteredDialogShell className="max-w-lg" onClose={onClose}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="appointment-type-modal-title"
        className="flex max-h-[90vh] w-full flex-col rounded-[28px]"
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 p-5">
          <h3 id="appointment-type-modal-title" className="text-lg font-semibold text-slate-900">
            {initial?.id ? 'Edit Appointment Type' : 'New Appointment Type'}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {error && <StatusNotice message={error} />}
            <div>
              <label className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-slate-500">
                Name
              </label>
              <input
                required
                minLength={2}
                maxLength={120}
                value={name}
                onChange={(e) => {
                  clearFieldError('name')
                  handleNameChange(e.target.value)
                }}
                aria-invalid={fieldErrors.name ? 'true' : 'false'}
                aria-describedby={fieldErrors.name ? 'apt-name-error' : undefined}
                className={inputClass('name')}
                placeholder="30-min Call"
              />
              {fieldErrors.name && (
                <p id="apt-name-error" className="mt-1 text-xs text-red-600">
                  {fieldErrors.name}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-slate-500">
                Slug (URL)
              </label>
              <input
                required
                pattern="[a-z0-9-]+"
                maxLength={100}
                value={slug}
                onChange={(e) => {
                  clearFieldError('slug')
                  setSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/\s+/g, '-')
                      .replace(/[^a-z0-9-]/g, ''),
                  )
                  setSlugTouched(true)
                }}
                aria-invalid={fieldErrors.slug ? 'true' : 'false'}
                aria-describedby={fieldErrors.slug ? 'apt-slug-error' : 'apt-slug-help'}
                className={`${inputClass('slug')} font-mono`}
                placeholder="30-min-call"
              />
              <p id="apt-slug-help" className="mt-1 text-xs text-slate-400">
                Lowercase letters, numbers, and hyphens only.
              </p>
              {fieldErrors.slug && (
                <p id="apt-slug-error" className="mt-1 text-xs text-red-600">
                  {fieldErrors.slug}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-slate-500">
                Description
              </label>
              <textarea
                value={description}
                maxLength={2000}
                onChange={(e) => {
                  clearFieldError('description')
                  setDescription(e.target.value)
                }}
                rows={2}
                aria-invalid={fieldErrors.description ? 'true' : 'false'}
                aria-describedby={
                  fieldErrors.description ? 'apt-description-error' : 'apt-description-help'
                }
                className={inputClass('description')}
              />
              <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-400">
                <span id="apt-description-help">Optional summary shown on your booking page.</span>
                <span>{description.length}/2000</span>
              </div>
              {fieldErrors.description && (
                <p id="apt-description-error" className="mt-1 text-xs text-red-600">
                  {fieldErrors.description}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-slate-500">
                  Duration (mins)
                </label>
                <input
                  required
                  type="number"
                  min={5}
                  max={480}
                  value={durationMins}
                  onChange={(e) => {
                    clearFieldError('durationMins')
                    setDurationMins(Number(e.target.value))
                  }}
                  aria-invalid={fieldErrors.durationMins ? 'true' : 'false'}
                  aria-describedby={fieldErrors.durationMins ? 'apt-duration-error' : undefined}
                  className={inputClass('durationMins')}
                />
                {fieldErrors.durationMins && (
                  <p id="apt-duration-error" className="mt-1 text-xs text-red-600">
                    {fieldErrors.durationMins}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-slate-500">
                  Color
                </label>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-full cursor-pointer rounded-lg border border-slate-200/60"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-slate-500">
                Location / Meeting link
              </label>
              <input
                value={location}
                maxLength={500}
                onChange={(e) => {
                  clearFieldError('location')
                  setLocation(e.target.value)
                }}
                aria-invalid={fieldErrors.location ? 'true' : 'false'}
                aria-describedby={fieldErrors.location ? 'apt-location-error' : undefined}
                className={inputClass('location')}
                placeholder="https://meet.google.com/xxx or Office address"
              />
              {fieldErrors.location && (
                <p id="apt-location-error" className="mt-1 text-xs text-red-600">
                  {fieldErrors.location}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-slate-500">
                Timezone
              </label>
              <SelectField
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="focus:border-sky-500 focus:ring-sky-100"
              >
                {ALL_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </SelectField>
              <p className="mt-1 text-xs text-slate-400">
                Availability windows are interpreted in this timezone.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-slate-500">
                  Booking window (days)
                </label>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={bufferDays}
                  onChange={(e) => {
                    clearFieldError('bufferDays')
                    setBufferDays(Number(e.target.value))
                  }}
                  aria-invalid={fieldErrors.bufferDays ? 'true' : 'false'}
                  aria-describedby={fieldErrors.bufferDays ? 'apt-buffer-days-error' : undefined}
                  className={inputClass('bufferDays')}
                />
                <p className="mt-1 text-xs text-slate-400">
                  How far ahead guests can book. 0 = unlimited.
                </p>
                {fieldErrors.bufferDays && (
                  <p id="apt-buffer-days-error" className="mt-1 text-xs text-red-600">
                    {fieldErrors.bufferDays}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-slate-500">
                  Buffer after (mins)
                </label>
                <input
                  type="number"
                  min={0}
                  max={240}
                  value={bufferAfterMins}
                  onChange={(e) => {
                    clearFieldError('bufferAfterMins')
                    setBufferAfterMins(Number(e.target.value))
                  }}
                  aria-invalid={fieldErrors.bufferAfterMins ? 'true' : 'false'}
                  aria-describedby={
                    fieldErrors.bufferAfterMins ? 'apt-buffer-after-error' : undefined
                  }
                  className={inputClass('bufferAfterMins')}
                />
                {fieldErrors.bufferAfterMins && (
                  <p id="apt-buffer-after-error" className="mt-1 text-xs text-red-600">
                    {fieldErrors.bufferAfterMins}
                  </p>
                )}
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span className="text-sm text-slate-700">Active (bookable by guests)</span>
            </label>
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={depositEnabled}
                  onChange={(e) => {
                    clearFieldError('depositAmountUsdt')
                    setDepositEnabled(e.target.checked)
                  }}
                  className="rounded border-slate-300"
                />
                <span className="text-sm font-medium text-slate-700">
                  Require crypto deposit before booking confirmation
                </span>
              </label>
              <p className="mt-2 text-xs text-slate-500">
                Guests will pay this deposit in USDT on Arbitrum before the booking is created.
              </p>
              {depositEnabled && (
                <div className="mt-3">
                  <label className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-slate-500">
                    Deposit (USDT)
                  </label>
                  <input
                    value={depositAmountUsdt}
                    inputMode="decimal"
                    onChange={(e) => {
                      clearFieldError('depositAmountUsdt')
                      setDepositAmountUsdt(e.target.value)
                    }}
                    aria-invalid={fieldErrors.depositAmountUsdt ? 'true' : 'false'}
                    aria-describedby={
                      fieldErrors.depositAmountUsdt ? 'apt-deposit-error' : 'apt-deposit-help'
                    }
                    className={inputClass('depositAmountUsdt')}
                    placeholder="10.00"
                  />
                  <p id="apt-deposit-help" className="mt-1 text-xs text-slate-400">
                    Crypto deposits are currently USDT only.
                  </p>
                  {fieldErrors.depositAmountUsdt && (
                    <p id="apt-deposit-error" className="mt-1 text-xs text-red-600">
                      {fieldErrors.depositAmountUsdt}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-shrink-0 justify-end gap-3 border-t border-slate-100 p-5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-200/60 px-4 py-2 text-sm hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </CenteredDialogShell>
  )
}

export function QuestionsBuilder({
  appointmentTypeId,
  initial,
  onSave,
  onClose,
}: QuestionsBuilderProps): JSX.Element {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)
  const [questions, setQuestions] = useState<Omit<BookingQuestion, 'id'>[]>(() =>
    initial.map((question) => ({
      label: question.label,
      type: question.type,
      options: question.options,
      required: question.required,
      position: question.position,
    })),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      { label: '', type: 'TEXT', options: [], required: false, position: prev.length },
    ])
  }
  function removeQuestion(index: number) {
    setQuestions((prev) =>
      prev.filter((_, i) => i !== index).map((question, i) => ({ ...question, position: i })),
    )
  }
  function updateQuestion(index: number, patch: Partial<Omit<BookingQuestion, 'id'>>) {
    setQuestions((prev) =>
      prev.map((question, i) => (i === index ? { ...question, ...patch } : question)),
    )
  }
  function updateSelectOption(questionIndex: number, optionIndex: number, value: string) {
    setQuestions((prev) =>
      prev.map((question, i) => {
        if (i !== questionIndex) return question
        const options = [...question.options]
        options[optionIndex] = value
        return { ...question, options }
      }),
    )
  }
  function addSelectOption(questionIndex: number) {
    setQuestions((prev) =>
      prev.map((question, i) =>
        i === questionIndex ? { ...question, options: [...question.options, ''] } : question,
      ),
    )
  }
  function removeSelectOption(questionIndex: number, optionIndex: number) {
    setQuestions((prev) =>
      prev.map((question, i) =>
        i === questionIndex
          ? { ...question, options: question.options.filter((_, oi) => oi !== optionIndex) }
          : question,
      ),
    )
  }

  async function handleSave() {
    for (const [index, question] of questions.entries()) {
      if (!question.label.trim()) {
        setError(`Question ${index + 1} needs a label`)
        return
      }
      if (question.type === 'SELECT' && question.options.length === 0) {
        setError(`Question ${index + 1} (dropdown) needs at least one option`)
        return
      }
    }
    setSaving(true)
    setError(null)
    try {
      const token = await getAccessToken()
      await apiPut(
        `/scheduling/appointment-types/${appointmentTypeId}/questions`,
        { questions: questions.map((question, index) => ({ ...question, position: index })) },
        token ?? undefined,
      )
      onSave()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save')
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
    <CenteredDialogShell className="max-w-xl" onClose={onClose}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-questions-modal-title"
        className="flex max-h-[90vh] w-full flex-col rounded-[28px]"
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 p-5">
          <h3 id="booking-questions-modal-title" className="text-lg font-semibold text-slate-900">
            Custom Booking Questions
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {questions.length === 0 && (
            <p className="py-4 text-center text-sm text-slate-400">
              No questions yet. Add one below to collect info from guests before they book.
            </p>
          )}
          {questions.map((question, index) => (
            <div key={index} className="space-y-3 rounded-xl border border-slate-200/60 p-4">
              <div className="flex items-center gap-2">
                <span className="w-5 text-xs font-semibold text-slate-400">{index + 1}</span>
                <input
                  value={question.label}
                  onChange={(e) => updateQuestion(index, { label: e.target.value })}
                  placeholder="Question label (e.g. What is your company?)"
                  className="flex-1 rounded-lg border border-slate-200/60 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                />
                <button
                  onClick={() => removeQuestion(index)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-3 pl-7">
                <SelectField
                  value={question.type}
                  onChange={(e) =>
                    updateQuestion(index, {
                      type: e.target.value as BookingQuestionType,
                      options: [],
                    })
                  }
                  className="min-w-[190px] rounded-xl px-3 py-2.5 pr-10 focus:border-sky-500 focus:ring-sky-100"
                >
                  {(Object.keys(QUESTION_TYPE_LABELS) as BookingQuestionType[]).map((type) => (
                    <option key={type} value={type}>
                      {QUESTION_TYPE_LABELS[type]}
                    </option>
                  ))}
                </SelectField>
                <label className="flex cursor-pointer items-center gap-1.5 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={question.required}
                    onChange={(e) => updateQuestion(index, { required: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  Required
                </label>
              </div>
              {question.type === 'SELECT' && (
                <div className="space-y-2 pl-7">
                  <p className="text-xs font-medium text-slate-500">Options</p>
                  {question.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-center gap-2">
                      <input
                        value={option}
                        onChange={(e) => updateSelectOption(index, optionIndex, e.target.value)}
                        placeholder={`Option ${optionIndex + 1}`}
                        className="flex-1 rounded-lg border border-slate-200/60 px-3 py-1.5 text-sm focus:border-sky-500 focus:outline-none"
                      />
                      <button
                        onClick={() => removeSelectOption(index, optionIndex)}
                        className="rounded p-1 text-slate-400 hover:text-red-500"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addSelectOption(index)}
                    className="flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-700"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add option
                  </button>
                </div>
              )}
            </div>
          ))}
          <button
            onClick={addQuestion}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200/60 py-3 text-sm font-medium text-slate-500 hover:border-sky-300 hover:text-sky-600"
          >
            <Plus className="h-4 w-4" /> Add question
          </button>
          {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        </div>
        <div className="flex flex-shrink-0 justify-end gap-3 border-t border-slate-100 p-5">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200/60 px-4 py-2 text-sm hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Questions'}
          </button>
        </div>
      </div>
    </CenteredDialogShell>
  )
}

export function SchedulingConfirmDialog({
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string
  message: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
}): JSX.Element {
  return (
    <>
      <ModalBackdrop onClick={onCancel} tone="drawer" />
      <div className="app-modal fixed inset-x-4 top-1/2 z-50 max-w-sm -translate-y-1/2 p-6 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-600">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Keep
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  )
}
