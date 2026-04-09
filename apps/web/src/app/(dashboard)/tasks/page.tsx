'use client'

import type { JSX } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckSquare, Pencil, Plus, Trash2, X } from 'lucide-react'
import { ContactDetailDrawer } from '@/components/crm/ContactDetailDrawer'
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

export default function TasksPage(): JSX.Element {
  const userTz = useUserTimezone()
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

  // Create task modal state
  const [showCreate, setShowCreate] = useState(false)
  const [createContacts, setCreateContacts] = useState<{ id: string; name: string }[]>([])
  const [createContactSearch, setCreateContactSearch] = useState('')
  const [createContactId, setCreateContactId] = useState('')
  const [createTitle, setCreateTitle] = useState('')
  const [createDueAt, setCreateDueAt] = useState('')
  const [createSaving, setCreateSaving] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

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

  const filteredTasks = useMemo(() => {
    if (activeFilter === 'PENDING') return tasks.filter((task) => !task.completed)
    if (activeFilter === 'COMPLETED') return tasks.filter((task) => task.completed)
    if (activeFilter === 'OVERDUE') return tasks.filter(isOverdue)
    return tasks
  }, [activeFilter, tasks])

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
  }

  function closeEdit() {
    setEditingTask(null)
    setEditTitle('')
    setEditDueAt('')
    setEditError(null)
  }

  async function handleSaveEdit() {
    if (!editingTask) return
    if (!editTitle.trim()) {
      setEditError('Title is required')
      return
    }
    setEditSaving(true)
    setEditError(null)
    try {
      const token = await getAccessToken()
      const updated = await apiPatch<TaskItem>(
        `/tasks/${editingTask.id}`,
        {
          title: editTitle.trim(),
          dueAt: editDueAt ? new Date(editDueAt).toISOString() : null,
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
    void (async () => {
      try {
        const token = await getAccessToken()
        const params = new URLSearchParams({ limit: '50' })
        if (createContactSearch.trim()) params.set('search', createContactSearch.trim())
        const data = await apiGet<{ contacts: { id: string; name: string }[] }>(
          `/contacts?${params.toString()}`,
          token,
        )
        setCreateContacts(data.contacts)
      } catch {
        // silently ignore
      }
    })()
  }, [createContactSearch, showCreate])

  function openCreate() {
    setCreateTitle('')
    setCreateDueAt('')
    setCreateContactId('')
    setCreateContactSearch('')
    setCreateError(null)
    setShowCreate(true)
  }

  function closeCreate() {
    setShowCreate(false)
    setCreateError(null)
  }

  async function handleCreateTask() {
    if (!createTitle.trim()) {
      setCreateError('Title is required')
      return
    }
    if (!createContactId) {
      setCreateError('Please select a contact')
      return
    }
    setCreateSaving(true)
    setCreateError(null)
    try {
      const token = await getAccessToken()
      const body: Record<string, unknown> = { title: createTitle.trim() }
      if (createDueAt) body.dueAt = new Date(createDueAt).toISOString()
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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track follow-ups, due dates, and completed work in one place.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          New Task
        </button>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="flex flex-wrap gap-2">
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

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded bg-gray-100" />
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CheckSquare className="mb-4 h-12 w-12 text-gray-300" />
            <p className="text-sm font-medium text-gray-700">No tasks in this view</p>
            <p className="mt-1 text-sm text-gray-400">
              Tasks will appear here as they are assigned and completed.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
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
            <tbody className="divide-y divide-gray-100">
              {filteredTasks.map((task) => {
                const overdue = isOverdue(task)
                const busy = busyTaskIds.has(task.id)

                return (
                  <tr key={task.id} className="hover:bg-gray-50">
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Edit Task</h2>
              <button onClick={closeEdit} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
                <input
                  type="datetime-local"
                  value={editDueAt}
                  onChange={(e) => setEditDueAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
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

            <div className="flex gap-3 mt-6">
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
          onConfirm={() => { void confirmDelete(confirmDeleteId) }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}

      {/* Create Task Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">New Task</h2>
              <button onClick={closeCreate} className="text-gray-400 hover:text-gray-600">
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
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  maxLength={500}
                  placeholder="e.g. Follow up with proposal"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Due date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
                <input
                  type="datetime-local"
                  value={createDueAt}
                  onChange={(e) => setCreateDueAt(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
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
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onCancel} aria-hidden="true" />
      <div className="fixed inset-x-4 top-1/2 z-50 w-full max-w-sm -translate-y-1/2 rounded-xl bg-white p-6 shadow-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2">
        <h3 className="text-sm font-semibold text-gray-900">Confirm</h3>
        <p className="mt-1 text-sm text-gray-500">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
            Delete
          </button>
        </div>
      </div>
    </>
  )
}
