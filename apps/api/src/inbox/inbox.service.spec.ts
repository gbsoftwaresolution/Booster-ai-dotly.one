import { BadRequestException } from '@nestjs/common'
import { InboxService } from './inbox.service'

describe('InboxService upload confirmation', () => {
  function createService(redisSetResult: 'OK' | null = 'OK') {
    const prisma = {
      card: {
        findUnique: jest.fn().mockResolvedValue({ id: 'card_1', handle: 'alice', isActive: true }),
      },
      cardVoiceNote: {
        create: jest.fn().mockResolvedValue({ id: 'voice_1', createdAt: new Date() }),
      },
    }
    const redis = {
      getClient: jest.fn().mockReturnValue({
        set: jest.fn().mockResolvedValue(redisSetResult),
      }),
    }
    const config = {
      getOrThrow: jest.fn((key: string) => {
        const values: Record<string, string> = {
          R2_ACCOUNT_ID: 'acct',
          R2_ACCESS_KEY_ID: 'key',
          R2_SECRET_ACCESS_KEY: 'secret',
          R2_BUCKET: 'bucket',
        }
        return values[key] ?? 'value'
      }),
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          R2_PUBLIC_URL: 'https://cdn.dotly.one',
        }
        return values[key]
      }),
    }
    const service = new InboxService(prisma as never, config as never, redis as never)
    return { service, prisma, redis }
  }

  it('rejects confirmation when the uploaded object cannot be verified', async () => {
    const { service, prisma, redis } = createService()
    ;(service as unknown as { r2Client: { send: jest.Mock } }).r2Client = {
      send: jest.fn().mockRejectedValue(new Error('missing object')),
    }
    const uploadToken = (
      service as unknown as {
        encodeUploadToken: (payload: Record<string, unknown>) => string
      }
    ).encodeUploadToken({
      cardId: 'card_1',
      publicUrl: 'https://cdn.dotly.one/inbox/voice/card_1/test.webm',
      contentType: 'audio/webm',
      fileSizeBytes: 123,
      category: 'voice',
      nonce: 'nonce_1',
      exp: Date.now() + 60_000,
    })

    await expect(
      service.confirmVoiceNote('alice', 'Guest', 'guest@example.com', uploadToken, 5),
    ).rejects.toThrow(new BadRequestException('Uploaded file could not be verified'))

    expect(redis.getClient().set).not.toHaveBeenCalled()
    expect(prisma.cardVoiceNote.create).not.toHaveBeenCalled()
  })

  it('rejects confirmation when the upload token nonce was already consumed', async () => {
    const { service, prisma } = createService(null)
    ;(service as unknown as { r2Client: { send: jest.Mock } }).r2Client = {
      send: jest.fn().mockResolvedValue({}),
    }
    const uploadToken = (
      service as unknown as {
        encodeUploadToken: (payload: Record<string, unknown>) => string
      }
    ).encodeUploadToken({
      cardId: 'card_1',
      publicUrl: 'https://cdn.dotly.one/inbox/voice/card_1/test.webm',
      contentType: 'audio/webm',
      fileSizeBytes: 123,
      category: 'voice',
      nonce: 'nonce_2',
      exp: Date.now() + 60_000,
    })

    await expect(
      service.confirmVoiceNote('alice', 'Guest', 'guest@example.com', uploadToken, 5),
    ).rejects.toThrow(new BadRequestException('Upload token has already been used'))

    expect(prisma.cardVoiceNote.create).not.toHaveBeenCalled()
  })
})
