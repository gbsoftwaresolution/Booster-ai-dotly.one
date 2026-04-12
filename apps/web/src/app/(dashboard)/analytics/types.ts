export interface CardSummary {
  id: string
  handle: string
  fields: Record<string, string>
}

export interface AnalyticsData {
  summary: {
    totalViews: number
    totalClicks: number
    totalLeads: number
    uniqueVisitors: number
    conversionRate: number
  }
  charts: {
    viewsByDay: { date: string; count: number }[]
    clicksByDay: { date: string; count: number }[]
    deviceBreakdown: { name: string; value: number }[]
    countryBreakdown: { name: string; value: number }[]
    clicksByLink: { name: string; value: number }[]
    referrers: { name: string; value: number }[]
  }
}

export interface DashboardSummary {
  totalViews: number
  totalClicks: number
  totalLeads: number
  totalCards: number
  activeCards: number
  interactionsByAction: { name: string; value: number }[]
  truncated: boolean
}
