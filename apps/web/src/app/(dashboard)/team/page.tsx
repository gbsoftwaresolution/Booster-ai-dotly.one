'use client'

import type { JSX } from 'react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { FeatureGateCard } from '@/components/billing/FeatureGateCard'
import { useBillingPlan } from '@/components/billing/BillingPlanProvider'
import { getAccessToken } from '@/lib/supabase/client'
import { apiGet, apiPost, apiDelete, apiPatch, isApiError } from '@/lib/api'
import { SelectField } from '@/components/ui/SelectField'
import { StatusNotice } from '@/components/ui/StatusNotice'
import { hasPlanAccess } from '@/lib/billing-plans'
import { AlertTriangle, Users } from 'lucide-react'
import { formatDate } from '@/lib/tz'
import { useUserTimezone } from '@/hooks/useUserLocale'

interface TeamMemberUser {
  id: string
  name: string | null
  email: string
  avatarUrl: string | null
}

interface TeamMember {
  id: string
  userId: string
  role: 'ADMIN' | 'MEMBER'
  joinedAt: string
  user: TeamMemberUser
}

interface TeamInvite {
  id: string
  email: string
  role: string
  expiresAt: string
}

interface Team {
  id: string
  name: string
  ownerUserId: string
  brandConfig: Record<string, unknown>
  members: TeamMember[]
  invites: TeamInvite[]
}

interface CurrentUser {
  id: string
}

// Shared confirmation dialog
function ConfirmDialog({
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
        className="app-panel fixed inset-x-4 top-1/2 z-50 w-full max-w-sm -translate-y-1/2 rounded-[28px] p-6 shadow-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
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
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Confirm
          </button>
        </div>
      </div>
    </>
  )
}

