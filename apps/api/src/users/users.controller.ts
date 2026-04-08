import { Controller, Get, Patch, Delete, Body, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common'
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger'
import { IsString, MaxLength, IsOptional } from 'class-validator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { UsersService } from './users.service'

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
}

// HIGH-07: Require the user to explicitly confirm the irreversible deletion by
// passing confirm: true in the request body.  Without this gate any CSRF
// payload, mis-fired API call, or buggy client code permanently destroys the
// account with no safeguard.
class DeleteAccountDto {
  @IsString()
  confirm!: string
}

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // HIGH-08: Use findById instead of findOrCreate so that a deleted account
  // is not silently recreated the next time an old JWT reaches this endpoint.
  // findOrCreate was required on first-login (handled by SupabaseStrategy.validate);
  // by the time /users/me is called the DB row MUST already exist.
  @Get('me')
  getMe(@CurrentUser() user: { id: string }) {
    return this.usersService.findById(user.id)
  }

  @ApiOperation({ summary: 'Update display name' })
  @Patch('me')
  async updateMe(
    @CurrentUser() user: { id: string },
    @Body() body: UpdateProfileDto,
  ) {
    if (body.name !== undefined) {
      return this.usersService.updateProfile(user.id, body.name)
    }
    return this.usersService.findById(user.id)
  }

  @Patch('push-token')
  async savePushToken(
    @CurrentUser() user: { id: string },
    @Body() body: SavePushTokenDto,
  ): Promise<{ ok: boolean }> {
    await this.usersService.savePushToken(user.id, body.pushToken)
    return { ok: true }
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
