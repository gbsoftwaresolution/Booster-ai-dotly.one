import { redirect } from 'next/navigation'
import { getServerApiUrl } from '@/lib/server-api'
import { TeamSignInClient } from './TeamSignInClient'

interface TeamBrandData {
  id: string
  name: string
  slug: string
  brandName: string | null
  brandLogoUrl: string | null
  brandColor: string | null
}

async function getTeamBySlug(slug: string): Promise<TeamBrandData | null> {
  const apiUrl = getServerApiUrl()
  try {
    const res = await fetch(`${apiUrl}/teams/by-slug/${slug}`, { cache: 'no-store' })
    if (!res.ok) return null
    return (await res.json()) as TeamBrandData
  } catch {
    return null
  }
}

export default async function TeamSignInPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const team = await getTeamBySlug(slug)

  if (!team) {
    redirect('/auth')
  }

  return <TeamSignInClient team={team} />
}
