/**
 * BoosterAiPartnerGuard unit tests
 *
 * Verifies fail-closed behaviour, timing-safe comparison, and correct
 * key validation without spinning up a full NestJS application context.
 */
import { UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { BoosterAiPartnerGuard } from './boosterai-partner.guard'
import type { ExecutionContext } from '@nestjs/common'

function makeContext(headerValue: string | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: headerValue !== undefined ? { 'x-boosterai-api-key': headerValue } : {},
      }),
    }),
  } as unknown as ExecutionContext
}

function makeGuard(keyInEnv: string | undefined): BoosterAiPartnerGuard {
  const config = { get: () => keyInEnv } as unknown as ConfigService
  return new BoosterAiPartnerGuard(config)
}

describe('BoosterAiPartnerGuard', () => {
  const VALID_KEY = 'super-secret-key-abc123'

  it('allows request when header matches configured key', () => {
    const guard = makeGuard(VALID_KEY)
    expect(guard.canActivate(makeContext(VALID_KEY))).toBe(true)
  })

  it('denies when BOOSTERAI_DOTLY_API_KEY is not configured (fail-closed)', () => {
    const guard = makeGuard(undefined)
    expect(() => guard.canActivate(makeContext(VALID_KEY))).toThrow(UnauthorizedException)
  })

  it('denies when x-boosterai-api-key header is missing', () => {
    const guard = makeGuard(VALID_KEY)
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(UnauthorizedException)
  })

  it('denies when x-boosterai-api-key header is wrong', () => {
    const guard = makeGuard(VALID_KEY)
    expect(() => guard.canActivate(makeContext('wrong-key'))).toThrow(UnauthorizedException)
  })

  it('denies when key has correct prefix but different length', () => {
    const guard = makeGuard(VALID_KEY)
    expect(() => guard.canActivate(makeContext(VALID_KEY + 'x'))).toThrow(UnauthorizedException)
  })

  it('denies when key is empty string', () => {
    const guard = makeGuard(VALID_KEY)
    expect(() => guard.canActivate(makeContext(''))).toThrow(UnauthorizedException)
  })
})
