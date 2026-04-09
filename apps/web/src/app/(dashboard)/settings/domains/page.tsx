'use client'

import { useState, useEffect, useCallback } from 'react'
import type { JSX } from 'react'
import { AlertTriangle } from 'lucide-react'
import { apiGet, apiPost, apiDelete, apiPatch } from '@/lib/api'
import { getAccessToken } from '@/lib/supabase/client'

interface CustomDomain {
  id: string
  domain: string
  status: 'PENDING' | 'ACTIVE' | 'FAILED'
  verificationToken: string
  isVerified: boolean
  sslStatus: string
  createdAt: string
  card?: {
    id: string
    handle: string
  } | null
}

interface CardOption {
  id: string
  handle: string
  fields?: { name?: string } | null
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACTIVE: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
}

export default function DomainsPage(): JSX.Element {
  const [domains, setDomains] = useState<CustomDomain[]>([])
  const [cards, setCards] = useState<CardOption[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [domainInput, setDomainInput] = useState('')
  const [error, setError] = useState('')
  const [verifyingId, setVerifyingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    domainId: string
    domain: string
  } | null>(null)

  const fetchDomains = useCallback(async () => {
    try {
      const token = await getAccessToken()
      const data = await apiGet<CustomDomain[]>('/custom-domains', token ?? undefined)
      setDomains(data)
    } catch {
      setError('Failed to load domains.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchDomains()
    // Load user cards for the assign-to-card selector
    void (async () => {
      try {
        const token = await getAccessToken()
        const data = await apiGet<CardOption[]>('/cards', token ?? undefined)
        setCards(data)
      } catch {
        // non-fatal — card selector will just be empty
      }
    })()
  }, [fetchDomains])

  async function handleAddDomain(e: React.FormEvent) {
    e.preventDefault()
    if (!domainInput.trim()) return
    setAdding(true)
    setError('')
    try {
      const token = await getAccessToken()
      await apiPost('/custom-domains', { domain: domainInput.trim() }, token ?? undefined)
      setDomainInput('')
      await fetchDomains()
    } catch {
      setError('Failed to add domain. Make sure it is a valid hostname and not already registered.')
    } finally {
      setAdding(false)
    }
  }

  async function handleVerify(domainId: string) {
    setVerifyingId(domainId)
    setError('')
    try {
      const token = await getAccessToken()
      await apiPost(`/custom-domains/${domainId}/verify`, {}, token ?? undefined)
      await fetchDomains()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Verification failed. Check TXT record.'
      setError(msg)
    } finally {
      setVerifyingId(null)
    }
  }

  async function handleAssignCard(domainId: string, cardId: string | null) {
    setAssigningId(domainId)
    try {
      const token = await getAccessToken()
      await apiPatch(`/custom-domains/${domainId}`, { cardId }, token ?? undefined)
      await fetchDomains()
    } catch {
      setError('Failed to assign card to domain.')
    } finally {
      setAssigningId(null)
    }
  }

  async function handleDelete(domainId: string) {
    setDeletingId(domainId)
    setError('')
    try {
      const token = await getAccessToken()
      await apiDelete(`/custom-domains/${domainId}`, token ?? undefined)
      setDomains((prev) => prev.filter((d) => d.id !== domainId))
    } catch {
      setError('Failed to delete domain.')
    } finally {
      setDeletingId(null)
    }
  }

  async function confirmDelete(domainId: string) {
    const domain = domains.find((d) => d.id === domainId)
    if (!domain) return
    setConfirmDialog({ domainId, domain: domain.domain })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Custom Domains</h1>
        <p className="mt-1 text-sm text-gray-500">
          Point your own domain to your Dotly card. Add a TXT record to verify ownership, then
          configure a CNAME to <code className="font-mono text-xs bg-gray-100 px-1 rounded">cname.dotly.one</code>.
        </p>
      </div>

      {/* Add domain form */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Add a Domain</h2>
        <form onSubmit={(e) => { void handleAddDomain(e) }} className="flex gap-3">
          <input
            type="text"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            placeholder="card.yourcompany.com"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <button
            type="submit"
            disabled={adding || !domainInput.trim()}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            {adding ? 'Adding...' : 'Add Domain'}
          </button>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Domain list */}
      {loading ? (
        <div className="text-sm text-gray-500">Loading domains...</div>
      ) : domains.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-400">
          No custom domains yet. Add one above.
        </div>
      ) : (
        <div className="space-y-4">
          {domains.map((domain) => (
            <div
              key={domain.id}
              className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  {/* Domain + status */}
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-sm font-semibold text-gray-900">
                      {domain.domain}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[domain.status] ?? ''}`}
                    >
                      {domain.status}
                    </span>
                    {domain.card && (
                      <span className="text-xs text-gray-400">
                        → /{domain.card.handle}
                      </span>
                    )}
                  </div>

                  {/* Assign to card */}
                  <div className="mt-3 flex items-center gap-2">
                    <label className="text-xs font-medium text-gray-500 shrink-0">Assign to card:</label>
                    <select
                      value={domain.card?.id ?? ''}
                      disabled={assigningId === domain.id}
                      onChange={(e) => { void handleAssignCard(domain.id, e.target.value || null) }}
                      className="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-xs text-gray-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
                    >
                      <option value="">— None —</option>
                      {cards.map((c) => (
                        <option key={c.id} value={c.id}>
                          /{c.handle}{c.fields?.name ? ` (${c.fields.name})` : ''}
                        </option>
                      ))}
                    </select>
                    {assigningId === domain.id && (
                      <span className="text-xs text-gray-400">Saving…</span>
                    )}
                  </div>

                  {/* TXT verification record */}
                  {domain.status !== 'ACTIVE' && (
                    <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        DNS Verification Record
                      </p>
                      <div className="space-y-1 font-mono text-xs text-gray-700">
                        <div>
                          <span className="text-gray-400">Type:</span> TXT
                        </div>
                        <div>
                          <span className="text-gray-400">Name:</span>{' '}
                          <span className="select-all">_dotly-verify.{domain.domain}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Value:</span>{' '}
                          <span className="select-all break-all">{domain.verificationToken}</span>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-gray-400">
                        After adding the record, DNS propagation may take up to 24 hours.
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex shrink-0 gap-2">
                  {domain.status !== 'ACTIVE' && (
                    <button
                      type="button"
                      onClick={() => { void handleVerify(domain.id) }}
                      disabled={verifyingId === domain.id}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {verifyingId === domain.id ? 'Checking...' : 'Verify'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { void confirmDelete(domain.id) }}
                    disabled={deletingId === domain.id}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingId === domain.id ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm remove dialog */}
      {confirmDialog && (
        <ConfirmDialog
          message={`Remove domain "${confirmDialog.domain}"? This cannot be undone.`}
          onConfirm={() => {
            const id = confirmDialog.domainId
            setConfirmDialog(null)
            void handleDelete(id)
          }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  )
}

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string
  onConfirm: () => void
  onCancel: () => void
}): JSX.Element {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onCancel} aria-hidden="true" />
      <div className="fixed inset-x-4 top-1/2 z-50 w-full max-w-sm -translate-y-1/2 rounded-xl bg-white p-6 shadow-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900">Confirm removal</h3>
            <p className="mt-1 text-sm text-gray-500">{message}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Remove
          </button>
        </div>
      </div>
    </>
  )
}
