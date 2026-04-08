import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Patch,
  Param,
  Body,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Public } from '../auth/decorators/public.decorator'
import { TeamsService } from './teams.service'
import { IsString, IsOptional, IsEmail, IsIn, MaxLength, IsBoolean, IsObject } from 'class-validator'

class CreateTeamDto {
  // MED-05: Cap team name length to prevent unbounded DB storage and UI overflow.
  @IsString()
  @MaxLength(100)
  name!: string
}

class UpdateTeamDto {
  @IsOptional()
  @IsString()
  // MED-05: Same length cap on rename.
  @MaxLength(100)
  name?: string

  // HIGH-04: Add @IsObject so non-object values (numbers, strings, arrays)
  // are rejected at the DTO layer instead of reaching updateBrandConfig where
  // JSON.stringify would serialize them silently.
  @IsOptional()
  @IsObject()
  brandConfig?: Record<string, unknown>

  @IsOptional()
  @IsBoolean()
  brandLock?: boolean
}

class InviteMemberDto {
  @IsEmail()
  email!: string

  @IsOptional()
  @IsIn(['ADMIN', 'MEMBER'])
  role?: 'ADMIN' | 'MEMBER'
}

class AcceptInviteDto {
  @IsString()
  token!: string
}

class UpdateRoleDto {
  @IsIn(['ADMIN', 'MEMBER'])
  role!: 'ADMIN' | 'MEMBER'
}

class UpdateBrandDto {
  // HIGH-04: Same @IsObject guard on the dedicated brand endpoint.
  @IsOptional()
  @IsObject()
  brandConfig?: Record<string, unknown>

  @IsOptional()
  @IsBoolean()
  brandLock?: boolean
}

@ApiTags('teams')
@ApiBearerAuth()
@Controller('teams')
export class TeamsController {
  constructor(private teamsService: TeamsService) {}

  @Public()
  @Get('by-slug/:slug')
  @ApiOperation({ summary: 'Get team branding by slug (public, no auth)' })
  getTeamBySlug(@Param('slug') slug: string) {
    return this.teamsService.getTeamBySlug(slug)
  }

  @Post()
  @ApiOperation({ summary: 'Create a new team (Business+ plan required)' })
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateTeamDto) {
    return this.teamsService.createTeam(user.id, dto.name)
  }

  @Get('mine')
  @ApiOperation({ summary: 'Get the current user\'s team (first membership)' })
  getMyTeam(@CurrentUser() user: { id: string }) {
    return this.teamsService.getMyTeam(user.id)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get team details' })
  getTeam(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.teamsService.getTeam(id, user.id)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update team name or brand config' })
  updateTeam(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateTeamDto,
  ) {
    if (dto.brandConfig !== undefined || dto.brandLock !== undefined) {
      return this.teamsService.updateBrandConfig(id, user.id, dto.brandConfig ?? {}, dto.brandLock)
    }
    return this.teamsService.updateTeam(id, user.id, { name: dto.name })
  }

  @Put(':id/brand')
  @ApiOperation({ summary: 'Update team brand config' })
  updateBrand(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateBrandDto,
  ) {
    return this.teamsService.updateBrandConfig(id, user.id, dto.brandConfig ?? {}, dto.brandLock)
  }

  @Post(':id/invite')
  @ApiOperation({ summary: 'Send team invite email' })
  invite(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: InviteMemberDto,
  ) {
    return this.teamsService.inviteMember(id, user.id, dto.email, dto.role)
  }

  @Post('accept-invite')
  @ApiOperation({ summary: 'Accept a team invite by token' })
  acceptInvite(@CurrentUser() user: { id: string }, @Body() dto: AcceptInviteDto) {
    return this.teamsService.acceptInvite(dto.token, user.id)
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Remove a team member' })
  removeMember(
    @Param('id') teamId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.teamsService.removeMember(teamId, user.id, targetUserId)
  }

  @Patch(':id/members/:userId/role')
  @ApiOperation({ summary: 'Update a team member role' })
  updateRole(
    @Param('id') teamId: string,
    @Param('userId') targetUserId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateRoleDto,
  ) {
    return this.teamsService.updateMemberRole(teamId, user.id, targetUserId, dto.role)
  }
}
