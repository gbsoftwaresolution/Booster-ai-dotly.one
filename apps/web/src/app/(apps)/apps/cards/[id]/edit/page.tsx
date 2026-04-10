'use client'

import type { JSX } from 'react'
import { useState, useEffect, use, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CardRenderer } from '@dotly/ui'
import { useCardBuilder } from '@/hooks/useCardBuilder'
import { ProfileTab } from '@/components/card-builder/ProfileTab'
import { LinksTab } from '@/components/card-builder/LinksTab'
import { MediaTab } from '@/components/card-builder/MediaTab'
import { ThemeTab } from '@/components/card-builder/ThemeTab'
import { PublishBar } from '@/components/card-builder/PublishBar'
import { QrSection } from '@/components/card-builder/QrSection'
import { LeadFormTab } from '@/components/card-builder/LeadFormTab'
import type { CardTemplate, SocialLinkData, MediaBlockData } from '@dotly/types'
import { getAccessToken } from '@/lib/supabase/client'
import { apiGet, apiPost, apiDelete } from '@/lib/api'
import {
  ArrowLeft,
  User,
  Link2,
  Image,
  Palette,
  Eye,
  QrCode,
  BarChart2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ClipboardList,
  Copy,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/cn'

type Tab = 'profile' | 'links' | 'media' | 'theme' | 'qr' | 'form' | 'preview'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'links', label: 'Links', icon: Link2 },
  { id: 'media', label: 'Media', icon: Image },
  { id: 'theme', label: 'Theme', icon: Palette },
  { id: 'qr', label: 'QR', icon: QrCode },
  { id: 'form', label: 'Form', icon: ClipboardList },
  { id: 'preview', label: 'Preview', icon: Eye },
]

interface EditPageProps {
  params: Promise<{ id: string }>
}

interface AnalyticsSummary {
  totalViews: number
  totalClicks: number
  totalLeads: number
}

