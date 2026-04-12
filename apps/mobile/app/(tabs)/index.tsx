import { useEffect, useState, useCallback } from 'react'
import type { CardListItemResponse } from '@dotly/types'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { api } from '../../lib/api'

export default function CardsTab() {
  const [cards, setCards] = useState<CardListItemResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const fetchCards = useCallback(async () => {
    try {
      setError(null)
      const data = await api.getCards()
      setCards(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load cards')
      if (__DEV__) {
        console.error('Failed to fetch cards', e)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void fetchCards()
  }, [fetchCards])

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      </SafeAreaView>
    )
  }

  if (error && cards.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 8 }}>
            Could not load cards
          </Text>
          <Text style={{ fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20 }}>
            {error}
          </Text>
          <TouchableOpacity
            onPress={() => void fetchCards()}
            style={{
              marginTop: 20,
              backgroundColor: '#0ea5e9',
              borderRadius: 12,
              paddingHorizontal: 24,
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 14 }}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8fafc' }}>
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
          My Cards
        </Text>
      </View>

      <FlatList
        data={cards}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          error ? (
            <View
              style={{
                marginHorizontal: 16,
                marginTop: 16,
                backgroundColor: '#fef2f2',
                borderRadius: 12,
                padding: 14,
                borderWidth: 1,
                borderColor: '#fecaca',
              }}
            >
              <Text style={{ color: '#b91c1c', fontSize: 13, lineHeight: 18 }}>{error}</Text>
              <TouchableOpacity onPress={() => void fetchCards()} style={{ marginTop: 10 }}>
                <Text style={{ color: '#b91c1c', fontWeight: '700', fontSize: 13 }}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              void fetchCards()
            }}
            tintColor="#0ea5e9"
          />
        }
        ListEmptyComponent={
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingTop: 80,
              paddingHorizontal: 32,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 8 }}>
              {error ? 'Could not load cards' : 'No cards yet'}
            </Text>
            <Text style={{ fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20 }}>
              {error
                ? 'Check your connection and try again.'
                : 'Tap the + button to create your first card'}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/create-card')}
              accessibilityRole="button"
              accessibilityLabel="Create card"
              accessibilityHint="Opens the card creation screen"
              style={{
                marginTop: 20,
                backgroundColor: '#0ea5e9',
                borderRadius: 12,
                paddingHorizontal: 24,
                paddingVertical: 12,
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 14 }}>Create Card</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/card/${item.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`Open card ${item.fields?.name ?? item.handle}`}
            accessibilityHint="Opens this card's details"
            style={{
              marginHorizontal: 16,
              marginTop: 12,
              backgroundColor: '#ffffff',
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: '#e2e8f0',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: '#0ea5e9',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 18 }}>
                  {((item.fields?.name ?? item.handle ?? 'C')[0] ?? 'C').toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', color: '#0f172a', fontSize: 15 }}>
                  {item.fields?.name ?? item.handle}
                </Text>
                <Text style={{ color: '#64748b', fontSize: 13 }}>
                  {item.fields?.title ?? 'No title'}
                </Text>
                <Text style={{ color: '#94a3b8', fontSize: 12 }}>/{item.handle}</Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {/* Edit button */}
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation()
                    router.push(`/card/edit/${item.id}`)
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit card ${item.fields?.name ?? item.handle}`}
                  accessibilityHint="Opens the edit screen for this card"
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    backgroundColor: '#f1f5f9',
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#0f172a' }}>Edit</Text>
                </TouchableOpacity>

                {/* Status badge */}
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 9999,
                    backgroundColor: item.isActive ? '#dcfce7' : '#f1f5f9',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '600',
                      color: item.isActive ? '#15803d' : '#64748b',
                    }}
                  >
                    {item.isActive ? 'Live' : 'Draft'}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
      />

      {/* FAB — Create new card */}
      <TouchableOpacity
        onPress={() => router.push('/(tabs)/create-card')}
        accessibilityRole="button"
        accessibilityLabel="Create a new card"
        accessibilityHint="Opens the card creation screen"
        style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: '#0ea5e9',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#0ea5e9',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Text style={{ color: '#ffffff', fontSize: 28, fontWeight: '300', lineHeight: 32 }}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}
