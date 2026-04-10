'use client'

import type { JSX } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { StatusNotice } from '@/components/ui/StatusNotice'
import { getPublicApiUrl } from '@/lib/public-env'
import {
  Calendar,
  Clock,
  Copy,
  Edit2,
  MapPin,
  Plus,
  Trash2,
  X,
  CheckCircle,
  AlertCircle,
  Link2,
  Settings2,
} from 'lucide-react'
import { SelectField } from '@/components/ui/SelectField'
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '@/lib/api'
import { getAccessToken } from '@/lib/supabase/client'
import { useUserTimezone } from '@/hooks/useUserLocale'
import { formatDateTimeFull } from '@/lib/tz'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AvailabilityRule {
  id: string
  dayOfWeek: DayOfWeek
  startTime: string
  endTime: string
}

type BookingQuestionType = 'TEXT' | 'TEXTAREA' | 'EMAIL' | 'PHONE' | 'SELECT' | 'CHECKBOX'

interface BookingQuestion {
  id: string
  label: string
  type: BookingQuestionType
  options: string[]
  required: boolean
  position: number
}

interface AppointmentType {
  id: string
  slug: string
  name: string
  description: string | null
  durationMins: number
  color: string
  bufferDays: number
  bufferAfterMins: number
  location: string | null
  isActive: boolean
  timezone: string
  availabilityRules: AvailabilityRule[]
  questions: BookingQuestion[]
  _count: { bookings: number }
}

const SCHEDULING_CONTROL_CLASS =
  'w-full rounded-[18px] border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-900 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.18)] outline-none transition placeholder:text-gray-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100'

interface Booking {
  id: string
  startAt: string
  endAt: string
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW'
  guestName: string
  guestEmail: string
  guestNotes: string | null
  appointmentType: { name: string; color: string; durationMins: number }
}

type DayOfWeek = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN'

const ALL_DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
const DAY_LABEL: Record<DayOfWeek, string> = {
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
  SAT: 'Saturday',
  SUN: 'Sunday',
}

const API_URL = getPublicApiUrl()

// ── Helpers ───────────────────────────────────────────────────────────────────

function copyToClipboard(text: string): Promise<boolean> {
  // LOW-1: Return a promise so callers can distinguish success from failure
  // and only show "Link copied!" on actual success, not always.
  return navigator.clipboard.writeText(text).then(
    () => true,
    () => false,
  )
}

const statusColors: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  CANCELLED: 'bg-red-100 text-red-800',
  NO_SHOW: 'bg-gray-100 text-gray-700',
}

// ── Availability Editor ───────────────────────────────────────────────────────

interface AvailabilityEditorProps {
  initial: AvailabilityRule[]
  onSave: (rules: { dayOfWeek: DayOfWeek; startTime: string; endTime: string }[]) => void
  onClose: () => void
}

/**
 * Multi-window availability editor.
 * Each day can have 0..N windows (e.g. 09:00–12:00 and 14:00–17:00).
 * Internal shape: Record<DayOfWeek, Array<{startTime, endTime}>>
 */
