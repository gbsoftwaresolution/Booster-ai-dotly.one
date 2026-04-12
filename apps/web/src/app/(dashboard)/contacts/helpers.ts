import type { Stage } from './types'

export const STAGE_BADGE: Record<Stage, string> = {
  NEW: 'bg-gray-100 text-gray-600',
  CONTACTED: 'bg-blue-100 text-blue-700',
  QUALIFIED: 'bg-yellow-100 text-yellow-700',
  CLOSED: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-600',
}

export const STAGE_DOT: Record<Stage, string> = {
  NEW: 'bg-gray-400',
  CONTACTED: 'bg-blue-500',
  QUALIFIED: 'bg-yellow-500',
  CLOSED: 'bg-green-500',
  LOST: 'bg-red-500',
}

export const STAGE_FILTER_ACTIVE: Record<string, string> = {
  ALL: 'bg-blue-600 text-white',
  NEW: 'bg-gray-700 text-white',
  CONTACTED: 'bg-blue-600 text-white',
  QUALIFIED: 'bg-yellow-500 text-white',
  CLOSED: 'bg-green-600 text-white',
  LOST: 'bg-red-600 text-white',
}

export const FORM_CONTROL_CLASS =
  'w-full rounded-[18px] border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-700 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.22)] outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const PHONE_REGEX = /^[+]?[0-9()\-\s]{7,20}$/

export function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function getScoreBadgeClass(score?: number | null): string {
  if (score == null) return 'bg-gray-50 text-gray-400'
  if (score >= 75) return 'bg-green-100 text-green-700'
  if (score >= 50) return 'bg-yellow-100 text-yellow-700'
  return 'bg-gray-100 text-gray-600'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const AVATAR_COLOURS = [
  'bg-blue-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-cyan-500',
  'bg-pink-500',
  'bg-indigo-500',
]

export function avatarColour(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff
  return AVATAR_COLOURS[hash % AVATAR_COLOURS.length]!
}

export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter(
    (element) =>
      !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true',
  )
}
