import { Controller, Post, Body, BadRequestException, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { Throttle } from '@nestjs/throttler'
import { AiService } from './ai.service'
import { ScanCardDto } from './scan-card.dto'
import { UserIdThrottlerGuard } from '../common/guards/user-id-throttler.guard'

// HIGH-06: Magic-byte signatures for allowed image MIME types.
// We re-validate here (controller layer) even though cards.service.ts already
// has a verifyMagicBytes helper, because scan-card does not go through the
// cards service — it receives raw base64 directly.
const SCAN_CARD_MAGIC: Record<string, { offset: number; bytes: number[] }[]> = {
  'image/jpeg': [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  'image/png': [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47] }],
  'image/webp': [{ offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }],
  'image/gif': [
    { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // GIF87a
    { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }, // GIF89a
  ],
}

function verifyMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const sigs = SCAN_CARD_MAGIC[mimeType]
  if (!sigs) return false
  return sigs.some(({ offset, bytes }) => bytes.every((b, i) => buffer[offset + i] === b))
}

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // HIGH-06 / L-5: Dedicated throttle — 5 requests per minute per authenticated user.
  // The global 100/min throttle is far too permissive for a GPT-4o vision call
  // which costs ~$0.01–0.05 per request.  At 100/min an attacker could run up
  // thousands of dollars of OpenAI costs in minutes.  5/min is generous for
  // legitimate card scanning (a user rarely scans more than 1–2 at a time).
  // UserIdThrottlerGuard keys the bucket by req.user.id so the limit is per
  // account, not per IP — preventing bypass via rotating IPs or shared NATs.
  @UseGuards(UserIdThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('scan-card')
  @ApiOperation({ summary: 'Scan a business card image and extract contact info (GPT-4o vision)' })
  scanCard(@Body() dto: ScanCardDto) {
    // HIGH-06: Validate actual image content against magic bytes.
    // The DTO @IsIn already restricts the declared mimeType to our allowlist,
    // but an attacker could declare mimeType="image/jpeg" and upload HTML/JS.
    // Decoding and checking the leading bytes prevents that.
    const buffer = Buffer.from(dto.base64Image, 'base64')
    if (!verifyMagicBytes(buffer, dto.mimeType)) {
      throw new BadRequestException(
        `File content does not match the declared MIME type "${dto.mimeType}"`,
      )
    }
    return this.aiService.scanBusinessCard(dto.base64Image, dto.mimeType)
  }
}
