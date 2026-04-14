import { UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { ExecutionContext } from '@nestjs/common'
import { DotlySupportOpsGuard } from './dotly-support-ops.guard'

function makeContext(headerValue: string | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: headerValue !== undefined ? { 'x-dotly-support-ops-key': headerValue } : {},
      }),
    }),
  } as unknown as ExecutionContext
}

function makeGuard(keyInEnv: string | undefined): DotlySupportOpsGuard {
  const config = { get: () => keyInEnv } as unknown as ConfigService
  return new DotlySupportOpsGuard(config)
}

describe('DotlySupportOpsGuard', () => {
  const VALID_KEY = 'support-ops-secret-123'

  it('allows request when header matches configured key', () => {
    const guard = makeGuard(VALID_KEY)
    expect(guard.canActivate(makeContext(VALID_KEY))).toBe(true)
  })

  it('denies when DOTLY_SUPPORT_OPS_KEY is not configured', () => {
    const guard = makeGuard(undefined)
    expect(() => guard.canActivate(makeContext(VALID_KEY))).toThrow(UnauthorizedException)
  })

  it('denies when x-dotly-support-ops-key header is missing', () => {
    const guard = makeGuard(VALID_KEY)
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(UnauthorizedException)
  })

  it('denies when x-dotly-support-ops-key header is wrong', () => {
    const guard = makeGuard(VALID_KEY)
    expect(() => guard.canActivate(makeContext('wrong-key'))).toThrow(UnauthorizedException)
  })
})