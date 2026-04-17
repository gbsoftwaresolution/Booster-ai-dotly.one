import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common'
import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'
import type { Request, Response } from 'express'
import { Public } from './decorators/public.decorator'
import { AuthService } from './auth.service'

class SignUpDto {
  @IsString()
  @MaxLength(200)
  @IsOptional()
  name?: string

  @IsEmail()
  email!: string

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password!: string
}

class SignInDto {
  @IsEmail()
  email!: string

  @IsString()
  @MaxLength(200)
  password!: string
}

class RefreshDto {
  @IsString()
  @MaxLength(4000)
  refreshToken!: string
}

class ForgotPasswordDto {
  @IsEmail()
  email!: string

  @IsOptional()
  @IsBoolean()
  mobile?: boolean
}

class ResendVerificationDto {
  @IsEmail()
  email!: string
}

class ResetPasswordDto {
  @IsString()
  @MaxLength(4000)
  token!: string

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password!: string
}

class GoogleQueryDto {
  @IsOptional()
  @IsString()
  next?: string

  @IsOptional()
  @IsString()
  code?: string

  @IsOptional()
  @IsString()
  state?: string

  @IsOptional()
  @IsString()
  mobile?: string
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private getSessionMeta(req: Request) {
    return {
      ipAddress: req.ip ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    }
  }

  @Public()
  @Post('sign-up')
  async signUp(@Body() body: SignUpDto, @Req() req: Request) {
    return this.authService.signUp({ ...body, meta: this.getSessionMeta(req) })
  }

  @Public()
  @Post('sign-in')
  async signIn(@Body() body: SignInDto, @Req() req: Request) {
    return this.authService.signIn({ ...body, meta: this.getSessionMeta(req) })
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(@Body() body: RefreshDto, @Req() req: Request) {
    return this.authService.refreshSession(body.refreshToken, this.getSessionMeta(req))
  }

  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('sign-out')
  async signOut(@Body() body: Partial<RefreshDto>) {
    await this.authService.signOut(body.refreshToken)
  }

  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    await this.authService.sendPasswordResetEmail(body.email, body.mobile === true)
  }

  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    await this.authService.updatePasswordFromResetToken(body.token, body.password)
  }

  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('resend-verification')
  async resendVerification(@Body() body: ResendVerificationDto) {
    await this.authService.resendVerificationEmail(body.email)
  }

  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('verify-email')
  async verifyEmail(@Body() body: { token: string }) {
    await this.authService.verifyEmail(body.token)
  }

  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('confirm-email-change')
  async confirmEmailChange(@Body() body: { token: string }) {
    await this.authService.confirmEmailChange(body.token)
  }

  @Public()
  @Get('google')
  google(@Query() query: GoogleQueryDto, @Res() res: Response) {
    const next =
      typeof query.next === 'string' && query.next.startsWith('/') && !query.next.startsWith('//')
        ? query.next
        : '/onboarding'
    const mobile = query.mobile === 'true'
    return res.redirect(this.authService.getGoogleSignInUrl(next, mobile))
  }

  @Public()
  @Get('google/callback')
  async googleCallback(@Query() query: GoogleQueryDto, @Req() req: Request, @Res() res: Response) {
    if (!query.code || !query.state) {
      throw new BadRequestException('Missing Google callback parameters.')
    }

    const state = this.authService.parseGoogleCallbackState(query.state)
    const tokens = await this.authService.exchangeGoogleCode(query.code)
    const profile = await this.authService.getGoogleProfile(tokens.access_token)
    const session = await this.authService.signInWithGoogle(profile, this.getSessionMeta(req))

    const payload = encodeURIComponent(
      JSON.stringify({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        next: state.next,
      }),
    )

    if (state.mobile) {
      return res.redirect(`dotly://auth/callback?payload=${payload}`)
    }

    return res.redirect(`${this.authService.publicWebUrl}/auth/callback?payload=${payload}`)
  }
}
