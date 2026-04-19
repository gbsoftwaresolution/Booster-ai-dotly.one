import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  PaymentAccountStatus,
  PaymentAccountType,
  PaymentProvider,
  type User,
  type PaymentAccount,
} from '@prisma/client'
import Stripe from 'stripe'
import { PrismaService } from '../prisma/prisma.service'

type SellerAccountType = 'company' | 'individual'
type ProviderKey = 'stripe_connect' | 'upi_link' | 'cash_on_delivery'

const UPI_PAYMENT_AMOUNT = 5000
const UPI_DEEP_LINK_BASE = 'upi://pay'

@Injectable()
export class PaymentAccountsService {
  private readonly stripe: Stripe | null
  private readonly stripeMode: 'enabled' | 'disabled'

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.stripeMode = this.config.get<'enabled' | 'disabled'>('STRIPE_MODE') ?? 'disabled'
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY')
    this.stripe = this.stripeMode === 'enabled' && secretKey ? new Stripe(secretKey) : null
  }

  isStripeEnabled() {
    return this.stripeMode === 'enabled' && !!this.stripe
  }

  private toProvider(provider: ProviderKey): PaymentProvider {
    if (provider === 'stripe_connect') return PaymentProvider.STRIPE_CONNECT
    if (provider === 'upi_link') return PaymentProvider.UPI_LINK
    return PaymentProvider.CASH_ON_DELIVERY
  }

  private fromProvider(provider: PaymentProvider | null): ProviderKey | null {
    if (provider === PaymentProvider.STRIPE_CONNECT) return 'stripe_connect'
    if (provider === PaymentProvider.UPI_LINK) return 'upi_link'
    if (provider === PaymentProvider.CASH_ON_DELIVERY) return 'cash_on_delivery'
    return null
  }

  private toAccountType(accountType: SellerAccountType): PaymentAccountType {
    return accountType === 'company' ? PaymentAccountType.COMPANY : PaymentAccountType.INDIVIDUAL
  }

  private fromAccountType(accountType: PaymentAccountType | null): SellerAccountType | null {
    if (accountType === PaymentAccountType.COMPANY) return 'company'
    if (accountType === PaymentAccountType.INDIVIDUAL) return 'individual'
    return null
  }

  private isProviderAvailableInCountry(
    supportedCountries: string[],
    country: string | null | undefined,
  ) {
    return supportedCountries.length === 0 || (!!country && supportedCountries.includes(country))
  }

  private mapAccountStatus(account: PaymentAccount, fallbackCountry: string | null) {
    return {
      provider: this.fromProvider(account.provider),
      accountType: this.fromAccountType(account.accountType),
      country: account.country ?? fallbackCountry,
      status: account.status.toLowerCase(),
      onboardingComplete: account.onboardingComplete,
      detailsSubmitted: account.detailsSubmitted,
      chargesEnabled: account.chargesEnabled,
      payoutsEnabled: account.payoutsEnabled,
    }
  }

  async listProviders(country?: string | null) {
    await this.ensureCashOnDeliveryProvider()

    const providers = await this.prisma.paymentProviderRegistry.findMany({
      where: { enabled: true },
      orderBy: { displayName: 'asc' },
    })

    return providers
      .filter((provider) => this.isProviderAvailableInCountry(provider.supportedCountries, country))
      .map((provider) => ({
        provider: this.fromProvider(provider.provider),
        displayName: provider.displayName,
        enabled: provider.enabled,
        supportedCountries: provider.supportedCountries,
      }))
  }

  private async ensureCashOnDeliveryProvider() {
    const existing = await this.prisma.paymentProviderRegistry.findUnique({
      where: { provider: PaymentProvider.CASH_ON_DELIVERY },
    })

    if (existing) return

    await this.prisma.paymentProviderRegistry.create({
      data: {
        provider: PaymentProvider.CASH_ON_DELIVERY,
        displayName: 'Cash on Delivery',
        enabled: true,
        supportedCountries: [],
      },
    })
  }

  async getAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        country: true,
        defaultPaymentProvider: true,
      },
    })

    const accounts = await this.prisma.paymentAccount.findMany({
      where: { userId },
      orderBy: { provider: 'asc' },
    })

    return {
      stripeEnabled: this.isStripeEnabled(),
      defaultProvider: this.fromProvider(user?.defaultPaymentProvider ?? null),
      country: user?.country ?? null,
      providers: await this.listProviders(user?.country ?? null),
      accounts: accounts.map((account) => this.mapAccountStatus(account, user?.country ?? null)),
    }
  }

  async setDefaultProvider(userId: string, provider: ProviderKey) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { country: true },
    })

    if (!user) {
      throw new NotFoundException('User not found')
    }

    const registry = await this.prisma.paymentProviderRegistry.findUnique({
      where: { provider: this.toProvider(provider) },
    })

    if (
      !registry?.enabled ||
      !this.isProviderAvailableInCountry(registry.supportedCountries, user.country)
    ) {
      throw new ConflictException('This payment provider is not available for your account yet')
    }

    if (provider === 'upi_link' || provider === 'cash_on_delivery') {
      await this.prisma.paymentAccount.upsert({
        where: {
          userId_provider: {
            userId,
            provider: this.toProvider(provider),
          },
        },
        update: {
          accountType: PaymentAccountType.INDIVIDUAL,
          country: user.country,
          status: PaymentAccountStatus.ACTIVE,
          onboardingComplete: true,
          detailsSubmitted: true,
          chargesEnabled: true,
          payoutsEnabled: false,
        },
        create: {
          userId,
          provider: this.toProvider(provider),
          accountType: PaymentAccountType.INDIVIDUAL,
          country: user.country,
          status: PaymentAccountStatus.ACTIVE,
          onboardingComplete: true,
          detailsSubmitted: true,
          chargesEnabled: true,
          payoutsEnabled: false,
        },
      })
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { defaultPaymentProvider: this.toProvider(provider) },
    })

    return this.getAccount(userId)
  }

  async createOrUpdateStripeAccount(userId: string, accountType: SellerAccountType) {
    if (!this.isStripeEnabled() || !this.stripe) {
      throw new ConflictException('Stripe Connect is currently disabled')
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        country: true,
      },
    })

    if (!user) {
      throw new NotFoundException('User not found')
    }

    const country = user.country ?? 'US'
    const existing = await this.prisma.paymentAccount.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: PaymentProvider.STRIPE_CONNECT,
        },
      },
    })

    let providerAccountId = existing?.providerAccountId ?? null
    if (!providerAccountId) {
      const account = await this.stripe.accounts.create({
        type: 'express',
        country,
        email: user.email,
        business_type: accountType === 'company' ? 'company' : 'individual',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          userId,
          accountType,
        },
      })
      providerAccountId = account.id
    }

    const refreshed = await this.stripe.accounts.retrieve(providerAccountId)
    await this.prisma.paymentAccount.upsert({
      where: {
        userId_provider: {
          userId,
          provider: PaymentProvider.STRIPE_CONNECT,
        },
      },
      update: {
        accountType: this.toAccountType(accountType),
        country,
        status: refreshed.details_submitted
          ? PaymentAccountStatus.ACTIVE
          : PaymentAccountStatus.PENDING_ONBOARDING,
        providerAccountId,
        onboardingComplete: !!refreshed.details_submitted,
        detailsSubmitted: !!refreshed.details_submitted,
        chargesEnabled: !!refreshed.charges_enabled,
        payoutsEnabled: !!refreshed.payouts_enabled,
      },
      create: {
        userId,
        provider: PaymentProvider.STRIPE_CONNECT,
        accountType: this.toAccountType(accountType),
        country,
        status: refreshed.details_submitted
          ? PaymentAccountStatus.ACTIVE
          : PaymentAccountStatus.PENDING_ONBOARDING,
        providerAccountId,
        onboardingComplete: !!refreshed.details_submitted,
        detailsSubmitted: !!refreshed.details_submitted,
        chargesEnabled: !!refreshed.charges_enabled,
        payoutsEnabled: !!refreshed.payouts_enabled,
      },
    })

    await this.prisma.user.update({
      where: { id: userId },
      data: { defaultPaymentProvider: PaymentProvider.STRIPE_CONNECT },
    })

    const webUrl = this.config.getOrThrow<string>('WEB_URL').replace(/\/$/, '')
    const accountLink = await this.stripe.accountLinks.create({
      account: providerAccountId,
      refresh_url: `${webUrl}/settings/payments`,
      return_url: `${webUrl}/settings/payments`,
      type: 'account_onboarding',
    })

    return {
      url: accountLink.url,
    }
  }

  async createStripeManagementLink(userId: string) {
    if (!this.isStripeEnabled() || !this.stripe) {
      throw new ConflictException('Stripe Connect is currently disabled')
    }

    const account = await this.prisma.paymentAccount.findUnique({
      where: {
        userId_provider: {
          userId,
          provider: PaymentProvider.STRIPE_CONNECT,
        },
      },
    })

    if (!account?.providerAccountId) {
      throw new NotFoundException('Payment account not found')
    }

    const webUrl = this.config.getOrThrow<string>('WEB_URL').replace(/\/$/, '')
    const accountLink = await this.stripe.accountLinks.create({
      account: account.providerAccountId,
      refresh_url: `${webUrl}/settings/payments`,
      return_url: `${webUrl}/settings/payments`,
      type: 'account_update',
    })

    return {
      url: accountLink.url,
    }
  }

  async syncStripeAccountByProviderAccountId(providerAccountId: string) {
    if (!this.isStripeEnabled() || !this.stripe) {
      return null
    }

    const account = await this.prisma.paymentAccount.findUnique({
      where: { providerAccountId },
    })

    if (!account) {
      return null
    }

    const refreshed = await this.stripe.accounts.retrieve(providerAccountId)
    return this.prisma.paymentAccount.update({
      where: { id: account.id },
      data: {
        status: refreshed.details_submitted
          ? PaymentAccountStatus.ACTIVE
          : PaymentAccountStatus.PENDING_ONBOARDING,
        onboardingComplete: !!refreshed.details_submitted,
        detailsSubmitted: !!refreshed.details_submitted,
        chargesEnabled: !!refreshed.charges_enabled,
        payoutsEnabled: !!refreshed.payouts_enabled,
      },
    })
  }

  async handleStripeConnectWebhook(rawBody?: Buffer, signature?: string) {
    if (!this.isStripeEnabled() || !this.stripe) {
      return { received: true as const }
    }

    const webhookSecret = this.config.get<string>('STRIPE_CONNECT_WEBHOOK_SECRET')
    if (!webhookSecret || !rawBody || !signature) {
      throw new ConflictException('Stripe Connect webhook is not configured')
    }

    const event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
    if (event.type === 'account.updated') {
      const account = event.data.object
      await this.syncStripeAccountByProviderAccountId(account.id)
    }

    return { received: true as const }
  }

  async getActiveProviderForUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true, country: true, defaultPaymentProvider: true },
    })

    if (!user) {
      throw new NotFoundException('Profile not found')
    }

    const accounts = await this.prisma.paymentAccount.findMany({ where: { userId: user.id } })
    return this.resolveActiveProviderForUser({
      country: user.country,
      defaultPaymentProvider: user.defaultPaymentProvider,
      paymentAccounts: accounts,
    })
  }

  async resolveActiveProviderForUser(params: {
    country: string | null
    defaultPaymentProvider: User['defaultPaymentProvider']
    paymentAccounts: Array<
      Pick<
        PaymentAccount,
        'provider' | 'providerAccountId' | 'country' | 'chargesEnabled' | 'detailsSubmitted'
      >
    >
  }) {
    const registry = await this.prisma.paymentProviderRegistry.findMany({
      where: { enabled: true },
    })
    const supported = new Map(registry.map((entry) => [entry.provider, entry]))
    const preferred = params.defaultPaymentProvider ?? null

    const availableAccounts = params.paymentAccounts.filter((account) => {
      const provider = supported.get(account.provider)
      if (!provider) return false
      return this.isProviderAvailableInCountry(
        provider.supportedCountries,
        account.country ?? params.country,
      )
    })

    const preferredAccount = availableAccounts.find((account) => account.provider === preferred)
    const fallbackStripe = availableAccounts.find(
      (account) =>
        account.provider === PaymentProvider.STRIPE_CONNECT &&
        this.isStripeEnabled() &&
        account.providerAccountId &&
        account.chargesEnabled &&
        account.detailsSubmitted,
    )
    const fallbackUpi = availableAccounts.find(
      (account) => account.provider === PaymentProvider.UPI_LINK && account.chargesEnabled,
    )
    const fallbackCod = availableAccounts.find(
      (account) => account.provider === PaymentProvider.CASH_ON_DELIVERY && account.chargesEnabled,
    )
    const active = preferredAccount ?? fallbackStripe ?? fallbackUpi ?? fallbackCod ?? null

    if (
      active?.provider === PaymentProvider.STRIPE_CONNECT &&
      active.providerAccountId &&
      active.chargesEnabled &&
      active.detailsSubmitted &&
      this.isStripeEnabled()
    ) {
      return {
        provider: 'stripe_connect' as const,
        providerAccountId: active.providerAccountId,
        country: active.country ?? params.country ?? null,
      }
    }

    if (active?.provider === PaymentProvider.UPI_LINK && active.chargesEnabled) {
      return {
        provider: 'upi_link' as const,
        providerAccountId: active.providerAccountId,
        country: active.country ?? params.country ?? null,
      }
    }

    if (active?.provider === PaymentProvider.CASH_ON_DELIVERY && active.chargesEnabled) {
      return {
        provider: 'cash_on_delivery' as const,
        providerAccountId: active.providerAccountId,
        country: active.country ?? params.country ?? null,
      }
    }

    const codProvider = supported.get(PaymentProvider.CASH_ON_DELIVERY)
    if (
      codProvider &&
      this.isProviderAvailableInCountry(codProvider.supportedCountries, params.country)
    ) {
      return {
        provider: 'cash_on_delivery' as const,
        providerAccountId: null,
        country: params.country ?? null,
      }
    }

    return {
      provider: null,
      providerAccountId: null,
      country: params.country ?? null,
    }
  }

  async createStripeCheckoutSession(params: {
    username: string
    leadId: string
    amount: number
    providerAccountId: string
  }) {
    if (!this.isStripeEnabled() || !this.stripe) {
      throw new ConflictException('Stripe Connect is currently disabled')
    }

    const webUrl = this.config.getOrThrow<string>('WEB_URL').replace(/\/$/, '')
    return this.stripe.checkout.sessions.create(
      {
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: 'Service Payment',
              },
              unit_amount: params.amount,
            },
            quantity: 1,
          },
        ],
        success_url: `${webUrl}/success`,
        cancel_url: `${webUrl}/link/${encodeURIComponent(params.username)}`,
        metadata: {
          username: params.username,
          leadId: params.leadId,
          provider: 'stripe_connect',
          providerAccountId: params.providerAccountId,
        },
      },
      { stripeAccount: params.providerAccountId },
    )
  }

  createUpiPaymentLink(params: { username: string; leadId: string; amount: number }) {
    if (params.amount !== UPI_PAYMENT_AMOUNT) {
      throw new ConflictException('UPI payment amount is not supported')
    }

    const payee = this.config.get<string>('UPI_PAYEE_VPA')
    const payeeName = this.config.get<string>('UPI_PAYEE_NAME') ?? 'Dotly Seller'

    if (!payee) {
      throw new ConflictException('UPI link payments are not configured')
    }

    const amount = (params.amount / 100).toFixed(2)
    const query = new URLSearchParams({
      pa: payee,
      pn: payeeName,
      tr: params.leadId,
      tn: `Dotly payment for ${params.username}`,
      am: amount,
      cu: 'INR',
    })

    return {
      id: `upi_${params.leadId}`,
      url: `${UPI_DEEP_LINK_BASE}?${query.toString()}`,
      currency: 'inr',
    }
  }

  createCashOnDeliveryLink(params: { username: string; leadId: string }) {
    const webUrl = this.config.getOrThrow<string>('WEB_URL').replace(/\/$/, '')
    const query = new URLSearchParams({ mode: 'cod', user: params.username, leadId: params.leadId })

    return {
      id: `cod_${params.leadId}`,
      url: `${webUrl}/success?${query.toString()}`,
      currency: 'cod',
    }
  }
}
