'use client'

/**
 * MeetingMemory
 * Attach "where / when I met this person" notes to a CRM contact.
 * Optimistic: saves to localStorage immediately, best-effort syncs to API.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { getPublicApiUrl } from '@/lib/public-env'
import { getAccessToken } from '@/lib/supabase/client'
import {
  Plus,
  MapPin,
  Calendar,
  Tag,
  Trash2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Save,
  AlertTriangle,
} from 'lucide-react'

const API_URL = getPublicApiUrl()

// ─── Types ────────────────────────────────────────────────────────────────────

type ContextTag =
  | 'Event'
  | 'Conference'
  | 'Online'
  | 'Referral'
  | 'Cold outreach'
  | 'Networking'
  | 'Client meeting'
  | 'Other'

const CONTEXT_TAGS: ContextTag[] = [
  'Event',
  'Conference',
  'Online',
  'Referral',
  'Cold outreach',
  'Networking',
  'Client meeting',
  'Other',
]

export interface Memory {
  id: string
  contactId: string
  metAt: string
  date: string // YYYY-MM-DD
  tags: ContextTag[]
  notes: string
  createdAt: string
}

// ─── Local persistence ────────────────────────────────────────────────────────

function storageKey(contactId: string) {
  return `dotly_memories_${contactId}`
}

function loadLocal(contactId: string): Memory[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(storageKey(contactId)) ?? '[]') as Memory[]
  } catch {
    return []
  }
}

function saveLocal(contactId: string, memories: Memory[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(storageKey(contactId), JSON.stringify(memories))
  } catch {
    /* QuotaExceededError — silent */
  }
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiWithToken(fn: (token: string) => Promise<void>) {
  try {
    const token = await getAccessToken()
    if (token) await fn(token)
  } catch {
    /* best-effort */
  }
}

// ─── Confirm delete hook ──────────────────────────────────────────────────────

function useConfirmDelete() {
  const [pendingId, setPendingId] = useState<string | null>(null)
  const confirm = (id: string) => setPendingId(id)
  const cancel = () => setPendingId(null)
  return { pendingId, confirm, cancel }
}

// ─── Memory card ──────────────────────────────────────────────────────────────

