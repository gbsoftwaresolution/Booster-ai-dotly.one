import type { TaskItem } from './types'

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function formatCurrency(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

export function dueDateLabel(dueAt?: string): { label: string; overdue: boolean } | null {
  if (!dueAt) return null
  const diff = new Date(dueAt).getTime() - Date.now()
  const days = Math.ceil(diff / 86_400_000)
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, overdue: true }
  if (days === 0) return { label: 'Due today', overdue: false }
  if (days === 1) return { label: 'Due tomorrow', overdue: false }
  return { label: `Due in ${days}d`, overdue: false }
}

export const STAGE_COLORS: Record<string, string> = {
  PROSPECT: 'bg-blue-100 text-blue-700',
  PROPOSAL: 'bg-yellow-100 text-yellow-700',
  NEGOTIATION: 'bg-orange-100 text-orange-700',
  CLOSED_WON: 'bg-green-100 text-green-700',
  CLOSED_LOST: 'bg-red-100 text-red-700',
  NEW: 'bg-gray-100 text-gray-600',
  CONTACTED: 'bg-blue-100 text-blue-700',
  QUALIFIED: 'bg-purple-100 text-purple-700',
  CLOSED: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-700',
}

export function isTaskOverdue(task: TaskItem): boolean {
  return Boolean(task.dueAt && new Date(task.dueAt) < new Date())
}
