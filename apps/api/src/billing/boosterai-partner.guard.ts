import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { timingSafeEqual } from 'crypto'
import type { Request } from 'express'

/**
 * Guards Dotly's internal endpoints that are called by BoosterAI.
 * Reads the `x-boosterai-api-key` header and compares it to the
 * `BOOSTERAI_DOTLY_API_KEY` env var.  Fail-closed: if the env var
 * is not set, all requests are denied.
 */
@Injectable()
export class BoosterAiPartnerGuard implements CanActivate {
  private readonly expectedKey: string | undefined

  constructor(config: ConfigService) {
    this.expectedKey = config.get<string>('BOOSTERAI_DOTLY_API_KEY')
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.expectedKey) {
      throw new UnauthorizedException('BOOSTERAI_DOTLY_API_KEY is not configured')
    }

    const req = context.switchToHttp().getRequest<Request>()
    const provided = req.headers['x-boosterai-api-key']

    if (!provided || typeof provided !== 'string') {
      throw new UnauthorizedException('Invalid or missing x-boosterai-api-key')
    }

    // H-11: Use timingSafeEqual to prevent timing-based side-channel attacks.
    // A plain string comparison (===) short-circuits on the first differing
    // character, leaking information about how many leading characters of the
    // key are correct.  An attacker can use this to brute-force the key one
    // character at a time.  timingSafeEqual always takes the same amount of
    // time regardless of how many characters match.
    // We must compare byte buffers of equal length; unequal lengths are
    // rejected immediately (still safe because length is not secret here —
    // all keys are the same length when correctly generated).
    const expectedBuf = Buffer.from(this.expectedKey, 'utf8')
    const providedBuf = Buffer.from(provided, 'utf8')

    if (expectedBuf.length !== providedBuf.length || !timingSafeEqual(expectedBuf, providedBuf)) {
      throw new UnauthorizedException('Invalid or missing x-boosterai-api-key')
    }

    return true
  }
}
