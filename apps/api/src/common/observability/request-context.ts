import { AsyncLocalStorage } from 'node:async_hooks'

export interface RequestContextValue {
  requestId: string
  route?: string
  method?: string
  userId?: string | null
}

const storage = new AsyncLocalStorage<RequestContextValue>()

export function runWithRequestContext<T>(value: RequestContextValue, callback: () => T): T {
  return storage.run(value, callback)
}

export function getRequestContext(): RequestContextValue | undefined {
  return storage.getStore()
}

export function updateRequestContext(patch: Partial<RequestContextValue>): void {
  const current = storage.getStore()
  if (!current) return

  Object.assign(current, patch)
}
