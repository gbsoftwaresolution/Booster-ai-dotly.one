import { ConfigService } from '@nestjs/config'
import { WalletPassesService } from './wallet-passes.service'

describe('WalletPassesService', () => {
  it('public Apple pass endpoint fails closed without re-running owner auth checks', async () => {
    const prisma = {} as never
    const config = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          WEB_URL: 'https://dotly.one',
          APPLE_PASS_TYPE_ID: 'pass.one.dotly.card',
          APPLE_TEAM_ID: 'TEAM123456',
          APPLE_PASS_CERT_P12: 'ZmFrZQ==',
          APPLE_PASS_CERT_PASS: 'secret',
        }
        return values[key]
      }),
    } as unknown as ConfigService

    const service = new WalletPassesService(prisma, config)
    const fakeCard = {
      id: 'card-1',
      userId: 'owner-1',
      handle: 'alice',
      fields: {},
      theme: null,
    }

    const generateApplePassSpy = jest.spyOn(service, 'generateApplePass')
    jest
      .spyOn(
        service as unknown as { getPublishedCardByHandle: () => Promise<typeof fakeCard> },
        'getPublishedCardByHandle',
      )
      .mockResolvedValue(fakeCard)
    jest
      .spyOn(
        service as unknown as {
          assertPublicExportAllowed: () => Promise<{ id: string; vcardPolicy: string }>
        },
        'assertPublicExportAllowed',
      )
      .mockResolvedValue({
        id: 'card-1',
        vcardPolicy: 'PUBLIC',
      })

    await expect(service.getPublicPassForHandle('alice', null)).rejects.toThrow(
      'Apple Wallet passes are temporarily unavailable',
    )
    expect(generateApplePassSpy).not.toHaveBeenCalled()
  })

  it('public export allows members-only cards when request user id is present', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 'card-1', vcardPolicy: 'MEMBERS_ONLY' }]),
    } as never
    const config = {
      get: jest.fn().mockReturnValue('https://dotly.one'),
    } as unknown as ConfigService
    const service = new WalletPassesService(prisma, config)

    await expect(
      (
        service as unknown as {
          assertPublicExportAllowed: (handle: string, userId: string | null) => Promise<unknown>
        }
      ).assertPublicExportAllowed('alice', 'user_1'),
    ).resolves.toEqual({ id: 'card-1', vcardPolicy: 'MEMBERS_ONLY' })
  })
})
