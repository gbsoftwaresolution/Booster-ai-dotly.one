import { BadRequestException } from '@nestjs/common'
import { CardsService } from './cards.service'

jest.mock('viem', () => ({
  createPublicClient: jest.fn(() => ({
    getTransactionReceipt: jest.fn(),
  })),
  decodeEventLog: jest.fn(),
  http: jest.fn(() => ({})),
}))

import { createPublicClient, decodeEventLog } from 'viem'

describe('CardsService service checkout', () => {
  function createService(overrides?: {
    cardFindUnique?: jest.Mock
    serviceOrderCreate?: jest.Mock
    serviceOrderFindUnique?: jest.Mock
    serviceOrderUpdate?: jest.Mock
  }) {
    const cardFindUnique = overrides?.cardFindUnique ?? jest.fn()
    const serviceOrderCreate = overrides?.serviceOrderCreate ?? jest.fn()
    const serviceOrderFindUnique = overrides?.serviceOrderFindUnique ?? jest.fn()
    const serviceOrderUpdate = overrides?.serviceOrderUpdate ?? jest.fn()

    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'owner_1' }) },
      card: {
        findUnique: cardFindUnique,
      },
      serviceOrder: {
        create: serviceOrderCreate,
        findUnique: serviceOrderFindUnique,
        update: serviceOrderUpdate,
        findMany: jest.fn().mockResolvedValue([]),
      },
    }

    const audit = { log: jest.fn().mockResolvedValue(undefined) }
    const analytics = { invalidateDashboardCache: jest.fn().mockResolvedValue(undefined) }
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'DOTLY_USDT_ADDRESS') return '0xtoken'
        if (key === 'ARBITRUM_RPC_URL') return 'https://arb.example'
        if (key === 'R2_PUBLIC_URL') return 'https://cdn.dotly.one'
        if (key === 'R2_ACCOUNT_ID') return 'acc'
        if (key === 'R2_ACCESS_KEY_ID') return 'key'
        if (key === 'R2_SECRET_ACCESS_KEY') return 'secret'
        if (key === 'R2_BUCKET') return 'bucket'
        return null
      }),
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string> = {
          R2_ACCOUNT_ID: 'acc',
          R2_ACCESS_KEY_ID: 'key',
          R2_SECRET_ACCESS_KEY: 'secret',
          R2_BUCKET: 'bucket',
        }
        return values[key] ?? 'value'
      }),
    }
    const authService = { validateAccessToken: jest.fn().mockResolvedValue({ sub: 'user_1' }) }

    return {
      service: new CardsService(
        prisma as never,
        audit as never,
        config as never,
        analytics as never,
        authService as never,
      ),
      cardFindUnique,
      serviceOrderCreate,
      serviceOrderFindUnique,
      serviceOrderUpdate,
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates a service checkout intent from card service offers', async () => {
    const cardFindUnique = jest.fn().mockResolvedValue({
      id: 'card_1',
      userId: 'owner_1',
      fields: {
        services: [{ id: 'offer_1', name: 'Pitch Deck Review', priceUsdt: '49.00' }],
      },
      user: { walletAddress: '0xhostwallet' },
    })
    const { service, serviceOrderCreate } = createService({ cardFindUnique })

    const result = await service.createServiceCheckoutIntent('alice', {
      serviceId: 'offer_1',
      customerName: 'Buyer',
      customerEmail: 'buyer@example.com',
      walletAddress: '0xbuyerwallet',
      notes: 'Need quick turnaround',
    })

    expect(result.serviceName).toBe('Pitch Deck Review')
    expect(result.amountUsdt).toBe('49.00')
    expect(serviceOrderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          cardId: 'card_1',
          ownerUserId: 'owner_1',
          serviceId: 'offer_1',
          serviceName: 'Pitch Deck Review',
          customerEmail: 'buyer@example.com',
          recipientAddress: '0xhostwallet',
        }),
      }),
    )
  })

  it('verifies a service checkout transfer and marks it completed', async () => {
    const cardFindUnique = jest
      .fn()
      .mockResolvedValueOnce({ id: 'card_1' })
      .mockResolvedValueOnce({
        id: 'card_1',
        userId: 'owner_1',
        fields: { services: [{ id: 'offer_1', name: 'Pitch Deck Review', priceUsdt: '49.00' }] },
        user: { walletAddress: '0xhostwallet' },
      })
    const serviceOrderFindUnique = jest.fn().mockResolvedValue({
      card: { handle: 'alice' },
      serviceId: 'offer_1',
      serviceName: 'Pitch Deck Review',
      walletAddress: '0xbuyerwallet',
      recipientAddress: '0xhostwallet',
      amountUsdt: '49.00',
      amountRaw: '49000000',
      tokenAddress: '0xtoken',
      status: 'INTENT_CREATED',
      txHash: null,
      createdAt: new Date(),
    })
    const serviceOrderUpdate = jest
      .fn()
      .mockResolvedValueOnce({ serviceId: 'offer_1', serviceName: 'Pitch Deck Review' })
      .mockResolvedValueOnce({})

    ;(createPublicClient as jest.Mock).mockReturnValue({
      getTransactionReceipt: jest.fn().mockResolvedValue({
        logs: [{ address: '0xtoken', data: '0x', topics: ['0x1'] }],
      }),
    })
    ;(decodeEventLog as jest.Mock).mockReturnValue({
      eventName: 'Transfer',
      args: {
        from: '0xbuyerwallet',
        to: '0xhostwallet',
        value: 49000000n,
      },
    })

    const { service } = createService({
      cardFindUnique,
      serviceOrderFindUnique,
      serviceOrderUpdate,
    })

    const result = await service.activateServiceCheckout(
      'alice',
      'svc_payment',
      `0x${'1'.repeat(64)}`,
    )

    expect(result.success).toBe(true)
    expect(serviceOrderUpdate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { paymentId: 'svc_payment' },
        data: expect.objectContaining({ status: 'VERIFIED' }),
      }),
    )
    expect(serviceOrderUpdate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { paymentId: 'svc_payment' },
        data: expect.objectContaining({ status: 'COMPLETED' }),
      }),
    )
  })

  it('rejects missing service offers on the card', async () => {
    const cardFindUnique = jest.fn().mockResolvedValue({
      id: 'card_1',
      userId: 'owner_1',
      fields: { services: [] },
      user: { walletAddress: '0xhostwallet' },
    })
    const { service } = createService({ cardFindUnique })

    await expect(
      service.createServiceCheckoutIntent('alice', {
        serviceId: 'offer_missing',
        customerName: 'Buyer',
        customerEmail: 'buyer@example.com',
        walletAddress: '0xbuyerwallet',
      }),
    ).rejects.toThrow(BadRequestException)
  })
})
