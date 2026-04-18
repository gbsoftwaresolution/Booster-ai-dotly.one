import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import Stripe from 'stripe'
import { PaymentAccountsService } from '../payment-accounts/payment-accounts.service'
import { Plan } from '@dotly/types'

const LEAD_EVENT_ORDER = ['payment', 'booking', 'whatsapp', 'view'] as const
const WHATSAPP_INTENTS = ['general', 'service'] as const
const SALES_LINK_BOOKING_SLOTS = [
  '2026-04-20 10:00',
  '2026-04-20 12:00',
  '2026-04-20 15:00',
] as const
const SALES_LINK_PAYMENT_AMOUNT = 5000
const LEAD_STATUSES = ['new', 'contacted', 'booked', 'paid', 'closed', 'lost'] as const
const FREE_LEAD_LIMIT = 20
const FREE_BOOKING_LIMIT = 5

type LeadAction = 'view' | 'whatsapp' | 'booking' | 'payment'
type LeadIntent = (typeof WHATSAPP_INTENTS)[number]
type SalesLinkSlot = (typeof SALES_LINK_BOOKING_SLOTS)[number]
type LeadStatus = (typeof LEAD_STATUSES)[number]
const RECENT_ACTIVITY_WINDOW_MINUTES = 60

@Injectable()
export class SalesLinkService {
  private readonly stripe: Stripe | null
  private readonly stripeMode: 'enabled' | 'disabled'

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly paymentAccountsService: PaymentAccountsService,
  ) {
    this.stripeMode = this.config.get<'enabled' | 'disabled'>('STRIPE_MODE') ?? 'disabled'
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY')
    this.stripe = this.stripeMode === 'enabled' && secretKey ? new Stripe(secretKey) : null
  }

  isStripeEnabled() {
    return this.stripeMode === 'enabled'
  }

  async getPublicProfile(username: string) {
    return this.prisma.user
      .findUnique({
        where: { username },
        select: {
          username: true,
          name: true,
          pitch: true,
          phone: true,
          plan: true,
        },
      })
      .then((profile) =>
        profile
          ? {
              username: profile.username,
              name: profile.name,
              pitch: profile.pitch,
              phone: profile.phone,
              showBranding: profile.plan === Plan.FREE,
            }
          : null,
      )
  }

  getSlots() {
    return { slots: [...SALES_LINK_BOOKING_SLOTS] }
  }

  async getPublicPaymentConfig(username: string) {
    const owner = await this.prisma.user.findUnique({
      where: { username },
      select: { plan: true },
    })
    const provider = await this.paymentAccountsService.getActiveProviderForUsername(username)

    if (!owner || owner.plan === Plan.FREE) {
      return {
        stripeEnabled: false,
        provider: null,
        country: provider.country,
        upgradeRequired: true,
        message: 'Payments unlock when this seller upgrades to Pro.',
      }
    }

    return {
      stripeEnabled: provider.provider === 'stripe_connect',
      provider: provider.provider,
      country: provider.country,
      upgradeRequired: false,
      message: null,
    }
  }

  async createLead({ username, source }: { username: string; source?: string }) {
    const owner = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true, plan: true },
    })

    if (!owner) {
      throw new NotFoundException('Profile not found')
    }

    if (owner.plan === Plan.FREE) {
      const leadCount = await this.prisma.lead.count({
        where: {
          username,
          createdAt: { gte: this.getStartOfMonth() },
        },
      })

      if (leadCount >= FREE_LEAD_LIMIT) {
        throw new ForbiddenException({
          code: 'PLAN_LIMIT_REACHED',
          message: 'This user has reached their free limit right now.',
          limit: FREE_LEAD_LIMIT,
          current: leadCount,
          upgradeRequired: true,
        })
      }
    }

    return this.prisma.lead.create({
      data: {
        username,
        source,
      },
      select: { id: true },
    })
  }

  async trackEvent(leadId: string, action: LeadAction, intent?: LeadIntent, ctaVariant?: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true },
    })

    if (!lead) {
      throw new NotFoundException('Lead not found')
    }

    await this.prisma.leadEvent.create({
      data: {
        leadId,
        action,
        intent: action === 'whatsapp' ? (intent ?? null) : null,
        ctaVariant: action === 'whatsapp' ? ctaVariant?.trim() || null : null,
      },
    })
  }

  async getRecentActivity(username: string, userId: string) {
    await this.assertLeadOwner(username, userId)

    const windowStart = new Date(Date.now() - RECENT_ACTIVITY_WINDOW_MINUTES * 60_000)

    const [recentViews, recentChats] = await Promise.all([
      this.prisma.leadEvent.count({
        where: {
          action: 'view',
          createdAt: { gte: windowStart },
          lead: { username },
        },
      }),
      this.prisma.leadEvent.count({
        where: {
          action: 'whatsapp',
          createdAt: { gte: windowStart },
          lead: { username },
        },
      }),
    ])

    return {
      recentViews,
      recentChats,
    }
  }

  async getLeadDashboard(username: string, userId: string) {
    const owner = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    })

    if (!owner) {
      throw new NotFoundException('Profile not found')
    }

    if (owner.id !== userId) {
      throw new ForbiddenException('You do not have access to these leads')
    }

    const [
      totalLeads,
      groupedEvents,
      whatsappIntentGroups,
      statusGroups,
      recentLeads,
      bookings,
      payments,
    ] = await Promise.all([
      this.prisma.lead.count({ where: { username } }),
      this.prisma.leadEvent.groupBy({
        by: ['action'],
        where: { lead: { username } },
        _count: { _all: true },
      }),
      this.prisma.leadEvent.groupBy({
        by: ['intent'],
        where: {
          lead: { username },
          action: 'whatsapp',
        },
        _count: { _all: true },
      }),
      this.prisma.lead.groupBy({
        by: ['status'],
        where: { username },
        _count: { _all: true },
      }),
      this.prisma.lead.findMany({
        where: { username },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          status: true,
          source: true,
          followUpFlag: true,
          createdAt: true,
          events: {
            orderBy: { createdAt: 'desc' },
            select: {
              action: true,
              intent: true,
            },
          },
        },
      }),
      this.prisma.salesLinkBooking.findMany({
        where: { username },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          slot: true,
          name: true,
          createdAt: true,
        },
      }),
      this.prisma.payment.findMany({
        where: {
          username,
          status: { in: ['success', 'pending_collection'] },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          amount: true,
          status: true,
          provider: true,
          createdAt: true,
        },
      }),
    ])

    const events = {
      views: 0,
      whatsapp: 0,
      general: 0,
      service: 0,
      booking: 0,
      payment: 0,
    }

    for (const entry of groupedEvents) {
      if (entry.action === 'view') events.views = entry._count._all
      if (entry.action === 'whatsapp') events.whatsapp = entry._count._all
      if (entry.action === 'booking') events.booking = entry._count._all
      if (entry.action === 'payment') events.payment = entry._count._all
    }

    for (const entry of whatsappIntentGroups) {
      if (entry.intent === 'general') events.general = entry._count._all
      if (entry.intent === 'service') events.service = entry._count._all
    }

    const pipeline = {
      new: 0,
      contacted: 0,
      booked: 0,
      paid: 0,
      lost: 0,
    }

    for (const entry of statusGroups) {
      if (entry.status === 'new') pipeline.new = entry._count._all
      if (entry.status === 'contacted') pipeline.contacted = entry._count._all
      if (entry.status === 'booked') pipeline.booked = entry._count._all
      if (entry.status === 'paid') pipeline.paid = entry._count._all
      if (entry.status === 'lost') pipeline.lost = entry._count._all
    }

    return {
      totalLeads,
      totalBookings: bookings.length,
      revenue: payments.reduce(
        (sum: number, payment: { amount: number; status: string }) =>
          payment.status === 'success' ? sum + payment.amount : sum,
        0,
      ),
      payments: payments.filter((payment: { status: string }) => payment.status === 'success')
        .length,
      pendingCollectionPayments: payments.filter(
        (payment: { status: string }) => payment.status === 'pending_collection',
      ).length,
      stripeEnabled: this.isStripeEnabled(),
      pipeline,
      events,
      paymentRecords: payments.map(
        (payment: {
          id: string
          amount: number
          status: string
          provider: string | null
          createdAt: Date
        }) => ({
          id: payment.id,
          amount: payment.amount,
          status: payment.status,
          provider: payment.provider,
          createdAt: payment.createdAt.toISOString(),
        }),
      ),
      bookings: bookings.map((booking) => ({
        id: booking.id,
        slot: booking.slot,
        name: booking.name,
        createdAt: booking.createdAt.toISOString(),
      })),
      recentLeads: recentLeads.map((lead) => ({
        id: lead.id,
        status: lead.status,
        source: lead.source,
        followUpFlag: lead.followUpFlag,
        createdAt: lead.createdAt.toISOString(),
        lastAction: this.resolveLastAction(lead.events.map((event) => event.action as LeadAction)),
        lastIntent: this.resolveLastIntent(
          lead.events.map((event) => (event.intent as LeadIntent | null | undefined) ?? null),
        ),
      })),
    }
  }

  async getRevenueDashboard(username: string, userId: string) {
    const owner = await this.assertLeadOwner(username, userId)

    const startOfMonth = this.getStartOfMonth()

    const [
      totalLeads,
      monthLeads,
      totalBookings,
      monthBookings,
      payments,
      monthPayments,
      groupedEvents,
      statusGroups,
    ] = await Promise.all([
      this.prisma.lead.count({ where: { username } }),
      this.prisma.lead.count({ where: { username, createdAt: { gte: startOfMonth } } }),
      this.prisma.salesLinkBooking.count({ where: { username } }),
      this.prisma.salesLinkBooking.count({ where: { username, createdAt: { gte: startOfMonth } } }),
      this.prisma.payment.findMany({
        where: { username, status: 'success' },
        select: { amount: true },
      }),
      this.prisma.payment.findMany({
        where: {
          username,
          status: 'success',
          createdAt: { gte: startOfMonth },
        },
        select: { amount: true },
      }),
      this.prisma.leadEvent.groupBy({
        by: ['action'],
        where: { lead: { username } },
        _count: { _all: true },
      }),
      this.prisma.lead.groupBy({
        by: ['status'],
        where: { username },
        _count: { _all: true },
      }),
    ])

    const conversion = {
      views: 0,
      whatsapp: 0,
      booking: 0,
      payment: 0,
    }

    for (const entry of groupedEvents) {
      if (entry.action === 'view') conversion.views = entry._count._all
      if (entry.action === 'whatsapp') conversion.whatsapp = entry._count._all
      if (entry.action === 'booking') conversion.booking = entry._count._all
      if (entry.action === 'payment') conversion.payment = entry._count._all
    }

    const pipeline = {
      new: 0,
      contacted: 0,
      booked: 0,
      paid: 0,
      lost: 0,
    }

    for (const entry of statusGroups) {
      if (entry.status === 'new') pipeline.new = entry._count._all
      if (entry.status === 'contacted') pipeline.contacted = entry._count._all
      if (entry.status === 'booked') pipeline.booked = entry._count._all
      if (entry.status === 'paid') pipeline.paid = entry._count._all
      if (entry.status === 'lost') pipeline.lost = entry._count._all
    }

    return {
      plan: owner.plan,
      totalRevenue: payments.reduce((sum, payment) => sum + payment.amount, 0),
      totalPayments: payments.length,
      thisMonthRevenue: monthPayments.reduce((sum, payment) => sum + payment.amount, 0),
      totalLeads,
      totalBookings,
      conversion,
      pipeline,
      usage: {
        monthlyLeadCount: monthLeads,
        monthlyLeadLimit: owner.plan === Plan.FREE ? FREE_LEAD_LIMIT : null,
        monthlyBookingCount: monthBookings,
        monthlyBookingLimit: owner.plan === Plan.FREE ? FREE_BOOKING_LIMIT : null,
        leadLimitReached: owner.plan === Plan.FREE && monthLeads >= FREE_LEAD_LIMIT,
        bookingLimitReached: owner.plan === Plan.FREE && monthBookings >= FREE_BOOKING_LIMIT,
        paymentsLocked: owner.plan === Plan.FREE,
        showBranding: owner.plan === Plan.FREE,
      },
    }
  }

  async getPaymentHistory(username: string, userId: string) {
    await this.assertLeadOwner(username, userId)

    const payments = await this.prisma.payment.findMany({
      where: { username },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        amount: true,
        status: true,
        createdAt: true,
      },
    })

    return payments.map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      status: payment.status,
      createdAt: payment.createdAt.toISOString(),
    }))
  }

  async getLeadsList(username: string, userId: string) {
    await this.assertLeadOwner(username, userId)

    const leads = await this.prisma.lead.findMany({
      where: { username },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        source: true,
        followUpFlag: true,
        createdAt: true,
        events: {
          orderBy: { createdAt: 'desc' },
          select: { action: true },
        },
      },
    })

    return leads.map((lead) => ({
      id: lead.id,
      status: lead.status,
      source: lead.source,
      followUpFlag: lead.followUpFlag,
      createdAt: lead.createdAt.toISOString(),
      lastAction: this.resolveLastAction(lead.events.map((event) => event.action as LeadAction)),
    }))
  }

  async getLeadDetail(id: string, userId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        status: true,
        source: true,
        note: true,
        followUpFlag: true,
        createdAt: true,
        events: {
          orderBy: { createdAt: 'asc' },
          select: {
            action: true,
            intent: true,
            ctaVariant: true,
            createdAt: true,
          },
        },
        bookings: {
          orderBy: { createdAt: 'desc' },
          select: {
            slot: true,
            createdAt: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          select: {
            amount: true,
            status: true,
            createdAt: true,
          },
        },
      },
    })

    if (!lead) {
      throw new NotFoundException('Lead not found')
    }

    await this.assertLeadOwner(lead.username, userId)

    return {
      id: lead.id,
      username: lead.username,
      status: lead.status,
      source: lead.source,
      note: lead.note,
      followUpFlag: lead.followUpFlag,
      createdAt: lead.createdAt.toISOString(),
      events: lead.events.map((event) => ({
        action: event.action,
        intent: event.intent,
        ctaVariant: event.ctaVariant,
        createdAt: event.createdAt.toISOString(),
      })),
      bookings: lead.bookings.map((booking) => ({
        slot: booking.slot,
        createdAt: booking.createdAt.toISOString(),
      })),
      payments: lead.payments.map((payment) => ({
        amount: payment.amount,
        status: payment.status,
        createdAt: payment.createdAt.toISOString(),
      })),
    }
  }

  async updateLead(
    id: string,
    userId: string,
    data: { status?: LeadStatus; note?: string; followUpFlag?: boolean },
  ) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
      },
    })

    if (!lead) {
      throw new NotFoundException('Lead not found')
    }

    await this.assertLeadOwner(lead.username, userId)

    return this.prisma.lead.update({
      where: { id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(typeof data.note === 'string' ? { note: data.note } : {}),
        ...(typeof data.followUpFlag === 'boolean' ? { followUpFlag: data.followUpFlag } : {}),
      },
      select: {
        id: true,
        status: true,
        note: true,
        followUpFlag: true,
      },
    })
  }

  async createPayment({
    username,
    leadId,
    amount,
  }: {
    username: string
    leadId: string
    amount: number
  }) {
    if (amount !== SALES_LINK_PAYMENT_AMOUNT) {
      throw new NotFoundException('Payment amount not supported')
    }

    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        username: true,
      },
    })

    if (!lead || lead.username !== username) {
      throw new NotFoundException('Lead not found')
    }

    const owner = await this.prisma.user.findUnique({
      where: { username },
      select: { plan: true },
    })

    if (!owner || owner.plan === Plan.FREE) {
      throw new ForbiddenException({
        code: 'UPGRADE_REQUIRED',
        message: 'Start earning by upgrading to Pro.',
      })
    }

    const provider = await this.paymentAccountsService.getActiveProviderForUsername(username)
    if (!provider.provider) {
      throw new ConflictException('No active payment provider is available for this sales link')
    }

    const session =
      provider.provider === 'stripe_connect' && provider.providerAccountId
        ? await this.paymentAccountsService.createStripeCheckoutSession({
            username,
            leadId,
            amount,
            providerAccountId: provider.providerAccountId,
          })
        : provider.provider === 'upi_link'
          ? this.paymentAccountsService.createUpiPaymentLink({ username, leadId, amount })
          : this.paymentAccountsService.createCashOnDeliveryLink({ username, leadId })

    await this.prisma.payment.create({
      data: {
        username,
        leadId,
        provider:
          provider.provider === 'stripe_connect'
            ? 'STRIPE_CONNECT'
            : provider.provider === 'upi_link'
              ? 'UPI_LINK'
              : 'CASH_ON_DELIVERY',
        providerAccountId: provider.providerAccountId,
        amount,
        currency:
          provider.provider === 'stripe_connect'
            ? 'usd'
            : provider.provider === 'upi_link'
              ? 'inr'
              : 'cod',
        status: provider.provider === 'cash_on_delivery' ? 'pending_collection' : 'pending',
        stripeId: provider.provider === 'stripe_connect' ? session.id : null,
      },
    })

    return { url: session.url }
  }

  async confirmPendingPayment(paymentId: string, userId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        username: true,
        leadId: true,
        status: true,
      },
    })

    if (!payment) {
      throw new NotFoundException('Payment not found')
    }

    const owner = await this.prisma.user.findUnique({
      where: { username: payment.username },
      select: { id: true },
    })

    if (!owner || owner.id !== userId) {
      throw new ForbiddenException('You do not have access to this payment')
    }

    if (payment.status !== 'pending_collection') {
      throw new ConflictException('Only pending COD payments can be confirmed')
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'success' },
    })

    if (payment.leadId) {
      await this.setLeadStatus(payment.leadId, 'paid')
    }

    if (payment.leadId) {
      await this.trackEvent(payment.leadId, 'payment')
    }

    return { success: true as const }
  }

  async handlePaymentWebhook(rawBody?: Buffer, signature?: string) {
    if (!this.isStripeEnabled() || !this.stripe) {
      return { received: true as const }
    }

    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET')
    if (!webhookSecret || !rawBody || !signature) {
      throw new NotFoundException('Stripe webhook is not configured')
    }

    const event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const payment = await this.prisma.payment.findUnique({
        where: { stripeId: session.id },
        select: {
          id: true,
          leadId: true,
          status: true,
        },
      })

      if (payment && payment.status !== 'success') {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'success' },
        })

        if (payment.leadId) {
          await this.setLeadStatus(payment.leadId, 'paid')
          await this.trackEvent(payment.leadId, 'payment')
        }
      }
    }

    return { received: true as const }
  }

  async createBooking({
    username,
    leadId,
    slot,
  }: {
    username: string
    leadId: string
    slot: string
  }) {
    if (!SALES_LINK_BOOKING_SLOTS.includes(slot as SalesLinkSlot)) {
      throw new NotFoundException('Slot not found')
    }

    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        username: true,
      },
    })

    if (!lead || lead.username !== username) {
      throw new NotFoundException('Lead not found')
    }

    const owner = await this.prisma.user.findUnique({
      where: { username },
      select: { plan: true },
    })

    if (owner?.plan === Plan.FREE) {
      const bookingCount = await this.prisma.salesLinkBooking.count({
        where: {
          username,
          createdAt: { gte: this.getStartOfMonth() },
        },
      })

      if (bookingCount >= FREE_BOOKING_LIMIT) {
        throw new ForbiddenException({
          code: 'BOOKING_LIMIT_REACHED',
          message: 'This user has reached their free booking limit right now.',
          limit: FREE_BOOKING_LIMIT,
          current: bookingCount,
          upgradeRequired: true,
        })
      }
    }

    try {
      await this.prisma.salesLinkBooking.create({
        data: {
          username,
          leadId,
          slot,
          name: null,
        },
      })
      await this.setLeadStatus(leadId, 'booked')
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Slot already booked')
      }
      throw error
    }

    return { success: true as const }
  }

  private resolveLastAction(actions: LeadAction[]): LeadAction {
    for (const action of actions) {
      if (LEAD_EVENT_ORDER.includes(action)) {
        return action
      }
    }

    return 'view'
  }

  private resolveLastIntent(intents: Array<LeadIntent | null>): LeadIntent | null {
    for (const intent of intents) {
      if (intent && WHATSAPP_INTENTS.includes(intent)) {
        return intent
      }
    }

    return null
  }

  private async assertLeadOwner(username: string, userId: string) {
    const owner = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true, plan: true },
    })

    if (!owner) {
      throw new NotFoundException('Profile not found')
    }

    if (owner.id !== userId) {
      throw new ForbiddenException('You do not have access to these leads')
    }

    return owner
  }

  private getStartOfMonth() {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    return startOfMonth
  }

  private async setLeadStatus(leadId: string, status: LeadStatus) {
    await this.prisma.lead.update({
      where: { id: leadId },
      data: { status },
    })
  }
}
