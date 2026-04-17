'use client'

import type { JSX } from 'react'
import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react'
import { apiPatch, apiPost } from '@/lib/api'
import { getAccessToken } from '@/lib/auth/client'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/40 p-4 backdrop-blur-md transition-all sm:p-6">
      <div
        ref={dialogRef}
        className="relative mx-auto w-full max-w-lg my-8 rounded-[32px] bg-white/95 leading-relaxed shadow-[0_24px_54px_-34px_rgba(15,23,42,0.3)] backdrop-blur-2xl ring-1 ring-white/60 sm:container"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pipeline-form-title"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-8 py-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-sky-500">
              CRM Setup
            </p>
            <h2 id="pipeline-form-title" className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-[28px]">
              {pipeline ? 'Edit Pipeline' : 'New Pipeline'}
            </h2>
            <p className="mt-2 max-w-sm text-sm font-medium text-slate-500">
              Define the stage order and default flow for how contacts move through your CRM.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="app-touch-target flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600"
          >
            <span className="sr-only">Close</span>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="app-dialog-body-scroll px-8 py-6 custom-scrollbar max-h-[60vh] overflow-y-auto">
          <div className="space-y-6">
            <div>
              <label className="mb-1.5 block text-[13px] font-bold uppercase tracking-wider text-slate-500">Name *</label>
              <input
                className="w-full rounded-2xl border border-slate-200/60 bg-slate-50/50 px-4 py-3.5 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 hover:bg-white focus:border-sky-500 focus:bg-white focus:ring-[3px] focus:ring-sky-500/20"
                placeholder="e.g. Sales, Partnerships, Investors"
                value={pipelineName}
                onChange={(e) => setPipelineName(e.target.value)}
                maxLength={200}
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-[13px] font-bold uppercase tracking-wider text-slate-500">Stages *</label>
                <button
                  type="button"
                  onClick={addStage}
                  className="app-touch-target inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1.5 text-[13px] font-bold uppercase tracking-wider text-sky-600 transition-colors hover:bg-sky-100 ring-1 ring-inset ring-sky-500/20"
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
                      className="h-10 w-10 cursor-pointer rounded-xl border border-slate-200/60 bg-slate-50/50 p-1"
                      title="Stage colour"
                    />
                    <input
                      className="flex-1 rounded-xl border border-slate-200/60 bg-slate-50/50 px-3 py-2.5 text-sm font-medium text-slate-900 transition-all placeholder:text-slate-400 hover:bg-white focus:border-sky-500 focus:bg-white focus:ring-[3px] focus:ring-sky-500/20"
                      placeholder="Stage name"
                      value={stage.name}
                      onChange={(e) => updateStage(index, 'name', e.target.value)}
                      maxLength={100}
                    />
                    <button
                      type="button"
                      onClick={() => moveStage(index, -1)}
                      disabled={index === 0}
                      className="app-touch-target flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                      title="Move up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStage(index, 1)}
                      disabled={index === stageEntries.length - 1}
                      className="app-touch-target flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                      title="Move down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeStage(index)}
                      disabled={stageEntries.length <= 1}
                      className="app-touch-target flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-500 disabled:opacity-30"
                      title="Remove stage"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[13px] font-medium text-slate-400">
                Use arrows to reorder stages. Contacts move left to right.
              </p>
            </div>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-sky-500 focus:ring-sky-500"
              />
              <span className="text-[15px] font-bold text-slate-700">Set as default pipeline</span>
            </label>
            {formError && <p className="text-xs text-red-600">{formError}</p>}
          </div>
        </div>
        <div className="sticky bottom-0 mt-4 flex items-center justify-end gap-3 border-t border-slate-100 bg-white/50 p-6 backdrop-blur-md rounded-b-[32px]">
          <button
            onClick={onClose}
            disabled={saving}
            className="w-full rounded-2xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 sm:w-auto active:scale-95"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleSave()}
            disabled={saving || !pipelineName.trim()}
            className="relative flex w-full items-center justify-center overflow-hidden rounded-2xl bg-sky-500 px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-sky-600 hover:shadow-lg active:scale-95 disabled:pointer-events-none disabled:opacity-60 sm:w-auto"
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
        className="relative mx-auto w-full max-w-sm rounded-[32px] bg-white/95 p-6 sm:p-8 leading-relaxed shadow-[0_24px_54px_-34px_rgba(15,23,42,0.3)] backdrop-blur-2xl ring-1 ring-white/60 sm:container"
      >
        <h3 id="pipelines-confirm-dialog-title" className="text-2xl font-extrabold tracking-tight text-slate-900">
          {title}
        </h3>
        <p className="mt-2 text-sm font-medium text-slate-500">{message}</p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="w-full rounded-2xl border border-slate-200 px-6 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 sm:w-auto active:scale-95"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="app-touch-target rounded-2xl bg-rose-500 px-5 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-rose-600 hover:shadow-lg"
          >
            Delete
          </button>
        </div>
      </div>
    </>
  )
}
