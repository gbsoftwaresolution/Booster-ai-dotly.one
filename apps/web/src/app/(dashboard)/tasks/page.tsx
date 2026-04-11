'use client'

import type { JSX } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  CheckSquare,
  Pencil,
  Plus,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Clock3,
} from 'lucide-react'
import { ContactDetailDrawer } from '@/components/crm/ContactDetailDrawer'
import { StatusNotice } from '@/components/ui/StatusNotice'
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api'
import { getAccessToken } from '@/lib/supabase/client'
import { useUserTimezone } from '@/hooks/useUserLocale'
import { formatDateTime } from '@/lib/tz'

interface TaskItem {
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

type TaskFilter = 'ALL' | 'PENDING' | 'COMPLETED' | 'OVERDUE'

function formatDueDate(value: string | null, tz?: string | null): string {
  if (!value) return 'No due date'
  return formatDateTime(value, tz)
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ''
  // Converts ISO 8601 to the format expected by <input type="datetime-local">
  return iso.slice(0, 16)
}

function isOverdue(task: TaskItem): boolean {
  return Boolean(task.dueAt && !task.completed && new Date(task.dueAt).getTime() < Date.now())
}

function parseTaskDueAt(value: string): string | null | undefined {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed.toISOString()
}

export default function TasksPage(): JSX.Element {
  const userTz = useUserTimezone()
  const createContactRequestIdRef = useRef(0)
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<TaskFilter>('ALL')
  const [busyTaskIds, setBusyTaskIds] = useState<Set<string>>(new Set())
  const [drawerContactId, setDrawerContactId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Edit modal state
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDueAt, setEditDueAt] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editFieldErrors, setEditFieldErrors] = useState<
    Partial<Record<'title' | 'dueAt', string>>
  >({})

