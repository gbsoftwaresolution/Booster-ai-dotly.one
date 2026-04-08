import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Linking,
} from 'react-native'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'expo-router'
import { api } from '../../lib/api'
import { ScanCardButton } from '../../components/ScanCardButton'

interface CrmPipeline {
  stage: string
}

interface Contact {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  sourceCard?: { handle: string }
  crmPipeline?: CrmPipeline
}

const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  NEW: { bg: '#dbeafe', text: '#1d4ed8' },
  CONTACTED: { bg: '#fef9c3', text: '#a16207' },
  QUALIFIED: { bg: '#f3e8ff', text: '#7c3aed' },
  CLOSED: { bg: '#dcfce7', text: '#15803d' },
  LOST: { bg: '#fee2e2', text: '#b91c1c' },
}

function Avatar({ name, id }: { name: string; id: string }) {
  const colors = ['#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899']
  const color = colors[id.charCodeAt(0) % colors.length]
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
  return (
    <View
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 15 }}>{initials || '?'}</Text>
    </View>
  )
}

export default function ContactsTab() {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [planError, setPlanError] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  const fetchContacts = useCallback(
    async (reset = false, currentPage?: number) => {
      try {
        const pageToFetch = reset ? 1 : (currentPage ?? 1)
        const data = await api.getContacts(pageToFetch, 50)
        const nextContacts = data.contacts as Contact[]
        if (reset) {
          setContacts(nextContacts)
          setPage(1)
        } else {
          setContacts((prev) => (pageToFetch === 1 ? nextContacts : [...prev, ...nextContacts]))
        }
        setHasMore(nextContacts.length === 50)
        setFetchError(null)
        setPlanError(false)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('403')) {
          setPlanError(true)
        } else {
          setFetchError(msg || 'Failed to load contacts')
        }
      } finally {
        setLoading(false)
        setRefreshing(false)
        setLoadingMore(false)
      }
    },
    [],
  )

  useEffect(() => {
    void fetchContacts(true)
  }, [fetchContacts])

  const handleRefresh = () => {
    setRefreshing(true)
    setPage(1)
    void fetchContacts(true)
  }

  const handleLoadMore = () => {
    if (!hasMore || loadingMore) return
    setLoadingMore(true)
    setPage((p) => p + 1)
  }

  useEffect(() => {
    if (page > 1) void fetchContacts(false, page)
  }, [page, fetchContacts])

  const filtered = contacts.filter(
    (c) =>
      !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()),
  )

  // Plan upsell screen
  if (planError) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a', textAlign: 'center' }}>
          CRM is available on Pro and above
        </Text>
        <Text style={{ color: '#64748b', textAlign: 'center', marginTop: 8, lineHeight: 22 }}>
          Upgrade your plan to access contacts, CRM pipeline, and lead management.
        </Text>
        <TouchableOpacity
          onPress={() => void Linking.openURL('https://dotly.one/pricing')}
          style={{
            marginTop: 24,
            backgroundColor: '#0ea5e9',
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 15 }}>Upgrade Now</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // Loading screen
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 56,
          paddingBottom: 12,
          backgroundColor: '#ffffff',
          borderBottomWidth: 1,
          borderBottomColor: '#e2e8f0',
        }}
      >
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 12 }}>
          Contacts
        </Text>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search contacts..."
          placeholderTextColor="#94a3b8"
          style={{
            backgroundColor: '#f1f5f9',
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 10,
            fontSize: 14,
            color: '#0f172a',
          }}
        />
      </View>

      {/* Error banner */}
      {fetchError && (
        <View
          style={{
            backgroundColor: '#fee2e2',
            borderBottomWidth: 1,
            borderBottomColor: '#fca5a5',
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ color: '#b91c1c', fontSize: 13, flex: 1 }}>{fetchError}</Text>
          <TouchableOpacity onPress={handleRefresh}>
            <Text style={{ color: '#b91c1c', fontWeight: '700', fontSize: 13, marginLeft: 12 }}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          loadingMore ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#0ea5e9" />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={{ paddingVertical: 80, paddingHorizontal: 32, alignItems: 'center' }}>
            <Text style={{ color: '#94a3b8', textAlign: 'center', fontSize: 15, lineHeight: 24 }}>
              Your leads will appear here{'\n'}after someone scans your card
            </Text>
          </View>
        }
        contentContainerStyle={{ paddingVertical: 8 }}
        renderItem={({ item }) => {
          const stage = item.crmPipeline?.stage || 'NEW'
          return (
            <TouchableOpacity
              onPress={() => router.push(`/contact/${item.id}` as never)}
              style={{
                marginHorizontal: 16,
                marginVertical: 4,
                backgroundColor: '#ffffff',
                borderRadius: 14,
                padding: 14,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.06,
                shadowRadius: 4,
                elevation: 2,
                borderWidth: 1,
                borderColor: '#f1f5f9',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Avatar name={item.name} id={item.id} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{ fontWeight: '700', color: '#0f172a', fontSize: 15 }}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                {item.email ? (
                  <Text
                    style={{ color: '#64748b', fontSize: 13, marginTop: 1 }}
                    numberOfLines={1}
                  >
                    {item.email}
                  </Text>
                ) : null}
                {item.company ? (
                  <Text
                    style={{ color: '#94a3b8', fontSize: 12, marginTop: 1 }}
                    numberOfLines={1}
                  >
                    {item.company}
                  </Text>
                ) : null}
                {item.sourceCard ? (
                  <View
                    style={{
                      marginTop: 4,
                      alignSelf: 'flex-start',
                      backgroundColor: '#e0f2fe',
                      borderRadius: 6,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={{ color: '#0369a1', fontSize: 11, fontWeight: '600' }}>
                      @{item.sourceCard.handle}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View
                style={{
                  borderRadius: 12,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  backgroundColor: STAGE_COLORS[stage]?.bg ?? '#f1f5f9',
                }}
              >
                <Text style={{ color: STAGE_COLORS[stage]?.text ?? '#475569', fontSize: 11, fontWeight: '700' }}>
                  {stage}
                </Text>
              </View>
            </TouchableOpacity>
          )
        }}
      />

      {/* Scan Business Card FAB */}
      <ScanCardButton
        style={{
          position: 'absolute',
          bottom: 28,
          right: 20,
        }}
      />
    </View>
  )
}
