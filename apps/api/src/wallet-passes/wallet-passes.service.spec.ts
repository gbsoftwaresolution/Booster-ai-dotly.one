import { ConfigService } from '@nestjs/config'
import { WalletPassesService } from './wallet-passes.service'

describe('WalletPassesService', () => {
  it('public Apple pass generation does not re-run owner auth checks', async () => {
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
      .spyOn(service as unknown as { signManifest: () => Promise<Buffer> }, 'signManifest')
      .mockResolvedValue(Buffer.from('signature'))
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

    await expect(service.getPublicPassForHandle('alice', null)).resolves.toBeInstanceOf(Buffer)
    expect(generateApplePassSpy).not.toHaveBeenCalled()
  })
})
