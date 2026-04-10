'use client'

import type { JSX } from 'react'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Eye,
  MousePointerClick,
  CreditCard,
  Pencil,
  BarChart3,
  Inbox,
  Mail,
  FileSignature,
  ArrowRight,
  Zap,
  Users,
  Copy,
  Trash2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'
import { getAccessToken } from '@/lib/supabase/client'
import { apiGet, apiDelete, apiPost } from '@/lib/api'
import { cn } from '@/lib/cn'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CardSummary {
  id: string
  handle: string
  templateId: string
  isActive: boolean
  fields: Record<string, unknown>
  viewCount?: number
  _count?: { analytics: number }
}

interface DashboardSummary {
  totalViews: number
  totalClicks: number
  totalLeads: number
  totalCards: number
  activeCards: number
  truncated: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeStr(val: unknown): string {
  return typeof val === 'string' ? val : ''
}

// Locale-aware number formatter — turns 10000 into "10,000" (or "10.000" in DE)
function fmt(n: number | string | null | undefined): string {
  if (n == null || n === '--') return '--'
  const num = typeof n === 'string' ? parseFloat(n) : n
  if (isNaN(num)) return '--'
  return num.toLocaleString()
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  color,
}: {
  label: string
  value: number | string
  subValue?: string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', color)}>
          <Icon className="h-4 w-4 text-white" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-bold text-gray-900 tabular-nums">{value}</p>
      {subValue && (
        <p className="mt-1 text-xs font-medium text-gray-400">{subValue}</p>
      )}
    </div>
  )
}

// ─── Confirm dialog (accessible) ─────────────────────────────────────────────

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
  const cancelRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  // Focus the cancel button when dialog opens (#3)
  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  // Escape key to close (#3) and focus trap (#3)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) {
        onCancel()
        return
      }
      // Focus trap: keep Tab/Shift-Tab within the dialog
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last?.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first?.focus()
          }
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [busy, onCancel])

  return (
    // Fix #14: backdrop click closes the dialog
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget && !busy) onCancel() }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-desc"
        className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl"
        style={{ animation: 'dialog-up 0.22s cubic-bezier(.32,1.2,.56,1) both' }}
      >
        <style>{`
          @keyframes dialog-up {
            from { opacity: 0; transform: translateY(24px) scale(.97); }
            to   { opacity: 1; transform: none; }
          }
        `}</style>
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-500" aria-hidden="true" />
          </span>
          <h2 id="dialog-title" className="text-base font-bold text-gray-900">{title}</h2>
        </div>
        <p id="dialog-desc" className="text-sm text-gray-500 leading-relaxed">{message}</p>
        <div className="mt-5 flex gap-2.5">
          <button
            ref={cancelRef}
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
            {busy ? 'Deleting\u2026' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Error banner (accessible) ────────────────────────────────────────────────

function ErrorBanner({
  message,
  onDismiss,
  onRetry,
}: {
  message: string
  onDismiss: () => void
  onRetry?: () => void
}) {
  return (
    // Fix #8: role=alert so screen readers announce it immediately
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-center gap-3 rounded-2xl bg-red-50 border border-red-100 px-4 py-3"
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
      <p className="flex-1 text-sm text-red-700">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      )}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss error"
        className="text-red-300 hover:text-red-500 transition-colors text-lg leading-none"
      >
        &times;
      </button>
    </div>
  )
}

// ─── Action button ────────────────────────────────────────────────────────────

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
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        danger
          ? 'text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500 focus-visible:ring-red-400'
          : 'text-gray-400 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-500 focus-visible:ring-sky-400',
      )}
    >
      {children}
    </button>
  )
}

