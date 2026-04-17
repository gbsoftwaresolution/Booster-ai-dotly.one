import {
  IsEnum,
  IsOptional,
  IsBoolean,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
  IsObject,
  IsArray,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { CardActionType, CardTemplate } from '@dotly/types'

class CardActionConfigDto {
  @IsEnum(['BOOK', 'WHATSAPP_CHAT', 'LEAD_CAPTURE'] satisfies CardActionType[])
  type!: CardActionType

  @IsOptional()
  @IsString()
  @MaxLength(60)
  label?: string

  @IsOptional()
  @IsBoolean()
  enabled?: boolean

  @IsOptional()
  @IsString()
  @MaxLength(500)
  whatsappMessage?: string
}

class CardActionsConfigDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => CardActionConfigDto)
  primary?: CardActionConfigDto

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CardActionConfigDto)
  secondary?: CardActionConfigDto[]
}

// HIGH-03: Replace the open-ended `Record<string, unknown>` fields type with an
// explicit DTO that validates and caps every known card field.
// Without this, an attacker can store arbitrarily large strings in any key
// (including keys the app never reads) and bloat the DB JSONB column.
// Unknown keys are silently dropped by class-transformer when
// `whitelist: true` is set on the global ValidationPipe.
export class CardFieldsDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  whatsapp?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  email?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  mapUrl?: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string

  @IsOptional()
  @IsString()
  @MaxLength(120)
  bookingAppointmentSlug?: string

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CardActionsConfigDto)
  actions?: CardActionsConfigDto
}

export class CreateCardDto {
  @ApiPropertyOptional({ description: 'Unique handle (lowercase alphanumeric with hyphens)' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Handle must be lowercase alphanumeric with hyphens' })
  @MaxLength(50)
  handle?: string

  @ApiPropertyOptional({ enum: CardTemplate, description: 'Card template' })
  @IsOptional()
  @IsEnum(CardTemplate)
  templateId?: CardTemplate

  @ApiPropertyOptional({ description: 'Card fields (name, title, company, etc.)' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CardFieldsDto)
  fields?: CardFieldsDto
}
