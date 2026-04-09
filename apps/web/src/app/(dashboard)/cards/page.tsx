'use client'

import type { JSX } from 'react'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { CreditCard, Plus, ExternalLink, Pencil, Trash2, Copy, AlertTriangle } from 'lucide-react'
import { getAccessToken } from '@/lib/supabase/client'
import { apiGet, apiDelete, apiPost } from '@/lib/api'
import { cn } from '@/lib/cn'

interface CardSummary {
  id: string
  handle: string
  templateId: string
  isActive: boolean
  fields: Record<string, string>
  viewCount?: number
  _count?: { analytics: number }
}

async function getToken(): Promise<string | undefined> {
  return (await getAccessToken()) ?? undefined
}

/** Inline confirm dialog — glass-morphism bottom sheet with entrance animation */
function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  busy,
}: {
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  busy: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
        style={{ animation: 'dialog-up 0.22s cubic-bezier(.32,1.2,.56,1) both' }}
      >
        <style>{`
          @keyframes dialog-up {
            from { opacity: 0; transform: translateY(24px) scale(.97); }
            to   { opacity: 1; transform: none; }
          }
        `}</style>

        {/* Icon + title */}
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </span>
          <div>
            <h2 className="text-base font-bold text-gray-900">{title}</h2>
          </div>
        </div>

        <p className="text-sm text-gray-500 leading-relaxed">{message}</p>

        {/* Actions */}
        <div className="mt-5 flex gap-2.5">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-2xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 active:scale-95 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 rounded-2xl bg-red-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-500/20 transition-all hover:bg-red-600 active:scale-95 disabled:opacity-50"
          >
            {busy ? (
              <span className="inline-flex items-center gap-1.5">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  style={{ animation: 'spin .75s linear infinite' }}
                >
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Deleting…
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Inline error toast with dismiss */
function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-red-50 border border-red-100 px-4 py-3">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ef4444"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <p className="flex-1 text-sm text-red-700">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss error"
        className="text-red-300 hover:text-red-500 transition-colors"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}

/** Icon action button with tooltip */
function ActionBtn({
  onClick,
  label,
  danger = false,
  disabled = false,
  children,
}: {
  onClick: () => void
  label: string
  danger?: boolean
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        'relative flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white transition-all active:scale-90 disabled:cursor-not-allowed disabled:opacity-40',
        danger
          ? 'text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500'
          : 'text-gray-400 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-500',
      )}
    >
      {children}
    </button>
  )
}

