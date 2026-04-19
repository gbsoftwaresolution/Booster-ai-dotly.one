import { getPublicApiUrl } from './public-env'
import { createRequestId } from './request-id'

const API_TIMEOUT_MS = 15_000

function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    return getPublicApiUrl()
  }

  const serverApiUrl = process.env.API_URL ?? process.env.INTERNAL_API_URL
  if (serverApiUrl) {
    return serverApiUrl.replace(/\/$/, '')
  }

  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:3001'
  }

  throw new Error(
    'Neither API_URL nor INTERNAL_API_URL is set. Set API_URL to the private/internal address of the NestJS API service.',
  )
}

export class ApiError extends Error {
  statusCode: number
  code?: string
  details?: unknown
  path?: string

  constructor({
    message,
    statusCode,
    code,
    details,
    path,
  }: {
    message: string
    statusCode: number
    code?: string
    details?: unknown
    path?: string
  }) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.path = path
  }
}

function normalizeNetworkError(error: unknown): ApiError {
  if (error instanceof ApiError) return error

  if (error instanceof DOMException && error.name === 'AbortError') {
    return new ApiError({
      message: 'The request timed out. Please try again.',
      statusCode: 0,
      code: 'TIMEOUT',
    })
  }

  if (error instanceof TypeError) {
    return new ApiError({
      message: 'Network error. Check your connection and try again.',
      statusCode: 0,
      code: 'NETWORK',
    })
  }

  return new ApiError({
    message: error instanceof Error ? error.message : 'Unexpected request failure.',
    statusCode: 0,
    code: 'UNKNOWN',
  })
}

async function fetchWithTimeout(input: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
  const timeoutSignal = controller.signal
  const combinedSignal = init.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal

  try {
    const headers = new Headers(init.headers)
    if (!headers.has('x-request-id')) {
      headers.set('x-request-id', createRequestId())
    }

    return await fetch(input, { ...init, headers, signal: combinedSignal })
  } catch (error) {
    if (init.signal?.aborted && error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    throw normalizeNetworkError(error)
  } finally {
    clearTimeout(timeoutId)
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

async function throwApiError(res: Response): Promise<never> {
  let message = `API ${res.status}`
  let code: string | undefined
  let details: unknown
  let path: string | undefined
  try {
    const body = (await res.json()) as Record<string, unknown>
    const msg = body['message']
    if (typeof msg === 'string') {
      message = msg
    } else if (Array.isArray(msg) && msg.length > 0) {
      // NestJS validation errors return message as string[]
      message = (msg as string[]).join('; ')
    } else if (typeof body['error'] === 'string') {
      message = body['error']
    }

    if (typeof body['code'] === 'string') code = body['code']
    if ('details' in body) details = body['details']
    if (typeof body['path'] === 'string') path = body['path']
  } catch {
    // ignore JSON parse failure — keep default message
  }
  throw new ApiError({
    message,
    statusCode: res.status,
    code,
    details,
    path,
  })
}

async function parseApiSuccess<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T

  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return res.json() as Promise<T>
  }

  const text = await res.text()
  return text as T
}

export async function apiGet<T>(path: string, token?: string, signal?: AbortSignal): Promise<T> {
  const res = await fetchWithTimeout(`${getApiUrl()}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
    signal,
  })
  if (!res.ok) return throwApiError(res)
  return parseApiSuccess<T>(res)
}

export async function apiPost<T>(
  path: string,
  body: unknown,
  token?: string,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetchWithTimeout(`${getApiUrl()}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) return throwApiError(res)
  return parseApiSuccess<T>(res)
}

export async function apiPut<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetchWithTimeout(`${getApiUrl()}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) return throwApiError(res)
  return parseApiSuccess<T>(res)
}

export async function apiPatch<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetchWithTimeout(`${getApiUrl()}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) return throwApiError(res)
  return parseApiSuccess<T>(res)
}

export async function apiDelete<T = void>(
  path: string,
  token?: string,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetchWithTimeout(`${getApiUrl()}${path}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal,
  })
  if (!res.ok) return throwApiError(res)
  return parseApiSuccess<T>(res)
}

export async function apiDeleteWithBody<T = void>(
  path: string,
  body: unknown,
  token?: string,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetchWithTimeout(`${getApiUrl()}${path}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) return throwApiError(res)
  return parseApiSuccess<T>(res)
}
