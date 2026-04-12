import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'expo-router'
import { api, isApiError } from '../../lib/api'
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
  enrichmentScore?: number | null
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

// Returns a background colour for the enrichment score badge based on score tier.
function scoreBadgeColors(score: number): { bg: string; text: string } {
  if (score >= 75) return { bg: '#dcfce7', text: '#15803d' }
  if (score >= 50) return { bg: '#fef9c3', text: '#a16207' }
  return { bg: '#fee2e2', text: '#b91c1c' }
}

const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED', 'LOST'] as const
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^\+?[\d\s\-().]{5,20}$/
const CONTACTS_PAGE_SIZE = 25

function normalizeWebsite(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function validateContactFields(input: {
  email?: string
  phone?: string
  website?: string
}): string | null {
  if (input.email && !EMAIL_RE.test(input.email)) return 'Enter a valid email address.'
  if (input.phone && !PHONE_RE.test(input.phone)) return 'Enter a valid phone number.'
  if (input.website) {
    try {
      const url = new URL(normalizeWebsite(input.website) ?? '')
      if (!['http:', 'https:'].includes(url.protocol)) return 'Enter a valid website URL.'
    } catch {
      return 'Enter a valid website URL.'
    }
  }
  return null
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

// M9: Create Contact Modal
function CreateContactModal({
  visible,
  onClose,
  onCreated,
}: {
  visible: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [title, setTitle] = useState('')
  const [website, setWebsite] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [tags, setTags] = useState('')
  const [stage, setStage] = useState<(typeof STAGES)[number]>('NEW')
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setName('')
    setEmail('')
    setPhone('')
    setCompany('')
    setTitle('')
    setWebsite('')
    setAddress('')
    setNotes('')
    setTags('')
    setStage('NEW')
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a contact name.')
      return
    }
    const validationError = validateContactFields({
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      website: website.trim() || undefined,
    })
    if (validationError) {
      Alert.alert('Validation', validationError)
      return
    }
    setSubmitting(true)
    try {
      await api.createContact({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        company: company.trim() || undefined,
        title: title.trim() || undefined,
        website: normalizeWebsite(website),
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
        tags: tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        stage,
      })
      reset()
      onCreated()
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create contact')
    } finally {
      setSubmitting(false)
    }
  }

  const inputStyle = {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    marginBottom: 10,
  }

  const labelStyle = {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 4,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: '#ffffff',
            paddingTop: Platform.OS === 'ios' ? 56 : 32,
            paddingHorizontal: 20,
          }}
        >
          {/* Modal header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 24,
            }}
          >
            <TouchableOpacity
              onPress={() => {
                reset()
                onClose()
              }}
            >
              <Text style={{ color: '#64748b', fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{ fontWeight: '800', fontSize: 16, color: '#0f172a' }}>Add Contact</Text>
            <TouchableOpacity onPress={() => void handleCreate()} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator size="small" color="#0ea5e9" />
              ) : (
                <Text style={{ color: '#0ea5e9', fontWeight: '700', fontSize: 15 }}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={labelStyle}>FULL NAME *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Jane Smith"
              placeholderTextColor="#94a3b8"
              autoFocus
              style={inputStyle}
            />

            <Text style={labelStyle}>EMAIL</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="jane@example.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              style={inputStyle}
            />

            <Text style={labelStyle}>PHONE</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 555 000 0000"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              style={inputStyle}
            />

            <Text style={labelStyle}>COMPANY</Text>
            <TextInput
              value={company}
              onChangeText={setCompany}
              placeholder="Acme Corp"
              placeholderTextColor="#94a3b8"
              style={inputStyle}
            />

            <Text style={labelStyle}>JOB TITLE</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="CEO"
              placeholderTextColor="#94a3b8"
              style={inputStyle}
            />

            <Text style={labelStyle}>WEBSITE</Text>
            <TextInput
              value={website}
              onChangeText={setWebsite}
              placeholder="https://example.com"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              style={inputStyle}
            />

            <Text style={labelStyle}>ADDRESS</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="123 Main St, New York"
              placeholderTextColor="#94a3b8"
              style={inputStyle}
            />

            <Text style={labelStyle}>TAGS</Text>
            <TextInput
              value={tags}
              onChangeText={setTags}
              placeholder="sales, vip"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              style={inputStyle}
            />

            <Text style={labelStyle}>STAGE</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 10 }}
              style={{ marginBottom: 10 }}
            >
              {STAGES.map((stageOption) => {
                const colors = STAGE_COLORS[stageOption] ?? { bg: '#f1f5f9', text: '#475569' }
                const selected = stage === stageOption
                return (
                  <Pressable
                    key={stageOption}
                    onPress={() => setStage(stageOption)}
                    style={{
                      borderRadius: 12,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      backgroundColor: colors.bg,
                      borderWidth: 1,
                      borderColor: selected ? colors.text : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        color: colors.text,
                        fontSize: 11,
                        fontWeight: '700',
                      }}
                    >
                      {stageOption}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>

            <Text style={labelStyle}>NOTES</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add context for this contact"
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              style={[inputStyle, { minHeight: 110, paddingTop: 12, marginBottom: 24 }]}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

export default function ContactsTab() {
  const router = useRouter()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [viewMode, setViewMode] = useState<'list' | 'board'>('list')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [planError, setPlanError] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [pendingPage, setPendingPage] = useState<number | null>(null)
  const [failedPage, setFailedPage] = useState<number | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [renderedQuery, setRenderedQuery] = useState('')

  // M6: Debounced server-side search — search is sent to the API,
  // not filtered client-side, so it works across all pages.
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestSearchRef = useRef('')
  const contactsRequestIdRef = useRef(0)

  const fetchContacts = useCallback(
    async (reset = false, currentPage?: number, searchQuery?: string) => {
      const requestId = ++contactsRequestIdRef.current
      const pageToFetch = reset ? 1 : (currentPage ?? 1)
      try {
        const q = searchQuery !== undefined ? searchQuery : latestSearchRef.current
        const data = await api.getContacts(pageToFetch, CONTACTS_PAGE_SIZE, q)
        if (contactsRequestIdRef.current !== requestId) return
        const nextContacts = data.items as Contact[]
        if (reset) {
          setContacts(nextContacts)
          setPage(1)
          setRenderedQuery(q)
        } else {
          setContacts((prev) => (pageToFetch === 1 ? nextContacts : [...prev, ...nextContacts]))
          setPage(pageToFetch)
        }
        setHasMore(nextContacts.length === CONTACTS_PAGE_SIZE)
        setFetchError(null)
        setPlanError(false)
        setPendingPage(null)
        setFailedPage(null)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        if (isApiError(err) && err.statusCode === 403) {
          setPlanError(true)
        } else {
          setFetchError(msg || 'Failed to load contacts')
        }
        if (!reset) setFailedPage(pageToFetch)
      } finally {
        if (contactsRequestIdRef.current === requestId) {
          setLoading(false)
          setRefreshing(false)
          setLoadingMore(false)
        }
      }
    },
    [],
  )

  useEffect(() => {
    void fetchContacts(true)
  }, [fetchContacts])

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    setPage(1)
    setPendingPage(null)
    setFailedPage(null)
    void fetchContacts(true, 1, search)
  }

  const handleLoadMore = () => {
    if (!hasMore || loadingMore || pendingPage !== null) return
    setLoadingMore(true)
    const nextPage = failedPage ?? page + 1
    setPendingPage(nextPage)
    void fetchContacts(false, nextPage)
  }

  const contactsByStage = useMemo(
    () =>
      contacts.reduce<Record<(typeof STAGES)[number], Contact[]>>(
        (acc, contact) => {
          const stage = contact.crmPipeline?.stage ?? 'NEW'
          const normalizedStage = STAGES.includes(stage as (typeof STAGES)[number])
            ? (stage as (typeof STAGES)[number])
            : 'NEW'
          acc[normalizedStage].push(contact)
          return acc
        },
        {
          NEW: [],
          CONTACTED: [],
          QUALIFIED: [],
          CLOSED: [],
          LOST: [],
        },
      ),
    [contacts],
  )

  // M6: Server-side search with 350ms debounce
  const handleSearchChange = (text: string) => {
    setSearch(text)
    latestSearchRef.current = text
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setLoading(true)
      void fetchContacts(true, 1, text)
    }, 350)
  }

  // Plan upsell screen
  if (planError) {
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
  if (loading && contacts.length === 0) {
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
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#0f172a' }}>Contacts</Text>
          {/* M9: Add Contact button */}
          <TouchableOpacity
            onPress={() => setShowCreateModal(true)}
            accessibilityRole="button"
            accessibilityLabel="Add contact"
            accessibilityHint="Opens the create contact form"
            style={{
              backgroundColor: '#0ea5e9',
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 7,
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}>+ Add</Text>
          </TouchableOpacity>
        </View>
        {/* M6: Search input wired to server-side search */}
        <TextInput
          value={search}
          onChangeText={handleSearchChange}
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

        <View
          style={{
            flexDirection: 'row',
            backgroundColor: '#f1f5f9',
            borderRadius: 12,
            padding: 4,
            marginTop: 12,
          }}
        >
          {(['list', 'board'] as const).map((mode) => {
            const active = viewMode === mode
            return (
              <Pressable
                key={mode}
                onPress={() => setViewMode(mode)}
                accessibilityRole="button"
                accessibilityLabel={mode === 'list' ? 'List view' : 'Board view'}
                accessibilityState={{ selected: active }}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  backgroundColor: active ? '#ffffff' : 'transparent',
                }}
              >
                <Text
                  style={{
                    textAlign: 'center',
                    fontSize: 14,
                    fontWeight: '700',
                    color: active ? '#0f172a' : '#64748b',
                  }}
                >
                  {mode === 'list' ? 'List' : 'Board'}
                </Text>
              </Pressable>
            )
          })}
        </View>
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
            <Text
              accessible
              accessibilityRole="button"
              accessibilityLabel="Retry loading contacts"
              accessibilityHint="Reloads the contacts list"
              style={{ color: '#b91c1c', fontWeight: '700', fontSize: 13, marginLeft: 12 }}
            >
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {fetchError && renderedQuery !== search && contacts.length > 0 && (
        <View style={{ backgroundColor: '#fff7ed', paddingHorizontal: 16, paddingVertical: 10 }}>
          <Text style={{ color: '#c2410c', fontSize: 12 }}>
            Showing results for “{renderedQuery}” because the latest search could not be loaded.
          </Text>
        </View>
      )}

      {viewMode === 'list' ? (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#0ea5e9" />
              </View>
            ) : failedPage !== null && fetchError ? (
              <TouchableOpacity
                onPress={handleLoadMore}
                style={{ paddingVertical: 16, alignItems: 'center' }}
              >
                <Text style={{ color: '#0ea5e9', fontWeight: '600' }}>Retry loading more</Text>
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            loading ? (
              <View style={{ paddingVertical: 80, alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0ea5e9" />
              </View>
            ) : (
              <View style={{ paddingVertical: 80, paddingHorizontal: 32, alignItems: 'center' }}>
                <Text
                  style={{ color: '#94a3b8', textAlign: 'center', fontSize: 15, lineHeight: 24 }}
                >
                  {search
                    ? `No contacts match "${search}"`
                    : 'Your leads will appear here\nafter someone scans your card'}
                </Text>
              </View>
            )
          }
          contentContainerStyle={{ paddingVertical: 8 }}
          renderItem={({ item }) => {
            const stage = item.crmPipeline?.stage || 'NEW'
            return (
              <TouchableOpacity
                onPress={() => router.push(`/contact/${item.id}` as never)}
                accessibilityRole="button"
                accessibilityLabel={`Open contact ${item.name}`}
                accessibilityHint="Opens this contact's details"
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
                {/* Right-side badges: score + stage */}
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  {item.enrichmentScore != null && (
                    <View
                      style={{
                        borderRadius: 10,
                        paddingHorizontal: 7,
                        paddingVertical: 3,
                        backgroundColor: scoreBadgeColors(item.enrichmentScore).bg,
                      }}
                    >
                      <Text
                        style={{
                          color: scoreBadgeColors(item.enrichmentScore).text,
                          fontSize: 10,
                          fontWeight: '700',
                        }}
                      >
                        AI {item.enrichmentScore}
                      </Text>
                    </View>
                  )}
                  <View
                    style={{
                      borderRadius: 12,
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      backgroundColor: STAGE_COLORS[stage]?.bg ?? '#f1f5f9',
                    }}
                  >
                    <Text
                      style={{
                        color: STAGE_COLORS[stage]?.text ?? '#475569',
                        fontSize: 11,
                        fontWeight: '700',
                      }}
                    >
                      {stage}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )
          }}
        />
      ) : contacts.length === 0 ? (
        <View style={{ paddingVertical: 80, paddingHorizontal: 32, alignItems: 'center' }}>
          <Text style={{ color: '#94a3b8', textAlign: 'center', fontSize: 15, lineHeight: 24 }}>
            {search
              ? `No contacts match "${search}"`
              : 'Your leads will appear here\nafter someone scans your card'}
          </Text>
          <TouchableOpacity onPress={handleRefresh} style={{ marginTop: 16 }}>
            <Text style={{ color: '#0ea5e9', fontWeight: '600' }}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <TouchableOpacity onPress={handleRefresh} style={{ alignSelf: 'flex-start' }}>
              <Text style={{ color: '#0ea5e9', fontWeight: '600', fontSize: 13 }}>
                Refresh board
              </Text>
            </TouchableOpacity>
          </View>
          <FlatList
            horizontal
            data={STAGES}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
            initialNumToRender={3}
            maxToRenderPerBatch={3}
            windowSize={5}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 16 }}
            ListFooterComponent={
              loadingMore ? (
                <View style={{ justifyContent: 'center', paddingHorizontal: 12 }}>
                  <ActivityIndicator size="small" color="#0ea5e9" />
                </View>
              ) : failedPage !== null && fetchError ? (
                <TouchableOpacity
                  onPress={handleLoadMore}
                  style={{ justifyContent: 'center', paddingHorizontal: 12 }}
                >
                  <Text style={{ color: '#0ea5e9', fontWeight: '600', fontSize: 12 }}>
                    Retry more
                  </Text>
                </TouchableOpacity>
              ) : null
            }
            renderItem={({ item: stage }) => {
              const stageContacts = contactsByStage[stage]
              const colors = STAGE_COLORS[stage] ?? { bg: '#f1f5f9', text: '#475569' }

              return (
                <View
                  style={{
                    width: 250,
                    marginHorizontal: 8,
                    backgroundColor: '#f8fafc',
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 12,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#0f172a' }}>
                      {stage}
                    </Text>
                    <View
                      style={{
                        borderRadius: 999,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        backgroundColor: colors.bg,
                      }}
                    >
                      <Text style={{ color: colors.text, fontSize: 11, fontWeight: '700' }}>
                        {stageContacts.length}
                      </Text>
                    </View>
                  </View>

                  {stageContacts.map((contact) => (
                    <Pressable
                      key={contact.id}
                      onPress={() => router.push(`/contact/${contact.id}` as never)}
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: 14,
                        padding: 14,
                        marginBottom: 10,
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 4,
                        elevation: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <Avatar name={contact.name} id={contact.id} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}
                          numberOfLines={1}
                        >
                          {contact.name}
                        </Text>
                        {contact.company ? (
                          <Text
                            style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}
                            numberOfLines={1}
                          >
                            {contact.company}
                          </Text>
                        ) : null}
                        {contact.enrichmentScore != null && (
                          <View
                            style={{
                              marginTop: 4,
                              alignSelf: 'flex-start',
                              borderRadius: 8,
                              paddingHorizontal: 6,
                              paddingVertical: 2,
                              backgroundColor: scoreBadgeColors(contact.enrichmentScore).bg,
                            }}
                          >
                            <Text
                              style={{
                                color: scoreBadgeColors(contact.enrichmentScore).text,
                                fontSize: 10,
                                fontWeight: '700',
                              }}
                            >
                              AI {contact.enrichmentScore}
                            </Text>
                          </View>
                        )}
                      </View>
                    </Pressable>
                  ))}

                  {stageContacts.length === 0 ? (
                    <View
                      style={{
                        borderRadius: 14,
                        borderWidth: 1,
                        borderStyle: 'dashed',
                        borderColor: '#cbd5e1',
                        padding: 16,
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <Text style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>
                        No contacts
                      </Text>
                    </View>
                  ) : null}
                </View>
              )
            }}
          />
        </>
      )}

      {/* Scan Business Card FAB */}
      <ScanCardButton
        style={{
          position: 'absolute',
          bottom: 28,
          right: 20,
        }}
      />

      {/* M9: Create Contact Modal */}
      <CreateContactModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => {
          setShowCreateModal(false)
          void fetchContacts(true)
        }}
      />
    </View>
  )
}
