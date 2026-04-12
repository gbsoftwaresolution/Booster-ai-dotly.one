import { getPublicApiUrl } from '@/lib/public-env'
import type { BookingQuestionType, DayOfWeek } from './types'

export const SCHEDULING_CONTROL_CLASS =
  'w-full rounded-[18px] border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-900 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.18)] outline-none transition placeholder:text-gray-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100'

export const ALL_DAYS: DayOfWeek[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

export const DAY_LABEL: Record<DayOfWeek, string> = {
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
  SAT: 'Saturday',
  SUN: 'Sunday',
}

export const API_URL = getPublicApiUrl()

export function copyToClipboard(text: string): Promise<boolean> {
  return navigator.clipboard.writeText(text).then(
    () => true,
    () => false,
  )
}

export const statusColors: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  CANCELLED: 'bg-red-100 text-red-800',
  NO_SHOW: 'bg-gray-100 text-gray-700',
}

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
] as const

function buildTimezoneList(): string[] {
  let all: string[]
  try {
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
  const pinnedSet = new Set<string>(pinned)
  const rest = all.filter((tz) => !pinnedSet.has(tz)).sort()
  return [...pinned, ...rest]
}

export const ALL_TIMEZONES = buildTimezoneList()

export const QUESTION_TYPE_LABELS: Record<BookingQuestionType, string> = {
  TEXT: 'Short text',
  TEXTAREA: 'Long text',
  EMAIL: 'Email',
  PHONE: 'Phone',
  SELECT: 'Dropdown (select)',
  CHECKBOX: 'Checkbox (yes/no)',
}