  // Create task modal state
  const [showCreate, setShowCreate] = useState(false)
  const [createContacts, setCreateContacts] = useState<{ id: string; name: string }[]>([])
  const [createContactSearch, setCreateContactSearch] = useState('')
  const [createContactId, setCreateContactId] = useState('')
  const [createTitle, setCreateTitle] = useState('')
  const [createDueAt, setCreateDueAt] = useState('')
  const [createSaving, setCreateSaving] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createContactLoadError, setCreateContactLoadError] = useState<string | null>(null)
  const [createFieldErrors, setCreateFieldErrors] = useState<
    Partial<Record<'contact' | 'title' | 'dueAt', string>>
  >({})

  const loadTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      const data = await apiGet<TaskItem[]>('/tasks', token)
      setTasks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTasks()
  }, [loadTasks])

  const overdueCount = useMemo(() => tasks.filter(isOverdue).length, [tasks])
  const pendingCount = useMemo(() => tasks.filter((task) => !task.completed).length, [tasks])
  const completedCount = useMemo(() => tasks.filter((task) => task.completed).length, [tasks])
  const dueTodayCount = useMemo(
    () =>
      tasks.filter((task) => {
        if (!task.dueAt || task.completed) return false
        const due = new Date(task.dueAt)
        const now = new Date()
        return (
          due.getFullYear() === now.getFullYear() &&
          due.getMonth() === now.getMonth() &&
          due.getDate() === now.getDate()
        )
      }).length,
    [tasks],
  )

  const filteredTasks = useMemo(() => {
    if (activeFilter === 'PENDING') return tasks.filter((task) => !task.completed)
    if (activeFilter === 'COMPLETED') return tasks.filter((task) => task.completed)
    if (activeFilter === 'OVERDUE') return tasks.filter(isOverdue)
    return tasks
  }, [activeFilter, tasks])
  const nextTask = useMemo(
    () =>
      tasks
        .filter((task) => !task.completed && task.dueAt)
        .sort((a, b) => new Date(a.dueAt ?? 0).getTime() - new Date(b.dueAt ?? 0).getTime())[0],
    [tasks],
  )
  const focusMessage = nextTask?.dueAt
    ? `${nextTask.title} is your next scheduled task due ${formatDueDate(nextTask.dueAt, userTz)}.`
    : overdueCount > 0
      ? `${overdueCount} overdue task${overdueCount === 1 ? '' : 's'} need attention.`
      : pendingCount > 0
        ? `${pendingCount} pending task${pendingCount === 1 ? '' : 's'} are in motion.`
        : 'You are caught up. Create a task to keep follow-ups moving.'

  const mutateTaskBusyState = (taskId: string, busy: boolean) => {
    setBusyTaskIds((prev) => {
      const next = new Set(prev)
      if (busy) next.add(taskId)
      else next.delete(taskId)
      return next
    })
  }

  const handleToggleComplete = useCallback(async (task: TaskItem) => {
    const nextCompleted = !task.completed
    mutateTaskBusyState(task.id, true)
    setError(null)
    setTasks((prev) =>
      prev.map((item) => (item.id === task.id ? { ...item, completed: nextCompleted } : item)),
    )

    try {
      const token = await getAccessToken()
      const updated = await apiPatch<TaskItem>(
        `/tasks/${task.id}`,
        { completed: nextCompleted },
        token,
      )
      setTasks((prev) => prev.map((item) => (item.id === task.id ? updated : item)))
    } catch (err) {
      setTasks((prev) => prev.map((item) => (item.id === task.id ? task : item)))
      setError(err instanceof Error ? err.message : 'Failed to update task')
    } finally {
      mutateTaskBusyState(task.id, false)
    }
  }, [])

  const handleDelete = useCallback(async (taskId: string) => {
    setConfirmDeleteId(taskId)
  }, [])

  const confirmDelete = useCallback(async (taskId: string) => {
    setConfirmDeleteId(null)
    mutateTaskBusyState(taskId, true)
    setError(null)
    try {
      const token = await getAccessToken()
      await apiDelete(`/tasks/${taskId}`, token)
      setTasks((prev) => prev.filter((task) => task.id !== taskId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task')
    } finally {
      mutateTaskBusyState(taskId, false)
    }
  }, [])

  function openEdit(task: TaskItem) {
    setEditingTask(task)
    setEditTitle(task.title)
    setEditDueAt(toDatetimeLocal(task.dueAt))
    setEditError(null)
    setEditFieldErrors({})
  }

  function closeEdit() {
    setEditingTask(null)
    setEditTitle('')
    setEditDueAt('')
    setEditError(null)
    setEditFieldErrors({})
  }

  async function handleSaveEdit() {
    if (!editingTask) return
    const trimmedTitle = editTitle.trim()
    const dueAtIso = parseTaskDueAt(editDueAt)
    const nextFieldErrors: Partial<Record<'title' | 'dueAt', string>> = {}

    if (!trimmedTitle) {
      nextFieldErrors.title = 'Title is required.'
    }

    if (dueAtIso === undefined) {
      nextFieldErrors.dueAt = 'Due date must be a valid date and time.'
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setEditFieldErrors(nextFieldErrors)
      setEditError('Fix the highlighted fields before saving.')
      return
    }

    setEditSaving(true)
    setEditError(null)
    setEditFieldErrors({})
    try {
      const token = await getAccessToken()
      const updated = await apiPatch<TaskItem>(
        `/tasks/${editingTask.id}`,
        {
          title: trimmedTitle,
          dueAt: dueAtIso,
        },
        token,
      )
      setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? updated : t)))
      closeEdit()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to save task')
    } finally {
      setEditSaving(false)
    }
  }

  // Load contacts for task creation contact picker
  useEffect(() => {
    const requestId = ++createContactRequestIdRef.current
    void (async () => {
      try {
        setCreateContactLoadError(null)
        const token = await getAccessToken()
        const params = new URLSearchParams({ limit: '50' })
        if (createContactSearch.trim()) params.set('search', createContactSearch.trim())
        const data = await apiGet<{ contacts: { id: string; name: string }[] }>(
          `/contacts?${params.toString()}`,
          token,
        )
        if (createContactRequestIdRef.current !== requestId) return
        setCreateContacts(data.contacts)
      } catch {
        if (createContactRequestIdRef.current !== requestId) return
        setCreateContactLoadError('Could not load matching contacts. Try again.')
      }
    })()
  }, [createContactSearch, showCreate])

  function openCreate() {
    setCreateTitle('')
    setCreateDueAt('')
    setCreateContactId('')
    setCreateContactSearch('')
    setCreateError(null)
    setCreateFieldErrors({})
    setShowCreate(true)
  }

  function closeCreate() {
    setShowCreate(false)
    setCreateError(null)
    setCreateFieldErrors({})
  }

  async function handleCreateTask() {
    const trimmedTitle = createTitle.trim()
    const dueAtIso = parseTaskDueAt(createDueAt)
    const nextFieldErrors: Partial<Record<'contact' | 'title' | 'dueAt', string>> = {}

    if (!trimmedTitle) {
      nextFieldErrors.title = 'Title is required.'
    }
    if (!createContactId) {
      nextFieldErrors.contact = 'Please select a contact.'
    }
    if (dueAtIso === undefined) {
      nextFieldErrors.dueAt = 'Due date must be a valid date and time.'
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setCreateFieldErrors(nextFieldErrors)
      setCreateError('Fix the highlighted fields before creating the task.')
      return
    }

    setCreateSaving(true)
    setCreateError(null)
    setCreateFieldErrors({})
    try {
      const token = await getAccessToken()
      const body: Record<string, unknown> = { title: trimmedTitle }
      if (dueAtIso) body.dueAt = dueAtIso
      const created = await apiPost<TaskItem>(`/contacts/${createContactId}/tasks`, body, token)
      setTasks((prev) => [created, ...prev])
      closeCreate()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create task')
    } finally {
      setCreateSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="app-panel relative overflow-hidden rounded-[34px] px-6 py-6 sm:px-8 sm:py-7">
        <div
          className="absolute inset-0 opacity-90"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(circle at top left, rgba(99,102,241,0.14), transparent 34%), radial-gradient(circle at right center, rgba(14,165,233,0.10), transparent 28%), linear-gradient(135deg, rgba(255,255,255,0.94), rgba(248,250,252,0.98))',
          }}
        />
        <div className="relative grid gap-5 xl:grid-cols-[1.35fr_0.92fr] xl:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-600">
              <CheckSquare className="h-3.5 w-3.5" />
              Follow-ups
            </div>
            <h1 className="mt-3 text-2xl font-bold text-gray-900 sm:text-[2rem]">
              Keep follow-ups moving without losing priority
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-500 sm:text-[15px]">
              Track due dates, clear overdue work, and keep daily execution visible across your open
              relationship tasks.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-xl sm:grid-cols-4">
              {[
                { label: 'All Tasks', value: loading ? '—' : tasks.length },
                { label: 'Pending', value: loading ? '—' : pendingCount },
                { label: 'Overdue', value: loading ? '—' : overdueCount },
                { label: 'Due Today', value: loading ? '—' : dueTodayCount },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-[22px] border border-white/80 bg-white/85 px-3 py-3 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.2)]"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-bold text-gray-900 sm:text-base">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-[0_20px_40px_-28px_rgba(79,70,229,0.42)] transition-transform hover:-translate-y-0.5 hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                New Task
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('OVERDUE')}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                <AlertCircle className="h-4 w-4 text-red-500" />
                Review Overdue
              </button>
            </div>

            <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-medium text-gray-600 shadow-sm">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                <Clock3 className="h-3.5 w-3.5" />
              </span>
              <span className="truncate">Focus: {focusMessage}</span>
            </div>
          </div>

          <div className="app-panel-subtle rounded-[30px] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Today Snapshot
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  Execution health at a glance
                </p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-600 shadow-sm">
                Live
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {[
                {
                  label: 'Completion flow',
                  value: loading ? '—' : `${completedCount}`,
                  detail: 'Tasks already completed and cleared from active work',
                  icon: CheckCircle2,
                  tone: 'bg-green-50 text-green-600',
                },
                {
                  label: 'Urgent queue',
                  value: loading ? '—' : `${overdueCount}`,
                  detail:
                    overdueCount > 0
                      ? 'Overdue work needing immediate action'
                      : 'No overdue tasks right now',
                  icon: AlertCircle,
                  tone: overdueCount > 0 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600',
                },
                {
                  label: 'Next due item',
                  value: loading
                    ? '—'
                    : nextTask?.dueAt
                      ? formatDueDate(nextTask.dueAt, userTz)
                      : 'None',
                  detail: nextTask ? nextTask.title : 'No upcoming due task scheduled',
                  icon: Clock3,
                  tone: 'bg-indigo-50 text-indigo-600',
                },
              ].map(({ label, value, detail, icon: Icon, tone }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-[24px] border border-white/80 bg-white/80 px-4 py-3"
                >
                  <span
                    className={`${tone} flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl`}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {label}
                    </p>
                    <p className="truncate text-sm text-gray-500">{detail}</p>
                  </div>
                  <span className="shrink-0 text-lg font-bold tabular-nums text-gray-900">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && <StatusNotice message={error} />}

      <div className="app-panel-subtle flex flex-wrap gap-2 rounded-[24px] p-2">
        {[
          { key: 'ALL', label: 'All' },
          { key: 'PENDING', label: 'Pending' },
          { key: 'COMPLETED', label: 'Completed' },
          { key: 'OVERDUE', label: 'Overdue' },
        ].map((tab) => {
          const isActive = activeFilter === tab.key

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveFilter(tab.key as TaskFilter)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              {tab.key === 'OVERDUE' && overdueCount > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {overdueCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="app-table-shell overflow-x-auto">
        {loading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded bg-gray-100" />
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="app-empty-state rounded-none border-0 shadow-none">
            <CheckSquare className="mb-4 h-12 w-12 text-gray-300" />
            <p className="text-sm font-medium text-gray-700">No tasks in this view</p>
            <p className="mt-1 text-sm text-gray-400">
              Tasks will appear here as they are assigned and completed.
            </p>
          </div>
        ) : (
          <table className="app-table">
            <thead>
              <tr>
                <th className="w-12 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Done
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Task
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 hidden md:table-cell">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 hidden lg:table-cell">
                  Due date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="w-24 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {filteredTasks.map((task) => {
                const overdue = isOverdue(task)
                const busy = busyTaskIds.has(task.id)

                return (
                  <tr key={task.id} className="transition hover:bg-white/65">
                    <td className="px-4 py-3 align-top">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        disabled={busy}
                        onChange={() => void handleToggleComplete(task)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p
                          className={`font-medium ${task.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}
                        >
                          {task.title}
                        </p>
                        <p
                          className={`mt-1 text-xs md:hidden ${overdue ? 'text-red-600' : 'text-gray-400'}`}
                        >
                          {formatDueDate(task.dueAt, userTz)}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {task.contact ? (
                        <button
                          type="button"
                          onClick={() => setDrawerContactId(task.contact?.id ?? null)}
                          className="text-indigo-600 hover:underline"
                        >
                          {task.contact.name}
                        </button>
                      ) : (
                        <span className="text-gray-400">No contact</span>
                      )}
                    </td>
                    <td
                      className={`px-4 py-3 hidden lg:table-cell ${overdue ? 'font-medium text-red-600' : 'text-gray-500'}`}
                    >
                      {formatDueDate(task.dueAt, userTz)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          task.completed
                            ? 'bg-green-100 text-green-700'
                            : overdue
                              ? 'bg-red-100 text-red-700'
                              : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {task.completed ? 'Completed' : overdue ? 'Overdue' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => openEdit(task)}
                          className="rounded-lg border border-gray-300 p-2 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                          aria-label={`Edit ${task.title}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleDelete(task.id)}
                          className="rounded-lg border border-gray-300 p-2 text-red-600 hover:bg-red-50 disabled:opacity-50"
                          aria-label={`Delete ${task.title}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="app-panel w-full max-w-md rounded-[28px] shadow-2xl">
            <div className="border-b border-gray-100 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-500/80">
                    Follow-ups
                  </p>
                  <h2 className="mt-1 text-lg font-bold text-gray-900">Edit Task</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Update the task title or timing without leaving your workflow.
                  </p>
                </div>
                <button
                  onClick={closeEdit}
                  className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => {
                    setEditTitle(e.target.value)
                    setEditFieldErrors((prev) => ({ ...prev, title: undefined }))
                  }}
                  maxLength={500}
                  aria-invalid={editFieldErrors.title ? 'true' : 'false'}
                  aria-describedby={editFieldErrors.title ? 'edit-task-title-error' : undefined}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${editFieldErrors.title ? 'border-red-300 focus:ring-red-100' : 'border-gray-300 focus:ring-indigo-500'}`}
                />
                {editFieldErrors.title && (
                  <p id="edit-task-title-error" className="mt-1 text-xs text-red-600">
                    {editFieldErrors.title}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
                <input
                  type="datetime-local"
                  value={editDueAt}
                  onChange={(e) => {
                    setEditDueAt(e.target.value)
                    setEditFieldErrors((prev) => ({ ...prev, dueAt: undefined }))
                  }}
                  aria-invalid={editFieldErrors.dueAt ? 'true' : 'false'}
                  aria-describedby={editFieldErrors.dueAt ? 'edit-task-due-error' : undefined}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${editFieldErrors.dueAt ? 'border-red-300 focus:ring-red-100' : 'border-gray-300 focus:ring-indigo-500'}`}
                />
                {editFieldErrors.dueAt && (
                  <p id="edit-task-due-error" className="mt-1 text-xs text-red-600">
                    {editFieldErrors.dueAt}
                  </p>
                )}
                {editDueAt && (
                  <button
                    type="button"
                    onClick={() => setEditDueAt('')}
                    className="mt-1 text-xs text-gray-400 hover:text-red-500"
                  >
                    Clear due date
                  </button>
                )}
              </div>
              {editError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{editError}</p>
              )}
            </div>

            <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={closeEdit}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSaveEdit()}
                disabled={editSaving}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {editSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ContactDetailDrawer contactId={drawerContactId} onClose={() => setDrawerContactId(null)} />

      {confirmDeleteId && (
        <ConfirmDialog
          message="Delete this task? This cannot be undone."
          onConfirm={() => {
            void confirmDelete(confirmDeleteId)
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}

      {/* Create Task Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="app-panel w-full max-w-md rounded-[28px] shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-500/80">
                  Follow-ups
                </p>
                <h2 className="mt-1 text-lg font-bold text-gray-900">New Task</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Create a clear next step and connect it to the right contact.
                </p>
              </div>
              <button
                onClick={closeCreate}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <X size={20} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {createError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{createError}</p>
              )}

              {/* Contact picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact <span className="text-red-500">*</span>
                </label>
                {createContactId ? (
                  <div className="flex items-center justify-between rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2">
                    <p className="text-sm font-medium text-indigo-900">
                      {createContacts.find((c) => c.id === createContactId)?.name ??
                        createContactId}
                    </p>
                    <button
                      type="button"
                      onClick={() => setCreateContactId('')}
                      className="text-indigo-400 hover:text-indigo-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Search contacts..."
                      value={createContactSearch}
                      onChange={(e) => setCreateContactSearch(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    {createContactLoadError && (
                      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                        {createContactLoadError}
                      </p>
                    )}
                    {createContacts.length > 0 && (
                      <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                        {createContacts.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setCreateContactId(c.id)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {createFieldErrors.contact && (
                  <p className="mt-1 text-xs text-red-600">{createFieldErrors.contact}</p>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createTitle}
                  onChange={(e) => {
                    setCreateTitle(e.target.value)
                    setCreateFieldErrors((prev) => ({ ...prev, title: undefined }))
                  }}
                  maxLength={500}
                  placeholder="e.g. Follow up with proposal"
                  aria-invalid={createFieldErrors.title ? 'true' : 'false'}
                  aria-describedby={createFieldErrors.title ? 'create-task-title-error' : undefined}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${createFieldErrors.title ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`}
                />
                {createFieldErrors.title && (
                  <p id="create-task-title-error" className="mt-1 text-xs text-red-600">
                    {createFieldErrors.title}
                  </p>
                )}
              </div>

              {/* Due date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
                <input
                  type="datetime-local"
                  value={createDueAt}
                  onChange={(e) => {
                    setCreateDueAt(e.target.value)
                    setCreateFieldErrors((prev) => ({ ...prev, dueAt: undefined }))
                  }}
                  aria-invalid={createFieldErrors.dueAt ? 'true' : 'false'}
                  aria-describedby={createFieldErrors.dueAt ? 'create-task-due-error' : undefined}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${createFieldErrors.dueAt ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'}`}
                />
                {createFieldErrors.dueAt && (
                  <p id="create-task-due-error" className="mt-1 text-xs text-red-600">
                    {createFieldErrors.dueAt}
                  </p>
                )}
                {createDueAt && (
                  <button
                    type="button"
                    onClick={() => setCreateDueAt('')}
                    className="mt-1 text-xs text-gray-400 hover:text-red-500"
                  >
                    Clear due date
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={closeCreate}
                className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleCreateTask()}
                disabled={createSaving}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {createSaving ? 'Creating...' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ConfirmDialog ────────────────────────────────────────────────────────────

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string
  onConfirm: () => void
  onCancel: () => void
}): JSX.Element {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousActiveElementRef.current = document.activeElement as HTMLElement | null
    cancelButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled])'),
      )
      if (focusableElements.length === 0) return

      const first = focusableElements[0]
      const last = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousActiveElementRef.current?.focus()
    }
  }, [onCancel])

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onCancel} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tasks-confirm-dialog-title"
        className="fixed inset-x-4 top-1/2 z-50 w-full max-w-sm -translate-y-1/2 rounded-xl bg-white p-6 shadow-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
      >
        <h3 id="tasks-confirm-dialog-title" className="text-sm font-semibold text-gray-900">
          Confirm
        </h3>
        <p className="mt-1 text-sm text-gray-500">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </>
  )
}
