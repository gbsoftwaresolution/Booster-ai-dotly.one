import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error('Supabase environment variables are missing.')
  }
  return { url, anonKey }
}

export async function createClient() {
  const cookieStore = await cookies()
  const { url, anonKey } = getSupabaseEnv()
  return createServerClient(url, anonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch {
          // Server Component — can be safely ignored
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options })
        } catch {
          // Server Component — can be safely ignored
        }
      },
    },
  })
}
