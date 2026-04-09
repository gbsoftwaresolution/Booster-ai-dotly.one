import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  Min,
  Max,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator'
import { Transform } from 'class-transformer'
import { IsIANATimezone } from '../../common/validators/is-iana-timezone.validator'

export class CreateAppointmentTypeDto {
  @IsString()
  // FIX-10: Trim whitespace so "  My Meeting  " doesn't create a name with
  // leading/trailing spaces that looks wrong in emails and the booking page.
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(1)
  @MaxLength(120)
  name!: string

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase alphanumeric with hyphens' })
  slug!: string

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(2000)
  description?: string

  @IsInt()
  @Min(5)
  @Max(480)
  durationMins!: number

  @IsOptional()
  @IsString()
  // FIX-G: enforce valid hex colour (#RGB or #RRGGBB) — prevents storing arbitrary strings
  @Matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, {
    message: 'color must be a valid hex colour (#RGB or #RRGGBB)',
  })
  color?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  bufferDays?: number

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(240)
  bufferAfterMins?: number

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(500)
  location?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsString()
  @MaxLength(64)
  // MED-5: Validate as a real IANA timezone identifier (not just any string ≤64 chars)
  @IsIANATimezone()
  timezone?: string
}
