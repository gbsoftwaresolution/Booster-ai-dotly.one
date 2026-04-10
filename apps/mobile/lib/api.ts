import { supabase } from './supabase'

// H-05: Validate that EXPO_PUBLIC_API_URL is set and uses HTTPS.
// Falling back to an HTTP localhost URL in production would silently send
// auth tokens over an unencrypted connection.  We fail fast at module load
// time so the problem is immediately visible in dev/CI rather than only
// appearing as a runtime network error in production.
const _rawApiUrl = process.env.EXPO_PUBLIC_API_URL
if (!_rawApiUrl) {
  throw new Error(
    'EXPO_PUBLIC_API_URL is not set. ' +
      'Add it to your .env file (development) or EAS secrets (production).',
  )
}
if (!_rawApiUrl.startsWith('https://') && process.env.NODE_ENV === 'production') {
  throw new Error(`EXPO_PUBLIC_API_URL must use HTTPS in production. Got: ${_rawApiUrl}`)
}
const API_URL = _rawApiUrl

// H-08: Allowed image MIME types for upload endpoints.
// Anything outside this list is rejected before hitting the network so that
// the server cannot be confused by unexpected content types.
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

function assertAllowedMimeType(mimeType: string, context: string): void {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(
      `${context}: unsupported MIME type "${mimeType}". ` +
        `Allowed types: ${[...ALLOWED_MIME_TYPES].join(', ')}`,
    )
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return {}
  return { Authorization: `Bearer ${session.access_token}` }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders()

  // LOW-05: Set an explicit 15-second timeout on every API call.  Without this,
  // a hung API server (deploy in progress, network drop) leaves the UI spinner
  // running indefinitely with no user-visible error on React Native.
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15_000)

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
        ...(options?.headers as Record<string, string> | undefined),
      },
    })
    if (!res.ok) throw new Error(`API error ${res.status}`)
    return res.json() as Promise<T>
  } finally {
    clearTimeout(timeoutId)
  }
}

interface ContactsResponse {
  contacts: unknown[]
  total: number
  page: number
  limit: number
}

export interface AnalyticsSummary {
  totalViews: number
  totalClicks: number
  totalLeads: number
  last7Days?: Array<{ type: string; createdAt: string }>
}

