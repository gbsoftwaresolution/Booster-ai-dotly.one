'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type {
  CardData,
  CardThemeData,
  SocialLinkData,
  MediaBlockData,
  CardTemplate,
  VcardPolicy,
} from '@dotly/types'
import { getAccessToken } from '@/lib/supabase/client'
import { apiGet, apiPut, apiPatch } from '@/lib/api'

export interface CardBuilderState {
  card: CardData | null
  theme: CardThemeData
  socialLinks: SocialLinkData[]
  mediaBlocks: MediaBlockData[]
  vcardPolicy: VcardPolicy
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  loading: boolean
  error: string | null
}

const DEFAULT_THEME: CardThemeData = {
  primaryColor: '#000000',
  secondaryColor: '#ffffff',
  fontFamily: 'Inter',
}

function toSocialLinkPayload(links: SocialLinkData[]) {
  return links.map(({ platform, url, displayOrder }) => ({
    platform,
    url,
    displayOrder,
  }))
}

function toMediaBlockPayload(blocks: MediaBlockData[]) {
  return blocks.map(
    ({
      type,
      url,
      caption,
      altText,
      linkUrl,
      displayOrder,
      mimeType,
      fileSize,
      groupId,
      groupName,
    }) => ({
      type,
      // HEADING blocks have no URL — omit the field so @IsOptional passes validation
      url: url || undefined,
      caption,
      altText,
      linkUrl,
      displayOrder,
      mimeType,
      fileSize,
      groupId,
      groupName,
    }),
  )
}

