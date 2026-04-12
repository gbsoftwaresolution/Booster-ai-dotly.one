'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '@/lib/api'
import { getToken, sortTasks } from './helpers'
import type {
  ContactDetail,
  ContactDeal,
  ContactEmail,
  ContactNote,
  ContactTask,
  CustomFieldDefinition,
} from './types'

interface HookDeps {
  contact: ContactDetail | null
  setContact: React.Dispatch<React.SetStateAction<ContactDetail | null>>
  onMutate?: () => void
  setDrawerError: React.Dispatch<React.SetStateAction<string | null>>
}

export function useContactNotes({
  contact,
  setContact,
  loadContact,
  onMutate,
  setDrawerError,
}: HookDeps & { loadContact: (id: string) => Promise<void> }) {
  const [newNote, setNewNote] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editNoteContent, setEditNoteContent] = useState('')
  const [savingEditNoteId, setSavingEditNoteId] = useState<string | null>(null)

  const addNote = useCallback(async () => {
    if (!contact || !newNote.trim()) return
    const content = newNote.trim()
    setAddingNote(true)
    try {
      const token = await getToken()
      await apiPost(`/contacts/${contact.id}/notes`, { content }, token)
      setNewNote('')
      setContact((prev) => (prev ? { ...prev, notes: content } : prev))
      await loadContact(contact.id)
      onMutate?.()
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : 'Failed to add note')
    } finally {
      setAddingNote(false)
    }
  }, [contact, loadContact, newNote, onMutate, setContact, setDrawerError])

  const deleteNote = useCallback(
    async (noteId: string) => {
      if (!contact) return
      setDeletingNoteId(noteId)
      try {
        const token = await getToken()
        await apiDelete(`/contacts/${contact.id}/notes/${noteId}`, token)
        setContact((prev) =>
          prev
            ? {
                ...prev,
                contactNotes: (prev.contactNotes ?? []).filter((note) => note.id !== noteId),
              }
            : prev,
        )
        onMutate?.()
      } catch (err) {
        setDrawerError(err instanceof Error ? err.message : 'Failed to delete note')
      } finally {
        setDeletingNoteId(null)
      }
    },
    [contact, onMutate, setContact, setDrawerError],
  )

  const startEditNote = useCallback((note: ContactNote) => {
    setEditingNoteId(note.id)
    setEditNoteContent(note.content)
  }, [])

  const cancelEditNote = useCallback(() => {
    setEditingNoteId(null)
    setEditNoteContent('')
  }, [])

  const saveEditNote = useCallback(
    async (noteId: string) => {
      if (!contact || !editNoteContent.trim()) return
      setSavingEditNoteId(noteId)
      try {
        const token = await getToken()
        await apiPatch(
          `/contacts/${contact.id}/notes/${noteId}`,
          { content: editNoteContent.trim() },
          token,
        )
        setContact((prev) =>
          prev
            ? {
                ...prev,
                contactNotes: (prev.contactNotes ?? []).map((note) =>
                  note.id === noteId ? { ...note, content: editNoteContent.trim() } : note,
                ),
              }
            : prev,
        )
        setEditingNoteId(null)
        setEditNoteContent('')
        onMutate?.()
      } catch (err) {
        setDrawerError(err instanceof Error ? err.message : 'Failed to update note')
      } finally {
        setSavingEditNoteId(null)
      }
    },
    [contact, editNoteContent, onMutate, setContact, setDrawerError],
  )

  const resetNotesState = useCallback(() => {
    setAddingNote(false)
    setDeletingNoteId(null)
    setEditingNoteId(null)
    setEditNoteContent('')
    setSavingEditNoteId(null)
    setNewNote('')
  }, [])

  return {
    newNote,
    setNewNote,
    addingNote,
    deletingNoteId,
    editingNoteId,
    editNoteContent,
    setEditNoteContent,
    savingEditNoteId,
    addNote,
    deleteNote,
    startEditNote,
    cancelEditNote,
    saveEditNote,
    resetNotesState,
  }
}

