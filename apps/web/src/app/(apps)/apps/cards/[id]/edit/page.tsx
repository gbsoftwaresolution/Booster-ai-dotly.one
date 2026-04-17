'use client'

import type { JSX } from 'react'
import { useState, useEffect, use, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CardRenderer } from '@dotly/ui'
import { useCardBuilder } from '@/hooks/useCardBuilder'
import { ProfileTab } from '@/components/card-builder/ProfileTab'
import { LinksTab } from '@/components/card-builder/LinksTab'
import { ActionsTab } from '@/components/card-builder/ActionsTab'
import { MediaTab } from '@/components/card-builder/MediaTab'
import { ThemeTab } from '@/components/card-builder/ThemeTab'
import { PublishBar } from '@/components/card-builder/PublishBar'
import { QrSection } from '@/components/card-builder/QrSection'
import { LeadFormTab } from '@/components/card-builder/LeadFormTab'
import type { CardData, CardTemplate, SocialLinkData, MediaBlockData } from '@dotly/types'
import { getAccessToken } from '@/lib/auth/client'
import { apiGet, apiDelete } from '@/lib/api'
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
  MousePointerClick,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/cn'

type Tab = 'profile' | 'actions' | 'links' | 'media' | 'theme' | 'qr' | 'form' | 'preview'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'actions', label: 'Actions', icon: MousePointerClick },
  { id: 'links', label: 'Links', icon: Link2 },
  { id: 'media', label: 'Media', icon: Image },
  { id: 'theme', label: 'Theme', icon: Palette },
  { id: 'qr', label: 'QR', icon: QrCode },
  { id: 'form', label: 'Form', icon: ClipboardList },
  { id: 'preview', label: 'Preview', icon: Eye },
]

const EMPTY_RENDER_FIELDS: CardData['fields'] = {
  name: '',
  title: '',
  company: '',
  phone: '',
  whatsapp: '',
  email: '',
  website: '',
  bio: '',
  address: '',
  mapUrl: '',
  avatarUrl: '',
  logoUrl: '',
}

interface EditPageProps {
  params: Promise<{ id: string }>
}

