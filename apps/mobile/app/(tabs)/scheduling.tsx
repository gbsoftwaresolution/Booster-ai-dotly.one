import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { api } from '../../lib/api'
import { formatDateTime, getUserTimezone } from '../../lib/tz'

interface AppointmentType {
  id: string
  name: string
  slug: string
  durationMins: number
  color: string
  location: string | null
  isActive: boolean
  _count: { bookings: number }
}

interface Booking {
  id: string
  startAt: string
  endAt: string
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW'
  guestName: string
  guestEmail: string
  appointmentType: { name: string; color: string }
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: '#16a34a',
  PENDING: '#d97706',
  CANCELLED: '#dc2626',
  NO_SHOW: '#6b7280',
}

export default function SchedulingScreen() {
  const [aptTypes, setAptTypes] = useState<AppointmentType[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [tab, setTab] = useState<'types' | 'bookings'>('types')
  const [userTz, setUserTz] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [types, bkgs, tz] = await Promise.all([
        api.getAppointmentTypes() as Promise<AppointmentType[]>,
        api.getUpcomingBookings() as Promise<Booking[]>,
        getUserTimezone(),
      ])
      setAptTypes(types)
      setBookings(bkgs)
      setUserTz(tz)
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  function onRefresh() {
    setRefreshing(true)
    void load()
  }

  async function handleCancelBooking(bookingId: string) {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Booking',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.cancelBooking(bookingId)
            await load()
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Failed to cancel')
          }
        },
      },
    ])
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    )
  }

  const renderAptType = ({ item }: { item: AppointmentType }) => (
    <View style={styles.card}>
      <View style={[styles.colorDot, { backgroundColor: item.color }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          {!item.isActive && (
            <View style={styles.inactiveBadge}>
              <Text style={styles.inactiveBadgeText}>Inactive</Text>
            </View>
          )}
        </View>
        <View style={styles.cardMeta}>
          <Feather name="clock" size={13} color="#94a3b8" />
          <Text style={styles.metaText}>{item.durationMins} min</Text>
          {item.location ? (
            <>
              <Feather name="map-pin" size={13} color="#94a3b8" style={{ marginLeft: 8 }} />
              <Text style={[styles.metaText, { flex: 1 }]} numberOfLines={1}>
                {item.location}
              </Text>
            </>
          ) : null}
        </View>
        <Text style={styles.bookingsCount}>{item._count.bookings} total bookings</Text>
      </View>
    </View>
  )

  const renderBooking = ({ item }: { item: Booking }) => (
    <View style={styles.card}>
      <View style={[styles.colorDot, { backgroundColor: item.appointmentType.color }]} />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.guestName}</Text>
        <Text style={styles.cardSubtitle}>{item.appointmentType.name}</Text>
        <Text style={styles.metaText}>{formatDateTime(item.startAt, userTz)}</Text>
        <View style={styles.cardFooter}>
          <View
            style={[styles.statusBadge, { borderColor: STATUS_COLORS[item.status] ?? '#94a3b8' }]}
          >
            <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] ?? '#94a3b8' }]}>
              {item.status}
            </Text>
          </View>
          {item.status !== 'CANCELLED' && (
            <TouchableOpacity
              onPress={() => void handleCancelBooking(item.id)}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  )

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Feather name="calendar" size={22} color="#0ea5e9" />
        <Text style={styles.headerTitle}>Scheduling</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'types' && styles.tabActive]}
          onPress={() => setTab('types')}
        >
          <Text style={[styles.tabText, tab === 'types' && styles.tabTextActive]}>
            Appointment Types
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'bookings' && styles.tabActive]}
          onPress={() => setTab('bookings')}
        >
          <Text style={[styles.tabText, tab === 'bookings' && styles.tabTextActive]}>
            Upcoming ({bookings.length})
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'types' ? (
        <FlatList
          data={aptTypes}
          keyExtractor={(item) => item.id}
          renderItem={renderAptType}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0ea5e9" />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="calendar" size={40} color="#e2e8f0" />
              <Text style={styles.emptyText}>No appointment types yet.</Text>
              <Text style={styles.emptySubtext}>Create them from the web dashboard.</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          renderItem={renderBooking}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0ea5e9" />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="calendar" size={40} color="#e2e8f0" />
              <Text style={styles.emptyText}>No upcoming bookings.</Text>
            </View>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#0ea5e9' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  tabTextActive: { color: '#0ea5e9' },
  list: { padding: 16, gap: 10, paddingBottom: 32 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  colorDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5, marginRight: 12 },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#0f172a', flex: 1 },
  cardSubtitle: { fontSize: 13, color: '#64748b', marginBottom: 2 },
  inactiveBadge: {
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  inactiveBadgeText: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  metaText: { fontSize: 12, color: '#94a3b8' },
  bookingsCount: { fontSize: 12, color: '#94a3b8' },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  cancelBtn: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  cancelBtnText: { fontSize: 12, color: '#dc2626', fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 64, gap: 8 },
  emptyText: { fontSize: 15, color: '#94a3b8', fontWeight: '600' },
  emptySubtext: { fontSize: 13, color: '#cbd5e1' },
})
