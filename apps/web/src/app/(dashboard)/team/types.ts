export interface TeamMemberUser {
  id: string
  name: string | null
  email: string
  avatarUrl: string | null
}

export interface TeamMember {
  id: string
  userId: string
  role: 'ADMIN' | 'MEMBER'
  joinedAt: string
  user: TeamMemberUser
}

export interface TeamInvite {
  id: string
  email: string
  role: string
  expiresAt: string
}

export interface Team {
  id: string
  name: string
  ownerUserId: string
  brandConfig: Record<string, unknown>
  members: TeamMember[]
  invites: TeamInvite[]
}

export interface CurrentUser {
  id: string
}

export interface ConfirmDialogState {
  message: string
  onConfirm: () => void
}
