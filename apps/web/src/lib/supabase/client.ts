import { createBrowserClient } from '@supabase/ssr'

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error('Supabase environment variables are missing.')
  }
  return { url, anonKey }
}

export function createClient() {
  const { url, anonKey } = getSupabaseEnv()
  return createBrowserClient(url, anonKey)
}

/**
 * Returns a validated access token for the current browser session.
 *
 * Uses getUser() to re-validate the JWT with Supabase's servers before
 * returning the token from getSession(). This prevents use of expired or
 * revoked tokens that are still present in the browser cookie.
 *
 * Returns undefined if the user is not authenticated or the session is invalid.
 */
export async function getAccessToken(): Promise<string | undefined> {
  const supabase = createClient()
  // Re-validate the session with Supabase Auth servers
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return undefined
  // Now safe to read the token from the session cookie
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token
}
