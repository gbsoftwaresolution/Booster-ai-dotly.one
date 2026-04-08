import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { PoweredByDotly } from '@/components/PoweredByDotly'
import { getServerApiUrl } from '@/lib/server-api'
import { CardView } from './CardView'
import type { CardTemplate, SocialPlatform, MediaBlockType } from '@dotly/types'

export const revalidate = 60

const API_URL = getServerApiUrl()

interface TeamBrand {
  brandName: string | null
  brandLogoUrl: string | null
  brandColor: string | null
  hideDotlyBranding: boolean
}

interface RawCard {
  id: string
  handle: string
  templateId: string
  fields: Record<string, string>
  isActive: boolean
  theme?: {
    primaryColor?: string
    secondaryColor?: string
    fontFamily?: string
    backgroundUrl?: string
    logoUrl?: string
  }
  socialLinks?: Array<{ id: string; platform: string; url: string; displayOrder: number }>
  mediaBlocks?: Array<{
    id: string
    type: string
    url: string
    caption?: string
    displayOrder: number
  }>
  teamBrand?: TeamBrand | null
}

/** Validate that a value is a safe CSS hex color (e.g. #fff or #0ea5e9) */
function safeBrandColor(color: string | null | undefined): string | null {
  if (!color) return null
  return /^#[0-9a-fA-F]{3,8}$/.test(color) ? color : null
}

async function getCard(handle: string): Promise<RawCard | null> {
  try {
    const res = await fetch(`${API_URL}/public/cards/${handle}`)
    if (!res.ok) return null
    return (await res.json()) as RawCard
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>
}): Promise<Metadata> {
  const { handle } = await params
  const card = await getCard(handle)
  if (!card) return { title: 'Card Not Found' }
  const fields = card.fields
  return {
    title: `${fields.name ?? 'Digital Card'} — Dotly.one`,
    description: fields.bio?.slice(0, 160) ?? `${fields.title} at ${fields.company}`,
    openGraph: {
      title: fields.name ?? 'Digital Card',
      description: fields.bio?.slice(0, 160) ?? `${fields.title} at ${fields.company}`,
      images: fields.avatarUrl ? [{ url: fields.avatarUrl }] : [],
      type: 'profile',
    },
    twitter: { card: 'summary_large_image' },
  }
}

export default async function CardPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  const rawCard = await getCard(handle)
  if (!rawCard) notFound()

  const theme = rawCard.theme ?? {
    primaryColor: '#0ea5e9',
    secondaryColor: '#ffffff',
    fontFamily: 'Inter',
  }

  const teamBrand = rawCard.teamBrand ?? null
  const fields = rawCard.fields

  const card = {
    id: rawCard.id,
    handle: rawCard.handle,
    templateId: rawCard.templateId as CardTemplate,
    isActive: rawCard.isActive,
    fields: {
      name: fields.name ?? '',
      title: fields.title ?? '',
      company: fields.company ?? '',
      phone: fields.phone ?? '',
      email: fields.email ?? '',
      website: fields.website ?? '',
      bio: fields.bio ?? '',
      address: fields.address ?? '',
      avatarUrl: fields.avatarUrl ?? '',
      logoUrl: fields.logoUrl ?? '',
    },
  }

  const cardTheme = {
    primaryColor: safeBrandColor(teamBrand?.brandColor) ?? theme.primaryColor ?? '#0ea5e9',
    secondaryColor: theme.secondaryColor ?? '#ffffff',
    fontFamily: theme.fontFamily ?? 'Inter',
    backgroundUrl: theme.backgroundUrl,
    logoUrl: theme.logoUrl,
  }

  const socialLinks = (rawCard.socialLinks ?? []).map((l) => ({
    id: l.id,
    platform: l.platform as SocialPlatform,
    url: l.url,
    displayOrder: l.displayOrder,
  }))

  const mediaBlocks = (rawCard.mediaBlocks ?? []).map((b) => ({
    id: b.id,
    type: b.type as MediaBlockType,
    url: b.url,
    caption: b.caption,
    displayOrder: b.displayOrder,
  }))

  const brandColor = safeBrandColor(teamBrand?.brandColor)

  return (
    <main
      className="min-h-screen flex flex-col items-center"
      style={{
        // Subtle neutral-to-slate gradient canvas — templates render full-width inside
        background: 'linear-gradient(160deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)',
      }}
    >
      {/* Team brand color as CSS custom property */}
      {brandColor && <style>{`:root { --brand-color: ${brandColor}; }`}</style>}

      {/* Constrained content column — max-w-md keeps the card phone-width */}
      <div className="w-full max-w-md flex flex-col min-h-screen">
        {/* Team logo — shown above the card when team has a brand logo */}
        {teamBrand?.brandLogoUrl && (
          <div className="flex justify-center pt-8 pb-4 px-4">
            <Image
              src={teamBrand.brandLogoUrl}
              alt={teamBrand.brandName ?? 'Team logo'}
              width={160}
              height={40}
              className="h-10 w-auto object-contain"
            />
          </div>
        )}

        {/* Card — fills the column, no extra horizontal padding */}
        <div className="flex-1">
          <CardView
            card={card}
            theme={cardTheme}
            socialLinks={socialLinks}
            mediaBlocks={mediaBlocks}
            mode="web"
            cardHandle={rawCard.handle}
            ownerName={fields.name ?? 'this person'}
          />
        </div>

        <PoweredByDotly hideDotlyBranding={teamBrand?.hideDotlyBranding ?? false} />
      </div>
    </main>
  )
}
