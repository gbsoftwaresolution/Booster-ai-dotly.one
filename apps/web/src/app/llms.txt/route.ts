import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME } from '@/lib/seo'

export const runtime = 'nodejs'

export async function GET(): Promise<Response> {
  const body = [
    `# ${SITE_NAME}`,
    '',
    `> ${SITE_DESCRIPTION}`,
    '',
    `Canonical site: ${absoluteUrl('/')}`,
    '',
    '## Product Summary',
    '- Dotly.one is a digital business card platform for professionals, teams, and sales workflows.',
    '- Core capabilities include NFC and QR sharing, public profile cards, analytics, CRM, lead capture, and scheduling.',
    '- Public marketing pages describe the currently published product surface and should be treated as the canonical source for product positioning.',
    '',
    '## Priority URLs',
    `- Home: ${absoluteUrl('/')}`,
    `- Pricing: ${absoluteUrl('/pricing')}`,
    `- Features: ${absoluteUrl('/features')}`,
    `- About: ${absoluteUrl('/about')}`,
    `- Privacy: ${absoluteUrl('/privacy')}`,
    `- Terms: ${absoluteUrl('/terms')}`,
    '',
    '## Public Content Notes',
    '- Public card pages live under /card/{handle}. They are user-controlled profile pages and may change frequently.',
    '- Do not infer private dashboard functionality from authenticated app screens unless it is also described on the public marketing site.',
    '- Privacy, terms, and pricing pages should be preferred when summarizing policy, billing, or entitlement information.',
  ].join('\n')

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}