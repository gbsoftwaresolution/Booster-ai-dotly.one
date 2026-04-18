import { ConflictException, NotFoundException } from '@nestjs/common'

const createAccountMock = jest.fn()
const retrieveAccountMock = jest.fn()
const createAccountLinkMock = jest.fn()
const createCheckoutSessionMock = jest.fn()
const constructEventMock = jest.fn()

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    accounts: {
      create: createAccountMock,
      retrieve: retrieveAccountMock,
    },
    accountLinks: {
      create: createAccountLinkMock,
    },
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

import { PaymentAccountsService } from './payment-accounts.service'

function createPrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    paymentAccount: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    paymentProviderRegistry: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  }
}

function createConfigMock() {
  return {
    get: jest.fn((key: string) => {
      if (key === 'STRIPE_MODE') return 'enabled'
      if (key === 'STRIPE_SECRET_KEY') return 'sk_test_123'
      if (key === 'STRIPE_CONNECT_WEBHOOK_SECRET') return 'whsec_connect_123'
      if (key === 'UPI_PAYEE_VPA') return 'dotly@upi'
      if (key === 'UPI_PAYEE_NAME') return 'Dotly Seller'
      return undefined
    }),
    getOrThrow: jest.fn((key: string) => {
      if (key === 'WEB_URL') return 'http://localhost:3000'
      throw new Error(`Missing config for ${key}`)
    }),
  }
}

