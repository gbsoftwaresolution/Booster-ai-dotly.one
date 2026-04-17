'use client'

import type { JSX } from 'react'
import type { PartialCardFields, WhatsappAutomationConfig } from '@dotly/types'

interface WhatsappAutomationTabProps {
  fields: PartialCardFields
  onChange: (config: WhatsappAutomationConfig | undefined) => void
}

export function WhatsappAutomationTab({
  fields,
  onChange,
}: WhatsappAutomationTabProps): JSX.Element {
  const config = fields.whatsappAutomation ?? {}

  function update(next: WhatsappAutomationConfig) {
    onChange(next)
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[28px] border border-slate-200 bg-white/70 p-5 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.22)]">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
          WhatsApp automation
        </p>
        <h3 className="mt-2 text-lg font-bold tracking-tight text-slate-900">
          Guide WhatsApp visitors to the next step
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          This is a lightweight automation layer: Dotly generates a guided handoff message and
          records it in the card inbox and CRM timeline.
        </p>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white/70 p-5 space-y-4">
        <label className="flex items-center gap-3 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={!!config.enabled}
            onChange={(e) => update({ ...config, enabled: e.target.checked })}
          />
          Enable WhatsApp automation handoff
        </label>

        <textarea
          rows={4}
          value={config.autoReplyTemplate ?? ''}
          onChange={(e) => update({ ...config, autoReplyTemplate: e.target.value.slice(0, 500) })}
          placeholder="Hi {visitorName}, thanks for reaching out to {ownerName}. The fastest next step is {nextStep}."
          className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
        />

        <input
          type="text"
          value={config.fallbackPrompt ?? ''}
          onChange={(e) => update({ ...config, fallbackPrompt: e.target.value.slice(0, 160) })}
          placeholder="Optional fallback prompt shown before opening WhatsApp"
          className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
        />

        <select
          value={config.nextStep ?? 'MESSAGE'}
          onChange={(e) =>
            update({ ...config, nextStep: e.target.value as WhatsappAutomationConfig['nextStep'] })
          }
          className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition-all focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
        >
          <option value="MESSAGE">Keep chat in WhatsApp</option>
          <option value="BOOK">Push toward booking</option>
          <option value="LEAD_CAPTURE">Push toward lead capture</option>
        </select>
      </div>
    </div>
  )
}
