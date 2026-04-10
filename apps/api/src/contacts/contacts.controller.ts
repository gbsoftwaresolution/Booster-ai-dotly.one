import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Res,
  BadRequestException,
} from '@nestjs/common'
import type { Response } from 'express'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { ThrottlerGuard, Throttle } from '@nestjs/throttler'
import { Public } from '../auth/decorators/public.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { ContactsService } from './contacts.service'
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEmail,
  IsArray,
  IsInt,
  Min,
  Max,
  MaxLength,
  ArrayMaxSize,
  IsUrl,
  IsIn,
  IsObject,
  IsBoolean,
  IsNumber,
  IsDateString,
  MinLength,
} from 'class-validator'
import { Type, Transform } from 'class-transformer'
import { SendEmailDto } from './dto/send-email.dto'

// Minimal RFC-4180 CSV parser — no external deps needed.
function splitCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else if (ch !== undefined) {
      current += ch
    }
  }
  result.push(current)
  return result
}

function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  if (lines.length < 2) return []
  const firstLine = lines[0]
  if (!firstLine) return []
  const headers = splitCSVLine(firstLine)
  const rows: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]?.trim()
    if (!line) continue
    const values = splitCSVLine(line)
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] ?? '').trim()
    })
    rows.push(row)
  }
  return rows
}

class CreateLeadDto {
  // MED-03: Cap all string fields to prevent large string DoS on the public endpoint.
  // C1: Make name optional — custom forms may not use a "Name" field label;
  // the service will extract the name from the `fields` mapping if absent.
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

  @IsString()
  @MaxLength(50)
  cardId!: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  sourceHandle?: string

  // Custom lead form field values keyed by normalised label.
  // Accepted and forwarded to the service but not persisted until
  // LeadSubmission storage is implemented (see schema.prisma TODO).
  @IsOptional()
  @IsObject()
  fields?: Record<string, string>
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
  @MaxLength(500)
  address?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  sourceCardId?: string

  @IsOptional()
  @IsIn(['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED', 'LOST'])
  stage?: string

  // MED-04: Cap notes to prevent multi-megabyte note storage per contact.
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  @ArrayMaxSize(50)
  tags?: string[]
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

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string

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

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tag?: string
}

class PipelineQuery {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string
}

class BulkStageDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(500)
  ids!: string[]

  @IsIn(['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED', 'LOST'])
  stage!: string
}

class BulkDeleteDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(500)
  ids!: string[]
}

class LeadSubmissionsQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string
}

// Gap 1: Threaded Notes
class CreateNoteDto {
  @IsString()
  @MaxLength(10000)
  content!: string
}

class UpdateNoteDto {
  @IsString()
  @MaxLength(10000)
  content!: string
}

// Gap 2: Custom Fields
class CreateCustomFieldDto {
  @IsString()
  @MaxLength(100)
  label!: string

  @IsOptional()
  @IsIn(['TEXT', 'NUMBER', 'DATE', 'URL', 'SELECT'])
  fieldType?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[]

  @IsOptional()
  @IsInt()
  displayOrder?: number
}

// PATCH uses a fully-optional version of the create DTO so callers can update
// just the label, just the options, or just the display order without having to
// re-supply all fields.  Using CreateCustomFieldDto here would fail validation
// because `label` is required (@IsString() with no @IsOptional()).
class UpdateCustomFieldDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string

  @IsOptional()
  @IsIn(['TEXT', 'NUMBER', 'DATE', 'URL', 'SELECT'])
  fieldType?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[]

  @IsOptional()
  @IsInt()
  displayOrder?: number
}

class SetCustomFieldValueDto {
  @IsString()
  @MaxLength(2000)
  value!: string
}

// Gap 3 + 13: Deals
class CreateDealDto {
  @IsString()
  @MaxLength(300)
  title!: string

  @IsOptional()
  @IsNumber()
  value?: number

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string

