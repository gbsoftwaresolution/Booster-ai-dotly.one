import {
  PrismaClient,
  Plan,
  CardTemplate,
  SocialPlatform,
  AnalyticsEventType,
  SubscriptionStatus,
} from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ─── User ──────────────────────────────────────────────────────────────────
  const user = await prisma.user.upsert({
    where: { email: 'test@dotly.one' },
    update: {
      username: 'testuser',
      name: 'Test User',
      pitch: 'I help businesses grow with fast, conversion-first sales links.',
      phone: '15550000001',
    },
    create: {
      email: 'test@dotly.one',
      username: 'testuser',
      name: 'Test User',
      pitch: 'I help businesses grow with fast, conversion-first sales links.',
      phone: '15550000001',
      plan: Plan.FREE,
    },
  })
  console.log(`✅ User: ${user.email} (${user.id})`)

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
