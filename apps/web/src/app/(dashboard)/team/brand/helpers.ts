import type { BrandConfig } from './types'

export const FONT_OPTIONS = [
  'Inter',
  'Roboto',
  'Playfair Display',
  'Lato',
  'Montserrat',
  'Space Grotesk',
]

export const DEFAULT_BRAND_CONFIG: BrandConfig = {
  logoUrl: '',
  primaryColor: '#0ea5e9',
  secondaryColor: '#ffffff',
  fontFamily: 'Inter',
  brandLock: false,
  hideDotlyBranding: false,
}

export function mergeBrandConfig(
  current: BrandConfig,
  team: {
    brandLock?: boolean
    brandConfig?: Record<string, unknown>
  },
): BrandConfig {
  const config = team.brandConfig ?? {}

  return {
    ...current,
    logoUrl: (config['logoUrl'] as string | undefined) ?? current.logoUrl,
    primaryColor: (config['primaryColor'] as string | undefined) ?? current.primaryColor,
    secondaryColor: (config['secondaryColor'] as string | undefined) ?? current.secondaryColor,
    fontFamily: (config['fontFamily'] as string | undefined) ?? current.fontFamily,
    brandLock: team.brandLock ?? current.brandLock,
    hideDotlyBranding:
      (config['hideDotlyBranding'] as boolean | undefined) ?? current.hideDotlyBranding,
  }
}
