import { useEffect, useState } from 'react'
import type { CardEditorResponse } from '@dotly/types'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Share,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Image,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { api, type AnalyticsSummary } from '../../lib/api'
import { NfcWriteButton } from '../../components/NfcWriteButton'

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [card, setCard] = useState<CardEditorResponse | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [analyticsError, setAnalyticsError] = useState<string | null>(null)

  const loadAnalytics = async () => {
    if (!id) return
    try {
      const summary = await api.getAnalyticsSummary(id)
      setAnalytics(summary)
      setAnalyticsError(null)
    } catch (err) {
      setAnalytics(null)
      setAnalyticsError(err instanceof Error ? err.message : 'Analytics are unavailable.')
    }
  }

  const loadCard = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const cardResult = await api.getCard(id)
      setCard(cardResult)
      void loadAnalytics()
    } catch (err) {
      setCard(null)
      setError(err instanceof Error ? err.message : 'Failed to load card')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!id) return
    void loadCard()
  }, [id])

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      </SafeAreaView>
    )
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#ef4444', textAlign: 'center' }}>{error}</Text>
          <TouchableOpacity onPress={() => void loadCard()} style={{ marginTop: 16, padding: 12 }}>
            <Text style={{ color: '#0ea5e9', fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  if (!card) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#64748b' }}>Card not found.</Text>
        </View>
      </SafeAreaView>
    )
  }

  const cardUrl = `https://dotly.one/card/${card.handle}`
  const primaryColor = card.theme?.primaryColor ?? '#0ea5e9'
  const fields = card.fields ?? {}

  async function handleShare() {
    try {
      await Share.share({
        message: `Check out my card: ${cardUrl}`,
        url: cardUrl,
      })
    } catch {
      // user cancelled — ignore
    }
  }

  async function handleCopyLink() {
    await Clipboard.setStringAsync(cardUrl)
    Alert.alert('Copied', 'Link copied to clipboard!')
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#ffffff',
          borderBottomWidth: 1,
          borderBottomColor: '#e2e8f0',
        }}
      >
        <TouchableOpacity onPress={() => router.replace('/(tabs)')} style={{ marginRight: 12 }}>
          <Text style={{ color: '#0ea5e9', fontSize: 16 }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '700', color: '#0f172a', flex: 1 }}>
          {fields.name ?? card.handle}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Card info */}
        <View
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: '#e2e8f0',
            marginBottom: 16,
          }}
        >
          {/* Color band */}
          <View style={{ height: 64, backgroundColor: primaryColor }} />

          {/* Avatar */}
          <View style={{ alignItems: 'center', marginTop: -28 }}>
            {fields.avatarUrl ? (
              <Image
                source={{ uri: fields.avatarUrl }}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  borderWidth: 3,
                  borderColor: '#ffffff',
                  backgroundColor: '#e2e8f0',
                }}
              />
            ) : (
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: primaryColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 3,
                  borderColor: '#ffffff',
                }}
              >
                <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 20 }}>
                  {((fields.name ?? card.handle ?? 'C')[0] ?? 'C').toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <View style={{ padding: 16, alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a' }}>{fields.name}</Text>
            {fields.title ? (
              <Text style={{ color: '#64748b', fontSize: 14, marginTop: 2 }}>{fields.title}</Text>
            ) : null}
            {fields.company ? (
              <Text style={{ color: '#94a3b8', fontSize: 13 }}>{fields.company}</Text>
            ) : null}
            {fields.bio ? (
              <Text
                style={{
                  color: '#64748b',
                  fontSize: 13,
                  textAlign: 'center',
                  marginTop: 8,
                  lineHeight: 18,
                }}
              >
                {fields.bio}
              </Text>
            ) : null}
            <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 8 }}>
              dotly.one/card/{card.handle}
            </Text>
          </View>
        </View>

        {/* Card URL */}
        <View
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 16,
            padding: 20,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: '#e2e8f0',
            marginBottom: 16,
          }}
        >
          <Text style={{ fontWeight: '600', color: '#0f172a', marginBottom: 12 }}>Card URL</Text>
          <View
            style={{
              width: '100%',
              backgroundColor: '#f1f5f9',
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: '#e2e8f0',
              paddingHorizontal: 16,
              paddingVertical: 20,
            }}
          >
            <Text
              style={{ color: '#0f172a', textAlign: 'center', fontSize: 14, fontWeight: '600' }}
            >
              {cardUrl}
            </Text>
          </View>
          <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 8 }}>
            Share or copy this link from mobile. QR display is not available in this build.
          </Text>
        </View>

        {/* Action buttons */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => {
              void handleShare()
            }}
            style={{
              flex: 1,
              backgroundColor: '#0ea5e9',
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 14 }}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              void handleCopyLink()
            }}
            style={{
              flex: 1,
              backgroundColor: '#f1f5f9',
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#e2e8f0',
            }}
          >
            <Text style={{ color: '#0f172a', fontWeight: '600', fontSize: 14 }}>Copy Link</Text>
          </TouchableOpacity>
        </View>

        {/* NFC Tag Writing */}
        <NfcWriteButton handle={card.handle} />

        {/* Analytics summary */}
        {analyticsError ? (
          <View
            style={{
              backgroundColor: '#fff7ed',
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: '#fdba74',
              marginBottom: 16,
            }}
          >
            <Text style={{ color: '#9a3412', fontSize: 13 }}>{analyticsError}</Text>
            <TouchableOpacity onPress={() => void loadAnalytics()} style={{ marginTop: 8 }}>
              <Text style={{ color: '#0ea5e9', fontWeight: '600' }}>Retry analytics</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {analytics && (
          <View
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: '#e2e8f0',
            }}
          >
            <Text style={{ fontWeight: '600', color: '#0f172a', marginBottom: 12 }}>Analytics</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { label: 'Views', value: analytics.totalViews },
                { label: 'Clicks', value: analytics.totalClicks },
                { label: 'Leads', value: analytics.totalLeads },
              ].map((stat) => (
                <View
                  key={stat.label}
                  style={{
                    flex: 1,
                    backgroundColor: '#f8fafc',
                    borderRadius: 10,
                    padding: 12,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                  }}
                >
                  <Text style={{ fontSize: 20, fontWeight: '700', color: '#0ea5e9' }}>
                    {stat.value}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
