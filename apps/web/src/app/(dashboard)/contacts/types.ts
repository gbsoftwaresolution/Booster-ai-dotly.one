import type { PaginatedResponse } from '@dotly/types'

export interface ContactRow {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  company?: string | null
  enrichmentScore?: number | null
  tags?: string[]
  createdAt: string
  crmPipeline?: { stage: string } | null
  sourceCard?: { handle: string } | null
}

export type ContactsResponse = PaginatedResponse<ContactRow>

export interface CardSummary {
  id: string
  handle: string
}

export interface ImportContactsResponse {
  created: number
  skipped: number
}

export interface ConfirmDialogState {
  message: string
  onConfirm: () => void
}

export const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED', 'LOST'] as const

export type Stage = (typeof STAGES)[number]

export type ContactsSortBy = 'date' | 'name' | 'stage' | 'score'

export type VisibleStageCounts = Record<Stage, number>
