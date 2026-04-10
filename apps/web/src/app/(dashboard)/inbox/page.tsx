'use client'

import type { JSX } from 'react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { getAccessToken } from '@/lib/supabase/client'
import { apiGet, apiPatch, apiDelete } from '@/lib/api'
import { cn } from '@/lib/cn'
import {
  MessageSquare, Mic, FolderOpen, Inbox,
  Mail, MailOpen, Trash2, Download, Play, Pause,
  RefreshCw, ChevronDown, Search, X,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CardRef {
  id: string
  handle: string
  fields: Record<string, string>
}

interface BaseItem {
  id: string
  cardId: string
  senderName: string
  senderEmail?: string | null
  read: boolean
  createdAt: string
  card: CardRef | null
}

interface Message extends BaseItem {
  message: string
}

interface VoiceNote extends BaseItem {
  audioUrl: string
  durationSec?: number | null
  mimeType: string
  fileSize?: number | null
}

interface DropboxFile extends BaseItem {
  fileName: string
  fileUrl: string
  mimeType: string
  fileSize?: number | null
}

interface InboxData {
  messages: Message[]
  voiceNotes: VoiceNote[]
  dropboxFiles: DropboxFile[]
  unreadCount: { messages: number; voiceNotes: number; dropboxFiles: number }
}

type Tab = 'all' | 'messages' | 'voice' | 'files'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

function fileSize(bytes?: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDuration(sec?: number | null): string {
  if (!sec) return ''
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function mimeIcon(mime: string): string {
  if (mime.startsWith('image/')) return '🖼️'
  if (mime === 'application/pdf') return '📄'
  if (mime.includes('word')) return '📝'
  if (mime.includes('excel') || mime.includes('spreadsheet')) return '📊'
  if (mime.includes('powerpoint') || mime.includes('presentation')) return '📑'
  if (mime.includes('zip')) return '🗜️'
  return '📎'
}

// ─── Audio player ─────────────────────────────────────────────────────────────

function AudioPlayer({ src, duration }: { src: string; duration?: number | null }) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = new Audio(src)
    audioRef.current = audio
    audio.onended = () => { setPlaying(false); setProgress(0); setElapsed(0) }
    audio.ontimeupdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100)
        setElapsed(Math.floor(audio.currentTime))
      }
    }
    return () => { audio.pause(); audio.src = '' }
  }, [src])

  function toggle() {
    const audio = audioRef.current
    if (!audio) return
    if (playing) { audio.pause(); setPlaying(false) }
    else { void audio.play(); setPlaying(true) }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
      <button
        type="button"
        onClick={toggle}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white hover:bg-sky-600 transition-colors"
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-sky-400 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-slate-400">
          <span>{formatDuration(elapsed) || '0s'}</span>
          {duration && <span>{formatDuration(duration)}</span>}
        </div>
      </div>
    </div>
  )
}

// ─── Item cards ───────────────────────────────────────────────────────────────

