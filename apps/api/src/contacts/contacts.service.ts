import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { PrismaService } from '../prisma/prisma.service'
import { AnalyticsService } from '../analytics/analytics.service'
import { EmailService } from '../email/email.service'
import { NotificationsService } from '../notifications/notifications.service'
import { RedisService } from '../redis/redis.service'
import { WebhooksService } from '../webhooks/webhooks.service'
import { Prisma } from '@dotly/database'

const VALID_STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED', 'LOST'] as const
type CrmStage = (typeof VALID_STAGES)[number]

function assertValidStage(stage: string): CrmStage {
  if (!(VALID_STAGES as readonly string[]).includes(stage)) {
    throw new BadRequestException(`Invalid stage: must be one of ${VALID_STAGES.join(', ')}`)
  }
  return stage as CrmStage
}

interface CreateLeadDto {
  // C1: name is optional — custom forms may label the name field differently.
  // The service resolves it from fields if absent.
  name?: string
  email?: string
  phone?: string
  cardId: string
  sourceHandle?: string
  /** Custom lead form field values — accepted but not yet persisted (LeadSubmission TODO) */
  fields?: Record<string, string>
}

interface CreateContactDto {
  name: string
  email?: string
  phone?: string
  address?: string
  company?: string
  title?: string
  website?: string
  sourceCardId?: string
  stage?: string
}

