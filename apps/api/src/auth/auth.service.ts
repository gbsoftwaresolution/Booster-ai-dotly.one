import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { createHash, createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'
import { EmailService } from '../email/email.service'
import { UsersService } from '../users/users.service'
import type { GoogleProfile } from './auth.types'

const ACCESS_TOKEN_TTL_SECONDS = 60 * 15
const REFRESH_TOKEN_TTL_DAYS = 30
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000
const EMAIL_TOKEN_TTL_MS = 60 * 60 * 1000
const RECENT_AUTH_WINDOW_MS = 24 * 60 * 60 * 1000
const PASSWORD_ITERATIONS = 210_000
const PASSWORD_KEYLEN = 64
const PASSWORD_DIGEST = 'sha512'
const RESET_TOKEN_BYTES = 32

interface SessionMeta {
  ipAddress?: string | null
  userAgent?: string | null
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly email: EmailService,
    private readonly usersService: UsersService,
  ) {}

  private get jwtSecret(): string {
    return this.config.getOrThrow<string>('AUTH_JWT_SECRET')
  }

  private get webUrl(): string {
    return this.config.getOrThrow<string>('WEB_URL').replace(/\/$/, '')
  }

  get publicWebUrl(): string {
    return this.webUrl
  }

  private get googleClientId(): string {
    return this.config.getOrThrow<string>('GOOGLE_AUTH_CLIENT_ID')
  }

  private get googleClientSecret(): string {
    return this.config.getOrThrow<string>('GOOGLE_AUTH_CLIENT_SECRET')
  }

  private get googleStateSecret(): string {
    return this.config.getOrThrow<string>('GOOGLE_AUTH_STATE_SECRET')
  }

  private get apiUrl(): string {
    return this.config.getOrThrow<string>('API_URL').replace(/\/$/, '')
  }

  private hashValue(value: string): string {
    return createHash('sha256').update(value).digest('hex')
  }

  private createOpaqueToken(): string {
    return randomBytes(32).toString('base64url')
  }

  private async findRecentSession(refreshToken: string | null | undefined) {
    if (!refreshToken) {
      throw new UnauthorizedException('Recent authentication is required.')
    }

    const session = await this.prisma.authSession.findFirst({
      where: {
        refreshTokenHash: this.hashValue(refreshToken),
        expiresAt: { gt: new Date() },
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    })

    if (!session || Date.now() - session.createdAt.getTime() > RECENT_AUTH_WINDOW_MS) {
      throw new UnauthorizedException('Recent authentication is required.')
    }

    return session
  }

  private async issueEmailVerification(user: { id: string; email: string; name: string | null }) {
    const rawToken = this.createOpaqueToken()
    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashValue(rawToken),
        expiresAt: new Date(Date.now() + EMAIL_TOKEN_TTL_MS),
      },
    })

    const verificationUrl = `${this.webUrl}/verify-email?token=${encodeURIComponent(rawToken)}`
    await this.email.sendEmailVerificationEmail(
      user.email,
      user.name ?? user.email.split('@')[0] ?? user.email,
      verificationUrl,
    )
  }

  private encodePassword(password: string): string {
    const salt = randomBytes(16).toString('hex')
    const derived = pbkdf2Sync(
      password,
      salt,
      PASSWORD_ITERATIONS,
      PASSWORD_KEYLEN,
      PASSWORD_DIGEST,
    )
    return [
      'pbkdf2',
      PASSWORD_DIGEST,
      String(PASSWORD_ITERATIONS),
      salt,
      derived.toString('hex'),
    ].join(':')
  }

  private verifyPassword(password: string, encoded: string | null | undefined): boolean {
    if (!encoded) return false
    const [scheme, digest, iterationsRaw, salt, expectedHex] = encoded.split(':')
    if (scheme !== 'pbkdf2' || !digest || !iterationsRaw || !salt || !expectedHex) return false
    const iterations = Number(iterationsRaw)
    if (!Number.isInteger(iterations) || iterations <= 0) return false

    const actual = pbkdf2Sync(password, salt, iterations, PASSWORD_KEYLEN, digest)
    const expected = Buffer.from(expectedHex, 'hex')
    return actual.length === expected.length && timingSafeEqual(actual, expected)
  }

  private signAccessToken(user: { id: string; email: string }): string {
    return this.jwt.sign(
      { sub: user.id, email: user.email, type: 'access' },
      { secret: this.jwtSecret, expiresIn: ACCESS_TOKEN_TTL_SECONDS },
    )
  }

  private async createSession(
    user: { id: string; email: string },
    meta?: SessionMeta,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const refreshToken = randomBytes(48).toString('base64url')
    await this.prisma.authSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: this.hashValue(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
        ipAddress: meta?.ipAddress ?? null,
        userAgent: meta?.userAgent ?? null,
      },
    })

    return {
      accessToken: this.signAccessToken(user),
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    }
  }

  async signUp(params: {
    email: string
    password: string
    name?: string
    meta?: SessionMeta
  }): Promise<{
    user: { id: string; email: string; name: string | null }
    accessToken: string | null
    refreshToken: string | null
    expiresIn: number | null
  }> {
    const email = params.email.trim().toLowerCase()
    if (params.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters.')
    }

    const existing = await this.prisma.user.findUnique({ where: { email } })
    if (existing) {
      throw new BadRequestException('An account with that email already exists.')
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        name: params.name?.trim() || null,
        passwordHash: this.encodePassword(params.password),
      },
      select: { id: true, email: true, name: true },
    })

    void this.email
      .sendWelcomeEmail(user.email, user.name ?? user.email.split('@')[0] ?? user.email)
      .catch((error) => {
        this.logger.warn(
          `Welcome email failed for ${user.email.replace(/^[^@]+/, '***')}: ${error instanceof Error ? error.message : String(error)}`,
        )
      })

    void this.issueEmailVerification(user).catch((error) => {
      this.logger.warn(
        `Verification email failed for ${user.email.replace(/^[^@]+/, '***')}: ${error instanceof Error ? error.message : String(error)}`,
      )
    })

    return {
      user,
      accessToken: null,
      refreshToken: null,
      expiresIn: null,
    }
  }

  async signIn(params: { email: string; password: string; meta?: SessionMeta }): Promise<{
    user: { id: string; email: string; name: string | null }
    accessToken: string
    refreshToken: string
    expiresIn: number
  }> {
    const email = params.email.trim().toLowerCase()
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, passwordHash: true, emailVerifiedAt: true },
    })

    if (!user || !this.verifyPassword(params.password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid email or password.')
    }

    if (!user.emailVerifiedAt) {
      throw new ForbiddenException({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Verify your email address before signing in.',
      })
    }

    const session = await this.createSession(user, params.meta)
    return {
      user: { id: user.id, email: user.email, name: user.name },
      ...session,
    }
  }

  async refreshSession(refreshToken: string, meta?: SessionMeta) {
    const session = await this.prisma.authSession.findFirst({
      where: {
        refreshTokenHash: this.hashValue(refreshToken),
        expiresAt: { gt: new Date() },
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    })

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token.')
    }

    const next = await this.createSession(session.user, meta)
    await this.prisma.authSession.delete({ where: { id: session.id } })

    return { user: session.user, ...next }
  }

  async signOut(refreshToken: string | null | undefined): Promise<void> {
    if (!refreshToken) return
    await this.prisma.authSession.deleteMany({
      where: { refreshTokenHash: this.hashValue(refreshToken) },
    })
  }

  async updatePasswordFromResetToken(token: string, password: string): Promise<void> {
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters.')
    }

    const record = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash: this.hashValue(token),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    })

    if (!record) {
      throw new BadRequestException('This password reset link is invalid or has expired.')
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: this.encodePassword(password) },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.authSession.deleteMany({ where: { userId: record.userId } }),
    ])

    const user = await this.prisma.user.findUnique({
      where: { id: record.userId },
      select: { email: true, name: true },
    })
    if (user) {
      await this.email.sendPasswordChangedEmail(
        user.email,
        user.name ?? user.email.split('@')[0] ?? user.email,
      )
    }
  }

  async sendPasswordResetEmail(emailInput: string, mobile = false): Promise<void> {
    const email = emailInput.trim().toLowerCase()
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    })
    if (!user) return

    const rawToken = randomBytes(RESET_TOKEN_BYTES).toString('base64url')
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashValue(rawToken),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      },
    })

    const path = mobile ? '/auth/mobile-reset' : '/reset-password'
    const resetUrl = `${this.webUrl}${path}?token=${encodeURIComponent(rawToken)}`

    await this.email.sendPasswordResetEmail(user.email, resetUrl)
  }

  private signGoogleState(payload: { next: string; mobile: boolean }): string {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const sig = createHmac('sha256', this.googleStateSecret).update(body).digest('base64url')
    return `${body}.${sig}`
  }

  private verifyGoogleState(state: string): { next: string; mobile: boolean } {
    const [body, sig] = state.split('.')
    if (!body || !sig) {
      throw new BadRequestException('Invalid Google sign-in state.')
    }
    const expected = createHmac('sha256', this.googleStateSecret).update(body).digest('base64url')
    const actualBuffer = Buffer.from(sig)
    const expectedBuffer = Buffer.from(expected)
    if (
      actualBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
      throw new BadRequestException('Invalid Google sign-in state.')
    }

    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString()) as {
      next?: string
      mobile?: boolean
    }
    return {
      next:
        typeof parsed.next === 'string' &&
        parsed.next.startsWith('/') &&
        !parsed.next.startsWith('//')
          ? parsed.next
          : '/onboarding',
      mobile: parsed.mobile === true,
    }
  }

  getGoogleSignInUrl(next = '/onboarding', mobile = false): string {
    const redirectUri = `${this.apiUrl}/auth/google/callback`
    const params = new URLSearchParams({
      client_id: this.googleClientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: ['openid', 'email', 'profile'].join(' '),
      prompt: 'select_account',
      state: this.signGoogleState({ next, mobile }),
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  }

  async exchangeGoogleCode(code: string): Promise<{ access_token: string; id_token?: string }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.googleClientId,
        client_secret: this.googleClientSecret,
        redirect_uri: `${this.apiUrl}/auth/google/callback`,
        grant_type: 'authorization_code',
      }).toString(),
    })

    if (!response.ok) {
      throw new BadRequestException('Failed to exchange Google authorization code.')
    }

    return response.json() as Promise<{ access_token: string; id_token?: string }>
  }

  async getGoogleProfile(accessToken: string): Promise<GoogleProfile> {
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!response.ok) {
      throw new BadRequestException('Failed to fetch Google profile.')
    }

    const profile = (await response.json()) as {
      id?: string
      email?: string
      name?: string
      picture?: string
    }

    if (!profile.id || !profile.email) {
      throw new BadRequestException('Google profile is missing required fields.')
    }

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
    }
  }

  async signInWithGoogle(profile: GoogleProfile, meta?: SessionMeta) {
    const email = profile.email.trim().toLowerCase()
    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId: profile.id }, { email }] },
      select: { id: true, email: true, name: true },
    })

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name: profile.name?.trim() || null,
          googleId: profile.id,
          avatarUrl: profile.picture ?? null,
          emailVerifiedAt: new Date(),
        },
        select: { id: true, email: true, name: true },
      })
      void this.email
        .sendWelcomeEmail(user.email, user.name ?? user.email.split('@')[0] ?? user.email)
        .catch(() => void 0)
    } else {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: profile.id,
          ...(profile.picture ? { avatarUrl: profile.picture } : {}),
          ...(user.name ? {} : { name: profile.name?.trim() || null }),
        },
      })
    }

    const session = await this.createSession(user, meta)
    return { user, ...session }
  }

  parseGoogleCallbackState(state: string) {
    return this.verifyGoogleState(state)
  }

  async validateAccessToken(token: string): Promise<{ id: string; email: string }> {
    try {
      const payload = await this.jwt.verifyAsync<{ sub?: string; email?: string; type?: string }>(
        token,
        {
          secret: this.jwtSecret,
        },
      )
      if (!payload.sub || !payload.email || payload.type !== 'access') {
        throw new UnauthorizedException('Invalid token')
      }

      const user = await this.usersService.findById(payload.sub)
      if (!user) {
        throw new UnauthorizedException('User not found')
      }

      return { id: user.id, email: user.email }
    } catch {
      throw new UnauthorizedException('Invalid token')
    }
  }

  async getUserByAccessToken(
    token: string,
  ): Promise<{ id: string; email: string; name: string | null; emailVerifiedAt: Date | null }> {
    const payload = await this.validateAccessToken(token)
    const user = await this.prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, name: true, emailVerifiedAt: true },
    })
    if (!user) {
      throw new UnauthorizedException('User not found')
    }
    return user
  }

  async verifyEmail(token: string): Promise<void> {
    const record = await this.prisma.emailVerificationToken.findFirst({
      where: {
        tokenHash: this.hashValue(token),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    })

    if (!record) {
      throw new BadRequestException('This verification link is invalid or has expired.')
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ])
  }

  async resendVerificationEmail(emailInput: string): Promise<void> {
    const email = emailInput.trim().toLowerCase()
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, emailVerifiedAt: true },
    })
    if (!user || user.emailVerifiedAt) return

    await this.issueEmailVerification(user)
  }

  async changePassword(params: {
    userId: string
    currentPassword: string
    newPassword: string
    refreshToken?: string | null
  }): Promise<void> {
    if (params.newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters.')
    }

    const user = await this.prisma.user.findUnique({
      where: { id: params.userId },
      select: { id: true, email: true, name: true, passwordHash: true },
    })
    if (!user || !this.verifyPassword(params.currentPassword, user.passwordHash)) {
      throw new UnauthorizedException('Current password is incorrect.')
    }

    await this.findRecentSession(params.refreshToken)

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: this.encodePassword(params.newPassword) },
      }),
      this.prisma.authSession.deleteMany({ where: { userId: user.id } }),
    ])

    await this.email.sendPasswordChangedEmail(
      user.email,
      user.name ?? user.email.split('@')[0] ?? user.email,
    )
  }

  async requestEmailChange(params: {
    userId: string
    newEmail: string
    currentPassword: string
    refreshToken?: string | null
  }): Promise<void> {
    const newEmail = params.newEmail.trim().toLowerCase()
    const user = await this.prisma.user.findUnique({
      where: { id: params.userId },
      select: { id: true, email: true, name: true, passwordHash: true },
    })

    if (!user || !this.verifyPassword(params.currentPassword, user.passwordHash)) {
      throw new UnauthorizedException('Current password is incorrect.')
    }
    if (user.email === newEmail) {
      throw new BadRequestException('Your new email must be different.')
    }

    await this.findRecentSession(params.refreshToken)

    const existing = await this.prisma.user.findUnique({
      where: { email: newEmail },
      select: { id: true },
    })
    if (existing) {
      throw new BadRequestException('An account with that email already exists.')
    }

    const rawToken = this.createOpaqueToken()
    await this.prisma.$transaction([
      this.prisma.pendingEmailChange.updateMany({
        where: { userId: user.id, verifiedAt: null, cancelledAt: null },
        data: { cancelledAt: new Date() },
      }),
      this.prisma.pendingEmailChange.create({
        data: {
          userId: user.id,
          newEmail,
          tokenHash: this.hashValue(rawToken),
          expiresAt: new Date(Date.now() + EMAIL_TOKEN_TTL_MS),
        },
      }),
    ])

    const verificationUrl = `${this.webUrl}/confirm-email-change?token=${encodeURIComponent(rawToken)}`
    await Promise.all([
      this.email.sendEmailChangeVerificationEmail(
        newEmail,
        user.name ?? user.email.split('@')[0] ?? user.email,
        verificationUrl,
      ),
      this.email.sendEmailChangeAlertEmail(
        user.email,
        user.name ?? user.email.split('@')[0] ?? user.email,
        newEmail,
      ),
    ])
  }

  async confirmEmailChange(token: string): Promise<void> {
    const record = await this.prisma.pendingEmailChange.findFirst({
      where: {
        tokenHash: this.hashValue(token),
        verifiedAt: null,
        cancelledAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    })

    if (!record) {
      throw new BadRequestException('This email change link is invalid or has expired.')
    }

    const emailInUse = await this.prisma.user.findUnique({
      where: { email: record.newEmail },
      select: { id: true },
    })
    if (emailInUse && emailInUse.id !== record.userId) {
      throw new BadRequestException('That email address is already in use.')
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { email: record.newEmail, emailVerifiedAt: new Date() },
      }),
      this.prisma.pendingEmailChange.update({
        where: { id: record.id },
        data: { verifiedAt: new Date() },
      }),
    ])

    await this.email.sendEmailChangedConfirmationEmail(
      record.newEmail,
      record.user.name ?? record.newEmail.split('@')[0] ?? record.newEmail,
    )
  }
}