// ─── Focus-trapping confirm dialog ───────────────────────────────────────────

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
  const panelRef = useRef<HTMLDivElement>(null)

  // Focus trap + Escape key
  useEffect(() => {
    const el = panelRef.current
    if (!el) return
    const focusable = el.querySelectorAll<HTMLElement>(
      'button:not([disabled]),[tabindex]:not([tabindex="-1"])',
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    first?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        if (!busy) onCancel()
        return
      }
      if (e.key !== 'Tab') return
      if (focusable.length === 0) {
        e.preventDefault()
        return
      }
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
    el.addEventListener('keydown', onKeyDown)
    return () => el.removeEventListener('keydown', onKeyDown)
  }, [busy, onCancel])

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        className="app-shell-surface w-full max-w-sm rounded-3xl p-6"
      >
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50">
            <AlertTriangle className="h-5 w-5 text-red-500" aria-hidden="true" />
          </span>
          <h2 id="confirm-title" className="text-base font-bold text-gray-900">
            {title}
          </h2>
        </div>
        <p id="confirm-desc" className="text-sm text-gray-500 leading-relaxed">
          {message}
        </p>
        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 rounded-2xl border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 active:scale-95 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 rounded-2xl bg-red-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-red-500/20 transition-all hover:bg-red-600 active:scale-95 disabled:opacity-50"
          >
            {busy ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CardEditPage({ params }: EditPageProps): JSX.Element {
  const { id } = use(params)
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)
  const router = useRouter()
  const [duplicating, setDuplicating] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // Auto-dismiss action error after 5 s
  useEffect(() => {
    if (!actionError) return
    const t = setTimeout(() => setActionError(null), 5000)
    return () => clearTimeout(t)
  }, [actionError])

  const {
    card,
    theme,
    socialLinks,
    mediaBlocks,
    vcardPolicy,
    saveStatus,
    loading,
    error,
    updateField,
    updateHandle,
    updateTheme,
    updateTemplate,
    updateSocialLinks,
    updateMediaBlocks,
    updateVcardPolicy,
    publishCard,
    unpublishCard,
    saveNow,
  } = useCardBuilder(id)

  const cardLoaded = card !== null

  const handleDuplicate = useCallback(async () => {
    setDuplicating(true)
    setActionError(null)
    try {
      const token = await getAccessToken()
      const newCard = await apiPost<{ id: string }>(`/cards/${id}/duplicate`, {}, token)
      router.push(`/apps/cards/${newCard.id}/edit`)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to duplicate card')
    } finally {
      setDuplicating(false)
    }
  }, [id, router])

  const handleDelete = useCallback(async () => {
    setDeleting(true)
    setActionError(null)
    try {
      const token = await getAccessToken()
      await apiDelete(`/cards/${id}`, token)
      router.push('/apps/cards')
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Failed to delete card')
      setDeleting(false)
    }
  }, [id, router])

  useEffect(() => {
    if (!cardLoaded) return
    async function load() {
      try {
        const token = await getAccessToken()
        const data = await apiGet<AnalyticsSummary>(`/cards/${id}/analytics/summary`, token)
        setAnalytics(data)
      } catch {
        // not yet available — ignore
      }
    }
    void load()
    const interval = setInterval(() => void load(), 60_000)
    return () => clearInterval(interval)
  }, [id, cardLoaded])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-brand-500 border-t-transparent" />
          <p className="text-sm text-gray-400 font-medium">Loading editor…</p>
        </div>
      </div>
    )
  }

  if (error || !card) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-50 p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-10 w-10 text-red-400" />
          <p className="text-sm font-medium text-gray-700">{error ?? 'Card not found'}</p>
          <Link href="/apps/cards" className="text-sm text-brand-600 font-medium hover:underline">
            Back to cards
          </Link>
        </div>
      </div>
    )
  }

  const rendererProps = {
    card,
    theme,
    socialLinks,
    mediaBlocks,
    mode: 'preview' as const,
    onLeadCapture: () => {},
    onSaveContact: () => {},
  }

  const saveIndicator = () => {
    if (saveStatus === 'saving')
      return (
        <span className="flex items-center gap-1.5 text-xs text-yellow-600 font-medium">
          <Loader2 className="h-3 w-3 animate-spin" /> Saving…
        </span>
      )
    if (saveStatus === 'saved')
      return (
        <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
          <CheckCircle2 className="h-3 w-3" /> Saved
        </span>
      )
    if (saveStatus === 'error')
      return (
        <span className="flex items-center gap-1.5 text-xs text-red-500 font-medium">
          <AlertCircle className="h-3 w-3" /> Failed
        </span>
      )
    return null
  }

  return (
    <>
      <div className="flex h-full flex-col bg-[linear-gradient(180deg,#f7faff_0%,#f1f5fb_100%)]">
        {/* ── Header ── */}
        <header className="app-shell-surface mx-3 mt-3 flex shrink-0 items-center gap-3 rounded-[28px] px-4 py-3 lg:px-6">
          {/* Back */}
          <Link
            href="/apps/cards"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          {/* Card identity */}
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-gray-900 truncate leading-tight">
              {(card.fields as unknown as Record<string, string>).name || 'Untitled Card'}
            </h1>
            <p className="text-xs text-gray-400 truncate">dotly.one/{card.handle}</p>
          </div>

          {/* Analytics — desktop only */}
          {analytics && (
            <Link
              href={`/apps/cards/${id}/analytics`}
              className="hidden items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-1.5 transition-colors hover:border-sky-200 hover:bg-sky-50 lg:flex"
            >
              <BarChart2 className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-xs text-gray-500">
                <span className="font-semibold text-sky-600">{analytics.totalViews}</span> views
              </span>
              <span className="text-[10px] text-gray-300">·</span>
              <span className="text-xs text-gray-500">
                <span className="font-semibold text-purple-600">{analytics.totalClicks}</span>{' '}
                clicks
              </span>
              <span className="text-[10px] text-gray-300">·</span>
              <span className="text-xs text-gray-500">
                <span className="font-semibold text-green-600">{analytics.totalLeads}</span> leads
              </span>
            </Link>
          )}

          {/* Save indicator + button */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:block">{saveIndicator()}</div>

            {/* Duplicate button */}
            <button
              type="button"
              onClick={() => void handleDuplicate()}
              disabled={duplicating}
              title="Duplicate card"
              aria-label="Duplicate card"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-500 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {duplicating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>

            {/* Delete button */}
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete card"
              aria-label="Delete card"
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500 transition-all active:scale-95"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => void saveNow()}
              disabled={saveStatus === 'saving'}
              className={cn(
                'rounded-xl px-4 py-2 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
                saveStatus === 'error'
                  ? 'bg-red-500 text-white hover:bg-red-600'
                  : 'bg-brand-500 text-white hover:bg-brand-600 shadow-sm shadow-brand-500/25',
              )}
            >
              {saveStatus === 'saving' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </header>

        {/* ── Main layout ── */}
        <div className="flex flex-1 overflow-hidden px-3 pb-3 pt-3">
          {/* Left / full-width editor panel */}
          <div className="app-shell-surface flex w-full flex-col rounded-[30px] lg:w-[440px] lg:shrink-0">
            {/* Tab bar — iOS pill style */}
            <div className="shrink-0 border-b border-slate-100 px-3 pt-3 pb-2">
              <div className="flex gap-0.5">
                {TABS.map((tab) => {
                  const Icon = tab.icon
                  const active = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex flex-1 flex-col items-center gap-1 rounded-xl py-2.5 transition-all duration-150',
                        active
                          ? 'bg-brand-50 text-brand-600 shadow-sm'
                          : 'text-gray-400 hover:bg-white/80 hover:text-gray-600',
                      )}
                    >
                      <Icon className={cn('h-4 w-4 transition-transform', active && 'scale-110')} />
                      <span
                        className={cn(
                          'text-[10px] font-semibold leading-none',
                          active ? 'text-brand-600' : 'text-gray-400',
                        )}
                      >
                        {tab.label}
                      </span>
                    </button>
                  )
                })}
              </div>
              {/* Active underline */}
              <div className="mt-2 h-0.5 rounded-full bg-gray-100 relative overflow-hidden">
                <div
                  className="absolute inset-y-0 rounded-full bg-brand-500 transition-all duration-200"
                  style={{
                    left: `${TABS.findIndex((t) => t.id === activeTab) * (100 / TABS.length)}%`,
                    width: `${100 / TABS.length}%`,
                  }}
                />
              </div>
            </div>

            {/* Tab content — mobile Preview tab shows the phone mockup inline */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'preview' ? (
                /* ── Mobile inline preview ── */
                <div className="flex min-h-full items-start justify-center bg-[linear-gradient(180deg,#eef5ff_0%,#e8eef8_100%)] p-6">
                  <div className="relative w-full max-w-[340px]">
                    <div className="mx-auto overflow-hidden rounded-[36px] border-[8px] border-gray-800 shadow-2xl bg-white">
                      <div className="h-6 bg-gray-800 flex items-center justify-center">
                        <div className="h-1.5 w-16 rounded-full bg-gray-700" />
                      </div>
                      <div className="max-h-[580px] overflow-y-auto">
                        <CardRenderer {...rendererProps} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className={cn(
                    'px-4 py-4',
                    // On mobile add extra bottom padding so content isn't hidden behind the bottom nav bar
                    'pb-28 lg:pb-6',
                  )}
                >
                  {activeTab === 'profile' && (
                    <ProfileTab
                      cardId={id}
                      fields={card.fields as unknown as Record<string, string>}
                      handle={card.handle}
                      vcardPolicy={vcardPolicy}
                      onFieldChange={updateField}
                      onHandleChange={updateHandle}
                      onVcardPolicyChange={updateVcardPolicy}
                    />
                  )}
                  {activeTab === 'links' && (
                    <LinksTab
                      links={socialLinks}
                      onChange={updateSocialLinks as (links: SocialLinkData[]) => void}
                    />
                  )}
                  {activeTab === 'media' && (
                    <MediaTab
                      cardId={id}
                      mediaBlocks={mediaBlocks}
                      onChange={updateMediaBlocks as (blocks: MediaBlockData[]) => void}
                    />
                  )}
                  {activeTab === 'theme' && (
                    <ThemeTab
                      templateId={card.templateId}
                      theme={theme}
                      onTemplateChange={updateTemplate as (t: CardTemplate) => void}
                      onThemeChange={updateTheme}
                    />
                  )}
                  {activeTab === 'qr' && <QrSection cardId={id} />}
                  {activeTab === 'form' && <LeadFormTab cardId={id} />}
                </div>
              )}
            </div>

            {/* Publish bar — hidden on preview, qr, and form tabs */}
            {activeTab !== 'preview' && activeTab !== 'qr' && activeTab !== 'form' && (
              <PublishBar
                handle={card.handle}
                isActive={card.isActive}
                onPublish={publishCard}
                onUnpublish={unpublishCard}
              />
            )}
          </div>

          {/* ── Right preview panel — desktop only ── */}
          <div className="hidden flex-1 items-start justify-center overflow-y-auto rounded-[30px] bg-[linear-gradient(180deg,#eaf2ff_0%,#eef1f7_100%)] p-10 lg:ml-3 lg:flex">
            <div className="sticky top-10">
              {/* Phone frame */}
              <div className="relative w-[375px]">
                <div className="mx-auto overflow-hidden rounded-[44px] border-[10px] border-gray-800 shadow-[0_40px_80px_rgba(0,0,0,0.3)] bg-white">
                  {/* Notch */}
                  <div className="h-7 bg-gray-800 flex items-center justify-center gap-2 px-4">
                    <div className="h-1.5 w-20 rounded-full bg-gray-700" />
                  </div>
                  <div className="max-h-[660px] overflow-y-auto">
                    <CardRenderer {...rendererProps} />
                  </div>
                </div>
                {/* Reflection under phone */}
                <div className="mt-4 mx-8 h-6 rounded-[50%] bg-black/10 blur-xl" />
              </div>

              {/* Live / Draft label under phone */}
              <div className="mt-5 flex justify-center">
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
                    card.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
                  )}
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full',
                      card.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400',
                    )}
                  />
                  {card.isActive ? 'Live preview' : 'Draft preview'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action error banner */}
      {actionError && (
        <div
          role="alert"
          className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+72px)] left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl bg-red-50 border border-red-100 px-4 py-3 shadow-lg max-w-sm w-full mx-4 lg:bottom-6"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <p className="flex-1 text-sm text-red-700">{actionError}</p>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-red-300 hover:text-red-500 text-lg leading-none"
            aria-label="Dismiss"
          >
            &times;
          </button>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete card?"
          message={`"${(card?.fields as unknown as Record<string, string>)?.name || card?.handle || 'This card'}" will be permanently deleted and its public link will stop working.`}
          confirmLabel="Delete"
          onConfirm={() => void handleDelete()}
          onCancel={() => setShowDeleteConfirm(false)}
          busy={deleting}
        />
      )}
    </>
  )
}
