import { redirect } from 'next/navigation'

// Real implementation moved to (apps)/apps/cards/create/page.tsx.
// Middleware redirects /cards/create → /apps/cards (then /apps/cards/create).
export default function CreateCardLegacyPage() {
  redirect('/apps/cards/create')
}
