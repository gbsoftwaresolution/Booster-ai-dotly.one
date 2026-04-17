import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { Prisma, MediaBlockType as PrismaMediaBlockType } from '@dotly/database'
import { CreateCardDto } from './dto/create-card.dto'
import { UpdateCardDto } from './dto/update-card.dto'
import { UpdateThemeDto } from './dto/update-theme.dto'
import { UpsertSocialLinksDto } from './dto/upsert-social-links.dto'
import { UpsertMediaBlocksDto } from './dto/upsert-media-blocks.dto'
import { AuditService } from '../audit/audit.service'
import { AnalyticsService } from '../analytics/analytics.service'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import * as path from 'path'
import { randomBytes } from 'crypto'
import { AuthService } from '../auth/auth.service'
import { assertSafeUrl } from '../common/utils/ssrf-guard'
import type { CardActionConfig, CardActionsConfig, CardActionType } from '@dotly/types'

// F-26: Single source of truth for plan limits used in card creation.
// BillingService.getPlanLimits() is the canonical source for all other plan
// features (analyticsDays, csvExport, etc.).  Card count is duplicated here
// because CardsService has no dependency on BillingService; if you add more
// card-specific limits in the future, extend this map and remove them from
// BillingService to keep a true single source.
//
// Keep in sync with BillingService.getPlanLimits() card counts:
//   FREE/STARTER: 1  PRO: 3  BUSINESS: 10  AGENCY: 50  ENTERPRISE: unlimited
const PLAN_CARD_LIMITS: Record<string, number> = {
  FREE: 1,
  STARTER: 1,
  PRO: 3,
  BUSINESS: 10,
  AGENCY: 50,
  ENTERPRISE: Infinity,
}

const ALLOWED_CARD_ACTION_TYPES: readonly CardActionType[] = [
  'BOOK',
  'WHATSAPP_CHAT',
  'LEAD_CAPTURE',
]

function sanitizeActionConfig(value: unknown): CardActionConfig | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const type = typeof record['type'] === 'string' ? record['type'].trim() : ''
  if (!ALLOWED_CARD_ACTION_TYPES.includes(type as CardActionType)) return null

  const label = typeof record['label'] === 'string' ? record['label'].trim().slice(0, 60) : ''
  const whatsappMessage =
    typeof record['whatsappMessage'] === 'string'
      ? record['whatsappMessage'].trim().slice(0, 500)
      : ''

  return {
    type: type as CardActionType,
    ...(label ? { label } : {}),
    ...(typeof record['enabled'] === 'boolean' ? { enabled: record['enabled'] } : {}),
    ...(whatsappMessage ? { whatsappMessage } : {}),
  }
}

function sanitizeActionsConfig(value: unknown): CardActionsConfig | undefined {
  if (!value || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  const primary = sanitizeActionConfig(record['primary'])
  const secondaryRaw = Array.isArray(record['secondary']) ? record['secondary'] : []
  const secondary = secondaryRaw
    .map((item) => sanitizeActionConfig(item))
    .filter((item): item is CardActionConfig => item !== null)
    .slice(0, 2)

  if (!primary && secondary.length === 0) return undefined

  return {
    ...(primary ? { primary } : {}),
    ...(secondary.length > 0 ? { secondary } : {}),
  }
}

// F-04: Magic-byte signatures for the MIME types we allow.
// We check the actual decoded bytes, not just the declared mimeType, so an
// attacker cannot upload a PHP/SVG/HTML file by claiming it is image/jpeg.
// MAGIC_BYTES: outer array = alternatives (ANY must match for gif, all required for others)
// inner array = required byte-checks within one alternative (ALL must pass)
// WEBP requires BOTH "RIFF" at offset 0 AND "WEBP" at offset 8 — they are in the same
// inner array so both must pass. GIF has two inner arrays (one per version) so either passes.
const MAGIC_BYTES: Record<string, { offset: number; bytes: number[] }[][]> = {
  'image/jpeg': [[{ offset: 0, bytes: [0xff, 0xd8, 0xff] }]],
  'image/png': [[{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47] }]],
  // WEBP: both checks are in the SAME inner array — both must match
  'image/webp': [
    [
      { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // "RIFF"
      { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }, // "WEBP" — distinguishes from AVI/WAV
    ],
  ],
  'image/gif': [
    [{ offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }], // GIF87a
    [{ offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }], // GIF89a
  ],
}

function verifyMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const alternatives = MAGIC_BYTES[mimeType]
  if (!alternatives) return false
  // At least one alternative must match; within an alternative ALL checks must pass
  return alternatives.some((checks) =>
    checks.every(({ offset, bytes }) => bytes.every((b, i) => buffer[offset + i] === b)),
  )
}