export const api = {
  getCards: () => apiFetch<unknown[]>('/cards'),
  getCard: (id: string) => apiFetch<unknown>(`/cards/${id}`),
  getMe: () => apiFetch<unknown>('/users/me'),
  getAnalyticsSummary: (id: string) => apiFetch<AnalyticsSummary>(`/cards/${id}/analytics/summary`),
  // M6: Added optional search param for server-side search
  getContacts: (page = 1, limit = 50, search?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (search) params.set('search', search)
    return apiFetch<ContactsResponse>(`/contacts?${params.toString()}`)
  },
  getContact: (id: string) => apiFetch<unknown>(`/contacts/${id}`),
  updateContactStage: (id: string, stage: string) =>
    apiFetch(`/contacts/${id}/stage`, { method: 'PATCH', body: JSON.stringify({ stage }) }),
  getContactNotes: (id: string) => apiFetch<unknown[]>(`/contacts/${id}/notes`),
  createNote: (id: string, content: string) =>
    apiFetch(`/contacts/${id}/notes`, { method: 'POST', body: JSON.stringify({ content }) }),
  deleteNote: (noteId: string, contactId: string) =>
    apiFetch(`/contacts/${contactId}/notes/${noteId}`, { method: 'DELETE' }),
  updateNote: (noteId: string, contactId: string, content: string) =>
    apiFetch(`/contacts/${contactId}/notes/${noteId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    }),
  getContactTasks: (id: string) => apiFetch<unknown[]>(`/contacts/${id}/tasks`),
  createTask: (id: string, title: string, dueAt?: string) =>
    apiFetch(`/contacts/${id}/tasks`, { method: 'POST', body: JSON.stringify({ title, dueAt }) }),
  updateTask: (taskId: string, data: { completed?: boolean; title?: string }) =>
    apiFetch(`/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTask: (taskId: string) => apiFetch(`/tasks/${taskId}`, { method: 'DELETE' }),
  getDeals: (id: string) => apiFetch<unknown[]>(`/contacts/${id}/deals`),
  createDeal: (
    id: string,
    data: { title: string; value?: number; stage?: string; closeDate?: string },
  ) => apiFetch(`/contacts/${id}/deals`, { method: 'POST', body: JSON.stringify(data) }),
  deleteDeal: (dealId: string) => apiFetch(`/deals/${dealId}`, { method: 'DELETE' }),
  updateDealStage: (dealId: string, stage: string) =>
    apiFetch(`/deals/${dealId}`, { method: 'PATCH', body: JSON.stringify({ stage }) }),
  getAllDeals: () => apiFetch<unknown[]>('/deals'),
  getAllTasks: () => apiFetch<unknown[]>('/tasks'),
  getEmailTemplates: () => apiFetch<unknown[]>('/email-templates'),
  getFunnel: () => apiFetch<unknown>('/crm/analytics/funnel'),
  importContacts: (csv: string) =>
    apiFetch('/contacts/import', { method: 'POST', body: JSON.stringify({ csv }) }),
  sendEmail: (id: string, subject: string, body: string) =>
    apiFetch(`/contacts/${id}/send-email`, {
      method: 'POST',
      body: JSON.stringify({ subject, body }),
    }),
  updateTags: (id: string, tags: string[]) =>
    apiFetch(`/contacts/${id}`, { method: 'PUT', body: JSON.stringify({ tags }) }),
  triggerEnrich: (id: string) => apiFetch(`/contacts/${id}/enrich`, { method: 'POST' }),
  // M7: Update contact fields
  updateContact: (
    id: string,
    data: Partial<{
      name: string
      email: string
      phone: string
      company: string
      title: string
      website: string
      address: string
      notes: string
    }>,
  ) => apiFetch(`/contacts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  // M8: Delete contact
  deleteContact: (id: string) => apiFetch(`/contacts/${id}`, { method: 'DELETE' }),
  // M9: Create contact manually
  createContact: (data: {
    name: string
    email?: string
    phone?: string
    company?: string
    title?: string
    website?: string
    address?: string
    stage?: string
    notes?: string
    tags?: string[]
  }) => apiFetch('/contacts', { method: 'POST', body: JSON.stringify(data) }),

  // Custom fields
  getCustomFields: () => apiFetch<unknown[]>('/crm/custom-fields'),
  setCustomFieldValue: (contactId: string, fieldId: string, value: string) =>
    apiFetch(`/contacts/${contactId}/custom-fields/${fieldId}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    }),

  // Pipelines
  getPipelines: () => apiFetch<unknown[]>('/pipelines'),
  assignContactToPipeline: (contactId: string, pipelineId: string) =>
    apiFetch(`/contacts/${contactId}/pipeline`, {
      method: 'PATCH',
      body: JSON.stringify({ pipelineId }),
    }),

  // Duplicate detection & merge
  findDuplicates: () => apiFetch<unknown[]>('/crm/duplicates'),
  mergeContacts: (primaryId: string, duplicateId: string) =>
    apiFetch(`/contacts/${primaryId}/merge`, {
      method: 'POST',
      body: JSON.stringify({ duplicateId }),
    }),

  // Scheduling
  getAppointmentTypes: () => apiFetch<unknown[]>('/scheduling/appointment-types'),
  getUpcomingBookings: () => apiFetch<unknown[]>('/scheduling/bookings?upcoming=true'),
  cancelBooking: (bookingId: string) =>
    apiFetch(`/scheduling/bookings/${bookingId}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    }),
}

// Card creation / editing functions

export async function createCard(data: {
  name: string
  handle: string
  template: string
  tagline?: string
  bio?: string
  phone?: string
  email?: string
  website?: string
}): Promise<unknown> {
  return apiFetch('/cards', {
    method: 'POST',
    body: JSON.stringify({
      handle: data.handle,
      templateId: data.template,
      fields: {
        name: data.name,
        bio: data.bio ?? '',
        phone: data.phone ?? '',
        email: data.email ?? '',
        website: data.website ?? '',
        title: data.tagline ?? '',
      },
    }),
  })
}

export async function updateCard(id: string, data: Record<string, unknown>): Promise<unknown> {
  return apiFetch(`/cards/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function updateCardTheme(
  id: string,
  data: { primaryColor?: string },
): Promise<unknown> {
  return apiFetch(`/cards/${id}/theme`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function replaceCardSocialLinks(
  id: string,
  links: Array<{ platform: string; url: string; displayOrder: number }>,
): Promise<unknown> {
  return apiFetch(`/cards/${id}/social-links`, {
    method: 'PUT',
    body: JSON.stringify({ links }),
  })
}

export async function checkHandleAvailable(
  handle: string,
): Promise<{ available: boolean | 'unknown' }> {
  try {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}/public/cards/${handle}`, {
      headers: { 'Content-Type': 'application/json', ...headers },
    })
    // 200 = handle is taken, 404 = available
    return { available: res.status === 404 }
  } catch {
    // H-07: Return 'unknown' instead of true on network error.
    // Returning true would silently allow a user to proceed with a handle
    // that might already be taken (the check just failed to reach the server).
    // Callers must treat 'unknown' as "we don't know — block progression".
    return { available: 'unknown' }
  }
}

export async function uploadAvatar(
  cardId: string,
  base64: string,
  mimeType: string,
): Promise<{ url: string }> {
  // H-08: Validate mimeType against allowlist before sending to server.
  assertAllowedMimeType(mimeType, 'uploadAvatar')
  return apiFetch<{ url: string }>(`/cards/${cardId}/avatar`, {
    method: 'POST',
    body: JSON.stringify({ base64, mimeType }),
  })
}

export async function savePushToken(token: string): Promise<void> {
  await apiFetch('/users/push-token', {
    method: 'PATCH',
    body: JSON.stringify({ pushToken: token }),
  })
}

export interface ScannedContact {
  name: string | null
  email: string | null
  phone: string | null
  company: string | null
  title: string | null
  website: string | null
  address: string | null
}

export async function scanBusinessCard(base64: string, mimeType: string): Promise<ScannedContact> {
  // H-08: Validate mimeType against allowlist before sending to server.
  assertAllowedMimeType(mimeType, 'scanBusinessCard')
  return apiFetch<ScannedContact>('/ai/scan-card', {
    method: 'POST',
    body: JSON.stringify({ base64Image: base64, mimeType }),
  })
}

export async function createContact(
  cardId: string | null | undefined,
  data: {
    name: string
    email?: string | null
    phone?: string | null
    company?: string | null
    title?: string | null
    website?: string | null
    address?: string | null
    stage?: string | null
    notes?: string | null
    tags?: string[] | null
  },
): Promise<unknown> {
  return apiFetch('/contacts', {
    method: 'POST',
    body: JSON.stringify({
      name: data.name,
      email: data.email ?? undefined,
      phone: data.phone ?? undefined,
      company: data.company ?? undefined,
      title: data.title ?? undefined,
      website: data.website ?? undefined,
      address: data.address ?? undefined,
      stage: data.stage ?? undefined,
      notes: data.notes ?? undefined,
      tags: data.tags ?? undefined,
      ...(cardId ? { sourceCardId: cardId } : {}),
    }),
  })
}