// Module-level constants — NEXT_PUBLIC_ vars are inlined at build time
const APP_URL = process.env.NEXT_PUBLIC_WEB_URL ?? ''
// Human-readable base host for card URL display — e.g. "dotly.one"
const DISPLAY_HOST = APP_URL.replace(/^https?:\/\//, '').replace(/\/$/, '') || 'dotly.one'

// ─── Card tile (with error boundary guard on fields) ──────────────────────────

function CardTile({
  card,
  onDuplicate,
  onDelete,
  duplicating,
}: {
  card: CardSummary
  onDuplicate: (card: CardSummary) => void
  onDelete: (card: CardSummary) => void
  duplicating: boolean
}) {
  // Fix #11/#17: use safeStr() so malformed/non-string fields can't crash the tile
  const name =
    safeStr(card.fields['name']) ||
    safeStr(card.fields['fullName']) ||
    card.handle
  const title = safeStr(card.fields['title'])
  const company = safeStr(card.fields['company'])
  const avatarUrl = safeStr(card.fields['avatarUrl'])
  const initials = name
    .split(' ')
    .map((n) => n[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const viewCount = card.viewCount ?? 0

  return (
    <div
      className={cn(
        'group relative flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200',
        'hover:-translate-y-px hover:shadow-md hover:shadow-gray-200/80 hover:border-gray-200',
        duplicating && 'pointer-events-none opacity-60',
      )}
    >
      {duplicating && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70 backdrop-blur-[2px]">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#0ea5e9"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-label="Duplicating"
            style={{ animation: 'spin .75s linear infinite' }}
          >
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </div>
      )}

      {/* Fix #15: avatarUrl served from known CDN — no longer unoptimized */}
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={name}
          width={52}
          height={52}
          className="h-[52px] w-[52px] shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm"
        />
      ) : (
        <div
          className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ring-2 ring-white"
          style={{ background: 'linear-gradient(135deg,#38bdf8,#0ea5e9)' }}
          aria-hidden="true"
        >
          {initials || 'C'}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-gray-900">{name}</p>
        {(title || company) && (
          <p className="truncate text-xs text-gray-500">
            {[title, company].filter(Boolean).join(' \u00b7 ')}
          </p>
        )}
        <p className="truncate text-[11px] text-gray-300 mt-0.5">{DISPLAY_HOST}/{card.handle}</p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2">
        <div className="flex items-center gap-1.5">
          {viewCount > 0 && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-400">
              {fmt(viewCount)} view{viewCount !== 1 ? 's' : ''}
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

        {/* Fixed 5-button row — always the same width regardless of isActive */}
        <div className="flex items-center gap-1">
          {/* Edit */}
          <Link
            href={`/apps/cards/${card.id}/edit`}
            aria-label={`Edit ${name}`}
            title={`Edit ${name}`}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 transition-all hover:border-sky-200 hover:bg-sky-50 hover:text-sky-500 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>

          {/* Duplicate */}
          <ActionBtn
            onClick={() => onDuplicate(card)}
            label={`Duplicate ${name}`}
            disabled={duplicating}
          >
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          </ActionBtn>

          {/* Per-card analytics */}
          <Link
            href={`/apps/cards/${card.id}/analytics`}
            aria-label={`Analytics for ${name}`}
            title={`Analytics for ${name}`}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 transition-all hover:border-sky-200 hover:bg-sky-50 hover:text-sky-500 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1"
          >
            <BarChart3 className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>

          {/* Preview — always shown; dimmed + tooltip for drafts */}
          <a
            href={`${APP_URL}/card/${card.handle}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={card.isActive ? `Preview ${name} (opens in new tab)` : `Preview ${name} — draft, not visible to visitors`}
            title={card.isActive ? `Preview ${name}` : `Draft — not visible to visitors`}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white transition-all active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1',
              card.isActive
                ? 'text-gray-400 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-500'
                : 'text-gray-200 hover:border-gray-300 hover:text-gray-400',
            )}
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>

          {/* Delete */}
          <ActionBtn
            onClick={() => onDelete(card)}
            label={`Delete ${name}`}
            danger
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </ActionBtn>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CardsDashboard(): JSX.Element {
  const router = useRouter()
  const [cards, setCards] = useState<CardSummary[]>([])
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchFailed, setFetchFailed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CardSummary | null>(null)
  const [lastFocusedRef] = useState<{ el: HTMLElement | null }>({ el: null })
  const [deleting, setDeleting] = useState(false)
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null)

  // Fix #13: cache the token for the lifetime of the page render cycle
  const tokenRef = useRef<string | undefined>(undefined)
  const getToken = useCallback(async (): Promise<string | undefined> => {
    if (tokenRef.current !== undefined) return tokenRef.current
    const t = await getAccessToken()
    tokenRef.current = t ?? undefined
    return tokenRef.current
  }, [])


  // Fix #4: AbortController so in-flight fetches are cancelled on unmount/re-fetch
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setFetchFailed(false)
    setError(null)
    setSummary(null)   // clear stale stats so skeleton shows during refresh
    // Reset token cache so a fresh token is fetched on each explicit reload
    tokenRef.current = undefined

    try {
      const token = await getToken()
      // Fetch cards and summary independently — a summary failure should not
      // prevent the card list from rendering, and vice versa.
      const [cardsResult, summaryResult] = await Promise.allSettled([
        apiGet<CardSummary[]>('/cards', token, controller.signal),
        apiGet<DashboardSummary>('/analytics/dashboard-summary', token, controller.signal),
      ])
      if (controller.signal.aborted) return

      if (cardsResult.status === 'fulfilled') {
        setCards(cardsResult.value)
      } else {
        setFetchFailed(true)
        setError(cardsResult.reason instanceof Error ? cardsResult.reason.message : 'Failed to load cards')
      }

      if (summaryResult.status === 'fulfilled') {
        setSummary(summaryResult.value)
      }
      // Summary failure is non-fatal: stats show "--" and the card list still renders
    } catch (err) {
      if (controller.signal.aborted) return
      setFetchFailed(true)
      setError(err instanceof Error ? err.message : 'Failed to load cards')
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    void fetchData()
    return () => { abortRef.current?.abort() }
  }, [fetchData])

  // Fix #3: return focus to the trigger element when dialog closes
  function openDeleteDialog(card: CardSummary, triggerEl: HTMLElement) {
    // Guard: don't store body or null — focus return to body jumps to page top
    if (triggerEl && triggerEl !== document.body) {
      lastFocusedRef.el = triggerEl
    }
    setDeleteTarget(card)
  }

  function closeDeleteDialog() {
    setDeleteTarget(null)
    lastFocusedRef.el?.focus()
    lastFocusedRef.el = null
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const token = await getToken()
      await apiDelete(`/cards/${deleteTarget.id}`, token)
      const wasActive = deleteTarget.isActive
      setCards((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      // Optimistically update summary counts so the stat cards reflect
      // the deletion immediately without waiting for the next full reload.
      setSummary((prev) => prev ? {
        ...prev,
        totalCards: Math.max(0, prev.totalCards - 1),
        activeCards: wasActive ? Math.max(0, prev.activeCards - 1) : prev.activeCards,
        totalViews: Math.max(0, prev.totalViews - (deleteTarget.viewCount ?? 0)),
      } : prev)
      closeDeleteDialog()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete card')
      setDeleteTarget(null)
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
      // Optimistically bump totalCards — the duplicate is always created as a draft.
      setSummary((prev) => prev ? {
        ...prev,
        totalCards: prev.totalCards + 1,
        // activeCards unchanged — duplicates start as draft (isActive: false)
      } : prev)
      router.push(`/apps/cards/${newCard.id}/edit`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate card')
    } finally {
      setDuplicatingId(null)
    }
  }

  // All aggregate stats come from the dashboard-summary endpoint so they are
  // always consistent and accurate regardless of the 100-card display cap.
  // Falls back to null (shown as "--") if the summary hasn't loaded yet.
  const totalCards   = summary?.totalCards   ?? null
  const activeCards  = summary?.activeCards  ?? null
  const totalViews   = summary?.totalViews   ?? null
  const totalClicks  = summary?.totalClicks  ?? null
  const totalLeads   = summary?.totalLeads   ?? null
  const isTruncated  = summary?.truncated    ?? false

  return (
    <>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cards</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your digital business cards and track engagement
            </p>
          </div>
          {/* Fix #12: always-visible create button; mobile gets full-width treatment */}
          <Link
            href="/apps/cards/create"
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
            style={{ background: 'linear-gradient(135deg,#38bdf8,#0ea5e9)' }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Card
          </Link>
        </div>

        {/* Error banner */}
        {/* Fix #2: show retry when initial load failed; hide stats on failure */}
        {error && (
          <ErrorBanner
            message={error}
            onDismiss={() => setError(null)}
            onRetry={fetchFailed ? () => void fetchData() : undefined}
          />
        )}

        {/* Fix #5: truncation notice */}
        {isTruncated && !loading && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-2.5 text-sm text-amber-700"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            Showing the first 100 cards. Stats reflect only those cards.
          </div>
        )}

        {/* Stats — hidden on failed load to avoid misleading zeros (Fix #2) */}
        {loading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100" />
            ))}
          </div>
        ) : !fetchFailed && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {/* totalCards from backend — accurate even when user has >100 cards */}
            <StatCard
              label="Total Cards"
              value={fmt(totalCards)}
              subValue={activeCards != null ? `${fmt(activeCards)} live` : undefined}
              icon={CreditCard}
              color="bg-sky-500"
            />
            <StatCard
              label="Total Views"
              value={fmt(totalViews)}
              icon={Eye}
              color="bg-violet-500"
            />
            <StatCard
              label="Total Clicks"
              value={fmt(totalClicks)}
              icon={MousePointerClick}
              color="bg-emerald-500"
            />
            <StatCard
              label="Total Leads"
              value={fmt(totalLeads)}
              icon={Users}
              color="bg-orange-400"
            />
          </div>
        )}

        {/* Cards list */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">My Cards</h2>
            {!fetchFailed && totalCards != null && totalCards > 0 && (
              <span className="text-sm text-gray-400">
                {fmt(totalCards)} total{isTruncated ? ' (showing 100)' : ''}
              </span>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-[80px] animate-pulse rounded-2xl bg-gray-100" />
              ))}
            </div>
          ) : fetchFailed ? null : cards.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50">
                <CreditCard className="h-7 w-7 text-sky-500" aria-hidden="true" />
              </div>
              <p className="text-base font-semibold text-gray-900">No cards yet</p>
              <p className="mt-1 text-sm text-gray-500">Create your first digital business card</p>
              <Link
                href="/apps/cards/create"
                className="mt-5 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg,#38bdf8,#0ea5e9)' }}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create Card
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {cards.map((card) => (
                <CardTile
                  key={card.id}
                  card={card}
                  onDuplicate={(c) => void handleDuplicate(c)}
                  onDelete={(c) => {
                    // Fix #3: capture the triggering element for focus return
                    const btn = document.activeElement as HTMLElement
                    openDeleteDialog(c, btn)
                  }}
                  duplicating={duplicatingId === card.id}
                />
              ))}
            </div>
          )}
        </section>

        {/* Quick access tools */}
        <section>
          <h2 className="mb-4 text-base font-semibold text-gray-900">Tools</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/apps/cards/email-templates"
              className="group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50">
                <Mail className="h-5 w-5 text-violet-500" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900">Email Templates</p>
                <p className="text-xs text-gray-500">Branded follow-up email templates</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>

            <Link
              href="/apps/cards/email-signature"
              className="group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                <FileSignature className="h-5 w-5 text-emerald-500" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900">Email Signature</p>
                <p className="text-xs text-gray-500">Generate your HTML email signature</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>

            <Link
              href="/apps/cards/analytics"
              className="group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50">
                <BarChart3 className="h-5 w-5 text-sky-500" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-900">Analytics</p>
                <p className="text-xs text-gray-500">Views, clicks and lead captures</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>

            <Link
              href="/apps/crm/leads"
              className="group flex items-center gap-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 transition-all hover:border-violet-200 hover:bg-violet-50"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
                <Inbox className="h-5 w-5 text-violet-500" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-gray-700">View CRM Leads</p>
                <p className="text-xs text-gray-400">See contacts captured from your cards</p>
              </div>
              <Zap className="h-4 w-4 text-violet-300 transition-colors group-hover:text-violet-500" aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* Fix #12: Mobile floating action button */}
        <Link
          href="/apps/cards/create"
          aria-label="Create new card"
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+72px)] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg shadow-sky-500/30 transition-transform active:scale-95 sm:hidden"
          style={{ background: 'linear-gradient(135deg,#38bdf8,#0ea5e9)' }}
        >
          <Plus className="h-6 w-6 text-white" aria-hidden="true" />
        </Link>
      </div>

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete card?"
          message={`"${safeStr(deleteTarget.fields['name']) || deleteTarget.handle}" will be permanently deleted and its public link will stop working.`}
          confirmLabel="Delete"
          onConfirm={() => void handleDelete()}
          onCancel={closeDeleteDialog}
          busy={deleting}
        />
      )}
    </>
  )
}
