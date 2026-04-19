import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common'

const createCheckoutSessionMock = jest.fn()
const constructEventMock = jest.fn()

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: createCheckoutSessionMock,
      },
    },
    webhooks: {
      constructEvent: constructEventMock,
    },
  }))
})

import { SalesLinkService } from './sales-link.service'

function createPrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
    },
    lead: {
      create: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
    leadEvent: {
      create: jest.fn(),
      groupBy: jest.fn(),
      count: jest.fn(),
    },
    salesLinkBooking: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  }
}

function createPaymentAccountsServiceMock() {
  return {
    getActiveProviderForUsername: jest.fn(),
    createStripeCheckoutSession: jest.fn(),
    createUpiPaymentLink: jest.fn(),
    createCashOnDeliveryLink: jest.fn(),
  }
}

function createConfigMock() {
  return {
    get: jest.fn((key: string) => {
      if (key === 'STRIPE_MODE') return 'enabled'
      if (key === 'STRIPE_SECRET_KEY') return 'sk_test_123'
      if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_123'
      return undefined
    }),
    getOrThrow: jest.fn((key: string) => {
      if (key === 'WEB_URL') return 'http://localhost:3000'
      throw new Error(`Missing config for ${key}`)
    }),
  }
}

function createObservabilityMock() {
  return {
    incrementCoreFlowCounter: jest.fn(),
    observeWebhookLatency: jest.fn(),
    logOperationalEvent: jest.fn(),
  }
}

function makeSalesLinkService(prisma = createPrismaMock()) {
  return new SalesLinkService(
    prisma as never,
    createConfigMock() as never,
    createPaymentAccountsServiceMock() as never,
    createObservabilityMock() as never,
  )
}

function createDisabledStripeConfigMock() {
  return {
    get: jest.fn((key: string) => {
      if (key === 'STRIPE_MODE') return 'disabled'
      return undefined
    }),
    getOrThrow: jest.fn((key: string) => {
      if (key === 'WEB_URL') return 'http://localhost:3000'
      throw new Error(`Missing config for ${key}`)
    }),
  }
}