export function useContactTasks({ contact, setContact, onMutate, setDrawerError }: HookDeps) {
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDueAt, setTaskDueAt] = useState('')
  const [addingTask, setAddingTask] = useState(false)
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)

  const addTask = useCallback(async () => {
    if (!contact || !taskTitle.trim()) return
    const normalizedDueAt = taskDueAt ? new Date(`${taskDueAt}T00:00:00.000Z`) : null
    if (taskDueAt && Number.isNaN(normalizedDueAt?.getTime() ?? NaN)) {
      setDrawerError('Task due date must be a valid date.')
      return
    }
    setAddingTask(true)
    try {
      const token = await getToken()
      const created = await apiPost<ContactTask>(
        `/contacts/${contact.id}/tasks`,
        { title: taskTitle.trim(), dueAt: normalizedDueAt?.toISOString() },
        token,
      )
      setContact((prev) =>
        prev
          ? {
              ...prev,
              tasks: sortTasks([created, ...((prev.tasks as ContactTask[] | undefined) ?? [])]),
            }
          : prev,
      )
      setTaskTitle('')
      setTaskDueAt('')
      onMutate?.()
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : 'Failed to add task')
    } finally {
      setAddingTask(false)
    }
  }, [contact, onMutate, setContact, setDrawerError, taskDueAt, taskTitle])

  const toggleTask = useCallback(
    async (task: ContactTask) => {
      setUpdatingTaskId(task.id)
      try {
        const token = await getToken()
        const updated = await apiPatch<ContactTask>(
          `/tasks/${task.id}`,
          { completed: !task.completed },
          token,
        )
        setContact((prev) =>
          prev
            ? {
                ...prev,
                tasks: sortTasks(
                  ((prev.tasks as ContactTask[] | undefined) ?? []).map((item) =>
                    item.id === task.id ? updated : item,
                  ),
                ),
              }
            : prev,
        )
        onMutate?.()
      } catch (err) {
        setDrawerError(err instanceof Error ? err.message : 'Failed to update task')
      } finally {
        setUpdatingTaskId(null)
      }
    },
    [onMutate, setContact, setDrawerError],
  )

  const deleteTask = useCallback(
    async (taskId: string) => {
      setDeletingTaskId(taskId)
      try {
        const token = await getToken()
        await apiDelete(`/tasks/${taskId}`, token)
        setContact((prev) =>
          prev
            ? {
                ...prev,
                tasks: ((prev.tasks as ContactTask[] | undefined) ?? []).filter(
                  (task) => task.id !== taskId,
                ),
              }
            : prev,
        )
        onMutate?.()
      } catch (err) {
        setDrawerError(err instanceof Error ? err.message : 'Failed to delete task')
      } finally {
        setDeletingTaskId(null)
      }
    },
    [onMutate, setContact, setDrawerError],
  )

  const resetTasksState = useCallback(() => {
    setTaskTitle('')
    setTaskDueAt('')
    setAddingTask(false)
    setUpdatingTaskId(null)
    setDeletingTaskId(null)
  }, [])

  return {
    taskTitle,
    setTaskTitle,
    taskDueAt,
    setTaskDueAt,
    addingTask,
    updatingTaskId,
    deletingTaskId,
    addTask,
    toggleTask,
    deleteTask,
    resetTasksState,
  }
}