  @IsOptional()
  @IsIn(['PROSPECT', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'])
  stage?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  probability?: number

  @IsOptional()
  @IsDateString()
  closeDate?: string

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string
}

class UpdateDealDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string

  @IsOptional()
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'value must be a non-negative number' },
  )
  @Min(0)
  value?: number | null

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string

  @IsOptional()
  @IsIn(['PROSPECT', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'])
  stage?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  probability?: number | null

  @IsOptional()
  @IsDateString({}, { message: 'closeDate must be an ISO 8601 date string' })
  closeDate?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string
}

// Gap 6: Email Templates
class CreateEmailTemplateDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(200)
  name!: string

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(998)
  subject!: string

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50000)
  body!: string
}

class UpdateEmailTemplateDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(200)
  name?: string

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(998)
  subject?: string

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50000)
  body?: string
}

// Gap 7: Tasks
class CreateTaskDto {
  @IsString()
  @MaxLength(500)
  title!: string

  @IsOptional()
  @IsDateString()
  dueAt?: string

  @IsOptional()
  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: string

  @IsOptional()
  @IsString()
  @IsIn(['CALL', 'EMAIL', 'MEETING', 'TODO', 'FOLLOW_UP'])
  type?: string
}

class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  title?: string

  @IsOptional()
  @IsDateString({}, { message: 'dueAt must be an ISO 8601 date string' })
  dueAt?: string | null

  @IsOptional()
  @IsBoolean()
  completed?: boolean

  @IsOptional()
  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  priority?: string

  @IsOptional()
  @IsString()
  @IsIn(['CALL', 'EMAIL', 'MEETING', 'TODO', 'FOLLOW_UP'])
  type?: string
}

class TasksQuery {
  @IsOptional()
  @IsBoolean()
  // @Type(() => Boolean) would coerce the string "false" → true because any
  // non-empty string is truthy.  Use @Transform to parse the raw string value.
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true
    if (value === 'false') return false
    return value
  })
  completed?: boolean
}

// Gap 10: Funnel analytics query
class FunnelAnalyticsQuery {
  @IsOptional()
  @IsDateString()
  dateFrom?: string

  @IsOptional()
  @IsDateString()
  dateTo?: string
}

// Gap 9: Merge
class MergeContactDto {
  @IsString()
  duplicateId!: string
}

// Gap 12: Bulk edit fields
class BulkUpdateFieldsDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(500)
  ids!: string[]

  @IsOptional()
  @IsString()
  @MaxLength(500)
  company?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  @ArrayMaxSize(50)
  tags?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  @ArrayMaxSize(50)
  tagsAdd?: string[]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  @ArrayMaxSize(50)
  tagsRemove?: string[]
}

// Gap 11: Multi-Pipeline DTOs
class CreatePipelineDto {
  @IsString()
  @MaxLength(200)
  name!: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  @ArrayMaxSize(20)
  stages?: string[]

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean
}

class UpdatePipelineDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  @ArrayMaxSize(20)
  stages?: string[]

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean

  @IsOptional()
  @IsObject()
  stageColors?: Record<string, string>
}

class AssignPipelineDto {
  @IsOptional()
  @IsString()
  pipelineId?: string | null

  @IsOptional()
  @IsString()
  @MaxLength(100)
  stage?: string
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
      tag: query.tag,
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
  getPipeline(@CurrentUser() user: { id: string }, @Query() query: PipelineQuery) {
    return this.contactsService.getPipeline(user.id, { search: query.search })
  }

  // M1: Real bulk stage update — single DB transaction instead of N individual requests.
  @ApiBearerAuth()
  @Patch('contacts/bulk-stage')
  @ApiOperation({ summary: 'Update CRM stage for multiple contacts at once' })
  bulkUpdateStage(@CurrentUser() user: { id: string }, @Body() dto: BulkStageDto) {
    return this.contactsService.bulkUpdateStage(user.id, dto.ids, dto.stage)
  }

