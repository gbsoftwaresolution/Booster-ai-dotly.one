'use client'

import type { JSX } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, GitBranch, Pencil, Plus, Star, Trash2, X } from 'lucide-react'
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api'
import { getAccessToken } from '@/lib/supabase/client'
import { formatDate } from '@/lib/tz'
import { useUserTimezone } from '@/hooks/useUserLocale'

interface Pipeline {
  id: string
  name: string
  stages: string[]
  stageColors: Record<string, string>
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

interface StageEntry {
  name: string
  color: string
}

const DEFAULT_STAGE_COLORS = [
  '#6366f1', // indigo
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#f97316', // orange
]

function makeDefaultStages(): StageEntry[] {
  return ['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED', 'LOST'].map((name, i) => ({
    name,
    color: DEFAULT_STAGE_COLORS[i % DEFAULT_STAGE_COLORS.length] ?? '#6366f1',
  }))
}

function pipelineToStageEntries(pipeline: Pipeline): StageEntry[] {
  return pipeline.stages.map((name) => ({
    name,
    color: pipeline.stageColors?.[name] ?? DEFAULT_STAGE_COLORS[0] ?? '#6366f1',
  }))
}

export default function PipelinesPage(): JSX.Element {
  const userTz = useUserTimezone()
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null)
  const [pipelineName, setPipelineName] = useState('')
  const [stageEntries, setStageEntries] = useState<StageEntry[]>(makeDefaultStages())
  const [isDefault, setIsDefault] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchPipelines = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      const data = await apiGet<Pipeline[]>('/pipelines', token)
      setPipelines(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load pipelines')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchPipelines()
  }, [fetchPipelines])

  const openCreate = () => {
    setEditingPipeline(null)
    setPipelineName('')
    setStageEntries(makeDefaultStages())
    setIsDefault(false)
    setFormError(null)
    setShowModal(true)
  }

  const openEdit = (pipeline: Pipeline) => {
    setEditingPipeline(pipeline)
    setPipelineName(pipeline.name)
    setStageEntries(pipelineToStageEntries(pipeline))
    setIsDefault(pipeline.isDefault)
    setFormError(null)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingPipeline(null)
    setPipelineName('')
    setStageEntries(makeDefaultStages())
    setIsDefault(false)
    setFormError(null)
  }

  const addStage = () => {
    setStageEntries((prev) => [
      ...prev,
      {
        name: '',
        color: DEFAULT_STAGE_COLORS[prev.length % DEFAULT_STAGE_COLORS.length] ?? '#6366f1',
      },
    ])
  }

  const removeStage = (idx: number) => {
    setStageEntries((prev) => prev.filter((_, i) => i !== idx))
  }

  const moveStage = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= stageEntries.length) return
    setStageEntries((prev) => {
      const arr = [...prev]
      ;[arr[idx], arr[newIdx]] = [arr[newIdx]!, arr[idx]!]
      return arr
    })
  }

  const updateStage = (idx: number, field: 'name' | 'color', value: string) => {
    setStageEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)))
  }

  const handleSave = async () => {
    if (!pipelineName.trim()) {
      setFormError('Pipeline name is required.')
      return
    }
    const validStages = stageEntries.filter((s) => s.name.trim())
    if (validStages.length === 0) {
      setFormError('At least one stage is required.')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const token = await getAccessToken()
      const stages = validStages.map((s) => s.name.trim())
      const stageColors: Record<string, string> = {}
      for (const s of validStages) {
        stageColors[s.name.trim()] = s.color
      }
      const payload = { name: pipelineName.trim(), stages, stageColors, isDefault }
      if (editingPipeline) {
        await apiPatch(`/pipelines/${editingPipeline.id}`, payload, token)
      } else {
        await apiPost('/pipelines', payload, token)
      }
      closeModal()
      await fetchPipelines()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save pipeline')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (pipeline: Pipeline) => {
    if (
      !window.confirm(
        `Delete pipeline "${pipeline.name}"? Contacts in this pipeline will be unassigned.`,
      )
    )
      return
    try {
      const token = await getAccessToken()
      await apiDelete(`/pipelines/${pipeline.id}`, token)
      await fetchPipelines()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete pipeline')
    }
  }

  const handleSetDefault = async (pipeline: Pipeline) => {
    try {
      const token = await getAccessToken()
      await apiPatch(`/pipelines/${pipeline.id}`, { isDefault: true }, token)
      await fetchPipelines()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to set default pipeline')
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitBranch className="h-6 w-6 text-sky-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pipelines</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Manage CRM pipelines with custom stage sequences and colours
            </p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-600"
        >
          <Plus className="h-4 w-4" />
          New Pipeline
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>
      ) : pipelines.length === 0 ? (
        <div className="py-20 text-center text-gray-400">
          <GitBranch className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p className="text-base font-medium text-gray-500">No pipelines yet</p>
          <p className="mt-1 text-sm">Create your first pipeline to start organising contacts.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pipelines.map((pipeline) => (
            <div
              key={pipeline.id}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-base font-bold text-gray-900">{pipeline.name}</h2>
                    {pipeline.isDefault && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        <Star className="h-3 w-3" /> Default
                      </span>
                    )}
                  </div>
                  {/* Stage chips with colors */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {pipeline.stages.map((stage, idx) => {
                      const color = pipeline.stageColors?.[stage] ?? '#6366f1'
                      return (
                        <div key={stage} className="flex items-center gap-1">
                          <span
                            className="rounded-full px-2.5 py-1 text-xs font-semibold text-white"
                            style={{ backgroundColor: color }}
                          >
                            {stage}
                          </span>
                          {idx < pipeline.stages.length - 1 && (
                            <span className="text-xs text-gray-300">→</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <p className="mt-2 text-xs text-gray-400">
                    Created {formatDate(pipeline.createdAt, userTz)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {!pipeline.isDefault && (
                    <button
                      onClick={() => void handleSetDefault(pipeline)}
                      title="Set as default"
                      className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-500"
                    >
                      <Star className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(pipeline)}
                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-sky-50 hover:text-sky-600"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => void handleDelete(pipeline)}
                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h2 className="text-lg font-bold text-gray-900">
                {editingPipeline ? 'Edit Pipeline' : 'New Pipeline'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
              <div className="space-y-5">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-500">Name *</label>
                  <input
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                    placeholder="e.g. Sales, Partnerships, Investors"
                    value={pipelineName}
                    onChange={(e) => setPipelineName(e.target.value)}
                    maxLength={200}
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-xs font-semibold text-gray-500">Stages *</label>
                    <button
                      type="button"
                      onClick={addStage}
                      className="flex items-center gap-1 text-xs font-medium text-sky-600 hover:text-sky-700"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add stage
                    </button>
                  </div>
                  <div className="space-y-2">
                    {stageEntries.map((stage, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        {/* Color picker */}
                        <input
                          type="color"
                          value={stage.color}
                          onChange={(e) => updateStage(idx, 'color', e.target.value)}
                          className="h-8 w-8 cursor-pointer rounded border border-gray-200 p-0.5"
                          title="Stage colour"
                        />
                        {/* Stage name */}
                        <input
                          className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                          placeholder="Stage name"
                          value={stage.name}
                          onChange={(e) => updateStage(idx, 'name', e.target.value)}
                          maxLength={100}
                        />
                        {/* Reorder */}
                        <button
                          type="button"
                          onClick={() => moveStage(idx, -1)}
                          disabled={idx === 0}
                          className="rounded p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                          title="Move up"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveStage(idx, 1)}
                          disabled={idx === stageEntries.length - 1}
                          className="rounded p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                          title="Move down"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => removeStage(idx)}
                          disabled={stageEntries.length <= 1}
                          className="rounded p-1 text-gray-400 hover:text-red-500 disabled:opacity-30"
                          title="Remove stage"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-gray-400">
                    Use arrows to reorder stages. Contacts move left to right.
                  </p>
                </div>

                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="rounded border-gray-300 text-sky-500 focus:ring-sky-400"
                  />
                  <span className="text-sm text-gray-700">Set as default pipeline</span>
                </label>

                {formError && <p className="text-xs text-red-600">{formError}</p>}
              </div>
            </div>

            <div className="flex gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={closeModal}
                disabled={saving}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving || !pipelineName.trim()}
                className="flex-1 rounded-lg bg-sky-500 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-600 disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingPipeline ? 'Save Changes' : 'Create Pipeline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
