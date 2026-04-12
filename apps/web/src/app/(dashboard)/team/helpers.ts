import { formatDate } from '@/lib/tz'

import type { Team } from './types'

export function validateTeamName(name: string): string | null {
  const trimmedName = name.trim()

  if (!trimmedName) return 'Team name is required.'
  if (trimmedName.length < 2) return 'Team name must be at least 2 characters.'

  return null
}

export function validateInviteEmail(email: string): string | null {
  const trimmedEmail = email.trim()

  if (!trimmedEmail) return 'Email is required.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return 'Enter a valid email address.'
  }

  return null
}

export function getTeamStats(team: Team | null): {
  memberCount: number
  adminCount: number
  pendingInvites: number
  latestInvite: Team['invites'][number] | undefined
} {
  const memberCount = team?.members.length ?? 0
  const adminCount = team?.members.filter((member) => member.role === 'ADMIN').length ?? 0
  const pendingInvites = team?.invites.length ?? 0
  const latestInvite = team?.invites
    ?.slice()
    .sort((a, b) => new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime())[0]

  return { memberCount, adminCount, pendingInvites, latestInvite }
}

export function getFocusMessage(
  team: Team | null,
  pendingInvites: number,
  memberCount: number,
): string {
  if (!team) {
    return 'Create your team to centralize members, invites, and shared ownership.'
  }

  if (pendingInvites > 0) {
    return `${pendingInvites} invite${pendingInvites === 1 ? '' : 's'} still need acceptance.`
  }

  return `${memberCount} team member${memberCount === 1 ? '' : 's'} are active in your workspace.`
}

export function formatLatestInvite(
  latestInvite: Team['invites'][number] | undefined,
  userTz: string,
): string {
  if (!latestInvite) return 'None'
  return formatDate(latestInvite.expiresAt, userTz)
}
