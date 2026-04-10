import { redirect } from 'next/navigation'

// Middleware redirects /cards/new → /apps/cards/create (308).
// This stub handles the rare case where Next.js renders the route before middleware runs.
export default function CardsNewLegacyPage() {
  redirect('/apps/cards/create')
}
