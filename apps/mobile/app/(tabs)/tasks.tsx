import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { api } from '../../lib/api'
import { formatDate, getUserTimezone } from '../../lib/tz'
import { useAuthz } from '../../components/AuthzProvider'

interface Task {
  id: string
  title: string
  dueAt: string | null
  completed: boolean
  completedAt: string | null
  createdAt: string
  priority?: string
  type?: string
  contact?: { id: string; name: string }
}

function relativeTime(iso: string, tz?: string | null): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(iso, tz)
}

function isOverdue(task: Task): boolean {
  if (task.completed || !task.dueAt) return false
  return new Date(task.dueAt).getTime() < Date.now()
}

export default function TasksScreen() {
  const router = useRouter()
  const { crmAllowed, loading: authzLoading, error: authzError, refresh: refreshAuthz } = useAuthz()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending')
  const [userTz, setUserTz] = useState<string | null>(null)
  const [busyTaskIds, setBusyTaskIds] = useState<Set<string>>(new Set())
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const tasksCountRef = useRef(0)
  const initialLoadCompleteRef = useRef(false)

  useEffect(() => {
    tasksCountRef.current = tasks.length
  }, [tasks.length])

  useEffect(() => {
    initialLoadCompleteRef.current = initialLoadComplete
  }, [initialLoadComplete])

  const mutateBusyTaskState = useCallback((taskId: string, busy: boolean) => {
    setBusyTaskIds((prev) => {
      const next = new Set(prev)
      if (busy) next.add(taskId)
      else next.delete(taskId)
      return next
    })
  }, [])

  const loadTasks = useCallback(async (options?: { refresh?: boolean }) => {
    if (!options?.refresh) setLoading(true)
    try {
      const [data, tz] = await Promise.all([api.getAllTasks(), getUserTimezone()])
      setTasks(data as Task[])
      setUserTz(tz)
      setError(null)
      setRefreshError(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load tasks'
      if (options?.refresh && initialLoadCompleteRef.current && tasksCountRef.current > 0) {
        setRefreshError(message)
      } else {
        setError(message)
      }
    } finally {
      if (!initialLoadCompleteRef.current) {
        initialLoadCompleteRef.current = true
        setInitialLoadComplete(true)
      }
      if (!options?.refresh) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTasks()
  }, [loadTasks])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    setError(null)
    await loadTasks({ refresh: true })
    setRefreshing(false)
  }, [loadTasks])

  const handleToggle = useCallback(
    async (task: Task) => {
      if (busyTaskIds.has(task.id)) return
      const nextCompleted = !task.completed
      mutateBusyTaskState(task.id, true)
      try {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, completed: nextCompleted } : t)),
        )
        const updated = await api.updateTask(task.id, { completed: nextCompleted })
        setTasks((prev) => prev.map((t) => (t.id === task.id ? (updated as Task) : t)))
      } catch (err: unknown) {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)))
        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update task')
      } finally {
        mutateBusyTaskState(task.id, false)
      }
    },
    [busyTaskIds, mutateBusyTaskState],
  )

  const handleDelete = useCallback(
    (taskId: string) => {
      if (busyTaskIds.has(taskId)) return
      Alert.alert('Delete Task', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            mutateBusyTaskState(taskId, true)
            try {
              await api.deleteTask(taskId)
              setTasks((prev) => prev.filter((t) => t.id !== taskId))
            } catch (err: unknown) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete task')
            } finally {
              mutateBusyTaskState(taskId, false)
            }
          },
        },
      ])
    },
    [busyTaskIds, mutateBusyTaskState],
  )

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filter === 'pending') return !t.completed
      if (filter === 'completed') return t.completed
      return true
    })
  }, [filter, tasks])

  const pendingCount = useMemo(() => tasks.filter((t) => !t.completed).length, [tasks])
  const overdueCount = useMemo(() => tasks.filter(isOverdue).length, [tasks])

  if (!authzLoading && !crmAllowed) {
    if (authzError) {
      return (
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 24,
            backgroundColor: '#f8fafc',
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a', textAlign: 'center' }}>
            We couldn&apos;t verify access
          </Text>
          <Text style={{ color: '#64748b', textAlign: 'center', marginTop: 8 }}>{authzError}</Text>
          <TouchableOpacity
            onPress={() => void refreshAuthz()}
            style={{ marginTop: 16, padding: 12 }}
          >
            <Text style={{ color: '#0ea5e9', fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      )
    }
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
          backgroundColor: '#f8fafc',
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a', textAlign: 'center' }}>
          Tasks are available on paid plans
        </Text>
        <Text style={{ color: '#64748b', textAlign: 'center', marginTop: 8 }}>
          Upgrade your plan to manage CRM tasks from mobile.
        </Text>
      </View>
    )
  }

  if (loading && !initialLoadComplete) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#f8fafc',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    )
  }

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#f8fafc',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}
      >
        <Text style={{ color: '#ef4444', fontSize: 15, textAlign: 'center' }}>{error}</Text>
        <TouchableOpacity
          onPress={() => {
            setError(null)
            void loadTasks()
          }}
          style={{ marginTop: 16, padding: 12 }}
        >
          <Text style={{ color: '#0ea5e9', fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {refreshError && (
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#fecaca',
            backgroundColor: '#fef2f2',
            padding: 12,
          }}
        >
          <Text style={{ color: '#b91c1c', fontSize: 13 }}>{refreshError}</Text>
        </View>
      )}

      {/* Header */}
      <View
        style={{
          backgroundColor: '#ffffff',
          paddingTop: 56,
          paddingBottom: 12,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#e2e8f0',
        }}
      >
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#0f172a' }}>Tasks</Text>
          {overdueCount > 0 && (
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderRadius: 20,
                backgroundColor: '#fee2e2',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#b91c1c' }}>
                {overdueCount} overdue
              </Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
          {pendingCount} pending · {tasks.length - pendingCount} completed
        </Text>

        {/* Filter tabs */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          {(['pending', 'all', 'completed'] as const).map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: filter === f ? '#0ea5e9' : '#f1f5f9',
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: filter === f ? '#ffffff' : '#64748b',
                  textTransform: 'capitalize',
                }}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor="#0ea5e9"
          />
        }
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 32 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 48 }}>
            <Text style={{ color: '#94a3b8', fontSize: 15 }}>
              {filter === 'completed'
                ? 'No completed tasks yet.'
                : filter === 'all'
                  ? 'No tasks yet.'
                  : 'No pending tasks. Great work!'}
            </Text>
          </View>
        }
        renderItem={({ item: task }) => {
          const overdue = isOverdue(task)
          const busy = busyTaskIds.has(task.id)
          return (
            <View
              style={{
                backgroundColor: task.completed ? '#f0fdf4' : overdue ? '#fff7ed' : '#ffffff',
                borderRadius: 12,
                padding: 14,
                borderWidth: 1,
                borderColor: task.completed ? '#bbf7d0' : overdue ? '#fed7aa' : '#e2e8f0',
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              {/* Checkbox */}
              <TouchableOpacity
                disabled={busy}
                onPress={() => void handleToggle(task)}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: 2,
                  borderColor: task.completed ? '#16a34a' : overdue ? '#f97316' : '#94a3b8',
                  backgroundColor: task.completed ? '#16a34a' : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 1,
                  opacity: busy ? 0.5 : 1,
                }}
              >
                {task.completed && <Feather name="check" size={12} color="#ffffff" />}
              </TouchableOpacity>

              {/* Content */}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: task.completed ? '#6b7280' : '#0f172a',
                    textDecorationLine: task.completed ? 'line-through' : 'none',
                    lineHeight: 20,
                  }}
                >
                  {task.title}
                </Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {task.contact && (
                    <TouchableOpacity onPress={() => router.push(`/contact/${task.contact!.id}`)}>
                      <Text style={{ fontSize: 11, color: '#0ea5e9', fontWeight: '600' }}>
                        {task.contact.name}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {task.dueAt && (
                    <Text
                      style={{
                        fontSize: 11,
                        color: overdue ? '#f97316' : '#94a3b8',
                        fontWeight: overdue ? '700' : '400',
                      }}
                    >
                      {overdue ? 'Overdue · ' : 'Due '}
                      {formatDate(task.dueAt, userTz)}
                    </Text>
                  )}
                  {task.priority && task.priority !== 'MEDIUM' && (
                    <View
                      style={{
                        paddingHorizontal: 6,
                        paddingVertical: 1,
                        borderRadius: 8,
                        backgroundColor: task.priority === 'HIGH' ? '#fee2e2' : '#f1f5f9',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '700',
                          color: task.priority === 'HIGH' ? '#b91c1c' : '#64748b',
                        }}
                      >
                        {task.priority}
                      </Text>
                    </View>
                  )}
                  {!task.completed && (
                    <Text style={{ fontSize: 11, color: '#94a3b8' }}>
                      {relativeTime(task.createdAt, userTz)}
                    </Text>
                  )}
                </View>
              </View>

              {/* Delete */}
              <TouchableOpacity
                disabled={busy}
                onPress={() => handleDelete(task.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ paddingTop: 2, opacity: busy ? 0.5 : 1 }}
              >
                <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: '600' }}>
                  {busy ? 'Working…' : 'Delete'}
                </Text>
              </TouchableOpacity>
            </View>
          )
        }}
      />
    </View>
  )
}
