import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function getServerUserOrRedirect(authPath = '/auth') {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect(authPath)
    }

    return user
  } catch {
    redirect(authPath)
  }
}

export async function getServerSessionAccessTokenOrRedirect(authPath = '/auth') {
  try {
    const supabase = await createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const token = session?.access_token
    if (!token) {
      redirect(authPath)
    }

    return token
  } catch {
    redirect(authPath)
  }
}

export async function getServerUserAndTokenOrRedirect(authPath = '/auth') {
  try {
    const supabase = await createClient()
    const [userResult, sessionResult] = await Promise.all([
      supabase.auth.getUser(),
      supabase.auth.getSession(),
    ])

    const user = userResult.data.user
    const token = sessionResult.data.session?.access_token

    if (!user || !token) {
      redirect(authPath)
    }

    return { user, token }
  } catch {
    redirect(authPath)
  }
}