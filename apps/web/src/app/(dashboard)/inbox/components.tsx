'use client'

import type { JSX, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/cn'
import {
  ChevronDown,
  Download,
  File,
  FolderOpen,
  Inbox,
  MailOpen,
  MessageSquare,
  Mic,
  Pause,
  Play,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react'

import { fileSize, formatDuration, mimeIcon, timeAgo } from './helpers'
import type { AllFeedItem, DropboxFile, InboxTabConfig, Message, Tab, VoiceNote } from './types'

function AudioPlayer({ src, duration }: { src: string; duration?: number | null }): JSX.Element {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const audio = new Audio(src)
    audioRef.current = audio
    audio.onended = () => {
      setPlaying(false)
      setProgress(0)
      setElapsed(0)
    }
    audio.ontimeupdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100)
        setElapsed(Math.floor(audio.currentTime))
      }
    }

    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [src])

  function toggle() {
    const audio = audioRef.current
    if (!audio) return

    if (playing) {
      audio.pause()
      setPlaying(false)
    } else {
      void audio.play()
      setPlaying(true)
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
      <button
        type="button"
        onClick={toggle}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white transition-colors hover:bg-sky-600"
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="ml-0.5 h-3.5 w-3.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
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

function MessageCard({
  item,
  onMarkRead,
  onDelete,
  markReadPending,
  deletePending,
}: {
  item: Message
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
  markReadPending: boolean
  deletePending: boolean
}): JSX.Element {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={cn(
        'group rounded-2xl border bg-white p-4 transition-all',
        item.read ? 'border-gray-100' : 'border-sky-200 bg-sky-50/40',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-600">
          {item.senderName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-semibold text-gray-900">
                {item.senderName}
              </span>
              {!item.read && <span className="h-2 w-2 shrink-0 rounded-full bg-sky-500" />}
            </div>
            <span className="shrink-0 text-[11px] text-gray-400">{timeAgo(item.createdAt)}</span>
          </div>
          {item.senderEmail && <p className="truncate text-xs text-gray-400">{item.senderEmail}</p>}
          {item.card && (
            <p className="text-[11px] text-gray-400">
              via <span className="font-medium">dotly.one/{item.card.handle}</span>
            </p>
          )}
          <p
            className={cn(
              'mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-700',
              !expanded && item.message.length > 200 && 'line-clamp-3',
            )}
          >
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
      <div className="mt-3 flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        {!item.read && (
          <button
            type="button"
            onClick={() => onMarkRead(item.id)}
            disabled={markReadPending}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-sky-600 transition-colors hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MailOpen className="h-3.5 w-3.5" /> {markReadPending ? 'Saving...' : 'Mark read'}
          </button>
        )}
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          disabled={deletePending}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" /> {deletePending ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  )
}

function VoiceNoteCard({
  item,
  onMarkRead,
  onDelete,
  markReadPending,
  deletePending,
}: {
  item: VoiceNote
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
  markReadPending: boolean
  deletePending: boolean
}): JSX.Element {
  return (
    <div
      className={cn(
        'group rounded-2xl border bg-white p-4 transition-all',
        item.read ? 'border-gray-100' : 'border-violet-200 bg-violet-50/40',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-600">
          {item.senderName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-semibold text-gray-900">
                {item.senderName}
              </span>
              {!item.read && <span className="h-2 w-2 shrink-0 rounded-full bg-violet-500" />}
            </div>
            <span className="shrink-0 text-[11px] text-gray-400">{timeAgo(item.createdAt)}</span>
          </div>
          {item.senderEmail && <p className="truncate text-xs text-gray-400">{item.senderEmail}</p>}
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
      <div className="mt-3 flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        {!item.read && (
          <button
            type="button"
            onClick={() => onMarkRead(item.id)}
            disabled={markReadPending}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-violet-600 transition-colors hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MailOpen className="h-3.5 w-3.5" /> {markReadPending ? 'Saving...' : 'Mark read'}
          </button>
        )}
        <a
          href={item.audioUrl}
          download
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100"
        >
          <Download className="h-3.5 w-3.5" /> Download
        </a>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          disabled={deletePending}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" /> {deletePending ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  )
}

function DropboxFileCard({
  item,
  onMarkRead,
  onDelete,
  markReadPending,
  deletePending,
}: {
  item: DropboxFile
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
  markReadPending: boolean
  deletePending: boolean
}): JSX.Element {
  const MimeIcon = mimeIcon(item.mimeType)

  return (
    <div
      className={cn(
        'group rounded-2xl border bg-white p-4 transition-all',
        item.read ? 'border-gray-100' : 'border-emerald-200 bg-emerald-50/40',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-600">
          {item.senderName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-semibold text-gray-900">
                {item.senderName}
              </span>
              {!item.read && <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
            </div>
            <span className="shrink-0 text-[11px] text-gray-400">{timeAgo(item.createdAt)}</span>
          </div>
          {item.senderEmail && <p className="truncate text-xs text-gray-400">{item.senderEmail}</p>}
          {item.card && (
            <p className="text-[11px] text-gray-400">
              via <span className="font-medium">dotly.one/{item.card.handle}</span>
            </p>
          )}
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-emerald-500 shadow-sm">
              <MimeIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-800">{item.fileName}</p>
              <p className="text-[11px] text-gray-400">{fileSize(item.fileSize)}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        {!item.read && (
          <button
            type="button"
            onClick={() => onMarkRead(item.id)}
            disabled={markReadPending}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-emerald-600 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MailOpen className="h-3.5 w-3.5" /> {markReadPending ? 'Saving...' : 'Mark read'}
          </button>
        )}
        <a
          href={item.fileUrl}
          download={item.fileName}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100"
        >
          <Download className="h-3.5 w-3.5" /> Download
        </a>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          disabled={deletePending}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" /> {deletePending ? 'Deleting...' : 'Delete'}
        </button>
      </div>
    </div>
  )
}

function EmptyState({ tab, isSearch }: { tab: Tab; isSearch: boolean }): JSX.Element {
  if (isSearch) {
    return (
      <div className="app-empty-state gap-4">
        <Search className="h-10 w-10 text-gray-300" />
        <div>
          <p className="text-base font-semibold text-gray-600">No results found</p>
          <p className="mt-1 max-w-xs text-sm text-gray-400">
            Try a different search term or clear the current filter.
          </p>
        </div>
      </div>
    )
  }

  const emptyStateMap: Record<Tab, { icon: ReactNode; title: string; sub: string }> = {
    all: {
      icon: <Inbox className="h-10 w-10 text-gray-300" />,
      title: 'Inbox is empty',
      sub: 'Messages, voice notes, and files sent to your cards will appear here.',
    },
    messages: {
      icon: <MessageSquare className="h-10 w-10 text-gray-300" />,
      title: 'No messages yet',
      sub: "When visitors send you messages via your card, they'll show up here.",
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

  const { icon, title, sub } = emptyStateMap[tab]

  return (
    <div className="app-empty-state gap-4">
      {icon}
      <div>
        <p className="text-base font-semibold text-gray-600">{title}</p>
        <p className="mt-1 max-w-xs text-sm text-gray-400">{sub}</p>
      </div>
    </div>
  )
}

export function InboxHeader({
  totalUnread,
  loading,
  search,
  onRefresh,
  onSearchChange,
  onClearSearch,
}: {
  totalUnread: number
  loading: boolean
  search: string
  onRefresh: () => void
  onSearchChange: (value: string) => void
  onClearSearch: () => void
}): JSX.Element {
  return (
    <header className="shrink-0 border-b border-gray-200 bg-white px-4 py-4 lg:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100">
            <Inbox className="h-5 w-5 text-sky-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight text-gray-900">Inbox</h1>
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
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          Refresh
        </button>
      </div>

      <div className="relative mt-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by name, email, or content..."
          className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-9 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-all focus:border-sky-400 focus:ring-2 focus:ring-sky-500/20"
        />
        {search && (
          <button
            type="button"
            onClick={onClearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </header>
  )
}

export function InboxTabs({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: InboxTabConfig[]
  activeTab: Tab
  onChange: (tab: Tab) => void
}): JSX.Element {
  const iconMap: Record<Tab, ReactNode> = {
    all: <Inbox className="h-4 w-4" />,
    messages: <MessageSquare className="h-4 w-4" />,
    voice: <Mic className="h-4 w-4" />,
    files: <FolderOpen className="h-4 w-4" />,
  }

  return (
    <div className="shrink-0 border-b border-gray-100 bg-white px-4">
      <div className="flex gap-0.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex items-center gap-2 rounded-t-xl px-4 py-3 text-sm font-semibold transition-all',
              activeTab === tab.id
                ? 'border-b-2 border-sky-500 bg-sky-50 text-sky-700'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            {iconMap[tab.id]}
            {tab.label}
            {tab.count > 0 && (
              <span className="rounded-full bg-sky-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export function InboxActionError({ actionError }: { actionError: string }): JSX.Element {
  return (
    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {actionError}
    </div>
  )
}

export function InboxLoadingState(): JSX.Element {
  return (
    <div className="space-y-3 py-6">
      {[1, 2, 3].map((item) => (
        <div key={item} className="app-list-skeleton">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 animate-pulse rounded-full bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-36 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
              <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function InboxErrorState({
  onRetry,
  error,
}: {
  onRetry: () => void
  error: string
}): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <p className="text-sm text-red-500">{error}</p>
      <button
        type="button"
        onClick={onRetry}
        className="text-sm font-semibold text-sky-600 hover:underline"
      >
        Try again
      </button>
    </div>
  )
}

export function InboxFeed({
  activeTab,
  isSearch,
  allItems,
  messages,
  voiceNotes,
  dropboxFiles,
  markReadPending,
  deletePending,
  onMarkRead,
  onDelete,
}: {
  activeTab: Tab
  isSearch: boolean
  allItems: AllFeedItem[]
  messages: Message[]
  voiceNotes: VoiceNote[]
  dropboxFiles: DropboxFile[]
  markReadPending: (type: 'messages' | 'voice-notes' | 'dropbox', id: string) => boolean
  deletePending: (type: 'messages' | 'voice-notes' | 'dropbox', id: string) => boolean
  onMarkRead: (type: 'messages' | 'voice-notes' | 'dropbox', id: string) => void
  onDelete: (type: 'messages' | 'voice-notes' | 'dropbox', id: string) => void
}): JSX.Element {
  const isEmpty =
    activeTab === 'all'
      ? allItems.length === 0
      : activeTab === 'messages'
        ? messages.length === 0
        : activeTab === 'voice'
          ? voiceNotes.length === 0
          : dropboxFiles.length === 0

  if (isEmpty) {
    return <EmptyState tab={activeTab} isSearch={isSearch} />
  }

  return (
    <div className="space-y-2.5 pb-24 lg:pb-6">
      {activeTab === 'all' &&
        allItems.map(({ type, item }) => {
          if (type === 'message') {
            return (
              <MessageCard
                key={item.id}
                item={item}
                onMarkRead={(id) => onMarkRead('messages', id)}
                onDelete={(id) => onDelete('messages', id)}
                markReadPending={markReadPending('messages', item.id)}
                deletePending={deletePending('messages', item.id)}
              />
            )
          }

          if (type === 'voice') {
            return (
              <VoiceNoteCard
                key={item.id}
                item={item}
                onMarkRead={(id) => onMarkRead('voice-notes', id)}
                onDelete={(id) => onDelete('voice-notes', id)}
                markReadPending={markReadPending('voice-notes', item.id)}
                deletePending={deletePending('voice-notes', item.id)}
              />
            )
          }

          return (
            <DropboxFileCard
              key={item.id}
              item={item}
              onMarkRead={(id) => onMarkRead('dropbox', id)}
              onDelete={(id) => onDelete('dropbox', id)}
              markReadPending={markReadPending('dropbox', item.id)}
              deletePending={deletePending('dropbox', item.id)}
            />
          )
        })}

      {activeTab === 'messages' &&
        messages.map((message) => (
          <MessageCard
            key={message.id}
            item={message}
            onMarkRead={(id) => onMarkRead('messages', id)}
            onDelete={(id) => onDelete('messages', id)}
            markReadPending={markReadPending('messages', message.id)}
            deletePending={deletePending('messages', message.id)}
          />
        ))}

      {activeTab === 'voice' &&
        voiceNotes.map((voiceNote) => (
          <VoiceNoteCard
            key={voiceNote.id}
            item={voiceNote}
            onMarkRead={(id) => onMarkRead('voice-notes', id)}
            onDelete={(id) => onDelete('voice-notes', id)}
            markReadPending={markReadPending('voice-notes', voiceNote.id)}
            deletePending={deletePending('voice-notes', voiceNote.id)}
          />
        ))}

      {activeTab === 'files' &&
        dropboxFiles.map((file) => (
          <DropboxFileCard
            key={file.id}
            item={file}
            onMarkRead={(id) => onMarkRead('dropbox', id)}
            onDelete={(id) => onDelete('dropbox', id)}
            markReadPending={markReadPending('dropbox', file.id)}
            deletePending={deletePending('dropbox', file.id)}
          />
        ))}
    </div>
  )
}
