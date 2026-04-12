'use client'

import type { JSX } from 'react'
import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react'
import { apiPatch, apiPost } from '@/lib/api'
import { getAccessToken } from '@/lib/supabase/client'
import { useDialogFocusTrap } from '@/hooks/useDialogFocusTrap'
import { ModalBackdrop } from '@/components/crm/ModalBackdrop'
import { DEFAULT_STAGE_COLORS, makeDefaultStages, pipelineToStageEntries } from './helpers'
import type { Pipeline, StageEntry } from './types'

export function PipelineFormModal({
  pipeline,
  onClose,
  onSaved,
}: {
  pipeline: Pipeline | null
  onClose: () => void
  onSaved: () => Promise<void> | void
}): JSX.Element {
  const [pipelineName, setPipelineName] = useState('')
  const [stageEntries, setStageEntries] = useState<StageEntry[]>(makeDefaultStages())
  const [isDefault, setIsDefault] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (pipeline) {
      setPipelineName(pipeline.name)
      setStageEntries(pipelineToStageEntries(pipeline))
      setIsDefault(pipeline.isDefault)
    } else {
      setPipelineName('')
      setStageEntries(makeDefaultStages())
      setIsDefault(false)
    }
    setFormError(null)
  }, [pipeline])

  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useDialogFocusTrap({
    active: true,
    containerRef: dialogRef,
    initialFocusRef: closeButtonRef,
    onEscape: onClose,
  })

  const addStage = () => {
    setStageEntries((prev) => [
      ...prev,
      {
        name: '',
        color: DEFAULT_STAGE_COLORS[prev.length % DEFAULT_STAGE_COLORS.length] ?? '#6366f1',
      },
    ])
  }

  const removeStage = (index: number) => {
    setStageEntries((prev) => prev.filter((_, i) => i !== index))
  }

  const moveStage = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= stageEntries.length) return
    setStageEntries((prev) => {
      const next = [...prev]
      ;[next[index], next[nextIndex]] = [next[nextIndex]!, next[index]!]
      return next
    })
  }

  const updateStage = (index: number, field: 'name' | 'color', value: string) => {
    setStageEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry)),
    )
  }

  const handleSave = async () => {
    if (!pipelineName.trim()) {
      setFormError('Pipeline name is required.')
      return
    }
    const validStages = stageEntries.filter((stage) => stage.name.trim())
    if (validStages.length === 0) {
      setFormError('At least one stage is required.')
      return
    }

    setSaving(true)
    setFormError(null)
    try {
      const token = await getAccessToken()
      const stages = validStages.map((stage) => stage.name.trim())
      const stageColors: Record<string, string> = {}
      for (const stage of validStages) stageColors[stage.name.trim()] = stage.color
      const payload = { name: pipelineName.trim(), stages, stageColors, isDefault }
      if (pipeline) await apiPatch(`/pipelines/${pipeline.id}`, payload, token)
      else await apiPost('/pipelines', payload, token)
      await onSaved()
      onClose()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to save pipeline')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="app-dialog-shell">
      <div
        ref={dialogRef}
        className="app-dialog-panel max-w-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pipeline-form-title"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-500/80">
              CRM Setup
            </p>
            <h2 id="pipeline-form-title" className="mt-1 text-lg font-bold text-gray-900">
              {pipeline ? 'Edit Pipeline' : 'New Pipeline'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Define the stage order and default flow for how contacts move through your CRM.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="app-touch-target rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <span className="sr-only">Close</span>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="app-dialog-body-scroll px-6 py-4">
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
                  className="app-touch-target inline-flex items-center gap-1 text-sm font-medium text-sky-600 hover:text-sky-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add stage
                </button>
              </div>
              <div className="space-y-2">
                {stageEntries.map((stage, index) => (
                  <div key={index} className="flex flex-wrap items-center gap-2">
                    <input
                      type="color"
                      value={stage.color}
                      onChange={(e) => updateStage(index, 'color', e.target.value)}
                      className="h-8 w-8 cursor-pointer rounded border border-gray-200 p-0.5"
                      title="Stage colour"
                    />
                    <input
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                      placeholder="Stage name"
                      value={stage.name}
                      onChange={(e) => updateStage(index, 'name', e.target.value)}
                      maxLength={100}
                    />
                    <button
                      type="button"
                      onClick={() => moveStage(index, -1)}
                      disabled={index === 0}
                      className="app-touch-target rounded p-2 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                      title="Move up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStage(index, 1)}
                      disabled={index === stageEntries.length - 1}
                      className="app-touch-target rounded p-2 text-gray-400 hover:text-gray-700 disabled:opacity-30"
                      title="Move down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeStage(index)}
                      disabled={stageEntries.length <= 1}
                      className="app-touch-target rounded p-2 text-gray-400 hover:text-red-500 disabled:opacity-30"
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
        <div className="app-dialog-footer">
          <button
            onClick={onClose}
            disabled={saving}
            className="app-touch-target w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 sm:w-auto"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving || !pipelineName.trim()}
            className="app-touch-target w-full rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-600 disabled:opacity-50 sm:w-auto"
          >
            {saving ? 'Saving...' : pipeline ? 'Save Changes' : 'Create Pipeline'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
}): JSX.Element {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  useDialogFocusTrap({
    active: true,
    containerRef: dialogRef,
    initialFocusRef: cancelButtonRef,
    onEscape: onCancel,
  })

  return (
    <>
      <ModalBackdrop onClick={onCancel} tone="drawer" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pipelines-confirm-dialog-title"
        className="app-confirm-panel"
      >
        <h3 id="pipelines-confirm-dialog-title" className="text-sm font-semibold text-gray-900">
          {title}
        </h3>
        <p className="mt-1 text-sm text-gray-600">{message}</p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="app-touch-target rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="app-touch-target rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </>
  )
}
