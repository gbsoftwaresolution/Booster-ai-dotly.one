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
})
