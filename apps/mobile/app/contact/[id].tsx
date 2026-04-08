import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useState, useEffect } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { api } from '../../lib/api'

interface TimelineEvent {
  id: string
  event: string
  metadata: Record<string, unknown>
  createdAt: string
}

interface ContactDetail {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  title?: string
  notes?: string
  sourceCard?: { handle: string }
  crmPipeline?: { stage: string }
  timeline?: TimelineEvent[]
}

const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED', 'LOST'] as const

// Allowlist-based URL openers — validate scheme before handing to the OS.
// Passing an arbitrary string to Linking.openURL can open non-mailto/tel URLs
// (e.g. javascript:, intent:) if contact data is tampered with server-side.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^\+?[\d\s\-().]{5,20}$/

function openEmail(email: string) {
  if (!EMAIL_RE.test(email)) {
    Alert.alert('Invalid email', 'This email address does not appear to be valid.')
    return
  }
  void Linking.openURL(`mailto:${email}`)
}

function openPhone(phone: string) {
  if (!PHONE_RE.test(phone)) {
    Alert.alert('Invalid phone', 'This phone number does not appear to be valid.')
    return
  }
  void Linking.openURL(`tel:${phone}`)
}

const DEFAULT_STAGE_STYLE = {
  bg: '#f1f5f9',
  text: '#475569',
  activeBg: '#dbeafe',
  activeText: '#1d4ed8',
}

const STAGE_COLORS: Record<
  string,
  { bg: string; text: string; activeBg: string; activeText: string }
> = {
  NEW: { bg: '#f1f5f9', text: '#475569', activeBg: '#dbeafe', activeText: '#1d4ed8' },
  CONTACTED: { bg: '#f1f5f9', text: '#475569', activeBg: '#fef9c3', activeText: '#a16207' },
  QUALIFIED: { bg: '#f1f5f9', text: '#475569', activeBg: '#f3e8ff', activeText: '#7c3aed' },
  CLOSED: { bg: '#f1f5f9', text: '#475569', activeBg: '#dcfce7', activeText: '#15803d' },
  LOST: { bg: '#f1f5f9', text: '#475569', activeBg: '#fee2e2', activeText: '#b91c1c' },
}

