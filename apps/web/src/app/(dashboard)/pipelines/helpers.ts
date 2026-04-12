import type { Pipeline, StageEntry } from './types'

export const DEFAULT_STAGE_COLORS = [
  '#6366f1',
  '#3b82f6',
  '#f59e0b',
  '#10b981',
  '#ef4444',
  '#8b5cf6',
  '#14b8a6',
  '#f97316',
]

export function makeDefaultStages(): StageEntry[] {
  return ['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED', 'LOST'].map((name, index) => ({
    name,
    color: DEFAULT_STAGE_COLORS[index % DEFAULT_STAGE_COLORS.length] ?? '#6366f1',
  }))
}

export function pipelineToStageEntries(pipeline: Pipeline): StageEntry[] {
  return pipeline.stages.map((name) => ({
    name,
    color: pipeline.stageColors?.[name] ?? DEFAULT_STAGE_COLORS[0] ?? '#6366f1',
  }))
}
