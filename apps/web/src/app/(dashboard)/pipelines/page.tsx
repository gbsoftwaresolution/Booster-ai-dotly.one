'use client'

import type { JSX } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { GitBranch, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api'
import { getAccessToken } from '@/lib/supabase/client'

interface Pipeline {
  id: string
  name: string
  stages: string[]
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

interface PipelineFormValues {
  name: string
  stages: string // comma-separated
  isDefault: boolean
}

const EMPTY_FORM: PipelineFormValues = {
  name: '',
  stages: 'NEW, CONTACTED, QUALIFIED, CLOSED, LOST',
  isDefault: false,
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function PipelinesPage(): JSX.Element {
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingPipeline, setEditingPipeline] = useState<Pipeline | null>(null)
  const [form, setForm] = useState<PipelineFormValues>(EMPTY_FORM)
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
    setForm(EMPTY_FORM)
    setFormError(null)
    setShowModal(true)
  }

  const openEdit = (pipeline: Pipeline) => {
    setEditingPipeline(pipeline)
    setForm({
      name: pipeline.name,
      stages: pipeline.stages.join(', '),
      isDefault: pipeline.isDefault,
    })
    setFormError(null)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingPipeline(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError('Pipeline name is required.')
      return
    }
    const stages = form.stages
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (stages.length === 0) {
      setFormError('At least one stage is required.')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const token = await getAccessToken()
      const payload = { name: form.name.trim(), stages, isDefault: form.isDefault }
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
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <GitBranch className="w-6 h-6 text-sky-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pipelines</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Manage CRM pipelines with custom stage sequences
            </p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Pipeline
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>
      ) : pipelines.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <GitBranch className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-base font-medium text-gray-500">No pipelines yet</p>
          <p className="text-sm mt-1">Create your first pipeline to start organising contacts.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pipelines.map((pipeline) => (
            <div
              key={pipeline.id}
              className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-gray-900 truncate">{pipeline.name}</h2>
                    {pipeline.isDefault && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                        <Star className="w-3 h-3" /> Default
                      </span>
                    )}
                  </div>
                  {/* Stage chips */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {pipeline.stages.map((stage, idx) => (
                      <div key={stage} className="flex items-center gap-1">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                          {stage}
                        </span>
                        {idx < pipeline.stages.length - 1 && (
                          <span className="text-gray-300 text-xs">→</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Created {formatDate(pipeline.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!pipeline.isDefault && (
                    <button
                      onClick={() => void handleSetDefault(pipeline)}
                      title="Set as default"
                      className="p-2 text-gray-400 hover:text-amber-500 rounded-lg hover:bg-amber-50 transition-colors"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(pipeline)}
                    className="p-2 text-gray-400 hover:text-sky-600 rounded-lg hover:bg-sky-50 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => void handleDelete(pipeline)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {editingPipeline ? 'Edit Pipeline' : 'New Pipeline'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Name *</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="e.g. Sales, Partnerships, Investors"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  maxLength={200}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  Stages (comma-separated) *
                </label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                  placeholder="e.g. Lead, Qualified, Proposal, Closed"
                  value={form.stages}
                  onChange={(e) => setForm((f) => ({ ...f, stages: e.target.value }))}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Separate stage names with commas. Contacts move through stages left to right.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))}
                  className="rounded border-gray-300 text-sky-500 focus:ring-sky-400"
                />
                <span className="text-sm text-gray-700">Set as default pipeline</span>
              </label>
              {formError && <p className="text-xs text-red-600">{formError}</p>}
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={closeModal}
                disabled={saving}
                className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2 text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSave()}
                disabled={saving || !form.name.trim()}
                className="flex-1 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-semibold transition-colors"
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
