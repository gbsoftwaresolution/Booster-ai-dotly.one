import { getAccessToken } from '@/lib/auth/client'

export const DEFAULT_STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED', 'LOST'] as const
export type DefaultStage = (typeof DEFAULT_STAGES)[number]

export const DEFAULT_STAGE_LABELS: Record<DefaultStage, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  CLOSED: 'Closed',
  LOST: 'Lost',
}

export const DEFAULT_STAGE_COLORS: Record<string, string> = {
  NEW: 'bg-gray-100 border-gray-200',
  CONTACTED: 'bg-blue-50 border-blue-200',
  QUALIFIED: 'bg-yellow-50 border-yellow-200',
  CLOSED: 'bg-green-50 border-green-200',
  LOST: 'bg-red-50 border-red-200',
}

const PALETTE = [
  'bg-blue-50 border-blue-200',
  'bg-purple-50 border-purple-200',
  'bg-yellow-50 border-yellow-200',
  'bg-green-50 border-green-200',
  'bg-red-50 border-red-200',
  'bg-indigo-50 border-indigo-200',
  'bg-orange-50 border-orange-200',
]

export function stageHeaderColor(stage: string, index: number): string {
  return (
    DEFAULT_STAGE_COLORS[stage] ?? PALETTE[index % PALETTE.length] ?? 'bg-gray-50 border-gray-200'
  )
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

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1 day'
  return `${days} days`
}

export function getStageLabel(stage: string): string {
  return DEFAULT_STAGE_LABELS[stage as DefaultStage] ?? stage
}
