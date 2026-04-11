import { ConflictException } from '@nestjs/common'
import { TeamsService } from './teams.service'

describe('TeamsService.acceptInvite', () => {
  it('throws ConflictException when the user is already a team member', async () => {
    const prisma = {
      teamInvite: {
        findUnique: jest.fn().mockResolvedValue({
          token: 'tok_123',
          teamId: 'team_1',
          email: 'user@example.com',
          role: 'MEMBER',
          accepted: false,
          expiresAt: new Date(Date.now() + 60_000),
        }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ email: 'user@example.com' }),
      },
      teamMember: {
        findUnique: jest.fn().mockResolvedValue({ id: 'member_1' }),
      },
      $transaction: jest.fn(),
    }

    const email = {} as never
    const config = { get: jest.fn().mockReturnValue('https://cdn.dotly.one') } as never
    const service = new TeamsService(prisma as never, email, config)

    await expect(service.acceptInvite('tok_123', 'user_1')).rejects.toThrow(ConflictException)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })
})
