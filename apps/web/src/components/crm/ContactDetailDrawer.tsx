'use client'

import type { JSX } from 'react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Mail, Phone, Building2, Globe, Tag, Clock } from 'lucide-react'
import { createClient, getAccessToken } from '@/lib/supabase/client'
import { apiGet, apiPut, apiPatch, apiPost } from '@/lib/api'
import { ComposeEmailModal } from './ComposeEmailModal'

export interface ContactDetail {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  company?: string | null
  title?: string | null
  website?: string | null
  notes?: string | null
  tags: string[]
  createdAt: string
  crmPipeline?: { stage: string } | null
  sourceCard?: { handle: string } | null
  timeline?: TimelineEvent[]
  // AI Enrichment fields
  inferredIndustry?: string | null
  inferredCompanySize?: string | null
  inferredSeniority?: string | null
  inferredLinkedIn?: string | null
  enrichmentScore?: number | null
  enrichmentSummary?: string | null
  enrichedAt?: string | null
}

interface TimelineEvent {
  id: string
  event: string
  metadata: Record<string, unknown>
  createdAt: string
}

interface ContactDetailDrawerProps {
  contactId: string | null
  onClose: () => void
  onUpdate?: (contact: ContactDetail) => void
}

const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED', 'LOST'] as const
type Stage = typeof STAGES[number]

const STAGE_COLORS: Record<Stage, string> = {
  NEW: 'bg-gray-100 text-gray-700 border-gray-300',
  CONTACTED: 'bg-blue-100 text-blue-700 border-blue-300',
  QUALIFIED: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  CLOSED: 'bg-green-100 text-green-700 border-green-300',
  LOST: 'bg-red-100 text-red-700 border-red-300',
}

const STAGE_ACTIVE: Record<Stage, string> = {
  NEW: 'bg-gray-700 text-white',
  CONTACTED: 'bg-blue-600 text-white',
  QUALIFIED: 'bg-yellow-500 text-white',
  CLOSED: 'bg-green-600 text-white',
  LOST: 'bg-red-600 text-white',
}

