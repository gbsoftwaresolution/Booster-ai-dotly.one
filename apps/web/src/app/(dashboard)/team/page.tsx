'use client'

import type { JSX } from 'react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { FeatureGateCard } from '@/components/billing/FeatureGateCard'
import { useBillingPlan } from '@/components/billing/BillingPlanProvider'
import { getAccessToken } from '@/lib/supabase/client'
import { apiGet, apiPost, apiDelete, apiPatch } from '@/lib/api'
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
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onCancel} />
      <div className="app-panel fixed inset-x-4 top-1/2 z-50 w-full max-w-sm -translate-y-1/2 rounded-[28px] p-6 shadow-2xl sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900">Confirm action</h3>
            <p className="mt-1 text-sm text-gray-500">{message}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
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
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER')
  const [actionMsg, setActionMsg] = useState<string | null>(null)

  const [teamId, setTeamId] = useState<string | null>(null)

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    message: string
    onConfirm: () => void
  } | null>(null)

  // Resend invite state: maps invite id → 'loading' | 'done'
  const [resendState, setResendState] = useState<Record<string, 'loading' | 'done'>>({})

  // Prevent concurrent action submissions
  const actionInFlightRef = useRef(false)

  const loadTeam = useCallback(
    async (id?: string) => {
      const resolvedId = id ?? teamId
      if (!resolvedId) return
      try {
        const token = await getAccessToken()
        const data = await apiGet<Team>(`/teams/${resolvedId}`, token)
        setTeam(data)
      } catch {
        setError('Failed to load team')
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
        // GET /teams/mine returns the user's team or null if they have none
        const myTeam = await apiGet<Team | null>('/teams/mine', token)
        if (myTeam) {
          setTeamId(myTeam.id)
          setTeam(myTeam)
        }
      } catch (err) {
        // Distinguish "no team" (404) from real errors
        if (err instanceof Error && err.message.includes('404')) {
          // No team yet — show the "Create Team" empty state (not an error)
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

  const handleCreate = async () => {
    if (!newTeamName.trim()) return
    try {
      const token = await getAccessToken()
      const created = await apiPost<Team>('/teams', { name: newTeamName }, token)
      setTeamId(created.id)
      setTeam(created)
      setShowCreateModal(false)
      setNewTeamName('')
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Failed to create team')
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !teamId) return
    try {
      const token = await getAccessToken()
      await apiPost(`/teams/${teamId}/invite`, { email: inviteEmail, role: inviteRole }, token)
      setActionMsg(`Invite sent to ${inviteEmail}`)
      setInviteEmail('')
      setShowInviteModal(false)
      void loadTeam()
    } catch {
      setActionMsg('Failed to send invite')
    }
  }

  const handleRemove = useCallback(
    (userId: string) => {
      if (!teamId) return
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
    [teamId, loadTeam],
  )

  const handleRoleChange = async (userId: string, role: 'ADMIN' | 'MEMBER') => {
    if (!teamId) return
    try {
      const token = await getAccessToken()
      await apiPatch(`/teams/${teamId}/members/${userId}/role`, { role }, token)
      void loadTeam()
    } catch {
      setActionMsg('Failed to update role')
    }
  }

  const handleResend = useCallback(
    async (invite: TeamInvite) => {
      if (!teamId || resendState[invite.id] === 'loading') return
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
    [teamId, resendState],
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
      <div className="app-panel flex items-center justify-between rounded-[30px] px-6 py-6 sm:px-8">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-500/80">
              Collaboration
            </p>
            <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
            <p className="mt-2 text-sm text-gray-500">
              Manage your team members and brand settings.
            </p>
          </div>
        </div>
        {team && (
          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            Invite Member
          </button>
        )}
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

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

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
                  {member.userId !== team.ownerUserId ? (
                    <select
                      value={member.role}
                      onChange={(e) =>
                        void handleRoleChange(member.userId, e.target.value as 'ADMIN' | 'MEMBER')
                      }
                      className="rounded-md border border-gray-200 px-2 py-1 text-sm"
                    >
                      <option value="MEMBER">Member</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  ) : (
                    <span className="rounded-md border border-gray-100 bg-gray-50 px-2 py-1 text-xs text-gray-400">
                      Owner
                    </span>
                  )}
                  {member.userId !== team.ownerUserId && (
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
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create team modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="app-panel w-full max-w-md rounded-[28px] p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">Create Team</h2>
            <input
              type="text"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="Team name"
              className="mt-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <div className="mt-4 flex justify-end gap-3">
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
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="app-panel w-full max-w-md rounded-[28px] p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">Invite Member</h2>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="Email address"
              className="mt-4 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MEMBER')}
              className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
            </select>
            <div className="mt-4 flex justify-end gap-3">
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
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
              >
                Send Invite
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
