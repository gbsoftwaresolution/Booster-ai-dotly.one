export interface CardRef {
  id: string
  handle: string
  fields: Record<string, string>
}

export interface BaseItem {
  id: string
  cardId: string
  senderName: string
  senderEmail?: string | null
  read: boolean
  createdAt: string
  card: CardRef | null
}

export interface Message extends BaseItem {
  message: string
}

export interface VoiceNote extends BaseItem {
  audioUrl: string
  durationSec?: number | null
  mimeType: string
  fileSize?: number | null
}

export interface DropboxFile extends BaseItem {
  fileName: string
  fileUrl: string
  mimeType: string
  fileSize?: number | null
}

export interface InboxData {
  messages: Message[]
  voiceNotes: VoiceNote[]
  dropboxFiles: DropboxFile[]
  unreadCount: { messages: number; voiceNotes: number; dropboxFiles: number }
}

export type InboxListKey = 'messages' | 'voiceNotes' | 'dropboxFiles'
export type InboxApiType = 'messages' | 'voice-notes' | 'dropbox'
export type InboxListItem = Message | VoiceNote | DropboxFile
export type Tab = 'all' | 'messages' | 'voice' | 'files'

export type AllFeedItem =
  | { type: 'message'; item: Message }
  | { type: 'voice'; item: VoiceNote }
  | { type: 'file'; item: DropboxFile }

export interface InboxTabConfig {
  id: Tab
  label: string
  count: number
  color: string
}
