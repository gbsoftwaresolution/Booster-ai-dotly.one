jest.mock('../notifications/notifications.service', () => ({
  NotificationsService: class NotificationsService {},
}))

import { ContactsService } from './contacts.service'

describe('ContactsService.createFromLead', () => {
  it('persists a LeadSubmission for the default name/email/phone lead flow', async () => {
    const leadSubmissionCreate = jest.fn().mockResolvedValue({ id: 'submission_1' })
    const tx = {
      contact: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'contact_1' }),
      },
      crmPipeline: {
        create: jest.fn().mockResolvedValue({ id: 'pipeline_1' }),
      },
      contactTimeline: {
        create: jest.fn().mockResolvedValue({ id: 'timeline_1' }),
      },
      leadForm: {
        findUnique: jest.fn().mockResolvedValue({ id: 'lead_form_1' }),
      },
      leadSubmission: {
        create: leadSubmissionCreate,
      },
    }
    const prisma = {
      card: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'card_1',
          handle: 'alice',
          isActive: true,
          userId: 'owner_1',
          fields: { name: 'Alice' },
          user: {
            email: 'owner@example.com',
            pushToken: null,
          },
        }),
      },
      $transaction: jest.fn(async (callback: (trx: typeof tx) => Promise<unknown>) => callback(tx)),
    }
    const analyticsService = { record: jest.fn().mockResolvedValue(undefined) }
    const emailService = { sendNewLeadNotification: jest.fn().mockResolvedValue(undefined) }
    const notificationsService = { sendPushNotification: jest.fn().mockResolvedValue(undefined) }
    const redis = {
      getClient: jest.fn().mockReturnValue({
        eval: jest.fn().mockResolvedValue(1),
      }),
    }
    const webhooksService = { fanOut: jest.fn().mockResolvedValue(undefined) }
    const enrichmentQueue = { add: jest.fn().mockResolvedValue(undefined) }

    const service = new ContactsService(
      prisma as never,
      analyticsService as never,
      emailService as never,
      notificationsService as never,
      redis as never,
      webhooksService as never,
      enrichmentQueue as never,
    )

    const result = await service.createFromLead({
      cardId: 'card_1',
      sourceHandle: 'alice',
      name: 'Guest Name',
      email: 'guest@example.com',
      phone: '+1 555 000 0000',
    })

    expect(result).toEqual({ success: true, contactId: 'contact_1' })
    expect(leadSubmissionCreate).toHaveBeenCalledWith({
      data: {
        leadFormId: 'lead_form_1',
        contactId: 'contact_1',
        answers: {
          name: 'Guest Name',
          email: 'guest@example.com',
          phone: '+1 555 000 0000',
        },
      },
    })
  })

  it('creates an automation follow-up task for public WhatsApp automation events', async () => {
    const contactTaskCreate = jest
      .fn()
      .mockResolvedValue({ id: 'task_1', title: 'Reply to automated WhatsApp handoff' })
    const contactTimelineCreate = jest.fn().mockResolvedValue({ id: 'timeline_1' })
    const prisma = {
      contact: {
        findUnique: jest.fn().mockResolvedValue({ id: 'contact_1', ownerUserId: 'owner_1' }),
      },
      contactAutomationRule: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      contactTask: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: contactTaskCreate,
      },
      contactTimeline: {
        create: contactTimelineCreate,
      },
    }

    const service = new ContactsService(
      prisma as never,
      { record: jest.fn() } as never,
      { sendNewLeadNotification: jest.fn() } as never,
      { sendPushNotification: jest.fn() } as never,
      { getClient: jest.fn() } as never,
      { fanOut: jest.fn() } as never,
      { add: jest.fn() } as never,
    )

    await service.recordPublicTimelineEvent({
      contactId: 'contact_1',
      event: 'WHATSAPP_AUTOMATION_TRIGGERED',
      metadata: { nextStep: 'BOOK' },
    })

    expect(contactTaskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          contactId: 'contact_1',
          ownerUserId: 'owner_1',
          title: 'Reply to automated WhatsApp handoff',
          type: 'FOLLOW_UP',
          priority: 'HIGH',
        }),
      }),
    )
    expect(contactTimelineCreate).toHaveBeenCalledTimes(2)
  })

  it('uses persisted automation rules to control delayed follow-up creation', async () => {
    const contactTaskCreate = jest
      .fn()
      .mockResolvedValue({ id: 'task_2', title: 'Call high-intent lead' })
    const contactTimelineCreate = jest.fn().mockResolvedValue({ id: 'timeline_2' })
    const automationRuleFindFirst = jest.fn().mockResolvedValue({
      id: 'rule_1',
      taskTitle: 'Call high-intent lead',
      taskPriority: 'URGENT',
      taskType: 'CALL',
      delayMinutes: 15,
    })
    const prisma = {
      contact: {
        findUnique: jest.fn().mockResolvedValue({ id: 'contact_1', ownerUserId: 'owner_1' }),
      },
      contactAutomationRule: {
        findFirst: automationRuleFindFirst,
      },
      contactTask: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: contactTaskCreate,
      },
      contactTimeline: {
        create: contactTimelineCreate,
      },
    }

    const service = new ContactsService(
      prisma as never,
      { record: jest.fn() } as never,
      { sendNewLeadNotification: jest.fn() } as never,
      { sendPushNotification: jest.fn() } as never,
      { getClient: jest.fn() } as never,
      { fanOut: jest.fn() } as never,
      { add: jest.fn() } as never,
    )

    const before = Date.now()
    await service.recordPublicTimelineEvent({
      contactId: 'contact_1',
      event: 'LEAD_CAPTURED',
      metadata: { sourceHandle: 'alice' },
    })
    const after = Date.now()

    expect(automationRuleFindFirst).toHaveBeenCalled()
    expect(contactTaskCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Call high-intent lead',
          type: 'CALL',
          priority: 'URGENT',
        }),
      }),
    )
    const dueAt = (contactTaskCreate.mock.calls[0]?.[0] as { data: { dueAt: Date } }).data.dueAt
    expect(dueAt.getTime()).toBeGreaterThanOrEqual(before + 15 * 60_000)
    expect(dueAt.getTime()).toBeLessThanOrEqual(after + 15 * 60_000 + 1000)
  })
})
