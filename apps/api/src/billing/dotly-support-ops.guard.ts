import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { timingSafeEqual } from 'crypto'
import type { Request } from 'express'

@Injectable()
export class DotlySupportOpsGuard implements CanActivate {
  private readonly expectedKey: string | undefined
  private readonly allowedEmails: Set<string>

  constructor(config: ConfigService) {
    this.expectedKey = config.get<string>('DOTLY_SUPPORT_OPS_KEY')
    this.allowedEmails = new Set(
      (config.get<string>('DOTLY_SUPPORT_OPS_EMAILS') ?? '')
        .split(',')
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean),
    )
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.expectedKey) {
      throw new UnauthorizedException('DOTLY_SUPPORT_OPS_KEY is not configured')
    }
    if (this.allowedEmails.size === 0) {
      throw new UnauthorizedException('DOTLY_SUPPORT_OPS_EMAILS is not configured')
    }

    const req = context.switchToHttp().getRequest<Request & { user?: { email?: string } }>()
    const provided = req.headers['x-dotly-support-ops-key']
    const email = req.user?.email?.trim().toLowerCase()

    if (!email || !this.allowedEmails.has(email)) {
      throw new UnauthorizedException('Support operator access is not allowed for this user')
    }

    if (!provided || typeof provided !== 'string') {
      throw new UnauthorizedException('Invalid or missing x-dotly-support-ops-key')
    }

    const expectedBuf = Buffer.from(this.expectedKey, 'utf8')
    const providedBuf = Buffer.from(provided, 'utf8')

    if (expectedBuf.length !== providedBuf.length || !timingSafeEqual(expectedBuf, providedBuf)) {
      throw new UnauthorizedException('Invalid or missing x-dotly-support-ops-key')
    }

    return true
  }
}
