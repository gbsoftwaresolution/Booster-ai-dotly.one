import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger'
import {
  IsString,
  MaxLength,
  IsOptional,
  Matches,
  Length,
  IsBoolean,
  IsEmail,
  MinLength,
} from 'class-validator'
import type { SuccessResponse } from '@dotly/types'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { UsersService } from './users.service'
import { AuthService } from '../auth/auth.service'

class SavePushTokenDto {
  @IsString()
  @MaxLength(500)
  pushToken!: string
}

class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string

  /** ISO 3166-1 alpha-2 country code, e.g. "US", "GB" */
  @IsString()
  @IsOptional()
  @Length(2, 2)
  @Matches(/^[A-Z]{2}$/, { message: 'country must be an ISO 3166-1 alpha-2 code (e.g. "US")' })
  country?: string

  /** IANA timezone identifier, e.g. "America/New_York" */
  @IsString()
  @IsOptional()
  @MaxLength(64)
  timezone?: string

  @IsBoolean()
  @IsOptional()
  notifLeadCaptured?: boolean

  @IsBoolean()
  @IsOptional()
  notifWeeklyDigest?: boolean

  @IsBoolean()
  @IsOptional()
  notifProductUpdates?: boolean
}

// HIGH-07: Require the user to explicitly confirm the irreversible deletion by
// passing confirm: true in the request body.  Without this gate any CSRF
// payload, mis-fired API call, or buggy client code permanently destroys the
// account with no safeguard.
class DeleteAccountDto {
  @IsString()
  confirm!: string
}

class ChangePasswordDto {
  @IsString()
  @MaxLength(200)
  currentPassword!: string

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  newPassword!: string

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  refreshToken?: string
}

class RequestEmailChangeDto {
  @IsEmail()
  newEmail!: string

  @IsString()
  @MaxLength(200)
  currentPassword!: string

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  refreshToken?: string
}

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  // Use findById so that a deleted account is not silently recreated.
  @Get('me')
  getMe(@CurrentUser() user: { id: string }) {
    return this.usersService.getMe(user.id)
  }

  @ApiOperation({ summary: 'Update display name, country, timezone and notification preferences' })
  @Patch('me')
  async updateMe(@CurrentUser() user: { id: string }, @Body() body: UpdateProfileDto) {
    const { name, country, timezone, notifLeadCaptured, notifWeeklyDigest, notifProductUpdates } =
      body
    if (
      name !== undefined ||
      country !== undefined ||
      timezone !== undefined ||
      notifLeadCaptured !== undefined ||
      notifWeeklyDigest !== undefined ||
      notifProductUpdates !== undefined
    ) {
      return this.usersService.updateProfile(user.id, {
        name,
        country,
        timezone,
        notifLeadCaptured,
        notifWeeklyDigest,
        notifProductUpdates,
      })
    }
    return this.usersService.findById(user.id)
  }

  @Patch('push-token')
  async savePushToken(
    @CurrentUser() user: { id: string },
    @Body() body: SavePushTokenDto,
  ): Promise<SuccessResponse> {
    await this.usersService.savePushToken(user.id, body.pushToken)
    return { success: true }
  }

  @Delete('push-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  async clearPushToken(@CurrentUser() user: { id: string }): Promise<void> {
    await this.usersService.clearPushToken(user.id)
  }

  @Patch('me/password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(@CurrentUser() user: { id: string }, @Body() body: ChangePasswordDto) {
    await this.authService.changePassword({
      userId: user.id,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
      refreshToken: body.refreshToken,
    })
  }

  @Post('me/email-change')
  @HttpCode(HttpStatus.NO_CONTENT)
  async requestEmailChange(
    @CurrentUser() user: { id: string },
    @Body() body: RequestEmailChangeDto,
  ) {
    await this.authService.requestEmailChange({
      userId: user.id,
      newEmail: body.newEmail,
      currentPassword: body.currentPassword,
      refreshToken: body.refreshToken,
    })
  }

  @ApiOperation({ summary: 'GDPR — export all user data as JSON' })
  @Get('me/export')
  exportData(@CurrentUser() user: { id: string }) {
    return this.usersService.exportUserData(user.id)
  }

  @ApiOperation({ summary: 'GDPR — right to erasure, permanently deletes account and all data' })
  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAccount(
    @CurrentUser() user: { id: string },
    @Body() body: DeleteAccountDto,
  ): Promise<void> {
    // HIGH-07: Require explicit confirmation string to prevent accidental or
    // CSRF-driven account deletion.  The client must send { "confirm": "DELETE MY ACCOUNT" }.
    if (body.confirm !== 'DELETE MY ACCOUNT') {
      throw new BadRequestException(
        'To delete your account, send { "confirm": "DELETE MY ACCOUNT" } in the request body',
      )
    }
    await this.usersService.deleteUserAccount(user.id)
  }
}