export function useContactDeals({ contact, setContact, onMutate, setDrawerError }: HookDeps) {
  const [dealsExpanded, setDealsExpanded] = useState(false)
  const [addingDeal, setAddingDeal] = useState(false)
  const [deletingDealId, setDeletingDealId] = useState<string | null>(null)
  const [updatingDealId, setUpdatingDealId] = useState<string | null>(null)
  const [dealForm, setDealForm] = useState({
    title: '',
    value: '',
    currency: 'USD',
    stage: 'PROSPECT',
    closeDate: '',
  })

  const addDeal = useCallback(async () => {
    if (!contact || !dealForm.title.trim()) return
    const parsedValue = dealForm.value ? Number(dealForm.value) : undefined
    if (dealForm.value && (!Number.isFinite(parsedValue ?? NaN) || (parsedValue ?? 0) < 0)) {
      setDrawerError('Deal value must be a non-negative number.')
      return
    }
    const normalizedCloseDate = dealForm.closeDate
      ? new Date(`${dealForm.closeDate}T00:00:00.000Z`)
      : null
    if (dealForm.closeDate && Number.isNaN(normalizedCloseDate?.getTime() ?? NaN)) {
      setDrawerError('Close date must be a valid date.')
      return
    }
    setAddingDeal(true)
    try {
      const token = await getToken()
      const created = await apiPost<ContactDeal>(
        `/contacts/${contact.id}/deals`,
        {
          title: dealForm.title.trim(),
          value: parsedValue ?? undefined,
          currency: dealForm.currency,
          stage: dealForm.stage,
          closeDate: normalizedCloseDate?.toISOString(),
        },
        token,
      )
      setContact((prev) =>
        prev
          ? { ...prev, deals: [created, ...((prev.deals as ContactDeal[] | undefined) ?? [])] }
          : prev,
      )
      setDealForm({ title: '', value: '', currency: 'USD', stage: 'PROSPECT', closeDate: '' })
      setDealsExpanded(false)
      onMutate?.()
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : 'Failed to add deal')
    } finally {
      setAddingDeal(false)
    }
  }, [contact, dealForm, onMutate, setContact, setDrawerError])

  const updateDealStage = useCallback(
    async (dealId: string, stage: string) => {
      setUpdatingDealId(dealId)
      try {
        const token = await getToken()
        const updated = await apiPatch<ContactDeal>(`/deals/${dealId}`, { stage }, token)
        setContact((prev) =>
          prev
            ? {
                ...prev,
                deals: ((prev.deals as ContactDeal[] | undefined) ?? []).map((deal) =>
                  deal.id === dealId ? updated : deal,
                ),
              }
            : prev,
        )
        onMutate?.()
      } catch (err) {
        setDrawerError(err instanceof Error ? err.message : 'Failed to update deal')
      } finally {
        setUpdatingDealId(null)
      }
    },
    [onMutate, setContact, setDrawerError],
  )

  const deleteDeal = useCallback(
    async (dealId: string) => {
      setDeletingDealId(dealId)
      try {
        const token = await getToken()
        await apiDelete(`/deals/${dealId}`, token)
        setContact((prev) =>
          prev
            ? {
                ...prev,
                deals: ((prev.deals as ContactDeal[] | undefined) ?? []).filter(
                  (deal) => deal.id !== dealId,
                ),
              }
            : prev,
        )
        onMutate?.()
      } catch (err) {
        setDrawerError(err instanceof Error ? err.message : 'Failed to delete deal')
      } finally {
        setDeletingDealId(null)
      }
    },
    [onMutate, setContact, setDrawerError],
  )

  const resetDealsState = useCallback(() => {
    setDealsExpanded(false)
    setAddingDeal(false)
    setDeletingDealId(null)
    setUpdatingDealId(null)
    setDealForm({ title: '', value: '', currency: 'USD', stage: 'PROSPECT', closeDate: '' })
  }, [])

  return {
    dealsExpanded,
    setDealsExpanded,
    addingDeal,
    deletingDealId,
    updatingDealId,
    dealForm,
    setDealForm,
    addDeal,
    updateDealStage,
    deleteDeal,
    resetDealsState,
  }
}

export function useContactTags({ contact, setContact, onMutate, setDrawerError }: HookDeps) {
  const [newTag, setNewTag] = useState('')

  const addTag = useCallback(async () => {
    if (!contact || !newTag.trim()) return
    const tags = [...contact.tags, newTag.trim()]
    try {
      const token = await getToken()
      await apiPut(`/contacts/${contact.id}`, { tags }, token)
      setContact((prev) => (prev ? { ...prev, tags } : prev))
      setNewTag('')
      onMutate?.()
    } catch (err) {
      setDrawerError(err instanceof Error ? err.message : 'Failed to add tag')
    }
  }, [contact, newTag, onMutate, setContact, setDrawerError])

  const removeTag = useCallback(
    async (tag: string) => {
      if (!contact) return
      const tags = contact.tags.filter((item) => item !== tag)
      try {
        const token = await getToken()
        await apiPut(`/contacts/${contact.id}`, { tags }, token)
        setContact((prev) => (prev ? { ...prev, tags } : prev))
        onMutate?.()
      } catch (err) {
        setDrawerError(err instanceof Error ? err.message : 'Failed to remove tag')
      }
    },
    [contact, onMutate, setContact, setDrawerError],
  )

  const resetTagsState = useCallback(() => {
    setNewTag('')
  }, [])

  return {
    newTag,
    setNewTag,
    addTag,
    removeTag,
    resetTagsState,
  }
}

