import type { Deal, DealStage, DealStageSummary } from './types'

export const DEAL_STAGES: DealStage[] = [
  'PROSPECT',
  'PROPOSAL',
  'NEGOTIATION',
  'CLOSED_WON',
  'CLOSED_LOST',
]

export const DEAL_STAGE_LABELS: Record<DealStage, string> = {
  PROSPECT: 'Prospect',
  PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation',
  CLOSED_WON: 'Closed Won',
  CLOSED_LOST: 'Closed Lost',
}

export const DEAL_STAGE_COLORS: Record<DealStage, string> = {
  PROSPECT: 'bg-blue-500',
  PROPOSAL: 'bg-yellow-500',
  NEGOTIATION: 'bg-purple-500',
  CLOSED_WON: 'bg-green-500',
  CLOSED_LOST: 'bg-red-400',
}

export const CONTACT_STAGE_COLORS: Record<string, string> = {
  NEW: 'bg-gray-500',
  CONTACTED: 'bg-blue-500',
  QUALIFIED: 'bg-yellow-500',
  CLOSED: 'bg-green-500',
  LOST: 'bg-red-500',
}

export function formatPercent(value: number): string {
  const normalized = value <= 1 ? value * 100 : value
  return `${Math.round(normalized)}%`
}

export function formatCurrency(value: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `$${value.toLocaleString()}`
  }
}

export function normalizeProbability(value: number): number {
  return value <= 1 ? value * 100 : value
}

export function buildDealStageSummaries(deals: Deal[]): DealStageSummary[] {
  return DEAL_STAGES.map((stage) => {
    const stageDeals = deals.filter((deal) => deal.stage === stage)
    const value = stageDeals.reduce((sum, deal) => sum + deal.value, 0)
    return { stage, count: stageDeals.length, value }
  })
}

export function buildSourceBreakdownRows(
  sourceBreakdown: Array<{ source: string; count: number }>,
): Array<{
  source: string
  count: number
  percent: number
}> {
  const total = sourceBreakdown.reduce((sum, row) => sum + row.count, 0)

  return [...sourceBreakdown]
    .sort((a, b) => b.count - a.count)
    .map((row) => ({
      source: row.source,
      count: row.count,
      percent: total > 0 ? Math.round((row.count / total) * 100) : 0,
    }))
}
