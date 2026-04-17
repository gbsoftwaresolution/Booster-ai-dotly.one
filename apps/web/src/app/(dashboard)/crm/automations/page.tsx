'use client'

import { useEffect, useState, type JSX } from 'react'
import Link from 'next/link'
import { ArrowLeft, Bot, Plus, Trash2 } from 'lucide-react'
import type {
  ContactAutomationRuleResponse,
  ContactAutomationTriggerEvent,
  ContactTaskPriority,
  ContactTaskType,
} from '@dotly/types'
import { getAccessToken } from '@/lib/auth/client'
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api'

const TRIGGER_LABELS: Record<ContactAutomationTriggerEvent, string> = {
  WHATSAPP_CLICKED: 'WhatsApp clicked',
  WHATSAPP_AUTOMATION_TRIGGERED: 'WhatsApp automation triggered',
  LEAD_CAPTURED: 'Lead captured',
  BOOKING_COMPLETED: 'Booking completed',
  PAYMENT_COMPLETED: 'Payment completed',
}

export default function CrmAutomationsPage(): JSX.Element {
  const [rules, setRules] = useState<ContactAutomationRuleResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const token = await getAccessToken()
      const data = await apiGet<ContactAutomationRuleResponse[]>('/crm/automation-rules', token)
      setRules(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load automation rules')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function createRule() {
    setCreating(true)
    try {
      const token = await getAccessToken()
      const created = await apiPost<ContactAutomationRuleResponse>(
        '/crm/automation-rules',
        {
          name: 'New follow-up rule',
          triggerEvent: 'LEAD_CAPTURED',
          taskTitle: 'Follow up with new lead',
          taskPriority: 'HIGH',
          taskType: 'FOLLOW_UP',
          delayMinutes: 60,
          isActive: true,
        },
        token,
      )
      setRules((prev) => [created, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create automation rule')
    } finally {
      setCreating(false)
    }
  }

  async function updateRule(
    ruleId: string,
    patch: Partial<{
      name: string
      triggerEvent: ContactAutomationTriggerEvent
      taskTitle: string
      taskPriority: ContactTaskPriority
      taskType: ContactTaskType
      delayMinutes: number
      isActive: boolean
    }>,
  ) {
    const token = await getAccessToken()
    const updated = await apiPatch<ContactAutomationRuleResponse>(
      `/crm/automation-rules/${ruleId}`,
      patch,
      token,
    )
    setRules((prev) => prev.map((rule) => (rule.id === ruleId ? updated : rule)))
  }

  async function deleteRule(ruleId: string) {
    const token = await getAccessToken()
    await apiDelete(`/crm/automation-rules/${ruleId}`, token)
    setRules((prev) => prev.filter((rule) => rule.id !== ruleId))
  }

  return (
    <div className="space-y-6">
      <div className="app-panel flex flex-wrap items-start justify-between gap-4 rounded-[24px] px-6 py-6 sm:px-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <Link
              href="/crm"
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-indigo-500/80"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to CRM
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">CRM Automations</h1>
            <p className="mt-2 text-sm text-gray-500">
              Create delayed follow-up rules for the conversion events Dotly already tracks.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void createRule()}
          disabled={creating}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> {creating ? 'Creating…' : 'Add rule'}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="app-panel h-56 animate-pulse rounded-[24px]" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rules.map((rule) => (
            <div key={rule.id} className="app-panel rounded-[24px] p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <input
                  type="text"
                  value={rule.name}
                  onChange={(e) => void updateRule(rule.id, { name: e.target.value.slice(0, 160) })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => void deleteRule(rule.id)}
                  className="rounded-xl border border-red-200 p-2 text-red-500 transition hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={rule.triggerEvent}
                  onChange={(e) =>
                    void updateRule(rule.id, {
                      triggerEvent: e.target.value as ContactAutomationTriggerEvent,
                    })
                  }
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500"
                >
                  {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  value={rule.delayMinutes}
                  onChange={(e) =>
                    void updateRule(rule.id, { delayMinutes: Number(e.target.value || 0) })
                  }
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500"
                />
              </div>

              <input
                type="text"
                value={rule.taskTitle}
                onChange={(e) =>
                  void updateRule(rule.id, { taskTitle: e.target.value.slice(0, 500) })
                }
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500"
              />

              <div className="grid gap-3 sm:grid-cols-3">
                <select
                  value={rule.taskPriority}
                  onChange={(e) =>
                    void updateRule(rule.id, {
                      taskPriority: e.target.value as ContactTaskPriority,
                    })
                  }
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500"
                >
                  {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <select
                  value={rule.taskType}
                  onChange={(e) =>
                    void updateRule(rule.id, { taskType: e.target.value as ContactTaskType })
                  }
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500"
                >
                  {['CALL', 'EMAIL', 'MEETING', 'TODO', 'FOLLOW_UP'].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={rule.isActive}
                    onChange={(e) => void updateRule(rule.id, { isActive: e.target.checked })}
                  />
                  Active
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
