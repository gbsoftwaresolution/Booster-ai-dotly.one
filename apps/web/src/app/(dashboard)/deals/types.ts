export interface Deal {
  id: string
  title: string
  value: number
  currency: string
  stage: DealStage
  closeDate: string | null
  probability: number
  contact: {
    id: string
    name: string
    email: string | null
  } | null
}

export interface ContactOption {
  id: string
  name: string
  email: string | null
}

export interface DealsSummary {
  totalDeals: number
  activeDeals: number
  totalPipelineValue: number
  weightedPipelineValue: number
  wonDeals: number
  closedDeals: number
  avgWonDealValue: number
  nextClosingDeal: {
    id: string
    title: string
    closeDate: string | null
  } | null
}

export const DEAL_STAGES = [
  'PROSPECT',
  'PROPOSAL',
  'NEGOTIATION',
  'CLOSED_WON',
  'CLOSED_LOST',
] as const
export type DealStage = (typeof DEAL_STAGES)[number]

export const DEALS_STAGE_LIMIT = 20
