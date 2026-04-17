import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { EmailService } from '../email/email.service'
import { Prisma, type PrismaClient, type User } from '@dotly/database'
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3'
import type { UserMeResponse } from '@dotly/types'

const LEGACY_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  plan: true,
  walletAddress: true,
  pushToken: true,
  createdAt: true,
  updatedAt: true,
} as const

type LegacyUserRecord = Prisma.UserGetPayload<{ select: typeof LEGACY_USER_SELECT }>

const LEGACY_USER_PROFILE_COLUMNS = new Set([
  'users.country',
  'users.timezone',
  'users.notifLeadCaptured',
  'users.notifWeeklyDigest',
  'users.notifProductUpdates',
])

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name)
  /** R2 client used only for account-deletion cleanup. */
  private readonly r2Client: S3Client | null
  private readonly r2Bucket: string
  private readonly allowedAssetHosts: Set<string>

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private config: ConfigService,
  ) {
    // B8: Initialise a minimal R2 client for cleaning up uploaded media on
    // account deletion.  All uploads use the key prefix `${cardId}/...` so we
    // can list and delete every object for each card before the card rows are
    // hard-deleted from the DB.
    const accountId = this.config.get<string>('R2_ACCOUNT_ID')
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID')
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY')
    this.r2Bucket = this.config.get<string>('R2_BUCKET') ?? ''
    if (accountId && accessKeyId && secretAccessKey && this.r2Bucket) {
      this.r2Client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      })
    } else {
      this.r2Client = null
      this.logger.warn(
        'R2 credentials not fully configured — uploaded media will NOT be deleted on account deletion',
      )
    }

    const r2Url = this.config.get<string>('R2_PUBLIC_URL') ?? 'https://cdn.dotly.one'
    const allowedAssetHosts = new Set<string>(['cdn.dotly.one'])
    try {
      const normalized = r2Url.startsWith('http') ? r2Url : `https://${r2Url}`
      allowedAssetHosts.add(new URL(normalized).hostname)
    } catch {
      /* ignore invalid config */
    }
    this.allowedAssetHosts = allowedAssetHosts
  }

  private sanitizeAvatarUrl(value: string | null | undefined): string | null {
    if (!value) return null
    try {
      const url = new URL(value)
      if (['http:', 'https:'].includes(url.protocol) && this.allowedAssetHosts.has(url.hostname)) {
        return url.toString()
      }
    } catch {
      /* ignore */
    }
    return null
  }

  private sanitizeUser<T extends { avatarUrl?: string | null }>(user: T | null): T | null {
    if (!user) return null
    return {
      ...user,
      avatarUrl: this.sanitizeAvatarUrl(user.avatarUrl ?? null),
    }
  }

  private isMissingUserProfileColumnError(error: unknown): boolean {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2022') {
      return false
    }

    const column =
      error.meta && typeof error.meta === 'object' && 'column' in error.meta
        ? String(error.meta.column)
        : ''

    return LEGACY_USER_PROFILE_COLUMNS.has(column)
  }

  private withMissingProfileColumns(user: LegacyUserRecord | null): User | null {
    if (!user) return null
    return {
      ...user,
      country: null,
      timezone: null,
      notifLeadCaptured: true,
      notifWeeklyDigest: true,
      notifProductUpdates: false,
    } as User
  }

  private async findUniqueCompat(where: Prisma.UserWhereUniqueInput): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({ where })
    } catch (error) {
      if (!this.isMissingUserProfileColumnError(error)) throw error

      const legacyUser = await this.prisma.user.findUnique({
        where,
        select: LEGACY_USER_SELECT,
      })
      return this.withMissingProfileColumns(legacyUser)
    }
  }

  async findById(id: string): Promise<User | null> {
    return this.sanitizeUser(await this.findUniqueCompat({ id })) as User | null
  }

  async getMe(id: string): Promise<UserMeResponse | null> {
    const user = await this.findById(id)
    if (!user) return null
    return {
      id: user.id,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      name: user.name,
      avatarUrl: user.avatarUrl,
      plan: user.plan,
      walletAddress: user.walletAddress,
      country: user.country ?? null,
      timezone: user.timezone ?? null,
      notifLeadCaptured: user.notifLeadCaptured ?? null,
      notifWeeklyDigest: user.notifWeeklyDigest ?? null,
      notifProductUpdates: user.notifProductUpdates ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }
  }

  async savePushToken(userId: string, token: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { pushToken: token },
    })
  }

  async clearPushToken(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { pushToken: null },
    })
  }

  async exportUserData(userId: string): Promise<object> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        plan: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    const [cards, contacts, analyticsEventCount] = await Promise.all([
      // MED-08: Cap cards at 200 — exporting thousands of cards in a single JSON
      // payload is both a DoS risk and unnecessary for GDPR Article 15 compliance.
      // A user legitimately needing more can use the paginated API.
      this.prisma.card.findMany({
        where: { userId },
        include: { theme: true, socialLinks: true, qrCode: true },
        take: 200,
      }),
      // MED-08: Cap contacts at 5 000 — prevents a single export request from
      // reading an unbounded number of rows and exhausting DB memory/bandwidth.
      this.prisma.contact.findMany({ where: { ownerUserId: userId }, take: 5000 }),
      // M-08: Return only the aggregate count rather than up to 1000 raw rows.
      // Raw analytics events contain ipHash values and other quasi-PII; the
      // GDPR obligation is to tell the user *that* data was collected, not to
      // dump the entire raw log. A summary satisfies Article 15 without leaking
      // the data of other visitors (who may have the same IP hash).
      this.prisma.analyticsEvent.count({ where: { card: { userId } } }),
    ])

    return {
      user: this.sanitizeUser(user),
      cards,
      contacts,
      analyticsEventsSummary: { totalCount: analyticsEventCount },
    }
  }

  async updateProfile(
    userId: string,
    data: {
      name?: string
      country?: string | null
      timezone?: string | null
      notifLeadCaptured?: boolean
      notifWeeklyDigest?: boolean
      notifProductUpdates?: boolean
    },
  ): Promise<UserMeResponse | null> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data,
      })
      return this.getMe(userId)
    } catch (error) {
      if (!this.isMissingUserProfileColumnError(error)) throw error

      const legacyData: { name?: string } = {}
      if (data.name !== undefined) legacyData.name = data.name

      if (Object.keys(legacyData).length === 0) {
        const existing = await this.findById(userId)
        if (!existing) {
          throw error
        }
        return this.getMe(userId)
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: legacyData,
        select: LEGACY_USER_SELECT,
      })
      return this.getMe(userId)
    }
  }

  async deleteUserAccount(userId: string): Promise<void> {
    // B8: Collect all card IDs for this user BEFORE deleting DB rows so we can
    // clean up R2 objects afterwards.  We do this outside the transaction so
    // that a failure here (e.g. DB query error) doesn't silently skip cleanup.
    const userCards = await this.prisma.card.findMany({
      where: { userId },
      select: { id: true },
    })

    // Wrapped in an interactive transaction so the entire cascade is atomic.
    // If any step fails (e.g. DB constraint violation) all prior deletes are
    // rolled back and the user's data remains intact.
    await this.prisma.$transaction(
      async (
        tx: Omit<
          PrismaClient,
          '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
        >,
      ) => {
        // 1. Analytics events (via cards)
        await tx.analyticsEvent.deleteMany({
          where: { card: { userId } },
        })

        // 2. Contact-related records
        const contacts = await tx.contact.findMany({
          where: { ownerUserId: userId },
          select: { id: true },
        })
        const contactIds = contacts.map((c) => c.id)
        if (contactIds.length > 0) {
          await tx.contactEmail.deleteMany({ where: { contactId: { in: contactIds } } })
          await tx.contactTimeline.deleteMany({ where: { contactId: { in: contactIds } } })
          await tx.crmPipeline.deleteMany({ where: { contactId: { in: contactIds } } })
        }

        // 3. Contacts (cascades ContactNote, ContactTask, Deal, ContactCustomFieldValue
        //    via DB onDelete: Cascade)
        await tx.contact.deleteMany({ where: { ownerUserId: userId } })

        // 3a. Owner-scoped CRM objects that have no DB-level User FK and therefore
        //     are NOT automatically cleaned up by the tx.user.delete cascade below.
        //     These must be deleted explicitly to satisfy GDPR right-to-erasure and
        //     to avoid orphaned rows that reference the deleted userId.

        // Scheduling: bookings contain guest PII — delete them before the type rows.
        await tx.booking.deleteMany({ where: { ownerUserId: userId } })
        await tx.availabilityRule.deleteMany({
          where: { appointmentType: { ownerUserId: userId } },
        })
        await tx.appointmentType.deleteMany({ where: { ownerUserId: userId } })

        // Custom field definitions (values already gone with contacts above)
        await tx.contactCustomField.deleteMany({ where: { ownerUserId: userId } })

        // Pipeline definitions (CrmPipeline join rows already gone with contacts above)
        await tx.pipeline.deleteMany({ where: { ownerUserId: userId } })

        // Email templates
        await tx.emailTemplate.deleteMany({ where: { ownerUserId: userId } })

        // 4. Cards (cascades themes, socialLinks, mediaBlocks, qrCode via DB onDelete: Cascade)
        await tx.card.deleteMany({ where: { userId } })

        // 5. Audit logs
        await tx.auditLog.deleteMany({ where: { userId } })

        // 6. User (cascades subscription, customDomains, teamMemberships via onDelete: Cascade)
        await tx.user.delete({ where: { id: userId } })
      },
    )

    // B8: Delete R2 objects for every card the user owned.  This runs AFTER the
    // DB transaction so orphaned objects only accumulate if R2 deletion fails
    // (not the reverse — a DB rollback would not leave ghost R2 objects).
    // We log failures but never re-throw: the DB deletion already succeeded and
    // re-raising would give the caller a misleading error.
    if (this.r2Client && userCards.length > 0) {
      await this.deleteUserR2Objects(userCards.map((c) => c.id))
    }
  }

  /**
   * B8: List and delete all R2 objects under each card's key prefix.
   * R2 keys follow the pattern `${cardId}/...` (set by CardsService).
   * Uses paginated ListObjectsV2 (max 1000 keys per page) and batched
   * DeleteObjects (up to 1000 per request — the S3 API limit).
   */
  private async deleteUserR2Objects(cardIds: string[]): Promise<void> {
    if (!this.r2Client) return
    for (const cardId of cardIds) {
      try {
        let continuationToken: string | undefined
        do {
          const listResp = await this.r2Client.send(
            new ListObjectsV2Command({
              Bucket: this.r2Bucket,
              Prefix: `${cardId}/`,
              ContinuationToken: continuationToken,
            }),
          )
          const objects = listResp.Contents ?? []
          if (objects.length > 0) {
            await this.r2Client.send(
              new DeleteObjectsCommand({
                Bucket: this.r2Bucket,
                Delete: {
                  Objects: objects.map((o) => ({ Key: o.Key! })),
                  Quiet: true,
                },
              }),
            )
          }
          continuationToken = listResp.IsTruncated ? listResp.NextContinuationToken : undefined
        } while (continuationToken)
      } catch (err) {
        this.logger.error(
          `deleteUserR2Objects: failed to delete R2 objects for card ${cardId}: ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }
  }
}
