import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { createPublicKey } from 'crypto'
import { UsersService } from '../../users/users.service'

export interface SupabaseJwtPayload {
  sub: string
  email: string
  role: string
  iat: number
  exp: number
}

/**
 * Derive a PEM public key from the Supabase ES256 JWK.
 * Supabase recently switched from HS256 shared secret to ES256 asymmetric
 * keys. The SUPABASE_JWT_SECRET env var should now contain the full JWK JSON
 * object (copy-pasted from Supabase → Project Settings → Data API → JWT Settings).
 *
 * Falls back to treating the value as a plain HS256 secret string if it is
 * not valid JSON, so existing deployments with the old shared secret continue
 * to work without changes.
 *
 * LOW-01: Returns { secretOrKey, algorithm } so the caller can pass the
 * correct algorithm to passport-jwt without accepting both ES256 *and* HS256
 * simultaneously.  Accepting both at once opens an algorithm-confusion attack:
 * an attacker who knows the EC public key can treat it as an HS256 secret and
 * forge a signature that the library will accept under the second algorithm.
 */
function resolveJwtKey(raw: string): { secretOrKey: string | Buffer; algorithm: 'ES256' | 'HS256' } {
  try {
    const jwk = JSON.parse(raw) as Record<string, unknown>
    if (jwk['kty'] === 'EC') {
      // Convert JWK → PEM so passport-jwt can use it for ES256 verification
      const key = createPublicKey({ key: jwk, format: 'jwk' })
      return {
        secretOrKey: key.export({ type: 'spki', format: 'pem' }) as Buffer,
        algorithm: 'ES256',
      }
    }
  } catch {
    // Not JSON — treat as plain HS256 secret string
  }
  return { secretOrKey: raw, algorithm: 'HS256' }
}

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy, 'supabase-jwt') {
  constructor(private readonly usersService: UsersService) {
    const raw = process.env.SUPABASE_JWT_SECRET
    if (!raw) {
      throw new Error('SUPABASE_JWT_SECRET environment variable is not set')
    }
    // LOW-01: Use only the algorithm that matches the key type.
    // Accepting both ES256 and HS256 simultaneously enables an
    // algorithm-confusion attack where a forged HS256 token is verified using
    // the EC public key treated as an HMAC secret.
    const { secretOrKey, algorithm } = resolveJwtKey(raw)
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey,
      ignoreExpiration: false,
      algorithms: [algorithm],
    })
  }

  /**
   * H-01/H-02: After verifying the JWT signature, resolve the Supabase UUID
   * (payload.sub) to the internal CUID stored in our database.
   *
   * Previously this returned { id: payload.sub } which used the Supabase UUID
   * as the user ID.  All downstream service calls do prisma.user.findUnique({
   * where: { id } }) against the `id` column which is a CUID — so those lookups
   * NEVER matched. Only GET /users/me worked because it called findOrCreate with
   * the supabaseId.
   *
   * Fix: call findOrCreate here so the req.user.id is always the DB primary key
   * (CUID). This makes every downstream ownership check correct.
   */
  async validate(payload: SupabaseJwtPayload): Promise<{ id: string; email: string }> {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token')
    }
    // findOrCreate is idempotent — on first login it creates the DB row, on
    // subsequent calls it returns the existing record.  Either way we get the
    // internal CUID back as `user.id`.
    const user = await this.usersService.findOrCreate(payload.sub, payload.email)
    return { id: user.id, email: user.email }
  }
}
