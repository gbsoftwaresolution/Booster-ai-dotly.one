'use client'

import type { JSX } from 'react'
import { useCallback, useDeferredValue, useEffect, useRef, useState } from 'react'
import { CheckSquare, Pencil, Plus, Trash2, X, Clock3 } from 'lucide-react'
import { ContactDetailDrawer } from '@/components/crm/ContactDetailDrawer'
import { StatusNotice } from '@/components/ui/StatusNotice'
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api'
import { getAccessToken } from '@/lib/supabase/client'
import type { PaginatedResponse } from '@dotly/types'
import { useUserTimezone } from '@/hooks/useUserLocale'
import { ConfirmDialog, CreateTaskModal, EditTaskModal } from './components'
import { formatDueDate, isOverdue } from './helpers'
import { TASKS_PAGE_LIMIT, type TaskFilter, type TaskItem, type TasksSummary } from './types'

export default function TasksPage(): JSX.Element {
  const userTz = useUserTimezone()
  const searchId = 'tasks-page-search'
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [summary, setSummary] = useState<TasksSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  const [activeFilter, setActiveFilter] = useState<TaskFilter>('ALL')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [busyTaskIds, setBusyTaskIds] = useState<Set<string>>(new Set())
  const [drawerContactId, setDrawerContactId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const taskDeleteTarget = tasks.find((task) => task.id === confirmDeleteId) ?? null

  // Edit modal state
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null)

  // Create task modal state
  const [showCreate, setShowCreate] = useState(false)
  const deferredSearch = useDeferredValue(search)

  const loadTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSummaryError(null)
    try {
      const token = await getAccessToken()
      const params = new URLSearchParams({
        page: String(page),
        limit: String(TASKS_PAGE_LIMIT),
      })
      if (activeFilter !== 'ALL') params.set('status', activeFilter)
      if (deferredSearch.trim()) params.set('search', deferredSearch.trim())

      const [listResult, summaryResult] = await Promise.allSettled([
        apiGet<PaginatedResponse<TaskItem>>(`/tasks?${params.toString()}`, token),
        apiGet<TasksSummary>('/tasks/summary', token),
      ])

      if (listResult.status === 'fulfilled') {
        setTasks(listResult.value.items)
        setTotal(listResult.value.total)
        setTotalPages(listResult.value.totalPages)
        setHasLoadedOnce(true)
      } else {
        throw listResult.reason
      }

      if (summaryResult.status === 'fulfilled') {
        setSummary(summaryResult.value)
      } else {
        setSummaryError(
          summaryResult.reason instanceof Error
            ? summaryResult.reason.message
            : 'Task summary is temporarily unavailable.',
        )
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [activeFilter, deferredSearch, page])

  useEffect(() => {
    void loadTasks()
  }, [loadTasks])

  useEffect(() => {
    setPage(1)
  }, [activeFilter, search])

  const overdueCount = summary?.overdueTasks ?? 0
  const pendingCount = summary?.pendingTasks ?? 0
  const completedCount = summary?.completedTasks ?? 0
  const dueTodayCount = summary?.dueTodayTasks ?? 0
  const nextTask = summary?.nextTask ?? null
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

  const handleToggleComplete = useCallback(
    async (task: TaskItem) => {
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
        void loadTasks()
      } catch (err) {
        setTasks((prev) => prev.map((item) => (item.id === task.id ? task : item)))
        setError(err instanceof Error ? err.message : 'Failed to update task')
      } finally {
        mutateTaskBusyState(task.id, false)
      }
    },
    [loadTasks],
  )

  const handleDelete = useCallback(async (taskId: string) => {
    setConfirmDeleteId(taskId)
  }, [])

  const confirmDelete = useCallback(
    async (taskId: string) => {
      setConfirmDeleteId(null)
      mutateTaskBusyState(taskId, true)
      setError(null)
      try {
        const token = await getAccessToken()
        await apiDelete(`/tasks/${taskId}`, token)
        setTasks((prev) => prev.filter((task) => task.id !== taskId))
        void loadTasks()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete task')
      } finally {
        mutateTaskBusyState(taskId, false)
      }
    },
    [loadTasks],
  )

  function openEdit(task: TaskItem) {
    setEditingTask(task)
  }

  function closeEdit() {
    setEditingTask(null)
  }

  function openCreate() {
    setShowCreate(true)
  }

  function closeCreate() {
    setShowCreate(false)
  }

  return (
    <div className="space-y-6">
      <div className="app-panel relative overflow-hidden rounded-[24px] px-6 py-6 sm:px-8 sm:py-7">
        <div
          className="absolute inset-0 opacity-90"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(circle at top left, rgba(99,102,241,0.14), transparent 34%), radial-gradient(circle at right center, rgba(14,165,233,0.10), transparent 28%), linear-gradient(135deg, rgba(255,255,255,0.94), rgba(248,250,252,0.98))',
          }}
        />
        <div className="relative space-y-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-[2rem]">Tasks</h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-600 sm:text-[15px]">
                Stay on top of follow-ups, resolve overdue work, and keep the next customer action
                clear.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 self-start rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              New Task
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:max-w-3xl sm:grid-cols-4">
            {[
              { label: 'All Tasks', value: loading ? '—' : (summary?.totalTasks ?? total) },
              { label: 'Pending', value: loading ? '—' : pendingCount },
              { label: 'Overdue', value: loading ? '—' : overdueCount },
              { label: 'Due Today', value: loading ? '—' : dueTodayCount },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-2xl border border-white/80 bg-white/88 px-3 py-3 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.16)]"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                  {label}
                </p>
                <p className="mt-1 text-sm font-bold text-gray-900 sm:text-base">{value}</p>
              </div>
            ))}
          </div>

          <div className="flex max-w-full items-start gap-3 rounded-2xl border border-white/80 bg-white/88 px-4 py-3 text-sm text-gray-700 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.18)]">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
              <Clock3 className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="font-medium text-gray-900">Next priority</p>
              <p className="mt-1 text-sm text-gray-600">{focusMessage}</p>
            </div>
          </div>
        </div>
      </div>

      {error && <StatusNotice message={error} liveMode="assertive" />}
      {summaryError && <StatusNotice tone="warning" message={summaryError} liveMode="polite" />}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="app-panel-subtle flex flex-wrap gap-2 rounded-2xl p-2">
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
        {activeFilter !== 'ALL' || search.trim() ? (
          <button
            type="button"
            onClick={() => {
              setActiveFilter('ALL')
              setSearch('')
            }}
            className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <label htmlFor={searchId} className="sr-only">
          Search tasks or contacts
        </label>
        <input
          id={searchId}
          type="text"
          placeholder="Search tasks or contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-80"
        />
      </div>

      <div className="app-table-shell overflow-x-auto">
        {loading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded bg-gray-100" />
            ))}
          </div>
        ) : error && !hasLoadedOnce ? (
          <div className="relative overflow-hidden rounded-[24px] border border-white/80 bg-white/60 px-6 py-12 text-center backdrop-blur-xl shadow-sm transition-all m-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-rose-50 to-red-50/50 shadow-inner mb-6"><CheckSquare size={32} className="text-red-400" /></div>
            <h3 className="text-xl font-extrabold text-slate-900 mb-2">Tasks are unavailable</h3>
            <p className="mx-auto max-w-sm text-sm font-medium text-slate-500 mb-8">{error}</p>
            <button
              type="button"
              onClick={() => void loadTasks()}
              className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Retry
            </button>
          </div>
        ) : tasks.length === 0 ? (
          <div className="relative overflow-hidden rounded-[24px] border border-white/80 bg-white/60 px-6 py-12 text-center backdrop-blur-xl shadow-sm transition-all m-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-50 to-blue-50/50 shadow-inner mb-6"><CheckSquare size={32} className="text-indigo-400" /></div>
            <h3 className="text-xl font-extrabold text-slate-900 mb-2">No tasks in this view</h3>
            <p className="app-empty-state-text mt-1">
              Tasks will appear here as they are assigned and completed.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3 p-4 md:hidden">
              {tasks.map((task) => {
                const overdue = isOverdue(task)
                const busy = busyTaskIds.has(task.id)

                return (
                  <div key={task.id} className="group relative flex flex-col gap-4 rounded-[24px] border border-slate-200/60 bg-white/60 p-5 backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] hover:bg-white">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={task.completed}
                        disabled={busy}
                        onChange={() => void handleToggleComplete(task)}
                        aria-label={`${task.completed ? 'Mark incomplete' : 'Mark complete'}: ${task.title}`}
                        className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p
                              className={`text-base font-semibold ${task.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}
                            >
                              {task.title}
                            </p>
                            <p
                              className={`mt-1 text-sm font-medium ${overdue ? "text-rose-500" : "text-slate-500"}`}
                            >
                              {formatDueDate(task.dueAt, userTz)}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${task.completed ? "bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-500/20" : overdue ? "bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-500/20" : "bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-500/20"}`}
                          >
                            {task.completed ? 'Completed' : overdue ? 'Overdue' : 'Pending'}
                          </span>
                        </div>

                        <div className="flex flex-col gap-2 rounded-2xl bg-slate-50/80 p-3.5 border border-slate-100/50">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Contact
                          </p>
                          {task.contact ? (
                            <button
                              type="button"
                              onClick={() => setDrawerContactId(task.contact?.id ?? null)}
                              className="text-left text-[14px] font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                            >
                              {task.contact.name}
                            </button>
                          ) : (
                            <p className="text-sm text-gray-400">No contact</p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => openEdit(task)}
                            className="app-touch-target inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            aria-label={`Edit ${task.title}`}
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => setConfirmDeleteId(task.id)}
                            className="app-touch-target inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                            aria-label={`Delete ${task.title}`}
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="hidden md:block">
              <table className="min-w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr>
                    <th className="w-12 px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3">
                      Done
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3">
                      Task
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3 hidden md:table-cell">
                      Contact
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3 hidden lg:table-cell">
                      Due date
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-3">
                      Status
                    </th>
                    <th className="w-24 px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/50">
                  {tasks.map((task) => {
                    const overdue = isOverdue(task)
                    const busy = busyTaskIds.has(task.id)

                    return (
                      <tr key={task.id} className="group relative bg-white/60 backdrop-blur-xl transition-all hover:bg-white hover:shadow-[0_8px_24px_-12px_rgba(15,23,42,0.12)] focus-within:bg-white">
                        <td className="px-4 py-3 align-top">
                          <input
                            type="checkbox"
                            checked={task.completed}
                            disabled={busy}
                            onChange={() => void handleToggleComplete(task)}
                            aria-label={`${task.completed ? 'Mark incomplete' : 'Mark complete'}: ${task.title}`}
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p
                              className={`text-[15px] font-bold ${task.completed ? "text-slate-400 line-through decoration-slate-300" : "text-slate-900"}`}
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
                              onClick={() => setConfirmDeleteId(task.id)}
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
            </div>
          </>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-500">
            Showing {(page - 1) * TASKS_PAGE_LIMIT + 1}-{Math.min(page * TASKS_PAGE_LIMIT, total)}{' '}
            of {total}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 sm:flex-none"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page === totalPages}
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 sm:flex-none"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {taskDeleteTarget && (
        <ConfirmDialog
          title="Delete task"
          message={`Delete "${taskDeleteTarget.title}"? This action cannot be undone.`}
          onConfirm={() => {
            void handleDelete(taskDeleteTarget.id)
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={closeEdit}
          onSaved={(updated) => {
            setTasks((prev) => prev.map((task) => (task.id === updated.id ? updated : task)))
            void loadTasks()
          }}
        />
      )}

      <ContactDetailDrawer contactId={drawerContactId} onClose={() => setDrawerContactId(null)} />

      <CreateTaskModal
        open={showCreate}
        onClose={closeCreate}
        onCreated={(created) => {
          setTasks((prev) => [created, ...prev])
          void loadTasks()
        }}
      />
    </div>
  )
}
