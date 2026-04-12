import { getPublicApiUrl } from '@/lib/public-env'

import type { CardSummary, DashboardSummary } from './types'

export const API_URL = getPublicApiUrl()

export const DEVICE_COLORS = ['#6366f1', '#22d3ee', '#f59e0b', '#10b981']

export const DATE_RANGE_OPTIONS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
] as const

export function formatActionLabel(name: string): string {
  return name
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function getAnalyticsWindow(dateRangeDays: number): { from: string; to: string } {
  const to = new Date()
  to.setUTCHours(23, 59, 59, 999)

  const from = new Date(Date.now() - dateRangeDays * 24 * 60 * 60 * 1000)
  from.setUTCHours(0, 0, 0, 0)

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  }
}

export function getSelectedCardMeta(
  cards: CardSummary[],
  selectedCardId: string | null,
): { selectedCardLabel: string; selectedCardHandle: string } {
  const selectedCard = cards.find((card) => card.id === selectedCardId) ?? null
  const selectedCardLabel =
    selectedCard?.fields['name']?.trim() ||
    (selectedCard ? `/${selectedCard.handle}` : 'No card selected')
  const selectedCardHandle = selectedCard ? `/${selectedCard.handle}` : 'No card selected'

  return { selectedCardLabel, selectedCardHandle }
}

export function getFocusMessage({
  totalCards,
  activeCards,
  analyticsData,
  dateRangeDays,
  selectedCardLabel,
  selectedCardHandle,
}: {
  totalCards: number
  activeCards: number
  analyticsData: {
    summary: {
      totalViews: number
      totalClicks: number
    }
  } | null
  dateRangeDays: number
  selectedCardLabel: string
  selectedCardHandle: string
}): string {
  if (analyticsData) {
    if (analyticsData.summary.totalViews > 0) {
      return `${selectedCardLabel} generated ${analyticsData.summary.totalViews} views and ${analyticsData.summary.totalClicks} clicks in the last ${dateRangeDays} days.`
    }

    return `No traffic yet in the last ${dateRangeDays} days. Share ${selectedCardHandle} to start collecting data.`
  }

  if (totalCards > 0) {
    return `Tracking ${totalCards} card${totalCards === 1 ? '' : 's'} with ${activeCards} active right now.`
  }

  return 'Create and share a card to begin collecting analytics.'
}

export function getRequestKey(selectedCardId: string | null, dateRangeDays: number): string {
  return `${selectedCardId ?? 'none'}:${dateRangeDays}`
}

export function getMaxInteractionValue(values: DashboardSummary['interactionsByAction']): number {
  return Math.max(...values.map((item) => item.value), 1)
}
