import { Type } from 'class-transformer'
import {
  IsArray,
  IsEnum,
  IsInt,
  IsString,
  IsUrl,
  Min,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { SocialPlatform } from '@dotly/types'

export class SocialLinkItemDto {
  @ApiProperty({ enum: SocialPlatform })
  @IsEnum(SocialPlatform)
  platform!: SocialPlatform

  // HIGH-10: Restrict @IsUrl to http/https only.
  // The default @IsUrl() accepts javascript:, file://, ftp://, and any other
  // registered URI scheme. An attacker could store a javascript: URL that
  // gets rendered as an <a href> in the card viewer, leading to XSS.
  // require_protocol ensures bare strings like "linkedin.com" are rejected too.
  @ApiProperty({ example: 'https://linkedin.com/in/username' })
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'url must be a valid http or https URL' },
  )
  url!: string

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  displayOrder!: number
}

export class UpsertSocialLinksDto {
  // HIGH-09: Cap the array at 20 items.
  // Without @ArrayMaxSize an attacker could POST 10,000 links in a single
  // request, causing the upsert transaction (deleteMany + createMany) to write
  // thousands of rows and exhaust DB resources.
  @ApiProperty({ type: [SocialLinkItemDto] })
  @IsArray()
  @ArrayMaxSize(20, { message: 'A card may have at most 20 social links' })
  @ValidateNested({ each: true })
  @Type(() => SocialLinkItemDto)
  links!: SocialLinkItemDto[]
}
