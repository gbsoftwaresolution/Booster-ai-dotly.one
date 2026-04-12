export interface TaskItem {
  id: string
  title: string
  dueAt: string | null
  completed: boolean
  completedAt: string | null
  contact: {
    id: string
    name: string
  } | null
}

export interface TasksSummary {
  totalTasks: number
  pendingTasks: number
  completedTasks: number
  overdueTasks: number
  dueTodayTasks: number
  nextTask: {
    id: string
    title: string
    dueAt: string | null
  } | null
}

export type TaskFilter = 'ALL' | 'PENDING' | 'COMPLETED' | 'OVERDUE'

export const TASKS_PAGE_LIMIT = 20
