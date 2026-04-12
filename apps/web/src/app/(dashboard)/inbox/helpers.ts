import type { ElementType } from 'react'

import { File, FileArchive, FileImage, FileSpreadsheet, FileStack, FileText } from 'lucide-react'

import type {
  AllFeedItem,
  DropboxFile,
  InboxApiType,
  InboxData,
  InboxListItem,
  InboxListKey,
  InboxTabConfig,
  Message,
  Tab,
  VoiceNote,
} from './types'

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export function fileSize(bytes?: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function formatDuration(seconds?: number | null): string {
  if (!seconds) return ''
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`
}

export function mimeIcon(mime: string): ElementType {
  if (mime.startsWith('image/')) return FileImage
  if (mime === 'application/pdf') return FileText
  if (mime.includes('word')) return FileText
  if (mime.includes('excel') || mime.includes('spreadsheet')) return FileSpreadsheet
  if (mime.includes('powerpoint') || mime.includes('presentation')) return FileStack
  if (mime.includes('zip')) return FileArchive
  return File
}

export function getInboxListKey(type: InboxApiType): InboxListKey {
  return type === 'messages' ? 'messages' : type === 'voice-notes' ? 'voiceNotes' : 'dropboxFiles'
}

export function filterInboxData(
  data: InboxData | null,
  search: string,
): {
  messages: Message[]
  voiceNotes: VoiceNote[]
  dropboxFiles: DropboxFile[]
} {
  const query = search.toLowerCase()

  return {
    messages:
      data?.messages.filter(
        (message) =>
          !query ||
          message.senderName.toLowerCase().includes(query) ||
          message.message.toLowerCase().includes(query) ||
          (message.senderEmail ?? '').toLowerCase().includes(query),
      ) ?? [],
    voiceNotes:
      data?.voiceNotes.filter(
        (voiceNote) =>
          !query ||
          voiceNote.senderName.toLowerCase().includes(query) ||
          (voiceNote.senderEmail ?? '').toLowerCase().includes(query),
      ) ?? [],
    dropboxFiles:
      data?.dropboxFiles.filter(
        (file) =>
          !query ||
          file.senderName.toLowerCase().includes(query) ||
          file.fileName.toLowerCase().includes(query) ||
          (file.senderEmail ?? '').toLowerCase().includes(query),
      ) ?? [],
  }
}

export function getTotalUnread(data: InboxData | null): number {
  return (
    (data?.unreadCount.messages ?? 0) +
    (data?.unreadCount.voiceNotes ?? 0) +
    (data?.unreadCount.dropboxFiles ?? 0)
  )
}

export function getInboxTabs(data: InboxData | null): InboxTabConfig[] {
  const totalUnread = getTotalUnread(data)

  return [
    { id: 'all', label: 'All', count: totalUnread, color: 'sky' },
    { id: 'messages', label: 'Messages', count: data?.unreadCount.messages ?? 0, color: 'sky' },
    { id: 'voice', label: 'Voice', count: data?.unreadCount.voiceNotes ?? 0, color: 'violet' },
    { id: 'files', label: 'Files', count: data?.unreadCount.dropboxFiles ?? 0, color: 'emerald' },
  ]
}

export function buildAllItems(
  messages: Message[],
  voiceNotes: VoiceNote[],
  dropboxFiles: DropboxFile[],
): AllFeedItem[] {
  return [
    ...messages.map((message) => ({ type: 'message' as const, item: message })),
    ...voiceNotes.map((voiceNote) => ({ type: 'voice' as const, item: voiceNote })),
    ...dropboxFiles.map((file) => ({ type: 'file' as const, item: file })),
  ].sort((a, b) => new Date(b.item.createdAt).getTime() - new Date(a.item.createdAt).getTime())
}

export function isInboxEmpty(
  activeTab: Tab,
  allItems: AllFeedItem[],
  messages: Message[],
  voiceNotes: VoiceNote[],
  dropboxFiles: DropboxFile[],
): boolean {
  if (activeTab === 'all') return allItems.length === 0
  if (activeTab === 'messages') return messages.length === 0
  if (activeTab === 'voice') return voiceNotes.length === 0
  return dropboxFiles.length === 0
}

export function updateListItemReadState(items: InboxListItem[], id: string): InboxListItem[] {
  return items.map((item) => (item.id === id ? { ...item, read: true } : item))
}
