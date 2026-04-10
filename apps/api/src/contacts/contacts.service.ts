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
import { randomBytes } from 'crypto'
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
  /** Custom lead form field values — persisted as LeadSubmissionAnswer rows when a matching LeadForm exists */
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
  notes?: string
  tags?: string[]
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

function trimRequiredTemplateField(value: string, fieldName: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new BadRequestException(`${fieldName} is required`)
  return trimmed
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
            notes: dto.notes,
            tags: dto.tags ?? [],
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
    params: { stage?: string; search?: string; page?: number; limit?: number; tag?: string },
  ) {
    const where: Prisma.ContactWhereInput = { ownerUserId: userId }
    if (params.stage) where.crmPipeline = { stage: params.stage as CrmStage }
    if (params.tag) where.tags = { has: params.tag }
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

  async getAllTags(userId: string): Promise<string[]> {
    // Use a raw query to unnest the PostgreSQL tags array and return distinct values.
    const rows = await this.prisma.$queryRaw<{ tag: string }[]>`
      SELECT DISTINCT unnest(tags) AS tag
      FROM "Contact"
      WHERE "ownerUserId" = ${userId}
        AND array_length(tags, 1) > 0
      ORDER BY tag ASC
    `
    return rows.map((r) => r.tag)
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
        contactNotes: { orderBy: { createdAt: 'desc' }, take: 50 },
        deals: { orderBy: { createdAt: 'desc' } },
        tasks: { orderBy: [{ completed: 'asc' }, { dueAt: 'asc' }] },
        customFieldValues: { include: { field: true } },
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

    // Substitute merge tags in subject and body before sending.
    // Supported tags: {{contact.name}}, {{contact.email}}, {{contact.company}}, {{contact.title}}
    const substituteMergeTags = (text: string): string =>
      text
        .replace(/\{\{contact\.name\}\}/g, contact.name ?? '')
        .replace(/\{\{contact\.email\}\}/g, contact.email ?? '')
        .replace(/\{\{contact\.company\}\}/g, contact.company ?? '')
        .replace(/\{\{contact\.title\}\}/g, contact.title ?? '')

    const resolvedSubject = substituteMergeTags(subject)
    const resolvedBody = substituteMergeTags(body)

    // Generate tracking token BEFORE sending so it can be embedded in the email pixel.
    const trackingToken = randomBytes(16).toString('hex')

    const emailRecord = await this.prisma.contactEmail.create({
      data: {
        contactId,
        subject: resolvedSubject,
        body: resolvedBody,
        trackingToken,
      },
    })

    try {
      await this.emailService.sendDirectCrmEmail(
        contact.email,
        resolvedSubject,
        resolvedBody,
        fromName,
        trackingToken,
      )
    } catch (error) {
      await this.prisma.contactEmail
        .delete({ where: { id: emailRecord.id } })
        .catch((cleanupError) =>
          this.logger.warn('Failed to roll back email history after send failure', cleanupError),
        )
      throw error
    }

    const sentAt = new Date().toISOString()

    await this.prisma.contactTimeline
      .create({
        data: {
          contactId,
          event: 'EMAIL_SENT',
          metadata: { subject: resolvedSubject, sentAt },
        },
      })
      .catch((timelineError: unknown) =>
        this.logger.warn('Email timeline write failed after successful send', timelineError),
      )

    // H8: Fire-and-forget webhook: contact.email_sent
    void this.webhooksService
      .fanOut(userId, 'contact.email_sent', {
        contactId,
        name: contact.name,
        email: contact.email,
        subject: resolvedSubject,
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

    // Use an interactive transaction so we can capture the updateMany result
    // and return the *actual* number of rows changed, rather than ownedIds.length
    // which counts contacts that may not yet have a crmPipeline row and would be
    // silently skipped by updateMany.
    const result = await this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.crmPipeline.updateMany({
        where: { contactId: { in: ownedIds } },
        data: { stage: validatedStage },
      })
      // Create a STAGE_CHANGED timeline entry for each contact
      await tx.contactTimeline.createMany({
        data: ownedIds.map((contactId) => ({
          contactId,
          event: 'STAGE_CHANGED',
          metadata: { to: validatedStage, bulk: true } as unknown as Prisma.InputJsonValue,
        })),
      })
      return updateResult
    })

    return { updated: result.count }
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
    params: { page?: number; limit?: number; search?: string },
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

    // Build submission where clause — optionally filter by contact name/email (via join)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let submissionWhere: Record<string, any> = { leadFormId: { in: leadFormIds } }

    if (params.search) {
      // Filter by contact name or email
      const matchingContacts = await this.prisma.contact.findMany({
        where: {
          ownerUserId: userId,
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { email: { contains: params.search, mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      })
      const contactIds = matchingContacts.map((c) => c.id)
      submissionWhere = {
        leadFormId: { in: leadFormIds },
        contactId: { in: contactIds },
      }
    }

    const [submissions, total] = await Promise.all([
      this.prisma.leadSubmission.findMany({
        where: submissionWhere,
        orderBy: { submittedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.leadSubmission.count({
        where: submissionWhere,
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

  async deleteLeadSubmission(submissionId: string, userId: string) {
    const submission = await this.prisma.leadSubmission.findUnique({
      where: { id: submissionId },
      include: { leadForm: { select: { card: { select: { userId: true } } } } },
    })
    if (!submission || submission.leadForm?.card?.userId !== userId) throw new ForbiddenException()
    await this.prisma.leadSubmission.delete({ where: { id: submissionId } })
    return { deleted: true }
  }

  async createNote(contactId: string, userId: string, content: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id: contactId } })
    if (!contact || contact.ownerUserId !== userId) throw new ForbiddenException()

    const note = await this.prisma.contactNote.create({
      data: { contactId, ownerUserId: userId, content },
    })

    await this.prisma.contactTimeline.create({
      data: { contactId, event: 'NOTE_ADDED', metadata: { noteId: note.id, content } },
    })

    void this.webhooksService
      .fanOut(userId, 'contact.note_added', { contactId, noteId: note.id })
      .catch((err: unknown) => this.logger.warn('Webhook fan-out failed (contact.note_added)', err))

    return note
  }

  async getNotes(contactId: string, userId: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id: contactId } })
    if (!contact || contact.ownerUserId !== userId) throw new ForbiddenException()
    return this.prisma.contactNote.findMany({
      where: { contactId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
  }

  async updateNote(noteId: string, userId: string, content: string) {
    const note = await this.prisma.contactNote.findUnique({ where: { id: noteId } })
    if (!note || note.ownerUserId !== userId) throw new ForbiddenException()
    return this.prisma.contactNote.update({ where: { id: noteId }, data: { content } })
  }

  async deleteNote(noteId: string, userId: string) {
    const note = await this.prisma.contactNote.findUnique({ where: { id: noteId } })
    if (!note || note.ownerUserId !== userId) throw new ForbiddenException()
    await this.prisma.contactNote.delete({ where: { id: noteId } })
    return { deleted: true }
  }

  // ─── Gap 2: Custom Fields ────────────────────────────────────────────────────

  async getCustomFields(userId: string) {
    return this.prisma.contactCustomField.findMany({
      where: { ownerUserId: userId },
      orderBy: { displayOrder: 'asc' },
    })
  }

  async createCustomField(
    userId: string,
    dto: { label: string; fieldType?: string; options?: string[]; displayOrder?: number },
  ) {
    const validTypes = ['TEXT', 'NUMBER', 'DATE', 'URL', 'SELECT'] as const
    type FieldType = (typeof validTypes)[number]
    const fieldType: FieldType =
      dto.fieldType && (validTypes as readonly string[]).includes(dto.fieldType)
        ? (dto.fieldType as FieldType)
        : 'TEXT'
    return this.prisma.contactCustomField.create({
      data: {
        ownerUserId: userId,
        label: dto.label,
        fieldType,
        options: dto.options ?? [],
        displayOrder: dto.displayOrder ?? 0,
      },
    })
  }

  async updateCustomField(
    fieldId: string,
    userId: string,
    dto: { label?: string; options?: string[]; displayOrder?: number },
  ) {
    const field = await this.prisma.contactCustomField.findUnique({ where: { id: fieldId } })
    if (!field || field.ownerUserId !== userId) throw new ForbiddenException()
    return this.prisma.contactCustomField.update({ where: { id: fieldId }, data: dto })
  }

  async deleteCustomField(fieldId: string, userId: string) {
    const field = await this.prisma.contactCustomField.findUnique({ where: { id: fieldId } })
    if (!field || field.ownerUserId !== userId) throw new ForbiddenException()
    await this.prisma.contactCustomField.delete({ where: { id: fieldId } })
    return { deleted: true }
  }

  async setCustomFieldValue(contactId: string, userId: string, fieldId: string, value: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id: contactId } })
    if (!contact || contact.ownerUserId !== userId) throw new ForbiddenException()

    // Verify the custom field also belongs to this user — without this check an
    // authenticated user could write values into another user's custom fields by
    // supplying a foreign fieldId with their own contactId.
    const field = await this.prisma.contactCustomField.findUnique({ where: { id: fieldId } })
    if (!field || field.ownerUserId !== userId) throw new ForbiddenException()

    return this.prisma.contactCustomFieldValue.upsert({
      where: { contactId_fieldId: { contactId, fieldId } },
      create: { contactId, fieldId, value },
      update: { value },
    })
  }

  // ─── Gap 3 + 13: Deals ───────────────────────────────────────────────────────

  async createDeal(
    contactId: string,
    userId: string,
    dto: {
      title: string
      value?: number
      currency?: string
      stage?: string
      probability?: number
      closeDate?: string
      notes?: string
    },
  ) {
    const contact = await this.prisma.contact.findUnique({ where: { id: contactId } })
    if (!contact || contact.ownerUserId !== userId) throw new ForbiddenException()

    const validDealStages = ['PROSPECT', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST']
    const stage =
      dto.stage && validDealStages.includes(dto.stage)
        ? (dto.stage as 'PROSPECT' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST')
        : ('PROSPECT' as const)

    const deal = await this.prisma.deal.create({
      data: {
        contactId,
        ownerUserId: userId,
        title: dto.title,
        value: dto.value ?? null,
        currency: dto.currency ?? 'USD',
        stage,
        probability: dto.probability ?? null,
        closeDate: dto.closeDate ? new Date(dto.closeDate) : null,
        notes: dto.notes ?? null,
      },
    })

    await this.prisma.contactTimeline.create({
      data: { contactId, event: 'DEAL_CREATED', metadata: { dealId: deal.id, title: dto.title } },
    })

    return deal
  }

  async getDeals(contactId: string, userId: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id: contactId } })
    if (!contact || contact.ownerUserId !== userId) throw new ForbiddenException()
    return this.prisma.deal.findMany({
      where: { contactId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getAllDeals(userId: string) {
    return this.prisma.deal.findMany({
      where: { ownerUserId: userId },
      include: { contact: { select: { id: true, name: true, email: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 500,
    })
  }

  async updateDeal(
    dealId: string,
    userId: string,
    dto: {
      title?: string
      value?: number | null
      currency?: string
      stage?: string
      probability?: number | null
      closeDate?: string | null
      notes?: string
    },
  ) {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } })
    if (!deal || deal.ownerUserId !== userId) throw new ForbiddenException()

    const validDealStages = ['PROSPECT', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST']
    return this.prisma.deal.update({
      where: { id: dealId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.value !== undefined && { value: dto.value }),
        ...(dto.currency !== undefined && { currency: dto.currency }),
        ...(dto.stage !== undefined &&
          validDealStages.includes(dto.stage) && {
            stage: dto.stage as
              | 'PROSPECT'
              | 'PROPOSAL'
              | 'NEGOTIATION'
              | 'CLOSED_WON'
              | 'CLOSED_LOST',
          }),
        ...(dto.probability !== undefined && { probability: dto.probability }),
        ...(dto.closeDate !== undefined && {
          closeDate: dto.closeDate ? new Date(dto.closeDate) : null,
        }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    })
  }

  async deleteDeal(dealId: string, userId: string) {
    const deal = await this.prisma.deal.findUnique({ where: { id: dealId } })
    if (!deal || deal.ownerUserId !== userId) throw new ForbiddenException()
    await this.prisma.deal.delete({ where: { id: dealId } })
    return { deleted: true }
  }

  // ─── Gap 4: CSV Import ───────────────────────────────────────────────────────

  async importContacts(userId: string, rows: Record<string, string>[]) {
    const results = { created: 0, skipped: 0, errors: 0 }

    for (const row of rows) {
      const name = (row['name'] ?? row['Name'] ?? row['full_name'] ?? '').trim()
      if (!name) {
        results.skipped++
        continue
      }

      const email = (row['email'] ?? row['Email'] ?? '').trim() || undefined
      const phone = (row['phone'] ?? row['Phone'] ?? row['mobile'] ?? '').trim() || undefined
      const company =
        (row['company'] ?? row['Company'] ?? row['organization'] ?? '').trim() || undefined
      const title = (row['title'] ?? row['Title'] ?? row['job_title'] ?? '').trim() || undefined
      const website = (row['website'] ?? row['Website'] ?? '').trim() || undefined
      const address = (row['address'] ?? row['Address'] ?? '').trim() || undefined

      try {
        await this.prisma.$transaction(async (tx) => {
          const c = await tx.contact.create({
            data: { ownerUserId: userId, name, email, phone, company, title, website, address },
          })
          await tx.crmPipeline.create({
            data: { contactId: c.id, stage: 'NEW', ownerUserId: userId },
          })
          await tx.contactTimeline.create({
            data: { contactId: c.id, event: 'LEAD_CAPTURED', metadata: { source: 'csv_import' } },
          })
        })
        results.created++
      } catch (err: unknown) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          results.skipped++
        } else {
          results.errors++
          this.logger.warn(`CSV import row error: ${String(err)}`)
        }
      }
    }

    return results
  }

  // ─── Gap 6: Email Templates ──────────────────────────────────────────────────

  async createEmailTemplate(userId: string, dto: { name: string; subject: string; body: string }) {
    const name = trimRequiredTemplateField(dto.name, 'name')
    const subject = trimRequiredTemplateField(dto.subject, 'subject')
    const body = trimRequiredTemplateField(dto.body, 'body')

    return this.prisma.emailTemplate.create({
      data: { ownerUserId: userId, name, subject, body },
    })
  }

  async getEmailTemplates(userId: string) {
    return this.prisma.emailTemplate.findMany({
      where: { ownerUserId: userId },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    })
  }

  async updateEmailTemplate(
    templateId: string,
    userId: string,
    dto: { name?: string; subject?: string; body?: string },
  ) {
    const tpl = await this.prisma.emailTemplate.findUnique({ where: { id: templateId } })
    if (!tpl || tpl.ownerUserId !== userId) throw new ForbiddenException()

    const data: { name?: string; subject?: string; body?: string } = {}

    if (dto.name !== undefined) data.name = trimRequiredTemplateField(dto.name, 'name')
    if (dto.subject !== undefined) data.subject = trimRequiredTemplateField(dto.subject, 'subject')
    if (dto.body !== undefined) data.body = trimRequiredTemplateField(dto.body, 'body')

    return this.prisma.emailTemplate.update({ where: { id: templateId }, data })
  }

  async deleteEmailTemplate(templateId: string, userId: string) {
    const tpl = await this.prisma.emailTemplate.findUnique({ where: { id: templateId } })
    if (!tpl || tpl.ownerUserId !== userId) throw new ForbiddenException()
    await this.prisma.emailTemplate.delete({ where: { id: templateId } })
    return { deleted: true }
  }

  // ─── Gap 7: Tasks ────────────────────────────────────────────────────────────

  async createTask(
    contactId: string,
    userId: string,
    dto: { title: string; dueAt?: string; priority?: string; type?: string },
  ) {
    const contact = await this.prisma.contact.findUnique({ where: { id: contactId } })
    if (!contact || contact.ownerUserId !== userId) throw new ForbiddenException()

    const task = await this.prisma.contactTask.create({
      data: {
        contactId,
        ownerUserId: userId,
        title: dto.title,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        priority: (dto.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | undefined) ?? 'MEDIUM',
        type:
          (dto.type as 'CALL' | 'EMAIL' | 'MEETING' | 'TODO' | 'FOLLOW_UP' | undefined) ?? 'TODO',
      },
    })

    await this.prisma.contactTimeline.create({
      data: { contactId, event: 'TASK_CREATED', metadata: { taskId: task.id, title: dto.title } },
    })

    return task
  }

  async getTasks(contactId: string, userId: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id: contactId } })
    if (!contact || contact.ownerUserId !== userId) throw new ForbiddenException()
    return this.prisma.contactTask.findMany({
      where: { contactId },
      orderBy: [{ completed: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
    })
  }

  async getAllTasks(userId: string, params?: { completed?: boolean }) {
    const where: { ownerUserId: string; completed?: boolean } = { ownerUserId: userId }
    if (params?.completed !== undefined) where.completed = params.completed
    return this.prisma.contactTask.findMany({
      where,
      include: { contact: { select: { id: true, name: true } } },
      orderBy: [{ completed: 'asc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
      take: 500,
    })
  }

  async updateTask(
    taskId: string,
    userId: string,
    dto: {
      title?: string
      dueAt?: string | null
      completed?: boolean
      priority?: string
      type?: string
    },
  ) {
    const task = await this.prisma.contactTask.findUnique({ where: { id: taskId } })
    if (!task || task.ownerUserId !== userId) throw new ForbiddenException()

    const data: {
      title?: string
      dueAt?: Date | null
      completed?: boolean
      completedAt?: Date | null
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
      type?: 'CALL' | 'EMAIL' | 'MEETING' | 'TODO' | 'FOLLOW_UP'
    } = {}
    if (dto.title !== undefined) data.title = dto.title
    if (dto.dueAt !== undefined) data.dueAt = dto.dueAt ? new Date(dto.dueAt) : null
    if (dto.completed !== undefined) {
      data.completed = dto.completed
      data.completedAt = dto.completed ? new Date() : null
    }
    if (dto.priority !== undefined)
      data.priority = dto.priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
    if (dto.type !== undefined)
      data.type = dto.type as 'CALL' | 'EMAIL' | 'MEETING' | 'TODO' | 'FOLLOW_UP'

    const updated = await this.prisma.contactTask.update({ where: { id: taskId }, data })

    if (dto.completed) {
      await this.prisma.contactTimeline.create({
        data: {
          contactId: task.contactId,
          event: 'TASK_COMPLETED',
          metadata: { taskId, title: task.title },
        },
      })
    }

    return updated
  }

  async deleteTask(taskId: string, userId: string) {
    const task = await this.prisma.contactTask.findUnique({ where: { id: taskId } })
    if (!task || task.ownerUserId !== userId) throw new ForbiddenException()
    await this.prisma.contactTask.delete({ where: { id: taskId } })
    return { deleted: true }
  }

  // ─── Gap 9: Duplicate Merge ──────────────────────────────────────────────────

  async mergeContacts(primaryId: string, duplicateId: string, userId: string) {
    const [primary, duplicate] = await Promise.all([
      this.prisma.contact.findUnique({ where: { id: primaryId } }),
      this.prisma.contact.findUnique({ where: { id: duplicateId } }),
    ])
    if (!primary || primary.ownerUserId !== userId) throw new ForbiddenException()
    if (!duplicate || duplicate.ownerUserId !== userId) throw new ForbiddenException()
    if (primaryId === duplicateId)
      throw new BadRequestException('Cannot merge a contact with itself')

    await this.prisma.$transaction(async (tx) => {
      // Transfer notes
      await tx.contactNote.updateMany({
        where: { contactId: duplicateId },
        data: { contactId: primaryId },
      })
      // Transfer timeline
      await tx.contactTimeline.updateMany({
        where: { contactId: duplicateId },
        data: { contactId: primaryId },
      })
      // Transfer emails
      await tx.contactEmail.updateMany({
        where: { contactId: duplicateId },
        data: { contactId: primaryId },
      })
      // Transfer deals
      await tx.deal.updateMany({
        where: { contactId: duplicateId },
        data: { contactId: primaryId },
      })
      // Transfer tasks
      await tx.contactTask.updateMany({
        where: { contactId: duplicateId },
        data: { contactId: primaryId },
      })
      // Transfer custom field values — only copy fields that primary does NOT already have a value for
      const existingFieldIds = (
        await tx.contactCustomFieldValue.findMany({
          where: { contactId: primaryId },
          select: { fieldId: true },
        })
      ).map((v) => v.fieldId)
      await tx.contactCustomFieldValue.updateMany({
        where: { contactId: duplicateId, fieldId: { notIn: existingFieldIds } },
        data: { contactId: primaryId },
      })
      // Delete duplicate's custom field values that would conflict (primary already has values)
      await tx.contactCustomFieldValue.deleteMany({
        where: { contactId: duplicateId },
      })
      // Transfer pipeline assignment — if primary has no pipeline assignment, copy duplicate's
      const primaryPipeline = await tx.crmPipeline.findUnique({ where: { contactId: primaryId } })
      const duplicatePipeline = await tx.crmPipeline.findUnique({
        where: { contactId: duplicateId },
      })
      if (primaryPipeline && duplicatePipeline) {
        // Primary already has a pipeline row — only inherit pipelineId if primary has none set
        if (!primaryPipeline.pipelineId && duplicatePipeline.pipelineId) {
          await tx.crmPipeline.update({
            where: { contactId: primaryId },
            data: { pipelineId: duplicatePipeline.pipelineId },
          })
        }
      } else if (!primaryPipeline && duplicatePipeline) {
        // Primary has no pipeline row at all — re-parent duplicate's row to primary instead of
        // letting it be cascade-deleted when the duplicate contact is removed below.
        await tx.crmPipeline.update({
          where: { contactId: duplicateId },
          data: { contactId: primaryId, ownerUserId: primary.ownerUserId },
        })
      }
      // Merge tags (union)
      const mergedTags = Array.from(new Set([...primary.tags, ...duplicate.tags]))
      // Fill missing fields from duplicate into primary
      const patch: Record<string, unknown> = { tags: mergedTags }
      if (!primary.email && duplicate.email) patch.email = duplicate.email
      if (!primary.phone && duplicate.phone) patch.phone = duplicate.phone
      if (!primary.company && duplicate.company) patch.company = duplicate.company
      if (!primary.title && duplicate.title) patch.title = duplicate.title
      if (!primary.website && duplicate.website) patch.website = duplicate.website
      if (!primary.address && duplicate.address) patch.address = duplicate.address
      if (!primary.notes && duplicate.notes) patch.notes = duplicate.notes
      await tx.contact.update({ where: { id: primaryId }, data: patch })
      // Record merge event
      await tx.contactTimeline.create({
        data: {
          contactId: primaryId,
          event: 'CONTACTS_MERGED',
          metadata: { duplicateId, duplicateName: duplicate.name },
        },
      })
      // Delete duplicate (cascade removes crmPipeline, remaining orphans)
      await tx.contact.delete({ where: { id: duplicateId } })
    })

    return this.prisma.contact.findUnique({
      where: { id: primaryId },
      include: { crmPipeline: true, contactNotes: { orderBy: { createdAt: 'desc' }, take: 50 } },
    })
  }

  async findDuplicates(userId: string) {
    // Group contacts by normalised email and name similarity
    const contacts = await this.prisma.contact.findMany({
      where: { ownerUserId: userId },
      select: { id: true, name: true, email: true, company: true },
      take: 1000,
    })

    const groups: Array<{ contacts: typeof contacts; reason: string }> = []

    // Email duplicates (exact normalised match)
    const emailMap = new Map<string, typeof contacts>()
    for (const c of contacts) {
      if (!c.email) continue
      const key = c.email.toLowerCase().trim()
      const existing = emailMap.get(key) ?? []
      existing.push(c)
      emailMap.set(key, existing)
    }
    for (const [, group] of emailMap) {
      if (group.length > 1) groups.push({ contacts: group, reason: 'duplicate_email' })
    }

    // Name duplicates (normalised lowercase)
    const nameMap = new Map<string, typeof contacts>()
    for (const c of contacts) {
      const key = c.name.toLowerCase().trim()
      const existing = nameMap.get(key) ?? []
      existing.push(c)
      nameMap.set(key, existing)
    }
    for (const [, group] of nameMap) {
      if (group.length > 1) groups.push({ contacts: group, reason: 'duplicate_name' })
    }

    return groups
  }

  // ─── Gap 10: Stage Conversion Analytics ──────────────────────────────────────

  async getFunnelAnalytics(userId: string, opts?: { dateFrom?: string; dateTo?: string }) {
    const stages = ['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED', 'LOST'] as const

    // Build optional date filter for the contact's createdAt via the contact relation
    const dateFilter: { gte?: Date; lte?: Date } = {}
    if (opts?.dateFrom) {
      const from = new Date(opts.dateFrom)
      from.setUTCHours(0, 0, 0, 0)
      dateFilter.gte = from
    }
    if (opts?.dateTo) {
      // Include the full selected day — midnight of YYYY-MM-DD would cut off most of it
      const to = new Date(opts.dateTo)
      to.setUTCHours(23, 59, 59, 999)
      dateFilter.lte = to
    }
    const hasDateFilter = Object.keys(dateFilter).length > 0

    const where = {
      ownerUserId: userId,
      ...(hasDateFilter ? { contact: { createdAt: dateFilter } } : {}),
    }

    const counts = await this.prisma.crmPipeline.groupBy({
      by: ['stage'],
      where,
      _count: { id: true },
    })

    // Source breakdown: count contacts by sourceCard handle
    const sourceContacts = await this.prisma.contact.findMany({
      where: {
        ownerUserId: userId,
        ...(hasDateFilter ? { createdAt: dateFilter } : {}),
      },
      select: { sourceCard: { select: { handle: true } } },
    })
    const sourceMap = new Map<string, number>()
    for (const c of sourceContacts) {
      const handle = c.sourceCard?.handle ?? 'direct'
      sourceMap.set(handle, (sourceMap.get(handle) ?? 0) + 1)
    }
    const sourceBreakdown = Array.from(sourceMap.entries()).map(([source, count]) => ({
      source,
      count,
    }))

    const countMap = new Map(counts.map((c) => [c.stage, c._count.id]))
    const stageCounts = stages.map((stage) => ({
      stage,
      count: countMap.get(stage) ?? 0,
    }))

    // Conversion rates between consecutive stages
    const conversions = []
    for (let i = 0; i < stages.length - 1; i++) {
      const from = stageCounts[i]
      const to = stageCounts[i + 1]
      const rate = from && to && from.count > 0 ? Math.round((to.count / from.count) * 100) : 0
      conversions.push({ from: stages[i], to: stages[i + 1], rate })
    }

    const totalActive = stageCounts
      .filter((s) => s.stage !== 'LOST')
      .reduce((sum, s) => sum + s.count, 0)

    return { stages: stageCounts, conversions, totalActive, sourceBreakdown }
  }

  async exportContacts(
    userId: string,
    opts?: { cardId?: string; from?: string; to?: string },
  ): Promise<{ csv: string; truncated: boolean; total: number }> {
    const EXPORT_CAP = 10_000
    // Build date filter. Use end-of-day for `to` so the full selected day is included.
    const dateFilter: { gte?: Date; lte?: Date } = {}
    if (opts?.from) dateFilter.gte = new Date(opts.from)
    if (opts?.to) {
      const toDate = new Date(opts.to)
      toDate.setUTCHours(23, 59, 59, 999)
      dateFilter.lte = toDate
    }

    const where: import('@dotly/database').Prisma.ContactWhereInput = {
      ownerUserId: userId,
      ...(opts?.cardId ? { sourceCardId: opts.cardId } : {}),
      ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
    }

    // Fetch one extra to detect truncation without a separate COUNT query
    const contacts = await this.prisma.contact.findMany({
      where,
      include: { crmPipeline: { select: { stage: true } } },
      orderBy: { createdAt: 'desc' },
      take: EXPORT_CAP + 1,
    })
    const truncated = contacts.length > EXPORT_CAP
    const page = truncated ? contacts.slice(0, EXPORT_CAP) : contacts

    const csvHeader =
      'name,email,phone,company,title,website,address,stage,tags,createdAt,sourceCard'
    const escapeField = (value: string | null | undefined): string => {
      if (!value) return ''
      if (/[,"\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
      return value
    }

    const rows = page.map((c) => {
      const fields = [
        escapeField(c.name),
        escapeField(c.email),
        escapeField(c.phone),
        escapeField(c.company),
        escapeField(c.title),
        escapeField(c.website),
        escapeField(c.address),
        escapeField(c.crmPipeline?.stage ?? 'NEW'),
        escapeField(c.tags.join('|')),
        escapeField(c.createdAt.toISOString()),
        escapeField(
          (c as Record<string, unknown> & { sourceCardId?: string | null }).sourceCardId ?? '',
        ),
      ]
      return fields.join(',')
    })

    const csv = [csvHeader, ...rows].join('\n')
    return { csv, truncated, total: page.length }
  }

  async getContactEmails(contactId: string, userId: string) {
    const contact = await this.prisma.contact.findUnique({ where: { id: contactId } })
    if (!contact || contact.ownerUserId !== userId) throw new ForbiddenException()
    return this.prisma.contactEmail.findMany({
      where: { contactId },
      orderBy: { sentAt: 'desc' },
      select: { id: true, subject: true, sentAt: true, openedAt: true, clickedAt: true },
    })
  }

  // ─── Gap 12: Bulk Edit Arbitrary Fields ──────────────────────────────────────

  async bulkUpdateFields(
    userId: string,
    ids: string[],
    fields: { company?: string; tags?: string[]; tagsAdd?: string[]; tagsRemove?: string[] },
  ) {
    // Verify all contacts belong to this user
    const owned = await this.prisma.contact.findMany({
      where: { id: { in: ids }, ownerUserId: userId },
      select: { id: true, tags: true },
    })
    const ownedIds = owned.map((c) => c.id)
    if (ownedIds.length === 0) throw new ForbiddenException()

    if (fields.company !== undefined) {
      await this.prisma.contact.updateMany({
        where: { id: { in: ownedIds } },
        data: { company: fields.company },
      })
    }

    // Handle tag mutations per-contact (add/remove)
    if (fields.tagsAdd?.length || fields.tagsRemove?.length || fields.tags !== undefined) {
      for (const contact of owned) {
        let newTags: string[]
        if (fields.tags !== undefined) {
          newTags = fields.tags
        } else {
          newTags = [...contact.tags]
          if (fields.tagsAdd) newTags = Array.from(new Set([...newTags, ...fields.tagsAdd]))
          if (fields.tagsRemove) newTags = newTags.filter((t) => !fields.tagsRemove!.includes(t))
        }
        await this.prisma.contact.update({
          where: { id: contact.id },
          data: { tags: newTags },
        })
      }
    }

    return { updated: ownedIds.length }
  }

  // ─── Gap 11: Multi-Pipeline Support ─────────────────────────────────────────

  async getPipelines(userId: string) {
    return this.prisma.pipeline.findMany({
      where: { ownerUserId: userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    })
  }

  async createPipeline(
    userId: string,
    dto: { name: string; stages?: string[]; isDefault?: boolean },
  ) {
    if (!dto.name?.trim()) throw new BadRequestException('Pipeline name is required')
    const stages =
      dto.stages && dto.stages.length > 0
        ? dto.stages.map((s) => s.trim()).filter(Boolean)
        : ['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED', 'LOST']

    // If this is being set as default, un-default any existing default pipeline
    if (dto.isDefault) {
      await this.prisma.pipeline.updateMany({
        where: { ownerUserId: userId, isDefault: true },
        data: { isDefault: false },
      })
    }

    return this.prisma.pipeline.create({
      data: {
        ownerUserId: userId,
        name: dto.name.trim(),
        stages,
        isDefault: dto.isDefault ?? false,
      },
    })
  }

  async updatePipeline(
    pipelineId: string,
    userId: string,
    dto: {
      name?: string
      stages?: string[]
      isDefault?: boolean
      stageColors?: Record<string, string>
    },
  ) {
    const pipeline = await this.prisma.pipeline.findUnique({ where: { id: pipelineId } })
    if (!pipeline || pipeline.ownerUserId !== userId) throw new ForbiddenException()

    if (dto.isDefault) {
      await this.prisma.pipeline.updateMany({
        where: { ownerUserId: userId, isDefault: true, id: { not: pipelineId } },
        data: { isDefault: false },
      })
    }

    const data: Record<string, unknown> = {}
    if (dto.name !== undefined) data['name'] = dto.name.trim()
    if (dto.stages !== undefined) data['stages'] = dto.stages.map((s) => s.trim()).filter(Boolean)
    if (dto.isDefault !== undefined) data['isDefault'] = dto.isDefault
    if (dto.stageColors !== undefined) data['stageColors'] = dto.stageColors

    return this.prisma.pipeline.update({ where: { id: pipelineId }, data })
  }

  async deletePipeline(pipelineId: string, userId: string) {
    const pipeline = await this.prisma.pipeline.findUnique({ where: { id: pipelineId } })
    if (!pipeline || pipeline.ownerUserId !== userId) throw new ForbiddenException()
    await this.prisma.pipeline.delete({ where: { id: pipelineId } })
    return { deleted: true }
  }

  /** Assign a contact's CRM record to a specific pipeline (and optionally set a stage) */
  async assignContactToPipeline(
    contactId: string,
    userId: string,
    pipelineId: string | null,
    stage?: string,
  ) {
    const contact = await this.prisma.contact.findUnique({ where: { id: contactId } })
    if (!contact || contact.ownerUserId !== userId) throw new ForbiddenException()

    if (pipelineId !== null) {
      const pipeline = await this.prisma.pipeline.findUnique({ where: { id: pipelineId } })
      if (!pipeline || pipeline.ownerUserId !== userId) throw new ForbiddenException()

      // Validate that the requested stage is one of the pipeline's defined stages.
      // A pipeline's `stages` field is a string[] stored as JSON; if the caller
      // passes a stage that doesn't exist in that pipeline the write is rejected
      // rather than persisting a value that the UI has no column to display.
      if (stage !== undefined) {
        const pipelineStages = pipeline.stages as string[]
        if (pipelineStages.length > 0 && !pipelineStages.includes(stage)) {
          throw new BadRequestException(
            `Stage "${stage}" is not valid for this pipeline. Valid stages: ${pipelineStages.join(', ')}`,
          )
        }
      }
    }

    const existing = await this.prisma.crmPipeline.findUnique({ where: { contactId } })
    const stageValue = stage ?? existing?.stage ?? 'NEW'
    if (existing) {
      return this.prisma.crmPipeline.update({
        where: { contactId },
        data: { pipelineId, stage: stageValue },
      })
    }
    return this.prisma.crmPipeline.create({
      data: { contactId, ownerUserId: userId, pipelineId, stage: stageValue },
    })
  }

  /** Get all contacts currently in a given pipeline */
  async getPipelineContacts(pipelineId: string, userId: string) {
    const pipeline = await this.prisma.pipeline.findUnique({ where: { id: pipelineId } })
    if (!pipeline || pipeline.ownerUserId !== userId) throw new ForbiddenException()

    return this.prisma.contact.findMany({
      where: {
        ownerUserId: userId,
        crmPipeline: { pipelineId },
      },
      include: { crmPipeline: true },
      orderBy: { createdAt: 'desc' },
    })
  }

  // ─── Gap 5: Email Tracking ────────────────────────────────────────────────────

  async recordEmailOpen(trackingToken: string) {
    const email = await this.prisma.contactEmail.findUnique({ where: { trackingToken } })
    if (!email || email.openedAt) return // already recorded or not found
    await this.prisma.contactEmail.update({
      where: { trackingToken },
      data: { openedAt: new Date() },
    })
    await this.prisma.contactTimeline.create({
      data: {
        contactId: email.contactId,
        event: 'EMAIL_OPENED',
        metadata: { subject: email.subject, trackingToken },
      },
    })
  }

  async recordEmailClick(trackingToken: string) {
    const email = await this.prisma.contactEmail.findUnique({ where: { trackingToken } })
    if (!email) return
    await this.prisma.contactEmail.update({
      where: { trackingToken },
      data: { clickedAt: new Date() },
    })
    if (!email.clickedAt) {
      await this.prisma.contactTimeline.create({
        data: {
          contactId: email.contactId,
          event: 'EMAIL_LINK_CLICKED',
          metadata: { subject: email.subject, trackingToken },
        },
      })
    }
  }
}
