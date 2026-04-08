import { IsHexColor, IsOptional, IsIn, IsUrl } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

// MED-11: Allowlisted font families.  Accepting an arbitrary string here would
// allow an attacker to inject any value into the `fontFamily` DB column, which
// is later rendered verbatim in `font-family: <value>` CSS — enabling CSS
// injection that can exfiltrate data or manipulate the rendered card.
const ALLOWED_FONTS = [
  'Inter',
  'Roboto',
  'Playfair Display',
  'Lato',
  'Montserrat',
  'Space Grotesk',
] as const

const ALLOWED_BUTTON_STYLES = ['icon', 'filled-icon', 'icon-text', 'filled-icon-text'] as const

const ALLOWED_SOCIAL_BUTTON_STYLES = ['icons', 'pills', 'list', 'follow'] as const

export class UpdateThemeDto {
  @ApiPropertyOptional({ description: 'Primary color (hex)', example: '#6366f1' })
  @IsOptional()
  @IsHexColor()
  primaryColor?: string

  @ApiPropertyOptional({ description: 'Secondary color (hex)', example: '#ffffff' })
  @IsOptional()
  @IsHexColor()
  secondaryColor?: string

  @ApiPropertyOptional({ description: 'Font family', example: 'Inter', enum: ALLOWED_FONTS })
  @IsOptional()
  @IsIn(ALLOWED_FONTS, { message: `fontFamily must be one of: ${ALLOWED_FONTS.join(', ')}` })
  fontFamily?: string

  @ApiPropertyOptional({ description: 'Background image URL' })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  backgroundUrl?: string

  @ApiPropertyOptional({ description: 'Company logo URL' })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  logoUrl?: string

  @ApiPropertyOptional({
    description: 'CTA button style',
    example: 'filled-icon-text',
    enum: ALLOWED_BUTTON_STYLES,
  })
  @IsOptional()
  @IsIn(ALLOWED_BUTTON_STYLES, {
    message: `buttonStyle must be one of: ${ALLOWED_BUTTON_STYLES.join(', ')}`,
  })
  buttonStyle?: string

  @ApiPropertyOptional({
    description: 'Social links button style',
    example: 'follow',
    enum: ALLOWED_SOCIAL_BUTTON_STYLES,
  })
  @IsOptional()
  @IsIn(ALLOWED_SOCIAL_BUTTON_STYLES, {
    message: `socialButtonStyle must be one of: ${ALLOWED_SOCIAL_BUTTON_STYLES.join(', ')}`,
  })
  socialButtonStyle?: string
}
