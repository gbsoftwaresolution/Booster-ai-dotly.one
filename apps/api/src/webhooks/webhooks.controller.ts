import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUrl,
  MaxLength,
  ArrayMaxSize,
  ArrayMinSize,
  IsIn,
} from 'class-validator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { WebhooksService, WEBHOOK_EVENTS } from './webhooks.service'

const EVENT_LIST = [...WEBHOOK_EVENTS] as string[]

class CreateWebhookDto {
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  url!: string

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(WEBHOOK_EVENTS.length)
  @IsIn(EVENT_LIST, { each: true })
  events!: string[]
}

class UpdateWebhookDto {
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(2048)
  url?: string

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(WEBHOOK_EVENTS.length)
  @IsIn(EVENT_LIST, { each: true })
  events?: string[]

  @IsOptional()
  @IsBoolean()
  enabled?: boolean
}

@ApiTags('webhooks')
@ApiBearerAuth()
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @ApiOperation({ summary: 'List all webhook endpoints for authenticated user' })
  @Get()
  findAll(@CurrentUser() user: { id: string }) {
    return this.webhooksService.findAll(user.id)
  }

  @ApiOperation({ summary: 'Create a webhook endpoint' })
  @Post()
  create(@CurrentUser() user: { id: string }, @Body() dto: CreateWebhookDto) {
    return this.webhooksService.create(user.id, dto)
  }

  @ApiOperation({ summary: 'Update a webhook endpoint (url / events / enabled)' })
  @Put(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateWebhookDto,
  ) {
    return this.webhooksService.update(user.id, id, dto)
  }

  @ApiOperation({ summary: 'Regenerate signing secret for a webhook endpoint' })
  @Post(':id/secret')
  regenerateSecret(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.webhooksService.regenerateSecret(user.id, id)
  }

  @ApiOperation({ summary: 'Send a test payload to a webhook endpoint' })
  @Post(':id/test')
  test(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.webhooksService.testEndpoint(user.id, id)
  }

  @ApiOperation({ summary: 'Get delivery log for a webhook endpoint (last 50)' })
  @Get(':id/deliveries')
  deliveries(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.webhooksService.getDeliveries(user.id, id)
  }

  @ApiOperation({ summary: 'Delete a webhook endpoint' })
  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.webhooksService.delete(user.id, id)
  }

  @ApiOperation({ summary: 'List all supported event types' })
  @Get('events')
  listEvents() {
    return { events: WEBHOOK_EVENTS }
  }
}