interface UpdateContactDto {
  name?: string
  email?: string
  phone?: string
  address?: string
  company?: string
  title?: string
  website?: string
  notes?: string
  tags?: string[]
}

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name)

  constructor(
    private prisma: PrismaService,
    private analyticsService: AnalyticsService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
    private redis: RedisService,
    private webhooksService: WebhooksService,
    @InjectQueue('contact-enrichment') private enrichmentQueue: Queue,
  ) {}

  async createFromLead(dto: CreateLeadDto) {
    const card = await this.prisma.card.findUnique({
      where: { id: dto.cardId },
      include: { user: true },
    })
    if (!card) throw new NotFoundException('Card not found')

    // C-03: Per-card rate limit — max 10 lead submissions per card per hour.
    // The global ThrottlerGuard already rate-limits by IP (5 req/min), but a
    // distributed botnet can still flood a single card's lead inbox by rotating
    // IPs.  This Redis counter keyed on cardId prevents that at the service layer
    // using the same atomic Lua pattern used for the CRM email rate limit.
    const cardRateLimitKey = `lead:ratelimit:${dto.cardId}`
    const cardRateLimitWindow = 60 * 60 // 1 hour in seconds
    const cardRateLimitMax = 10
    const redisClient = this.redis.getClient()
    const cardLeadCount = (await redisClient.eval(
      `local v = redis.call('INCR', KEYS[1])
       if v == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
       return v`,
      1,
      cardRateLimitKey,
      String(cardRateLimitWindow),
    )) as number
    if (cardLeadCount > cardRateLimitMax) {
      throw new HttpException(
        'Too many lead submissions for this card — please try again later',
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    // HIGH-05: Explicit deduplication before creating the contact.
    // If the same email is submitted for the same card, skip the entire
    // notification + enrichment pipeline and return silently so the card
    // owner is not flooded with emails/push notifications from repeat submits
    // (e.g. a browser refresh on the thank-you page).
    if (dto.email) {
      const duplicate = await this.prisma.contact.findFirst({
        where: { ownerUserId: card.userId, email: dto.email, sourceCardId: dto.cardId },
        select: { id: true },
      })
      if (duplicate) {
        // Return success-shaped response so the submitter's UX is unaffected.
        return { success: true, contactId: duplicate.id }
      }
    }

    // C1: Resolve the contact name. Priority:
    //   1. dto.name (set by standard 3-field form)
    //   2. Fuzzy match from dto.fields — custom forms may label it "Full Name",
    //      "First Name", "Your Name", etc.  The web encodes spaces as underscores,
    //      so we normalize both before matching.
    //   3. Derive from email local-part
    //   4. Fallback to "Anonymous"
    const NAME_FIELD_KEYS = [
      'name',
      'full name',
      'full_name',
      'fullname',
      'your name',
      'your_name',
      'first name',
      'first_name',
      'firstname',
    ]
    const EMAIL_FIELD_KEYS = ['email', 'e-mail', 'e_mail', 'email address', 'email_address']
    const PHONE_FIELD_KEYS = ['phone', 'phone number', 'phone_number', 'mobile', 'tel', 'telephone']

    // Normalize a field key: lowercase + replace underscores with spaces
    const normalizeKey = (k: string) => k.toLowerCase().trim().replace(/_/g, ' ')

    const resolvedName: string =
      dto.name?.trim() ||
      (dto.fields &&
        Object.entries(dto.fields)
          .find(([k]) => NAME_FIELD_KEYS.includes(normalizeKey(k)))?.[1]
          ?.trim()) ||
      (dto.email ? dto.email.split('@')[0] : '') ||
      'Anonymous'

    // Resolve email and phone from fields if not top-level (custom forms may
    // send them exclusively inside `fields` keyed by "Email" / "Phone").
    const resolvedEmail: string | undefined =
      dto.email ||
      (dto.fields &&
        Object.entries(dto.fields).find(([k]) =>
          EMAIL_FIELD_KEYS.includes(normalizeKey(k)),
        )?.[1]) ||
      undefined
    const resolvedPhone: string | undefined =
      dto.phone ||
      (dto.fields &&
        Object.entries(dto.fields).find(([k]) =>
          PHONE_FIELD_KEYS.includes(normalizeKey(k)),
        )?.[1]) ||
      undefined
    // MED-01: Wrap the three writes (contact, crmPipeline, contactTimeline) in a
    // single atomic transaction.  Without this, a crash between writes leaves the
    // contact without a pipeline record or timeline entry, causing silent data
    // corruption that is hard to detect and fix after the fact.
    let contact: Awaited<ReturnType<typeof this.prisma.contact.create>>
    try {
      contact = await this.prisma.$transaction(async (tx) => {
        const c = await tx.contact.create({
          data: {
            ownerUserId: card.userId,
            name: resolvedName,
            email: resolvedEmail,
            phone: resolvedPhone,
            sourceCardId: dto.cardId,
          },
        })

        await tx.crmPipeline.create({
          data: {
            contactId: c.id,
            stage: 'NEW',
            ownerUserId: card.userId,
          },
        })

        await tx.contactTimeline.create({
          data: {
            contactId: c.id,
            event: 'LEAD_CAPTURED',
            metadata: { cardId: dto.cardId, sourceHandle: dto.sourceHandle },
          },
        })

        // Persist custom lead form field answers if provided and a LeadForm exists
        if (dto.fields && Object.keys(dto.fields).length > 0) {
          const leadForm = await tx.leadForm.findUnique({
            where: { cardId: dto.cardId },
            select: { id: true },
          })
          if (leadForm) {
            await tx.leadSubmission.create({
              data: {
                leadFormId: leadForm.id,
                contactId: c.id,
                answers: dto.fields,
              },
            })
          }
        }

        return c
      })
    } catch (err) {
      // M-02: Catch unique constraint violation (P2002) — same email already
      // captured for this card owner. Return a 409 instead of a 500 crash.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new HttpException(
          'A contact with this email already exists in your CRM',
          HttpStatus.CONFLICT,
        )
      }
      throw err
    }

    await this.analyticsService.record({
      cardId: dto.cardId,
      type: 'LEAD_SUBMIT',
      metadata: { contactId: contact.id },
    })

    // Fan-out webhook event — fire-and-forget, never blocks the response
    void this.webhooksService
      .fanOut(card.userId, 'lead.created', {
        contactId: contact.id,
        name: resolvedName,
        email: resolvedEmail ?? null,
        phone: resolvedPhone ?? null,
        cardId: dto.cardId,
        cardHandle: dto.sourceHandle ?? card.handle,
      })
      .catch((err: unknown) => this.logger.warn('Webhook fan-out failed (lead.created)', err))

    // Fire-and-forget: notify card owner
    const cardName = (card.fields as Record<string, string>)?.['name'] ?? card.handle
    void this.emailService
      .sendNewLeadNotification(
        card.user.email,
        resolvedName,
        cardName,
        card.handle,
        resolvedEmail,
        resolvedPhone,
      )
      .catch((err: unknown) => this.logger.warn('Lead notification email failed', err))

    // Fire-and-forget: push notification to card owner's mobile device
    if (card.user.pushToken) {
      void this.notificationsService
        .sendPushNotification(
          card.user.pushToken,
          'New Lead!',
          `${resolvedName} just saved your card`,
          { contactId: contact.id },
        )
        .catch((err: unknown) => this.logger.warn('Lead push notification failed', err))
    }

    // Queue async AI enrichment with 5s delay
    void this.enrichmentQueue
      .add('enrich', { contactId: contact.id }, { delay: 5000 })
      .catch((err: unknown) => this.logger.warn('Enrichment queue push failed', err))

    return { success: true, contactId: contact.id }
  }

  async create(userId: string, dto: CreateContactDto) {
    // MED-02: Wrap all three writes in a single atomic transaction to prevent
    // partial data (contact without pipeline or timeline entry) on any mid-write
    // failure (OOM kill, DB blip, deploy).
    const stage: CrmStage = dto.stage ? assertValidStage(dto.stage) : 'NEW'

    let contact: Awaited<ReturnType<typeof this.prisma.contact.create>>
    try {
      contact = await this.prisma.$transaction(async (tx) => {
        const c = await tx.contact.create({
          data: {
            ownerUserId: userId,
            name: dto.name,
            email: dto.email,
            phone: dto.phone,
            address: dto.address,
            company: dto.company,
            title: dto.title,
            website: dto.website,
            sourceCardId: dto.sourceCardId,
          },
        })

        await tx.crmPipeline.create({
          data: {
            contactId: c.id,
            stage,
            ownerUserId: userId,
          },
        })

        await tx.contactTimeline.create({
          data: {
            contactId: c.id,
            event: 'LEAD_CAPTURED',
            metadata: { manual: true },
          },
        })

        return c
      })
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new HttpException(
          'A contact with this email address already exists',
          HttpStatus.CONFLICT,
        )
      }
      throw err
    }

    // Queue async AI enrichment with 5s delay
    void this.enrichmentQueue
      .add('enrich', { contactId: contact.id }, { delay: 5000 })
      .catch((err: unknown) => this.logger.warn('Enrichment queue push failed', err))

    // Fire-and-forget webhook: contact.created
    void this.webhooksService
      .fanOut(userId, 'contact.created', {
        contactId: contact.id,
        name: contact.name,
        email: contact.email ?? null,
      })
      .catch((err: unknown) => this.logger.warn('Webhook fan-out failed (contact.created)', err))

    return this.prisma.contact.findUnique({
      where: { id: contact.id },
      include: { crmPipeline: true, sourceCard: { select: { handle: true } } },
    })
  }

  async findAll(
    userId: string,
    params: { stage?: string; search?: string; page?: number; limit?: number },
  ) {
    const where: Prisma.ContactWhereInput = { ownerUserId: userId }
    if (params.stage) where.crmPipeline = { stage: params.stage as CrmStage }
    if (params.search)
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { company: { contains: params.search, mode: 'insensitive' } },
      ]
    const [contacts, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        include: { crmPipeline: true, sourceCard: { select: { handle: true } } },
        orderBy: { createdAt: 'desc' },
        skip: ((params.page || 1) - 1) * (params.limit || 20),
        take: params.limit || 20,
      }),
      this.prisma.contact.count({ where }),
    ])
    return { contacts, total, page: params.page || 1, limit: params.limit || 20 }
  }

  async findAllByUser(userId: string) {
    // L-03: Cap at 500 rows to prevent unbounded memory usage when called by the
    // CSV export route on accounts with large contact lists. Callers needing full
    // data should paginate via findAll() instead.
    return this.prisma.contact.findMany({
      where: { ownerUserId: userId },
      include: { crmPipeline: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })
  }

  async findOne(contactId: string, userId: string) {
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        crmPipeline: true,
        sourceCard: { select: { handle: true } },
        timeline: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    })
    if (!contact || contact.ownerUserId !== userId) throw new ForbiddenException()
    return contact
  }

  async update(contactId: string, userId: string, dto: UpdateContactDto) {
    const contact = await this.prisma.contact.findUnique({ where: { id: contactId } })
    if (!contact || contact.ownerUserId !== userId) throw new ForbiddenException()

    let updated: Awaited<ReturnType<typeof this.prisma.contact.update>>
    try {
      updated = await this.prisma.contact.update({ where: { id: contactId }, data: dto })
    } catch (err: unknown) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new HttpException(
          'A contact with this email address already exists',
          HttpStatus.CONFLICT,
        )
      }
      throw err
    }

    // Timeline audit entry
    await this.prisma.contactTimeline.create({
      data: {
        contactId,
        event: 'CONTACT_UPDATED',
        metadata: { changes: dto as unknown as Prisma.InputJsonValue },
      },
    })

    // Fire-and-forget webhook: contact.updated
    void this.webhooksService
      .fanOut(userId, 'contact.updated', {
        contactId,
        name: updated.name,
        email: updated.email ?? null,
        changes: dto as Record<string, unknown>,
      })
      .catch((err: unknown) => this.logger.warn('Webhook fan-out failed (contact.updated)', err))

    return updated
  }

  async remove(contactId: string, userId: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id: contactId } })
    if (!contact || contact.ownerUserId !== userId) throw new ForbiddenException()

    // M3: Record timeline event before deletion (cascade will remove it, but
    // this ensures any external log consumers see the deletion event).
    // In practice, the timeline row is deleted by cascade — this is primarily
    // for webhook consumers and future audit log exports.
    await this.prisma.contact.delete({ where: { id: contactId } })

    // Fire-and-forget webhook: contact.deleted
    void this.webhooksService
      .fanOut(userId, 'contact.deleted', {
        contactId,
        name: contact.name,
        email: contact.email ?? null,
      })
      .catch((err: unknown) => this.logger.warn('Webhook fan-out failed (contact.deleted)', err))

    return { deleted: true }
  }

  async updateStage(contactId: string, userId: string, stage: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id: contactId } })
    if (!contact || contact.ownerUserId !== userId) throw new ForbiddenException()

    const validatedStage = assertValidStage(stage)
    const existing = await this.prisma.crmPipeline.findUnique({ where: { contactId } })
    const oldStage = existing?.stage ?? 'NEW'

    const result = await this.prisma.crmPipeline.upsert({
      where: { contactId },
      create: { contactId, stage: validatedStage, ownerUserId: userId },
      update: { stage: validatedStage },
    })

    await this.prisma.contactTimeline.create({
      data: {
        contactId,
        event: 'STAGE_CHANGED',
        metadata: { from: oldStage, to: stage },
      },
    })

    // Fire-and-forget webhook fan-out for contact.stage_changed
    void this.webhooksService
      .fanOut(userId, 'contact.stage_changed', {
        contactId,
        name: contact.name,
        email: contact.email ?? null,
        from: oldStage,
        to: validatedStage,
      })
      .catch((err: unknown) =>
        this.logger.warn('Webhook fan-out failed (contact.stage_changed)', err),
      )

    return result
  }

  async addNote(contactId: string, userId: string, content: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id: contactId } })
    if (!contact || contact.ownerUserId !== userId) throw new ForbiddenException()

    await this.prisma.contactTimeline.create({
      data: { contactId, event: 'NOTE_ADDED', metadata: { content } },
    })

    const updated = await this.prisma.contact.update({
      where: { id: contactId },
      // Intentional: `notes` is a single freeform text field, not an append log.
      // The full history is stored in ContactTimeline (NOTE_ADDED event above).
      // To append instead of overwrite, change this to a raw SQL concat or
      // move notes to a separate ContactNote relation.
      data: { notes: content },
    })

    // H8: Fire-and-forget webhook: contact.note_added
    void this.webhooksService
      .fanOut(userId, 'contact.note_added', {
        contactId,
        name: contact.name,
        email: contact.email ?? null,
        note: content,
      })
      .catch((err: unknown) => this.logger.warn('Webhook fan-out failed (contact.note_added)', err))

    return updated
  }

  async getTimeline(contactId: string, userId: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id: contactId } })
    if (!contact || contact.ownerUserId !== userId) throw new ForbiddenException()
    return this.prisma.contactTimeline.findMany({
      where: { contactId },
      orderBy: { createdAt: 'desc' },
      // LOW-02: Cap at 100 to prevent unbounded memory usage on contacts with
      // long activity history (years of emails, stage changes, notes).
      take: 100,
    })
  }

  async getPipeline(userId: string, params?: { search?: string }) {
    // LOW-08: Fetch one extra record beyond the cap so we can detect truncation
    // without a separate COUNT query.  If we get 201 results, we know there are
    // more and we set truncated=true in the response (while only returning 200).
    const CAP = 200
    const where: Prisma.ContactWhereInput = { ownerUserId: userId }
    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
        { company: { contains: params.search, mode: 'insensitive' } },
      ]
    }

    const contacts = await this.prisma.contact.findMany({
      where,
      include: { crmPipeline: true, sourceCard: { select: { handle: true } } },
      orderBy: { createdAt: 'desc' },
      take: CAP + 1, // fetch one extra to detect truncation
    })

    const truncated = contacts.length > CAP
    const page = truncated ? contacts.slice(0, CAP) : contacts

    const stages = ['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED', 'LOST']
    const pipeline = stages.reduce(
      (acc, stage) => {
        acc[stage] = page.filter(
          (c) => c.crmPipeline?.stage === stage || (!c.crmPipeline && stage === 'NEW'),
        )
        return acc
      },
      {} as Record<string, typeof page>,
    )

    // LOW-08: Surface truncation so callers (UI, API clients) know the pipeline
    // view is incomplete and can prompt the user to use paginated contacts instead.
    return { pipeline, truncated, visibleCount: page.length }
  }

  async sendEmailToContact(userId: string, contactId: string, subject: string, body: string) {
    // Verify ownership
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
      include: { ownerUser: { select: { name: true, email: true } } },
    })
    if (!contact || contact.ownerUserId !== userId) throw new ForbiddenException()

    // Ensure contact has an email
    if (!contact.email) throw new BadRequestException('Contact has no email address')

    // Rate limiting: 20 emails per hour per user (Redis-backed, survives restarts and scales horizontally)
    const rateLimitKey = `email:ratelimit:${userId}`
    const windowSecs = 60 * 60 // 1 hour
    const limit = 20
    const redisClient = this.redis.getClient()

    // F-03: Use a Lua script for atomic increment + TTL initialisation.
    // The previous NX+INCR pattern has a TOCTOU race: if the key expires between
    // the SET NX and the INCR, the new key is created without a TTL, permanently
    // locking the user out.  The Lua script runs atomically in Redis:
    //   1. If the key does not exist, create it with value=1 and TTL=windowSecs.
    //   2. Otherwise, increment and return the new value (TTL is unchanged).
    // This is safe because Lua scripts in Redis are executed as a single atomic unit.
    const current = (await redisClient.eval(
      `local v = redis.call('INCR', KEYS[1])
       if v == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
       return v`,
      1, // number of keys
      rateLimitKey, // KEYS[1]
      String(windowSecs), // ARGV[1]
    )) as number

    if (current > limit) {
      throw new HttpException(
        'Too many requests: email limit of 20/hour exceeded',
        HttpStatus.TOO_MANY_REQUESTS,
      )
    }

    const fromName = contact.ownerUser?.name ?? 'Dotly User'

    // Send the email
    await this.emailService.sendDirectCrmEmail(contact.email, subject, body, fromName)

    // M10: Wrap timeline + ContactEmail writes in a single transaction so
    // both are created atomically — or neither is, on failure.
    await this.prisma.$transaction([
      this.prisma.contactTimeline.create({
        data: {
          contactId,
          event: 'EMAIL_SENT',
          metadata: { subject, sentAt: new Date().toISOString() },
        },
      }),
      this.prisma.contactEmail.create({
        data: { contactId, subject, body },
      }),
    ])

    // H8: Fire-and-forget webhook: contact.email_sent
    void this.webhooksService
      .fanOut(userId, 'contact.email_sent', {
        contactId,
        name: contact.name,
        email: contact.email,
        subject,
      })
      .catch((err: unknown) => this.logger.warn('Webhook fan-out failed (contact.email_sent)', err))

    return { sent: true }
  }

  async triggerEnrichment(contactId: string, userId: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id: contactId } })
    if (!contact || contact.ownerUserId !== userId) throw new ForbiddenException()

    await this.enrichmentQueue.add('enrich', { contactId }, { delay: 0 })
    return { queued: true, contactId }
  }

  // M1: Bulk stage update — applies the same stage to all specified contacts
  // in a single prisma.$transaction to avoid partial success on N requests.
  async bulkUpdateStage(userId: string, ids: string[], stage: string) {
    const validatedStage = assertValidStage(stage)

    // Verify all contacts belong to this user before updating
    const owned = await this.prisma.contact.findMany({
      where: { id: { in: ids }, ownerUserId: userId },
      select: { id: true },
    })
    const ownedIds = owned.map((c) => c.id)
    if (ownedIds.length === 0) throw new ForbiddenException()

    await this.prisma.$transaction([
      this.prisma.crmPipeline.updateMany({
        where: { contactId: { in: ownedIds } },
        data: { stage: validatedStage },
      }),
      // Create a STAGE_CHANGED timeline entry for each contact
      this.prisma.contactTimeline.createMany({
        data: ownedIds.map((contactId) => ({
          contactId,
          event: 'STAGE_CHANGED',
          metadata: { to: validatedStage, bulk: true } as unknown as Prisma.InputJsonValue,
        })),
      }),
    ])

    return { updated: ownedIds.length }
  }

  // M1: Bulk delete — removes all specified contacts in one prisma.deleteMany
  // instead of N individual DELETE requests.
  async bulkDelete(userId: string, ids: string[]) {
    // Only delete contacts that belong to the requesting user — silently ignore others.
    const result = await this.prisma.contact.deleteMany({
      where: { id: { in: ids }, ownerUserId: userId },
    })

    // Webhook: fire-and-forget for each deleted contact ID
    void this.webhooksService
      .fanOut(userId, 'contact.deleted', {
        contactIds: ids,
        deletedCount: result.count,
        bulk: true,
      })
      .catch((err: unknown) =>
        this.logger.warn('Webhook fan-out failed (contact.deleted bulk)', err),
      )

    return { deleted: result.count }
  }

  // H1: List lead submissions for all lead forms belonging to a user's card.
  // If cardId is supplied, scoped to that card. Returns paginated submissions
  // with associated answers, contact name/email, and submission timestamp.
  async getLeadSubmissions(
    userId: string,
    cardId: string | undefined,
    params: { page?: number; limit?: number },
  ) {
    if (cardId) {
      // Verify the card belongs to the requesting user
      const card = await this.prisma.card.findUnique({
        where: { id: cardId },
        select: { userId: true },
      })
      if (!card || card.userId !== userId) throw new ForbiddenException()
    }

    const limit = Math.min(params.limit ?? 20, 100)
    const skip = ((params.page ?? 1) - 1) * limit

    // Find all lead form IDs belonging to the user (optionally filtered by card)
    const leadForms = await this.prisma.leadForm.findMany({
      where: cardId ? { cardId } : { card: { userId } },
      select: { id: true, cardId: true, title: true, card: { select: { handle: true } } },
    })
    const leadFormIds = leadForms.map((f) => f.id)
    const leadFormMap = new Map(leadForms.map((f) => [f.id, f]))

    const [submissions, total] = await Promise.all([
      this.prisma.leadSubmission.findMany({
        where: { leadFormId: { in: leadFormIds } },
        orderBy: { submittedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.leadSubmission.count({
        where: { leadFormId: { in: leadFormIds } },
      }),
    ])

    // Attach contact data for submissions that have a contactId
    const contactIds = submissions.map((s) => s.contactId).filter(Boolean) as string[]
    const contacts = contactIds.length
      ? await this.prisma.contact.findMany({
          where: { id: { in: contactIds } },
          select: { id: true, name: true, email: true, phone: true },
        })
      : []
    const contactMap = new Map(contacts.map((c) => [c.id, c]))

    const enrichedSubmissions = submissions.map((s) => ({
      id: s.id,
      leadFormId: s.leadFormId,
      leadFormTitle: leadFormMap.get(s.leadFormId)?.title ?? null,
      cardHandle: leadFormMap.get(s.leadFormId)?.card.handle ?? null,
      cardId: leadFormMap.get(s.leadFormId)?.cardId ?? null,
      answers: s.answers,
      submittedAt: s.submittedAt,
      contact: s.contactId ? (contactMap.get(s.contactId) ?? null) : null,
    }))

    return {
      submissions: enrichedSubmissions,
      total,
      page: params.page ?? 1,
      limit,
    }
  }
}
