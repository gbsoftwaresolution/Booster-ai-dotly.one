export interface FunnelStage {
  stage: string
  count: number
}

export interface FunnelConversion {
  from: string
  to: string
  rate: number
}

export interface FunnelAnalyticsResponse {
  stages: FunnelStage[]
  conversions: FunnelConversion[]
  totalActive: number
  sourceBreakdown?: Array<{ source: string; count: number }>
}

export interface Deal {
  id: string
  title: string
  value: number
  currency: string
  stage: string
  probability: number
  closeDate: string | null
  contact: { id: string; name: string } | null
}

export type DealStage = 'PROSPECT' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST'

export interface DealStageSummary {
  stage: DealStage
  count: number
  value: number
}
