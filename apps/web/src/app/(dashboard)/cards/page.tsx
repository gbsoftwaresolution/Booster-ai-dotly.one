import { redirect } from 'next/navigation'

// This route is unreachable: middleware permanently redirects /cards → /apps/cards.
// Kept as an explicit redirect stub to avoid a 404 if middleware is ever changed.
export default function CardsLegacyPage() {
  redirect('/apps/cards')
}