function MemoryCard({
  memory,
  onDeleteRequest,
}: {
  memory: Memory
  onDeleteRequest: (id: string) => void
}) {
  const date = memory.date
    ? new Date(memory.date + 'T12:00:00').toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null

  const addedDate = new Date(memory.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="group relative rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      {/* Delete button — always visible on mobile via opacity, hover-only on desktop */}
      <button
        onClick={() => onDeleteRequest(memory.id)}
        className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-red-400 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
        aria-label="Delete memory"
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {memory.metAt && (
        <div className="flex items-center gap-1.5 pr-8 text-sm font-semibold text-slate-800">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-500" />
          <span className="truncate">{memory.metAt}</span>
        </div>
      )}

      {date && (
        <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
          <Calendar className="h-3 w-3 shrink-0" />
          {date}
        </div>
      )}

      {memory.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {memory.tags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold"
              style={{ background: '#eff6ff', color: '#2563eb' }}
            >
              <Tag className="h-2.5 w-2.5" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {memory.notes && (
        <p className="mt-2.5 text-sm leading-relaxed text-slate-600">{memory.notes}</p>
      )}

      <p className="mt-3 text-[10px] text-slate-300">Added {addedDate}</p>
    </div>
  )
}

// ─── Delete confirmation ──────────────────────────────────────────────────────

function DeleteConfirmBanner({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
      <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
      <p className="flex-1 text-xs font-semibold text-red-700">Delete this memory?</p>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-opacity active:opacity-70"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white transition-opacity active:opacity-70"
        >
          Delete
        </button>
      </div>
    </div>
  )
}

// ─── Add memory form ──────────────────────────────────────────────────────────

function AddMemoryForm({
  contactId,
  onAdd,
  onCancel,
}: {
  contactId: string
  onAdd: (m: Memory) => void
  onCancel: () => void
}) {
  const [metAt, setMetAt] = useState('')
  const [date, setDate] = useState('')
  const [selectedTags, setSelectedTags] = useState<ContextTag[]>([])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Default date to today in local time (fixes UTC offset issue)
  const todayLocal = new Date()
  const todayStr = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, '0')}-${String(todayLocal.getDate()).padStart(2, '0')}`

  function toggleTag(tag: ContextTag) {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!metAt.trim() && !notes.trim()) {
      setError('Please enter at least a location or a note.')
      return
    }
    setSaving(true)
    setError('')

    const newMemory: Memory = {
      id: crypto.randomUUID(),
      contactId,
      metAt: metAt.trim(),
      date: date || todayStr,
      tags: selectedTags,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    }

    // Optimistic local save
    const existing = loadLocal(contactId)
    saveLocal(contactId, [newMemory, ...existing])
    onAdd(newMemory)

    // Best-effort API sync
    void apiWithToken(async (token) => {
      await fetch(`${API_URL}/contacts/${contactId}/memories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newMemory),
      })
    })

    setSaving(false)
  }

  return (
    <form
      onSubmit={(e) => void handleSave(e)}
      className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50/50 p-4"
    >
      <h4 className="text-sm font-bold text-slate-800">Add a memory</h4>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Where did you meet?
          </label>
          <input
            type="text"
            placeholder="e.g. SaaStr Annual 2024, Dublin"
            value={metAt}
            onChange={(e) => setMetAt(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="w-36 shrink-0">
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={todayStr}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* Context tags */}
      <div>
        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Context
        </label>
        <div className="flex flex-wrap gap-1.5">
          {CONTEXT_TAGS.map((tag) => {
            const active = selectedTags.includes(tag)
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors"
                style={{
                  background: active ? '#2563eb' : '#f1f5f9',
                  color: active ? '#fff' : '#64748b',
                }}
              >
                {active && <Tag className="h-3 w-3" />}
                {tag}
              </button>
            )
          })}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Notes
        </label>
        <textarea
          placeholder="What did you talk about? Any follow-ups?"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-600 transition-opacity active:opacity-70"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white shadow-sm disabled:opacity-60 transition-opacity active:opacity-80"
          style={{ background: 'linear-gradient(135deg,#3b82f6,#2563eb)' }}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Memory
        </button>
      </div>
    </form>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MeetingMemory({
  contactId,
  contactName,
}: {
  contactId: string
  contactName: string
}) {
  const [memories, setMemories] = useState<Memory[]>([])
  const [adding, setAdding] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const initialised = useRef(false)
  const { pendingId, confirm: confirmDelete, cancel: cancelDelete } = useConfirmDelete()

  // Load: local first, then API
  useEffect(() => {
    if (initialised.current) return
    initialised.current = true

    setMemories(loadLocal(contactId))

    void (async () => {
      setSyncing(true)
      try {
        const token = await getAccessToken()
        if (!token) return
        const res = await fetch(`${API_URL}/contacts/${contactId}/memories`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return
        const data = (await res.json()) as Memory[]
        const sorted = [...data].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        setMemories(sorted)
        saveLocal(contactId, sorted)
      } catch {
        /* silent */
      } finally {
        setSyncing(false)
      }
    })()
  }, [contactId])

  const handleAdd = useCallback((m: Memory) => {
    setMemories((prev) => [m, ...prev])
    setAdding(false)
  }, [])

  function executeDelete(id: string) {
    const updated = memories.filter((m) => m.id !== id)
    setMemories(updated)
    saveLocal(contactId, updated)
    cancelDelete()
    void apiWithToken(async (token) => {
      await fetch(`${API_URL}/contacts/${contactId}/memories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
    })
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="flex min-w-0 items-center gap-2 text-left"
          aria-expanded={!collapsed}
        >
          <MapPin className="h-4 w-4 shrink-0 text-blue-500" />
          <span className="truncate text-sm font-bold text-slate-800">Meeting Memories</span>
          {memories.length > 0 && (
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{ background: '#dbeafe', color: '#1d4ed8' }}
            >
              {memories.length}
            </span>
          )}
          {syncing && <Loader2 className="h-3 w-3 shrink-0 animate-spin text-slate-400" />}
          {collapsed ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
          ) : (
            <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
          )}
        </button>

        {!collapsed && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="ml-2 flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-opacity active:opacity-70"
            style={{ background: '#3b82f6' }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="mt-3 flex flex-col gap-3">
          {/* Confirm delete banner */}
          {pendingId && (
            <DeleteConfirmBanner
              onConfirm={() => executeDelete(pendingId)}
              onCancel={cancelDelete}
            />
          )}

          {/* Add form */}
          {adding && (
            <AddMemoryForm
              contactId={contactId}
              onAdd={handleAdd}
              onCancel={() => setAdding(false)}
            />
          )}

          {/* Empty state */}
          {memories.length === 0 && !adding && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{ background: '#f1f5f9' }}
              >
                <MapPin className="h-5 w-5 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-500">No memories yet</p>
              <p className="max-w-[200px] text-xs text-slate-400">
                Record where and how you met {contactName}.
              </p>
              <button
                onClick={() => setAdding(true)}
                className="mt-1 flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white transition-opacity active:opacity-70"
                style={{ background: '#3b82f6' }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add a memory
              </button>
            </div>
          )}

          {/* Memory list */}
          {memories.map((m) => (
            <MemoryCard key={m.id} memory={m} onDeleteRequest={confirmDelete} />
          ))}
        </div>
      )}
    </div>
  )
}
