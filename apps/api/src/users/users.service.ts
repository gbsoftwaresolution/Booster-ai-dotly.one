import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { PrismaService } from '../prisma/prisma.service'
import { EmailService } from '../email/email.service'
import type { PrismaClient, User } from '@dotly/database'

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name)
  /** Supabase admin client — uses the service-role key (never exposed to browsers). */
  private readonly supabaseAdmin: SupabaseClient | null

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private config: ConfigService,
  ) {
    // F-18: Initialise the Supabase admin client so we can delete the auth user
    // during account deletion.  Without this, the Supabase session stays valid
    // and `findOrCreate` will recreate the DB record on the next authenticated
    // request — effectively making deletion a no-op.
    const supabaseUrl = this.config.get<string>('SUPABASE_URL')
    const serviceRoleKey = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')
    if (supabaseUrl && serviceRoleKey) {
      this.supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    } else {
      this.supabaseAdmin = null
      this.logger.warn(
        'SUPABASE_SERVICE_ROLE_KEY not set — deleteUserAccount will NOT revoke Supabase sessions',
      )
    }
  }

  async findOrCreate(supabaseId: string, email: string, name?: string): Promise<User> {
    const existing = await this.prisma.user.findUnique({ where: { supabaseId } })

    if (existing) {
      return existing
    }

    const user = await this.prisma.user.create({
      data: { supabaseId, email, name: name ?? null },
    })

    // Fire-and-forget welcome email
    void this.emailService
      .sendWelcomeEmail(email, name ?? (email.split('@')[0] ?? email))
      // MED-05: Mask the email address in the log — log only the domain part so
      // PII is not written to log aggregators.
      .catch((err) => {
        const maskedEmail = email.replace(/^[^@]+/, '***')
        this.logger.warn(`Welcome email failed for ${maskedEmail}: ${err instanceof Error ? err.message : err}`)
      })

    return user
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } })
  }

  async findBySupabaseId(supabaseId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { supabaseId } })
  }

  async savePushToken(userId: string, token: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { pushToken: token },
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

    return { user, cards, contacts, analyticsEventsSummary: { totalCount: analyticsEventCount } }
  }


  async updateProfile(userId: string, name: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { name },
    })
  }

  async deleteUserAccount(userId: string): Promise<void> {
    // Fetch the supabaseId before deleting DB rows so we can revoke the auth user.
    const dbUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { supabaseId: true },
    })

    // Wrapped in an interactive transaction so the entire cascade is atomic.
    // If any step fails (e.g. DB constraint violation) all prior deletes are
    // rolled back and the user's data remains intact.
    await this.prisma.$transaction(async (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => {
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

      // 3. Contacts
      await tx.contact.deleteMany({ where: { ownerUserId: userId } })

      // 4. Cards (cascades themes, socialLinks, mediaBlocks, qrCode via DB onDelete: Cascade)
      await tx.card.deleteMany({ where: { userId } })

      // 5. Audit logs
      await tx.auditLog.deleteMany({ where: { userId } })

      // 6. User (cascades subscription, customDomains, teamMemberships via onDelete: Cascade)
      await tx.user.delete({ where: { id: userId } })
    })

    // F-18: Delete the Supabase Auth user AFTER the DB transaction succeeds.
    // This invalidates all existing JWTs for this user and prevents
    // findOrCreate from recreating the DB record on any subsequent request.
    // We do this outside the Prisma transaction because it is an external call
    // and cannot be rolled back; if it fails we log the error but do not
    // re-raise (the DB data is already gone, which is the primary obligation).
    if (this.supabaseAdmin && dbUser?.supabaseId) {
      const { error } = await this.supabaseAdmin.auth.admin.deleteUser(dbUser.supabaseId)
      if (error) {
        this.logger.error(
          `deleteUserAccount: failed to delete Supabase auth user ${dbUser.supabaseId}: ${error.message}`,
        )
      }
    }
  }
}