function createDisabledConfigMock() {
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

describe('PaymentAccountsService', () => {
  it('creates Stripe Connect onboarding for company accounts', async () => {
    const prisma = createPrismaMock()
    const service = new PaymentAccountsService(prisma as never, createConfigMock() as never)

    prisma.user.findUnique.mockResolvedValueOnce({ email: 'john@example.com', country: 'IN' })
    prisma.paymentAccount.findUnique.mockResolvedValueOnce(null)
    createAccountMock.mockResolvedValueOnce({ id: 'acct_123' })
    retrieveAccountMock.mockResolvedValueOnce({
      id: 'acct_123',
      details_submitted: false,
      charges_enabled: false,
      payouts_enabled: false,
    })
    prisma.paymentAccount.upsert.mockResolvedValueOnce({ id: 'pa_1' })
    prisma.user.update.mockResolvedValueOnce({ id: 'user_1' })
    createAccountLinkMock.mockResolvedValueOnce({
      url: 'https://connect.stripe.com/setup/acct_123',
    })

    await expect(service.createOrUpdateStripeAccount('user_1', 'company')).resolves.toEqual({
      url: 'https://connect.stripe.com/setup/acct_123',
    })

    expect(createAccountMock).toHaveBeenCalledWith(
      expect.objectContaining({ country: 'IN', business_type: 'company' }),
    )
  })

  it('returns the active provider when Stripe Connect is ready', async () => {
    const prisma = createPrismaMock()
    const service = new PaymentAccountsService(prisma as never, createConfigMock() as never)

    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'user_1',
      country: 'US',
      defaultPaymentProvider: 'STRIPE_CONNECT',
    })
    prisma.paymentAccount.findMany.mockResolvedValueOnce([
      {
        provider: 'STRIPE_CONNECT',
        providerAccountId: 'acct_123',
        chargesEnabled: true,
        detailsSubmitted: true,
        country: 'US',
      },
    ])
    prisma.paymentProviderRegistry.findMany.mockResolvedValueOnce([
      { provider: 'STRIPE_CONNECT', enabled: true, supportedCountries: [] },
    ])

    await expect(service.getActiveProviderForUsername('john')).resolves.toEqual({
      provider: 'stripe_connect',
      providerAccountId: 'acct_123',
      country: 'US',
    })
  })

  it('returns the active local provider when seller defaults to UPI', async () => {
    const prisma = createPrismaMock()
    const service = new PaymentAccountsService(prisma as never, createConfigMock() as never)

    prisma.user.findUnique.mockResolvedValueOnce({
      id: 'user_1',
      country: 'IN',
      defaultPaymentProvider: 'UPI_LINK',
    })
    prisma.paymentAccount.findMany.mockResolvedValueOnce([
      {
        provider: 'UPI_LINK',
        providerAccountId: null,
        chargesEnabled: true,
        detailsSubmitted: true,
        country: 'IN',
      },
    ])
    prisma.paymentProviderRegistry.findMany.mockResolvedValueOnce([
      { provider: 'UPI_LINK', enabled: true, supportedCountries: ['IN'] },
    ])

    await expect(service.getActiveProviderForUsername('john')).resolves.toEqual({
      provider: 'upi_link',
      providerAccountId: null,
      country: 'IN',
    })
  })

  it('sets the default provider to UPI and auto-creates a local account', async () => {
    const prisma = createPrismaMock()
    const service = new PaymentAccountsService(prisma as never, createConfigMock() as never)

    prisma.user.findUnique.mockResolvedValueOnce({ country: 'IN' })
    prisma.paymentProviderRegistry.findUnique.mockResolvedValueOnce({
      provider: 'UPI_LINK',
      enabled: true,
      supportedCountries: ['IN'],
    })
    prisma.paymentAccount.upsert.mockResolvedValueOnce({ id: 'pa_1' })
    prisma.user.update.mockResolvedValueOnce({ id: 'user_1' })
    prisma.user.findUnique.mockResolvedValueOnce({
      country: 'IN',
      defaultPaymentProvider: 'UPI_LINK',
    })
    prisma.paymentAccount.findMany.mockResolvedValueOnce([
      {
        provider: 'UPI_LINK',
        accountType: 'INDIVIDUAL',
        country: 'IN',
        status: 'ACTIVE',
        onboardingComplete: true,
        detailsSubmitted: true,
        chargesEnabled: true,
        payoutsEnabled: false,
      },
    ])
    prisma.paymentProviderRegistry.findMany.mockResolvedValueOnce([
      {
        provider: 'UPI_LINK',
        displayName: 'UPI Payment Link',
        enabled: true,
        supportedCountries: ['IN'],
      },
    ])

    await expect(service.setDefaultProvider('user_1', 'upi_link')).resolves.toEqual(
      expect.objectContaining({ defaultProvider: 'upi_link' }),
    )
  })

  it('sets the default provider to cash on delivery', async () => {
    const prisma = createPrismaMock()
    const service = new PaymentAccountsService(prisma as never, createConfigMock() as never)

    prisma.user.findUnique.mockResolvedValueOnce({ country: 'US' })
    prisma.paymentProviderRegistry.findUnique.mockResolvedValueOnce({
      provider: 'CASH_ON_DELIVERY',
      enabled: true,
      supportedCountries: [],
    })
    prisma.paymentAccount.upsert.mockResolvedValueOnce({ id: 'pa_cod' })
    prisma.user.update.mockResolvedValueOnce({ id: 'user_1' })
    prisma.user.findUnique.mockResolvedValueOnce({
      country: 'US',
      defaultPaymentProvider: 'CASH_ON_DELIVERY',
    })
    prisma.paymentAccount.findMany.mockResolvedValueOnce([
      {
        provider: 'CASH_ON_DELIVERY',
        accountType: 'INDIVIDUAL',
        country: 'US',
        status: 'ACTIVE',
        onboardingComplete: true,
        detailsSubmitted: true,
        chargesEnabled: true,
        payoutsEnabled: false,
      },
    ])
    prisma.paymentProviderRegistry.findMany.mockResolvedValueOnce([
      {
        provider: 'CASH_ON_DELIVERY',
        displayName: 'Cash on Delivery',
        enabled: true,
        supportedCountries: [],
      },
    ])

    await expect(service.setDefaultProvider('user_1', 'cash_on_delivery')).resolves.toEqual(
      expect.objectContaining({ defaultProvider: 'cash_on_delivery' }),
    )
  })

  it('creates UPI payment deep links', () => {
    const prisma = createPrismaMock()
    const service = new PaymentAccountsService(prisma as never, createConfigMock() as never)

    expect(
      service.createUpiPaymentLink({ username: 'john', leadId: 'lead_1', amount: 5000 }),
    ).toEqual(expect.objectContaining({ id: 'upi_lead_1', currency: 'inr' }))
  })

  it('creates COD completion links', () => {
    const prisma = createPrismaMock()
    const service = new PaymentAccountsService(prisma as never, createConfigMock() as never)

    expect(service.createCashOnDeliveryLink({ username: 'john', leadId: 'lead_1' })).toEqual(
      expect.objectContaining({
        id: 'cod_lead_1',
        currency: 'cod',
      }),
    )
  })

  it('syncs Stripe Connect account updates from webhook events', async () => {
    const prisma = createPrismaMock()
    const service = new PaymentAccountsService(prisma as never, createConfigMock() as never)

    constructEventMock.mockReturnValueOnce({
      type: 'account.updated',
      data: { object: { id: 'acct_123' } },
    })
    prisma.paymentAccount.findUnique.mockResolvedValueOnce({ id: 'pa_1' })
    retrieveAccountMock.mockResolvedValueOnce({
      details_submitted: true,
      charges_enabled: true,
      payouts_enabled: true,
    })
    prisma.paymentAccount.update.mockResolvedValueOnce({ id: 'pa_1' })

    await expect(
      service.handleStripeConnectWebhook(Buffer.from('payload'), 'stripe_sig_123'),
    ).resolves.toEqual({ received: true })
  })

  it('lists available providers for the user country', async () => {
    const prisma = createPrismaMock()
    const service = new PaymentAccountsService(prisma as never, createConfigMock() as never)

    prisma.user.findUnique.mockResolvedValueOnce({ country: 'IN', defaultPaymentProvider: null })
    prisma.paymentAccount.findMany.mockResolvedValueOnce([])
    prisma.paymentProviderRegistry.findMany.mockResolvedValueOnce([
      {
        provider: 'UPI_LINK',
        displayName: 'UPI Payment Link',
        enabled: true,
        supportedCountries: ['IN'],
      },
      {
        provider: 'STRIPE_CONNECT',
        displayName: 'Stripe Connect',
        enabled: true,
        supportedCountries: [],
      },
    ])

    await expect(service.getAccount('user_1')).resolves.toEqual(
      expect.objectContaining({
        providers: expect.arrayContaining([
          expect.objectContaining({ provider: 'upi_link' }),
          expect.objectContaining({ provider: 'stripe_connect' }),
        ]),
      }),
    )
  })

  it('blocks onboarding when Stripe mode is disabled', async () => {
    const prisma = createPrismaMock()
    const service = new PaymentAccountsService(prisma as never, createDisabledConfigMock() as never)

    await expect(
      service.createOrUpdateStripeAccount('user_1', 'individual'),
    ).rejects.toBeInstanceOf(ConflictException)
  })

  it('creates seller checkout sessions on the connected account', async () => {
    const prisma = createPrismaMock()
    const service = new PaymentAccountsService(prisma as never, createConfigMock() as never)

    createCheckoutSessionMock.mockResolvedValueOnce({
      id: 'cs_123',
      url: 'https://checkout.stripe.com/c/cs_123',
    })

    await expect(
      service.createStripeCheckoutSession({
        username: 'john',
        leadId: 'lead_1',
        amount: 5000,
        providerAccountId: 'acct_123',
      }),
    ).resolves.toEqual({ id: 'cs_123', url: 'https://checkout.stripe.com/c/cs_123' })

    expect(createCheckoutSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({ success_url: 'http://localhost:3000/success' }),
      { stripeAccount: 'acct_123' },
    )
  })

  it('rejects management links when there is no payment account', async () => {
    const prisma = createPrismaMock()
    const service = new PaymentAccountsService(prisma as never, createConfigMock() as never)

    prisma.paymentAccount.findUnique.mockResolvedValueOnce(null)

    await expect(service.createStripeManagementLink('user_1')).rejects.toBeInstanceOf(
      NotFoundException,
    )
  })
})
