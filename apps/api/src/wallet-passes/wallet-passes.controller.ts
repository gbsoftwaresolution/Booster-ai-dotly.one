import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { ThrottlerGuard, Throttle } from '@nestjs/throttler'
import type { Response } from 'express'
import { WalletPassesService } from './wallet-passes.service'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Public } from '../auth/decorators/public.decorator'

interface MaybeAuthUser {
  id?: string
}

@ApiTags('wallet-passes')
@Controller()
export class WalletPassesController {
  constructor(private readonly walletPassesService: WalletPassesService) {}

  // ─── Authenticated: generate for a card the user owns ────────────────────────

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download Apple Wallet .pkpass for a card (owner)' })
  @ApiResponse({ status: 200, description: '.pkpass binary' })
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Get('cards/:id/wallet/apple')
  async applePass(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Res() res: Response,
  ) {
    const buf = await this.walletPassesService.generateApplePass(id, user.id)
    res.setHeader('Content-Type', 'application/vnd.apple.pkpass')
    res.setHeader('Content-Disposition', `attachment; filename="dotly-card.pkpass"`)
    res.send(buf)
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Google Wallet "Save to Wallet" URL for a card (owner)' })
  @ApiResponse({ status: 200, description: '{ url: string }' })
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Get('cards/:id/wallet/google')
  async googlePassUrl(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    const url = await this.walletPassesService.generateGooglePassUrl(id, user.id)
    return { url }
  }

  // ─── Public: generate from handle (for public card page buttons) ─────────────

  @Public()
  @ApiOperation({ summary: 'Download Apple Wallet .pkpass for a published card (no auth)' })
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Get('public/cards/:handle/wallet/apple')
  async publicApplePass(
    @Param('handle') handle: string,
    @CurrentUser() user: MaybeAuthUser | undefined,
    @Res() res: Response,
  ) {
    const buf = await this.walletPassesService.getPublicPassForHandle(handle, user?.id ?? null)
    res.setHeader('Content-Type', 'application/vnd.apple.pkpass')
    res.setHeader('Content-Disposition', `attachment; filename="${handle}.pkpass"`)
    res.send(buf)
  }

  @Public()
  @ApiOperation({ summary: 'Get Google Wallet save URL for a published card (no auth)' })
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Get('public/cards/:handle/wallet/google')
  async publicGooglePassUrl(
    @Param('handle') handle: string,
    @CurrentUser() user: MaybeAuthUser | undefined,
  ) {
    const url = await this.walletPassesService.getPublicGooglePassUrlForHandle(
      handle,
      user?.id ?? null,
    )
    return { url }
  }
}
