'use client'

import type { JSX } from 'react'
import { useState, useEffect, useCallback } from 'react'
import { getAccessToken } from '@/lib/auth/client'
import { apiGet, apiPatch, apiDelete } from '@/lib/api'
import {
  InboxActionError,
  InboxErrorState,
  InboxFeed,
  InboxHeader,
  InboxLoadingState,
  InboxTabs,
} from './components'
import {
  buildAllItems,
  filterInboxData,
  getInboxListKey,
  getInboxTabs,
  getTotalUnread,
  updateListItemReadState,
} from './helpers'
import type { InboxApiType, InboxData, InboxListItem, Tab } from './types'

export default function InboxPage(): JSX.Element {
  const [data, setData] = useState<InboxData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
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

  useEffect(() => {
    void load()
  }, [load])

  async function markRead(type: InboxApiType, id: string) {
    const actionKey = `read:${type}:${id}`
    setPendingAction(actionKey)
    setActionError('')
    try {
      const token = await getAccessToken()
      await apiPatch(`/inbox/${type}/${id}/read`, {}, token)
      setData((prev) => {
        if (!prev) return prev
        const key = getInboxListKey(type)
        const updated = updateListItemReadState(prev[key], id)
        return {
          ...prev,
          [key]: updated,
          unreadCount: { ...prev.unreadCount, [key]: Math.max(0, prev.unreadCount[key] - 1) },
        }
      })
    } catch {
      setActionError('Could not mark this item as read. Please retry.')
    } finally {
      setPendingAction(null)
    }
  }

  async function del(type: InboxApiType, id: string) {
    const actionKey = `delete:${type}:${id}`
    setPendingAction(actionKey)
    setActionError('')
    try {
      const token = await getAccessToken()
      await apiDelete(`/inbox/${type}/${id}`, token)
      setData((prev) => {
        if (!prev) return prev
        const key = getInboxListKey(type)
        const list = prev[key]
        const item = list.find((i: InboxListItem) => i.id === id)
        const wasUnread = item && !item.read
        const updated = list.filter((i: InboxListItem) => i.id !== id)
        return {
          ...prev,
          [key]: updated,
          unreadCount: {
            ...prev.unreadCount,
            [key]: wasUnread ? Math.max(0, prev.unreadCount[key] - 1) : prev.unreadCount[key],
          },
        }
      })
    } catch {
      setActionError('Could not delete this item. Please retry.')
    } finally {
      setPendingAction(null)
    }
  }

  const { messages, voiceNotes, dropboxFiles } = filterInboxData(data, search)
  const totalUnread = getTotalUnread(data)
  const tabs = getInboxTabs(data)
  const allItems = buildAllItems(messages, voiceNotes, dropboxFiles)

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <InboxHeader
        totalUnread={totalUnread}
        loading={loading}
        search={search}
        onRefresh={() => void load()}
        onSearchChange={setSearch}
        onClearSearch={() => setSearch('')}
      />

      <InboxTabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <div className="flex-1 overflow-y-auto px-4 py-4 lg:px-6">
        {actionError && <InboxActionError actionError={actionError} />}

        {loading && !data ? (
          <InboxLoadingState />
        ) : error ? (
          <InboxErrorState error={error} onRetry={() => void load()} />
        ) : (
          <InboxFeed
            activeTab={activeTab}
            isSearch={search.trim().length > 0}
            allItems={allItems}
            messages={messages}
            voiceNotes={voiceNotes}
            dropboxFiles={dropboxFiles}
            markReadPending={(type, id) => pendingAction === `read:${type}:${id}`}
            deletePending={(type, id) => pendingAction === `delete:${type}:${id}`}
            onMarkRead={(type, id) => void markRead(type, id)}
            onDelete={(type, id) => void del(type, id)}
          />
        )}
      </div>
    </div>
  )
}
