import { CONTACT_STAGES, DEAL_STAGES } from '@dotly/types'
import { formatDate as tzFormatDate } from '@/lib/tz'
import { getAccessToken } from '@/lib/auth/client'
import type { ContactTask } from './types'

export const STAGES = CONTACT_STAGES
export type Stage = (typeof STAGES)[number]

export const STAGE_COLORS: Record<Stage, string> = {
  NEW: 'bg-gray-100 text-gray-700 border-gray-300',
  CONTACTED: 'bg-blue-100 text-blue-700 border-blue-300',
  QUALIFIED: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  CLOSED: 'bg-green-100 text-green-700 border-green-300',
  LOST: 'bg-red-100 text-red-700 border-red-300',
}

export const STAGE_ACTIVE: Record<Stage, string> = {
  NEW: 'bg-gray-700 text-white',
  CONTACTED: 'bg-blue-600 text-white',
  QUALIFIED: 'bg-yellow-500 text-white',
  CLOSED: 'bg-green-600 text-white',
  LOST: 'bg-red-600 text-white',
}

const DEAL_STAGE_COLORS: Record<(typeof DEAL_STAGES)[number], string> = {
  PROSPECT: 'bg-gray-100 text-gray-700',
  PROPOSAL: 'bg-blue-100 text-blue-700',
  NEGOTIATION: 'bg-yellow-100 text-yellow-700',
  CLOSED_WON: 'bg-green-100 text-green-700',
  CLOSED_LOST: 'bg-red-100 text-red-700',
}

export async function getToken(): Promise<string | undefined> {
  return getAccessToken()
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function getScoreClasses(score: number): string {
  if (score >= 75) return 'bg-green-100 text-green-700'
  if (score >= 50) return 'bg-yellow-100 text-yellow-700'
  return 'bg-gray-100 text-gray-600'
}

export function getDealStageClasses(stage: string): string {
  return DEAL_STAGE_COLORS[stage as (typeof DEAL_STAGES)[number]] ?? 'bg-gray-100 text-gray-700'
}

export function formatDate(dateStr: string | null | undefined, tz?: string | null): string {
  if (!dateStr) return ''
  return tzFormatDate(dateStr, tz ?? undefined)
}

export function formatDateInputValue(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  return new Date(dateStr).toISOString().slice(0, 10)
}

export function formatCurrency(value: string | null, currency: string): string {
  if (!value) return 'No value'
  const amount = Number(value)
  if (Number.isNaN(amount)) return value
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function sortTasks(tasks: ContactTask[]): ContactTask[] {
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return Number(a.completed) - Number(b.completed)
    const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER
    const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER
    return aDue - bDue
  })
}