export default function TeamPage(): JSX.Element {
  const userTz = useUserTimezone()
  const { plan, loading: planLoading } = useBillingPlan()
  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER')
  const [actionMsg, setActionMsg] = useState<string | null>(null)
  const [creatingTeam, setCreatingTeam] = useState(false)
  const [inviting, setInviting] = useState(false)
  const [roleUpdatingId, setRoleUpdatingId] = useState<string | null>(null)

  const [teamId, setTeamId] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string
    onConfirm: () => void
  } | null>(null)

  // Resend invite state: maps invite id → 'loading' | 'done'
  const [resendState, setResendState] = useState<Record<string, 'loading' | 'done'>>({})

  // Prevent concurrent action submissions
  const actionInFlightRef = useRef(false)
  const memberCount = team?.members.length ?? 0
  const adminCount = team?.members.filter((member) => member.role === 'ADMIN').length ?? 0
  const pendingInvites = team?.invites.length ?? 0
  const latestInvite = team?.invites
    ?.slice()
    .sort((a, b) => new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime())[0]
  const focusMessage = team
    ? pendingInvites > 0
      ? `${pendingInvites} invite${pendingInvites === 1 ? '' : 's'} still need acceptance.`
      : `${memberCount} team member${memberCount === 1 ? '' : 's'} are active in your workspace.`
    : 'Create your team to centralize members, invites, and shared ownership.'

  const loadTeam = useCallback(
    async (id?: string) => {
      const resolvedId = id ?? teamId
      if (!resolvedId) return
      try {
        const token = await getAccessToken()
        const data = await apiGet<Team>(`/teams/${resolvedId}`, token)
        setTeam(data)
      } catch (err) {
        if (isApiError(err) && (err.statusCode === 403 || err.statusCode === 401)) {
          setPermissionDenied(true)
          setError('You do not have permission to view this team.')
        } else {
          setError('Failed to load team')
        }
      }
    },
    [teamId],
  )

  // On mount, fetch the current user's team from the API
  useEffect(() => {
    if (planLoading || !hasPlanAccess(plan, 'BUSINESS')) {
      setLoading(false)
      return
    }

    const init = async () => {
      try {
        const token = await getAccessToken()
        const [myTeam, me] = await Promise.all([
          apiGet<Team | null>('/teams/mine', token),
          apiGet<CurrentUser>('/users/me', token),
        ])
        setCurrentUserId(me.id)
        if (myTeam) {
          setTeamId(myTeam.id)
          setTeam(myTeam)
        }
      } catch (err) {
        // Distinguish "no team" (404) from real errors
        if (isApiError(err) && err.statusCode === 404) {
          // No team yet — show the "Create Team" empty state (not an error)
        } else if (isApiError(err) && (err.statusCode === 403 || err.statusCode === 401)) {
          setPermissionDenied(true)
          setError('You do not have permission to access team management.')
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load team data')
        }
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [plan, planLoading])

  useEffect(() => {
    if (teamId && !team) void loadTeam()
  }, [teamId, team, loadTeam])

  const currentMember = currentUserId
    ? team?.members.find((member) => member.userId === currentUserId)
    : null
  const canManageTeam = currentMember?.role === 'ADMIN'

  const handleCreate = async () => {
    if (!newTeamName.trim() || creatingTeam) return
    setCreatingTeam(true)
    try {
      const token = await getAccessToken()
      const created = await apiPost<Team>('/teams', { name: newTeamName }, token)
      setTeamId(created.id)
      setTeam(created)
      setShowCreateModal(false)
      setNewTeamName('')
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Failed to create team')
    } finally {
      setCreatingTeam(false)
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !teamId || !canManageTeam || inviting) {
      if (teamId && !canManageTeam) setActionMsg('Only admins can invite members.')
      return
    }
    setInviting(true)
    try {
      const token = await getAccessToken()
      await apiPost(`/teams/${teamId}/invite`, { email: inviteEmail, role: inviteRole }, token)
      setActionMsg(`Invite sent to ${inviteEmail}`)
      setInviteEmail('')
      setShowInviteModal(false)
      void loadTeam()
    } catch {
      setActionMsg('Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  const handleRemove = useCallback(
    (userId: string) => {
      if (!teamId || !canManageTeam) {
        if (teamId && !canManageTeam) setActionMsg('Only admins can remove members.')
        return
      }
      setConfirmDialog({
        message: 'Remove this member from the team? This cannot be undone.',
        onConfirm: async () => {
          setConfirmDialog(null)
          if (actionInFlightRef.current) return
          actionInFlightRef.current = true
          try {
            const token = await getAccessToken()
            await apiDelete(`/teams/${teamId}/members/${userId}`, token)
            void loadTeam()
          } catch {
            setActionMsg('Failed to remove member')
          } finally {
            actionInFlightRef.current = false
          }
        },
      })
    },
    [teamId, canManageTeam, loadTeam],
  )

  const handleRoleChange = async (userId: string, role: 'ADMIN' | 'MEMBER') => {
    if (!teamId || !canManageTeam || roleUpdatingId !== null) {
      if (teamId && !canManageTeam) setActionMsg('Only admins can update roles.')
      return
    }
    setRoleUpdatingId(userId)
    try {
      const token = await getAccessToken()
      await apiPatch(`/teams/${teamId}/members/${userId}/role`, { role }, token)
      void loadTeam()
    } catch {
      setActionMsg('Failed to update role')
    } finally {
      setRoleUpdatingId(null)
    }
  }

  const handleResend = useCallback(
    async (invite: TeamInvite) => {
      if (!teamId || !canManageTeam || resendState[invite.id] === 'loading') {
        if (teamId && !canManageTeam) setActionMsg('Only admins can resend invites.')
        return
      }
      setResendState((prev) => ({ ...prev, [invite.id]: 'loading' }))
      try {
        const token = await getAccessToken()
        await apiPost(`/teams/${teamId}/invite`, { email: invite.email, role: invite.role }, token)
        setActionMsg(`Invite resent to ${invite.email}`)
        setResendState((prev) => ({ ...prev, [invite.id]: 'done' }))
      } catch {
        setActionMsg(`Failed to resend invite to ${invite.email}`)
        setResendState((prev) => {
          const next = { ...prev }
          delete next[invite.id]
          return next
        })
      }
    },
    [teamId, canManageTeam, resendState],
  )

  if (planLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    )
  }

  if (!hasPlanAccess(plan, 'BUSINESS')) {
    return (
      <FeatureGateCard
        eyebrow="Coming later"
        title="Team management is not published yet"
        description="Team members and shared team controls are reserved for future Business plans. Free, Starter, and Pro currently focus on individual workflows."
        ctaLabel="View current pricing"
        ctaHref="/pricing"
      />
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
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
              {[
                { label: 'Members', value: loading ? '—' : memberCount },
                { label: 'Admins', value: loading ? '—' : adminCount },
                { label: 'Pending Invites', value: loading ? '—' : pendingInvites },
                {
                  label: 'Latest Invite',
                  value: loading
                    ? '—'
                    : latestInvite
                      ? formatDate(latestInvite.expiresAt, userTz)
                      : 'None',
                },
              ].map(({ label, value }) => (
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
                  onClick={() => setShowInviteModal(true)}
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
                  onClick={() => setShowCreateModal(true)}
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
              {[
                {
                  label: 'Workspace state',
                  value: loading ? '—' : team ? 'Active' : 'Not set',
                  detail: team ? team.name : 'No team workspace created yet',
                  tone: 'bg-sky-50 text-sky-600',
                },
                {
                  label: 'Admin coverage',
                  value: loading ? '—' : `${adminCount}`,
                  detail: team
                    ? 'Admins with workspace management access'
                    : 'Create a team to assign admins',
                  tone: 'bg-indigo-50 text-indigo-600',
                },
                {
                  label: 'Invite queue',
                  value: loading ? '—' : `${pendingInvites}`,
                  detail:
                    pendingInvites > 0
                      ? 'Invites still waiting for acceptance'
                      : 'No pending invites right now',
                  tone:
                    pendingInvites > 0
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-green-50 text-green-600',
                },
              ].map(({ label, value, detail, tone }) => (
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

      {actionMsg && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {actionMsg}
          <button
            type="button"
            onClick={() => setActionMsg(null)}
            className="ml-3 text-blue-500 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {permissionDenied ? (
        <StatusNotice
          tone="warning"
          message="You do not have permission to access team management."
        />
      ) : error ? (
        <StatusNotice message={error} />
      ) : null}

      {!team ? (
        <div className="app-empty-state">
          <h2 className="text-lg font-semibold text-gray-900">No team yet</h2>
          <p className="mt-2 text-sm text-gray-500">
            Create a team to collaborate with others on Dotly.one (Business plan required).
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Create Team
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Team header */}
          <div className="app-panel rounded-[24px] p-6">
            <h2 className="text-xl font-bold text-gray-900">{team.name}</h2>
            <p className="text-sm text-gray-500">
              {team.members.length} member{team.members.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Members table */}
          <div className="app-panel rounded-[24px] shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h3 className="font-semibold text-gray-900">Members</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {team.members.map((member) => (
                <div key={member.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500 text-sm font-bold text-white">
                    {(member.user.name ?? member.user.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {member.user.name || member.user.email}
                    </p>
                    <p className="text-sm text-gray-500">{member.user.email}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
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
                      onChange={(e) =>
                        void handleRoleChange(member.userId, e.target.value as 'ADMIN' | 'MEMBER')
                      }
                      disabled={roleUpdatingId !== null}
                      className="w-[132px] rounded-lg px-2.5 py-2 pr-8 text-sm focus:ring-brand-100"
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
                      onClick={() => handleRemove(member.userId)}
                      className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Pending invites */}
          {team.invites.length > 0 && (
            <div className="app-panel rounded-[24px] shadow-sm">
              <div className="border-b border-gray-100 px-6 py-4">
                <h3 className="font-semibold text-gray-900">Pending Invites</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {team.invites.map((invite) => (
                  <div key={invite.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{invite.email}</p>
                      <p className="text-xs text-gray-400">
                        Expires {formatDate(invite.expiresAt, userTz)}
                      </p>
                    </div>
                    <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-700">
                      {invite.role}
                    </span>
                    {canManageTeam ? (
                      <button
                        type="button"
                        disabled={resendState[invite.id] === 'loading'}
                        onClick={() => void handleResend(invite)}
                        className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {resendState[invite.id] === 'loading'
                          ? 'Sending…'
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
      )}

      {/* Create team modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="app-panel w-full max-w-md rounded-[28px] shadow-xl">
            <div className="border-b border-gray-100 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500/80">
                Collaboration
              </p>
              <h2 className="mt-1 text-lg font-bold text-gray-900">Create Team</h2>
              <p className="mt-1 text-sm text-gray-500">
                Start a shared workspace for members, roles, and invitations.
              </p>
            </div>
            <div className="px-6 py-5">
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="Team name"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={!newTeamName.trim() || creatingTeam}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {creatingTeam ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="app-panel w-full max-w-md rounded-[28px] shadow-xl">
            <div className="border-b border-gray-100 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-500/80">
                Collaboration
              </p>
              <h2 className="mt-1 text-lg font-bold text-gray-900">Invite Member</h2>
              <p className="mt-1 text-sm text-gray-500">
                Add a teammate and choose the right level of access for your workspace.
              </p>
            </div>
            <div className="px-6 py-5">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Email address"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <SelectField
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER')}
                className="mt-3 focus:border-brand-500 focus:ring-brand-100"
              >
                <option value="MEMBER">Member</option>
                <option value="ADMIN">Admin</option>
              </SelectField>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleInvite()}
                disabled={!inviteEmail.trim() || inviting}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {inviting ? 'Sending…' : 'Send Invite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove member confirmation dialog */}
      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={() => void confirmDialog.onConfirm()}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  )
}
