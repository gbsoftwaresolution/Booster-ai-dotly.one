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
import { Prisma } from '@dotly/database'
import { CreateCardDto } from './dto/create-card.dto'
import { UpdateCardDto } from './dto/update-card.dto'
import { UpdateThemeDto } from './dto/update-theme.dto'
import { UpsertSocialLinksDto } from './dto/upsert-social-links.dto'
import { UpsertMediaBlocksDto } from './dto/upsert-media-blocks.dto'
import { AuditService } from '../audit/audit.service'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import * as path from 'path'
import { randomBytes } from 'crypto'

// F-26: Single source of truth for plan limits used in card creation.
// BillingService.getPlanLimits() is the canonical source for all other plan
// features (analyticsDays, csvExport, etc.).  Card count is duplicated here
// because CardsService has no dependency on BillingService; if you add more
// card-specific limits in the future, extend this map and remove them from
// BillingService to keep a true single source.
const PLAN_CARD_LIMITS: Record<string, number> = {
  FREE: 1,
  PRO: 3,
  BUSINESS: 10,
  ENTERPRISE: Infinity,
}

// F-04: Magic-byte signatures for the MIME types we allow.
// We check the actual decoded bytes, not just the declared mimeType, so an
// attacker cannot upload a PHP/SVG/HTML file by claiming it is image/jpeg.
const MAGIC_BYTES: Record<string, { offset: number; bytes: number[] }[]> = {
  'image/jpeg': [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  'image/png': [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47] }],
  'image/webp': [{ offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }], // "RIFF"
  'image/gif': [
    { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] }, // GIF87a
    { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] }, // GIF89a
  ],
}

function verifyMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const signatures = MAGIC_BYTES[mimeType]
  if (!signatures) return false
  return signatures.some(({ offset, bytes }) => bytes.every((b, i) => buffer[offset + i] === b))
}

@Injectable()
export class CardsService {
  private readonly r2Client: S3Client
  private readonly r2Bucket: string
  private readonly r2PublicUrl: string

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {
    const accountId = this.config.getOrThrow<string>('R2_ACCOUNT_ID')
    const accessKeyId = this.config.getOrThrow<string>('R2_ACCESS_KEY_ID')
    const secretAccessKey = this.config.getOrThrow<string>('R2_SECRET_ACCESS_KEY')
    this.r2Bucket = this.config.getOrThrow<string>('R2_BUCKET')
    this.r2PublicUrl = this.config.get<string>('R2_PUBLIC_URL') ?? 'https://cdn.dotly.one'

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

    const userBySupabaseId = await this.prisma.user.findUnique({
      where: { supabaseId: userId },
      select: { id: true },
    })
    if (userBySupabaseId) return userBySupabaseId.id

    throw new UnauthorizedException('Authenticated user not found')
  }

