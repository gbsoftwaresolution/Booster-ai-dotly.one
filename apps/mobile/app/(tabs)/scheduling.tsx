import React, { useCallback, useEffect, useState } from 'react'
import type { AppointmentTypeResponse, BookingResponse } from '@dotly/types'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { api } from '../../lib/api'
import { formatDateTime, getUserTimezone } from '../../lib/tz'
import { useAuthz } from '../../components/AuthzProvider'

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: '#16a34a',
  PENDING: '#d97706',
  CANCELLED: '#dc2626',
  NO_SHOW: '#6b7280',
}

export default function SchedulingScreen() {
  const {
    schedulingAllowed,
    loading: authzLoading,
    error: authzError,
    refresh: refreshAuthz,
  } = useAuthz()
  const [aptTypes, setAptTypes] = useState<AppointmentTypeResponse[]>([])
  const [bookings, setBookings] = useState<BookingResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [typesError, setTypesError] = useState<string | null>(null)
  const [bookingsError, setBookingsError] = useState<string | null>(null)
  const [busyBookingIds, setBusyBookingIds] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<'types' | 'bookings'>('types')
  const [userTz, setUserTz] = useState<string | null>(null)

  const load = useCallback(
    async (options?: { refresh?: boolean }): Promise<boolean> => {
      try {
        const [types, bkgs, tz] = await Promise.allSettled([
          api.getAppointmentTypes(),
          api.getUpcomingBookings(),
          getUserTimezone(),
        ])
        if (types.status === 'fulfilled') {
          setAptTypes(types.value)
          setTypesError(null)
        } else {
          setTypesError(
            types.reason instanceof Error
              ? types.reason.message
              : 'Appointment types are unavailable.',
          )
        }
        if (bkgs.status === 'fulfilled') {
          setBookings(bkgs.value)
          setBookingsError(null)
        } else {
          setBookingsError(
            bkgs.reason instanceof Error ? bkgs.reason.message : 'Bookings are unavailable.',
          )
        }
        setUserTz(tz.status === 'fulfilled' ? tz.value : null)
        setError(null)
        setRefreshError(null)
        if (types.status === 'rejected' && bkgs.status === 'rejected') {
          throw new Error('Failed to load scheduling')
        }
        return true
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to load scheduling'
        if (options?.refresh && (aptTypes.length > 0 || bookings.length > 0)) {
          setRefreshError(message)
        } else {
          setError(message)
        }
        return false
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [aptTypes.length, bookings.length],
  )

  useEffect(() => {
    void load()
  }, [load])

  function onRefresh() {
    setRefreshing(true)
    void load({ refresh: true })
  }

  async function handleCancelBooking(bookingId: string) {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel this booking?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Booking',
        style: 'destructive',
        onPress: async () => {
          setBusyBookingIds((prev) => new Set(prev).add(bookingId))
          try {
            await api.cancelBooking(bookingId)
            setBookings((prev) =>
              prev.map((booking) =>
                booking.id === bookingId ? { ...booking, status: 'CANCELLED' } : booking,
              ),
            )
            const refreshed = await load({ refresh: true })
            if (!refreshed) {
              setRefreshError('Booking cancelled, but the latest schedule refresh failed.')
            }
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Failed to cancel')
          } finally {
            setBusyBookingIds((prev) => {
              const next = new Set(prev)
              next.delete(bookingId)
              return next
            })
          }
        },
      },
    ])
  }

  if (!authzLoading && !schedulingAllowed) {
    if (authzError) {
      return (
        <View style={styles.centered}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a', textAlign: 'center' }}>
            We couldn&apos;t verify access
          </Text>
          <Text
            style={{ color: '#64748b', textAlign: 'center', marginTop: 8, paddingHorizontal: 24 }}
          >
            {authzError}
          </Text>
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
      <View style={styles.centered}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a', textAlign: 'center' }}>
          Scheduling is available on paid plans
        </Text>
        <Text
          style={{ color: '#64748b', textAlign: 'center', marginTop: 8, paddingHorizontal: 24 }}
        >
          Upgrade your plan to manage appointment types and bookings from mobile.
        </Text>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text
          style={{ color: '#ef4444', fontSize: 15, textAlign: 'center', paddingHorizontal: 24 }}
        >
          {error}
        </Text>
        <TouchableOpacity onPress={() => void load()} style={{ marginTop: 16, padding: 12 }}>
          <Text style={{ color: '#0ea5e9', fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  function openWebSchedulingManager() {
    void Linking.openURL('https://dotly.one/apps/scheduling')
  }

  const renderAptType = ({ item }: { item: AppointmentTypeResponse }) => (
    <TouchableOpacity
      onPress={openWebSchedulingManager}
      style={styles.card}
      accessibilityRole="link"
      accessibilityLabel={`Manage appointment type ${item.name}`}
      accessibilityHint="Opens scheduling management in your browser"
    >
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
        <Text style={styles.bookingsCount}>{item._count?.bookings ?? 0} total bookings</Text>
        <Text style={styles.manageHint}>Manage on web</Text>
      </View>
    </TouchableOpacity>
  )

  const renderBooking = ({ item }: { item: BookingResponse }) => (
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
              disabled={busyBookingIds.has(item.id)}
              onPress={() => void handleCancelBooking(item.id)}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelBtnText}>
                {busyBookingIds.has(item.id) ? 'Cancelling…' : 'Cancel'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  )

  return (
    <View style={styles.container}>
      {refreshError && (
        <View style={styles.infoBanner}>
          <Text style={[styles.infoBannerText, { color: '#b91c1c' }]}>{refreshError}</Text>
        </View>
      )}
      {typesError && tab === 'types' && (
        <View style={styles.infoBanner}>
          <Text style={[styles.infoBannerText, { color: '#b91c1c' }]}>{typesError}</Text>
        </View>
      )}
      {bookingsError && tab === 'bookings' && (
        <View style={styles.infoBanner}>
          <Text style={[styles.infoBannerText, { color: '#b91c1c' }]}>{bookingsError}</Text>
        </View>
      )}

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
          ListHeaderComponent={
            aptTypes.length > 0 ? (
              <View style={styles.infoBanner}>
                <Text style={styles.infoBannerText}>
                  This screen is read-only. Create and edit appointment types from the web
                  dashboard.
                </Text>
              </View>
            ) : null
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
  infoBanner: {
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bae6fd',
    backgroundColor: '#f0f9ff',
    padding: 12,
  },
  infoBannerText: { fontSize: 13, color: '#0369a1', lineHeight: 18 },
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
  manageHint: { fontSize: 12, color: '#0ea5e9', fontWeight: '600', marginTop: 8 },
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
