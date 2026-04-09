import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useState, useEffect, useCallback } from 'react'
import { api } from '../../lib/api'
import { formatDate, getUserTimezone } from '../../lib/tz'

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
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending')
  const [userTz, setUserTz] = useState<string | null>(null)

  const loadTasks = useCallback(async () => {
    try {
      const [data, tz] = await Promise.all([api.getAllTasks(), getUserTimezone()])
      setTasks(data as Task[])
      setUserTz(tz)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
    }
  }, [])

  useEffect(() => {
    void loadTasks().finally(() => setLoading(false))
  }, [loadTasks])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadTasks()
    setRefreshing(false)
  }, [loadTasks])

  const handleToggle = useCallback(async (task: Task) => {
    try {
      await api.updateTask(task.id, { completed: !task.completed })
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t)),
      )
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update task')
    }
  }, [])

  const handleDelete = useCallback((taskId: string) => {
    Alert.alert('Delete Task', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteTask(taskId)
            setTasks((prev) => prev.filter((t) => t.id !== taskId))
          } catch (err: unknown) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete task')
          }
        },
      },
    ])
  }, [])

  const filtered = tasks.filter((t) => {
    if (filter === 'pending') return !t.completed
    if (filter === 'completed') return t.completed
    return true
  })

  const pendingCount = tasks.filter((t) => !t.completed).length
  const overdueCount = tasks.filter(isOverdue).length

  if (loading) {
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
        <TouchableOpacity onPress={() => void loadTasks()} style={{ marginTop: 16, padding: 12 }}>
          <Text style={{ color: '#0ea5e9', fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
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
              {filter === 'completed' ? 'No completed tasks yet.' : 'No pending tasks. Great work!'}
            </Text>
          </View>
        }
        renderItem={({ item: task }) => {
          const overdue = isOverdue(task)
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
                }}
              >
                {task.completed && (
                  <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '800' }}>✓</Text>
                )}
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
                    <Text style={{ fontSize: 11, color: '#64748b' }}>{task.contact.name}</Text>
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
                onPress={() => handleDelete(task.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ paddingTop: 2 }}
              >
                <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: '600' }}>Delete</Text>
              </TouchableOpacity>
            </View>
          )
        }}
      />
    </View>
  )
}
