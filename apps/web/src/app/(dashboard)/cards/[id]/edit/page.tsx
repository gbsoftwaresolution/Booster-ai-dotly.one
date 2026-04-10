import { redirect } from 'next/navigation'

// Real implementation moved to (apps)/apps/cards/[id]/edit/page.tsx.
// Middleware redirects /cards/* → /apps/cards so this route is unreachable,
// but kept as a stub in case middleware is ever relaxed.
export default async function CardEditLegacyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/apps/cards/${id}/edit`)
}
