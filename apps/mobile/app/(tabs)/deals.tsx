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
import { useRouter } from 'expo-router'
import { api } from '../../lib/api'
import { formatDate, getUserTimezone } from '../../lib/tz'
import { useAuthz } from '../../components/AuthzProvider'

interface Deal {
  id: string
  title: string
  value: number | string
  currency: string
  stage: string
  probability: number | string
  closeDate: string | null
  contact?: { id: string; name: string }
}

const STAGE_ORDER = ['PROSPECT', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'] as const

const STAGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  PROSPECT: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  PROPOSAL: { bg: '#fef9c3', text: '#a16207', border: '#fde68a' },
  NEGOTIATION: { bg: '#f3e8ff', text: '#7c3aed', border: '#ddd6fe' },
  CLOSED_WON: { bg: '#dcfce7', text: '#15803d', border: '#bbf7d0' },
  CLOSED_LOST: { bg: '#fee2e2', text: '#b91c1c', border: '#fecaca' },
}

function stageLabel(stage: string): string {
  return stage.replace('_', ' ')
}

function formatValue(value: number | string, currency: string): string {
  const num = Number(value)
  if (!num) return ''
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(num)
  } catch {
    return `$${num}`
  }
}

export default function DealsScreen() {
  const router = useRouter()
  const { crmAllowed, loading: authzLoading } = useAuthz()
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userTz, setUserTz] = useState<string | null>(null)
  const [busyDealIds, setBusyDealIds] = useState<Set<string>>(new Set())

  const mutateBusyDealState = useCallback((dealId: string, busy: boolean) => {
    setBusyDealIds((prev) => {
      const next = new Set(prev)
      if (busy) next.add(dealId)
      else next.delete(dealId)
      return next
    })
  }, [])

  const loadDeals = useCallback(async () => {
    try {
      const [data, tz] = await Promise.all([api.getAllDeals(), getUserTimezone()])
      setDeals(data as Deal[])
      setUserTz(tz)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load deals')
    }
  }, [])

  useEffect(() => {
    void loadDeals().finally(() => setLoading(false))
  }, [loadDeals])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadDeals()
    setRefreshing(false)
  }, [loadDeals])

  const handleChangeStage = useCallback(
    async (deal: Deal) => {
      if (busyDealIds.has(deal.id)) return
      const stages = STAGE_ORDER as readonly string[]
      const currentIdx = stages.indexOf(deal.stage)
      const nextStage = stages[(currentIdx + 1) % stages.length] ?? stages[0]!
      mutateBusyDealState(deal.id, true)
      try {
        await api.updateDealStage(deal.id, nextStage)
        setDeals((prev) => prev.map((d) => (d.id === deal.id ? { ...d, stage: nextStage } : d)))
      } catch (err: unknown) {
        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update stage')
      } finally {
        mutateBusyDealState(deal.id, false)
      }
    },
    [busyDealIds, mutateBusyDealState],
  )

  const handleDelete = useCallback(
    (dealId: string) => {
      if (busyDealIds.has(dealId)) return
      Alert.alert('Delete Deal', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            mutateBusyDealState(dealId, true)
            try {
              await api.deleteDeal(dealId)
              setDeals((prev) => prev.filter((d) => d.id !== dealId))
            } catch (err: unknown) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete deal')
            } finally {
              mutateBusyDealState(dealId, false)
            }
          },
        },
      ])
    },
    [busyDealIds, mutateBusyDealState],
  )

  // Group deals by stage
  const grouped = STAGE_ORDER.map((stage) => ({
    stage,
    items: deals.filter((d) => d.stage === stage),
  }))

  if (!authzLoading && !crmAllowed) {
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
          Deals are available on paid plans
        </Text>
        <Text style={{ color: '#64748b', textAlign: 'center', marginTop: 8 }}>
          Upgrade your plan to access deal tracking and pipeline workflows.
        </Text>
      </View>
    )
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
        <TouchableOpacity onPress={() => void loadDeals()} style={{ marginTop: 16, padding: 12 }}>
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
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#0f172a' }}>Deals</Text>
        <Text style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
          {deals.length} deal{deals.length !== 1 ? 's' : ''} total
        </Text>
      </View>

      <FlatList
        data={grouped}
        keyExtractor={(item) => item.stage}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor="#0ea5e9"
          />
        }
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
        renderItem={({ item: group }) => {
          const colors = STAGE_COLORS[group.stage] ?? STAGE_COLORS.PROSPECT!
          return (
            <View
              style={{
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: '#ffffff',
                overflow: 'hidden',
              }}
            >
              {/* Stage header */}
              <View
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  backgroundColor: colors.bg,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text style={{ fontWeight: '700', fontSize: 13, color: colors.text }}>
                  {stageLabel(group.stage)}
                </Text>
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 20,
                    backgroundColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>
                    {group.items.length}
                  </Text>
                </View>
              </View>

              {/* Deals in this stage */}
              {group.items.length === 0 ? (
                <View style={{ paddingHorizontal: 14, paddingVertical: 12 }}>
                  <Text style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic' }}>
                    No deals in this stage
                  </Text>
                </View>
              ) : (
                group.items.map((deal, idx) =>
                  (() => {
                    const busy = busyDealIds.has(deal.id)
                    return (
                      <TouchableOpacity
                        disabled={!deal.contact?.id}
                        onPress={() => {
                          if (deal.contact?.id) router.push(`/contact/${deal.contact.id}`)
                        }}
                        key={deal.id}
                        style={{
                          paddingHorizontal: 14,
                          paddingVertical: 12,
                          borderTopWidth: idx === 0 ? 1 : 1,
                          borderTopColor: '#f1f5f9',
                        }}
                        accessibilityRole={deal.contact?.id ? 'button' : undefined}
                        accessibilityLabel={
                          deal.contact?.id ? `Open contact for deal ${deal.title}` : undefined
                        }
                        accessibilityHint={
                          deal.contact?.id ? 'Opens the related contact details' : undefined
                        }
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#0f172a' }}>
                              {deal.title}
                            </Text>
                            {deal.contact && (
                              <Text style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
                                {deal.contact.name}
                              </Text>
                            )}
                            {Number(deal.value) > 0 && (
                              <Text
                                style={{
                                  fontSize: 13,
                                  fontWeight: '700',
                                  color: '#16a34a',
                                  marginTop: 4,
                                }}
                              >
                                {formatValue(deal.value, deal.currency)}
                              </Text>
                            )}
                            {deal.closeDate && (
                              <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                                Close: {formatDate(deal.closeDate, userTz)}
                              </Text>
                            )}
                          </View>
                          <View style={{ gap: 6, alignItems: 'flex-end' }}>
                            <TouchableOpacity
                              disabled={busy}
                              onPress={() => void handleChangeStage(deal)}
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 8,
                                backgroundColor: colors.bg,
                                borderWidth: 1,
                                borderColor: colors.border,
                                opacity: busy ? 0.5 : 1,
                              }}
                            >
                              <Text style={{ fontSize: 11, fontWeight: '700', color: colors.text }}>
                                {busy ? 'Working…' : 'Next Stage ›'}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity disabled={busy} onPress={() => handleDelete(deal.id)}>
                              <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: '600' }}>
                                Delete
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </TouchableOpacity>
                    )
                  })(),
                )
              )}
            </View>
          )
        }}
      />
    </View>
  )
}