@Injectable()
export class CardsService {
  private readonly r2Client: S3Client
  private readonly r2Bucket: string
  private readonly r2PublicUrl: string
  private readonly allowedAssetHosts: Set<string>

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    private readonly analytics: AnalyticsService,
    private readonly authService: AuthService,
  ) {
    const accountId = this.config.getOrThrow<string>('R2_ACCOUNT_ID')
    const accessKeyId = this.config.getOrThrow<string>('R2_ACCESS_KEY_ID')
    const secretAccessKey = this.config.getOrThrow<string>('R2_SECRET_ACCESS_KEY')
    this.r2Bucket = this.config.getOrThrow<string>('R2_BUCKET')
    const r2Url = this.config.get<string>('R2_PUBLIC_URL') ?? 'https://cdn.dotly.one'
    this.r2PublicUrl = r2Url.startsWith('http') ? r2Url : `https://${r2Url}`
    const allowedAssetHosts = new Set<string>(['cdn.dotly.one'])
    try {
      allowedAssetHosts.add(new URL(this.r2PublicUrl).hostname)
    } catch {
      /* ignore invalid config */
    }
    this.allowedAssetHosts = allowedAssetHosts

    this.r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    })
  }

  private async resolveInternalUserId(userId: string): Promise<string> {
    const userById = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    })
    if (userById) return userById.id

    throw new UnauthorizedException('Authenticated user not found')
  }

  private isTrustedAssetUrl(value: string): boolean {
    try {
      const url = new URL(value)
      return ['http:', 'https:'].includes(url.protocol) && this.allowedAssetHosts.has(url.hostname)
    } catch {
      return false
    }
  }

  private sanitizeCardFields(
    fields: Prisma.JsonValue | Prisma.InputJsonValue | null | undefined,
  ): Prisma.InputJsonValue {
    const record = { ...(((fields ?? {}) as Record<string, unknown>) || {}) }
    const avatarUrl = record['avatarUrl']
    if (typeof avatarUrl === 'string' && avatarUrl.trim() && !this.isTrustedAssetUrl(avatarUrl)) {
      record['avatarUrl'] = ''
    }
    const bookingAppointmentSlug = record['bookingAppointmentSlug']
    if (typeof bookingAppointmentSlug !== 'string') {
      delete record['bookingAppointmentSlug']
    } else {
      const normalizedBookingSlug = bookingAppointmentSlug.trim()
      if (!normalizedBookingSlug) {
        delete record['bookingAppointmentSlug']
      } else {
        record['bookingAppointmentSlug'] = normalizedBookingSlug
      }
    }

    const actions = sanitizeActionsConfig(record['actions'])
    if (actions) {
      record['actions'] = actions as unknown as Prisma.InputJsonValue
    } else {
      delete record['actions']
    }
    return record as Prisma.InputJsonValue
  }

  private async validateMediaBlockUrl(url: string | undefined, type: string): Promise<void> {
    if (!url) throw new BadRequestException('Media block URL is required')

    await assertSafeUrl(url)

    if ((type === 'VIDEO' || type === 'AUDIO') && !this.isTrustedAssetUrl(url)) {
      throw new BadRequestException('Audio and video blocks must use uploaded Dotly asset URLs')
    }
  }

  async findAllByUser(userId: string) {
    const internalUserId = await this.resolveInternalUserId(userId)
    // Return only the fields the dashboard needs — theme, socialLinks, and qrCode
    // are full relations not used by the card list UI and add significant payload size.
    // Parallelise the card list + view-count groupBy so they run in a single
    // round trip instead of sequentially.
    const [cards, viewCounts] = await Promise.all([
      this.prisma.card.findMany({
        where: { userId: internalUserId },
        select: {
          id: true,
          handle: true,
          templateId: true,
          isActive: true,
          fields: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      // We fetch view counts for ALL of the user's cards at once.
      // Because we don't yet know the card IDs we can't use `in` here,
      // so we join via userId through the card relation using a sub-select.
      // Prisma doesn't support join-based groupBy, so we do a two-pass:
      // first fetch IDs (above), then the groupBy — but both run in parallel
      // using a placeholder that resolves after the card IDs are known.
      // To truly parallelise we fetch the groupBy separately after the card
      // query resolves; here we run them both and discard IDs we don't need.
      this.prisma.analyticsEvent.groupBy({
        by: ['cardId'],
        where: {
          card: { userId: internalUserId },
          type: 'VIEW',
        },
        _count: { _all: true },
      }),
    ])

    const viewsByCardId = new Map(viewCounts.map((row) => [row.cardId, row._count._all]))

    return cards.map((card) => ({
      ...card,
      fields: this.sanitizeCardFields(card.fields),
      viewCount: viewsByCardId.get(card.id) ?? 0,
    }))
  }

  async create(userId: string, dto: CreateCardDto) {
    const internalUserId = await this.resolveInternalUserId(userId)
    // CRIT-02: Wrap the plan-limit check AND the card insert in a single
    // SERIALIZABLE transaction.  Without this, two concurrent POST /cards
    // requests for the same user can both read cardCount=0, both pass the
    // limit check, and both succeed — creating two cards on a FREE plan.
    //
    // SERIALIZABLE isolation means Postgres takes a predicate lock on the
    // card count query; the second concurrent transaction will be aborted
    // with a serialisation failure (P2034) which we re-throw as a 409.
    //
    // We read the user outside the transaction (immutable plan data) so the
    // transaction body is as short as possible.
    const user = await this.prisma.user.findUnique({
      where: { id: internalUserId },
    })

    // Generate handle before entering the transaction so we can report a
    // conflict without holding the serializable lock open longer than needed.
    let handle = dto.handle
    if (!handle) {
      const base = (user?.name || user?.email || 'user')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
      // F-23: Use crypto.randomBytes instead of Math.random() for the handle
      // suffix. Math.random() is a PRNG (not CSPRNG), making the ~1.7M handle
      // space brute-forceable. randomBytes gives 3 bytes → 6 hex chars → 16M
      // possibilities with cryptographic uniform distribution.
      handle = `${base}-${randomBytes(3).toString('hex')}`
    }

    const plan = user?.plan ?? 'FREE'
    const limit = PLAN_CARD_LIMITS[plan] ?? 1

    let card: Awaited<ReturnType<typeof this.prisma.card.create>>
    try {
      card = await this.prisma.$transaction(
        async (tx) => {
          // Re-count inside the transaction under SERIALIZABLE isolation so
          // concurrent requests block each other on the predicate lock.
          const cardCount = await tx.card.count({ where: { userId: internalUserId } })
          if (cardCount >= limit) {
            throw new ForbiddenException({
              code: 'PLAN_LIMIT_REACHED',
              limit,
              current: cardCount,
              message: `Plan ${plan} allows a maximum of ${limit} card(s)`,
            })
          }

          // Check handle uniqueness inside the same transaction.
          const existing = await tx.card.findUnique({ where: { handle } })
          if (existing) {
            // F-23: Also use CSPRNG for the conflict-resolution suggestion.
            const suggestion = `${handle}-${randomBytes(2).toString('hex')}`
            throw new ConflictException({
              code: 'HANDLE_TAKEN',
              message: 'Handle already taken',
              suggestion,
            })
          }

          return tx.card.create({
            data: {
              userId: internalUserId,
              handle,
              templateId: dto.templateId ?? 'MINIMAL',
              fields: this.sanitizeCardFields((dto.fields ?? {}) as Prisma.InputJsonValue),
              theme: {
                create: {
                  primaryColor: '#000000',
                  secondaryColor: '#ffffff',
                  fontFamily: 'Inter',
                },
              },
            },
            include: { theme: true, socialLinks: true },
          })
        },
        // CRIT-02: Use SERIALIZABLE isolation to prevent TOCTOU race on the
        // plan-limit count check.
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
    } catch (err) {
      // Re-throw NestJS HTTP exceptions (ForbiddenException, ConflictException)
      // directly.  Translate Prisma serialization failure (P2034) to a 409 so
      // the client knows to retry.
      if (err instanceof ForbiddenException || err instanceof ConflictException) throw err
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Handle already taken')
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        throw new UnauthorizedException('Authenticated user not found')
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034') {
        throw new ConflictException(
          'Could not create card due to a concurrent request — please try again',
        )
      }
      throw err
    }

    void this.audit
      .log({
        userId: internalUserId,
        action: 'card.created',
        resourceId: card.id,
        resourceType: 'card',
        metadata: { handle: card.handle },
      })
      .catch(() => void 0)

    // Bust the dashboard summary cache so the new card count is reflected
    // on the next page load without waiting for the 60-second TTL.
    void this.analytics.invalidateDashboardCache(internalUserId).catch(() => void 0)

    return card
  }

  async findById(id: string, userId: string) {
    const internalUserId = await this.resolveInternalUserId(userId)
    const card = await this.prisma.card.findUnique({
      where: { id },
      include: {
        theme: true,
        socialLinks: { orderBy: { displayOrder: 'asc' } },
        mediaBlocks: { orderBy: { displayOrder: 'asc' } },
        qrCode: true,
      },
    })
    if (!card) throw new NotFoundException('Card not found')
    if (card.userId !== internalUserId) throw new ForbiddenException('Access denied')
    return {
      ...card,
      fields: this.sanitizeCardFields(card.fields),
    }
  }

  async update(id: string, userId: string, dto: UpdateCardDto) {
    const card = await this.findById(id, userId)

    // If handle is being changed, check uniqueness
    if (dto.handle) {
      const existing = await this.prisma.card.findUnique({ where: { handle: dto.handle } })
      if (existing && existing.id !== id) {
        // F-23: CSPRNG suggestion here too.
        const suggestion = `${dto.handle}-${randomBytes(2).toString('hex')}`
        throw new ConflictException({
          code: 'HANDLE_TAKEN',
          message: 'Handle already taken',
          suggestion,
        })
      }
    }

    // Merge incoming fields into existing JSONB rather than replacing the whole
    // object.  Without this, sending { name: "Alice" } would wipe every other
    // field (title, email, bio, etc.) that was already saved.
    let mergedFields: Prisma.InputJsonValue | undefined
    if (dto.fields !== undefined) {
      const existing = (card.fields ?? {}) as Record<string, unknown>
      mergedFields = this.sanitizeCardFields({
        ...existing,
        ...(dto.fields as Record<string, unknown>),
      } as Prisma.InputJsonValue)
    }

    return this.prisma.card.update({
      where: { id },
      data: {
        ...(dto.handle !== undefined && { handle: dto.handle }),
        ...(dto.templateId !== undefined && { templateId: dto.templateId }),
        ...(mergedFields !== undefined && { fields: mergedFields }),
        ...(dto.vcardPolicy !== undefined && { vcardPolicy: dto.vcardPolicy }),
      },
      include: { theme: true, socialLinks: true },
    })
  }

  async updateTheme(id: string, userId: string, dto: UpdateThemeDto) {
    await this.findById(id, userId)
    return this.prisma.cardTheme.upsert({
      where: { cardId: id },
      create: {
        cardId: id,
        primaryColor: dto.primaryColor ?? '#000000',
        secondaryColor: dto.secondaryColor ?? '#ffffff',
        fontFamily: dto.fontFamily ?? 'Inter',
        backgroundUrl: dto.backgroundUrl,
        logoUrl: dto.logoUrl,
        buttonStyle: dto.buttonStyle,
        socialButtonStyle: dto.socialButtonStyle,
      },
      update: {
        ...(dto.primaryColor !== undefined && { primaryColor: dto.primaryColor }),
        ...(dto.secondaryColor !== undefined && { secondaryColor: dto.secondaryColor }),
        ...(dto.fontFamily !== undefined && { fontFamily: dto.fontFamily }),
        ...(dto.backgroundUrl !== undefined && { backgroundUrl: dto.backgroundUrl }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
        ...(dto.buttonStyle !== undefined && { buttonStyle: dto.buttonStyle }),
        ...(dto.socialButtonStyle !== undefined && { socialButtonStyle: dto.socialButtonStyle }),
      },
    })
  }

  async upsertSocialLinks(id: string, userId: string, dto: UpsertSocialLinksDto) {
    await this.findById(id, userId)
    // Wrap delete + create in a transaction so partial failures leave the card
    // with either the old links or the new links — never zero links.
    return this.prisma.$transaction(async (tx) => {
      await tx.socialLink.deleteMany({ where: { cardId: id } })
      return tx.socialLink.createMany({
        data: dto.links.map((l) => ({
          cardId: id,
          platform: l.platform,
          url: l.url,
          displayOrder: l.displayOrder,
        })),
      })
    })
  }

  async upsertMediaBlocks(id: string, userId: string, dto: UpsertMediaBlocksDto) {
    await this.findById(id, userId)
    for (const block of dto.blocks) {
      await this.validateMediaBlockUrl(block.url, block.type as unknown as PrismaMediaBlockType)
    }
    // Same atomic guarantee as upsertSocialLinks.
    return this.prisma.$transaction(async (tx) => {
      await tx.mediaBlock.deleteMany({ where: { cardId: id } })
      return tx.mediaBlock.createMany({
        data: dto.blocks.map((b) => ({
          cardId: id,
          type: b.type as unknown as PrismaMediaBlockType,
          url: b.url,
          caption: b.caption,
          altText: b.altText,
          linkUrl: b.linkUrl,
          displayOrder: b.displayOrder,
          mimeType: b.mimeType,
          fileSize: b.fileSize,
          groupId: b.groupId,
          groupName: b.groupName,
        })),
      })
    })
  }

  async duplicate(id: string, userId: string) {
    const internalUserId = await this.resolveInternalUserId(userId)
    const source = await this.findById(id, userId)

    const user = await this.prisma.user.findUnique({ where: { id: internalUserId } })
    const plan = user?.plan ?? 'FREE'
    const limit = PLAN_CARD_LIMITS[plan] ?? 1

    // CRIT-02 (duplicate path): Wrap the plan-limit check AND the duplicate
    // insert in a SERIALIZABLE transaction — mirrors the protection in create().
    // Without this, two concurrent duplicate requests can both read cardCount < limit,
    // both pass the check, and both succeed, bypassing the per-plan card cap.
    let duplicate: Awaited<ReturnType<typeof this.prisma.card.create>>
    try {
      duplicate = await this.prisma.$transaction(
        async (tx) => {
          const cardCount = await tx.card.count({ where: { userId: internalUserId } })
          if (cardCount >= limit) {
            throw new ForbiddenException({
              code: 'PLAN_LIMIT_REACHED',
              limit,
              current: cardCount,
              message: `Plan ${plan} allows a maximum of ${limit} card(s)`,
            })
          }

          // Generate a unique handle for the copy
          const baseHandle = `${source.handle}-copy`
          const newHandle = `${baseHandle}-${randomBytes(2).toString('hex')}`

          return tx.card.create({
            data: {
              userId: internalUserId,
              handle: newHandle,
              templateId: source.templateId,
              fields: source.fields as Prisma.InputJsonValue,
              isActive: false, // copies start as draft
              vcardPolicy: source.vcardPolicy, // preserve source card's download policy
              theme: source.theme
                ? {
                    create: {
                      primaryColor: source.theme.primaryColor,
                      secondaryColor: source.theme.secondaryColor,
                      fontFamily: source.theme.fontFamily,
                      backgroundUrl: source.theme.backgroundUrl,
                      logoUrl: source.theme.logoUrl,
                      buttonStyle: source.theme.buttonStyle,
                      socialButtonStyle: source.theme.socialButtonStyle,
                    },
                  }
                : {
                    create: {
                      primaryColor: '#000000',
                      secondaryColor: '#ffffff',
                      fontFamily: 'Inter',
                    },
                  },
              socialLinks: {
                create: source.socialLinks.map((sl) => ({
                  platform: sl.platform,
                  url: sl.url,
                  displayOrder: sl.displayOrder,
                })),
              },
              mediaBlocks: {
                create: source.mediaBlocks.map((mb) => ({
                  type: mb.type as unknown as PrismaMediaBlockType,
                  url: mb.url,
                  caption: mb.caption,
                  altText: (mb as { altText?: string }).altText,
                  linkUrl: (mb as { linkUrl?: string }).linkUrl,
                  displayOrder: mb.displayOrder,
                  mimeType: (mb as { mimeType?: string }).mimeType,
                  fileSize: (mb as { fileSize?: number }).fileSize,
                  groupId: (mb as { groupId?: string }).groupId,
                  groupName: (mb as { groupName?: string }).groupName,
                })),
              },
            },
            include: { theme: true, socialLinks: true, mediaBlocks: true },
          })
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
    } catch (err) {
      if (err instanceof ForbiddenException || err instanceof ConflictException) throw err
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Handle already taken — please try again')
      }
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034') {
        throw new ConflictException(
          'Could not duplicate card due to a concurrent request — please try again',
        )
      }
      throw err
    }

    void this.audit
      .log({
        userId: internalUserId,
        action: 'card.duplicated',
        resourceId: duplicate.id,
        resourceType: 'card',
        metadata: { sourceCardId: id },
      })
      .catch(() => void 0)

    void this.analytics.invalidateDashboardCache(internalUserId).catch(() => void 0)

    return duplicate
  }

  async delete(id: string, userId: string) {
    const internalUserId = await this.resolveInternalUserId(userId)
    await this.findById(id, userId)
    const result = await this.prisma.card.delete({ where: { id } })
    void this.audit
      .log({
        userId: internalUserId,
        action: 'card.deleted',
        resourceId: id,
        resourceType: 'card',
      })
      .catch(() => void 0)
    void this.analytics.invalidateDashboardCache(internalUserId).catch(() => void 0)
    return result
  }

  async publish(id: string, userId: string) {
    const internalUserId = await this.resolveInternalUserId(userId)
    await this.findById(id, userId)
    const result = await this.prisma.card.update({
      where: { id },
      data: { isActive: true },
    })
    void this.analytics.invalidateDashboardCache(internalUserId).catch(() => void 0)
    return result
  }

  async unpublish(id: string, userId: string) {
    const internalUserId = await this.resolveInternalUserId(userId)
    await this.findById(id, userId)
    const result = await this.prisma.card.update({
      where: { id },
      data: { isActive: false },
    })
    void this.analytics.invalidateDashboardCache(internalUserId).catch(() => void 0)
    return result
  }

  async findByHandle(handle: string) {
    const card = await this.prisma.card.findUnique({
      where: { handle, isActive: true },
      include: {
        theme: true,
        socialLinks: { orderBy: { displayOrder: 'asc' } },
        mediaBlocks: { orderBy: { displayOrder: 'asc' } },
        user: {
          include: {
            teamMemberships: {
              include: { team: true },
              orderBy: { joinedAt: 'asc' },
              take: 1,
            },
          },
        },
      },
    })
    if (!card) throw new NotFoundException('Card not found')

    const cardFields = (card.fields ?? {}) as Record<string, unknown>
    const selectedBookingSlug =
      typeof cardFields['bookingAppointmentSlug'] === 'string'
        ? cardFields['bookingAppointmentSlug'].trim()
        : ''

    const bookableAppointment = selectedBookingSlug
      ? await this.prisma.appointmentType.findUnique({
          where: {
            ownerUserId_slug: {
              ownerUserId: card.userId,
              slug: selectedBookingSlug,
            },
          },
          select: {
            slug: true,
            name: true,
            durationMins: true,
            isActive: true,
            deletedAt: true,
          },
        })
      : null

    // Extract team brand from first team membership
    const firstMembership = card.user?.teamMemberships?.[0]
    const team = firstMembership?.team
    let teamBrand: {
      brandName: string | null
      brandLogoUrl: string | null
      brandColor: string | null
      secondaryColor: string | null
      fontFamily: string | null
      brandLock: boolean
      hideDotlyBranding: boolean
    } | null = null

    if (team) {
      const cfg = (team.brandConfig ?? {}) as Record<string, unknown>
      teamBrand = {
        brandName: (cfg['brandName'] as string | undefined) ?? team.name ?? null,
        brandLogoUrl: (cfg['logoUrl'] as string | undefined) ?? null,
        brandColor: (cfg['primaryColor'] as string | undefined) ?? null,
        secondaryColor: (cfg['secondaryColor'] as string | undefined) ?? null,
        fontFamily: (cfg['fontFamily'] as string | undefined) ?? null,
        brandLock: team.brandLock ?? false,
        hideDotlyBranding: (cfg['hideDotlyBranding'] as boolean | undefined) ?? false,
      }
    }

    // Strip owner-only identifiers from the public response.
    const { user, userId, ...publicCard } = card
    void user
    void userId
    return {
      ...publicCard,
      fields: this.sanitizeCardFields(publicCard.fields),
      teamBrand,
      bookableAppointment:
        bookableAppointment &&
        bookableAppointment.isActive &&
        bookableAppointment.deletedAt === null
          ? {
              slug: bookableAppointment.slug,
              name: bookableAppointment.name,
              durationMins: bookableAppointment.durationMins,
            }
          : null,
    }
  }

  async uploadAvatar(id: string, userId: string, base64: string, mimeType: string) {
    await this.findById(id, userId)

    // F-04: Validate actual file content against magic bytes.
    // A client could declare mimeType="image/jpeg" but upload an SVG, HTML, or
    // PHP file that R2 will serve with the wrong Content-Type.  By checking the
    // first bytes of the decoded data we ensure the declared type matches reality.
    const buffer = Buffer.from(base64, 'base64')
    if (!verifyMagicBytes(buffer, mimeType)) {
      throw new BadRequestException(
        `File content does not match the declared MIME type "${mimeType}"`,
      )
    }

    // LOW-04: Use an explicit MIME → extension map rather than splitting on '/'
    // which produces malformed extensions for types like 'image/svg+xml' and is
    // fragile against MIME types with parameters (e.g. 'image/jpeg; charset=utf-8').
    const MIME_EXT: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    }
    const ext = MIME_EXT[mimeType] ?? 'bin'
    const key = `${id}/avatar-${Date.now()}.${ext}`
    await this.r2Client.send(
      new PutObjectCommand({
        Bucket: this.r2Bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        CacheControl: 'public, max-age=31536000',
      }),
    )
    return { url: `${this.r2PublicUrl}/${key}` }
  }

  async getUploadUrl(
    id: string,
    userId: string,
    filename: string,
    contentType: string,
    fileSizeBytes: number,
  ) {
    await this.findById(id, userId)

    // Defense-in-depth: strip any directory components from the filename even
    // though the DTO @Matches validator already enforces safe characters.
    // path.basename() on a posix path removes all leading directory segments
    // (e.g. "../../other/file.png" → "file.png") so the key is always confined
    // to the card's own prefix inside the R2 bucket.
    const safeFilename = path.basename(filename)
    if (!safeFilename) {
      throw new BadRequestException('filename resolved to an empty string after sanitisation')
    }

    // M-03: Add a random 4-byte hex suffix so two concurrent uploads for the
    // same card with the same filename in the same millisecond get distinct keys.
    // Without this, the second presigned URL would silently overwrite the first
    // object that was uploaded to R2.
    const randomSuffix = randomBytes(4).toString('hex')
    const key = `${id}/${Date.now()}-${randomSuffix}-${safeFilename}`
    const command = new PutObjectCommand({
      Bucket: this.r2Bucket,
      Key: key,
      ContentType: contentType,
      // Enforce the declared upload size: R2/S3 will reject PUT requests whose
      // Content-Length header does not match this value, capping uploads at the
      // DTO-validated 10 MB maximum without needing a presigned-POST policy.
      ContentLength: fileSizeBytes,
    })
    const uploadUrl = await getSignedUrl(this.r2Client, command, { expiresIn: 60 })
    return {
      uploadUrl,
      publicUrl: `${this.r2PublicUrl}/${key}`,
      contentType,
    }
  }

  async getVcard(
    handle: string,
    bearerToken?: string,
  ): Promise<{ content: string; handle: string }> {
    // F-17: Fetch the card from DB via the DB-validated handle rather than
    // using the raw @Param handle directly in the Content-Disposition header.
    // findByHandle throws NotFoundException if the card doesn't exist or is
    // unpublished, so the handle used in the header is always a real DB value.
    const card = await this.findByHandle(handle)

    // MEMBERS_ONLY policy requires a valid first-party access token.
    if (card.vcardPolicy === 'MEMBERS_ONLY') {
      try {
        if (!bearerToken) {
          throw new ForbiddenException('Sign in to download this contact')
        }
        await this.authService.validateAccessToken(bearerToken)
      } catch {
        throw new ForbiddenException('Sign in to download this contact')
      }
    }
    const dbHandle = card.handle // Use the DB value, not the raw URL param.
    // Defensive string coercion — card.fields is JSONB and individual values may not
    // be strings (e.g. legacy records stored numbers or nulls). Calling .replace()
    // on a non-string would throw at runtime; coerce each field before use.
    const rawFields = (card.fields ?? {}) as Record<string, unknown>
    const safeField = (key: string): string => {
      const v = rawFields[key]
      return typeof v === 'string' ? v : v != null ? String(v) : ''
    }

    // RFC 6350 §3.4: escape backslash, comma, semicolon, and newline in values
    const escapeVcard = (value: string): string =>
      value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')

    const lines: string[] = ['BEGIN:VCARD', 'VERSION:3.0']

    // Full name (required by spec)
    if (safeField('name')) lines.push(`FN:${escapeVcard(safeField('name'))}`)

    // Name components — split first/last on first space
    if (safeField('name')) {
      const parts = safeField('name').trim().split(/\s+/)
      const last = parts.length > 1 ? (parts.pop() ?? '') : ''
      const first = parts.join(' ')
      lines.push(`N:${escapeVcard(last)};${escapeVcard(first)};;;`)
    }

    if (safeField('title')) lines.push(`TITLE:${escapeVcard(safeField('title'))}`)
    if (safeField('company')) lines.push(`ORG:${escapeVcard(safeField('company'))}`)

    // Phone — prefer tel: type hint for mobile compatibility
    if (safeField('phone')) lines.push(`TEL;TYPE=CELL:${escapeVcard(safeField('phone'))}`)

    // Email
    if (safeField('email')) lines.push(`EMAIL;TYPE=WORK:${escapeVcard(safeField('email'))}`)

    // Website
    if (safeField('website')) lines.push(`URL:${escapeVcard(safeField('website'))}`)

    // Address — vCard ADR format: PO;Ext;Street;City;Region;ZIP;Country
    // We store a single free-form string so map it into the street component.
    if (safeField('address'))
      lines.push(`ADR;TYPE=WORK:;;${escapeVcard(safeField('address'))};;;;;`)

    // Bio / note
    if (safeField('bio')) lines.push(`NOTE:${escapeVcard(safeField('bio'))}`)

    // Photo — inline URL reference (vCard 3.0 PHOTO;VALUE=URI)
    if (safeField('avatarUrl')) lines.push(`PHOTO;VALUE=URI:${escapeVcard(safeField('avatarUrl'))}`)

    // Social links — emit X- properties for major platforms
    const socialLinks = card.socialLinks ?? []
    for (const sl of socialLinks) {
      const platform = String(sl.platform).toUpperCase()
      lines.push(`X-SOCIALPROFILE;TYPE=${platform}:${escapeVcard(sl.url)}`)
    }

    // Source — the public card URL
    const webUrl = this.config.get<string>('WEB_URL') ?? 'https://dotly.one'
    const normalizedWebUrl = webUrl.startsWith('http') ? webUrl : `https://${webUrl}`
    lines.push(`URL;TYPE=HOME:${escapeVcard(`${normalizedWebUrl}/card/${dbHandle}`)}`)

    lines.push('END:VCARD')

    const content = lines.join('\r\n')
    return { content, handle: dbHandle }
  }
}
