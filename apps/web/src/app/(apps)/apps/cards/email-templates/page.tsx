'use client'

import type { JSX } from 'react'
import { useCallback, useEffect, useState } from 'react'

import { useUserTimezone } from '@/hooks/useUserLocale'
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api'
import { getAccessToken } from '@/lib/supabase/client'
import type { ItemsResponse } from '@dotly/types'

import {
  ConfirmDeleteDialog,
  EmailTemplatesHeader,
  TemplateModal,
  TemplatesGrid,
} from '../../../../(dashboard)/email-templates/components'
import { EMPTY_FORM } from '../../../../(dashboard)/email-templates/helpers'
import type {
  EmailTemplate,
  TemplateFormValues,
} from '../../../../(dashboard)/email-templates/types'
import { StatusNotice } from '@/components/ui/StatusNotice'

export default function EmailTemplatesPage(): JSX.Element {
  const userTz = useUserTimezone()
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalError, setModalError] = useState<string | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<EmailTemplate | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const token = await getAccessToken()
      const data = await apiGet<ItemsResponse<EmailTemplate>>('/email-templates', token)
      setTemplates(data.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load email templates')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTemplates()
  }, [loadTemplates])

  function openCreateModal() {
    setEditingTemplate(null)
    setDeleteError(null)
    setModalError(null)
    setShowModal(true)
  }

  function openEditModal(template: EmailTemplate) {
    setEditingTemplate(template)
    setDeleteError(null)
    setModalError(null)
    setShowModal(true)
  }

  const handleSave = useCallback(
    async (values: TemplateFormValues) => {
      setSubmitting(true)
      setError(null)
      setModalError(null)

      try {
        const token = await getAccessToken()
        if (editingTemplate) {
          const updated = await apiPatch<EmailTemplate>(
            `/email-templates/${editingTemplate.id}`,
            values,
            token,
          )
          setTemplates((prev) =>
            prev.map((template) => (template.id === updated.id ? updated : template)),
          )
        } else {
          const created = await apiPost<EmailTemplate>('/email-templates', values, token)
          setTemplates((prev) => [created, ...prev])
        }

        setShowModal(false)
        setEditingTemplate(null)
      } catch (err) {
        setModalError(err instanceof Error ? err.message : 'Failed to save template')
      } finally {
        setSubmitting(false)
      }
    },
    [editingTemplate],
  )

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return

    setDeleteError(null)
    try {
      const token = await getAccessToken()
      await apiDelete(`/email-templates/${deleteTarget.id}`, token)
      setTemplates((prev) => prev.filter((template) => template.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete template'
      setDeleteError(message)
      setError(message)
    }
  }, [deleteTarget])

  return (
    <div className="space-y-6">
      <EmailTemplatesHeader onCreate={openCreateModal} />

      {error && <StatusNotice message={error} />}

      <TemplatesGrid
        loading={loading}
        templates={templates}
        userTz={userTz}
        onEdit={openEditModal}
        onDelete={setDeleteTarget}
      />

      {showModal && (
        <TemplateModal
          initialValues={
            editingTemplate
              ? {
                  name: editingTemplate.name,
                  subject: editingTemplate.subject,
                  body: editingTemplate.body,
                }
              : EMPTY_FORM
          }
          title={editingTemplate ? 'Edit Template' : 'New Template'}
          submitLabel={editingTemplate ? 'Save Changes' : 'Create Template'}
          submitting={submitting}
          submitError={modalError}
          onClose={() => {
            if (submitting) return
            setShowModal(false)
            setEditingTemplate(null)
            setModalError(null)
          }}
          onSubmit={handleSave}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          title="Delete template"
          message={`Delete "${deleteTarget.name}"? This cannot be undone.`}
          error={deleteError}
          onCancel={() => {
            setDeleteTarget(null)
            setDeleteError(null)
          }}
          onConfirm={() => void handleDelete()}
        />
      )}
    </div>
  )
}
