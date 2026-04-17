import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common'
import { promises as dns } from 'dns'
import { randomUUID } from 'crypto'
import { PrismaService } from '../prisma/prisma.service'
import { assertSafeUrl } from '../common/utils/ssrf-guard'
import { Prisma } from '@dotly/database'
import { Plan } from '@dotly/types'
import { BillingService } from '../billing/billing.service'

/**
 * L-08: dns.resolveTxt() has no built-in timeout. On slow or unresponsive
 * resolvers (e.g. authoritative NS that never replies) the call can hang for
 * 30+ seconds, blocking the NestJS event loop thread for that duration.
 * This helper races the DNS call against a 5-second rejection timer so we
 * always return promptly — either with DNS records or an error we can catch.
 */
function resolveTxtWithTimeout(hostname: string, timeoutMs = 5000): Promise<string[][]> {
  return Promise.race([
    dns.resolveTxt(hostname),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`DNS lookup timed out after ${timeoutMs}ms`)), timeoutMs),
    ),
  ])
}

@Injectable()
export class CustomDomainsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billingService: BillingService,
  ) {}

  private async assertCustomDomainAccess(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    })

    const plan = (user?.plan as Plan | undefined) ?? Plan.FREE
    const limits = this.billingService.getPlanLimits(plan)

    if (!limits.customDomain) {
      throw new ForbiddenException('Custom domains require Pro or higher')
    }
  }

  async addDomain(userId: string, cardId: string | null, domain: string) {
    await this.assertCustomDomainAccess(userId)

    // Guard against SSRF via domain input — validate it is a safe external URL
    await assertSafeUrl(`https://${domain.toLowerCase().trim()}`)

    // Verify the card belongs to the user if provided
    if (cardId) {
      const card = await this.prisma.card.findUnique({ where: { id: cardId } })
      if (!card) throw new NotFoundException('Card not found')
      if (card.userId !== userId) throw new ForbiddenException('Access denied')
    }

    const verificationToken = `dotly-verify=${randomUUID()}`

    try {
      return await this.prisma.customDomain.create({
        data: {
          userId,
          cardId: cardId ?? null,
          domain: domain.toLowerCase().trim(),
          status: 'PENDING',
          verificationToken,
          isVerified: false,
          sslStatus: 'pending',
          txtRecord: verificationToken,
        },
      })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('That domain is already registered')
      }
      throw err
    }
  }

  async verifyDomain(userId: string, domainId: string) {
    await this.assertCustomDomainAccess(userId)

    const record = await this.prisma.customDomain.findUnique({
      where: { id: domainId },
    })
    if (!record) throw new NotFoundException('Domain not found')
    if (record.userId !== userId) throw new ForbiddenException('Access denied')

    // Perform real DNS TXT lookup at _dotly-verify.<domain>
    const verifyHost = `_dotly-verify.${record.domain}`
    let txtRecords: string[][] = []
    try {
      txtRecords = await resolveTxtWithTimeout(verifyHost)
    } catch {
      // DNS lookup failed or timed out — treat as unverified
    }

    const flat = txtRecords.flat()
    const tokenFound = flat.some((entry) => entry === record.verificationToken)

    if (!tokenFound) {
      throw new BadRequestException(
        `TXT record not found. Add a TXT record at "${verifyHost}" with value "${record.verificationToken}"`,
      )
    }

    // Mark the domain as verified and logically "SSL active".
    // NOTE: sslStatus: 'active' is a logical flag stored in the DB — it does NOT
    // trigger actual TLS certificate provisioning here.  Certificate issuance is
    // handled at the CDN/edge layer (e.g. Vercel, Cloudflare) which automatically
    // provisions a certificate once the domain's DNS points to the platform.
    // This flag is consumed by the frontend to show the correct status badge.
    return this.prisma.customDomain.update({
      where: { id: domainId },
      data: {
        status: 'ACTIVE',
        isVerified: true,
        sslStatus: 'active',
      },
    })
  }

  async getDomains(userId: string) {
    await this.assertCustomDomainAccess(userId)

    return this.prisma.customDomain.findMany({
      where: { userId },
      include: {
        card: {
          select: { id: true, handle: true, fields: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async deleteDomain(userId: string, domainId: string) {
    await this.assertCustomDomainAccess(userId)

    const record = await this.prisma.customDomain.findUnique({
      where: { id: domainId },
    })
    if (!record) throw new NotFoundException('Domain not found')
    if (record.userId !== userId) throw new ForbiddenException('Access denied')

    return this.prisma.customDomain.delete({ where: { id: domainId } })
  }

  async updateDomain(userId: string, domainId: string, updates: { cardId?: string | null }) {
    await this.assertCustomDomainAccess(userId)

    const record = await this.prisma.customDomain.findUnique({ where: { id: domainId } })
    if (!record) throw new NotFoundException('Domain not found')
    if (record.userId !== userId) throw new ForbiddenException('Access denied')

    if (updates.cardId) {
      const card = await this.prisma.card.findUnique({ where: { id: updates.cardId } })
      if (!card) throw new NotFoundException('Card not found')
      if (card.userId !== userId) throw new ForbiddenException('Access denied')
    }

    return this.prisma.customDomain.update({
      where: { id: domainId },
      data: { cardId: updates.cardId !== undefined ? updates.cardId : record.cardId },
      include: { card: { select: { id: true, handle: true } } },
    })
  }

  async getCardByDomain(hostname: string) {
    const record = await this.prisma.customDomain.findUnique({
      where: { domain: hostname.toLowerCase().trim() },
      include: {
        card: {
          include: {
            // F-06: Exclude user.email from this unauthenticated endpoint.
            // The email was included via `select: { id, email, name }` which
            // leaked the card owner's email address to any unauthenticated caller
            // who requests the domain. We keep id and name for display purposes.
            user: { select: { id: true, name: true } },
            theme: true,
            socialLinks: { orderBy: { displayOrder: 'asc' } },
            mediaBlocks: { orderBy: { displayOrder: 'asc' } },
          },
        },
      },
    })

    if (!record || record.status !== 'ACTIVE' || !record.card || !record.card.isActive) {
      throw new NotFoundException('No active card found for this domain')
    }

    return {
      handle: record.card.handle,
    }
  }

  // Used by the BullMQ processor to retry pending domains
  async recheckPendingDomains() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    // Expire domains that have been pending for > 7 days
    await this.prisma.customDomain.updateMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: sevenDaysAgo },
      },
      data: { status: 'FAILED' },
    })

    // Re-check still-pending domains in parallel
    const pendingDomains = await this.prisma.customDomain.findMany({
      where: { status: 'PENDING' },
      // LOW-01: Cap at 100 per cron tick to prevent the event loop from being
      // blocked by thousands of outbound DNS lookups if domains accumulate in
      // PENDING (e.g. due to a bug that prevented status transitions).
      take: 100,
      orderBy: { createdAt: 'asc' },
    })

    await Promise.allSettled(
      pendingDomains.map(async (record) => {
        const verifyHost = `_dotly-verify.${record.domain}`
        let txtRecords: string[][] = []
        try {
          txtRecords = await resolveTxtWithTimeout(verifyHost)
        } catch {
          return
        }

        const flat = txtRecords.flat()
        const tokenFound = flat.some((entry) => entry === record.verificationToken)

        if (tokenFound) {
          await this.prisma.customDomain.update({
            where: { id: record.id },
            data: { status: 'ACTIVE', isVerified: true, sslStatus: 'active' },
          })
        }
      }),
    )
  }
}
