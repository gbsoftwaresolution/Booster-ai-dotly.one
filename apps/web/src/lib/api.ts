const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

async function throwApiError(res: Response): Promise<never> {
  let message = `API ${res.status}`
  try {
    const body = await res.json() as Record<string, unknown>
    if (typeof body['message'] === 'string') message = body['message']
    else if (typeof body['error'] === 'string') message = body['error']
  } catch {
    // ignore JSON parse failure — keep default message
  }
  throw new Error(message)
}

export async function apiGet<T>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  })
  if (!res.ok) return throwApiError(res)
  return res.json() as Promise<T>
}

export async function apiPost<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) return throwApiError(res)
  return res.json() as Promise<T>
}

export async function apiPut<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) return throwApiError(res)
  return res.json() as Promise<T>
}

export async function apiPatch<T>(path: string, body: unknown, token?: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) return throwApiError(res)
  return res.json() as Promise<T>
}

export async function apiDelete<T = void>(path: string, token?: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) return throwApiError(res)
  // 204 No Content — no body to parse
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
