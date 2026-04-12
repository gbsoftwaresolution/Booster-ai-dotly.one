import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { IsEmail, IsEthereumAddress, IsOptional } from 'class-validator'
import { PrismaService } from '../prisma/prisma.service'
import { BoosterAiPartnerGuard } from './boosterai-partner.guard'
import { Public } from '../auth/decorators/public.decorator'

/**
 * Query params — at least one of email or walletAddress must be provided.
 * BoosterAI sends the applicant's email (from their signup form) and
 * optionally their wallet address if they have one on file in Dotly.
 */
class PartnerEligibilityQuery {
  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsEthereumAddress()
  walletAddress?: string
}

/**
 * Internal endpoint called by BoosterAI during partner registration.
 * Checks whether the applicant can be linked to a Dotly account.
 *
 * Protected by x-boosterai-api-key header (BoosterAiPartnerGuard).
 * NOT exposed to end users — only BoosterAI's backend calls this.
 *
 * Response shape:
 *   { eligible: true,  plan: 'PRO',  status: 'ACTIVE' }
 *   { eligible: true,  plan: 'FREE', status: 'NONE' }
 *   { eligible: false, reason: 'USER_NOT_FOUND' }
 */
@ApiTags('internal')
@Public()
@Controller('v1/internal/boosterai')
@UseGuards(BoosterAiPartnerGuard)
export class BoosterAiPartnerEligibilityController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('partner-eligibility')
  async checkEligibility(@Query() query: PartnerEligibilityQuery) {
    const { email, walletAddress } = query

    if (!email && !walletAddress) {
      return { eligible: false, reason: 'MISSING_IDENTIFIER' }
    }

    const normalizedEmail = email?.toLowerCase()
    const normalizedWallet = walletAddress?.toLowerCase()

    const [emailUser, walletUser] = await Promise.all([
      normalizedEmail
        ? this.prisma.user.findFirst({
            where: { email: normalizedEmail },
            select: { id: true, plan: true },
          })
        : Promise.resolve(null),
      normalizedWallet
        ? this.prisma.user.findFirst({
            where: { walletAddress: normalizedWallet },
            select: { id: true, plan: true },
          })
        : Promise.resolve(null),
    ])

    if (emailUser && walletUser && emailUser.id !== walletUser.id) {
      return { eligible: false, reason: 'IDENTIFIER_MISMATCH' }
    }

    const user = emailUser ?? walletUser

    if (!user) {
      return { eligible: false, reason: 'USER_NOT_FOUND' }
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { userId: user.id },
      select: { status: true, plan: true, currentPeriodEnd: true },
    })

    const isActive = subscription?.status === 'ACTIVE'
    const notExpired = !subscription?.currentPeriodEnd || subscription.currentPeriodEnd > new Date()

    return {
      eligible: true,
      plan: subscription?.plan ?? user.plan,
      status: isActive && notExpired ? subscription?.status ?? 'ACTIVE' : 'NONE',
    }
  }
}
