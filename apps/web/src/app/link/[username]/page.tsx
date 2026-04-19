import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getServerApiUrl } from '@/lib/server-api'
import { SalesLinkClient } from './SalesLinkClient'
import { createRequestId } from '@/lib/request-id'

export const revalidate = 0

interface SalesLinkProfile {
  username: string
  name: string | null
  pitch: string | null
  phone: string | null
  showBranding: boolean
}

interface SalesLinkSettings {
  stripeEnabled: boolean
  provider: string | null
  country: string | null
  upgradeRequired: boolean
  message: string | null
}

interface SalesLinkPageData {
  profile: SalesLinkProfile
  paymentConfig: SalesLinkSettings
}

async function getSalesLinkPageData(username: string): Promise<SalesLinkPageData | null> {
  const apiUrl = getServerApiUrl()
  const res = await fetch(`${apiUrl}/public-page/${encodeURIComponent(username)}`, {
    cache: 'no-store',
    headers: { 'x-request-id': createRequestId() },
  })

  if (res.status === 404) return null
  if (!res.ok) {
    throw new Error(`Failed to load sales link (${res.status})`)
  }

  return (await res.json()) as SalesLinkPageData
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>
}): Promise<Metadata> {
  const { username } = await params
  const pageData = await getSalesLinkPageData(username)
  const profile = pageData?.profile ?? null

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
  const pageData = await getSalesLinkPageData(username)
  const profile = pageData?.profile ?? null
  const settings = pageData?.paymentConfig

  if (!profile || !settings) {
    notFound()
  }

  return (
    <SalesLinkClient
      profile={profile}
      username={username}
      stripeEnabled={settings.stripeEnabled}
      paymentProvider={settings.provider}
      paymentCountry={settings.country}
      paymentUpgradeRequired={settings.upgradeRequired}
      paymentUpgradeMessage={settings.message}
    />
  )
}
