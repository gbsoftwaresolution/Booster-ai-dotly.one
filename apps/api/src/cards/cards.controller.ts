import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  Res,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ThrottlerGuard, Throttle } from '@nestjs/throttler'
import { IsString, IsIn, MaxLength, Matches } from 'class-validator'
import type { Response } from 'express'
import { CardsService } from './cards.service'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Public } from '../auth/decorators/public.decorator'
import { CreateCardDto } from './dto/create-card.dto'
import { UpdateCardDto } from './dto/update-card.dto'
import { UpdateThemeDto } from './dto/update-theme.dto'
import { UpsertSocialLinksDto } from './dto/upsert-social-links.dto'
import { UpsertMediaBlocksDto } from './dto/upsert-media-blocks.dto'

const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const

const ALLOWED_MIME_TYPES = [
  ...ALLOWED_IMAGE_MIME_TYPES,
  // Audio
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  // PDF
  'application/pdf',
  // Word
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Excel
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // PowerPoint
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // CSV / text
  'text/csv',
  'text/plain',
  // ZIP
  'application/zip',
  'application/x-zip-compressed',
] as const

class UploadUrlDto {
  /**
   * Filename for the uploaded asset.
   * Only alphanumerics, dots, hyphens and underscores are permitted —
   * this prevents path traversal (e.g. ../../other-card/evil.png) in R2 keys.
   */
  @IsString()
  @MaxLength(255)
  @Matches(/^[a-zA-Z0-9.\-_]+$/, {
    message: 'filename may only contain letters, numbers, dots, hyphens and underscores',
  })
  filename!: string

  @IsIn(ALLOWED_MIME_TYPES)
  contentType!: string
}

class UploadAvatarDto {
  /** Base64-encoded image data (max 5 MB decoded ≈ ~6.8 MB base64) */
  @IsString()
  @MaxLength(7_000_000) // 7 MB base64 ceiling
  base64!: string

  @IsIn(ALLOWED_IMAGE_MIME_TYPES)
  mimeType!: string
}

class PublishActionDto {
  @IsIn(['publish', 'unpublish'])
  action!: 'publish' | 'unpublish'
}

@ApiTags('cards')
@Controller()
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all cards for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Array of cards with themes, social links and qr codes',
  })
  @Get('cards')
  findAll(@CurrentUser() user: { id: string }) {
    return this.cardsService.findAllByUser(user.id)
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new card' })
  @ApiResponse({ status: 201, description: 'Card created successfully' })
  @ApiResponse({ status: 403, description: 'Plan limit reached' })
  @ApiResponse({ status: 409, description: 'Handle already taken' })
  @Post('cards')
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateCardDto) {
    return this.cardsService.create(user.id, dto)
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a card by ID (owner only)' })
  @ApiResponse({ status: 200, description: 'Full card with theme, social links, media blocks' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  @Get('cards/:id')
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.cardsService.findById(id, user.id)
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a card (partial update)' })
  @ApiResponse({ status: 200, description: 'Updated card' })
  @Put('cards/:id')
  update(@Param('id') id: string, @CurrentUser() user: { id: string }, @Body() dto: UpdateCardDto) {
    return this.cardsService.update(id, user.id, dto)
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update card theme' })
  @ApiResponse({ status: 200, description: 'Updated theme' })
  @Put('cards/:id/theme')
  updateTheme(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateThemeDto,
  ) {
    return this.cardsService.updateTheme(id, user.id, dto)
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Replace all social links for a card' })
  @ApiResponse({ status: 200, description: 'Social links replaced' })
  @Put('cards/:id/social-links')
  upsertSocialLinks(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpsertSocialLinksDto,
  ) {
    return this.cardsService.upsertSocialLinks(id, user.id, dto)
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Replace all media blocks for a card' })
  @ApiResponse({ status: 200, description: 'Media blocks replaced' })
  @Put('cards/:id/media-blocks')
  upsertMediaBlocks(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpsertMediaBlocksDto,
  ) {
    return this.cardsService.upsertMediaBlocks(id, user.id, dto)
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Duplicate a card (creates a draft copy)' })
  @ApiResponse({ status: 201, description: 'Duplicate card created as draft' })
  @ApiResponse({ status: 403, description: 'Plan limit reached' })
  @Post('cards/:id/duplicate')
  duplicate(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.cardsService.duplicate(id, user.id)
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a card' })
  @ApiResponse({ status: 200, description: 'Card deleted' })
  @Delete('cards/:id')
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.cardsService.delete(id, user.id)
  }

  /**
   * Single publish-control endpoint.
   * PATCH /cards/:id/publish  { action: "publish" }   → sets isActive = true
   * PATCH /cards/:id/publish  { action: "unpublish" } → sets isActive = false
   *
   * Replaces the previous three overlapping endpoints:
   *   PATCH /cards/:id/publish  (toggle — ambiguous semantics)
   *   POST  /cards/:id/publish  (set true)
   *   POST  /cards/:id/unpublish (set false)
   */
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Publish or unpublish a card. Body: { action: "publish" | "unpublish" }',
  })
  @ApiResponse({ status: 200, description: 'Updated card with new isActive state' })
  @Patch('cards/:id/publish')
  publishControl(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: PublishActionDto,
  ) {
    return dto.action === 'publish'
      ? this.cardsService.publish(id, user.id)
      : this.cardsService.unpublish(id, user.id)
  }

  // F-16: Rate-limit the presigned-URL endpoint to prevent an attacker from
  // generating thousands of short-lived upload URLs in bulk (quota exhaustion,
  // R2 cost amplification). 20 per minute is generous for normal use.
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a signed upload URL for card assets (R2)' })
  @ApiResponse({ status: 200, description: 'Returns uploadUrl and publicUrl' })
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('cards/:id/upload-url')
  getUploadUrl(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UploadUrlDto,
  ) {
    return this.cardsService.getUploadUrl(id, user.id, dto.filename, dto.contentType)
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload avatar image (base64) for a card' })
  @ApiResponse({ status: 201, description: 'Returns avatar URL' })
  @Post('cards/:id/avatar')
  uploadAvatar(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UploadAvatarDto,
  ) {
    return this.cardsService.uploadAvatar(id, user.id, dto.base64, dto.mimeType)
  }

  @Public()
  @ApiOperation({ summary: 'Get a published card by handle (no auth)' })
  @ApiResponse({ status: 200, description: 'Full public card payload' })
  @ApiResponse({ status: 404, description: 'Card not found or unpublished' })
  @Get('public/cards/:handle')
  findByHandle(@Param('handle') handle: string) {
    return this.cardsService.findByHandle(handle)
  }

  @Public()
  @ApiOperation({ summary: 'Download vCard for a published card (no auth)' })
  @ApiResponse({ status: 200, description: 'vCard 3.0 file attachment' })
  @Get('public/cards/:handle/vcard')
  async getVcard(@Param('handle') handle: string, @Res() res: Response) {
    // F-17: getVcard() fetches the card from DB and attaches the DB-validated
    // handle as `_handle` on the returned string. We use that value in the
    // Content-Disposition header instead of the raw URL param so an attacker
    // cannot inject characters like `"` or `\n` into the header by crafting a
    // handle that was never stored in the DB.
    const vcard = await this.cardsService.getVcard(handle)
    const safeHandle = (vcard as unknown as { _handle?: string })._handle ?? handle
    res.setHeader('Content-Type', 'text/vcard')
    res.setHeader('Content-Disposition', `attachment; filename="${safeHandle}.vcf"`)
    res.send(vcard)
  }
}
