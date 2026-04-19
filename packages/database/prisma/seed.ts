import {
  PrismaClient,
  Plan,
  CardTemplate,
  SocialPlatform,
  AnalyticsEventType,
  SubscriptionStatus,
  PaymentProvider,
  PaymentAccountStatus,
  PaymentAccountType,
  DayOfWeek,
} from '@prisma/client'
import { pbkdf2Sync, randomBytes } from 'crypto'

const prisma = new PrismaClient()

const PASSWORD_ITERATIONS = 210_000
const PASSWORD_KEYLEN = 64
const PASSWORD_DIGEST = 'sha512'

function encodePassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const derived = pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, PASSWORD_KEYLEN, PASSWORD_DIGEST)
  return [
    'pbkdf2',
    PASSWORD_DIGEST,
    String(PASSWORD_ITERATIONS),
    salt,
    derived.toString('hex'),
  ].join(':')
}

async function main() {
  console.log('🌱 Seeding database...')

  const sharedPasswordHash = encodePassword('Dotly123!')
  const now = new Date()
  const currentYear = now.getUTCFullYear()
  const currentMonth = now.getUTCMonth()

  // ─── User ──────────────────────────────────────────────────────────────────
  const user = await prisma.user.upsert({
    where: { email: 'test@dotly.one' },
    update: {
      username: 'testuser',
      name: 'Test User',
      pitch: 'I help businesses grow with fast, conversion-first sales links.',
      phone: '15550000001',
      emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
      passwordHash: sharedPasswordHash,
      country: 'US',
    },
    create: {
      email: 'test@dotly.one',
      username: 'testuser',
      name: 'Test User',
      pitch: 'I help businesses grow with fast, conversion-first sales links.',
      phone: '15550000001',
      plan: Plan.FREE,
      emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
      passwordHash: sharedPasswordHash,
      country: 'US',
    },
  })
  console.log(`✅ User: ${user.email} (${user.id})`)

  const starterUser = await prisma.user.upsert({
    where: { email: 'starter@dotly.one' },
    update: {
      username: 'starteruser',
      name: 'Starter User',
      pitch: 'I qualify leads with a lightweight sales link before they book.',
      phone: '15550000002',
      plan: Plan.STARTER,
      emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
      passwordHash: sharedPasswordHash,
      country: 'US',
    },
    create: {
      email: 'starter@dotly.one',
      username: 'starteruser',
      name: 'Starter User',
      pitch: 'I qualify leads with a lightweight sales link before they book.',
      phone: '15550000002',
      plan: Plan.STARTER,
      emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
      passwordHash: sharedPasswordHash,
      country: 'US',
    },
  })
  console.log(`✅ User: ${starterUser.email} (${starterUser.id})`)

  const proUser = await prisma.user.upsert({
    where: { email: 'pro@dotly.one' },
    update: {
      username: 'prouser',
      name: 'Pro User',
      pitch: 'I run a full funnel with chat, booking, payment, and upgrade-ready analytics.',
      phone: '15550000003',
      plan: Plan.PRO,
      emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
      passwordHash: sharedPasswordHash,
      country: 'US',
      defaultPaymentProvider: PaymentProvider.CASH_ON_DELIVERY,
    },
    create: {
      email: 'pro@dotly.one',
      username: 'prouser',
      name: 'Pro User',
      pitch: 'I run a full funnel with chat, booking, payment, and upgrade-ready analytics.',
      phone: '15550000003',
      plan: Plan.PRO,
      emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
      passwordHash: sharedPasswordHash,
      country: 'US',
      defaultPaymentProvider: PaymentProvider.CASH_ON_DELIVERY,
    },
  })
  console.log(`✅ User: ${proUser.email} (${proUser.id})`)

  const proNoPaymentsUser = await prisma.user.upsert({
    where: { email: 'pro-no-payments@dotly.one' },
    update: {
      username: 'pronopayments',
      name: 'Pro No Payments',
      pitch: 'I have a paid plan but no live payment account to complete checkout.',
      phone: '15550000004',
      plan: Plan.PRO,
      emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
      passwordHash: sharedPasswordHash,
      country: 'US',
      defaultPaymentProvider: PaymentProvider.STRIPE_CONNECT,
    },
    create: {
      email: 'pro-no-payments@dotly.one',
      username: 'pronopayments',
      name: 'Pro No Payments',
      pitch: 'I have a paid plan but no live payment account to complete checkout.',
      phone: '15550000004',
      plan: Plan.PRO,
      emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
      passwordHash: sharedPasswordHash,
      country: 'US',
      defaultPaymentProvider: PaymentProvider.STRIPE_CONNECT,
    },
  })
  console.log(`✅ User: ${proNoPaymentsUser.email} (${proNoPaymentsUser.id})`)

  // ─── Card ──────────────────────────────────────────────────────────────────
  const card = await prisma.card.upsert({
    where: { handle: 'test-user' },
    update: {},
    create: {
      userId: user.id,
      handle: 'test-user',
      templateId: CardTemplate.MINIMAL,
      isActive: true,
      fields: {
        name: 'Test User',
        title: 'Software Engineer',
        company: 'Dotly.one',
        phone: '+1 (555) 000-0001',
        email: 'test@dotly.one',
        website: 'https://dotly.one/test-user',
        bio: 'Building the future of digital business cards at Dotly.one.',
      },
    },
  })
  console.log(`✅ Card: ${card.handle} (${card.id})`)

  const starterCard = await prisma.card.upsert({
    where: { handle: 'starter-user' },
    update: {
      isActive: true,
      fields: {
        name: 'Starter User',
        title: 'Growth Consultant',
        company: 'Dotly.one',
        phone: '+1 (555) 000-0002',
        email: 'starter@dotly.one',
        website: 'https://dotly.one/starter-user',
        bio: 'Starter plan seller for upgrade and plan-gate testing.',
      },
    },
    create: {
      userId: starterUser.id,
      handle: 'starter-user',
      templateId: CardTemplate.MINIMAL,
      isActive: true,
      fields: {
        name: 'Starter User',
        title: 'Growth Consultant',
        company: 'Dotly.one',
        phone: '+1 (555) 000-0002',
        email: 'starter@dotly.one',
        website: 'https://dotly.one/starter-user',
        bio: 'Starter plan seller for upgrade and plan-gate testing.',
      },
    },
  })
  console.log(`✅ Card: ${starterCard.handle} (${starterCard.id})`)

  const proCard = await prisma.card.upsert({
    where: { handle: 'pro-user' },
    update: {
      isActive: true,
      fields: {
        name: 'Pro User',
        title: 'Revenue Advisor',
        company: 'Dotly.one',
        phone: '+1 (555) 000-0003',
        email: 'pro@dotly.one',
        website: 'https://dotly.one/pro-user',
        bio: 'Pro plan seller with bookings and COD payments enabled for E2E verification.',
      },
    },
    create: {
      userId: proUser.id,
      handle: 'pro-user',
      templateId: CardTemplate.MINIMAL,
      isActive: true,
      fields: {
        name: 'Pro User',
        title: 'Revenue Advisor',
        company: 'Dotly.one',
        phone: '+1 (555) 000-0003',
        email: 'pro@dotly.one',
        website: 'https://dotly.one/pro-user',
        bio: 'Pro plan seller with bookings and COD payments enabled for E2E verification.',
      },
    },
  })
  console.log(`✅ Card: ${proCard.handle} (${proCard.id})`)

  const proNoPaymentsCard = await prisma.card.upsert({
    where: { handle: 'pro-no-payments' },
    update: {
      isActive: true,
      fields: {
        name: 'Pro No Payments',
        title: 'Revenue Advisor',
        company: 'Dotly.one',
        phone: '+1 (555) 000-0004',
        email: 'pro-no-payments@dotly.one',
        website: 'https://dotly.one/pro-no-payments',
        bio: 'Paid-plan seller used to verify missing payment-account handling.',
      },
    },
    create: {
      userId: proNoPaymentsUser.id,
      handle: 'pro-no-payments',
      templateId: CardTemplate.MINIMAL,
      isActive: true,
      fields: {
        name: 'Pro No Payments',
        title: 'Revenue Advisor',
        company: 'Dotly.one',
        phone: '+1 (555) 000-0004',
        email: 'pro-no-payments@dotly.one',
        website: 'https://dotly.one/pro-no-payments',
        bio: 'Paid-plan seller used to verify missing payment-account handling.',
      },
    },
  })
  console.log(`✅ Card: ${proNoPaymentsCard.handle} (${proNoPaymentsCard.id})`)

  // ─── CardTheme ─────────────────────────────────────────────────────────────
  const theme = await prisma.cardTheme.upsert({
    where: { cardId: card.id },
    update: {},
    create: {
      cardId: card.id,
      primaryColor: '#1a1a1a',
      secondaryColor: '#ffffff',
      fontFamily: 'Inter',
    },
  })
  console.log(`✅ CardTheme: ${theme.id}`)

  // ─── SocialLinks ───────────────────────────────────────────────────────────
  const socialLinksData = [
    { platform: SocialPlatform.LINKEDIN, url: 'https://linkedin.com/in/testuser', displayOrder: 0 },
    { platform: SocialPlatform.GITHUB, url: 'https://github.com/testuser', displayOrder: 1 },
    { platform: SocialPlatform.TWITTER, url: 'https://twitter.com/testuser', displayOrder: 2 },
  ]

  for (const linkData of socialLinksData) {
    // Use deleteMany + create for idempotency on (cardId, platform)
    await prisma.socialLink.deleteMany({
      where: { cardId: card.id, platform: linkData.platform },
    })
    const link = await prisma.socialLink.create({
      data: { cardId: card.id, ...linkData },
    })
    console.log(`✅ SocialLink: ${link.platform} → ${link.url}`)
  }

  // ─── QrCode ────────────────────────────────────────────────────────────────
  const qrCode = await prisma.qrCode.upsert({
    where: { cardId: card.id },
    update: {},
    create: {
      cardId: card.id,
      styleConfig: {
        fgColor: '#1a1a1a',
        bgColor: '#ffffff',
        logoUrl: null,
        size: 256,
      },
      shortUrl: 'https://dotly.one/test-user',
    },
  })
  console.log(`✅ QrCode: ${qrCode.shortUrl}`)

  // ─── AnalyticsEvents ───────────────────────────────────────────────────────
  const analyticsData = [
    {
      type: AnalyticsEventType.VIEW,
      country: 'US',
      device: 'mobile',
      referrer: 'https://linkedin.com',
    },
    {
      type: AnalyticsEventType.VIEW,
      country: 'IN',
      device: 'desktop',
      referrer: 'https://google.com',
    },
    { type: AnalyticsEventType.CLICK, country: 'US', device: 'mobile', referrer: null },
  ]

  for (const evtData of analyticsData) {
    const evt = await prisma.analyticsEvent.create({
      data: {
        cardId: card.id,
        type: evtData.type,
        metadata: { source: 'seed' },
        country: evtData.country,
        device: evtData.device,
        referrer: evtData.referrer,
      },
    })
    console.log(`✅ AnalyticsEvent: ${evt.type} from ${evt.country}`)
  }

  // ─── Contacts ──────────────────────────────────────────────────────────────
  const alice = await prisma.contact.upsert({
    where: { id: 'seed-contact-alice' },
    update: {},
    create: {
      id: 'seed-contact-alice',
      ownerUserId: user.id,
      name: 'Alice Johnson',
      email: 'alice@example.com',
      phone: '+1 (555) 100-0001',
      company: 'Acme Corp',
      title: 'Product Manager',
      notes: 'Met at TechConf 2026',
      tags: ['lead', 'hot'],
      sourceCardId: card.id,
    },
  })
  console.log(`✅ Contact: ${alice.name} (${alice.id})`)

  const bob = await prisma.contact.upsert({
    where: { id: 'seed-contact-bob' },
    update: {},
    create: {
      id: 'seed-contact-bob',
      ownerUserId: user.id,
      name: 'Bob Smith',
      email: 'bob@example.com',
      phone: '+1 (555) 200-0002',
      company: 'Beta Ltd',
      title: 'CEO',
      notes: 'Followed up by email on Apr 5',
      tags: ['prospect'],
      sourceCardId: card.id,
    },
  })
  console.log(`✅ Contact: ${bob.name} (${bob.id})`)

  // ─── CrmPipeline ───────────────────────────────────────────────────────────
  const alicePipeline = await prisma.crmPipeline.upsert({
    where: { contactId: alice.id },
    update: {},
    create: {
      contactId: alice.id,
      stage: 'NEW',
      ownerUserId: user.id,
    },
  })
  console.log(`✅ CrmPipeline: ${alice.name} → ${alicePipeline.stage}`)

  const bobPipeline = await prisma.crmPipeline.upsert({
    where: { contactId: bob.id },
    update: {},
    create: {
      contactId: bob.id,
      stage: 'CONTACTED',
      ownerUserId: user.id,
    },
  })
  console.log(`✅ CrmPipeline: ${bob.name} → ${bobPipeline.stage}`)

  // ─── Subscription ──────────────────────────────────────────────────────────
  const subscription = await prisma.subscription.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      plan: Plan.FREE,
      status: SubscriptionStatus.ACTIVE,
    },
  })
  console.log(`✅ Subscription: ${subscription.plan} / ${subscription.status}`)

  const starterSubscription = await prisma.subscription.upsert({
    where: { userId: starterUser.id },
    update: {
      plan: Plan.STARTER,
      status: SubscriptionStatus.ACTIVE,
    },
    create: {
      userId: starterUser.id,
      plan: Plan.STARTER,
      status: SubscriptionStatus.ACTIVE,
    },
  })
  console.log(`✅ Subscription: ${starterSubscription.plan} / ${starterSubscription.status}`)

  const proSubscription = await prisma.subscription.upsert({
    where: { userId: proUser.id },
    update: {
      plan: Plan.PRO,
      status: SubscriptionStatus.ACTIVE,
    },
    create: {
      userId: proUser.id,
      plan: Plan.PRO,
      status: SubscriptionStatus.ACTIVE,
    },
  })
  console.log(`✅ Subscription: ${proSubscription.plan} / ${proSubscription.status}`)

  await prisma.paymentProviderRegistry.upsert({
    where: { provider: PaymentProvider.CASH_ON_DELIVERY },
    update: { displayName: 'Cash on Delivery', enabled: true, supportedCountries: [] },
    create: {
      provider: PaymentProvider.CASH_ON_DELIVERY,
      displayName: 'Cash on Delivery',
      enabled: true,
      supportedCountries: [],
    },
  })
  console.log('✅ Payment provider: Cash on Delivery')

  await prisma.paymentAccount.upsert({
    where: {
      userId_provider: {
        userId: proUser.id,
        provider: PaymentProvider.CASH_ON_DELIVERY,
      },
    },
    update: {
      accountType: PaymentAccountType.INDIVIDUAL,
      country: 'US',
      status: PaymentAccountStatus.ACTIVE,
      onboardingComplete: true,
      detailsSubmitted: true,
      chargesEnabled: true,
      payoutsEnabled: false,
    },
    create: {
      userId: proUser.id,
      provider: PaymentProvider.CASH_ON_DELIVERY,
      accountType: PaymentAccountType.INDIVIDUAL,
      country: 'US',
      status: PaymentAccountStatus.ACTIVE,
      onboardingComplete: true,
      detailsSubmitted: true,
      chargesEnabled: true,
      payoutsEnabled: false,
    },
  })
  console.log('✅ Payment account: Pro user COD')

  const appointmentType = await prisma.appointmentType.upsert({
    where: {
      ownerUserId_slug: {
        ownerUserId: proUser.id,
        slug: 'intro-call',
      },
    },
    update: {
      name: 'Intro Call',
      description: 'A quick intro call for sales-link E2E coverage.',
      durationMins: 30,
      color: '#0ea5e9',
      bufferDays: 60,
      bufferAfterMins: 0,
      isActive: true,
      location: 'Google Meet',
      timezone: 'UTC',
      deletedAt: null,
    },
    create: {
      ownerUserId: proUser.id,
      slug: 'intro-call',
      name: 'Intro Call',
      description: 'A quick intro call for sales-link E2E coverage.',
      durationMins: 30,
      color: '#0ea5e9',
      bufferDays: 60,
      bufferAfterMins: 0,
      isActive: true,
      location: 'Google Meet',
      timezone: 'UTC',
    },
  })
  console.log(`✅ AppointmentType: ${appointmentType.slug}`)

  await prisma.availabilityRule.deleteMany({ where: { appointmentTypeId: appointmentType.id } })
  await prisma.availabilityRule.createMany({
    data: [
      {
        appointmentTypeId: appointmentType.id,
        dayOfWeek: DayOfWeek.MON,
        startTime: '10:00',
        endTime: '13:00',
      },
    ],
  })
  console.log('✅ Availability rules: Intro Call')

  await prisma.lead.deleteMany({ where: { username: 'testuser' } })
  await prisma.lead.createMany({
    data: Array.from({ length: 20 }, (_, index) => ({
      username: 'testuser',
      source: 'seed-limit',
      status: 'new',
      createdAt: new Date(Date.UTC(currentYear, currentMonth, Math.min(index + 1, 28), 10, 0, 0)),
    })),
  })
  console.log('✅ Lead limit fixtures: Free user at monthly cap')

  const seededLimitLead = await prisma.lead.findFirstOrThrow({ where: { username: 'testuser' } })
  await prisma.salesLinkBooking.deleteMany({ where: { username: 'testuser' } })
  await prisma.salesLinkBooking.createMany({
    data: [
      {
        username: 'testuser',
        leadId: seededLimitLead.id,
        slot: '2026-04-20 10:00',
      },
      {
        username: 'testuser',
        leadId: seededLimitLead.id,
        slot: '2026-04-20 12:00',
      },
      {
        username: 'testuser',
        leadId: seededLimitLead.id,
        slot: '2026-04-20 15:00',
      },
    ],
    skipDuplicates: true,
  })
  console.log('✅ Booking fixtures: Free user seeded slots')

  console.log('\n🎉 Seed complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