  // M1: Real bulk delete — single DB transaction instead of N individual requests.
  @ApiBearerAuth()
  @Delete('contacts/bulk')
  @ApiOperation({ summary: 'Delete multiple contacts at once' })
  bulkDelete(@CurrentUser() user: { id: string }, @Body() dto: BulkDeleteDto) {
    return this.contactsService.bulkDelete(user.id, dto.ids)
  }

  // H1: Lead submissions list for a card — shows all LeadSubmission records
  // with associated answers, contact info, and submission timestamp.
  @ApiBearerAuth()
  @Get('lead-submissions')
  @ApiOperation({ summary: 'List lead form submissions for a card' })
  getLeadSubmissions(
    @CurrentUser() user: { id: string },
    @Query('cardId') cardId: string,
    @Query() query: LeadSubmissionsQuery,
  ) {
    return this.contactsService.getLeadSubmissions(user.id, cardId, {
      page: query.page,
      limit: query.limit,
      search: query.search,
    })
  }

  @ApiBearerAuth()
  @Delete('lead-submissions/:id')
  @ApiOperation({ summary: 'Delete a lead submission' })
  deleteLeadSubmission(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.contactsService.deleteLeadSubmission(id, user.id)
  }

  // ─── Gap 1: Threaded Notes ─────────────────────────────────────────────────

  @ApiBearerAuth()
  @Post('contacts/:id/notes')
  @ApiOperation({ summary: 'Create a threaded note on a contact' })
  createNote(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateNoteDto,
  ) {
    return this.contactsService.createNote(id, user.id, dto.content)
  }

  @ApiBearerAuth()
  @Get('contacts/:id/notes')
  @ApiOperation({ summary: 'List all notes on a contact' })
  getNotes(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.contactsService.getNotes(id, user.id)
  }

  @ApiBearerAuth()
  @Patch('contacts/:contactId/notes/:noteId')
  @ApiOperation({ summary: 'Update a note' })
  updateNote(
    @Param('noteId') noteId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateNoteDto,
  ) {
    return this.contactsService.updateNote(noteId, user.id, dto.content)
  }

  @ApiBearerAuth()
  @Delete('contacts/:contactId/notes/:noteId')
  @ApiOperation({ summary: 'Delete a note' })
  deleteNote(@Param('noteId') noteId: string, @CurrentUser() user: { id: string }) {
    return this.contactsService.deleteNote(noteId, user.id)
  }

  // ─── Gap 2: Custom Fields ──────────────────────────────────────────────────

  @ApiBearerAuth()
  @Get('crm/custom-fields')
  @ApiOperation({ summary: 'List custom field definitions for the user' })
  getCustomFields(@CurrentUser() user: { id: string }) {
    return this.contactsService.getCustomFields(user.id)
  }

  @ApiBearerAuth()
  @Post('crm/custom-fields')
  @ApiOperation({ summary: 'Create a custom field definition' })
  createCustomField(@CurrentUser() user: { id: string }, @Body() dto: CreateCustomFieldDto) {
    return this.contactsService.createCustomField(user.id, dto)
  }

  @ApiBearerAuth()
  @Patch('crm/custom-fields/:fieldId')
  @ApiOperation({ summary: 'Update a custom field definition' })
  updateCustomField(
    @Param('fieldId') fieldId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateCustomFieldDto,
  ) {
    return this.contactsService.updateCustomField(fieldId, user.id, dto)
  }

  @ApiBearerAuth()
  @Delete('crm/custom-fields/:fieldId')
  @ApiOperation({ summary: 'Delete a custom field definition' })
  deleteCustomField(@Param('fieldId') fieldId: string, @CurrentUser() user: { id: string }) {
    return this.contactsService.deleteCustomField(fieldId, user.id)
  }

