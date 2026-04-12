'use client'

import type { JSX } from 'react'
import { useEffect, useRef } from 'react'

import { SelectField } from '@/components/ui/SelectField'
import { AlertTriangle, Users } from 'lucide-react'
import { formatDate } from '@/lib/tz'

import type { Team, TeamInvite } from './types'

export function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string
  onConfirm: () => void
  onCancel: () => void
}): JSX.Element {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousActiveElementRef.current = document.activeElement as HTMLElement | null
    cancelButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled])'),
      )
      if (focusableElements.length === 0) return

      const first = focusableElements[0]
      const last = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousActiveElementRef.current?.focus()
    }
  }, [onCancel])

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onCancel} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-confirm-dialog-title"
        className="app-confirm-panel"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 id="team-confirm-dialog-title" className="text-sm font-semibold text-gray-900">
              Confirm action
            </h3>
            <p className="mt-1 text-sm text-gray-500">{message}</p>
          </div>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="app-touch-target rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="app-touch-target rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            Confirm
          </button>
        </div>
      </div>
    </>
  )
}

export function PageSpinner(): JSX.Element {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
    </div>
  )
}

export function TeamHero({
  loading,
  team,
  canManageTeam,
  memberCount,
  adminCount,
  pendingInvites,
  latestInviteLabel,
  focusMessage,
  onCreateTeam,
  onInviteMember,
}: {
  loading: boolean
  team: Team | null
  canManageTeam: boolean
  memberCount: number
  adminCount: number
  pendingInvites: number
  latestInviteLabel: string
  focusMessage: string
  onCreateTeam: () => void
  onInviteMember: () => void
}): JSX.Element {
  const metrics = [
    { label: 'Members', value: loading ? '—' : memberCount },
    { label: 'Admins', value: loading ? '—' : adminCount },
    { label: 'Pending Invites', value: loading ? '—' : pendingInvites },
    { label: 'Latest Invite', value: loading ? '—' : latestInviteLabel },
  ]

  const snapshots = [
    {
      label: 'Workspace state',
      value: loading ? '—' : team ? 'Active' : 'Not set',
      detail: team ? team.name : 'No team workspace created yet',
      tone: 'bg-sky-50 text-sky-600',
    },
    {
      label: 'Admin coverage',
      value: loading ? '—' : `${adminCount}`,
      detail: team ? 'Admins with workspace management access' : 'Create a team to assign admins',
      tone: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: 'Invite queue',
      value: loading ? '—' : `${pendingInvites}`,
      detail:
        pendingInvites > 0
          ? 'Invites still waiting for acceptance'
          : 'No pending invites right now',
      tone: pendingInvites > 0 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600',
    },
  ]

  return (
    <div className="app-panel relative overflow-hidden rounded-[34px] px-6 py-6 sm:px-8 sm:py-7">
      <div
        className="absolute inset-0 opacity-90"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(circle at top left, rgba(14,165,233,0.12), transparent 34%), radial-gradient(circle at right center, rgba(99,102,241,0.10), transparent 28%), linear-gradient(135deg, rgba(255,255,255,0.94), rgba(248,250,252,0.98))',
        }}
      />
      <div className="relative grid gap-5 xl:grid-cols-[1.35fr_0.92fr] xl:items-start">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-600">
            <Users className="h-3.5 w-3.5" />
            Collaboration
          </div>
          <h1 className="mt-3 text-2xl font-bold text-gray-900 sm:text-[2rem]">
            Manage your shared workspace with more clarity
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500 sm:text-[15px]">
            Keep team membership, admin ownership, and outstanding invites visible in one place as
            your collaborative workspace grows.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:max-w-xl sm:grid-cols-4">
            {metrics.map(({ label, value }) => (
              <div
                key={label}
                className="rounded-[22px] border border-white/80 bg-white/85 px-3 py-3 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.2)]"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                  {label}
                </p>
                <p className="mt-1 text-sm font-bold text-gray-900 sm:text-base">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {team && canManageTeam ? (
              <button
                type="button"
                onClick={onInviteMember}
                className="inline-flex items-center gap-2 rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_20px_40px_-28px_rgba(14,165,233,0.42)] transition-transform hover:-translate-y-0.5 hover:bg-brand-600"
              >
                <Users className="h-4 w-4" />
                Invite Member
              </button>
            ) : team ? (
              <div className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                Admins only can invite members and manage roles.
              </div>
            ) : (
              <button
                type="button"
                onClick={onCreateTeam}
                className="inline-flex items-center gap-2 rounded-2xl bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_20px_40px_-28px_rgba(14,165,233,0.42)] transition-transform hover:-translate-y-0.5 hover:bg-brand-600"
              >
                <Users className="h-4 w-4" />
                Create Team
              </button>
            )}
          </div>

          <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-medium text-gray-600 shadow-sm">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-50 text-sky-600">
              <Users className="h-3.5 w-3.5" />
            </span>
            <span className="truncate">Focus: {focusMessage}</span>
          </div>
        </div>

        <div className="app-panel-subtle rounded-[30px] p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
                Team Snapshot
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                Workspace health at a glance
              </p>
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-600 shadow-sm">
              {team ? 'Active' : 'Setup'}
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {snapshots.map(({ label, value, detail, tone }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-[24px] border border-white/80 bg-white/80 px-4 py-3"
              >
                <span
                  className={`${tone} flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl`}
                >
                  <Users className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {label}
                  </p>
                  <p className="truncate text-sm text-gray-500">{detail}</p>
                </div>
                <span className="shrink-0 text-lg font-bold tabular-nums text-gray-900">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ActionBanner({
  actionMsg,
  onDismiss,
}: {
  actionMsg: string | null
  onDismiss: () => void
}): JSX.Element | null {
  if (!actionMsg) return null

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
      {actionMsg}
      <button type="button" onClick={onDismiss} className="ml-3 text-blue-500 underline">
        Dismiss
      </button>
    </div>
  )
}

export function TeamUnavailableState({
  error,
  onRetry,
}: {
  error: string
  onRetry: () => void
}): JSX.Element {
  return (
    <div className="app-empty-state">
      <h2 className="text-lg font-semibold text-gray-900">Team management is unavailable</h2>
      <p className="mt-2 text-sm text-gray-500">{error}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
      >
        Retry
      </button>
    </div>
  )
}

export function TeamEmptyState({ onCreateTeam }: { onCreateTeam: () => void }): JSX.Element {
  return (
    <div className="app-empty-state">
      <h2 className="text-lg font-semibold text-gray-900">No team yet</h2>
      <p className="mt-2 text-sm text-gray-500">
        Create a team to collaborate with others on Dotly.one (Business plan required).
      </p>
      <button
        type="button"
        onClick={onCreateTeam}
        className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
      >
        Create Team
      </button>
    </div>
  )
}

export function TeamWorkspace({
  team,
  canManageTeam,
  roleUpdatingId,
  resendState,
  userTz,
  onRoleChange,
  onRemove,
  onResend,
}: {
  team: Team
  canManageTeam: boolean
  roleUpdatingId: string | null
  resendState: Record<string, 'loading' | 'done'>
  userTz: string
  onRoleChange: (userId: string, role: 'ADMIN' | 'MEMBER') => void
  onRemove: (userId: string) => void
  onResend: (invite: TeamInvite) => void
}): JSX.Element {
  return (
    <div className="space-y-6">
      <div className="app-panel rounded-[24px] p-6">
        <h2 className="text-xl font-bold text-gray-900">{team.name}</h2>
        <p className="text-sm text-gray-500">
          {team.members.length} member{team.members.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="app-panel rounded-[24px] shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h3 className="font-semibold text-gray-900">Members</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {team.members.map((member) => (
            <div
              key={member.id}
              className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500 text-sm font-bold text-white">
                {(member.user.name ?? member.user.email).charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{member.user.name || member.user.email}</p>
                <p className="truncate text-sm text-gray-500">{member.user.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    member.role === 'ADMIN'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {member.role}
                </span>
                {member.userId !== team.ownerUserId && canManageTeam ? (
                  <SelectField
                    value={member.role}
                    onChange={(event) =>
                      onRoleChange(member.userId, event.target.value as 'ADMIN' | 'MEMBER')
                    }
                    disabled={roleUpdatingId !== null}
                    className="w-full rounded-lg px-2.5 py-2.5 pr-8 text-sm focus:ring-brand-100 sm:w-[132px]"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </SelectField>
                ) : (
                  <span className="rounded-md border border-gray-100 bg-gray-50 px-2 py-1 text-xs text-gray-400">
                    Owner
                  </span>
                )}
                {member.userId !== team.ownerUserId && canManageTeam && (
                  <button
                    type="button"
                    onClick={() => onRemove(member.userId)}
                    className="app-touch-target rounded-md border border-red-200 px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {team.invites.length > 0 && (
        <div className="app-panel rounded-[24px] shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="font-semibold text-gray-900">Pending Invites</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {team.invites.map((invite) => (
              <div
                key={invite.id}
                className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">{invite.email}</p>
                  <p className="text-xs text-gray-400">
                    Expires {formatDate(invite.expiresAt, userTz)}
                  </p>
                </div>
                <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-medium text-yellow-700">
                  {invite.role}
                </span>
                {canManageTeam ? (
                  <button
                    type="button"
                    disabled={resendState[invite.id] === 'loading'}
                    onClick={() => onResend(invite)}
                    className="app-touch-target rounded-md border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    {resendState[invite.id] === 'loading'
                      ? 'Sending...'
                      : resendState[invite.id] === 'done'
                        ? 'Sent!'
                        : 'Resend'}
                  </button>
                ) : (
                  <span className="rounded-md border border-gray-100 bg-gray-50 px-2 py-1 text-xs text-gray-400">
                    Admins only
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function CreateTeamModal({
  open,
  newTeamName,
  teamFieldError,
  creatingTeam,
  onChange,
  onClose,
  onCreate,
}: {
  open: boolean
  newTeamName: string
  teamFieldError: string | null
  creatingTeam: boolean
  onChange: (value: string) => void
  onClose: () => void
  onCreate: () => void
}): JSX.Element | null {
  if (!open) return null

  return (
    <div className="app-dialog-shell">
      <div className="app-dialog-panel max-w-md shadow-xl">
        <div className="border-b border-gray-100 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500/80">
            Collaboration
          </p>
          <h2 className="mt-1 text-lg font-bold text-gray-900">Create Team</h2>
          <p className="mt-1 text-sm text-gray-500">
            Start a shared workspace for members, roles, and invitations.
          </p>
        </div>
        <div className="app-dialog-body-scroll px-6 py-5">
          <input
            type="text"
            value={newTeamName}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Team name"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {teamFieldError && <p className="mt-2 text-sm text-red-600">{teamFieldError}</p>}
        </div>
        <div className="app-dialog-footer">
          <button
            type="button"
            onClick={onClose}
            className="app-touch-target w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onCreate}
            disabled={!newTeamName.trim() || creatingTeam}
            className="app-touch-target w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-gray-300 sm:w-auto"
          >
            {creatingTeam ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function InviteMemberModal({
  open,
  inviteEmail,
  inviteRole,
  inviteFieldError,
  inviting,
  onEmailChange,
  onRoleChange,
  onClose,
  onInvite,
}: {
  open: boolean
  inviteEmail: string
  inviteRole: 'ADMIN' | 'MEMBER'
  inviteFieldError: string | null
  inviting: boolean
  onEmailChange: (value: string) => void
  onRoleChange: (value: 'ADMIN' | 'MEMBER') => void
  onClose: () => void
  onInvite: () => void
}): JSX.Element | null {
  if (!open) return null

  return (
    <div className="app-dialog-shell">
      <div className="app-dialog-panel max-w-md shadow-xl">
        <div className="border-b border-gray-100 px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500/80">
            Collaboration
          </p>
          <h2 className="mt-1 text-lg font-bold text-gray-900">Invite Member</h2>
          <p className="mt-1 text-sm text-gray-500">
            Add a teammate and choose the right level of access for your workspace.
          </p>
        </div>
        <div className="app-dialog-body-scroll px-6 py-5">
          <input
            type="email"
            value={inviteEmail}
            onChange={(event) => onEmailChange(event.target.value)}
            placeholder="Email address"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <SelectField
            value={inviteRole}
            onChange={(event) => onRoleChange(event.target.value as 'ADMIN' | 'MEMBER')}
            className="mt-3 focus:border-brand-500 focus:ring-brand-100"
          >
            <option value="MEMBER">Member</option>
            <option value="ADMIN">Admin</option>
          </SelectField>
          {inviteFieldError && <p className="mt-2 text-sm text-red-600">{inviteFieldError}</p>}
        </div>
        <div className="app-dialog-footer">
          <button
            type="button"
            onClick={onClose}
            className="app-touch-target w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onInvite}
            disabled={!inviteEmail.trim() || inviting}
            className="app-touch-target w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-gray-300 sm:w-auto"
          >
            {inviting ? 'Sending...' : 'Send Invite'}
          </button>
        </div>
      </div>
    </div>
  )
}
