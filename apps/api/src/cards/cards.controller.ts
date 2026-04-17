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
  Req,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ThrottlerGuard, Throttle } from '@nestjs/throttler'
import { IsString, IsIn, IsInt, Min, Max, MaxLength, Matches, IsOptional } from 'class-validator'
import type { Response } from 'express'
import { CardsService } from './cards.service'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Public } from '../auth/decorators/public.decorator'
import { CreateCardDto } from './dto/create-card.dto'
import { UpdateCardDto } from './dto/update-card.dto'
import { UpdateThemeDto } from './dto/update-theme.dto'
import { UpsertSocialLinksDto } from './dto/upsert-social-links.dto'
import { UpsertMediaBlocksDto } from './dto/upsert-media-blocks.dto'
import type { ItemsResponse } from '@dotly/types'

const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const

const ALLOWED_MIME_TYPES = [
  ...ALLOWED_IMAGE_MIME_TYPES,
  // Video
  'video/mp4',
  'video/webm',
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

  /**
   * Exact byte length of the file the client intends to upload.
   * Passed as ContentLength to PutObjectCommand so R2 rejects uploads that
   * exceed the declared size.  Max 10 MB (10_485_760 bytes).
   */
  @IsInt()
  @Min(1)
  @Max(10_485_760)
  fileSizeBytes!: number
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

class CreateServiceCheckoutIntentDto {
  @IsString()
  @MaxLength(100)
  serviceId!: string

  @IsString()
  @MaxLength(120)
  customerName!: string

  @IsString()
  @MaxLength(254)
  customerEmail!: string

  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/)
  walletAddress!: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string
}

class ActivateServiceCheckoutDto {
  @IsString()
  @MaxLength(100)
  paymentId!: string

  @IsString()
  @Matches(/^0x[a-fA-F0-9]{64}$/)
  txHash!: string
}

class CreateProductCheckoutIntentDto {
  @IsString()
  @MaxLength(100)
  productId!: string

  @IsString()
  @MaxLength(120)
  customerName!: string

  @IsString()
  @MaxLength(254)
  customerEmail!: string

  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/)
  walletAddress!: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string
}

class ActivateProductCheckoutDto {
  @IsString()
  @MaxLength(100)
  paymentId!: string

  @IsString()
  @Matches(/^0x[a-fA-F0-9]{64}$/)
  txHash!: string
}

@ApiTags('cards')
@Controller()
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all cards for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Array of card summaries (id, handle, templateId, isActive, fields, viewCount)',
  })
  @Get('cards')
  findAll(@CurrentUser() user: { id: string }) {
    return this.cardsService
      .findAllByUser(user.id)
      .then((items): ItemsResponse<(typeof items)[number]> => ({ items }))
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
  @Get('cards/:id/service-orders')
  listServiceOrders(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.cardsService
      .listServiceOrders(id, user.id)
      .then((items): ItemsResponse<(typeof items)[number]> => ({ items }))
  }

  @ApiBearerAuth()
  @Get('cards/:id/product-orders')
  listProductOrders(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.cardsService
      .listProductOrders(id, user.id)
      .then((items): ItemsResponse<(typeof items)[number]> => ({ items }))
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
    return this.cardsService.getUploadUrl(
      id,
      user.id,
      dto.filename,
      dto.contentType,
      dto.fileSizeBytes,
    )
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
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('public/cards/:handle/service-checkout-intent')
  createServiceCheckoutIntent(
    @Param('handle') handle: string,
    @Body() dto: CreateServiceCheckoutIntentDto,
  ) {
    return this.cardsService.createServiceCheckoutIntent(handle, dto)
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('public/cards/:handle/service-checkout-activate')
  activateServiceCheckout(
    @Param('handle') handle: string,
    @Body() dto: ActivateServiceCheckoutDto,
  ) {
    return this.cardsService.activateServiceCheckout(handle, dto.paymentId, dto.txHash)
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('public/cards/:handle/product-checkout-intent')
  createProductCheckoutIntent(
    @Param('handle') handle: string,
    @Body() dto: CreateProductCheckoutIntentDto,
  ) {
    return this.cardsService.createProductCheckoutIntent(handle, dto)
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('public/cards/:handle/product-checkout-activate')
  activateProductCheckout(
    @Param('handle') handle: string,
    @Body() dto: ActivateProductCheckoutDto,
  ) {
    return this.cardsService.activateProductCheckout(handle, dto.paymentId, dto.txHash)
  }

  @Public()
  @ApiOperation({
    summary: 'Download vCard for a published card (no auth required for public cards)',
  })
  @ApiResponse({ status: 200, description: 'vCard 3.0 file attachment' })
  @Get('public/cards/:handle/vcard')
  async getVcard(
    @Param('handle') handle: string,
    @Res() res: Response,
    @Req() req: { headers: Record<string, string | undefined> },
  ) {
    // SEC-01: Extract Bearer token from the Authorization header only.
    // Previously the endpoint also accepted a ?token= query parameter so
    // <a download> links could authenticate without setting headers. This is
    // removed because query parameters appear in server access logs, Referer
    // headers, and browser history — all of which would leak the JWT.
    // Clients that need to download MEMBERS_ONLY vCards must set the
    // Authorization header (e.g. via a fetch() + createObjectURL approach).
    // Signature verification is delegated to CardsService.getVcard().
    const authHeader = req.headers['authorization'] ?? ''
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined
    const { content, handle: safeHandle } = await this.cardsService.getVcard(handle, bearerToken)
    res.setHeader('Content-Type', 'text/vcard')
    res.setHeader('Content-Disposition', `attachment; filename="${safeHandle}.vcf"`)
    res.send(content)
  }
}
