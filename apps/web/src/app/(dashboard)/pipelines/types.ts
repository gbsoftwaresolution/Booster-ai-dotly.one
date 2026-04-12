export interface Pipeline {
  id: string
  name: string
  stages: string[]
  stageColors: Record<string, string>
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface StageEntry {
  name: string
  color: string
}