function getStageStyle(stage: string) {
  return STAGE_COLORS[stage] ?? DEFAULT_STAGE_STYLE
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function eventLabel(event: TimelineEvent): string {
  switch (event.event) {
    case 'LEAD_CAPTURED':
      return `Lead captured${event.metadata?.sourceHandle ? ` from @${event.metadata.sourceHandle}` : ''}`
    case 'STAGE_CHANGED':
      return `Stage changed: ${event.metadata?.from ?? '?'} → ${event.metadata?.to ?? '?'}`
    case 'NOTE_ADDED':
      return `Note: ${String(event.metadata?.content ?? '').slice(0, 60)}`
    case 'EMAIL_SENT':
      return 'Email sent'
    default:
      return event.event
  }
}

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [contact, setContact] = useState<ContactDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [stageLoading, setStageLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    void (async () => {
      try {
        const data = await api.getContact(id)
        setContact(data as ContactDetail)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load contact')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  const handleStageChange = async (stage: string) => {
    if (!id || !contact) return
    setStageLoading(true)
    try {
      await api.updateContactStage(id, stage)
      setContact((prev) => (prev ? { ...prev, crmPipeline: { ...prev.crmPipeline, stage } } : prev))
    } catch {
      // silently ignore
    } finally {
      setStageLoading(false)
    }
  }

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

  if (error || !contact) {
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
        <Text style={{ color: '#ef4444', fontSize: 15, textAlign: 'center' }}>
          {error || 'Contact not found'}
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16, padding: 12 }}>
          <Text style={{ color: '#0ea5e9', fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const currentStage = contact.crmPipeline?.stage || 'NEW'
  const initials = contact.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Navigation header */}
      <View
        style={{
          backgroundColor: '#ffffff',
          paddingTop: 56,
          paddingBottom: 12,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#e2e8f0',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: '#0ea5e9', fontSize: 16, fontWeight: '600' }}>← Back</Text>
        </TouchableOpacity>
        {stageLoading && <ActivityIndicator size="small" color="#0ea5e9" />}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* Header card */}
        <View
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            padding: 20,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
            borderWidth: 1,
            borderColor: '#f1f5f9',
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: '#8b5cf6',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 24 }}>
              {initials || '?'}
            </Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#0f172a' }}>{contact.name}</Text>
          {contact.company && (
            <Text style={{ color: '#64748b', fontSize: 14, marginTop: 2 }}>{contact.company}</Text>
          )}
          {contact.title && (
            <Text style={{ color: '#94a3b8', fontSize: 13, marginTop: 1 }}>{contact.title}</Text>
          )}
          <View
            style={{
              marginTop: 10,
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 12,
              backgroundColor: getStageStyle(currentStage).activeBg,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: getStageStyle(currentStage).activeText,
              }}
            >
              {currentStage}
            </Text>
          </View>
        </View>

        {/* Contact info */}
        <View
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            padding: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
            borderWidth: 1,
            borderColor: '#f1f5f9',
            gap: 12,
          }}
        >
          <Text style={{ fontWeight: '700', color: '#0f172a', fontSize: 15, marginBottom: 4 }}>
            Contact Info
          </Text>
          {contact.email && (
            <TouchableOpacity
              onPress={() => openEmail(contact.email!)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <Text style={{ color: '#94a3b8', fontSize: 13, width: 48 }}>Email</Text>
              <Text style={{ color: '#0ea5e9', fontSize: 14 }}>{contact.email}</Text>
            </TouchableOpacity>
          )}
          {contact.phone && (
            <TouchableOpacity
              onPress={() => openPhone(contact.phone!)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <Text style={{ color: '#94a3b8', fontSize: 13, width: 48 }}>Phone</Text>
              <Text style={{ color: '#0ea5e9', fontSize: 14 }}>{contact.phone}</Text>
            </TouchableOpacity>
          )}
          {contact.sourceCard && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ color: '#94a3b8', fontSize: 13, width: 48 }}>Card</Text>
              <Text style={{ color: '#475569', fontSize: 14 }}>@{contact.sourceCard.handle}</Text>
            </View>
          )}
        </View>

        {/* Stage selector */}
        <View
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            padding: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
            borderWidth: 1,
            borderColor: '#f1f5f9',
          }}
        >
          <Text style={{ fontWeight: '700', color: '#0f172a', fontSize: 15, marginBottom: 12 }}>
            Stage
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {STAGES.map((stage) => {
              const isActive = currentStage === stage
              const stageStyle = getStageStyle(stage)
              return (
                <TouchableOpacity
                  key={stage}
                  onPress={() => void handleStageChange(stage)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    backgroundColor: isActive ? stageStyle.activeBg : stageStyle.bg,
                    borderWidth: 1.5,
                    borderColor: isActive ? stageStyle.activeText : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: isActive ? stageStyle.activeText : stageStyle.text,
                    }}
                  >
                    {stage}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Notes (read-only) */}
        <View
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            padding: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
            borderWidth: 1,
            borderColor: '#f1f5f9',
          }}
        >
          <Text style={{ fontWeight: '700', color: '#0f172a', fontSize: 15, marginBottom: 8 }}>
            Notes
          </Text>
          {contact.notes ? (
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 22 }}>{contact.notes}</Text>
          ) : (
            <Text style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>
              No notes yet.
            </Text>
          )}
          <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 10, fontStyle: 'italic' }}>
            Notes editing coming soon
          </Text>
        </View>

        {/* Timeline */}
        {contact.timeline && contact.timeline.length > 0 && (
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 4,
              elevation: 2,
              borderWidth: 1,
              borderColor: '#f1f5f9',
            }}
          >
            <Text style={{ fontWeight: '700', color: '#0f172a', fontSize: 15, marginBottom: 12 }}>
              Timeline
            </Text>
            <View style={{ gap: 12 }}>
              {contact.timeline.map((event) => (
                <View key={event.id} style={{ flexDirection: 'row', gap: 10 }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#0ea5e9',
                      marginTop: 5,
                      flexShrink: 0,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, color: '#475569', lineHeight: 20 }}>
                      {eventLabel(event)}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                      {relativeTime(event.createdAt)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Bottom padding */}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  )
}
