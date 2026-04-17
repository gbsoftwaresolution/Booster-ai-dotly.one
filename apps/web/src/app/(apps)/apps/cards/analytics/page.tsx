'use client'

import type { JSX } from 'react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { getAccessToken } from '@/lib/auth/client'
import { apiGet } from '@/lib/api'
import { StatusNotice } from '@/components/ui/StatusNotice'
import type { ItemsResponse } from '@dotly/types'
import {
  AnalyticsChartsSection,
  AnalyticsHero,
  AnalyticsLoadingShell,
  AnalyticsSummarySection,
  EmptyCardsState,
  ExportWarningBanner,
  InteractionActionsCard,
} from '../../../../(dashboard)/analytics/components'
import {
  API_URL,
  getAnalyticsWindow,
  getFocusMessage,
  getRequestKey,
  getSelectedCardMeta,
} from '../../../../(dashboard)/analytics/helpers'
import type {
  AnalyticsData,
  CardSummary,
  DashboardSummary,
} from '../../../../(dashboard)/analytics/types'

export default function AnalyticsPage(): JSX.Element {
  const [cards, setCards] = useState<CardSummary[]>([])
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [dateRangeDays, setDateRangeDays] = useState(30)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [cardsLoading, setCardsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const [bootstrapFailed, setBootstrapFailed] = useState(false)
  const [isFilterRefreshing, setIsFilterRefreshing] = useState(false)
  const [renderedRequestKey, setRenderedRequestKey] = useState<string | null>(null)
  const [bootstrapRetryToken, setBootstrapRetryToken] = useState(0)
  const abortRef = useRef<AbortController | null>(null)
  const activeRequestKey = getRequestKey(selectedCardId, dateRangeDays)

  useEffect(() => {
    async function loadCards() {
      try {
        setCardsLoading(true)
        setError(null)
        setBootstrapFailed(false)
        setSummaryError(null)
        const token = await getAccessToken()
        const [cardsResult, summaryResult] = await Promise.allSettled([
          apiGet<ItemsResponse<CardSummary>>('/cards', token),
          apiGet<DashboardSummary>('/analytics/dashboard-summary', token),
        ])

        if (cardsResult.status === 'fulfilled') {
          setCards(cardsResult.value.items)
          const first = cardsResult.value.items[0]
          if (first) setSelectedCardId(first.id)
        } else {
          throw cardsResult.reason
        }

        if (summaryResult.status === 'fulfilled') {
          setDashboardSummary(summaryResult.value)
        } else {
          setSummaryError(
            summaryResult.reason instanceof Error
              ? summaryResult.reason.message
              : 'Analytics summary is temporarily unavailable.',
          )
        }
      } catch (err) {
        setBootstrapFailed(true)
        setError(err instanceof Error ? err.message : 'Failed to load cards')
      } finally {
        setCardsLoading(false)
      }
    }
    void loadCards()
  }, [bootstrapRetryToken])

  const loadAnalytics = useCallback(async () => {
    if (!selectedCardId) return
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setIsFilterRefreshing(true)
    setError(null)
    try {
      const token = await getAccessToken()
      const { from, to } = getAnalyticsWindow(dateRangeDays)
      const data = await apiGet<AnalyticsData>(
        `/cards/${selectedCardId}/analytics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        token,
        controller.signal,
      )
      if (controller.signal.aborted) return
      setAnalyticsData(data)
      setRenderedRequestKey(getRequestKey(selectedCardId, dateRangeDays))
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      if (!controller.signal.aborted) setIsFilterRefreshing(false)
      if (!abortRef.current?.signal.aborted) setLoading(false)
    }
  }, [selectedCardId, dateRangeDays])

  useEffect(() => {
    void loadAnalytics()
  }, [loadAnalytics])

  const [exportWarning, setExportWarning] = useState<string | null>(null)

  const { selectedCardLabel, selectedCardHandle } = getSelectedCardMeta(cards, selectedCardId)
  const [exporting, setExporting] = useState(false)
  const focusMessage = getFocusMessage({
    totalCards: cards.length,
    activeCards: dashboardSummary?.activeCards ?? 0,
    analyticsData,
    dateRangeDays,
    selectedCardLabel,
    selectedCardHandle,
  })

  const exportLeadsCSV = useCallback(async () => {
    setExportWarning(null)
    setExporting(true)
    try {
      const token = await getAccessToken()
      const params = new URLSearchParams()
      if (selectedCardId) params.set('cardId', selectedCardId)
      const { from, to } = getAnalyticsWindow(dateRangeDays)
      params.set('from', from)
      params.set('to', to)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)
      const res = await fetch(`${API_URL}/lead-submissions/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token ?? ''}` },
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId))
      if (!res.ok) {
        const message = await res.text().catch(() => '')
        if (message.includes('CSV export is available on Pro.')) {
          throw new Error(
            'CSV export is available on Pro. Upgrade in billing to export lead submissions.',
          )
        }
        throw new Error(`Export failed: ${res.status}`)
      }
      if (res.headers.get('x-export-truncated') === 'true') {
        const count = res.headers.get('x-export-row-count') ?? '10000'
        setExportWarning(
          `Export limited to ${Number(count).toLocaleString()} rows. Use the API for full data.`,
        )
      }
      const csv = await res.text()
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lead-submissions-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(
        err instanceof DOMException && err.name === 'AbortError'
          ? 'Export timed out. Please try again.'
          : err instanceof Error
            ? err.message
            : 'Export failed',
      )
    } finally {
      setExporting(false)
    }
  }, [selectedCardId, dateRangeDays])

  if (cardsLoading) {
    return <AnalyticsLoadingShell />
  }

  return (
    <div className="space-y-6">
      <AnalyticsHero
        cards={cards}
        cardsLoading={cardsLoading}
        dashboardSummary={dashboardSummary}
        focusMessage={focusMessage}
        loading={loading}
        selectedCardId={selectedCardId}
        selectedCardLabel={selectedCardLabel}
        selectedCardHandle={selectedCardHandle}
        dateRangeDays={dateRangeDays}
        exporting={exporting}
        onSelectCard={setSelectedCardId}
        onSelectRange={setDateRangeDays}
        onRefresh={() => void loadAnalytics()}
        onExport={() => void exportLeadsCSV()}
      />

      <ExportWarningBanner exportWarning={exportWarning} onDismiss={() => setExportWarning(null)} />

      {error && (
        <StatusNotice
          message={error}
          action={
            <button
              type="button"
              onClick={() =>
                bootstrapFailed
                  ? setBootstrapRetryToken((current) => current + 1)
                  : void loadAnalytics()
              }
              className="ml-4 font-semibold underline"
            >
              Retry
            </button>
          }
        />
      )}
      {summaryError && <StatusNotice tone="warning" message={summaryError} liveMode="polite" />}
      {isFilterRefreshing && renderedRequestKey !== activeRequestKey && (
        <StatusNotice
          tone="info"
          message="Refreshing analytics for the selected card and date range..."
          liveMode="polite"
        />
      )}

      {cards.length === 0 && <EmptyCardsState />}

      <AnalyticsSummarySection
        loading={loading}
        analyticsData={analyticsData}
        renderedRequestKey={renderedRequestKey}
        activeRequestKey={activeRequestKey}
      />

      <InteractionActionsCard dashboardSummary={dashboardSummary} />

      <AnalyticsChartsSection
        analyticsData={analyticsData}
        onExport={() => void exportLeadsCSV()}
      />
    </div>
  )
}