export function useCardBuilder(cardId: string) {
  const [state, setState] = useState<CardBuilderState>({
    card: null,
    theme: DEFAULT_THEME,
    socialLinks: [],
    mediaBlocks: [],
    vcardPolicy: 'PUBLIC',
    saveStatus: 'idle',
    loading: true,
    error: null,
  })

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Dirty flag: tracks which field keys changed since last flush.
  const pendingFieldChanges = useRef<Record<string, unknown>>({})
  const pendingThemeChanges = useRef<Partial<CardThemeData>>({})
  const pendingSocialLinks = useRef<SocialLinkData[] | null>(null)
  const pendingMediaBlocks = useRef<MediaBlockData[] | null>(null)
  // Always reflects the latest card.fields so the debounced flush can read the
  // full snapshot without closing over stale state.
  const latestFieldsRef = useRef<CardData['fields'] | null>(null)

  // Load card on mount
  useEffect(() => {
    async function load() {
      try {
        const token = await getAccessToken()
        const data = await apiGet<{
          id: string
          handle: string
          templateId: string
          fields: Record<string, string>
          isActive: boolean
          vcardPolicy?: VcardPolicy
          theme?: CardThemeData
          socialLinks?: SocialLinkData[]
          mediaBlocks?: MediaBlockData[]
        }>(`/cards/${cardId}`, token)

        const fields = data.fields as unknown as CardData['fields']
        latestFieldsRef.current = fields

        setState((prev) => ({
          ...prev,
          loading: false,
          card: {
            id: data.id,
            handle: data.handle,
            templateId: data.templateId as CardTemplate,
            fields,
            isActive: data.isActive,
            vcardPolicy: data.vcardPolicy ?? 'PUBLIC',
          },
          theme: data.theme ?? DEFAULT_THEME,
          socialLinks: data.socialLinks ?? [],
          mediaBlocks: data.mediaBlocks ?? [],
          vcardPolicy: data.vcardPolicy ?? 'PUBLIC',
        }))
      } catch (err) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Failed to load card',
        }))
      }
    }
    void load()
  }, [cardId])

  // Core flush logic — shared by both debounced autosave and immediate saveNow.
  const flushPending = useCallback(async () => {
    setState((prev) => ({ ...prev, saveStatus: 'saving' }))
    try {
      const token = await getAccessToken()
      const themeChanges = pendingThemeChanges.current
      const socialLinks = pendingSocialLinks.current
      const mediaBlocks = pendingMediaBlocks.current

      // Send the full fields snapshot rather than just the changed keys.
      // Sending only changed keys is fragile: if two debounce windows fire in
      // quick succession, the second window only contains the second-typed key
      // and would lose earlier edits that were already cleared from the ref.
      // The server merges the incoming object into the existing JSONB, so
      // sending the full snapshot is safe and idempotent.
      const fieldsDirty = Object.keys(pendingFieldChanges.current).length > 0
      if (fieldsDirty && latestFieldsRef.current) {
        await apiPut(`/cards/${cardId}`, { fields: latestFieldsRef.current }, token)
        pendingFieldChanges.current = {}
      }

      if (Object.keys(themeChanges).length > 0) {
        await apiPut(`/cards/${cardId}/theme`, themeChanges, token)
        pendingThemeChanges.current = {}
      }

      if (socialLinks !== null) {
        await apiPut(
          `/cards/${cardId}/social-links`,
          { links: toSocialLinkPayload(socialLinks) },
          token,
        )
        pendingSocialLinks.current = null
      }

      if (mediaBlocks !== null) {
        await apiPut(
          `/cards/${cardId}/media-blocks`,
          { blocks: toMediaBlockPayload(mediaBlocks) },
          token,
        )
        pendingMediaBlocks.current = null
      }

      setState((prev) => ({ ...prev, saveStatus: 'saved' }))
      setTimeout(() => setState((prev) => ({ ...prev, saveStatus: 'idle' })), 2000)
    } catch {
      setState((prev) => ({ ...prev, saveStatus: 'error' }))
    }
  }, [cardId])

  const triggerAutoSave = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => void flushPending(), 1500)
  }, [flushPending])

  // Immediately cancel any pending debounce and persist all dirty state.
  const saveNow = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    return flushPending()
  }, [flushPending])

  const updateField = useCallback(
    (key: string, value: string) => {
      setState((prev) => {
        if (!prev.card) return prev
        const nextFields = { ...prev.card.fields, [key]: value }
        // Keep the ref in sync so the debounced flush always has the latest snapshot.
        latestFieldsRef.current = nextFields
        return {
          ...prev,
          card: { ...prev.card, fields: nextFields },
        }
      })
      pendingFieldChanges.current = { ...pendingFieldChanges.current, [key]: value }
      triggerAutoSave()
    },
    [triggerAutoSave],
  )

  const updateHandle = useCallback(
    (handle: string) => {
      setState((prev) => {
        if (!prev.card) return prev
        return { ...prev, card: { ...prev.card, handle } }
      })
      // handle is a top-level Card column, not inside the fields JSON — save immediately.
      void (async () => {
        setState((prev) => ({ ...prev, saveStatus: 'saving' }))
        try {
          const token = await getAccessToken()
          await apiPut(`/cards/${cardId}`, { handle }, token)
          setState((prev) => ({ ...prev, saveStatus: 'saved' }))
          setTimeout(() => setState((prev) => ({ ...prev, saveStatus: 'idle' })), 2000)
        } catch {
          setState((prev) => ({ ...prev, saveStatus: 'error' }))
        }
      })()
    },
    [cardId],
  )

  const updateTheme = useCallback(
    (updates: Partial<CardThemeData>) => {
      setState((prev) => ({ ...prev, theme: { ...prev.theme, ...updates } }))
      pendingThemeChanges.current = { ...pendingThemeChanges.current, ...updates }
      triggerAutoSave()
    },
    [triggerAutoSave],
  )

  const updateTemplate = useCallback(
    (templateId: CardTemplate) => {
      setState((prev) => {
        if (!prev.card) return prev
        return { ...prev, card: { ...prev.card, templateId } }
      })
      void (async () => {
        setState((prev) => ({ ...prev, saveStatus: 'saving' }))
        try {
          const token = await getAccessToken()
          await apiPut(`/cards/${cardId}`, { templateId }, token)
          setState((prev) => ({ ...prev, saveStatus: 'saved' }))
          setTimeout(() => setState((prev) => ({ ...prev, saveStatus: 'idle' })), 2000)
        } catch {
          setState((prev) => ({ ...prev, saveStatus: 'error' }))
        }
      })()
    },
    [cardId],
  )

  const updateSocialLinks = useCallback(
    (links: SocialLinkData[]) => {
      setState((prev) => ({ ...prev, socialLinks: links }))
      pendingSocialLinks.current = links
      triggerAutoSave()
    },
    [triggerAutoSave],
  )

  const updateMediaBlocks = useCallback(
    (blocks: MediaBlockData[]) => {
      setState((prev) => ({ ...prev, mediaBlocks: blocks }))
      pendingMediaBlocks.current = blocks
      triggerAutoSave()
    },
    [triggerAutoSave],
  )

  const publishCard = useCallback(async () => {
    try {
      const token = await getAccessToken()
      await apiPatch(`/cards/${cardId}/publish`, { action: 'publish' }, token)
      setState((prev) => ({
        ...prev,
        card: prev.card ? { ...prev.card, isActive: true } : prev.card,
      }))
      return true
    } catch (err) {
      setState((prev) => ({
        ...prev,
        saveStatus: 'error',
        error: err instanceof Error ? err.message : 'Failed to publish card',
      }))
      return false
    }
  }, [cardId])

  const unpublishCard = useCallback(async () => {
    try {
      const token = await getAccessToken()
      await apiPatch(`/cards/${cardId}/publish`, { action: 'unpublish' }, token)
      setState((prev) => ({
        ...prev,
        card: prev.card ? { ...prev.card, isActive: false } : prev.card,
      }))
      return true
    } catch (err) {
      setState((prev) => ({
        ...prev,
        saveStatus: 'error',
        error: err instanceof Error ? err.message : 'Failed to unpublish card',
      }))
      return false
    }
  }, [cardId])

  const updateVcardPolicy = useCallback(
    (policy: VcardPolicy) => {
      setState((prev) => ({
        ...prev,
        vcardPolicy: policy,
        card: prev.card ? { ...prev.card, vcardPolicy: policy } : prev.card,
      }))
      void (async () => {
        setState((prev) => ({ ...prev, saveStatus: 'saving' }))
        try {
          const token = await getAccessToken()
          await apiPut(`/cards/${cardId}`, { vcardPolicy: policy }, token)
          setState((prev) => ({ ...prev, saveStatus: 'saved' }))
          setTimeout(() => setState((prev) => ({ ...prev, saveStatus: 'idle' })), 2000)
        } catch {
          setState((prev) => ({ ...prev, saveStatus: 'error' }))
        }
      })()
    },
    [cardId],
  )

  return {
    ...state,
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
  }
}
