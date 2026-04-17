'use client'

import type { JSX } from 'react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { FeatureGateCard } from '@/components/billing/FeatureGateCard'
import { useBillingPlan } from '@/components/billing/BillingPlanProvider'
import { getAccessToken } from '@/lib/auth/client'
import { apiGet, apiPost, apiDelete, apiPatch, isApiError } from '@/lib/api'
import { StatusNotice } from '@/components/ui/StatusNotice'
import { hasPlanAccess } from '@/lib/billing-plans'
import { useUserTimezone } from '@/hooks/useUserLocale'
import {
  ActionBanner,
  ConfirmDialog,
  CreateTeamModal,
  InviteMemberModal,
  PageSpinner,
  TeamEmptyState,
  TeamHero,
  TeamUnavailableState,
  TeamWorkspace,
} from './components'
import {
  formatLatestInvite,
  getFocusMessage,
  getTeamStats,
  validateInviteEmail,
  validateTeamName,
} from './helpers'
import type { ConfirmDialogState, CurrentUser, Team, TeamInvite } from './types'

export default function TeamPage(): JSX.Element {
  const userTz = useUserTimezone()
  const resolvedUserTz = userTz ?? 'UTC'
  const { plan, loading: planLoading } = useBillingPlan()
  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasLoadedTeam, setHasLoadedTeam] = useState(false)
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

  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null)
  const [teamFieldError, setTeamFieldError] = useState<string | null>(null)
  const [inviteFieldError, setInviteFieldError] = useState<string | null>(null)

  const [resendState, setResendState] = useState<Record<string, 'loading' | 'done'>>({})
  const [reloadToken, setReloadToken] = useState(0)

  const actionInFlightRef = useRef(false)
  const { memberCount, adminCount, pendingInvites, latestInvite } = getTeamStats(team)
  const latestInviteLabel = formatLatestInvite(latestInvite, resolvedUserTz)
  const focusMessage = getFocusMessage(team, pendingInvites, memberCount)

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

  useEffect(() => {
    if (planLoading || !hasPlanAccess(plan, 'BUSINESS')) {
      setLoading(false)
      return
    }

    const init = async () => {
      setLoading(true)
      setError(null)
      setPermissionDenied(false)
      setHasLoadedTeam(false)
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
        setHasLoadedTeam(true)
      } catch (err) {
        if (isApiError(err) && err.statusCode === 404) {
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
  }, [plan, planLoading, reloadToken])

  useEffect(() => {
    if (teamId && !team) void loadTeam()
  }, [teamId, team, loadTeam])

  const currentMember = currentUserId
    ? team?.members.find((member) => member.userId === currentUserId)
    : null
  const canManageTeam = currentMember?.role === 'ADMIN'

  const handleCreate = async () => {
    const trimmedName = newTeamName.trim()
    if (creatingTeam) return
    const validationError = validateTeamName(trimmedName)
    if (validationError) {
      setTeamFieldError(validationError)
      return
    }
    setTeamFieldError(null)
    setCreatingTeam(true)
    try {
      const token = await getAccessToken()
      const created = await apiPost<Team>('/teams', { name: trimmedName }, token)
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
    const trimmedInviteEmail = inviteEmail.trim()
    if (!teamId || !canManageTeam || inviting) {
      if (teamId && !canManageTeam) setActionMsg('Only admins can invite members.')
      return
    }
    const validationError = validateInviteEmail(trimmedInviteEmail)
    if (validationError) {
      setInviteFieldError(validationError)
      return
    }
    setInviteFieldError(null)
    setInviting(true)
    try {
      const token = await getAccessToken()
      await apiPost(
        `/teams/${teamId}/invite`,
        { email: trimmedInviteEmail, role: inviteRole },
        token,
      )
      setActionMsg(`Invite sent to ${trimmedInviteEmail}`)
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
    return <PageSpinner />
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
    return <PageSpinner />
  }

  return (
    <div className="space-y-6">
      <TeamHero
        loading={loading}
        team={team}
        canManageTeam={canManageTeam}
        memberCount={memberCount}
        adminCount={adminCount}
        pendingInvites={pendingInvites}
        latestInviteLabel={latestInviteLabel}
        focusMessage={focusMessage}
        onCreateTeam={() => setShowCreateModal(true)}
        onInviteMember={() => setShowInviteModal(true)}
      />

      <ActionBanner actionMsg={actionMsg} onDismiss={() => setActionMsg(null)} />

      {permissionDenied ? (
        <StatusNotice
          tone="warning"
          message="You do not have permission to access team management."
        />
      ) : error ? (
        <StatusNotice message={error} />
      ) : null}

      {!team && error && !hasLoadedTeam ? (
        <TeamUnavailableState
          error={error}
          onRetry={() => setReloadToken((current) => current + 1)}
        />
      ) : !team ? (
        <TeamEmptyState onCreateTeam={() => setShowCreateModal(true)} />
      ) : (
        <TeamWorkspace
          team={team}
          canManageTeam={canManageTeam}
          roleUpdatingId={roleUpdatingId}
          resendState={resendState}
          userTz={resolvedUserTz}
          onRoleChange={(userId, role) => void handleRoleChange(userId, role)}
          onRemove={handleRemove}
          onResend={(invite) => void handleResend(invite)}
        />
      )}

      <CreateTeamModal
        open={showCreateModal}
        newTeamName={newTeamName}
        teamFieldError={teamFieldError}
        creatingTeam={creatingTeam}
        onChange={setNewTeamName}
        onClose={() => setShowCreateModal(false)}
        onCreate={() => void handleCreate()}
      />

      <InviteMemberModal
        open={showInviteModal}
        inviteEmail={inviteEmail}
        inviteRole={inviteRole}
        inviteFieldError={inviteFieldError}
        inviting={inviting}
        onEmailChange={setInviteEmail}
        onRoleChange={setInviteRole}
        onClose={() => setShowInviteModal(false)}
        onInvite={() => void handleInvite()}
      />

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
