export interface WebhookEndpoint {
  id: string
  url: string
  events: string[]
  secret?: string
  enabled: boolean
  createdAt: string
}

export interface WebhookDelivery {
  id: string
  event: string
  statusCode: number | null
  success: boolean
  durationMs: number | null
  attemptNumber: number
  deliveredAt: string
}

export interface WebhookTestResult {
  success: boolean
  statusCode: number | null
  durationMs: number
  responseBody: string
}
