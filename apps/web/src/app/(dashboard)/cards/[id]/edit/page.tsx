'use client'

import type { JSX } from 'react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CardRenderer } from '@dotly/ui'
import { useCardBuilder } from '@/hooks/useCardBuilder'
import { ProfileTab } from '@/components/card-builder/ProfileTab'
import { LinksTab } from '@/components/card-builder/LinksTab'
import { MediaTab } from '@/components/card-builder/MediaTab'
import { ThemeTab } from '@/components/card-builder/ThemeTab'
import { PublishBar } from '@/components/card-builder/PublishBar'
import { QrSection } from '@/components/card-builder/QrSection'
import type { CardTemplate, SocialLinkData, MediaBlockData } from '@dotly/types'
import { getAccessToken } from '@/lib/supabase/client'
import { apiGet } from '@/lib/api'
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
} from 'lucide-react'
import { cn } from '@/lib/cn'

type Tab = 'profile' | 'links' | 'media' | 'theme' | 'qr' | 'preview'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'links', label: 'Links', icon: Link2 },
  { id: 'media', label: 'Media', icon: Image },
  { id: 'theme', label: 'Theme', icon: Palette },
  { id: 'qr', label: 'QR', icon: QrCode },
  { id: 'preview', label: 'Preview', icon: Eye },
]

interface EditPageProps {
  params: { id: string }
}

interface AnalyticsSummary {
  totalViews: number
  totalClicks: number
  totalLeads: number
}

export default function CardEditPage({ params }: EditPageProps): JSX.Element {
  const { id } = params
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)

  const {
    card,
    theme,
    socialLinks,
    mediaBlocks,
    saveStatus,
    loading,
    error,
    updateField,
    updateHandle,
    updateTheme,
    updateTemplate,
    updateSocialLinks,
    updateMediaBlocks,
    publishCard,
    unpublishCard,
    saveNow,
  } = useCardBuilder(id)

  const cardLoaded = card !== null

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
          <Link href="/cards" className="text-sm text-brand-600 font-medium hover:underline">
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
    <div className="flex h-full flex-col bg-gray-50">
      {/* ── Header ── */}
      <header className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 lg:px-6">
        {/* Back */}
        <Link
          href="/cards"
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
            href={`/cards/${id}/analytics`}
            className="hidden items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-1.5 transition-colors hover:border-sky-200 hover:bg-sky-50 lg:flex"
          >
            <BarChart2 className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-xs text-gray-500">
              <span className="font-semibold text-sky-600">{analytics.totalViews}</span> views
            </span>
            <span className="text-[10px] text-gray-300">·</span>
            <span className="text-xs text-gray-500">
              <span className="font-semibold text-purple-600">{analytics.totalClicks}</span> clicks
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
      <div className="flex flex-1 overflow-hidden">
        {/* Left / full-width editor panel */}
        <div className="flex w-full flex-col bg-white lg:w-[440px] lg:shrink-0 lg:border-r lg:border-gray-200">
          {/* Tab bar — iOS pill style */}
          <div className="shrink-0 border-b border-gray-100 bg-white px-3 pt-2 pb-0">
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
                      active ? 'bg-brand-50 text-brand-600' : 'text-gray-400 hover:text-gray-600',
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
              <div className="flex items-start justify-center bg-gray-100 p-6 min-h-full">
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
                    fields={card.fields as unknown as Record<string, string>}
                    handle={card.handle}
                    onFieldChange={updateField}
                    onHandleChange={updateHandle}
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
              </div>
            )}
          </div>

          {/* Publish bar — hidden on preview and qr tabs */}
          {activeTab !== 'preview' && activeTab !== 'qr' && (
            <PublishBar
              handle={card.handle}
              isActive={card.isActive}
              onPublish={publishCard}
              onUnpublish={unpublishCard}
            />
          )}
        </div>

        {/* ── Right preview panel — desktop only ── */}
        <div className="hidden flex-1 items-start justify-center overflow-y-auto bg-gray-100 p-10 lg:flex">
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
  )
}