describe('SalesLinkService', () => {
  it('creates a lead only for an existing username', async () => {
    const prisma = createPrismaMock()
    const paymentAccounts = createPaymentAccountsServiceMock()
    const observability = createObservabilityMock()
    const service = new SalesLinkService(
      prisma as never,
      createConfigMock() as never,
      paymentAccounts as never,
      observability as never,
    )

    prisma.user.findUnique.mockResolvedValueOnce({ id: 'user_1', plan: 'FREE' })
    prisma.lead.count.mockResolvedValueOnce(0)
    prisma.lead.create.mockResolvedValueOnce({ id: 'lead_1' })

    await expect(service.createLead({ username: 'john', source: 'direct' })).resolves.toEqual({
      id: 'lead_1',
    })

    expect(prisma.lead.create).toHaveBeenCalledWith({
      data: {
        username: 'john',
        source: 'direct',
      },
      select: { id: true },
    })
  })

  it('returns the static sales-link booking slots', () => {
    const prisma = createPrismaMock()
    const service = makeSalesLinkService(prisma)

    expect(service.getSlots()).toEqual({
      slots: ['2026-04-20 10:00', '2026-04-20 12:00', '2026-04-20 15:00'],
    })
  })

  it('rejects events for missing leads', async () => {
    const prisma = createPrismaMock()
    const service = makeSalesLinkService(prisma)

    prisma.lead.findUnique.mockResolvedValueOnce(null)

    await expect(service.trackEvent('missing', 'view')).rejects.toBeInstanceOf(NotFoundException)
    expect(prisma.leadEvent.create).not.toHaveBeenCalled()
  })

  it('stores whatsapp intent and cta variant and clears them for non-whatsapp actions', async () => {
    const prisma = createPrismaMock()
    const service = makeSalesLinkService(prisma)

    prisma.lead.findUnique.mockResolvedValue({ id: 'lead_1' })
    prisma.leadEvent.create.mockResolvedValue({ id: 'event_1' })

    await service.trackEvent('lead_1', 'whatsapp', 'service', 'Chat Now')
    await service.trackEvent('lead_1', 'booking', 'general', 'Chat Now')

    expect(prisma.leadEvent.create).toHaveBeenNthCalledWith(1, {
      data: {
        leadId: 'lead_1',
        action: 'whatsapp',
        intent: 'service',
        ctaVariant: 'Chat Now',
      },
    })
    expect(prisma.leadEvent.create).toHaveBeenNthCalledWith(2, {
      data: {
        leadId: 'lead_1',
        action: 'booking',
        intent: null,
        ctaVariant: null,
      },
    })
  })

  it('returns the lightweight leads list for the owner', async () => {
    const prisma = createPrismaMock()
    const service = makeSalesLinkService(prisma)

    prisma.user.findUnique.mockResolvedValueOnce({ id: 'owner_1' })
    prisma.lead.findMany.mockResolvedValueOnce([
      {
        id: 'lead_1',
        status: 'new',
        source: 'direct',
        followUpFlag: true,
        createdAt: new Date('2026-04-18T10:00:00.000Z'),
        events: [{ action: 'whatsapp' }],
      },
    ])

    await expect(service.getLeadsList('john', 'owner_1')).resolves.toEqual([
      {
        id: 'lead_1',
        status: 'new',
        source: 'direct',
        followUpFlag: true,
        createdAt: '2026-04-18T10:00:00.000Z',
        lastAction: 'whatsapp',
      },
    ])
  })

  it('blocks free-plan lead creation when the monthly lead limit is reached', async () => {
    const prisma = createPrismaMock()
    const service = makeSalesLinkService(prisma)

    prisma.user.findUnique.mockResolvedValueOnce({ id: 'owner_1', plan: 'FREE' })
    prisma.lead.count.mockResolvedValueOnce(20)

    await expect(service.createLead({ username: 'john' })).rejects.toBeInstanceOf(
      ForbiddenException,
    )
  })

  it('returns lead detail with events, bookings, and payments', async () => {
    const prisma = createPrismaMock()
    const service = makeSalesLinkService(prisma)

    prisma.lead.findUnique.mockResolvedValueOnce({
      id: 'lead_1',
      username: 'john',
      status: 'contacted',
      source: 'direct',
      note: 'Asked for pricing',
      followUpFlag: true,
      createdAt: new Date('2026-04-18T10:00:00.000Z'),
      events: [
        {
          action: 'view',
          intent: null,
          ctaVariant: null,
          createdAt: new Date('2026-04-18T10:01:00.000Z'),
        },
      ],
      bookings: [{ slot: '2026-04-20 10:00', createdAt: new Date('2026-04-18T11:00:00.000Z') }],
      payments: [
        { amount: 5000, status: 'success', createdAt: new Date('2026-04-18T12:00:00.000Z') },
      ],
    })
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'owner_1' })

    await expect(service.getLeadDetail('lead_1', 'owner_1')).resolves.toEqual({
      id: 'lead_1',
      username: 'john',
      status: 'contacted',
      source: 'direct',
      note: 'Asked for pricing',
      followUpFlag: true,
      createdAt: '2026-04-18T10:00:00.000Z',
      events: [
        {
          action: 'view',
          intent: null,
          ctaVariant: null,
          createdAt: '2026-04-18T10:01:00.000Z',
        },
      ],
      bookings: [{ slot: '2026-04-20 10:00', createdAt: '2026-04-18T11:00:00.000Z' }],
      payments: [{ amount: 5000, status: 'success', createdAt: '2026-04-18T12:00:00.000Z' }],
    })
  })

  it('updates lead status, note, and follow-up flag for the owner', async () => {
    const prisma = createPrismaMock()
    const service = makeSalesLinkService(prisma)

    prisma.lead.findUnique.mockResolvedValueOnce({ id: 'lead_1', username: 'john' })
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'owner_1' })
    prisma.lead.update.mockResolvedValueOnce({
      id: 'lead_1',
      status: 'contacted',
      note: 'Asked for pricing details',
      followUpFlag: true,
    })

    await expect(
      service.updateLead('lead_1', 'owner_1', {
        status: 'contacted',
        note: 'Asked for pricing details',
        followUpFlag: true,
      }),
    ).resolves.toEqual({
      id: 'lead_1',
      status: 'contacted',
      note: 'Asked for pricing details',
      followUpFlag: true,
    })
  })

  it('creates a booking only when the lead belongs to the username and slot is valid', async () => {
    const prisma = createPrismaMock()
    const service = makeSalesLinkService(prisma)

    prisma.lead.findUnique.mockResolvedValueOnce({ id: 'lead_1', username: 'john' })
    prisma.user.findUnique.mockResolvedValueOnce({ plan: 'FREE' })
    prisma.salesLinkBooking.count.mockResolvedValueOnce(0)
    prisma.salesLinkBooking.create.mockResolvedValueOnce({ id: 'booking_1' })

    await expect(
      service.createBooking({ username: 'john', leadId: 'lead_1', slot: '2026-04-20 10:00' }),
    ).resolves.toEqual({ success: true })

    expect(prisma.salesLinkBooking.create).toHaveBeenCalledWith({
      data: {
        username: 'john',
        leadId: 'lead_1',
        slot: '2026-04-20 10:00',
        name: null,
      },
    })
  })

  it('rejects duplicate bookings for the same username slot', async () => {
    const prisma = createPrismaMock()
    const service = makeSalesLinkService(prisma)

    prisma.lead.findUnique.mockResolvedValueOnce({ id: 'lead_1', username: 'john' })
    prisma.salesLinkBooking.create.mockRejectedValueOnce({ code: 'P2002' })

    await expect(
      service.createBooking({ username: 'john', leadId: 'lead_1', slot: '2026-04-20 10:00' }),
    ).rejects.toBeInstanceOf(ConflictException)
  })

  it('blocks free-plan bookings when the monthly booking limit is reached', async () => {
    const prisma = createPrismaMock()
    const service = makeSalesLinkService(prisma)

    prisma.lead.findUnique.mockResolvedValueOnce({ id: 'lead_1', username: 'john' })
    prisma.user.findUnique.mockResolvedValueOnce({ plan: 'FREE' })
    prisma.salesLinkBooking.count.mockResolvedValueOnce(5)

    await expect(
      service.createBooking({ username: 'john', leadId: 'lead_1', slot: '2026-04-20 10:00' }),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('creates a Stripe checkout session and persists a pending payment', async () => {
    const prisma = createPrismaMock()
    const paymentAccounts = createPaymentAccountsServiceMock()
    const service = new SalesLinkService(
      prisma as never,
      createConfigMock() as never,
      paymentAccounts as never,
      createObservabilityMock() as never,
    )

    prisma.lead.findUnique.mockResolvedValueOnce({ id: 'lead_1', username: 'john' })
    prisma.user.findUnique.mockResolvedValueOnce({ plan: 'PRO' })
    paymentAccounts.getActiveProviderForUsername.mockResolvedValueOnce({
      provider: 'stripe_connect',
      providerAccountId: 'acct_123',
      country: 'US',
    })
    paymentAccounts.createStripeCheckoutSession.mockResolvedValueOnce({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/pay/cs_test_123',
    })
    prisma.payment.create.mockResolvedValueOnce({ id: 'payment_1' })

    await expect(
      service.createPayment({ username: 'john', leadId: 'lead_1', amount: 5000 }),
    ).resolves.toEqual({ url: 'https://checkout.stripe.com/pay/cs_test_123' })

    expect(paymentAccounts.createStripeCheckoutSession).toHaveBeenCalledWith({
      username: 'john',
      leadId: 'lead_1',
      amount: 5000,
      providerAccountId: 'acct_123',
    })
    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: {
        username: 'john',
        leadId: 'lead_1',
        provider: 'STRIPE_CONNECT',
        providerAccountId: 'acct_123',
        amount: 5000,
        currency: 'usd',
        status: 'pending',
        stripeId: 'cs_test_123',
      },
    })
  })

  it('blocks payment session creation when Stripe mode is disabled', async () => {
    const prisma = createPrismaMock()
    const paymentAccounts = createPaymentAccountsServiceMock()
    const service = new SalesLinkService(
      prisma as never,
      createDisabledStripeConfigMock() as never,
      paymentAccounts as never,
      createObservabilityMock() as never,
    )

    prisma.lead.findUnique.mockResolvedValueOnce({ id: 'lead_1', username: 'john' })
    prisma.user.findUnique.mockResolvedValueOnce({ plan: 'PRO' })
    paymentAccounts.getActiveProviderForUsername.mockResolvedValueOnce({
      provider: null,
      providerAccountId: null,
      country: 'IN',
    })

    await expect(
      service.createPayment({ username: 'john', leadId: 'lead_1', amount: 5000 }),
    ).rejects.toBeInstanceOf(ConflictException)
  })

  it('blocks payments when the seller is still on the free plan', async () => {
    const prisma = createPrismaMock()
    const paymentAccounts = createPaymentAccountsServiceMock()
    const service = new SalesLinkService(
      prisma as never,
      createConfigMock() as never,
      paymentAccounts as never,
      createObservabilityMock() as never,
    )

    prisma.lead.findUnique.mockResolvedValueOnce({ id: 'lead_1', username: 'john' })
    prisma.user.findUnique.mockResolvedValueOnce({ plan: 'FREE' })

    await expect(
      service.createPayment({ username: 'john', leadId: 'lead_1', amount: 5000 }),
    ).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('fails payment creation when no payment account is available for a paid seller', async () => {
    const prisma = createPrismaMock()
    const paymentAccounts = createPaymentAccountsServiceMock()
    const service = new SalesLinkService(
      prisma as never,
      createConfigMock() as never,
      paymentAccounts as never,
      createObservabilityMock() as never,
    )

    prisma.lead.findUnique.mockResolvedValueOnce({ id: 'lead_1', username: 'john' })
    prisma.user.findUnique.mockResolvedValueOnce({ plan: 'PRO' })
    paymentAccounts.getActiveProviderForUsername.mockResolvedValueOnce({
      provider: null,
      providerAccountId: null,
      country: 'US',
    })

    await expect(
      service.createPayment({ username: 'john', leadId: 'lead_1', amount: 5000 }),
    ).rejects.toBeInstanceOf(ConflictException)
  })

  it('creates a UPI payment link when the seller default provider is local', async () => {
    const prisma = createPrismaMock()
    const paymentAccounts = createPaymentAccountsServiceMock()
    const service = new SalesLinkService(
      prisma as never,
      createConfigMock() as never,
      paymentAccounts as never,
      createObservabilityMock() as never,
    )

    prisma.lead.findUnique.mockResolvedValueOnce({ id: 'lead_1', username: 'john' })
    prisma.user.findUnique.mockResolvedValueOnce({ plan: 'PRO' })
    paymentAccounts.getActiveProviderForUsername.mockResolvedValueOnce({
      provider: 'upi_link',
      providerAccountId: null,
      country: 'IN',
    })
    paymentAccounts.createUpiPaymentLink.mockReturnValueOnce({
      id: 'upi_lead_1',
      url: 'upi://pay?tr=lead_1',
      currency: 'inr',
    })
    prisma.payment.create.mockResolvedValueOnce({ id: 'payment_1' })

    await expect(
      service.createPayment({ username: 'john', leadId: 'lead_1', amount: 5000 }),
    ).resolves.toEqual({ url: 'upi://pay?tr=lead_1' })

    expect(paymentAccounts.createUpiPaymentLink).toHaveBeenCalledWith({
      username: 'john',
      leadId: 'lead_1',
      amount: 5000,
    })
    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: {
        username: 'john',
        leadId: 'lead_1',
        provider: 'UPI_LINK',
        providerAccountId: null,
        amount: 5000,
        currency: 'inr',
        status: 'pending',
        stripeId: null,
      },
    })
  })

  it('falls back to cash on delivery when no gateway provider is available', async () => {
    const prisma = createPrismaMock()
    const paymentAccounts = createPaymentAccountsServiceMock()
    const service = new SalesLinkService(
      prisma as never,
      createConfigMock() as never,
      paymentAccounts as never,
      createObservabilityMock() as never,
    )

    prisma.lead.findUnique.mockResolvedValueOnce({ id: 'lead_1', username: 'john' })
    prisma.user.findUnique.mockResolvedValueOnce({ plan: 'PRO' })
    paymentAccounts.getActiveProviderForUsername.mockResolvedValueOnce({
      provider: 'cash_on_delivery',
      providerAccountId: null,
      country: 'US',
    })
    paymentAccounts.createCashOnDeliveryLink.mockReturnValueOnce({
      id: 'cod_lead_1',
      url: 'http://localhost:3000/success?mode=cod&leadId=lead_1',
      currency: 'cod',
    })
    prisma.payment.create.mockResolvedValueOnce({ id: 'payment_1' })

    await expect(
      service.createPayment({ username: 'john', leadId: 'lead_1', amount: 5000 }),
    ).resolves.toEqual({ url: 'http://localhost:3000/success?mode=cod&leadId=lead_1' })

    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: {
        username: 'john',
        leadId: 'lead_1',
        provider: 'CASH_ON_DELIVERY',
        providerAccountId: null,
        amount: 5000,
        currency: 'cod',
        status: 'pending_collection',
        stripeId: null,
      },
    })
  })

  it('confirms a pending COD payment and tracks the payment event', async () => {
    const prisma = createPrismaMock()
    const service = makeSalesLinkService(prisma)

    prisma.payment.findUnique.mockResolvedValueOnce({
      id: 'payment_1',
      username: 'john',
      leadId: 'lead_1',
      status: 'pending_collection',
    })
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'owner_1' })
    prisma.payment.update.mockResolvedValueOnce({ id: 'payment_1', status: 'success' })
    prisma.lead.findUnique.mockResolvedValueOnce({ id: 'lead_1' })
    prisma.leadEvent.create.mockResolvedValueOnce({ id: 'event_1' })

    await expect(service.confirmPendingPayment('payment_1', 'owner_1')).resolves.toEqual({
      success: true,
    })

    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment_1' },
      data: { status: 'success' },
    })
  })

  it('marks payment success from the Stripe webhook and links the payment event to the lead', async () => {
    const prisma = createPrismaMock()
    const service = makeSalesLinkService(prisma)

    constructEventMock.mockReturnValueOnce({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
        },
      },
    })
    prisma.payment.findUnique.mockResolvedValueOnce({
      id: 'payment_1',
      leadId: 'lead_1',
      status: 'pending',
    })
    prisma.payment.update.mockResolvedValueOnce({ id: 'payment_1', status: 'success' })
    prisma.lead.findUnique.mockResolvedValueOnce({ id: 'lead_1' })
    prisma.leadEvent.create.mockResolvedValueOnce({ id: 'event_1' })

    await expect(
      service.handlePaymentWebhook(Buffer.from('payload'), 'stripe_sig_123'),
    ).resolves.toEqual({ received: true })

    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: 'payment_1' },
      data: { status: 'success' },
    })
    expect(prisma.leadEvent.create).toHaveBeenCalledWith({
      data: {
        leadId: 'lead_1',
        action: 'payment',
        intent: null,
        ctaVariant: null,
      },
    })
  })

  it('ignores replayed Stripe payment webhooks after payment success is already recorded', async () => {
    const prisma = createPrismaMock()
    const service = makeSalesLinkService(prisma)

    constructEventMock.mockReturnValueOnce({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
        },
      },
    })
    prisma.payment.findUnique.mockResolvedValueOnce({
      id: 'payment_1',
      leadId: 'lead_1',
      status: 'success',
    })

    await expect(
      service.handlePaymentWebhook(Buffer.from('payload'), 'stripe_sig_123'),
    ).resolves.toEqual({ received: true })

    expect(prisma.payment.update).not.toHaveBeenCalled()
    expect(prisma.leadEvent.create).not.toHaveBeenCalled()
  })

  it('returns received for non-checkout Stripe payment events without mutating state', async () => {
    const prisma = createPrismaMock()
    const service = makeSalesLinkService(prisma)

    constructEventMock.mockReturnValueOnce({
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: 'pi_test_123',
        },
      },
    })

    await expect(
      service.handlePaymentWebhook(Buffer.from('payload'), 'stripe_sig_123'),
    ).resolves.toEqual({ received: true })

    expect(prisma.payment.findUnique).not.toHaveBeenCalled()
    expect(prisma.payment.update).not.toHaveBeenCalled()
    expect(prisma.leadEvent.create).not.toHaveBeenCalled()
  })

  it('retries cleanly after a transient payment update failure during webhook processing', async () => {
    const prisma = createPrismaMock()
    const service = makeSalesLinkService(prisma)

    constructEventMock.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_retry',
        },
      },
    })
    prisma.payment.findUnique
      .mockResolvedValueOnce({
        id: 'payment_1',
        leadId: 'lead_1',
        status: 'pending',
      })
      .mockResolvedValueOnce({
        id: 'payment_1',
        leadId: 'lead_1',
        status: 'pending',
      })
    prisma.payment.update
      .mockRejectedValueOnce(new Error('temporary write failure'))
      .mockResolvedValueOnce({ id: 'payment_1', status: 'success' })
    prisma.lead.update.mockResolvedValue({ id: 'lead_1', status: 'paid' })
    prisma.lead.findUnique.mockResolvedValue({ id: 'lead_1' })
    prisma.leadEvent.create.mockResolvedValue({ id: 'event_1' })

    await expect(
      service.handlePaymentWebhook(Buffer.from('payload'), 'stripe_sig_123'),
    ).rejects.toThrow('temporary write failure')

    await expect(
      service.handlePaymentWebhook(Buffer.from('payload'), 'stripe_sig_123'),
    ).resolves.toEqual({ received: true })

    expect(prisma.payment.update).toHaveBeenCalledTimes(2)
    expect(prisma.leadEvent.create).toHaveBeenCalledTimes(1)
  })

  it('fails payment creation when a duplicate Stripe session id would be recorded twice', async () => {
    const prisma = createPrismaMock()
    const paymentAccounts = createPaymentAccountsServiceMock()
    const service = new SalesLinkService(
      prisma as never,
      createConfigMock() as never,
      paymentAccounts as never,
      createObservabilityMock() as never,
    )

    prisma.lead.findUnique.mockResolvedValueOnce({ id: 'lead_1', username: 'john' })
    prisma.user.findUnique.mockResolvedValueOnce({ plan: 'PRO' })
    paymentAccounts.getActiveProviderForUsername.mockResolvedValueOnce({
      provider: 'stripe_connect',
      providerAccountId: 'acct_123',
      country: 'US',
    })
    paymentAccounts.createStripeCheckoutSession.mockResolvedValueOnce({
      id: 'cs_test_duplicate',
      url: 'https://checkout.stripe.com/pay/cs_test_duplicate',
    })
    prisma.payment.create.mockRejectedValueOnce({ code: 'P2002' })

    await expect(
      service.createPayment({ username: 'john', leadId: 'lead_1', amount: 5000 }),
    ).rejects.toEqual(expect.objectContaining({ code: 'P2002' }))
  })

  it('returns recent activity counts for the owner', async () => {
    const prisma = createPrismaMock()
    const service = makeSalesLinkService(prisma)

    prisma.user.findUnique.mockResolvedValueOnce({ id: 'owner_1' })
    prisma.leadEvent.count.mockResolvedValueOnce(5)
    prisma.leadEvent.count.mockResolvedValueOnce(2)

    await expect(service.getRecentActivity('john', 'owner_1')).resolves.toEqual({
      recentViews: 5,
      recentChats: 2,
    })
  })

  it('returns lead activity totals and recent lead last actions for the owner', async () => {
    const prisma = createPrismaMock()
    const service = makeSalesLinkService(prisma)

    prisma.user.findUnique.mockResolvedValueOnce({ id: 'owner_1' })
    prisma.lead.count.mockResolvedValueOnce(12)
    prisma.leadEvent.groupBy.mockResolvedValueOnce([
      { action: 'view', _count: { _all: 50 } },
      { action: 'whatsapp', _count: { _all: 10 } },
      { action: 'booking', _count: { _all: 3 } },
      { action: 'payment', _count: { _all: 1 } },
    ])
    prisma.leadEvent.groupBy.mockResolvedValueOnce([
      { intent: 'general', _count: { _all: 4 } },
      { intent: 'service', _count: { _all: 6 } },
    ])
    prisma.lead.groupBy.mockResolvedValueOnce([
      { status: 'new', _count: { _all: 4 } },
      { status: 'contacted', _count: { _all: 3 } },
      { status: 'booked', _count: { _all: 2 } },
      { status: 'paid', _count: { _all: 2 } },
      { status: 'lost', _count: { _all: 1 } },
    ])
    prisma.lead.findMany.mockResolvedValueOnce([
      {
        id: 'lead_1',
        status: 'contacted',
        source: 'direct',
        followUpFlag: true,
        createdAt: new Date('2026-04-18T10:00:00.000Z'),
        events: [
          { action: 'whatsapp', intent: 'service' },
          { action: 'view', intent: null },
        ],
      },
      {
        id: 'lead_2',
        status: 'new',
        source: null,
        followUpFlag: false,
        createdAt: new Date('2026-04-18T09:00:00.000Z'),
        events: [],
      },
    ])
    prisma.salesLinkBooking.findMany.mockResolvedValueOnce([
      {
        id: 'booking_1',
        slot: '2026-04-20 10:00',
        name: null,
        createdAt: new Date('2026-04-18T11:00:00.000Z'),
      },
    ])
    prisma.salesLinkBooking.count.mockResolvedValueOnce(1)
    prisma.payment.groupBy.mockResolvedValueOnce([
      { status: 'success', _count: { _all: 1 }, _sum: { amount: 5000 } },
      { status: 'pending_collection', _count: { _all: 1 }, _sum: { amount: 5000 } },
    ])
    prisma.payment.findMany.mockResolvedValueOnce([
      {
        id: 'payment_1',
        amount: 5000,
        status: 'success',
        provider: 'STRIPE_CONNECT',
        createdAt: new Date('2026-04-18T12:00:00.000Z'),
      },
      {
        id: 'payment_2',
        amount: 5000,
        status: 'pending_collection',
        provider: 'CASH_ON_DELIVERY',
        createdAt: new Date('2026-04-18T13:00:00.000Z'),
      },
    ])

    await expect(service.getLeadDashboard('john', 'owner_1')).resolves.toEqual({
      totalLeads: 12,
      totalBookings: 1,
      revenue: 5000,
      payments: 1,
      pendingCollectionPayments: 1,
      stripeEnabled: true,
      pipeline: {
        new: 4,
        contacted: 3,
        booked: 2,
        paid: 2,
        lost: 1,
      },
      events: {
        views: 50,
        whatsapp: 10,
        general: 4,
        service: 6,
        booking: 3,
        payment: 1,
      },
      paymentRecords: [
        {
          id: 'payment_1',
          amount: 5000,
          status: 'success',
          provider: 'STRIPE_CONNECT',
          createdAt: '2026-04-18T12:00:00.000Z',
        },
        {
          id: 'payment_2',
          amount: 5000,
          status: 'pending_collection',
          provider: 'CASH_ON_DELIVERY',
          createdAt: '2026-04-18T13:00:00.000Z',
        },
      ],
      bookings: [
        {
          id: 'booking_1',
          slot: '2026-04-20 10:00',
          name: null,
          createdAt: '2026-04-18T11:00:00.000Z',
        },
      ],
      recentLeads: [
        {
          id: 'lead_1',
          status: 'contacted',
          source: 'direct',
          followUpFlag: true,
          createdAt: '2026-04-18T10:00:00.000Z',
          lastAction: 'whatsapp',
          lastIntent: 'service',
        },
        {
          id: 'lead_2',
          status: 'new',
          source: null,
          followUpFlag: false,
          createdAt: '2026-04-18T09:00:00.000Z',
          lastAction: 'view',
          lastIntent: null,
        },
      ],
    })
  })

  it('returns revenue dashboard aggregates for the owner', async () => {
    const prisma = createPrismaMock()
    const service = makeSalesLinkService(prisma)

    prisma.user.findUnique.mockResolvedValueOnce({ id: 'owner_1', plan: 'FREE' })
    prisma.lead.count.mockResolvedValueOnce(25)
    prisma.lead.count.mockResolvedValueOnce(12)
    prisma.salesLinkBooking.count.mockResolvedValueOnce(4)
    prisma.salesLinkBooking.count.mockResolvedValueOnce(2)
    prisma.payment.groupBy.mockResolvedValueOnce([
      { status: 'success', _count: { _all: 2 }, _sum: { amount: 15000 } },
    ])
    prisma.payment.groupBy.mockResolvedValueOnce([
      { status: 'success', _count: { _all: 1 }, _sum: { amount: 8000 } },
    ])
    prisma.leadEvent.groupBy.mockResolvedValueOnce([
      { action: 'view', _count: { _all: 100 } },
      { action: 'whatsapp', _count: { _all: 20 } },
      { action: 'booking', _count: { _all: 5 } },
      { action: 'payment', _count: { _all: 3 } },
    ])
    prisma.lead.groupBy.mockResolvedValueOnce([
      { status: 'new', _count: { _all: 10 } },
      { status: 'contacted', _count: { _all: 5 } },
      { status: 'booked', _count: { _all: 3 } },
      { status: 'paid', _count: { _all: 3 } },
      { status: 'lost', _count: { _all: 4 } },
    ])

    await expect(service.getRevenueDashboard('john', 'owner_1')).resolves.toEqual({
      plan: 'FREE',
      totalRevenue: 15000,
      totalPayments: 2,
      thisMonthRevenue: 8000,
      totalLeads: 25,
      totalBookings: 4,
      conversion: {
        views: 100,
        whatsapp: 20,
        booking: 5,
        payment: 3,
      },
      pipeline: {
        new: 10,
        contacted: 5,
        booked: 3,
        paid: 3,
        lost: 4,
      },
      usage: {
        monthlyLeadCount: 12,
        monthlyLeadLimit: 20,
        monthlyBookingCount: 2,
        monthlyBookingLimit: 5,
        leadLimitReached: false,
        bookingLimitReached: false,
        paymentsLocked: true,
        showBranding: true,
      },
    })
  })

  it('returns payment history for the owner', async () => {
    const prisma = createPrismaMock()
    const service = makeSalesLinkService(prisma)

    prisma.user.findUnique.mockResolvedValueOnce({ id: 'owner_1' })
    prisma.payment.findMany.mockResolvedValueOnce([
      {
        id: 'payment_1',
        amount: 5000,
        status: 'success',
        createdAt: new Date('2026-04-18T10:00:00.000Z'),
      },
    ])

    await expect(service.getPaymentHistory('john', 'owner_1')).resolves.toEqual([
      {
        id: 'payment_1',
        amount: 5000,
        status: 'success',
        createdAt: '2026-04-18T10:00:00.000Z',
      },
    ])
  })

  it('rejects dashboard access for a different authenticated user', async () => {
    const prisma = createPrismaMock()
    const service = makeSalesLinkService(prisma)

    prisma.user.findUnique.mockResolvedValueOnce({ id: 'owner_1' })

    await expect(service.getLeadDashboard('john', 'owner_2')).rejects.toBeInstanceOf(
      ForbiddenException,
    )
  })
})
