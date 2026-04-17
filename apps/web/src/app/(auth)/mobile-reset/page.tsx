import { redirect } from 'next/navigation'

export default async function MobileResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const params = await searchParams
  const token = params.token

  if (!token) {
    redirect('/auth?error=invalid_reset_link')
  }

  redirect(`dotly://auth/callback?type=recovery&token=${encodeURIComponent(token)}`)
}
