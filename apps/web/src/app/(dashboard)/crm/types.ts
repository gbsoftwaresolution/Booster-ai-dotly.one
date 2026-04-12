export interface PipelineContact {
  id: string
  name: string
  company?: string | null
  email?: string | null
  createdAt: string
  crmPipeline?: { stage: string; updatedAt?: string } | null
  sourceCard?: { handle: string } | null
}

export type PipelineData = Record<string, PipelineContact[]>

export interface PipelineResponse {
  pipeline: PipelineData
  truncated: boolean
  visibleCount: number
}

export interface NamedPipeline {
  id: string
  name: string
  stages: string[]
  isDefault: boolean
}
