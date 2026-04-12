import { formatDateTime } from '@/lib/tz'
import type { TaskItem } from './types'

export function formatDueDate(value: string | null, tz?: string | null): string {
  if (!value) return 'No due date'
  return formatDateTime(value, tz)
}

export function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  return iso.slice(0, 16)
}

export function isOverdue(task: TaskItem): boolean {
  return Boolean(task.dueAt && !task.completed && new Date(task.dueAt).getTime() < Date.now())
}

export function parseTaskDueAt(value: string): string | null | undefined {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed.toISOString()
}
