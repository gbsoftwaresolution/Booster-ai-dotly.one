import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getServerApiUrl } from '@/lib/server-api'
import { SalesLinkClient } from './SalesLinkClient'

export const revalidate = 0

interface SalesLinkProfile {
  name: string | null
  pitch: string | null
  phone: string | null
}

async function getSalesLinkProfile(username: string): Promise<SalesLinkProfile | null> {
  const apiUrl = getServerApiUrl()
  const res = await fetch(`${apiUrl}/public/${encodeURIComponent(username)}`, {
    cache: 'no-store',
  })

  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`Failed to load sales link (${res.status})`)
  }

  return (await res.json()) as SalesLinkProfile
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username } = await params
  const profile = await getSalesLinkProfile(username)

  if (!profile) {
    return { title: 'Sales Link Not Found' }
  }

  return {
    title: profile.name ? `${profile.name} | Sales Link` : 'Sales Link',
    description: profile.pitch ?? 'Start a conversation, book a call, or request payment.',
  }
}

export default async function SalesLinkPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const profile = await getSalesLinkProfile(username)

  if (!profile) {
    notFound()
  }

  return <SalesLinkClient profile={profile} />
}