export default function CardsPage(): JSX.Element {
  const router = useRouter()
  const [cards, setCards] = useState<CardSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CardSummary | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)

  const loadCards = useCallback(async () => {
    try {
      const token = await getToken()
      const data = await apiGet<CardSummary[]>('/cards', token)
      setCards(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cards')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCards()
  }, [loadCards])

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const token = await getToken()
      await apiDelete(`/cards/${deleteTarget.id}`, token)
      setCards((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete card')
    } finally {
      setDeleting(false)
    }
  }

  async function handleDuplicate(card: CardSummary) {
    setDuplicatingId(card.id)
    try {
      const token = await getToken()
      const newCard = await apiPost<CardSummary>(`/cards/${card.id}/duplicate`, {}, token)
      setCards((prev) => [newCard, ...prev])
      router.push(`/cards/${newCard.id}/edit`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate card')
    } finally {
      setDuplicatingId(null)
    }
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Cards</h1>
          <p className="mt-1 text-sm text-gray-400">Manage your digital business cards.</p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[88px] animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  // ── Empty state ───────────────────────────────────────────────────────────────
  if (!error && cards.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50">
          <CreditCard className="h-8 w-8 text-brand-400" />
        </div>
        <h2 className="text-lg font-bold text-gray-800">No cards yet</h2>
        <p className="mt-1 max-w-[240px] text-sm text-gray-400">
          Create your first digital business card and start sharing.
        </p>
        <Link
          href="/cards/create"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-brand-500/25 hover:bg-brand-600 active:scale-95 transition-transform"
        >
          <Plus className="h-4 w-4" />
          Create your first card
        </Link>
      </div>
    )
  }

  // ── Card list ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Cards</h1>
            <p className="mt-0.5 text-sm text-gray-400">
              {cards.length} card{cards.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href="/cards/create"
            className="hidden items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-500/20 hover:bg-brand-600 transition-colors active:scale-95 lg:inline-flex"
          >
            <Plus className="h-4 w-4" />
            New Card
          </Link>
        </div>

        {/* Error banner */}
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        {/* Card tiles */}
        <div className="space-y-2.5">
          {cards.map((card) => {
            const name = (card.fields['name'] as string | undefined) ?? card.handle
            const title = (card.fields['title'] as string | undefined) ?? ''
            const company = (card.fields['company'] as string | undefined) ?? ''
            const initials = name
              .split(' ')
              .map((n) => n[0] ?? '')
              .slice(0, 2)
              .join('')
              .toUpperCase()
            const isDuplicating = duplicatingId === card.id
            const viewCount = card.viewCount ?? 0

            return (
              <div
                key={card.id}
                className={cn(
                  'group relative flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200',
                  'hover:-translate-y-px hover:shadow-md hover:shadow-gray-200/80 hover:border-gray-200',
                  isDuplicating && 'pointer-events-none opacity-60',
                )}
              >
                {/* Duplicating overlay */}
                {isDuplicating && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70 backdrop-blur-[2px]">
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#0ea5e9"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      style={{ animation: 'spin .75s linear infinite' }}
                    >
                      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                  </div>
                )}

                {/* Avatar */}
                {card.fields['avatarUrl'] ? (
                  <Image
                    src={card.fields['avatarUrl']}
                    alt={name}
                    width={52}
                    height={52}
                    unoptimized
                    className="h-[52px] w-[52px] shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm"
                  />
                ) : (
                  <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-bold text-white shadow-sm ring-2 ring-white">
                    {initials || '?'}
                  </div>
                )}

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-gray-900">{name}</p>
                  {(title || company) && (
                    <p className="truncate text-xs text-gray-500">
                      {[title, company].filter(Boolean).join(' · ')}
                    </p>
                  )}
                  <p className="truncate text-[11px] text-gray-300 mt-0.5">
                    dotly.one/{card.handle}
                  </p>
                </div>

                {/* Right side: status + actions */}
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {/* Live / Draft + analytics */}
                  <div className="flex items-center gap-1.5">
                    {viewCount > 0 && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-400">
                        {viewCount} view{viewCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
                        card.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400',
                      )}
                    >
                      {card.isActive ? 'Live' : 'Draft'}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1">
                    <ActionBtn
                      onClick={() => router.push(`/cards/${card.id}/edit`)}
                      label={`Edit ${name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </ActionBtn>

                    <ActionBtn
                      onClick={() => void handleDuplicate(card)}
                      label={`Duplicate ${name}`}
                      disabled={isDuplicating}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </ActionBtn>

                    {card.isActive && (
                      <a
                        href={`/card/${card.handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`View ${name}'s card`}
                        title={`View ${name}'s card`}
                        className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 transition-all hover:border-sky-200 hover:bg-sky-50 hover:text-sky-500 active:scale-90"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}

                    <ActionBtn
                      onClick={() => setDeleteTarget(card)}
                      label={`Delete ${name}`}
                      danger
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </ActionBtn>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Floating action button — mobile only */}
        <Link
          href="/cards/create"
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+68px)] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 shadow-lg shadow-brand-500/30 transition-transform active:scale-95 lg:hidden"
          aria-label="Create new card"
        >
          <Plus className="h-6 w-6 text-white" aria-hidden="true" />
        </Link>
      </div>

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete card?"
          message={`"${(deleteTarget.fields['name'] as string | undefined) ?? deleteTarget.handle}" will be permanently deleted and its public link will stop working.`}
          confirmLabel="Delete"
          onConfirm={() => void handleDelete()}
          onCancel={() => setDeleteTarget(null)}
          busy={deleting}
        />
      )}
    </>
  )
}
