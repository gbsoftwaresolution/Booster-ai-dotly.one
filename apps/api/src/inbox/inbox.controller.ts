import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger'
import {
  IsString,
  IsEmail,
  IsOptional,
  IsInt,
  MaxLength,
  MinLength,
  Min,
  Max,
  IsIn,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ThrottlerGuard, Throttle } from '@nestjs/throttler'
import type { DeletedResponse } from '@dotly/types'
import { Public } from '../auth/decorators/public.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { InboxService } from './inbox.service'

// ─── Public DTOs ─────────────────────────────────────────────────────────────

class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  senderName!: string

  @IsOptional()
  @IsEmail()
  senderEmail?: string

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  message!: string
}

class GetVoiceUploadUrlDto {
  @IsString()
  @MaxLength(500)
  filename!: string

  @IsString()
  @IsIn([
    'audio/webm',
    'audio/ogg',
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/x-wav',
    'audio/aac',
  ])
  contentType!: string

  @IsInt()
  @Min(1)
  @Max(20 * 1024 * 1024)
  @Type(() => Number)
  fileSizeBytes!: number
}

class ConfirmVoiceNoteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  senderName!: string

  @IsOptional()
  @IsEmail()
  senderEmail?: string

  @IsString()
  @MinLength(20)
  @MaxLength(2048)
  uploadToken!: string

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  durationSec?: number
}

class GetDropboxUploadUrlDto {
  @IsString()
  @MaxLength(500)
  filename!: string

  @IsString()
  @MaxLength(100)
  contentType!: string

  @IsInt()
  @Min(1)
  @Max(50 * 1024 * 1024)
  @Type(() => Number)
  fileSizeBytes!: number
}

class ConfirmDropboxFileDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  senderName!: string

  @IsOptional()
  @IsEmail()
  senderEmail?: string

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  fileName!: string

  @IsString()
  @MinLength(20)
  @MaxLength(2048)
  uploadToken!: string
}

class CreateMemoryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content!: string
}

class InboxListQueryDto {
  @IsOptional()
  @IsString()
  cursor?: string

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number
}

// ─── Controller ───────────────────────────────────────────────────────────────

@ApiTags('inbox')
@Controller()
export class InboxController {
  constructor(private readonly inbox: InboxService) {}

  // ── Public: send message ────────────────────────────────────────────────────