  @ApiBearerAuth()
  @Put('contacts/:id/custom-fields/:fieldId')
  @ApiOperation({ summary: 'Set a custom field value on a contact' })
  setCustomFieldValue(
    @Param('id') contactId: string,
    @Param('fieldId') fieldId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: SetCustomFieldValueDto,
  ) {
    return this.contactsService.setCustomFieldValue(contactId, user.id, fieldId, dto.value)
  }

  // ─── Gap 3 + 13: Deals ────────────────────────────────────────────────────

  @ApiBearerAuth()
  @Post('contacts/:id/deals')
  @ApiOperation({ summary: 'Create a deal for a contact' })
  createDeal(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateDealDto,
  ) {
    return this.contactsService.createDeal(id, user.id, dto)
  }

  @ApiBearerAuth()
  @Get('contacts/:id/deals')
  @ApiOperation({ summary: 'Get all deals for a contact' })
  getDeals(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.contactsService.getDeals(id, user.id)
  }

  @ApiBearerAuth()
  @Get('deals')
  @ApiOperation({ summary: 'Get all deals for the authenticated user' })
  getAllDeals(@CurrentUser() user: { id: string }) {
    return this.contactsService.getAllDeals(user.id)
  }

  @ApiBearerAuth()
  @Patch('deals/:dealId')
  @ApiOperation({ summary: 'Update a deal' })
  updateDeal(
    @Param('dealId') dealId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateDealDto,
  ) {
    return this.contactsService.updateDeal(dealId, user.id, dto)
  }

  @ApiBearerAuth()
  @Delete('deals/:dealId')
  @ApiOperation({ summary: 'Delete a deal' })
  deleteDeal(@Param('dealId') dealId: string, @CurrentUser() user: { id: string }) {
    return this.contactsService.deleteDeal(dealId, user.id)
  }

  // ─── Gap 4: CSV Import ────────────────────────────────────────────────────

  @ApiBearerAuth()
  @Post('contacts/import')
  @ApiOperation({
    summary: 'Import contacts from CSV text (Content-Type: application/json, field: csv)',
  })
  importContacts(@CurrentUser() user: { id: string }, @Body('csv') csvText: string) {
    // Cap CSV payload at 1 MB (~10,000 contacts) to prevent memory exhaustion.
    // NestJS's body-parser default limit is 100 KB; we explicitly enforce 1 MB
    // here as a second line of defence so the check travels with the handler.
    const MAX_CSV_BYTES = 1_048_576 // 1 MB
    if (!csvText || typeof csvText !== 'string') {
      throw new BadRequestException('csv field is required')
    }
    if (Buffer.byteLength(csvText, 'utf8') > MAX_CSV_BYTES) {
      throw new BadRequestException('CSV payload exceeds 1 MB limit')
    }
    const rows = parseCSV(csvText)
    return this.contactsService.importContacts(user.id, rows)
  }

  // ─── Contact Tags ─────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @Get('contacts/tags')
  @ApiOperation({
    summary: 'Get all distinct tags used across contacts for the authenticated user',
  })
  getContactTags(@CurrentUser() user: { id: string }) {
    return this.contactsService.getAllTags(user.id)
  }

  // ─── Contact Export (CSV) ─────────────────────────────────────────────────

  @ApiBearerAuth()
  @Get('contacts/export')
  @ApiOperation({ summary: 'Export contacts as CSV — supports cardId, from, to filters' })
  async exportContacts(
    @CurrentUser() user: { id: string },
    @Res() res: Response,
    @Query('cardId') cardId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const result = await this.contactsService.exportContacts(user.id, { cardId, from, to })
    const filename = `contacts-${new Date().toISOString().slice(0, 10)}.csv`
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('Cache-Control', 'no-store')
    if (result.truncated) {
      res.setHeader('X-Export-Truncated', 'true')
      res.setHeader('X-Export-Row-Count', String(result.total))
    }
    res.end('\uFEFF' + result.csv) // BOM for Excel compatibility
  }

  // ─── Contact Email History ────────────────────────────────────────────────

