import { Body, Controller, Get, NotFoundException, Param, Post, UseGuards } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { IsIn, IsInt } from 'class-validator'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import { Public } from '../auth/decorators/public.decorator'
import { SalesLinkService } from './sales-link.service'

class TrackClickDto {
  @IsIn(['whatsapp', 'booking', 'payment'])
  action!: 'whatsapp' | 'booking' | 'payment'

  @IsInt()
  timestamp!: number
}

@ApiTags('sales-link')
@Controller()
export class SalesLinkController {
  constructor(private readonly salesLinkService: SalesLinkService) {}

  @Public()
  @Get('public/:username')
  @ApiOperation({ summary: 'Get a public sales link profile by username' })
  async getPublicProfile(@Param('username') username: string) {
    const profile = await this.salesLinkService.getPublicProfile(username)
    if (!profile) {
      throw new NotFoundException('Profile not found')
    }
    return profile
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('track')
  @ApiOperation({ summary: 'Record a public sales link CTA click' })
  async trackClick(@Body() body: TrackClickDto) {
    await this.salesLinkService.trackClick(body.action)
    return { success: true }
  }
}