export function useContactCustomFields({
  contactId,
  contact,
  setContact,
  setDrawerError,
}: HookDeps & { contactId: string | null }) {
  const [customFieldsExpanded, setCustomFieldsExpanded] = useState(false)
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([])
  const [savingCustomFieldId, setSavingCustomFieldId] = useState<string | null>(null)
  const [customFieldsError, setCustomFieldsError] = useState<string | null>(null)

  useEffect(() => {
    if (!contactId || !customFieldsExpanded || customFields.length > 0) return
    let active = true
    void (async () => {
      try {
        const token = await getToken()
        const fieldDefinitions = await apiGet<CustomFieldDefinition[]>(`/crm/custom-fields`, token)
        if (active) {
          setCustomFields(fieldDefinitions)
          setCustomFieldsError(null)
        }
      } catch (err) {
        if (active) {
          setCustomFieldsError(
            err instanceof Error ? err.message : 'Custom fields are unavailable.',
          )
        }
      }
    })()
    return () => {
      active = false
    }
  }, [contactId, customFields.length, customFieldsExpanded])

  const saveCustomFieldValue = useCallback(
    async (fieldId: string, value: string) => {
      if (!contact) return
      setSavingCustomFieldId(fieldId)
      try {
        const token = await getToken()
        await apiPut(`/contacts/${contact.id}/custom-fields/${fieldId}`, { value }, token)
        const fieldDefinition = customFields.find((field) => field.id === fieldId)
        if (!fieldDefinition) return
        setContact((prev) => {
          if (!prev) return prev
          const existingValues = prev.customFieldValues ?? []
          const nextValue = {
            fieldId,
            value,
            field: { label: fieldDefinition.label, fieldType: fieldDefinition.fieldType },
          }
          const hasExisting = existingValues.some((item) => item.fieldId === fieldId)
          return {
            ...prev,
            customFieldValues: hasExisting
              ? existingValues.map((item) => (item.fieldId === fieldId ? nextValue : item))
              : [...existingValues, nextValue],
          }
        })
      } catch (err) {
        setDrawerError(err instanceof Error ? err.message : 'Failed to save custom field')
      } finally {
        setSavingCustomFieldId(null)
      }
    },
    [contact, customFields, setContact, setDrawerError],
  )

  const resetCustomFieldsState = useCallback(() => {
    setCustomFieldsExpanded(false)
    setCustomFields([])
    setSavingCustomFieldId(null)
    setCustomFieldsError(null)
  }, [])

  return {
    customFieldsExpanded,
    setCustomFieldsExpanded,
    customFields,
    customFieldsError,
    savingCustomFieldId,
    saveCustomFieldValue,
    resetCustomFieldsState,
  }
}

export function useContactEmailHistory({ contactId }: { contactId: string | null }) {
  const [emailHistoryExpanded, setEmailHistoryExpanded] = useState(false)
  const [emails, setEmails] = useState<ContactEmail[]>([])
  const [emailsError, setEmailsError] = useState<string | null>(null)

  useEffect(() => {
    if (!contactId || !emailHistoryExpanded || emails.length > 0) return
    let active = true
    void (async () => {
      try {
        const token = await getToken()
        const history = await apiGet<ContactEmail[]>(`/contacts/${contactId}/emails`, token)
        if (active) {
          setEmails(history)
          setEmailsError(null)
        }
      } catch (err) {
        if (active) {
          setEmails([])
          setEmailsError(err instanceof Error ? err.message : 'Email history is unavailable.')
        }
      }
    })()
    return () => {
      active = false
    }
  }, [contactId, emailHistoryExpanded, emails.length])

  const resetEmailHistoryState = useCallback(() => {
    setEmailHistoryExpanded(false)
    setEmails([])
    setEmailsError(null)
  }, [])

  return {
    emailHistoryExpanded,
    setEmailHistoryExpanded,
    emails,
    emailsError,
    resetEmailHistoryState,
  }
}
