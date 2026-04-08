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
}

export class UpsertMediaBlocksDto {
  // HIGH-09: Cap the array at 10 items.
  // Media blocks are heavier than social links (each has a URL to a video/image),
  // so a lower cap (10) is appropriate.
  @ApiProperty({ type: [MediaBlockItemDto] })
  @IsArray()
  @ArrayMaxSize(10, { message: 'A card may have at most 10 media blocks' })
  @ValidateNested({ each: true })
  @Type(() => MediaBlockItemDto)
  blocks!: MediaBlockItemDto[]
}
