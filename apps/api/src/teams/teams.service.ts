import { randomUUID } from 'crypto'
import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { EmailService } from '../email/email.service'
import { assertSafeUrl } from '../common/utils/ssrf-guard'
import { Prisma } from '@dotly/database'

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name)
  private readonly allowedAssetHosts: Set<string>

  constructor(
    private prisma: PrismaService,
    private email: EmailService,
    private config: ConfigService,
  ) {
    const r2Url = this.config.get<string>('R2_PUBLIC_URL') ?? 'https://cdn.dotly.one'
    const allowedAssetHosts = new Set<string>(['cdn.dotly.one'])
    try {
      const normalized = r2Url.startsWith('http') ? r2Url : `https://${r2Url}`
      allowedAssetHosts.add(new URL(normalized).hostname)
    } catch {
      /* ignore invalid config */
    }
    this.allowedAssetHosts = allowedAssetHosts
  }

  private sanitizeAvatarUrl(value: string | null | undefined): string | null {
    if (!value) return null
    try {
      const url = new URL(value)
      if (['http:', 'https:'].includes(url.protocol) && this.allowedAssetHosts.has(url.hostname)) {
        return url.toString()
      }
    } catch {
      /* ignore */
    }
    return null
  }

  private sanitizeTeamUsers<
    T extends { members?: Array<{ user?: { avatarUrl?: string | null } | null }> },
  >(team: T): T {
    return {
      ...team,
      members: team.members?.map((member) => ({
        ...member,
        user: member.user
          ? {
              ...member.user,
              avatarUrl: this.sanitizeAvatarUrl(member.user.avatarUrl ?? null),
            }
          : member.user,
      })),
    }
  }

  private getTeamMemberLimit(plan: string): number {
    const TEAM_MEMBER_LIMITS: Record<string, number> = {
      FREE: 0,
      PRO: 0,
      BUSINESS: 10,
      AGENCY: 50,
      ENTERPRISE: Infinity,
    }
    return TEAM_MEMBER_LIMITS[plan] ?? 0
  }

  private async assertTeamHasSeatCapacity(
    tx: Prisma.TransactionClient,
    teamId: string,
    options?: { includePendingInvites?: boolean },
  ): Promise<void> {
    const team = await tx.team.findUnique({
      where: { id: teamId },
      select: { id: true, ownerUserId: true },
    })
    if (!team) throw new NotFoundException('Team not found')

    const owner = await tx.user.findUnique({
      where: { id: team.ownerUserId },
      select: { plan: true },
    })
    const memberLimit = this.getTeamMemberLimit(owner?.plan ?? 'FREE')
    if (memberLimit === Infinity) return

    const memberCount = await tx.teamMember.count({ where: { teamId } })
    const pendingInviteCount = options?.includePendingInvites
      ? await tx.teamInvite.count({
          where: {
            teamId,
            accepted: false,
            expiresAt: { gt: new Date() },
          },
        })
      : 0

    if (memberCount + pendingInviteCount >= memberLimit) {
      throw new ForbiddenException(
        `Your plan allows a maximum of ${memberLimit} team member(s). Upgrade to add more.`,
      )
    }
  }

  async createTeam(userId: string, name: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user || !(['BUSINESS', 'AGENCY', 'ENTERPRISE'] as string[]).includes(user.plan)) {
      throw new ForbiddenException('Team management requires Business plan or higher')
    }
    const slug = toSlug(name)
    // F-13: Catch Prisma unique-constraint violation (P2002) and surface a
    // 409 ConflictException instead of leaking a raw 500 Prisma error.
    try {
      return await this.prisma.team.create({
        data: {
          name,
          slug,
          ownerUserId: userId,
          members: { create: { userId, role: 'ADMIN' } },
        },
        include: { members: true },
      })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException(`A team with slug "${slug}" already exists`)
      }
      throw err
    }
  }

  async getTeam(teamId: string, userId: string) {
    const team = await this.prisma.team.findUnique({
      where: { id: teamId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        invites: {
          where: { accepted: false, expiresAt: { gt: new Date() } },
        },
      },
    })
    if (!team) throw new NotFoundException('Team not found')
    const member = team.members.find((m) => m.userId === userId)
    if (!member) throw new ForbiddenException('Not a team member')
    return this.sanitizeTeamUsers(team)
  }

  async getTeamBySlug(slug: string) {
    const match = await this.prisma.team.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, brandConfig: true },
    })
    if (!match) throw new NotFoundException('Team not found')
    const cfg = (match.brandConfig ?? {}) as Record<string, unknown>
    return {
      id: match.id,
      name: match.name,
      slug: match.slug,
      brandName: (cfg['brandName'] as string | undefined) ?? match.name,
      brandLogoUrl: (cfg['logoUrl'] as string | undefined) ?? null,
      brandColor: (cfg['primaryColor'] as string | undefined) ?? null,
    }
  }

  async updateTeam(
    teamId: string,
    userId: string,
    data: { name?: string; brandConfig?: Record<string, unknown> },
  ) {
    const member = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    })
    if (!member || member.role !== 'ADMIN') throw new ForbiddenException('Not an admin')
    // F-13: Catch slug collision on rename as well.
    try {
      return await this.prisma.team.update({
        where: { id: teamId },
        data: {
          ...(data.name !== undefined ? { name: data.name, slug: toSlug(data.name) } : {}),
          ...(data.brandConfig !== undefined ? { brandConfig: data.brandConfig as object } : {}),
        },
      })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('A team with this name/slug already exists')
      }
      throw err
    }
  }

  async inviteMember(
    teamId: string,
    userId: string,
    inviteeEmail: string,
    role: 'ADMIN' | 'MEMBER' = 'MEMBER',
  ) {
    // Use the composite unique index to look up the caller's membership directly —
    // this avoids the previous fragile pattern of filtering members and accessing
    // members[0], which is undefined when the caller is not a member at all.
    const callerMember = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    })
    if (!callerMember) throw new ForbiddenException('Not a team member')
    if (callerMember.role !== 'ADMIN') throw new ForbiddenException('Only admins can invite')

    const team = await this.prisma.team.findUnique({ where: { id: teamId } })
    if (!team) throw new NotFoundException('Team not found')

    // MED-06: Normalize the invitee email to lowercase so that
    // "User@Example.com" and "user@example.com" are treated as the same
    // address.  Without this, re-inviting with mixed case bypasses the
    // unique constraint and creates duplicate invites.
    const normalizedEmail = inviteeEmail.toLowerCase()

    // MED-06: Enforce plan-based team member limit.
    // FREE and PRO plans have teamMembers === 0 (no team feature).
    // BUSINESS allows up to 10 members, ENTERPRISE is unlimited.
    await this.assertTeamHasSeatCapacity(
      this.prisma as unknown as Prisma.TransactionClient,
      teamId,
      {
        includePendingInvites: true,
      },
    )

    const inviter = await this.prisma.user.findUnique({ where: { id: userId } })
    const token = randomUUID()
    const webUrl = this.config.getOrThrow<string>('WEB_URL')
    const existingInvite = await this.prisma.teamInvite.findFirst({
      where: {
        teamId,
        email: normalizedEmail,
        accepted: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    const invite = existingInvite
      ? await this.prisma.teamInvite.update({
          where: { id: existingInvite.id },
          data: {
            role,
            token,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        })
      : await this.prisma.teamInvite.create({
          data: {
            teamId,
            email: normalizedEmail,
            role,
            token,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        })

    void this.email
      .sendTeamInvite(
        normalizedEmail,
        team.name,
        inviter?.name || inviter?.email || 'A team member',
        `${webUrl}/team/accept?token=${invite.token}`,
      )
      // LOW-03: Log delivery failures so they are visible in monitoring/alerting.
      // Previously this was .catch(() => void 0) — a completely silent swallow —
      // meaning the admin had no indication the invited user never received an email.
      .catch((err: unknown) =>
        this.logger.error(
          `Team invite email failed for team ${teamId}`,
          err instanceof Error ? err.message : err,
        ),
      )
    return { message: existingInvite ? 'Invitation resent' : 'Invitation sent' }
  }

  async acceptInvite(token: string, userId: string) {
    const invite = await this.prisma.teamInvite.findUnique({ where: { token } })
    if (!invite || invite.accepted || invite.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired invite')
    }

    // F-11: Verify the authenticated user's email matches the invite email.
    // Without this check, any user who obtains the token (e.g. forwarded link,
    // guessed UUID) can accept an invite intended for someone else — including
    // accepting ADMIN invites meant for a colleague.
    const acceptingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    })
    if (!acceptingUser) throw new ForbiddenException('User not found')
    if (acceptingUser.email.toLowerCase() !== invite.email.toLowerCase()) {
      throw new ForbiddenException('This invite was sent to a different email address')
    }

    await this.prisma.$transaction(async (tx) => {
      await this.assertTeamHasSeatCapacity(tx, invite.teamId)

      await tx.teamMember.create({
        data: {
          teamId: invite.teamId,
          userId,
          role: invite.role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
        },
      })
      await tx.teamInvite.update({ where: { token }, data: { accepted: true } })
    })

    return { teamId: invite.teamId }
  }

  async removeMember(teamId: string, adminUserId: string, targetUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const admin = await tx.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: adminUserId } },
      })
      if (!admin || admin.role !== 'ADMIN') throw new ForbiddenException('Not an admin')

      const targetMember = await tx.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: targetUserId } },
      })
      if (targetMember?.role === 'ADMIN') {
        const adminCount = await tx.teamMember.count({
          where: { teamId, role: 'ADMIN' },
        })
        if (adminCount <= 1) {
          throw new BadRequestException(
            'Cannot remove the last admin. Promote another member to admin first.',
          )
        }
      }

      return tx.teamMember.delete({
        where: { teamId_userId: { teamId, userId: targetUserId } },
      })
    })
  }

  async updateMemberRole(
    teamId: string,
    adminUserId: string,
    targetUserId: string,
    role: 'ADMIN' | 'MEMBER',
  ) {
    return this.prisma.$transaction(async (tx) => {
      const admin = await tx.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: adminUserId } },
      })
      if (!admin || admin.role !== 'ADMIN') throw new ForbiddenException('Not an admin')

      if (role === 'MEMBER') {
        const targetMember = await tx.teamMember.findUnique({
          where: { teamId_userId: { teamId, userId: targetUserId } },
        })
        if (targetMember?.role === 'ADMIN') {
          const adminCount = await tx.teamMember.count({
            where: { teamId, role: 'ADMIN' },
          })
          if (adminCount <= 1) {
            throw new BadRequestException(
              'Cannot demote the last admin. Promote another member to admin first.',
            )
          }
        }
      }

      return tx.teamMember.update({
        where: { teamId_userId: { teamId, userId: targetUserId } },
        data: { role },
      })
    })
  }

  async getMyTeam(userId: string) {
    // Find the first team the user is a member of.
    // Most users will be in exactly one team; we return the first by creation date.
    const membership = await this.prisma.teamMember.findFirst({
      where: { userId },
      include: {
        team: {
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, email: true, avatarUrl: true } },
              },
            },
            invites: {
              where: { accepted: false, expiresAt: { gt: new Date() } },
            },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    })
    if (!membership) return null
    return this.sanitizeTeamUsers(membership.team)
  }

  async updateBrandConfig(
    teamId: string,
    userId: string,
    brandConfig: Record<string, unknown>,
    brandLock?: boolean,
  ) {
    const member = await this.prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId } },
    })
    if (!member || member.role !== 'ADMIN') throw new ForbiddenException('Not an admin')

    // F-05: Enforce a reasonable size limit on the brandConfig blob to prevent
    // storing megabytes of arbitrary data in a JSON column.
    const serialized = JSON.stringify(brandConfig)
    if (serialized.length > 16_384) {
      throw new BadRequestException('brandConfig exceeds maximum allowed size (16 KB)')
    }

    // Exhaustive list of every field in brandConfig that may contain a URL.
    // All of them must pass the SSRF guard (HTTPS-only, no private/internal IPs).
    // Adding a new URL field to brandConfig REQUIRES adding it here first.
    const URL_FIELDS_IN_BRAND_CONFIG = [
      'logoUrl',
      'backgroundUrl',
      'faviconUrl',
      'coverUrl',
    ] as const

    for (const field of URL_FIELDS_IN_BRAND_CONFIG) {
      const value = brandConfig[field]
      if (value === undefined || value === null) continue
      if (typeof value !== 'string') {
        throw new BadRequestException(`${field} must be a string`)
      }
      if (!value.startsWith('https://')) {
        throw new BadRequestException(`${field} must use HTTPS`)
      }
      // DNS-resolving SSRF guard — rejects private/loopback/link-local IPs
      await assertSafeUrl(value)
    }

    // Reject any non-URL string value that contains a URL-like scheme to prevent
    // SSRF via undocumented/future fields being passed in the free-form blob.
    for (const [key, value] of Object.entries(brandConfig)) {
      if (URL_FIELDS_IN_BRAND_CONFIG.includes(key as (typeof URL_FIELDS_IN_BRAND_CONFIG)[number]))
        continue
      if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
        throw new BadRequestException(
          `Field "${key}" contains a URL but is not a recognised URL field. Use logoUrl, backgroundUrl, faviconUrl, or coverUrl for image URLs.`,
        )
      }
    }

    return this.prisma.team.update({
      where: { id: teamId },
      data: {
        brandConfig: brandConfig as Prisma.InputJsonValue,
        ...(brandLock !== undefined ? { brandLock } : {}),
      },
    })
  }
}
