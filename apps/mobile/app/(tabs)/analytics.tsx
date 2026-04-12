import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CardListItemResponse } from '@dotly/types'
import {
  View,
  Text,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native'
import { useRouter } from 'expo-router'
import { api, type AnalyticsSummary } from '../../lib/api'
import { useAuthz } from '../../components/AuthzProvider'

interface CardAnalytics {
  card: CardListItemResponse
  summary: AnalyticsSummary | null
  failed?: boolean
}

function StatTile({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
      }}
    >
      <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600' }}>{label}</Text>
      <Text style={{ fontSize: 24, color, fontWeight: '800', marginTop: 8 }}>{value}</Text>
    </View>
  )
}

export default function AnalyticsTab() {
  const router = useRouter()
  const {
    analyticsAllowed,
    loading: authzLoading,
    error: authzError,
    refresh: refreshAuthz,
  } = useAuthz()
  const [cards, setCards] = useState<CardListItemResponse[]>([])
  const [analytics, setAnalytics] = useState<CardAnalytics[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadAnalytics = useCallback(async () => {
    try {
      setError(null)
      const cardList = await api.getCards()
      setCards(cardList)

      const summaries = await Promise.all(
        cardList.map(async (card) => {
          try {
            const summary = await api.getAnalyticsSummary(card.id)
            return { card, summary, failed: false }
          } catch {
            return { card, summary: null, failed: true }
          }
        }),
      )

      setAnalytics(summaries)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadAnalytics()
  }, [loadAnalytics])

  const totals = useMemo(() => {
    return analytics.reduce(
      (acc, entry) => {
        acc.views += entry.summary?.totalViews ?? 0
        acc.clicks += entry.summary?.totalClicks ?? 0
        acc.leads += entry.summary?.totalLeads ?? 0
        return acc
      },
      { views: 0, clicks: 0, leads: 0 },
    )
  }, [analytics])
  const hasPartialAnalytics = analytics.some((entry) => entry.failed)

  if (!authzLoading && !analyticsAllowed) {
    if (authzError) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <Text
              style={{ fontSize: 18, fontWeight: '700', color: '#0f172a', textAlign: 'center' }}
            >
              We couldn&apos;t verify access
            </Text>
            <Text style={{ color: '#64748b', textAlign: 'center', marginTop: 8 }}>
              {authzError}
            </Text>
            <TouchableOpacity
              onPress={() => void refreshAuthz()}
              style={{ marginTop: 16, padding: 12 }}
            >
              <Text style={{ color: '#0ea5e9', fontWeight: '600' }}>Retry</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )
    }
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a', textAlign: 'center' }}>
            Analytics are available on paid plans
          </Text>
          <Text style={{ color: '#64748b', textAlign: 'center', marginTop: 8 }}>
            Upgrade your plan to see engagement analytics across your cards.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      </SafeAreaView>
    )
  }

  if (error && cards.length === 0 && analytics.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <Text style={{ color: '#ef4444', fontSize: 15, textAlign: 'center' }}>{error}</Text>
          <TouchableOpacity
            onPress={() => void loadAnalytics()}
            style={{ marginTop: 16, padding: 12 }}
          >
            <Text style={{ color: '#0ea5e9', fontWeight: '600' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              void loadAnalytics()
            }}
          />
        }
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 12,
            backgroundColor: '#ffffff',
            borderBottomWidth: 1,
            borderBottomColor: '#e2e8f0',
          }}
        >
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#0f172a', letterSpacing: -0.5 }}>
            Analytics
          </Text>
          <Text style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>
            Live performance across all your cards.
          </Text>
        </View>

        {error ? (
          <View style={{ margin: 16, backgroundColor: '#fee2e2', borderRadius: 12, padding: 14 }}>
            <Text style={{ color: '#b91c1c', fontSize: 13 }}>{error}</Text>
          </View>
        ) : null}
        {hasPartialAnalytics ? (
          <View style={{ margin: 16, backgroundColor: '#fff7ed', borderRadius: 12, padding: 14 }}>
            <Text style={{ color: '#c2410c', fontSize: 13 }}>
              Some card analytics could not be loaded. Totals below are incomplete.
            </Text>
          </View>
        ) : null}

        <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 12 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <StatTile label="Total Views" value={totals.views} color="#0ea5e9" />
            <StatTile label="Total Clicks" value={totals.clicks} color="#8b5cf6" />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <StatTile label="Total Leads" value={totals.leads} color="#10b981" />
            <StatTile label="Cards" value={cards.length} color="#f59e0b" />
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 12 }}>
          {analytics.length === 0 ? (
            <View
              style={{
                backgroundColor: '#ffffff',
                borderRadius: 16,
                padding: 20,
                borderWidth: 1,
                borderColor: '#e2e8f0',
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#0f172a' }}>
                No cards yet
              </Text>
              <Text style={{ fontSize: 13, color: '#64748b', marginTop: 6, lineHeight: 20 }}>
                Create and share a card to start collecting views, clicks, and leads.
              </Text>
            </View>
          ) : (
            analytics.map(({ card, summary, failed }) => (
              <TouchableOpacity
                key={card.id}
                onPress={() => router.push(`/card/${card.id}`)}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                }}
                accessibilityRole="button"
                accessibilityLabel={`Open analytics source card ${card.fields?.name ?? card.handle}`}
                accessibilityHint="Opens this card's details"
              >
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#0f172a' }}>
                  {card.fields?.name ?? card.handle}
                </Text>
                <Text style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>@{card.handle}</Text>
                {failed ? (
                  <View
                    style={{
                      marginTop: 10,
                      borderRadius: 10,
                      backgroundColor: '#fff7ed',
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: '#c2410c' }}>
                      This card&apos;s analytics could not be loaded. Values below may be
                      incomplete.
                    </Text>
                  </View>
                ) : null}

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                  <View
                    style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12 }}
                  >
                    <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '600' }}>Views</Text>
                    <Text
                      style={{ fontSize: 18, color: '#0f172a', fontWeight: '800', marginTop: 4 }}
                    >
                      {summary?.totalViews ?? 0}
                    </Text>
                  </View>
                  <View
                    style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12 }}
                  >
                    <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '600' }}>
                      Clicks
                    </Text>
                    <Text
                      style={{ fontSize: 18, color: '#0f172a', fontWeight: '800', marginTop: 4 }}
                    >
                      {summary?.totalClicks ?? 0}
                    </Text>
                  </View>
                  <View
                    style={{ flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12 }}
                  >
                    <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '600' }}>Leads</Text>
                    <Text
                      style={{ fontSize: 18, color: '#0f172a', fontWeight: '800', marginTop: 4 }}
                    >
                      {summary?.totalLeads ?? 0}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
