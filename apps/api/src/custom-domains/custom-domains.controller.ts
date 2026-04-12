import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { IsString, IsFQDN, IsOptional } from 'class-validator'
import { ThrottlerGuard, Throttle } from '@nestjs/throttler'
import type { DeletedResponse, ItemsResponse } from '@dotly/types'
import { CustomDomainsService } from './custom-domains.service'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { Public } from '../auth/decorators/public.decorator'

class AddDomainDto {
  @IsString()
  @IsFQDN()
  domain!: string

  @IsOptional()
  @IsString()
  cardId?: string
}

class UpdateDomainDto {
  @IsOptional()
  @IsString()
  cardId?: string | null
}

// CRIT-04: Strict FQDN regex for the :hostname route param.
// The @Param decorator does not run class-validator, so we validate manually.
// This prevents enumeration via malformed hostnames and blocks any path-traversal
// characters that could escape the query into the database layer.
const FQDN_REGEX =
  /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/

@ApiTags('custom-domains')
@Controller('custom-domains')
export class CustomDomainsController {
  constructor(private readonly svc: CustomDomainsService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a custom domain' })
  @Post()
  addDomain(@CurrentUser() user: { id: string }, @Body() dto: AddDomainDto) {
    return this.svc.addDomain(user.id, dto.cardId ?? null, dto.domain)
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trigger DNS verification for a domain' })
  @HttpCode(HttpStatus.OK)
  // LOW-07: Tighter per-endpoint rate limit on the verify route.  Each call
  // triggers an outbound DNS TXT lookup.  The global throttler (100 req/min) is
  // too permissive here — 5 attempts per minute per user is more than enough
  // for legitimate DNS propagation checks while blocking abuse.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post(':id/verify')
  verifyDomain(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.svc.verifyDomain(user.id, id)
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all custom domains for the current user' })
  @Get()
  getDomains(@CurrentUser() user: { id: string }) {
    return this.svc
      .getDomains(user.id)
      .then((items): ItemsResponse<(typeof items)[number]> => ({ items }))
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a custom domain' })
  @Delete(':id')
  deleteDomain(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.svc.deleteDomain(user.id, id).then((): DeletedResponse => ({ deleted: true }))
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a custom domain (e.g. assign/unassign a card)' })
  @Patch(':id')
  updateDomain(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateDomainDto,
  ) {
    return this.svc.updateDomain(user.id, id, { cardId: dto.cardId })
  }

  // CRIT-04: This endpoint is @Public (called by the Next.js middleware) so it
  // is reachable by anyone without authentication.  Two hardening measures:
  //
  //   1. @Throttle(20/min) — prevents enumeration of the entire domain → card
  //      mapping by brute-force.  The middleware only calls this once per
  //      incoming request, so 20/min is more than sufficient for legitimate
  //      traffic while blocking scrapers.
  //
  //   2. FQDN validation on the :hostname param — rejects any value that is
  //      not a proper fully-qualified domain name (e.g. path traversal strings,
  //      internal IPs written as hostnames, single labels like "localhost").
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Resolve a hostname to a card handle (used by Next.js middleware)' })
  @Get('resolve/:hostname')
  getCardByDomain(@Param('hostname') hostname: string) {
    if (!FQDN_REGEX.test(hostname)) {
      throw new BadRequestException('hostname must be a valid fully-qualified domain name')
    }
    return this.svc.getCardByDomain(hostname)
  }
}
