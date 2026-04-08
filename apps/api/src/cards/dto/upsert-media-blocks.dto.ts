import { Type } from 'class-transformer'
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  Max,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { MediaBlockType } from '@dotly/types'

export class MediaBlockItemDto {
  @ApiProperty({ enum: MediaBlockType })
  @IsEnum(MediaBlockType)
  type!: MediaBlockType

  @ApiPropertyOptional({ example: 'https://cdn.dotly.one/card-id/video.mp4' })
  @IsOptional()
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'url must be a valid http or https URL' },
  )
  url?: string

  @ApiPropertyOptional({ example: 'Product demo' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  caption?: string

  @ApiPropertyOptional({ example: 'A photo of our product on a white background' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  altText?: string

  @ApiPropertyOptional({ example: 'https://mysite.com/products' })
  @IsOptional()
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'linkUrl must be a valid http or https URL' },
  )
  linkUrl?: string

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  displayOrder!: number

  @ApiPropertyOptional({ example: 'application/pdf' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  mimeType?: string

  @ApiPropertyOptional({ example: 2457600 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(104857600) // 100 MB hard cap
  fileSize?: number

  @ApiPropertyOptional({ example: 'cuid_abc123' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  groupId?: string

  @ApiPropertyOptional({ example: 'Portfolio' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  groupName?: string
}

export class UpsertMediaBlocksDto {
  // Cap: 20 total blocks (10 media + 10 documents can coexist)
  @ApiProperty({ type: [MediaBlockItemDto] })
  @IsArray()
  @ArrayMaxSize(20, { message: 'A card may have at most 20 media blocks' })
  @ValidateNested({ each: true })
  @Type(() => MediaBlockItemDto)
  blocks!: MediaBlockItemDto[]
}
