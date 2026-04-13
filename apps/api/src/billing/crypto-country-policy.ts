import { ConfigService } from '@nestjs/config'

export function getCryptoBlockedCountries(config: ConfigService): Set<string> {
  const raw = config.get<string>('CRYPTO_BLOCKED_COUNTRIES') ?? ''
  return new Set(
    raw
      .split(',')
      .map((value) => value.trim().toUpperCase())
      .filter((value) => /^[A-Z]{2}$/.test(value)),
  )
}

export function isCryptoBlockedForCountry(config: ConfigService, country?: string | null): boolean {
  if (!country) return false
  return getCryptoBlockedCountries(config).has(country.trim().toUpperCase())
}
