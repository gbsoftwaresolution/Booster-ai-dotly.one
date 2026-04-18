import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getServerApiUrl } from '@/lib/server-api'
import { SalesLinkClient } from './SalesLinkClient'

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

async function getSalesLinkSettings(username: string): Promise<SalesLinkSettings> {
  const apiUrl = getServerApiUrl()
  const res = await fetch(`${apiUrl}/payment/config/${encodeURIComponent(username)}`, {
    cache: 'no-store',
  })

  if (!res.ok) {
    return {
      stripeEnabled: false,
      provider: null,
      country: null,
      upgradeRequired: false,
      message: null,
    }
  }

  return (await res.json()) as SalesLinkSettings
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
  const [profile, settings] = await Promise.all([
    getSalesLinkProfile(username),
    getSalesLinkSettings(username),
  ])

  if (!profile) {
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
