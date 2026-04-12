import type { DealStage } from './types'

export const STAGE_LABELS: Record<DealStage, string> = {
  PROSPECT: 'Prospect',
  PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation',
  CLOSED_WON: 'Closed Won',
  CLOSED_LOST: 'Closed Lost',
}

export const STAGE_HEADER_COLORS: Record<DealStage, string> = {
  PROSPECT: 'bg-blue-50 border-blue-200',
  PROPOSAL: 'bg-yellow-50 border-yellow-200',
  NEGOTIATION: 'bg-purple-50 border-purple-200',
  CLOSED_WON: 'bg-green-50 border-green-200',
  CLOSED_LOST: 'bg-gray-100 border-gray-200',
}

export const DEAL_INPUT_CLASS =
  'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-900 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.22)] outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100'

export const STAGE_BADGES: Record<DealStage, string> = {
  PROSPECT: 'bg-blue-100 text-blue-700',
  PROPOSAL: 'bg-yellow-100 text-yellow-700',
  NEGOTIATION: 'bg-purple-100 text-purple-700',
  CLOSED_WON: 'bg-green-100 text-green-700',
  CLOSED_LOST: 'bg-red-100 text-red-700',
}

export function formatCurrency(value: number, currency: string): string {
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

export function normalizePercent(value: number): number {
  return value <= 1 ? value * 100 : value
}

function isValidDateInput(value: string): boolean {
  if (!value) return false
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime())
}

export function validateDealForm(values: {
  title: string
  selectedContactId?: string
  value: string
  probability: string
  closeDate: string
  notes: string
}) {
  const trimmedTitle = values.title.trim()
  const trimmedNotes = values.notes.trim()
  const nextFieldErrors: Partial<
    Record<'title' | 'contact' | 'value' | 'probability' | 'closeDate' | 'notes', string>
  > = {}
  let parsedValue: number | undefined
  let parsedProbability: number | undefined
  let closeDateIso: string | null | undefined

  if (!trimmedTitle) nextFieldErrors.title = 'Deal title is required.'
  if (values.selectedContactId !== undefined && !values.selectedContactId)
    nextFieldErrors.contact = 'Please select a contact.'
  if (values.value.trim()) {
    parsedValue = Number(values.value)
    if (!Number.isFinite(parsedValue) || parsedValue < 0)
      nextFieldErrors.value = 'Value must be a non-negative number.'
  }
  if (values.probability.trim()) {
    parsedProbability = Number(values.probability)
    if (!Number.isInteger(parsedProbability) || parsedProbability < 0 || parsedProbability > 100)
      nextFieldErrors.probability = 'Probability must be a whole number between 0 and 100.'
  }
  if (values.closeDate) {
    if (!isValidDateInput(values.closeDate))
      nextFieldErrors.closeDate = 'Close date must be a valid date.'
    else closeDateIso = new Date(`${values.closeDate}T00:00:00.000Z`).toISOString()
  }
  if (trimmedNotes.length > 5000) nextFieldErrors.notes = 'Notes must be 5000 characters or less.'

  return {
    fieldErrors: nextFieldErrors,
    trimmedTitle,
    trimmedNotes,
    parsedValue,
    parsedProbability,
    closeDateIso,
  }
}