function AvailabilityEditor({ initial, onSave, onClose }: AvailabilityEditorProps): JSX.Element {
  // Build day → windows map from initial rules
  const [dayWindows, setDayWindows] = useState<
    Record<DayOfWeek, { startTime: string; endTime: string }[]>
  >(() => {
    const map = Object.fromEntries(ALL_DAYS.map((d) => [d, []])) as unknown as Record<
      DayOfWeek,
      { startTime: string; endTime: string }[]
    >
    if (initial.length === 0) {
      // Default: Mon–Fri 09:00–17:00
      ALL_DAYS.slice(0, 5).forEach((d) => {
        map[d] = [{ startTime: '09:00', endTime: '17:00' }]
      })
    } else {
      for (const r of initial) {
        map[r.dayOfWeek].push({ startTime: r.startTime, endTime: r.endTime })
      }
    }
    return map
  })

  function addWindow(day: DayOfWeek) {
    setDayWindows((prev) => ({
      ...prev,
      [day]: [...prev[day], { startTime: '09:00', endTime: '17:00' }],
    }))
  }

  function removeWindow(day: DayOfWeek, idx: number) {
    setDayWindows((prev) => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== idx),
    }))
  }

  function updateWindow(day: DayOfWeek, idx: number, field: 'startTime' | 'endTime', val: string) {
    setDayWindows((prev) => ({
      ...prev,
      [day]: prev[day].map((w, i) => (i === idx ? { ...w, [field]: val } : w)),
    }))
  }

  function handleSave() {
    // Validate: startTime < endTime for every window before submitting
    for (const day of ALL_DAYS) {
      for (const w of dayWindows[day]) {
        if (w.startTime >= w.endTime) {
          alert(
            `${DAY_LABEL[day]}: start time must be before end time (${w.startTime} – ${w.endTime})`,
          )
          return
        }
      }
    }
    // Flatten to flat rule array
    const rules: { dayOfWeek: DayOfWeek; startTime: string; endTime: string }[] = []
    for (const day of ALL_DAYS) {
      for (const w of dayWindows[day]) {
        rules.push({ dayOfWeek: day, startTime: w.startTime, endTime: w.endTime })
      }
    }
    onSave(rules)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="app-panel flex max-h-[90vh] w-full max-w-lg flex-col rounded-[28px] shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-5 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">Edit Availability</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-4 p-5">
          {ALL_DAYS.map((day) => {
            const windows = dayWindows[day]
            const isActive = windows.length > 0
            return (
              <div key={day} className="rounded-xl border border-gray-100 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-sm font-semibold ${isActive ? 'text-gray-900' : 'text-gray-400'}`}
                  >
                    {DAY_LABEL[day]}
                  </span>
                  <button
                    type="button"
                    onClick={() => addWindow(day)}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-sky-600 hover:bg-sky-50"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add window
                  </button>
                </div>
                {windows.length === 0 ? (
                  <span className="text-xs text-gray-400">Unavailable</span>
                ) : (
                  <div className="space-y-2">
                    {windows.map((w, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="time"
                          value={w.startTime}
                          onChange={(e) => updateWindow(day, idx, 'startTime', e.target.value)}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
                        />
                        <span className="text-gray-400">—</span>
                        <input
                          type="time"
                          value={w.endTime}
                          onChange={(e) => updateWindow(day, idx, 'endTime', e.target.value)}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeWindow(day, idx)}
                          className="ml-auto rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
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
        <div className="flex justify-end gap-3 border-t border-gray-100 p-5 flex-shrink-0">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
          >
            Save Availability
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Appointment Type Form Modal ───────────────────────────────────────────────

// LOW-2: Build timezone list from the full Intl IANA database (600+ zones) so
// that any timezone a user has previously saved is always present in the
// dropdown and never silently reverts on edit.
// Pin the most common zones to the top for easy access; append the rest sorted.
const PINNED_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'America/Toronto',
  'America/Vancouver',
  'America/Sao_Paulo',
  'America/Mexico_City',
  'America/Buenos_Aires',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'Europe/Rome',
  'Europe/Amsterdam',
  'Europe/Stockholm',
  'Europe/Moscow',
  'Europe/Istanbul',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Dhaka',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
  'Africa/Cairo',
  'Africa/Johannesburg',
  'Africa/Lagos',
]

function buildTimezoneList(): string[] {
  let all: string[]
  try {
    // Intl.supportedValuesOf is available in Node 18+ / modern browsers
    all =
      (Intl as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone') ??
      []
  } catch {
    all = []
  }
  const pinned = PINNED_TIMEZONES.filter((tz) => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz })
      return true
    } catch {
      return false
    }
  })
  const pinnedSet = new Set(pinned)
  const rest = all.filter((tz) => !pinnedSet.has(tz)).sort()
  return [...pinned, ...rest]
}

const ALL_TIMEZONES = buildTimezoneList()

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
  }) => Promise<void>
  onClose: () => void
}

function AptTypeForm({ initial, onSave, onClose }: AptTypeFormProps): JSX.Element {
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
  const [slugTouched, setSlugTouched] = useState(!!initial?.slug)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<
    Partial<
      Record<
        | 'name'
        | 'slug'
        | 'description'
        | 'durationMins'
        | 'bufferDays'
        | 'bufferAfterMins'
        | 'location',
        string
      >
    >
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

  function handleNameChange(val: string) {
    setName(val)
    if (!slugTouched) {
      setSlug(
        val
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
    const nextFieldErrors: Partial<
      Record<
        | 'name'
        | 'slug'
        | 'description'
        | 'durationMins'
        | 'bufferDays'
        | 'bufferAfterMins'
        | 'location',
        string
      >
    > = {}

    if (!trimmedName) {
      nextFieldErrors.name = 'Name is required.'
    } else if (trimmedName.length < 2) {
      nextFieldErrors.name = 'Name must be at least 2 characters.'
    } else if (trimmedName.length > 80) {
      nextFieldErrors.name = 'Name must be 80 characters or less.'
    }

    if (!normalizedSlug) {
      nextFieldErrors.slug = 'Slug is required.'
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) {
      nextFieldErrors.slug = 'Use lowercase letters, numbers, and hyphens only.'
    } else if (normalizedSlug.length > 80) {
      nextFieldErrors.slug = 'Slug must be 80 characters or less.'
    }

    if (trimmedDescription.length > 300) {
      nextFieldErrors.description = 'Description must be 300 characters or less.'
    }

    if (!Number.isFinite(durationMins) || durationMins < 5 || durationMins > 480) {
      nextFieldErrors.durationMins = 'Duration must be between 5 and 480 minutes.'
    }

    if (!Number.isFinite(bufferDays) || bufferDays < 0 || bufferDays > 365) {
      nextFieldErrors.bufferDays = 'Booking window must be between 0 and 365 days.'
    }

    if (!Number.isFinite(bufferAfterMins) || bufferAfterMins < 0 || bufferAfterMins > 240) {
      nextFieldErrors.bufferAfterMins = 'Buffer after must be between 0 and 240 minutes.'
    }

    if (trimmedLocation.length > 200) {
      nextFieldErrors.location = 'Location must be 200 characters or less.'
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
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save appointment type.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="app-panel flex max-h-[90vh] w-full max-w-lg flex-col rounded-[28px] shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-5 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">
            {initial?.id ? 'Edit Appointment Type' : 'New Appointment Type'}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 space-y-4 p-5">
            {error && <StatusNotice message={error} />}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
              <input
                required
                minLength={2}
                maxLength={80}
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
              <label className="mb-1 block text-sm font-medium text-gray-700">Slug (URL)</label>
              <input
                required
                pattern="[a-z0-9-]+"
                maxLength={80}
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
              <p id="apt-slug-help" className="mt-1 text-xs text-gray-400">
                Lowercase letters, numbers, and hyphens only.
              </p>
              {fieldErrors.slug && (
                <p id="apt-slug-error" className="mt-1 text-xs text-red-600">
                  {fieldErrors.slug}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={description}
                maxLength={300}
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
              <div className="mt-1 flex items-center justify-between gap-2 text-xs text-gray-400">
                <span id="apt-description-help">Optional summary shown on your booking page.</span>
                <span>{description.length}/300</span>
              </div>
              {fieldErrors.description && (
                <p id="apt-description-error" className="mt-1 text-xs text-red-600">
                  {fieldErrors.description}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
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
                <label className="mb-1 block text-sm font-medium text-gray-700">Color</label>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-full cursor-pointer rounded-lg border border-gray-200"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Location / Meeting link
              </label>
              <input
                value={location}
                maxLength={200}
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
              <label className="mb-1 block text-sm font-medium text-gray-700">Timezone</label>
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
              <p className="mt-1 text-xs text-gray-400">
                Availability windows are interpreted in this timezone.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
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
                <p className="mt-1 text-xs text-gray-400">
                  How far ahead guests can book. 0 = unlimited.
                </p>
                {fieldErrors.bufferDays && (
                  <p id="apt-buffer-days-error" className="mt-1 text-xs text-red-600">
                    {fieldErrors.bufferDays}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
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
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Active (bookable by guests)</span>
            </label>
          </div>
          <div className="flex flex-shrink-0 justify-end gap-3 border-t border-gray-100 p-5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
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
    </div>
  )
}

// ── Questions Builder Modal ───────────────────────────────────────────────────

const QUESTION_TYPE_LABELS: Record<BookingQuestionType, string> = {
  TEXT: 'Short text',
  TEXTAREA: 'Long text',
  EMAIL: 'Email',
  PHONE: 'Phone',
  SELECT: 'Dropdown (select)',
  CHECKBOX: 'Checkbox (yes/no)',
}

interface QuestionsBuilderProps {
  appointmentTypeId: string
  initial: BookingQuestion[]
  onSave: () => void
  onClose: () => void
}

function QuestionsBuilder({
  appointmentTypeId,
  initial,
  onSave,
  onClose,
}: QuestionsBuilderProps): JSX.Element {
  const [questions, setQuestions] = useState<Omit<BookingQuestion, 'id'>[]>(() =>
    initial.map((q) => ({
      label: q.label,
      type: q.type,
      options: q.options,
      required: q.required,
      position: q.position,
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

  function removeQuestion(idx: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== idx).map((q, i) => ({ ...q, position: i })))
  }

  function updateQuestion(idx: number, patch: Partial<Omit<BookingQuestion, 'id'>>) {
    setQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)))
  }

  function updateSelectOption(qIdx: number, optIdx: number, val: string) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q
        const opts = [...q.options]
        opts[optIdx] = val
        return { ...q, options: opts }
      }),
    )
  }

  function addSelectOption(qIdx: number) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === qIdx ? { ...q, options: [...q.options, ''] } : q)),
    )
  }

  function removeSelectOption(qIdx: number, optIdx: number) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx ? { ...q, options: q.options.filter((_, oi) => oi !== optIdx) } : q,
      ),
    )
  }

  async function handleSave() {
    // Validate
    for (const [i, q] of questions.entries()) {
      if (!q.label.trim()) {
        setError(`Question ${i + 1} needs a label`)
        return
      }
      if (q.type === 'SELECT' && q.options.length === 0) {
        setError(`Question ${i + 1} (dropdown) needs at least one option`)
        return
      }
    }
    setSaving(true)
    setError(null)
    try {
      const { getAccessToken } = await import('@/lib/supabase/client')
      const token = await getAccessToken()
      await apiPut(
        `/scheduling/appointment-types/${appointmentTypeId}/questions`,
        { questions: questions.map((q, i) => ({ ...q, position: i })) },
        token ?? undefined,
      )
      onSave()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="app-panel flex max-h-[90vh] w-full max-w-xl flex-col rounded-[28px] shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-5 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">Custom Booking Questions</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {questions.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              No questions yet. Add one below to collect info from guests before they book.
            </p>
          )}
          {questions.map((q, idx) => (
            <div key={idx} className="rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-400 w-5">{idx + 1}</span>
                <input
                  value={q.label}
                  onChange={(e) => updateQuestion(idx, { label: e.target.value })}
                  placeholder="Question label (e.g. What is your company?)"
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                />
                <button
                  onClick={() => removeQuestion(idx)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-3 pl-7">
                <SelectField
                  value={q.type}
                  onChange={(e) =>
                    updateQuestion(idx, {
                      type: e.target.value as BookingQuestionType,
                      options: [],
                    })
                  }
                  className="min-w-[190px] rounded-xl px-3 py-2.5 pr-10 focus:border-sky-500 focus:ring-sky-100"
                >
                  {(Object.keys(QUESTION_TYPE_LABELS) as BookingQuestionType[]).map((t) => (
                    <option key={t} value={t}>
                      {QUESTION_TYPE_LABELS[t]}
                    </option>
                  ))}
                </SelectField>
                <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={q.required}
                    onChange={(e) => updateQuestion(idx, { required: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  Required
                </label>
              </div>
              {q.type === 'SELECT' && (
                <div className="pl-7 space-y-2">
                  <p className="text-xs font-medium text-gray-500">Options</p>
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input
                        value={opt}
                        onChange={(e) => updateSelectOption(idx, oi, e.target.value)}
                        placeholder={`Option ${oi + 1}`}
                        className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-sky-500 focus:outline-none"
                      />
                      <button
                        onClick={() => removeSelectOption(idx, oi)}
                        className="rounded p-1 text-gray-400 hover:text-red-500"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addSelectOption(idx)}
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
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm font-medium text-gray-500 hover:border-sky-300 hover:text-sky-600"
          >
            <Plus className="h-4 w-4" /> Add question
          </button>
          {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        </div>
        <div className="flex justify-end gap-3 border-t border-gray-100 p-5 flex-shrink-0">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
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
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SchedulingPage(): JSX.Element {
  const userTz = useUserTimezone()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [aptTypes, setAptTypes] = useState<AppointmentType[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  // Modal state
  const [showAptForm, setShowAptForm] = useState(false)
  const [editingApt, setEditingApt] = useState<AppointmentType | null>(null)
  const [availEditorFor, setAvailEditorFor] = useState<AppointmentType | null>(null)
  const [questionsEditorFor, setQuestionsEditorFor] = useState<AppointmentType | null>(null)

  // Google Calendar
  const [googleStatus, setGoogleStatus] = useState<{
    connected: boolean
    googleEmail?: string
  } | null>(null)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Tab: 'types' | 'bookings'
  const [tab, setTab] = useState<'types' | 'bookings'>('types')
  const [showAllBookings, setShowAllBookings] = useState(false)

  // Cards for booking link — allow user to select which card to use
  const [allCards, setAllCards] = useState<{ id: string; handle: string }[]>([])
  const [cardHandle, setCardHandle] = useState<string | null>(null)

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      const [types, bkgs, cardsResp, gStatus] = await Promise.all([
        apiGet<AppointmentType[]>('/scheduling/appointment-types', token ?? undefined),
        apiGet<Booking[]>(
          `/scheduling/bookings${showAllBookings ? '' : '?upcoming=true'}`,
          token ?? undefined,
        ),
        apiGet<{ id: string; handle: string }[]>('/cards', token ?? undefined),
        apiGet<{ connected: boolean; googleEmail?: string }>(
          '/scheduling/google/status',
          token ?? undefined,
        ).catch(() => ({ connected: false })),
      ])
      setAptTypes(types)
      setBookings(bkgs)
      setAllCards(cardsResp)
      setGoogleStatus(gStatus)
      if (cardsResp.length > 0 && cardsResp[0])
        setCardHandle((prev) => prev ?? cardsResp[0]?.handle ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [showAllBookings])

  useEffect(() => {
    const requestedTab = searchParams.get('tab')
    if (requestedTab === 'types' || requestedTab === 'bookings') {
      setTab(requestedTab)
    }
  }, [searchParams])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    const nextUrl = `${window.location.pathname}?${params.toString()}`
    const currentUrl = `${window.location.pathname}${window.location.search}`
    if (nextUrl !== currentUrl) {
      router.replace(nextUrl, { scroll: false })
    }
  }, [router, searchParams, tab])

  useEffect(() => {
    void load()
  }, [load])

  // Handle ?google=connected / ?google=error redirect from OAuth callback
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const g = params.get('google')
    if (g === 'connected') {
      showToast('Google Calendar connected!')
      window.history.replaceState({}, '', window.location.pathname)
      void load()
    } else if (g === 'error') {
      showToast('Failed to connect Google Calendar', false)
      window.history.replaceState({}, '', window.location.pathname)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCreateOrUpdate(data: {
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
  }) {
    try {
      const token = await getAccessToken()
      if (editingApt) {
        await apiPatch(`/scheduling/appointment-types/${editingApt.id}`, data, token ?? undefined)
        showToast('Appointment type updated')
      } else {
        await apiPost('/scheduling/appointment-types', data, token ?? undefined)
        showToast('Appointment type created')
      }
      setShowAptForm(false)
      setEditingApt(null)
      await load()
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Error'
      showToast(message, false)
      throw e instanceof Error ? e : new Error(message)
    }
  }

  async function handleDelete(id: string) {
    if (
      !confirm(
        'Deactivate this appointment type? It will be hidden and no longer bookable. Existing bookings are preserved.',
      )
    )
      return
    try {
      const token = await getAccessToken()
      await apiDelete(`/scheduling/appointment-types/${id}`, token ?? undefined)
      showToast('Deleted')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', false)
    }
  }

  async function handleSaveAvailability(
    apt: AppointmentType,
    rules: { dayOfWeek: DayOfWeek; startTime: string; endTime: string }[],
  ) {
    try {
      const token = await getAccessToken()
      await apiPut(
        `/scheduling/appointment-types/${apt.id}/availability`,
        { rules },
        token ?? undefined,
      )
      showToast('Availability saved')
      setAvailEditorFor(null)
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', false)
    }
  }

  async function handleCancelBooking(bookingId: string) {
    if (!confirm('Cancel this booking?')) return
    try {
      const token = await getAccessToken()
      await apiPatch(`/scheduling/bookings/${bookingId}/cancel`, {}, token ?? undefined)
      showToast('Booking cancelled')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', false)
    }
  }

  async function handleGoogleDisconnect() {
    if (!confirm('Disconnect Google Calendar?')) return
    setGoogleLoading(true)
    try {
      const token = await getAccessToken()
      await apiDelete('/scheduling/google/disconnect', token ?? undefined)
      setGoogleStatus({ connected: false })
      showToast('Google Calendar disconnected')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', false)
    } finally {
      setGoogleLoading(false)
    }
  }

  const webUrl = process.env.NEXT_PUBLIC_WEB_URL || ''

  return (
    <div className="min-h-screen p-4 sm:p-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg transition-all ${toast.ok ? 'bg-green-600' : 'bg-red-600'}`}
        >
          {toast.ok ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Availability Editor Modal */}
      {availEditorFor && (
        <AvailabilityEditor
          initial={availEditorFor.availabilityRules}
          onSave={(rules) => void handleSaveAvailability(availEditorFor, rules)}
          onClose={() => setAvailEditorFor(null)}
        />
      )}

      {/* Questions Builder Modal */}
      {questionsEditorFor && (
        <QuestionsBuilder
          appointmentTypeId={questionsEditorFor.id}
          initial={questionsEditorFor.questions}
          onSave={() => {
            setQuestionsEditorFor(null)
            showToast('Questions saved')
            void load()
          }}
          onClose={() => setQuestionsEditorFor(null)}
        />
      )}

      {/* Create/Edit Appointment Type Modal */}
      {showAptForm && (
        <AptTypeForm
          initial={editingApt ?? undefined}
          onSave={handleCreateOrUpdate}
          onClose={() => {
            setShowAptForm(false)
            setEditingApt(null)
          }}
        />
      )}

      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="app-panel flex flex-col gap-5 rounded-[30px] px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Scheduling</h1>
              <p className="text-sm text-gray-500">Manage your booking pages and appointments</p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingApt(null)
              setShowAptForm(true)
            }}
            className="flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-sky-700"
          >
            <Plus className="h-4 w-4" /> New Appointment Type
          </button>
        </div>

        {/* Google Calendar connect section */}
        {googleStatus !== null && (
          <div className="app-panel flex items-center gap-3 rounded-[24px] px-4 py-3">
            <Link2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-700">Google Calendar</span>
              {googleStatus.connected && googleStatus.googleEmail && (
                <span className="ml-2 text-xs text-gray-400">{googleStatus.googleEmail}</span>
              )}
            </div>
            {googleStatus.connected ? (
              <button
                onClick={() => void handleGoogleDisconnect()}
                disabled={googleLoading}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                {googleLoading ? 'Disconnecting…' : 'Disconnect'}
              </button>
            ) : (
              <a
                href={`${API_URL}/scheduling/google/connect`}
                className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700"
              >
                <Settings2 className="inline h-3.5 w-3.5 mr-1" />
                Connect Google Calendar
              </a>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="app-panel-subtle flex w-fit gap-1 rounded-[20px] p-1.5">
          {(['types', 'bookings'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-2xl px-4 py-2.5 text-sm font-medium transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm ring-1 ring-white/80' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t === 'types'
                ? 'Appointment Types'
                : `Upcoming Bookings${bookings.length > 0 ? ` (${bookings.length})` : ''}`}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600" />
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ── Card selector for booking links ───────────────────────────────── */}
        {allCards.length > 1 && (
          <div className="app-panel flex flex-col gap-3 rounded-[24px] px-4 py-3 sm:flex-row sm:items-center">
            <span className="text-sm font-medium text-gray-600">Booking links use card:</span>
            <SelectField
              value={cardHandle ?? ''}
              onChange={(e) => setCardHandle(e.target.value)}
              className="rounded-xl px-3 py-2.5 pr-10 focus:border-sky-500 focus:ring-sky-100"
            >
              {allCards.map((c) => (
                <option key={c.id} value={c.handle}>
                  /{c.handle}
                </option>
              ))}
            </SelectField>
          </div>
        )}

        {/* ── Appointment Types Tab ─────────────────────────────────────────── */}
        {!loading && !error && tab === 'types' && (
          <div className="space-y-4">
            {aptTypes.length === 0 ? (
              <div className="app-empty-state">
                <Calendar className="mb-4 h-12 w-12 text-slate-300" />
                <p className="text-gray-600">No appointment types yet.</p>
                <p className="mt-2 max-w-md text-sm text-gray-400">
                  Create your first appointment type to start sharing booking links and collecting
                  meetings.
                </p>
                <button
                  onClick={() => {
                    setEditingApt(null)
                    setShowAptForm(true)
                  }}
                  className="mt-4 flex items-center gap-2 rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-700"
                >
                  <Plus className="h-4 w-4" /> Create your first
                </button>
              </div>
            ) : (
              aptTypes.map((apt) => {
                const bookingUrl = cardHandle ? `${webUrl}/book/${cardHandle}/${apt.slug}` : null
                return (
                  <div key={apt.id} className="app-panel rounded-[28px] p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div
                          className="mt-0.5 h-10 w-10 flex-shrink-0 rounded-xl"
                          style={{ background: apt.color }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{apt.name}</h3>
                            {!apt.isActive && (
                              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                                Inactive
                              </span>
                            )}
                          </div>
                          {apt.description && (
                            <p className="mt-0.5 text-sm text-gray-500">{apt.description}</p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {apt.durationMins} min
                            </span>
                            {apt.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {apt.location}
                              </span>
                            )}
                            <span className="text-gray-400">{apt._count.bookings} bookings</span>
                            <span className="text-gray-400">{apt.timezone}</span>
                          </div>
                          {/* Availability summary */}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {ALL_DAYS.map((d) => {
                              const windows = apt.availabilityRules.filter((r) => r.dayOfWeek === d)
                              return (
                                <span
                                  key={d}
                                  className={`rounded-md px-2 py-0.5 text-xs font-medium ${windows.length > 0 ? 'bg-sky-50 text-sky-700' : 'bg-gray-50 text-gray-300'}`}
                                >
                                  {d}
                                  {windows.length > 0
                                    ? ' ' +
                                      windows.map((w) => `${w.startTime}–${w.endTime}`).join(', ')
                                    : ''}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {bookingUrl && (
                          <button
                            title="Copy booking link"
                            onClick={() => {
                              void copyToClipboard(bookingUrl).then((ok) => {
                                if (ok) showToast('Link copied!')
                                else showToast('Failed to copy link', false)
                              })
                            }}
                            className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-sky-600"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          title="Edit questions"
                          onClick={() => setQuestionsEditorFor(apt)}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-purple-600 hover:bg-purple-50"
                        >
                          Questions{apt.questions.length > 0 ? ` (${apt.questions.length})` : ''}
                        </button>
                        <button
                          title="Edit availability"
                          onClick={() => setAvailEditorFor(apt)}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-sky-600 hover:bg-sky-50"
                        >
                          Availability
                        </button>
                        <button
                          title="Edit"
                          onClick={() => {
                            setEditingApt(apt)
                            setShowAptForm(true)
                          }}
                          className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-sky-600"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          title="Delete"
                          onClick={() => void handleDelete(apt.id)}
                          className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {bookingUrl && (
                      <div className="app-panel-subtle mt-3 flex items-center gap-2 rounded-[20px] px-3 py-2">
                        <span className="truncate font-mono text-xs text-gray-500">
                          {bookingUrl}
                        </span>
                        <button
                          onClick={() => {
                            void copyToClipboard(bookingUrl).then((ok) => {
                              if (ok) showToast('Link copied!')
                              else showToast('Failed to copy link', false)
                            })
                          }}
                          className="flex-shrink-0 text-sky-600 hover:text-sky-700"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ── Bookings Tab ──────────────────────────────────────────────────── */}
        {!loading && !error && tab === 'bookings' && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {showAllBookings ? 'All bookings' : 'Upcoming bookings'}
              </p>
              <button
                onClick={() => setShowAllBookings((v) => !v)}
                className="text-xs font-medium text-sky-600 hover:text-sky-700"
              >
                {showAllBookings ? 'Show upcoming only' : 'Show all bookings'}
              </button>
            </div>
            <div className="app-table-shell overflow-hidden">
              {bookings.length === 0 ? (
                <div className="app-empty-state rounded-none border-0 shadow-none">
                  <Calendar className="mb-4 h-12 w-12 text-slate-300" />
                  <p className="text-gray-600">No upcoming bookings.</p>
                </div>
              ) : (
                <table className="app-table">
                  <thead className="border-b border-white/60">
                    <tr>
                      <th>Guest</th>
                      <th>Appointment</th>
                      <th>Time</th>
                      <th>Status</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/80">
                    {bookings.map((b) => (
                      <tr key={b.id} className="transition hover:bg-white/65">
                        <td>
                          <div className="font-medium text-gray-900">{b.guestName}</div>
                          <div className="text-gray-400">{b.guestEmail}</div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                              style={{ background: b.appointmentType.color }}
                            />
                            {b.appointmentType.name}
                          </div>
                        </td>
                        <td className="text-gray-600">{formatDateTimeFull(b.startAt, userTz)}</td>
                        <td>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[b.status] ?? ''}`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td>
                          {b.status !== 'CANCELLED' && (
                            <button
                              onClick={() => void handleCancelBooking(b.id)}
                              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50"
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
