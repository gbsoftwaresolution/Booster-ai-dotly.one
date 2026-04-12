import type { CustomDomain } from './types'

export const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ACTIVE: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
}

export const DOMAIN_REGEX =
  /^(?=.{1,253}$)(?!-)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i
export const DOMAIN_INPUT_ID = 'custom-domain-input'

export function normalizeDomainInput(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
}

export function validateDomain(domain: string): string | null {
  if (!domain) return 'Domain is required.'
  if (!DOMAIN_REGEX.test(domain)) return 'Enter a valid hostname like card.yourcompany.com.'
  return null
}

export function getDomainStats(domains: CustomDomain[]): {
  activeDomains: number
  assignedDomains: number
  pendingDomains: number
} {
  return {
    activeDomains: domains.filter((domain) => domain.status === 'ACTIVE').length,
    assignedDomains: domains.filter((domain) => Boolean(domain.card)).length,
    pendingDomains: domains.filter((domain) => domain.status === 'PENDING').length,
  }
}

export function getFocusMessage({
  loading,
  domains,
  activeDomains,
}: {
  loading: boolean
  domains: CustomDomain[]
  activeDomains: number
}): string {
  if (loading) return 'Loading your custom domain inventory.'
  if (domains.length === 0) return 'Add your first domain to begin verification and card routing.'
  if (activeDomains > 0) {
    return `${activeDomains} domain${activeDomains === 1 ? '' : 's'} are active and ready to serve branded links.`
  }
  return 'Verification is still pending. Complete DNS steps to activate your branded domains.'
}
