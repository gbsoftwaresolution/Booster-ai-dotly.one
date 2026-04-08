import { redirect } from 'next/navigation'
import { getServerApiUrl } from '@/lib/server-api'
import { TeamSignInClient } from './TeamSignInClient'

const API_URL = getServerApiUrl()

interface TeamBrandData {
  id: string
  name: string
  slug: string
  brandName: string | null
  brandLogoUrl: string | null
  brandColor: string | null
}

async function getTeamBySlug(slug: string): Promise<TeamBrandData | null> {
  try {
    const res = await fetch(`${API_URL}/teams/by-slug/${slug}`, { cache: 'no-store' })
    if (!res.ok) return null
    return (await res.json()) as TeamBrandData
  } catch {
    return null
  }
}

export default async function TeamSignInPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const team = await getTeamBySlug(slug)

  if (!team) {
    redirect('/auth')
  }

  return <TeamSignInClient team={team} />
}
