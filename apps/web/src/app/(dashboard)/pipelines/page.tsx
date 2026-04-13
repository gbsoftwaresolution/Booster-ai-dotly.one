'use client'

import type { JSX } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { GitBranch, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { StatusNotice } from '@/components/ui/StatusNotice'
import { apiDelete, apiGet, apiPatch } from '@/lib/api'
import { getAccessToken } from '@/lib/supabase/client'
import { formatDate } from '@/lib/tz'
import { useUserTimezone } from '@/hooks/useUserLocale'
import type { ItemsResponse } from '@dotly/types'
import { ConfirmDialog, PipelineFormModal } from './components'
import type { Pipeline } from './types'

export default function PipelinesPage(): JSX.Element {
  const userTz = useUserTimezone()
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [defaultingId, setDefaultingId] = useState<string | null>(null)
  const [confirmDeletePipeline, setConfirmDeletePipeline] = useState<Pipeline | null>(null)

  const fetchPipelines = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      const data = await apiGet<ItemsResponse<Pipeline>>('/pipelines', token)
      setPipelines(data.items)
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
    setShowModal(true)
  }

  const openEdit = (pipeline: Pipeline) => {
    setEditingPipeline(pipeline)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingPipeline(null)
  }

  const handleDelete = async (pipeline: Pipeline) => {
    if (deletingId || defaultingId) return
    setDeletingId(pipeline.id)
    setActionError(null)
    try {
      const token = await getAccessToken()
      await apiDelete(`/pipelines/${pipeline.id}`, token)
      await fetchPipelines()
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete pipeline')
    } finally {
      setDeletingId(null)
    }
  }

  const handleSetDefault = async (pipeline: Pipeline) => {
    if (deletingId || defaultingId) return
    setDefaultingId(pipeline.id)
    setActionError(null)
    try {
      const token = await getAccessToken()
      await apiPatch(`/pipelines/${pipeline.id}`, { isDefault: true }, token)
      await fetchPipelines()
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to set default pipeline')
    } finally {
      setDefaultingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      {actionError && <StatusNotice message={actionError} />}

      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-[24px] border border-slate-200/60 bg-white/60 p-4 sm:p-6 backdrop-blur-xl mb-6 shadow-sm">
        {/* Background glows */}
                        <div className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #94a3b8 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50/50 px-3 py-1 shadow-inner backdrop-blur-sm mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600">CRM Setup</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Shape your <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-indigo-600">Flows</span> 
            </h1>
            <p className="mt-3 text-sm font-medium text-slate-500 sm:text-base">
              Define stage order, mark the right default pipeline, and keep your contact progression
              system perfectly organized as your CRM grows.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={openCreate}
                className="relative flex items-center justify-center gap-2 overflow-hidden rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-lg active:scale-95 sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                <span>New Pipeline</span>
              </button>
            </div>
          </div>

          {/* Stats Sub-panel inside the Header */}
          <div className="flex-shrink-0 w-full lg:w-80">
            <div className="overflow-hidden rounded-[24px] border border-sky-100 bg-sky-50/50 p-5 backdrop-blur-md shadow-inner">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Structure Snapshot
                  </p>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                  Live
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { label: 'Pipelines', value: loading ? '—' : pipelines.length },
                  { label: 'Default Flow', value: loading ? '—' : defaultPipeline ? 'Set' : 'Missing' },
                  { label: 'Total Stages', value: loading ? '—' : totalStages },
                  { label: 'Avg Stages', value: loading ? '—' : avgStages },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-2xl border border-sky-100 bg-sky-50/50 p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {label}
                    </p>
                    <p className="mt-1 text-[22px] font-extrabold tracking-tight text-slate-900">{value}</p>
                  </div>
                ))}
              </div>

              <div className="inline-flex max-w-full items-start gap-3 rounded-2xl bg-sky-100/50 p-4 text-[13px] font-medium text-slate-600 border border-sky-200/60 w-full shadow-inner">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
                  <GitBranch className="h-3.5 w-3.5" />
                </span>
                <span className="leading-relaxed"><strong className="text-slate-900 block mb-0.5">Focus</strong>{focusMessage}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && <StatusNotice message={error} />}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-24"><div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-indigo-600"></div></div>
      ) : pipelines.length === 0 ? (
        <div className="relative mx-auto mt-8 max-w-2xl overflow-hidden rounded-[32px] border border-slate-200/60 bg-white/60 p-12 text-center shadow-sm backdrop-blur-xl">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-sky-50 to-indigo-50/50 shadow-inner mb-6">
            <GitBranch size={32} className="text-sky-400" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-900 mb-2">No pipelines yet</h3>
          <p className="mx-auto max-w-sm text-sm font-medium text-slate-500 mb-8">
            Create your first pipeline to start organizing contacts and sales stages.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pipelines.map((pipeline) => (
            <div key={pipeline.id} className="group relative flex flex-col gap-4 rounded-[32px] border border-slate-200/60 bg-white/70 p-6 backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:bg-white">
              {(() => {
                const rowBusy = deletingId === pipeline.id || defaultingId === pipeline.id
                return (
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate text-[17px] font-extrabold text-slate-900">
                          {pipeline.name}
                        </h2>
                        {pipeline.isDefault && (
                          <span className="flex items-center gap-1.5 rounded-full bg-amber-100/50 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-600 shadow-sm ring-1 ring-inset ring-amber-500/30 backdrop-blur-md">
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
                                className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm ring-1 ring-inset ring-white/20"
                                style={{ backgroundColor: color }}
                              >
                                {stage}
                              </span>
                              {idx < pipeline.stages.length - 1 && (
                                <span className="text-[13px] font-bold text-slate-300">→</span>
                              )}
                            </div>
                          )
                        })}
                      </div>
                      <p className="mt-2 text-[13px] font-medium text-slate-400">
                        Created {formatDate(pipeline.createdAt, userTz)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {!pipeline.isDefault && (
                        <button
                          onClick={() => void handleSetDefault(pipeline)}
                          disabled={rowBusy || deletingId !== null || defaultingId !== null}
                          title="Set as default"
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-amber-50 hover:text-amber-500 disabled:opacity-50"
                        >
                          <Star className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(pipeline)}
                        disabled={rowBusy || deletingId !== null || defaultingId !== null}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDeletePipeline(pipeline)}
                        disabled={rowBusy || deletingId !== null || defaultingId !== null}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
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

      {showModal && (
        <PipelineFormModal
          pipeline={editingPipeline}
          onClose={closeModal}
          onSaved={fetchPipelines}
        />
      )}

      {confirmDeletePipeline ? (
        <ConfirmDialog
          title="Delete pipeline?"
          message={`Delete pipeline "${confirmDeletePipeline.name}"? Contacts in this pipeline will be unassigned.`}
          onCancel={() => setConfirmDeletePipeline(null)}
          onConfirm={() => {
            const pipeline = confirmDeletePipeline
            setConfirmDeletePipeline(null)
            void handleDelete(pipeline)
          }}
        />
      ) : null}
    </div>
  )
}