async function getToken(): Promise<string | undefined> {
  return getAccessToken()
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(p => p[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function TimelineItem({ event }: { event: TimelineEvent }): JSX.Element {
  const meta = event.metadata

  let label = event.event
  if (event.event === 'LEAD_CAPTURED') label = 'Lead captured'
  else if (event.event === 'STAGE_CHANGED') label = `Stage: ${String(meta.from ?? '')} → ${String(meta.to ?? '')}`
  else if (event.event === 'NOTE_ADDED') label = 'Note added'
  else if (event.event === 'EMAIL_SENT') label = 'Email sent'

  return (
    <div className="flex gap-3 py-2">
      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-400" />
      <div>
        <p className="text-sm text-gray-700">{label}</p>
        {event.event === 'NOTE_ADDED' && Boolean(meta.content) && (
          <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{String(meta.content)}</p>
        )}
        <p className="mt-0.5 text-xs text-gray-400">{timeAgo(event.createdAt)}</p>
      </div>
    </div>
  )
}

export function ContactDetailDrawer({ contactId, onClose, onUpdate }: ContactDetailDrawerProps): JSX.Element | null {
  const [contact, setContact] = useState<ContactDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [drawerError, setDrawerError] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const [noteSaved, setNoteSaved] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const [composeOpen, setComposeOpen] = useState(false)
  const [reenriching, setReenriching] = useState(false)
  const noteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const drawerRef = useRef<HTMLDivElement>(null)

  const loadContact = useCallback(async (id: string) => {
    setLoading(true)
    setDrawerError(null)
    try {
      const token = await getToken()
      const data = await apiGet<ContactDetail>(`/contacts/${id}`, token)
      setContact(data)
      setNoteText(data.notes ?? '')
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : 'Failed to load contact')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (contactId) void loadContact(contactId)
  }, [contactId, loadContact])

  // Escape key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const saveField = useCallback(async (field: string, value: string) => {
    if (!contact) return
    try {
      const token = await getToken()
      const updated = await apiPut<ContactDetail>(`/contacts/${contact.id}`, { [field]: value }, token)
      setContact(prev => prev ? { ...prev, ...updated } : prev)
      onUpdate?.(updated)
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : 'Failed to save field')
    }
  }, [contact, onUpdate])

  const handleStageChange = useCallback(async (stage: Stage) => {
    if (!contact) return
    try {
      const token = await getToken()
      await apiPatch(`/contacts/${contact.id}/stage`, { stage }, token)
      setContact(prev => prev ? { ...prev, crmPipeline: { ...prev.crmPipeline, stage } } : prev)
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : 'Failed to update stage')
    }
  }, [contact])

  const handleNoteChange = useCallback((value: string) => {
    setNoteText(value)
    setNoteSaved(false)
    if (noteDebounceRef.current) clearTimeout(noteDebounceRef.current)
    noteDebounceRef.current = setTimeout(async () => {
      if (!contact) return
      try {
        const token = await getToken()
        await apiPost(`/contacts/${contact.id}/notes`, { content: value }, token)
        setNoteSaved(true)
      } catch (err) {
        setDrawerError(err instanceof Error ? err.message : 'Failed to save note')
      }
    }, 500)
  }, [contact])

  const addTag = useCallback(async () => {
    if (!contact || !newTag.trim()) return
    const tags = [...contact.tags, newTag.trim()]
    try {
      const token = await getToken()
      await apiPut(`/contacts/${contact.id}`, { tags }, token)
      setContact(prev => prev ? { ...prev, tags } : prev)
      setNewTag('')
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : 'Failed to add tag')
    }
  }, [contact, newTag])

  const removeTag = useCallback(async (tag: string) => {
    if (!contact) return
    const tags = contact.tags.filter(t => t !== tag)
    try {
      const token = await getToken()
      await apiPut(`/contacts/${contact.id}`, { tags }, token)
      setContact(prev => prev ? { ...prev, tags } : prev)
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : 'Failed to remove tag')
    }
  }, [contact])

  const handleReenrich = useCallback(async () => {
    if (!contact) return
    setReenriching(true)
    const previousEnrichedAt = contact.enrichedAt
    try {
      const token = await getToken()
      await apiPost(`/contacts/${contact.id}/enrich`, {}, token)
      // Poll until enrichedAt timestamp advances (max 30 s, every 2 s)
      const contactId = contact.id
      let attempts = 0
      const poll = async () => {
        attempts++
        try {
          const refreshed = await apiGet<ContactDetail>(`/contacts/${contactId}`, await getToken())
          if (refreshed.enrichedAt !== previousEnrichedAt) {
            setContact(refreshed)
            setNoteText(refreshed.notes ?? '')
            setReenriching(false)
            return
          }
        } catch { /* ignore poll errors */ }
        if (attempts < 15) {
          setTimeout(() => void poll(), 2000)
        } else {
          // Give up and reload whatever we have
          void loadContact(contactId)
          setReenriching(false)
        }
      }
      setTimeout(() => void poll(), 2000)
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : 'Failed to start enrichment')
      setReenriching(false)
    }
  }, [contact, loadContact])

  if (!contactId) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-5 py-4">
          {contact && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-sm font-bold text-white">
              {getInitials(contact.name)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            {editingName && contact ? (
              <input
                autoFocus
                className="w-full rounded border border-indigo-300 px-2 py-1 text-sm font-semibold text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={async () => {
                  setEditingName(false)
                  if (editName.trim() && editName !== contact.name) {
                    await saveField('name', editName.trim())
                  }
                }}
                onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
              />
            ) : (
              <button
                type="button"
                onClick={() => { setEditingName(true); setEditName(contact?.name ?? '') }}
                className="block truncate text-left text-base font-semibold text-gray-900 hover:text-indigo-600"
              >
                {loading ? 'Loading...' : (contact?.name ?? '')}
              </button>
            )}
            {contact?.crmPipeline && (
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[contact.crmPipeline.stage as Stage] ?? ''}`}>
                {contact.crmPipeline.stage}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close contact details"
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {drawerError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
              <span className="shrink-0 font-semibold">Error:</span>
              <span>{drawerError}</span>
              <button
                type="button"
                className="ml-auto shrink-0 text-red-400 hover:text-red-600"
                onClick={() => setDrawerError(null)}
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </div>
          )}
          {loading && (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-8 animate-pulse rounded bg-gray-100" />)}
            </div>
          )}

          {contact && (
            <>
              {/* Contact info */}
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Contact Info</h3>
                <div className="space-y-2">
                  {[
                    { field: 'email', label: 'Email', icon: Mail, value: contact.email },
                    { field: 'phone', label: 'Phone', icon: Phone, value: contact.phone },
                    { field: 'company', label: 'Company', icon: Building2, value: contact.company },
                    { field: 'website', label: 'Website', icon: Globe, value: contact.website },
                  ].map(({ field, label, icon: Icon, value }) => (
                    <EditableField
                      key={field}
                      label={label}
                      icon={Icon}
                      value={value ?? ''}
                      onSave={v => saveField(field, v)}
                    />
                  ))}
                  {contact.sourceCard && (
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 shrink-0 text-gray-400" />
                      <span className="text-xs text-gray-500">Source:</span>
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                        /{contact.sourceCard.handle}
                      </span>
                    </div>
                  )}
                </div>
              </section>

              {/* Stage selector */}
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Stage</h3>
                <div className="flex flex-wrap gap-2">
                  {STAGES.map(stage => {
                    const isActive = contact.crmPipeline?.stage === stage
                    return (
                      <button
                        key={stage}
                        type="button"
                        onClick={() => void handleStageChange(stage)}
                        className={[
                          'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                          isActive ? STAGE_ACTIVE[stage] : STAGE_COLORS[stage],
                        ].join(' ')}
                      >
                        {stage}
                      </button>
                    )
                  })}
                </div>
              </section>

              {/* Tags */}
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {contact.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700">
                      {tag}
                      <button
                        type="button"
                        onClick={() => void removeTag(tag)}
                        className="ml-1 text-gray-400 hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="Add tag..."
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') void addTag() }}
                    className="rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-xs text-gray-500 focus:border-indigo-400 focus:outline-none"
                  />
                </div>
              </section>

              {/* Notes */}
              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Notes</h3>
                  {noteSaved && <span className="text-xs text-green-500">Saved</span>}
                </div>
                <textarea
                  rows={4}
                  className="w-full rounded-lg border border-gray-200 p-3 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  placeholder="Add a note..."
                  value={noteText}
                  onChange={e => handleNoteChange(e.target.value)}
                />
              </section>

              {/* Timeline */}
              {contact.timeline && contact.timeline.length > 0 && (
                <section>
                  <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    <Clock className="h-3.5 w-3.5" />
                    Timeline
                  </h3>
                  <div className="divide-y divide-gray-100">
                    {contact.timeline.map(event => (
                      <TimelineItem key={event.id} event={event} />
                    ))}
                  </div>
                </section>
              )}

              {/* AI Enrichment */}
              {contact.enrichedAt && (
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">AI Enrichment</h3>
                    <button
                      type="button"
                      onClick={() => void handleReenrich()}
                      disabled={reenriching}
                      className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-100 disabled:opacity-50"
                    >
                      {reenriching ? 'Queuing...' : 'Re-enrich'}
                    </button>
                  </div>
                  <div className="space-y-3">
                    {/* Score bar */}
                    {contact.enrichmentScore != null && (
                      <div>
                        <div className="mb-1 flex items-center justify-between text-xs text-gray-500">
                          <span>Confidence</span>
                          <span className="font-medium text-gray-700">{contact.enrichmentScore}/100</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                          <div
                            className="h-1.5 rounded-full bg-indigo-500"
                            style={{ width: `${contact.enrichmentScore}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {/* Summary */}
                    {contact.enrichmentSummary && (
                      <p className="rounded-lg bg-gray-50 p-3 text-sm italic text-gray-600">
                        {contact.enrichmentSummary}
                      </p>
                    )}
                    {/* Badges */}
                    <div className="flex flex-wrap gap-2">
                      {contact.inferredIndustry && (
                        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                          {contact.inferredIndustry}
                        </span>
                      )}
                      {contact.inferredSeniority && (
                        <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700">
                          {contact.inferredSeniority}
                        </span>
                      )}
                      {contact.inferredCompanySize && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                          {contact.inferredCompanySize} employees
                        </span>
                      )}
                    </div>
                    {/* LinkedIn guess */}
                    {contact.inferredLinkedIn && /^https:\/\/(www\.)?linkedin\.com\//.test(contact.inferredLinkedIn) && (
                      <a
                        href={contact.inferredLinkedIn}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                      >
                        Inferred LinkedIn: {contact.inferredLinkedIn}
                      </a>
                    )}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {/* Footer — Send Email */}
        {contact?.email && (
          <div className="border-t border-gray-200 px-5 py-4">
            <button
              type="button"
              onClick={() => setComposeOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              <Mail className="h-4 w-4" />
              Send Email
            </button>
          </div>
        )}
      </div>

      {/* Compose Email Modal */}
      {composeOpen && contact?.email && (
        <ComposeEmailModal
          contactId={contact.id}
          contactName={contact.name}
          contactEmail={contact.email}
          onClose={() => setComposeOpen(false)}
        />
      )}
    </>
  )
}

function EditableField({
  label,
  icon: Icon,
  value,
  onSave,
}: {
  label: string
  icon: React.ElementType
  value: string
  onSave: (v: string) => void
}): JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  useEffect(() => { setDraft(value) }, [value])

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-gray-400" />
        <input
          autoFocus
          className="flex-1 rounded border border-indigo-300 px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => {
            setEditing(false)
            onSave(draft)
          }}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
          placeholder={label}
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="flex w-full items-center gap-2 rounded px-0 py-1 text-left hover:bg-gray-50"
    >
      <Icon className="h-4 w-4 shrink-0 text-gray-400" />
      {value ? (
        <span className="text-sm text-gray-700">{value}</span>
      ) : (
        <span className="text-sm text-gray-400">Add {label.toLowerCase()}...</span>
      )}
    </button>
  )
}
