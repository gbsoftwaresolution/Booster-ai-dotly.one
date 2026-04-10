import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
  IsObject,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { CardTemplate } from '@dotly/types'
import { CardFieldsDto } from './create-card.dto'
import { VcardPolicy } from '@dotly/database'

export class UpdateCardDto {
  @ApiPropertyOptional({ description: 'Unique handle (lowercase alphanumeric with hyphens)' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Handle must be lowercase alphanumeric with hyphens' })
  @MaxLength(50)
  handle?: string

  @ApiPropertyOptional({ enum: CardTemplate })
  @IsOptional()
  @IsEnum(CardTemplate)
  templateId?: CardTemplate

  // HIGH-03: Reuse the same typed CardFieldsDto used in CreateCardDto.
  @ApiPropertyOptional({ description: 'Card fields' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CardFieldsDto)
  fields?: CardFieldsDto

  @ApiPropertyOptional({
    enum: VcardPolicy,
    description: 'Who can download the vCard: PUBLIC or MEMBERS_ONLY',
  })
  @IsOptional()
  @IsEnum(VcardPolicy)
  vcardPolicy?: VcardPolicy
}
