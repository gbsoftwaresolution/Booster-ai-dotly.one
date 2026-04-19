import { UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { ExecutionContext } from '@nestjs/common'
import { DotlySupportOpsGuard } from './dotly-support-ops.guard'

function makeContext(
  headerValue: string | undefined,
  email = 'support@example.com',
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: headerValue !== undefined ? { 'x-dotly-support-ops-key': headerValue } : {},
        user: { email },
      }),
    }),
  } as unknown as ExecutionContext
}

function makeGuard(
  keyInEnv: string | undefined,
  emails = 'support@example.com',
): DotlySupportOpsGuard {
  const config = {
    get: (key: string) => {
      if (key === 'DOTLY_SUPPORT_OPS_KEY') return keyInEnv
      if (key === 'DOTLY_SUPPORT_OPS_EMAILS') return emails
      return undefined
    },
  } as unknown as ConfigService
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

  it('denies when DOTLY_SUPPORT_OPS_EMAILS is not configured', () => {
    const guard = makeGuard(VALID_KEY, '')
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

  it('denies when signed-in user email is not allowlisted', () => {
    const guard = makeGuard(VALID_KEY)
    expect(() => guard.canActivate(makeContext(VALID_KEY, 'outsider@example.com'))).toThrow(
      UnauthorizedException,
    )
  })
})