interface AnalyticsSummary {
  totalViews: number
  totalClicks: number
  totalLeads: number
  totalBookingsStarted: number
  totalBookingsCompleted: number
  totalWhatsappClicks: number
  totalLeadCaptureOpens: number
  totalLeadSubmissions: number
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
    updateActions,
    updateHandle,
    updateTheme,
    updateTemplate,
    updateSocialLinks,
    updateMediaBlocks,
    updateVcardPolicy,
    publishCard,
    unpublishCard,
    saveNow,
    retryLoad,
  } = useCardBuilder(id)

  const cardLoaded = card !== null

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
          <div className="flex items-center gap-4">
            {error ? (
              <button
                type="button"
                onClick={retryLoad}
                className="text-sm font-medium text-brand-600 hover:underline"
              >
                Retry
              </button>
            ) : null}
            <Link href="/apps/cards" className="text-sm text-brand-600 font-medium hover:underline">
              Back to cards
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const rendererProps = {
    card: {
      ...card,
      fields: {
        ...EMPTY_RENDER_FIELDS,
        ...card.fields,
      },
    },
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
      <div className="flex h-full flex-col bg-[#f8fafc] relative overflow-hidden">
        {/* Soft background glow orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-sky-200/40 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[35%] h-[40%] rounded-full bg-indigo-200/30 blur-[100px] pointer-events-none" />

        {/* ── Header ── */}
        <header className="z-20 flex shrink-0 items-center justify-between gap-4 border-b border-white/80 bg-white/70 px-4 py-3.5 shadow-sm backdrop-blur-2xl lg:px-6">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/apps/cards"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[18px] bg-white text-gray-500 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] transition-all hover:scale-105 hover:text-gray-900 active:scale-95"
            >
              <ArrowLeft className="h-[18px] w-[18px]" />
            </Link>

            {/* Card identity */}
            <div className="min-w-0">
              <h1 className="text-[15px] font-bold text-gray-900 truncate leading-tight tracking-tight">
                {card.fields.name || 'Untitled Card'}
              </h1>
              <p className="text-[11px] font-medium text-gray-400 truncate tracking-wide uppercase mt-0.5">
                dotly.one/{card.handle}
              </p>
            </div>
          </div>

          {/* Analytics — desktop only */}
          {analytics && (
            <Link
              href={`/apps/cards/${id}/analytics`}
              className="hidden items-center justify-center gap-4 rounded-2xl border border-white/60 bg-white/50 px-4 py-2 shadow-sm backdrop-blur-md transition-all hover:bg-white hover:shadow hover:scale-[1.02] active:scale-95 lg:flex"
            >
              <BarChart2 className="h-4 w-4 text-brand-500" />
              <div className="flex items-center gap-3">
                <span className="text-[13px] font-medium text-gray-500">
                  <span className="font-bold text-gray-900">{analytics.totalViews}</span> views
                </span>
                <span className="text-gray-300">·</span>
                <span className="text-[13px] font-medium text-gray-500">
                  <span className="font-bold text-gray-900">{analytics.totalClicks}</span> clicks
                </span>
              </div>
            </Link>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:block">{saveIndicator()}</div>

            {/* Delete button */}
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete card"
              aria-label="Delete card"
              className="flex h-10 w-10 items-center justify-center rounded-[18px] border border-red-100 bg-white text-red-400 shadow-sm transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600 active:scale-95"
            >
              <Trash2 className="h-[18px] w-[18px]" />
            </button>

            <button
              type="button"
              onClick={() => void saveNow()}
              disabled={saveStatus === 'saving'}
              className={cn(
                'flex items-center justify-center gap-2 rounded-[18px] px-5 py-2.5 text-[13px] font-bold text-white transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-70',
                saveStatus === 'error'
                  ? 'bg-red-500 hover:bg-red-600 shadow-[0_4px_16px_-4px_rgba(239,68,68,0.4)]'
                  : 'bg-[linear-gradient(135deg,#0ea5e9,#6366f1)] hover:opacity-90 shadow-[0_8px_24px_-8px_rgba(14,165,233,0.5)]',
              )}
            >
              {saveStatus === 'saving' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </header>

        {/* ── Main layout ── */}
        <div className="z-10 flex flex-1 overflow-hidden min-h-0">
          {/* Left / full-width editor panel */}
          <div className="relative flex w-full flex-col overflow-hidden border-r border-white/80 bg-white/70 shadow-[20px_0_60px_-16px_rgba(15,23,42,0.05)] backdrop-blur-3xl lg:w-[540px] lg:shrink-0 min-h-0">
            {/* Tab bar — iOS segmented control style */}
            <div className="shrink-0 border-b border-gray-100/50 bg-white/40 px-2 pt-3 pb-2">
              <div className="flex gap-1 rounded-2xl bg-gray-100/80 p-0.5 backdrop-blur-md">
                {TABS.map((tab) => {
                  const Icon = tab.icon
                  const active = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'flex flex-1 flex-col items-center justify-center gap-1.5 rounded-[14px] py-2.5 transition-all duration-300',
                        active
                          ? 'bg-white text-brand-600 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)]'
                          : 'text-gray-500 hover:bg-white/50 hover:text-gray-700',
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-4 w-4 transition-transform duration-300',
                          active && 'scale-110',
                        )}
                      />
                      <span
                        className={cn(
                          'text-[10px] font-bold tracking-wide uppercase',
                          active ? 'text-brand-600' : 'text-gray-400',
                        )}
                      >
                        {tab.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {activeTab === 'preview' ? (
                /* ── Mobile inline preview ── */
                <div className="flex min-h-full items-start justify-center bg-transparent p-2 pt-4">
                  <div
                    className="relative w-full max-w-[340px]"
                    style={{ animation: 'create-fade 0.5s ease-out both' }}
                  >
                    <div className="mx-auto overflow-hidden rounded-[40px] border-[8px] border-gray-900 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)] bg-white relative">
                      <div className="absolute top-0 inset-x-0 h-6 bg-gray-900 z-50 flex justify-center rounded-b-xl max-w-[120px] mx-auto">
                        <div className="mt-1 h-1.5 w-16 rounded-full bg-gray-800" />
                      </div>
                      <div className="max-h-[600px] overflow-y-auto pt-6">
                        <CardRenderer {...rendererProps} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className={cn('px-4 py-4', 'pb-32 lg:pb-8')}
                  style={{ animation: 'create-fade 0.3s ease-out both' }}
                >
                  {activeTab === 'profile' && (
                    <ProfileTab
                      cardId={id}
                      fields={card.fields}
                      handle={card.handle}
                      vcardPolicy={vcardPolicy}
                      onFieldChange={updateField}
                      onHandleChange={updateHandle}
                      onVcardPolicyChange={updateVcardPolicy}
                    />
                  )}
                  {activeTab === 'actions' && (
                    <ActionsTab fields={card.fields} onActionsChange={updateActions} />
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

            {/* Publish bar */}
            {activeTab !== 'preview' && activeTab !== 'qr' && activeTab !== 'form' && (
              <div className="sticky bottom-0 z-20 border-t border-white/60 bg-white/70 backdrop-blur-xl">
                <PublishBar
                  handle={card.handle}
                  isActive={card.isActive}
                  onPublish={publishCard}
                  onUnpublish={unpublishCard}
                />
              </div>
            )}
          </div>

          {/* ── Right preview panel — desktop only ── */}
          <div className="relative hidden flex-1 items-start justify-center overflow-y-auto bg-slate-50/40 lg:flex shadow-inner">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(14,165,233,0.06)_0%,transparent_60%)] pointer-events-none" />
            <div
              className="sticky top-10"
              style={{ animation: 'create-fade 0.6s cubic-bezier(0.16, 1, 0.3, 1) both' }}
            >
              {/* Phone frame mock */}
              <div className="relative w-[380px]">
                {/* Physical buttons */}
                <div className="absolute -left-[14px] top-[100px] h-8 w-1 rounded-l-md bg-gray-300 shadow-inner" />
                <div className="absolute -left-[14px] top-[150px] h-12 w-1 rounded-l-md bg-gray-300 shadow-inner" />
                <div className="absolute -left-[14px] top-[210px] h-12 w-1 rounded-l-md bg-gray-300 shadow-inner" />
                <div className="absolute -right-[14px] top-[160px] h-16 w-1 rounded-r-md bg-gray-300 shadow-inner" />

                <div className="relative z-10 mx-auto overflow-hidden rounded-[48px] border-[12px] border-gray-900 bg-white shadow-[0_50px_100px_-20px_rgba(15,23,42,0.3)]">
                  {/* Notch / Dynamic Island */}
                  <div className="absolute top-0 inset-x-0 h-7 flex justify-center z-50">
                    <div className="w-[120px] h-[30px] bg-gray-900 rounded-b-3xl relative">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-800/80 border border-slate-700/50 shadow-inner" />
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-900/40" />
                      </div>
                    </div>
                  </div>
                  <div className="max-h-[680px] overflow-y-auto w-full h-[680px]">
                    <div className="pt-2">
                      <CardRenderer {...rendererProps} />
                    </div>
                  </div>
                </div>
                {/* Stunning soft ground reflection */}
                <div className="absolute -bottom-8 left-1/2 h-10 w-[80%] -translate-x-1/2 rounded-[100%] bg-black/15 blur-2xl" />
              </div>

              {/* Status Pill */}
              <div
                className="mt-12 flex justify-center"
                style={{ animation: 'create-fade 0.8s ease-out both' }}
              >
                <span
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] font-bold tracking-wide uppercase',
                    card.isActive
                      ? 'border-green-500/20 bg-green-500/10 text-green-700 shadow-[0_0_20px_rgba(34,197,94,0.15)]'
                      : 'border-yellow-500/20 bg-yellow-500/10 text-yellow-700 shadow-[0_0_20px_rgba(234,179,8,0.15)]',
                  )}
                >
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full shadow-inner',
                      card.isActive ? 'bg-green-500 animate-pulse' : 'bg-yellow-500',
                    )}
                  />
                  {card.isActive ? 'Live Preview' : 'Draft Preview'}
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
          style={{ animation: 'create-fade 0.3s ease-out both' }}
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
          message={`"${card?.fields.name || card?.handle || 'This card'}" will be permanently deleted and its public link will stop working.`}
          confirmLabel="Delete"
          onConfirm={() => void handleDelete()}
          onCancel={() => setShowDeleteConfirm(false)}
          busy={deleting}
        />
      )}
    </>
  )
}