  @Post('public/cards/:handle/messages')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Send a text message to a card owner' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  async sendMessage(@Param('handle') handle: string, @Body() dto: SendMessageDto) {
    return this.inbox.sendMessage(handle, dto.senderName, dto.senderEmail, dto.message)
  }

  // ── Public: get presigned voice upload URL ──────────────────────────────────

  @Post('public/cards/:handle/voice-notes/upload-url')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Get presigned URL to upload a voice note' })
  async getVoiceUploadUrl(@Param('handle') handle: string, @Body() dto: GetVoiceUploadUrlDto) {
    return this.inbox.getVoiceUploadUrl(handle, dto.filename, dto.contentType, dto.fileSizeBytes)
  }

  // ── Public: confirm voice note after upload ─────────────────────────────────

  @Post('public/cards/:handle/voice-notes')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Confirm voice note after direct R2 upload' })
  async confirmVoiceNote(@Param('handle') handle: string, @Body() dto: ConfirmVoiceNoteDto) {
    return this.inbox.confirmVoiceNote(
      handle,
      dto.senderName,
      dto.senderEmail,
      dto.uploadToken,
      dto.durationSec,
    )
  }

  // ── Public: get presigned dropbox upload URL ────────────────────────────────

  @Post('public/cards/:handle/dropbox/upload-url')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Get presigned URL to upload a dropbox file' })
  async getDropboxUploadUrl(@Param('handle') handle: string, @Body() dto: GetDropboxUploadUrlDto) {
    return this.inbox.getDropboxUploadUrl(handle, dto.filename, dto.contentType, dto.fileSizeBytes)
  }

  // ── Public: confirm dropbox file after upload ───────────────────────────────

  @Post('public/cards/:handle/dropbox')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Confirm dropbox file after direct R2 upload' })
  async confirmDropboxFile(@Param('handle') handle: string, @Body() dto: ConfirmDropboxFileDto) {
    return this.inbox.confirmDropboxFile(
      handle,
      dto.senderName,
      dto.senderEmail,
      dto.fileName,
      dto.uploadToken,
    )
  }

  // ── Authenticated: inbox summary ────────────────────────────────────────────

  @Get('inbox')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all messages, voice notes, and files received across all cards' })
  async getInboxSummary(@CurrentUser() user: { id: string }) {
    return this.inbox.getInboxSummary(user.id)
  }

  // ── Authenticated: messages ─────────────────────────────────────────────────

  @Get('cards/:cardId/inbox/messages')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List messages received on a card' })
  async getMessages(
    @Param('cardId') cardId: string,
    @CurrentUser() user: { id: string },
    @Query() query: InboxListQueryDto,
  ) {
    return this.inbox.getMessages(cardId, user.id, query.cursor, query.limit ?? 30)
  }

  @Patch('inbox/messages/:id/read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a message as read' })
  async markMessageRead(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.inbox.markMessageRead(id, user.id)
  }

  @Delete('inbox/messages/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a message' })
  async deleteMessage(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    await this.inbox.deleteMessage(id, user.id)
    return { deleted: true } satisfies DeletedResponse
  }

  // ── Authenticated: voice notes ──────────────────────────────────────────────

  @Get('cards/:cardId/inbox/voice-notes')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List voice notes received on a card' })
  async getVoiceNotes(
    @Param('cardId') cardId: string,
    @CurrentUser() user: { id: string },
    @Query() query: InboxListQueryDto,
  ) {
    return this.inbox.getVoiceNotes(cardId, user.id, query.cursor, query.limit ?? 30)
  }

  @Patch('inbox/voice-notes/:id/read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a voice note as read' })
  async markVoiceNoteRead(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.inbox.markVoiceNoteRead(id, user.id)
  }

  @Delete('inbox/voice-notes/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a voice note' })
  async deleteVoiceNote(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    await this.inbox.deleteVoiceNote(id, user.id)
    return { deleted: true } satisfies DeletedResponse
  }

  // ── Authenticated: dropbox files ────────────────────────────────────────────

  @Get('cards/:cardId/inbox/dropbox')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List dropbox files received on a card' })
  async getDropboxFiles(
    @Param('cardId') cardId: string,
    @CurrentUser() user: { id: string },
    @Query() query: InboxListQueryDto,
  ) {
    return this.inbox.getDropboxFiles(cardId, user.id, query.cursor, query.limit ?? 30)
  }

  @Patch('inbox/dropbox/:id/read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a dropbox file as read' })
  async markDropboxFileRead(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.inbox.markDropboxFileRead(id, user.id)
  }

  @Delete('inbox/dropbox/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a dropbox file' })
  async deleteDropboxFile(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    await this.inbox.deleteDropboxFile(id, user.id)
    return { deleted: true } satisfies DeletedResponse
  }

  // ── Authenticated: meeting memories ────────────────────────────────────────

  @Get('contacts/:contactId/memories')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List meeting memories for a contact' })
  async getMemories(@Param('contactId') contactId: string, @CurrentUser() user: { id: string }) {
    return this.inbox.getMemories(contactId, user.id)
  }

  @Post('contacts/:contactId/memories')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a meeting memory for a contact' })
  async createMemory(
    @Param('contactId') contactId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateMemoryDto,
  ) {
    return this.inbox.createMemory(contactId, user.id, dto.content)
  }

  @Delete('contacts/:contactId/memories/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a meeting memory' })
  async deleteMemory(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    await this.inbox.deleteMemory(id, user.id)
    return { deleted: true } satisfies DeletedResponse
  }
}
