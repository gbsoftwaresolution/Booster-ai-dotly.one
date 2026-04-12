import { BadRequestException, ConflictException } from '@nestjs/common'
import { TeamsService } from './teams.service'

type TeamTransaction = {
  team: { findUnique: jest.Mock }
  teamMember: {
    findUnique: jest.Mock
    count: jest.Mock
  }
}

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

describe('TeamsService authorization hardening', () => {
  it('hides pending invites from non-admin team members', async () => {
    const team = {
      id: 'team_1',
      ownerUserId: 'owner_1',
      members: [
        { userId: 'member_1', role: 'MEMBER', user: { avatarUrl: null } },
        { userId: 'owner_1', role: 'ADMIN', user: { avatarUrl: null } },
      ],
      invites: [{ id: 'invite_1', email: 'invitee@example.com', token: 'secret-token' }],
    }
    const prisma = {
      team: { findUnique: jest.fn().mockResolvedValue(team) },
    }
    const service = new TeamsService(prisma as never, {} as never, { get: jest.fn() } as never)

    const result = await service.getTeam('team_1', 'member_1')
    expect(result.invites).toEqual([])
  })

  it('prevents removing the team owner', async () => {
    const prisma = {
      $transaction: jest.fn(async (fn: (tx: TeamTransaction) => Promise<unknown>) =>
        fn({
          team: { findUnique: jest.fn().mockResolvedValue({ ownerUserId: 'owner_1' }) },
          teamMember: {
            findUnique: jest.fn().mockResolvedValue({ role: 'ADMIN' }),
            count: jest.fn().mockResolvedValue(2),
          },
        }),
      ),
    }
    const service = new TeamsService(prisma as never, {} as never, { get: jest.fn() } as never)

    await expect(service.removeMember('team_1', 'admin_2', 'owner_1')).rejects.toThrow(
      BadRequestException,
    )
  })

  it('prevents demoting the team owner', async () => {
    const prisma = {
      $transaction: jest.fn(async (fn: (tx: TeamTransaction) => Promise<unknown>) =>
        fn({
          team: { findUnique: jest.fn().mockResolvedValue({ ownerUserId: 'owner_1' }) },
          teamMember: {
            findUnique: jest.fn().mockResolvedValue({ role: 'ADMIN' }),
            count: jest.fn().mockResolvedValue(2),
          },
        }),
      ),
    }
    const service = new TeamsService(prisma as never, {} as never, { get: jest.fn() } as never)

    await expect(
      service.updateMemberRole('team_1', 'admin_2', 'owner_1', 'MEMBER'),
    ).rejects.toThrow(BadRequestException)
  })
})
