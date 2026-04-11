'use client'

import type { JSX } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, GitBranch, Pencil, Plus, Star, Trash2, X } from 'lucide-react'
import { StatusNotice } from '@/components/ui/StatusNotice'
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
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [defaultingId, setDefaultingId] = useState<string | null>(null)

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

  const defaultPipeline = pipelines.find((pipeline) => pipeline.isDefault) ?? null
  const totalStages = pipelines.reduce((sum, pipeline) => sum + pipeline.stages.length, 0)
  const avgStages =
    pipelines.length > 0 ? Math.round((totalStages / pipelines.length) * 10) / 10 : 0
  const latestUpdatedPipeline = [...pipelines].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  )[0]
  const focusMessage = defaultPipeline
    ? `${defaultPipeline.name} is your default flow with ${defaultPipeline.stages.length} stage${defaultPipeline.stages.length === 1 ? '' : 's'}.`
    : pipelines.length > 0
      ? 'Choose a default pipeline so new contacts enter the right CRM flow automatically.'
      : 'Create your first pipeline to define how contacts move through your CRM.'

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
    if (deletingId || defaultingId) return
    if (
      !window.confirm(
        `Delete pipeline "${pipeline.name}"? Contacts in this pipeline will be unassigned.`,
      )
    )
      return
    setDeletingId(pipeline.id)
    try {
      const token = await getAccessToken()
      await apiDelete(`/pipelines/${pipeline.id}`, token)
      await fetchPipelines()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete pipeline')
    } finally {
      setDeletingId(null)
    }
  }

  const handleSetDefault = async (pipeline: Pipeline) => {
    if (deletingId || defaultingId) return
    setDefaultingId(pipeline.id)
    try {
      const token = await getAccessToken()
      await apiPatch(`/pipelines/${pipeline.id}`, { isDefault: true }, token)
      await fetchPipelines()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to set default pipeline')
    } finally {
      setDefaultingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="app-panel relative overflow-hidden rounded-[34px] px-6 py-6 sm:px-8 sm:py-7">
        <div
          className="absolute inset-0 opacity-90"
          aria-hidden="true"
          style={{
            background:
              'radial-gradient(circle at top left, rgba(14,165,233,0.14), transparent 34%), radial-gradient(circle at right center, rgba(99,102,241,0.10), transparent 28%), linear-gradient(135deg, rgba(255,255,255,0.94), rgba(248,250,252,0.98))',
          }}
        />
        <div className="relative grid gap-5 xl:grid-cols-[1.35fr_0.92fr] xl:items-start">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-600">
              <GitBranch className="h-3.5 w-3.5" />
              CRM Setup
            </div>
            <h1 className="mt-3 text-2xl font-bold text-gray-900 sm:text-[2rem]">
              Shape your CRM flows with more clarity
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-500 sm:text-[15px]">
              Define stage order, mark the right default pipeline, and keep your contact progression
              system organized as your CRM grows.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-xl sm:grid-cols-4">
              {[
                { label: 'Pipelines', value: loading ? '—' : pipelines.length },
                {
                  label: 'Default Flow',
                  value: loading ? '—' : defaultPipeline ? 'Set' : 'Missing',
                },
                { label: 'Total Stages', value: loading ? '—' : totalStages },
                { label: 'Avg Stages', value: loading ? '—' : avgStages },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-[22px] border border-white/80 bg-white/85 px-3 py-3 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.2)]"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                    {label}
                  </p>
                  <p className="mt-1 text-sm font-bold text-gray-900 sm:text-base">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_20px_40px_-28px_rgba(14,165,233,0.42)] transition-transform hover:-translate-y-0.5 hover:bg-sky-600"
              >
                <Plus className="h-4 w-4" />
                New Pipeline
              </button>
            </div>

            <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-medium text-gray-600 shadow-sm">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                <GitBranch className="h-3.5 w-3.5" />
              </span>
              <span className="truncate">Focus: {focusMessage}</span>
            </div>
          </div>

          <div className="app-panel-subtle rounded-[30px] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Pipeline Snapshot
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  Structure health at a glance
                </p>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-600 shadow-sm">
                Live
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {[
                {
                  label: 'Default coverage',
                  value: loading ? '—' : defaultPipeline ? 'Ready' : 'Set one',
                  detail: defaultPipeline
                    ? `${defaultPipeline.name} is handling new contact flow`
                    : 'No default pipeline configured yet',
                  tone: defaultPipeline
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-amber-50 text-amber-600',
                },
                {
                  label: 'Stage density',
                  value: loading ? '—' : `${avgStages}`,
                  detail: 'Average stages per pipeline across your CRM setup',
                  tone: 'bg-sky-50 text-sky-600',
                },
                {
                  label: 'Newest update',
                  value: loading
                    ? '—'
                    : latestUpdatedPipeline
                      ? formatDate(latestUpdatedPipeline.updatedAt, userTz)
                      : 'None',
                  detail: latestUpdatedPipeline
                    ? `${latestUpdatedPipeline.name} was updated most recently`
                    : 'No pipeline history yet',
                  tone: 'bg-indigo-50 text-indigo-600',
                },
              ].map(({ label, value, detail, tone }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-[24px] border border-white/80 bg-white/80 px-4 py-3"
                >
                  <span
                    className={`${tone} flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl`}
                  >
                    <GitBranch className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      {label}
                    </p>
                    <p className="truncate text-sm text-gray-500">{detail}</p>
                  </div>
                  <span className="shrink-0 text-lg font-bold tabular-nums text-gray-900">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && <StatusNotice message={error} />}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>
      ) : pipelines.length === 0 ? (
        <div className="app-empty-state">
          <GitBranch className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p className="text-base font-medium text-gray-500">No pipelines yet</p>
          <p className="mt-1 text-sm">Create your first pipeline to start organising contacts.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pipelines.map((pipeline) => (
            <div key={pipeline.id} className="app-panel rounded-[24px] p-5">
              {(() => {
                const rowBusy = deletingId === pipeline.id || defaultingId === pipeline.id
                return (
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-base font-bold text-gray-900">
                          {pipeline.name}
                        </h2>
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
                          disabled={rowBusy || deletingId !== null || defaultingId !== null}
                          title="Set as default"
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-amber-50 hover:text-amber-500 disabled:opacity-50"
                        >
                          <Star className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(pipeline)}
                        disabled={rowBusy || deletingId !== null || defaultingId !== null}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-sky-50 hover:text-sky-600 disabled:opacity-50"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => void handleDelete(pipeline)}
                        disabled={rowBusy || deletingId !== null || defaultingId !== null}
                        className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )
              })()}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="app-panel mx-4 w-full max-w-lg rounded-[28px] shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-500/80">
                  CRM Setup
                </p>
                <h2 className="mt-1 text-lg font-bold text-gray-900">
                  {editingPipeline ? 'Edit Pipeline' : 'New Pipeline'}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Define the stage order and default flow for how contacts move through your CRM.
                </p>
              </div>
              <button
                onClick={closeModal}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
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