  async findAllByUser(userId: string) {
    const internalUserId = await this.resolveInternalUserId(userId)
    // L-07: Cap at 100 cards to prevent unbounded memory/query time.
    // ENTERPRISE plan allows "unlimited" cards but in practice no user has
    // 100+ cards. If this becomes a real limit, add cursor-based pagination.
    return this.prisma.card.findMany({
      where: { userId: internalUserId },
      include: {
        theme: true,
        socialLinks: true,
        qrCode: true,
        _count: { select: { analytics: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
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
              fields: (dto.fields ?? {}) as Prisma.InputJsonValue,
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
    return card
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
      mergedFields = {
        ...existing,
        ...(dto.fields as Record<string, unknown>),
      } as Prisma.InputJsonValue
    }

    return this.prisma.card.update({
      where: { id },
      data: {
        ...(dto.handle !== undefined && { handle: dto.handle }),
        ...(dto.templateId !== undefined && { templateId: dto.templateId }),
        ...(mergedFields !== undefined && { fields: mergedFields }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
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
      },
      update: {
        ...(dto.primaryColor !== undefined && { primaryColor: dto.primaryColor }),
        ...(dto.secondaryColor !== undefined && { secondaryColor: dto.secondaryColor }),
        ...(dto.fontFamily !== undefined && { fontFamily: dto.fontFamily }),
        ...(dto.backgroundUrl !== undefined && { backgroundUrl: dto.backgroundUrl }),
        ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl }),
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
    // Same atomic guarantee as upsertSocialLinks.
    return this.prisma.$transaction(async (tx) => {
      await tx.mediaBlock.deleteMany({ where: { cardId: id } })
      return tx.mediaBlock.createMany({
        data: dto.blocks.map((b) => ({
          cardId: id,
          type: b.type,
          url: b.url,
          caption: b.caption,
          displayOrder: b.displayOrder,
        })),
      })
    })
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
    return result
  }

  async togglePublish(id: string, userId: string) {
    const card = await this.findById(id, userId)
    return this.prisma.card.update({
      where: { id },
      data: { isActive: !card.isActive },
    })
  }

  async publish(id: string, userId: string) {
    await this.findById(id, userId)
    return this.prisma.card.update({
      where: { id },
      data: { isActive: true },
    })
  }

  async unpublish(id: string, userId: string) {
    await this.findById(id, userId)
    return this.prisma.card.update({
      where: { id },
      data: { isActive: false },
    })
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
              take: 1,
            },
          },
        },
      },
    })
    if (!card) throw new NotFoundException('Card not found')

    // Extract team brand from first team membership
    const firstMembership = card.user?.teamMemberships?.[0]
    const team = firstMembership?.team
    let teamBrand: {
      brandName: string | null
      brandLogoUrl: string | null
      brandColor: string | null
      hideDotlyBranding: boolean
    } | null = null

    if (team) {
      const cfg = (team.brandConfig ?? {}) as Record<string, unknown>
      teamBrand = {
        brandName: (cfg['brandName'] as string | undefined) ?? team.name ?? null,
        brandLogoUrl: (cfg['logoUrl'] as string | undefined) ?? null,
        brandColor: (cfg['primaryColor'] as string | undefined) ?? null,
        hideDotlyBranding: (cfg['hideDotlyBranding'] as boolean | undefined) ?? false,
      }
    }

    // Strip internal user data from public response
    const { user: _user, ...publicCard } = card
    return { ...publicCard, teamBrand }
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

  async getUploadUrl(id: string, userId: string, filename: string, contentType: string) {
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
    })
    const uploadUrl = await getSignedUrl(this.r2Client, command, { expiresIn: 60 })
    return {
      uploadUrl,
      publicUrl: `${this.r2PublicUrl}/${key}`,
      contentType,
    }
  }

  async getVcard(handle: string): Promise<string> {
    // F-17: Fetch the card from DB via the DB-validated handle rather than
    // using the raw @Param handle directly in the Content-Disposition header.
    // findByHandle throws NotFoundException if the card doesn't exist or is
    // unpublished, so the handle used in the header is always a real DB value.
    const card = await this.findByHandle(handle)
    const dbHandle = card.handle // Use the DB value, not the raw URL param.
    const fields = card.fields as Record<string, string>

    // RFC 6350 §3.4: escape backslash, comma, semicolon, and newline in values
    const escapeVcard = (value: string): string =>
      value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')

    const vcard = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${escapeVcard(fields['name'] ?? '')}`,
      `TITLE:${escapeVcard(fields['title'] ?? '')}`,
      `ORG:${escapeVcard(fields['company'] ?? '')}`,
      `TEL:${escapeVcard(fields['phone'] ?? '')}`,
      `EMAIL:${escapeVcard(fields['email'] ?? '')}`,
      `URL:${escapeVcard(fields['website'] ?? '')}`,
      `NOTE:${escapeVcard(fields['bio'] ?? '')}`,
      'END:VCARD',
    ].join('\r\n')
    // Return an object so the controller can use both the vcard content and the
    // DB-validated handle for the Content-Disposition filename.
    return Object.assign(vcard, { _handle: dbHandle })
  }
}
