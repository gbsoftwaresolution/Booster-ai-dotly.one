import { Controller, Get, Put, Delete, Param, Body } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsIn,
  IsArray,
  MaxLength,
  ArrayMaxSize,
  ValidateNested,
  IsInt,
  Min,
  Max,
} from 'class-validator'
import { Type } from 'class-transformer'
import { Public } from '../auth/decorators/public.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { LeadFormService, LeadFieldInput } from './lead-form.service'

const FIELD_TYPES = ['TEXT', 'EMAIL', 'PHONE', 'URL', 'TEXTAREA', 'SELECT'] as const

class LeadFieldDto implements LeadFieldInput {
  @IsString()
  @MaxLength(100)
  label!: string

  @IsIn(FIELD_TYPES)
  fieldType!: 'TEXT' | 'EMAIL' | 'PHONE' | 'URL' | 'TEXTAREA' | 'SELECT'

  @IsOptional()
  @IsString()
  @MaxLength(200)
  placeholder?: string

  @IsOptional()
  @IsBoolean()
  required?: boolean

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(19)
  displayOrder?: number

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  @ArrayMaxSize(50)
  options?: string[]
}

class UpsertLeadFormDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string

  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string

  @IsOptional()
  @IsString()
  @MaxLength(50)
  buttonText?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => LeadFieldDto)
  fields?: LeadFieldDto[]
}

@ApiTags('lead-form')
@Controller()
export class LeadFormController {
  constructor(private readonly leadFormService: LeadFormService) {}

  /** Public — called by the public card page to render the correct form */
  @Public()
  @ApiOperation({ summary: 'Get lead form schema for a published card (no auth)' })
  @Get('public/cards/:handle/lead-form')
  getPublicForm(@Param('handle') handle: string) {
    return this.leadFormService.getPublicFormByHandle(handle)
  }

  /** Owner — get the form schema for editing */
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get lead form configuration for a card' })
  @Get('cards/:cardId/lead-form')
  getForm(@Param('cardId') cardId: string, @CurrentUser() user: { id: string }) {
    return this.leadFormService.getForm(cardId, user.id)
  }

  /** Owner — save/update the form (fields are replaced atomically) */
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save lead form configuration (replaces fields)' })
  @Put('cards/:cardId/lead-form')
  upsertForm(
    @Param('cardId') cardId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpsertLeadFormDto,
  ) {
    return this.leadFormService.upsertForm(cardId, user.id, dto)
  }

  /** Owner — reset back to the 3-field default */
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reset lead form to default (Name / Email / Phone)' })
  @Delete('cards/:cardId/lead-form')
  resetForm(@Param('cardId') cardId: string, @CurrentUser() user: { id: string }) {
    return this.leadFormService.resetForm(cardId, user.id)
  }
}
