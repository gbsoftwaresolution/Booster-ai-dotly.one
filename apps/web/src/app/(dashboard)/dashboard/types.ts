export interface CardSummary {
  id: string
  handle: string
  templateId: string
  isActive: boolean
  fields: Record<string, string>
}

export interface DashboardAnalyticsSummary {
  totalViews: number
  totalClicks: number
  totalLeads: number
  totalCards: number
  activeCards: number
  openDealsCount: number
  openPipelineValue: number
  pendingTasksCount: number
  overdueTasksCount: number
}

export interface ContactRow {
  id: string
  name: string
  email?: string | null
  phone?: string
  crmPipeline?: { stage: string } | null
  createdAt: string
}

export interface LeadSubmission {
  id: string
  cardId: string
  data: Record<string, string>
  createdAt: string
}

export interface Deal {
  id: string
  title: string
  value: number
  currency: string
  stage: string
  closeDate?: string
  probability?: number
  contact?: { name?: string | null }
}

export interface TaskItem {
  id: string
  title: string
  dueAt?: string
  completed: boolean
  contact?: { name?: string | null }
}

export interface FunnelStage {
  stage: string
  count: number
}

export interface CrmFunnel {
  stages: FunnelStage[]
  totalActive: number
}

export interface AppointmentType {
  id: string
  name: string
  durationMins: number
  isActive: boolean
}
