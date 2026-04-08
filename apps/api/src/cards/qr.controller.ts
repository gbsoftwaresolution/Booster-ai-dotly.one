import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { IsOptional, IsHexColor, IsNumber, Min, Max } from 'class-validator'
import QRCode from 'qrcode'

class GenerateQrDto {
  @IsOptional()
  @IsHexColor()
  fgColor?: string

  @IsOptional()
  @IsHexColor()
  bgColor?: string

  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(1000)
  size?: number
}

@ApiTags('qr')
@ApiBearerAuth()
@Controller('cards')
export class QrController {
  private readonly webUrl: string

  // LOW-05: Use ConfigService instead of process.env.WEB_URL directly.
  // process.env reads bypass NestJS's validated config schema, meaning typos
  // or missing values silently produce `undefined` at runtime.  ConfigService
  // is backed by the validated env schema defined in env.validation.ts, so an
  // unset WEB_URL will be caught at startup rather than silently falling back
  // to a placeholder.
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.webUrl = this.config.get<string>('WEB_URL') ?? 'https://dotly.one'
  }

  @Post(':id/qr')
  @ApiOperation({ summary: 'Generate QR code for a card' })
  async generateQr(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: GenerateQrDto,
  ) {
    const card = await this.prisma.card.findUnique({ where: { id } })
    if (!card || card.userId !== user.id) throw new ForbiddenException()

    const shortUrl = `${this.webUrl}/card/${card.handle}`
    const fgColor = dto.fgColor ?? '#000000'
    const bgColor = dto.bgColor ?? '#ffffff'
    const size = dto.size ?? 400

    const svgData = await QRCode.toString(shortUrl, {
      type: 'svg',
      color: { dark: fgColor, light: bgColor },
      width: size,
    })
    const pngDataUrl = await QRCode.toDataURL(shortUrl, {
      color: { dark: fgColor, light: bgColor },
      width: size,
    })

    const styleConfig = { fgColor, bgColor, size }
    await this.prisma.qrCode.upsert({
      where: { cardId: id },
      create: { cardId: id, styleConfig, shortUrl },
      update: { styleConfig, shortUrl },
    })

    return { shortUrl, svgData, pngDataUrl }
  }

  @Get(':id/qr')
  @ApiOperation({ summary: 'Get existing QR code for a card' })
  async getQr(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    const card = await this.prisma.card.findUnique({ where: { id }, include: { qrCode: true } })
    if (!card || card.userId !== user.id) throw new ForbiddenException()
    if (!card.qrCode) throw new NotFoundException('QR code not yet generated')

    const config = card.qrCode.styleConfig as Record<string, unknown>
    const svgData = await QRCode.toString(card.qrCode.shortUrl, {
      type: 'svg',
      color: {
        dark: (config.fgColor as string | undefined) ?? '#000000',
        light: (config.bgColor as string | undefined) ?? '#ffffff',
      },
      width: (config.size as number | undefined) ?? 400,
    })
    return { ...card.qrCode, svgData }
  }
}
