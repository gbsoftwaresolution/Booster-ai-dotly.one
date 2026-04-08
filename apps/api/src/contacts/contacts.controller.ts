import { Controller, Post, Get, Put, Delete, Patch, Param, Body, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { ThrottlerGuard, Throttle } from '@nestjs/throttler'
import { Public } from '../auth/decorators/public.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { ContactsService } from './contacts.service'
import { IsString, IsOptional, IsEmail, IsArray, IsInt, Min, Max, MaxLength, ArrayMaxSize, IsUrl, IsIn } from 'class-validator'
import { Type } from 'class-transformer'
import { SendEmailDto } from './dto/send-email.dto'

class CreateLeadDto {
  // MED-03: Cap all string fields to prevent large string DoS on the public endpoint.
  @IsString()
  @MaxLength(200)
  name!: string

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string

  @IsString()
  @MaxLength(50)
  cardId!: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  sourceHandle?: string
}

class CreateContactDto {
  @IsString()
  @MaxLength(200)
  name!: string

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  company?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  website?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  sourceCardId?: string

  @IsOptional()
  @IsIn(['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED', 'LOST'])
  stage?: string
}

class UpdateContactDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string

  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  company?: string

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  website?: string

  // MED-04: Cap notes to prevent multi-megabyte note storage per contact.
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string

  // F-19: Add element-level validators on the tags array.
  // Without @IsString({ each: true }) and @MaxLength an attacker could pass
  // non-string elements or very long strings that bloat DB storage.
  // @ArrayMaxSize caps the total number of tags to prevent unbounded DB growth.
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  @ArrayMaxSize(50)
  tags?: string[]
}

class UpdateStageDto {
  @IsIn(['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED', 'LOST'])
  stage!: string
}

class AddNoteDto {
  // MED-04: Cap note content to prevent multi-megabyte notes stored via the
  // timeline endpoint.
  @IsString()
  @MaxLength(5000)
  content!: string
}

class PaginationQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  // F-09: Cap the limit to 200 to prevent unbounded queries.
  // Without @Max a caller could request limit=1000000 and exhaust DB resources.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number

  @IsOptional()
  @IsIn(['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED', 'LOST'])
  stage?: string

  @IsOptional()
  @IsString()
  search?: string
}

@ApiTags('contacts')
@Controller()
export class ContactsController {
  constructor(private contactsService: ContactsService) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('public/contacts')
  @ApiOperation({ summary: 'Create a contact from public lead capture form (no auth)' })
  createFromLead(@Body() dto: CreateLeadDto) {
    return this.contactsService.createFromLead(dto)
  }

  @ApiBearerAuth()
  @Post('contacts')
  @ApiOperation({ summary: 'Create a contact manually' })
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateContactDto) {
    return this.contactsService.create(user.id, dto)
  }

  @ApiBearerAuth()
  @Get('contacts')
  @ApiOperation({ summary: 'List all contacts for the authenticated user (paginated)' })
  findAll(@CurrentUser() user: { id: string }, @Query() query: PaginationQuery) {
    return this.contactsService.findAll(user.id, {
      stage: query.stage,
      search: query.search,
      page: query.page,
      limit: query.limit,
    })
  }

  @ApiBearerAuth()
  @Get('contacts/:id')
  @ApiOperation({ summary: 'Get a single contact' })
  findOne(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.contactsService.findOne(id, user.id)
  }

  @ApiBearerAuth()
  @Put('contacts/:id')
  @ApiOperation({ summary: 'Update a contact' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactsService.update(id, user.id, dto)
  }

  @ApiBearerAuth()
  @Delete('contacts/:id')
  @ApiOperation({ summary: 'Delete a contact' })
  remove(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.contactsService.remove(id, user.id)
  }

  @ApiBearerAuth()
  @Patch('contacts/:id/stage')
  @ApiOperation({ summary: 'Update CRM stage for a contact' })
  updateStage(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateStageDto,
  ) {
    return this.contactsService.updateStage(id, user.id, dto.stage)
  }

  @ApiBearerAuth()
  @Post('contacts/:id/notes')
  @ApiOperation({ summary: 'Add a note to a contact' })
  addNote(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: AddNoteDto,
  ) {
    return this.contactsService.addNote(id, user.id, dto.content)
  }

  @ApiBearerAuth()
  @Get('contacts/:id/timeline')
  @ApiOperation({ summary: 'Get timeline events for a contact' })
  getTimeline(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.contactsService.getTimeline(id, user.id)
  }

  // F-03: Rate-limit the CRM send-email endpoint at the HTTP layer via
  // @Throttle in addition to the Redis-backed per-user 20/hour limit in the
  // service. The @Throttle here catches burst spamming (10 req/min) before
  // the service layer is even reached, reducing Redis/DB pressure.
  @ApiBearerAuth()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('contacts/:id/send-email')
  @ApiOperation({ summary: 'Send a direct email to a contact from CRM' })
  sendEmail(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: SendEmailDto,
  ) {
    return this.contactsService.sendEmailToContact(user.id, id, dto.subject, dto.body)
  }

  // MED-14: Rate-limit the enrich endpoint to prevent AI cost amplification.
  // Without throttling, an authenticated user could trigger hundreds of OpenAI
  // enrichment jobs per minute by cycling through contact IDs.
  @ApiBearerAuth()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('contacts/:id/enrich')
  @ApiOperation({ summary: 'Manually trigger AI enrichment for a contact' })
  triggerEnrichment(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.contactsService.triggerEnrichment(id, user.id)
  }

  @ApiBearerAuth()
  @Get('crm/pipeline')
  @ApiOperation({ summary: 'Get CRM pipeline grouped by stage' })
  getPipeline(@CurrentUser() user: { id: string }) {
    return this.contactsService.getPipeline(user.id)
  }
}