function MessageCard({
  item, onMarkRead, onDelete,
}: {
  item: Message
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={cn(
      'group rounded-2xl border bg-white p-4 transition-all',
      item.read ? 'border-gray-100' : 'border-sky-200 bg-sky-50/40',
    )}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600 font-bold text-sm">
          {item.senderName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-gray-900 truncate">{item.senderName}</span>
              {!item.read && <span className="h-2 w-2 rounded-full bg-sky-500 shrink-0" />}
            </div>
            <span className="text-[11px] text-gray-400 shrink-0">{timeAgo(item.createdAt)}</span>
          </div>
          {item.senderEmail && (
            <p className="text-xs text-gray-400 truncate">{item.senderEmail}</p>
          )}
          {item.card && (
            <p className="text-[11px] text-gray-400">
              via <span className="font-medium">dotly.one/{item.card.handle}</span>
            </p>
          )}
          {/* Message body */}
          <p className={cn(
            'mt-2 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap',
            !expanded && item.message.length > 200 && 'line-clamp-3',
          )}>
            {item.message}
          </p>
          {item.message.length > 200 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-xs font-semibold text-sky-600 hover:text-sky-700"
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      </div>
      {/* Actions */}
      <div className="mt-3 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {!item.read && (
          <button
            type="button"
            onClick={() => onMarkRead(item.id)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-sky-600 hover:bg-sky-50 transition-colors"
          >
            <MailOpen className="h-3.5 w-3.5" /> Mark read
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>
    </div>
  )
}

function VoiceNoteCard({
  item, onMarkRead, onDelete,
}: {
  item: VoiceNote
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className={cn(
      'group rounded-2xl border bg-white p-4 transition-all',
      item.read ? 'border-gray-100' : 'border-violet-200 bg-violet-50/40',
    )}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600 font-bold text-sm">
          {item.senderName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-gray-900 truncate">{item.senderName}</span>
              {!item.read && <span className="h-2 w-2 rounded-full bg-violet-500 shrink-0" />}
            </div>
            <span className="text-[11px] text-gray-400 shrink-0">{timeAgo(item.createdAt)}</span>
          </div>
          {item.senderEmail && (
            <p className="text-xs text-gray-400 truncate">{item.senderEmail}</p>
          )}
          {item.card && (
            <p className="text-[11px] text-gray-400">
              via <span className="font-medium">dotly.one/{item.card.handle}</span>
            </p>
          )}
          <div className="mt-3">
            <AudioPlayer src={item.audioUrl} duration={item.durationSec} />
          </div>
          {item.fileSize && (
            <p className="mt-1 text-[11px] text-gray-400">{fileSize(item.fileSize)}</p>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {!item.read && (
          <button
            type="button"
            onClick={() => onMarkRead(item.id)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-violet-600 hover:bg-violet-50 transition-colors"
          >
            <MailOpen className="h-3.5 w-3.5" /> Mark read
          </button>
        )}
        <a
          href={item.audioUrl}
          download
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <Download className="h-3.5 w-3.5" /> Download
        </a>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>
    </div>
  )
}

function DropboxFileCard({
  item, onMarkRead, onDelete,
}: {
  item: DropboxFile
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className={cn(
      'group rounded-2xl border bg-white p-4 transition-all',
      item.read ? 'border-gray-100' : 'border-emerald-200 bg-emerald-50/40',
    )}>
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold text-sm">
          {item.senderName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-gray-900 truncate">{item.senderName}</span>
              {!item.read && <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />}
            </div>
            <span className="text-[11px] text-gray-400 shrink-0">{timeAgo(item.createdAt)}</span>
          </div>
          {item.senderEmail && (
            <p className="text-xs text-gray-400 truncate">{item.senderEmail}</p>
          )}
          {item.card && (
            <p className="text-[11px] text-gray-400">
              via <span className="font-medium">dotly.one/{item.card.handle}</span>
            </p>
          )}
          {/* File pill */}
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
            <span className="text-xl leading-none">{mimeIcon(item.mimeType)}</span>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-gray-800">{item.fileName}</p>
              <p className="text-[11px] text-gray-400">{fileSize(item.fileSize)}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {!item.read && (
          <button
            type="button"
            onClick={() => onMarkRead(item.id)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors"
          >
            <MailOpen className="h-3.5 w-3.5" /> Mark read
          </button>
        )}
        <a
          href={item.fileUrl}
          download={item.fileName}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <Download className="h-3.5 w-3.5" /> Download
        </a>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: Tab }) {
  const map: Record<Tab, { icon: React.ReactNode; title: string; sub: string }> = {
    all: {
      icon: <Inbox className="h-10 w-10 text-gray-300" />,
      title: 'Inbox is empty',
      sub: 'Messages, voice notes, and files sent to your cards will appear here.',
    },
    messages: {
      icon: <MessageSquare className="h-10 w-10 text-gray-300" />,
      title: 'No messages yet',
      sub: 'When visitors send you messages via your card, they\'ll show up here.',
    },
    voice: {
      icon: <Mic className="h-10 w-10 text-gray-300" />,
      title: 'No voice notes yet',
      sub: 'Voice notes recorded by visitors will appear here.',
    },
    files: {
      icon: <FolderOpen className="h-10 w-10 text-gray-300" />,
      title: 'No files yet',
      sub: 'Files dropped by visitors via your card dropbox will appear here.',
    },
  }
  const { icon, title, sub } = map[tab]
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      {icon}
      <div>
        <p className="text-base font-semibold text-gray-600">{title}</p>
        <p className="mt-1 text-sm text-gray-400 max-w-xs">{sub}</p>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function InboxPage(): JSX.Element {
  const [data, setData] = useState<InboxData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const token = await getAccessToken()
      const result = await apiGet<InboxData>('/inbox', token)
      setData(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load inbox')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function markRead(type: 'messages' | 'voice-notes' | 'dropbox', id: string) {
    try {
      const token = await getAccessToken()
      await apiPatch(`/inbox/${type}/${id}/read`, {}, token)
      setData((prev) => {
        if (!prev) return prev
        const key = type === 'messages' ? 'messages' : type === 'voice-notes' ? 'voiceNotes' : 'dropboxFiles'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updated = (prev[key] as any[]).map((item: BaseItem) =>
          item.id === id ? { ...item, read: true } : item,
        )
        const unreadKey = type === 'messages' ? 'messages' : type === 'voice-notes' ? 'voiceNotes' : 'dropboxFiles'
        return {
          ...prev,
          [key]: updated,
          unreadCount: { ...prev.unreadCount, [unreadKey]: Math.max(0, prev.unreadCount[unreadKey] - 1) },
        }
      })
    } catch { /* ignore */ }
  }

  async function del(type: 'messages' | 'voice-notes' | 'dropbox', id: string) {
    try {
      const token = await getAccessToken()
      await apiDelete(`/inbox/${type}/${id}`, token)
      setData((prev) => {
        if (!prev) return prev
        const key = type === 'messages' ? 'messages' : type === 'voice-notes' ? 'voiceNotes' : 'dropboxFiles'
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const list = prev[key] as any[]
        const item = list.find((i: BaseItem) => i.id === id) as BaseItem | undefined
        const wasUnread = item && !item.read
        const updated = list.filter((i: BaseItem) => i.id !== id)
        const unreadKey = type === 'messages' ? 'messages' : type === 'voice-notes' ? 'voiceNotes' : 'dropboxFiles'
        return {
          ...prev,
          [key]: updated,
          unreadCount: {
            ...prev.unreadCount,
            [unreadKey]: wasUnread ? Math.max(0, prev.unreadCount[unreadKey] - 1) : prev.unreadCount[unreadKey],
          },
        }
      })
    } catch { /* ignore */ }
  }

  // Filtered + searched items
  const q = search.toLowerCase()
  const messages = data?.messages.filter((m) =>
    !q || m.senderName.toLowerCase().includes(q) || m.message.toLowerCase().includes(q) || (m.senderEmail ?? '').toLowerCase().includes(q)
  ) ?? []
  const voiceNotes = data?.voiceNotes.filter((v) =>
    !q || v.senderName.toLowerCase().includes(q) || (v.senderEmail ?? '').toLowerCase().includes(q)
  ) ?? []
  const dropboxFiles = data?.dropboxFiles.filter((f) =>
    !q || f.senderName.toLowerCase().includes(q) || f.fileName.toLowerCase().includes(q) || (f.senderEmail ?? '').toLowerCase().includes(q)
  ) ?? []

  const totalUnread = (data?.unreadCount.messages ?? 0) + (data?.unreadCount.voiceNotes ?? 0) + (data?.unreadCount.dropboxFiles ?? 0)

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count: number; color: string }[] = [
    { id: 'all', label: 'All', icon: <Inbox className="h-4 w-4" />, count: totalUnread, color: 'sky' },
    { id: 'messages', label: 'Messages', icon: <MessageSquare className="h-4 w-4" />, count: data?.unreadCount.messages ?? 0, color: 'sky' },
    { id: 'voice', label: 'Voice', icon: <Mic className="h-4 w-4" />, count: data?.unreadCount.voiceNotes ?? 0, color: 'violet' },
    { id: 'files', label: 'Files', icon: <FolderOpen className="h-4 w-4" />, count: data?.unreadCount.dropboxFiles ?? 0, color: 'emerald' },
  ]

  // Combined feed for "all" tab sorted by date
  const allItems: Array<{ type: 'message' | 'voice' | 'file'; item: Message | VoiceNote | DropboxFile }> = [
    ...messages.map((m) => ({ type: 'message' as const, item: m })),
    ...voiceNotes.map((v) => ({ type: 'voice' as const, item: v })),
    ...dropboxFiles.map((f) => ({ type: 'file' as const, item: f })),
  ].sort((a, b) => new Date(b.item.createdAt).getTime() - new Date(a.item.createdAt).getTime())

  const isEmpty = activeTab === 'all'
    ? allItems.length === 0
    : activeTab === 'messages'
    ? messages.length === 0
    : activeTab === 'voice'
    ? voiceNotes.length === 0
    : dropboxFiles.length === 0

  return (
    <div className="flex h-full flex-col bg-gray-50">
      {/* Header */}
      <header className="shrink-0 border-b border-gray-200 bg-white px-4 py-4 lg:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100">
              <Inbox className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Inbox</h1>
              <p className="text-xs text-gray-400">Messages, voice notes & files from your cards</p>
            </div>
            {totalUnread > 0 && (
              <span className="rounded-full bg-sky-500 px-2 py-0.5 text-xs font-bold text-white">
                {totalUnread}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            Refresh
          </button>
        </div>

        {/* Search */}
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or content…"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-9 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20 transition-all"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* Tab bar */}
      <div className="shrink-0 border-b border-gray-100 bg-white px-4">
        <div className="flex gap-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 rounded-t-xl px-4 py-3 text-sm font-semibold transition-all',
                activeTab === tab.id
                  ? 'bg-sky-50 text-sky-700 border-b-2 border-sky-500'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.count > 0 && (
                <span className="rounded-full bg-sky-500 px-1.5 py-0.5 text-[10px] font-bold text-white leading-none">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 lg:px-6">
        {loading && !data ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-sky-500 border-t-transparent" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <p className="text-sm text-red-500">{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="text-sm font-semibold text-sky-600 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : isEmpty ? (
          <EmptyState tab={activeTab} />
        ) : (
          <div className="space-y-3 pb-24 lg:pb-6">
            {/* All tab — chronological mix */}
            {activeTab === 'all' && allItems.map(({ type, item }) => {
              if (type === 'message') return (
                <MessageCard
                  key={item.id}
                  item={item as Message}
                  onMarkRead={(id) => void markRead('messages', id)}
                  onDelete={(id) => void del('messages', id)}
                />
              )
              if (type === 'voice') return (
                <VoiceNoteCard
                  key={item.id}
                  item={item as VoiceNote}
                  onMarkRead={(id) => void markRead('voice-notes', id)}
                  onDelete={(id) => void del('voice-notes', id)}
                />
              )
              return (
                <DropboxFileCard
                  key={item.id}
                  item={item as DropboxFile}
                  onMarkRead={(id) => void markRead('dropbox', id)}
                  onDelete={(id) => void del('dropbox', id)}
                />
              )
            })}

            {/* Messages tab */}
            {activeTab === 'messages' && messages.map((m) => (
              <MessageCard
                key={m.id}
                item={m}
                onMarkRead={(id) => void markRead('messages', id)}
                onDelete={(id) => void del('messages', id)}
              />
            ))}

            {/* Voice tab */}
            {activeTab === 'voice' && voiceNotes.map((v) => (
              <VoiceNoteCard
                key={v.id}
                item={v}
                onMarkRead={(id) => void markRead('voice-notes', id)}
                onDelete={(id) => void del('voice-notes', id)}
              />
            ))}

            {/* Files tab */}
            {activeTab === 'files' && dropboxFiles.map((f) => (
              <DropboxFileCard
                key={f.id}
                item={f}
                onMarkRead={(id) => void markRead('dropbox', id)}
                onDelete={(id) => void del('dropbox', id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