  @ApiBearerAuth()
  @Get('contacts/:id/emails')
  @ApiOperation({ summary: 'Get sent email history for a contact' })
  getContactEmails(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.contactsService.getContactEmails(id, user.id)
  }

  // ─── Gap 5: Email tracking public endpoints ───────────────────────────────

  @Public()
  @Get('track/open/:token')
  @ApiOperation({ summary: 'Track email open (1x1 pixel)' })
  async trackOpen(@Param('token') token: string, @Res() res: Response) {
    // Fire-and-forget — don't block the pixel response on DB latency
    void this.contactsService.recordEmailOpen(token).catch(() => void 0)
    // 1×1 transparent GIF (GIF87a binary)
    const gif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
    res.setHeader('Content-Type', 'image/gif')
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    res.setHeader('Content-Length', String(gif.length))
    res.end(gif)
  }

  @Public()
  @Get('track/click/:token')
  @ApiOperation({ summary: 'Track email link click and redirect' })
  async trackClick(@Param('token') token: string, @Query('url') url: string, @Res() res: Response) {
    // Fire-and-forget
    void this.contactsService.recordEmailClick(token).catch(() => void 0)
    // Only redirect to http/https URLs — reject anything else to prevent open redirect abuse
    let destination = '/'
    try {
      const parsed = new URL(url)
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        destination = url
      }
    } catch {
      // invalid URL — fall back to home
    }
    res.redirect(302, destination)
  }

  // ─── Gap 6: Email Templates ───────────────────────────────────────────────

  @ApiBearerAuth()
  @Post('email-templates')
  @ApiOperation({ summary: 'Create an email template' })
  createEmailTemplate(@CurrentUser() user: { id: string }, @Body() dto: CreateEmailTemplateDto) {
    return this.contactsService.createEmailTemplate(user.id, dto)
  }

  @ApiBearerAuth()
  @Get('email-templates')
  @ApiOperation({ summary: 'List all email templates for the user' })
  getEmailTemplates(@CurrentUser() user: { id: string }) {
    return this.contactsService.getEmailTemplates(user.id)
  }

  @ApiBearerAuth()
  @Patch('email-templates/:templateId')
  @ApiOperation({ summary: 'Update an email template' })
  updateEmailTemplate(
    @Param('templateId') templateId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateEmailTemplateDto,
  ) {
    return this.contactsService.updateEmailTemplate(templateId, user.id, dto)
  }

  @ApiBearerAuth()
  @Delete('email-templates/:templateId')
  @ApiOperation({ summary: 'Delete an email template' })
  deleteEmailTemplate(
    @Param('templateId') templateId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.contactsService.deleteEmailTemplate(templateId, user.id)
  }

  // ─── Gap 7: Tasks ─────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @Post('contacts/:id/tasks')
  @ApiOperation({ summary: 'Create a task for a contact' })
  createTask(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateTaskDto,
  ) {
    return this.contactsService.createTask(id, user.id, dto)
  }

  @ApiBearerAuth()
  @Get('contacts/:id/tasks')
  @ApiOperation({ summary: 'Get all tasks for a contact' })
  getTasks(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.contactsService.getTasks(id, user.id)
  }

  @ApiBearerAuth()
  @Get('tasks')
  @ApiOperation({ summary: 'Get all tasks for the authenticated user' })
  getAllTasks(@CurrentUser() user: { id: string }, @Query() query: TasksQuery) {
    return this.contactsService.getAllTasks(user.id, { completed: query.completed })
  }

  @ApiBearerAuth()
  @Patch('tasks/:taskId')
  @ApiOperation({ summary: 'Update a task' })
  updateTask(
    @Param('taskId') taskId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateTaskDto,
  ) {
    return this.contactsService.updateTask(taskId, user.id, dto)
  }

  @ApiBearerAuth()
  @Delete('tasks/:taskId')
  @ApiOperation({ summary: 'Delete a task' })
  deleteTask(@Param('taskId') taskId: string, @CurrentUser() user: { id: string }) {
    return this.contactsService.deleteTask(taskId, user.id)
  }

  // ─── Gap 9: Duplicate Merge ───────────────────────────────────────────────

  @ApiBearerAuth()
  @Post('contacts/:id/merge')
  @ApiOperation({ summary: 'Merge a duplicate contact into this contact' })
  mergeContacts(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: MergeContactDto,
  ) {
    return this.contactsService.mergeContacts(id, dto.duplicateId, user.id)
  }

  @ApiBearerAuth()
  @Get('crm/duplicates')
  @ApiOperation({ summary: 'Find potential duplicate contacts' })
  findDuplicates(@CurrentUser() user: { id: string }) {
    return this.contactsService.findDuplicates(user.id)
  }

  // ─── Gap 10: Funnel Analytics ─────────────────────────────────────────────

  @ApiBearerAuth()
  @Get('crm/analytics/funnel')
  @ApiOperation({
    summary: 'Get stage conversion funnel analytics (supports dateFrom/dateTo query params)',
  })
  getFunnelAnalytics(@CurrentUser() user: { id: string }, @Query() query: FunnelAnalyticsQuery) {
    return this.contactsService.getFunnelAnalytics(user.id, {
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    })
  }

  // ─── Gap 12: Bulk Edit Fields ─────────────────────────────────────────────

  @ApiBearerAuth()
  @Patch('contacts/bulk-update')
  @ApiOperation({ summary: 'Bulk update arbitrary fields on multiple contacts' })
  bulkUpdateFields(@CurrentUser() user: { id: string }, @Body() dto: BulkUpdateFieldsDto) {
    return this.contactsService.bulkUpdateFields(user.id, dto.ids, {
      company: dto.company,
      tags: dto.tags,
      tagsAdd: dto.tagsAdd,
      tagsRemove: dto.tagsRemove,
    })
  }

  // ─── Gap 11: Multi-Pipeline ───────────────────────────────────────────────

  @ApiBearerAuth()
  @Get('pipelines')
  @ApiOperation({ summary: 'List all pipelines for the user' })
  getPipelines(@CurrentUser() user: { id: string }) {
    return this.contactsService.getPipelines(user.id)
  }

  @ApiBearerAuth()
  @Post('pipelines')
  @ApiOperation({ summary: 'Create a new pipeline' })
  createPipeline(@CurrentUser() user: { id: string }, @Body() dto: CreatePipelineDto) {
    return this.contactsService.createPipeline(user.id, dto)
  }

  @ApiBearerAuth()
  @Patch('pipelines/:pipelineId')
  @ApiOperation({ summary: 'Update a pipeline' })
  updatePipeline(
    @Param('pipelineId') pipelineId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdatePipelineDto,
  ) {
    return this.contactsService.updatePipeline(pipelineId, user.id, dto)
  }

  @ApiBearerAuth()
  @Delete('pipelines/:pipelineId')
  @ApiOperation({ summary: 'Delete a pipeline' })
  deletePipeline(@Param('pipelineId') pipelineId: string, @CurrentUser() user: { id: string }) {
    return this.contactsService.deletePipeline(pipelineId, user.id)
  }

  @ApiBearerAuth()
  @Patch('contacts/:id/pipeline')
  @ApiOperation({ summary: 'Assign a contact to a pipeline (or remove from pipeline)' })
  assignContactToPipeline(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: AssignPipelineDto,
  ) {
    return this.contactsService.assignContactToPipeline(
      id,
      user.id,
      dto.pipelineId ?? null,
      dto.stage,
    )
  }

  @ApiBearerAuth()
  @Get('pipelines/:pipelineId/contacts')
  @ApiOperation({ summary: 'Get all contacts in a pipeline' })
  getPipelineContacts(
    @Param('pipelineId') pipelineId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.contactsService.getPipelineContacts(pipelineId, user.id)
  }
}
