import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useState, useEffect, useCallback } from 'react'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { api } from '../../lib/api'
import { formatDate, getUserTimezone } from '../../lib/tz'

interface TimelineEvent {
  id: string
  event: string
  metadata: Record<string, unknown>
  createdAt: string
}

interface ContactNote {
  id: string
  content: string
  createdAt: string
}

interface ContactTask {
  id: string
  title: string
  dueAt: string | null
  completed: boolean
  completedAt: string | null
  createdAt: string
}

interface ContactDeal {
  id: string
  title: string
  value: number | string
  currency: string
  stage: string
  probability: number | string
  closeDate: string | null
}

interface ContactDetail {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  title?: string
  website?: string
  address?: string
  notes?: string
  tags?: string[]
  enrichedAt?: string | null
  enrichmentScore?: number | null
  enrichmentSummary?: string | null
  inferredIndustry?: string | null
  inferredSeniority?: string | null
  inferredCompanySize?: string | null
  inferredLinkedIn?: string | null
  sourceCard?: { handle: string }
  crmPipeline?: { stage: string }
  timeline?: TimelineEvent[]
}

const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED', 'LOST'] as const

// Allowlist-based URL openers — validate scheme before handing to the OS.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^\+?[\d\s\-().]{5,20}$/

function openEmail(email: string) {
  if (!EMAIL_RE.test(email)) {
    Alert.alert('Invalid email', 'This email address does not appear to be valid.')
    return
  }
  void Linking.openURL(`mailto:${email}`)
}

function openPhone(phone: string) {
  if (!PHONE_RE.test(phone)) {
    Alert.alert('Invalid phone', 'This phone number does not appear to be valid.')
    return
  }
  void Linking.openURL(`tel:${phone}`)
}

const DEFAULT_STAGE_STYLE = {
  bg: '#f1f5f9',
  text: '#475569',
  activeBg: '#dbeafe',
  activeText: '#1d4ed8',
}

const STAGE_COLORS: Record<
  string,
  { bg: string; text: string; activeBg: string; activeText: string }
> = {
  NEW: { bg: '#f1f5f9', text: '#475569', activeBg: '#dbeafe', activeText: '#1d4ed8' },
  CONTACTED: { bg: '#f1f5f9', text: '#475569', activeBg: '#fef9c3', activeText: '#a16207' },
  QUALIFIED: { bg: '#f1f5f9', text: '#475569', activeBg: '#f3e8ff', activeText: '#7c3aed' },
  CLOSED: { bg: '#f1f5f9', text: '#475569', activeBg: '#dcfce7', activeText: '#15803d' },
  LOST: { bg: '#f1f5f9', text: '#475569', activeBg: '#fee2e2', activeText: '#b91c1c' },
}

function getStageStyle(stage: string) {
  return STAGE_COLORS[stage] ?? DEFAULT_STAGE_STYLE
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function eventDotColor(event: TimelineEvent): string {
  switch (event.event) {
    case 'ENRICHMENT_FAILED':
      return '#ef4444'
    case 'ENRICHMENT_COMPLETED':
      return '#22c55e'
    case 'EMAIL_SENT':
      return '#2563eb'
    case 'STAGE_CHANGED':
      return '#a855f7'
    case 'NOTE_ADDED':
      return '#f59e0b'
    default:
      return '#0ea5e9'
  }
}

function eventLabel(event: TimelineEvent): string {
  switch (event.event) {
    case 'LEAD_CAPTURED':
      return `Lead captured${event.metadata?.sourceHandle ? ` from @${event.metadata.sourceHandle}` : ''}`
    case 'STAGE_CHANGED':
      return `Stage changed: ${event.metadata?.from ?? '?'} → ${event.metadata?.to ?? '?'}`
    case 'NOTE_ADDED':
      return `Note: ${String(event.metadata?.content ?? '').slice(0, 60)}`
    case 'EMAIL_SENT':
      return event.metadata?.subject
        ? `Email sent: ${String(event.metadata.subject).slice(0, 50)}`
        : 'Email sent'
    case 'CONTACT_UPDATED':
      return 'Contact details updated'
    case 'ENRICHMENT_QUEUED':
      return 'AI enrichment queued'
    case 'ENRICHMENT_COMPLETED':
      return 'AI enrichment completed'
    case 'ENRICHMENT_FAILED':
      return `Enrichment failed${event.metadata?.reason ? `: ${String(event.metadata.reason)}` : ''}`
    default:
      return event.event
  }
}

// ─── Card style reused across sections ───────────────────────────────────────
const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: 16,
  padding: 16,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 4,
  elevation: 2,
  borderWidth: 1,
  borderColor: '#f1f5f9',
} as const

// ─── EditContactModal ─────────────────────────────────────────────────────────

interface EditContactModalProps {
  visible: boolean
  contact: ContactDetail
  onClose: () => void
  onSaved: (updated: ContactDetail) => void
}

function EditContactModal({ visible, contact, onClose, onSaved }: EditContactModalProps) {
  const [name, setName] = useState(contact.name)
  const [email, setEmail] = useState(contact.email ?? '')
  const [phone, setPhone] = useState(contact.phone ?? '')
  const [company, setCompany] = useState(contact.company ?? '')
  const [title, setTitle] = useState(contact.title ?? '')
  const [website, setWebsite] = useState(contact.website ?? '')
  const [address, setAddress] = useState(contact.address ?? '')
  const [saving, setSaving] = useState(false)

  // Reset fields when contact changes
  useEffect(() => {
    setName(contact.name)
    setEmail(contact.email ?? '')
    setPhone(contact.phone ?? '')
    setCompany(contact.company ?? '')
    setTitle(contact.title ?? '')
    setWebsite(contact.website ?? '')
    setAddress(contact.address ?? '')
  }, [contact.id])

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Name is required.')
      return
    }
    setSaving(true)
    try {
      await api.updateContact(contact.id, {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        company: company.trim() || undefined,
        title: title.trim() || undefined,
        website: website.trim() || undefined,
        address: address.trim() || undefined,
      })
      onSaved({
        ...contact,
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        company: company.trim() || undefined,
        title: title.trim() || undefined,
        website: website.trim() || undefined,
        address: address.trim() || undefined,
      })
      onClose()
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const fieldStyle = {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14 as const,
    color: '#0f172a' as const,
    backgroundColor: '#f8fafc' as const,
    marginBottom: 12,
  }

  const labelStyle = {
    fontSize: 12 as const,
    color: '#64748b' as const,
    fontWeight: '600' as const,
    marginBottom: 4,
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: '#ffffff',
            paddingTop: Platform.OS === 'ios' ? 56 : 32,
            paddingHorizontal: 20,
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 24,
            }}
          >
            <TouchableOpacity onPress={onClose} disabled={saving}>
              <Text style={{ color: '#64748b', fontSize: 15 }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={{ fontWeight: '800', fontSize: 16, color: '#0f172a' }}>Edit Contact</Text>
            <TouchableOpacity onPress={() => void handleSave()} disabled={saving || !name.trim()}>
              {saving ? (
                <ActivityIndicator size="small" color="#0ea5e9" />
              ) : (
                <Text
                  style={{
                    color: name.trim() ? '#0ea5e9' : '#94a3b8',
                    fontWeight: '700',
                    fontSize: 15,
                  }}
                >
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={labelStyle}>Name *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Full name"
              placeholderTextColor="#94a3b8"
              maxLength={200}
              style={fieldStyle}
            />

            <Text style={labelStyle}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              maxLength={254}
              style={fieldStyle}
            />

            <Text style={labelStyle}>Phone</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="+1 555 000 0000"
              placeholderTextColor="#94a3b8"
              keyboardType="phone-pad"
              maxLength={30}
              style={fieldStyle}
            />

            <Text style={labelStyle}>Company</Text>
            <TextInput
              value={company}
              onChangeText={setCompany}
              placeholder="Company name"
              placeholderTextColor="#94a3b8"
              maxLength={200}
              style={fieldStyle}
            />

            <Text style={labelStyle}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Job title"
              placeholderTextColor="#94a3b8"
              maxLength={200}
              style={fieldStyle}
            />

            <Text style={labelStyle}>Website</Text>
            <TextInput
              value={website}
              onChangeText={setWebsite}
              placeholder="https://example.com"
              placeholderTextColor="#94a3b8"
              keyboardType="url"
              autoCapitalize="none"
              maxLength={500}
              style={fieldStyle}
            />

            <Text style={labelStyle}>Address</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="Street, City, Country"
              placeholderTextColor="#94a3b8"
              maxLength={500}
              style={fieldStyle}
            />

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  const [contact, setContact] = useState<ContactDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [stageLoading, setStageLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false)

  // Threaded notes state (Gap 1)
  const [notes, setNotes] = useState<ContactNote[]>([])
  const [noteText, setNoteText] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editNoteContent, setEditNoteContent] = useState('')
  const [editNoteSaving, setEditNoteSaving] = useState(false)

  // Tasks state (Gap 7)
  const [tasks, setTasks] = useState<ContactTask[]>([])
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDueAt, setNewTaskDueAt] = useState('')
  const [taskSaving, setTaskSaving] = useState(false)

  // Deals state
  const [deals, setDeals] = useState<ContactDeal[]>([])
  const [newDealTitle, setNewDealTitle] = useState('')
  const [newDealValue, setNewDealValue] = useState('')
  const [dealSaving, setDealSaving] = useState(false)

  // Custom fields state
  const [customFields, setCustomFields] = useState<
    { id: string; label: string; fieldType: string; options: string[] | null }[]
  >([])
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({})
  const [fieldSavingId, setFieldSavingId] = useState<string | null>(null)

  // Pipeline assignment state
  const [pipelines, setPipelines] = useState<{ id: string; name: string; isDefault: boolean }[]>([])
  const [pipelineAssigning, setPipelineAssigning] = useState(false)

  // Email compose state
  const [emailModalOpen, setEmailModalOpen] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailTemplates, setEmailTemplates] = useState<
    { id: string; name: string; subject: string; body: string }[]
  >([])
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false)

  // Tags state
  const [newTag, setNewTag] = useState('')
  const [tagSaving, setTagSaving] = useState(false)

  // Enrichment state
  const [enriching, setEnriching] = useState(false)

  // Delete state
  const [deleting, setDeleting] = useState(false)
  const [userTz, setUserTz] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    void (async () => {
      try {
        const [
          data,
          notesData,
          tasksData,
          dealsData,
          fieldsData,
          pipelinesData,
          templatesData,
          tz,
        ] = await Promise.all([
          api.getContact(id),
          api.getContactNotes(id),
          api.getContactTasks(id),
          api.getDeals(id),
          api.getCustomFields(),
          api.getPipelines(),
          api.getEmailTemplates(),
          getUserTimezone(),
        ])
        const contactData = data as ContactDetail
        setContact(contactData)
        setNotes(notesData as ContactNote[])
        setTasks(tasksData as ContactTask[])
        setDeals(dealsData as ContactDeal[])
        setUserTz(tz)
        setCustomFields(
          fieldsData as {
            id: string
            label: string
            fieldType: string
            options: string[] | null
          }[],
        )
        setPipelines(pipelinesData as { id: string; name: string; isDefault: boolean }[])
        setEmailTemplates(
          templatesData as { id: string; name: string; subject: string; body: string }[],
        )
        // Build initial custom field values map from contact
        const cfv: Record<string, string> = {}
        for (const cfVal of (
          contactData as unknown as { customFieldValues?: { fieldId: string; value: string }[] }
        ).customFieldValues ?? []) {
          cfv[cfVal.fieldId] = cfVal.value
        }
        setCustomFieldValues(cfv)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load contact')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  const handleStageChange = async (stage: string) => {
    if (!id || !contact) return
    setStageLoading(true)
    try {
      await api.updateContactStage(id, stage)
      setContact((prev) => (prev ? { ...prev, crmPipeline: { ...prev.crmPipeline, stage } } : prev))
    } catch {
      // silently ignore
    } finally {
      setStageLoading(false)
    }
  }

  const handleDelete = useCallback(() => {
    if (!id) return
    Alert.alert(
      'Delete Contact',
      'Are you sure you want to permanently delete this contact? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true)
            try {
              await api.deleteContact(id)
              router.back()
            } catch (err: unknown) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete contact')
              setDeleting(false)
            }
          },
        },
      ],
    )
  }, [id, router])

  const handleAddNote = useCallback(async () => {
    if (!id || !noteText.trim()) return
    setNoteSaving(true)
    try {
      await api.createNote(id, noteText.trim())
      setNoteText('')
      // Refresh notes list
      const notesData = await api.getContactNotes(id)
      setNotes(notesData as ContactNote[])
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to add note')
    } finally {
      setNoteSaving(false)
    }
  }, [id, noteText])

  const handleDeleteNote = useCallback(
    async (noteId: string) => {
      if (!id) return
      try {
        await api.deleteNote(noteId, id)
        setNotes((prev) => prev.filter((n) => n.id !== noteId))
      } catch (err: unknown) {
        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete note')
      }
    },
    [id],
  )

  const handleStartEditNote = useCallback((note: ContactNote) => {
    setEditingNoteId(note.id)
    setEditNoteContent(note.content)
  }, [])

  const handleSaveEditNote = useCallback(
    async (noteId: string) => {
      if (!id || !editNoteContent.trim()) return
      setEditNoteSaving(true)
      try {
        await api.updateNote(noteId, id, editNoteContent.trim())
        setNotes((prev) =>
          prev.map((n) => (n.id === noteId ? { ...n, content: editNoteContent.trim() } : n)),
        )
        setEditingNoteId(null)
        setEditNoteContent('')
      } catch (err: unknown) {
        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update note')
      } finally {
        setEditNoteSaving(false)
      }
    },
    [id, editNoteContent],
  )

  const handleCancelEditNote = useCallback(() => {
    setEditingNoteId(null)
    setEditNoteContent('')
  }, [])

  const handleCreateTask = useCallback(async () => {
    if (!id || !newTaskTitle.trim()) return
    setTaskSaving(true)
    try {
      const dueAt = newTaskDueAt.trim() || undefined
      await api.createTask(id, newTaskTitle.trim(), dueAt)
      setNewTaskTitle('')
      setNewTaskDueAt('')
      const tasksData = await api.getContactTasks(id)
      setTasks(tasksData as ContactTask[])
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create task')
    } finally {
      setTaskSaving(false)
    }
  }, [id, newTaskTitle, newTaskDueAt])

  const handleToggleTask = useCallback(async (task: ContactTask) => {
    try {
      await api.updateTask(task.id, { completed: !task.completed })
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t)),
      )
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update task')
    }
  }, [])

  const handleDeleteTask = useCallback((taskId: string) => {
    Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteTask(taskId)
            setTasks((prev) => prev.filter((t) => t.id !== taskId))
          } catch (err: unknown) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete task')
          }
        },
      },
    ])
  }, [])

  const handleCreateDeal = useCallback(async () => {
    if (!id || !newDealTitle.trim()) return
    setDealSaving(true)
    try {
      const body: { title: string; value?: number } = { title: newDealTitle.trim() }
      if (newDealValue.trim()) body.value = parseFloat(newDealValue)
      await api.createDeal(id, body)
      setNewDealTitle('')
      setNewDealValue('')
      const dealsData = await api.getDeals(id)
      setDeals(dealsData as ContactDeal[])
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to create deal')
    } finally {
      setDealSaving(false)
    }
  }, [id, newDealTitle, newDealValue])

  const handleDeleteDeal = useCallback((dealId: string) => {
    Alert.alert('Delete Deal', 'Are you sure you want to delete this deal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteDeal(dealId)
            setDeals((prev) => prev.filter((d) => d.id !== dealId))
          } catch (err: unknown) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete deal')
          }
        },
      },
    ])
  }, [])

  const DEAL_STAGES = ['PROSPECT', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'] as const

  const handleChangeDealStage = useCallback(async (deal: ContactDeal) => {
    const stages = DEAL_STAGES as readonly string[]
    const currentIdx = stages.indexOf(deal.stage)
    const nextStage = stages[(currentIdx + 1) % stages.length] ?? stages[0]!
    try {
      await api.updateDealStage(deal.id, nextStage)
      setDeals((prev) => prev.map((d) => (d.id === deal.id ? { ...d, stage: nextStage } : d)))
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update deal stage')
    }
  }, [])

  const handleSendEmail = useCallback(async () => {
    if (!id || !emailSubject.trim() || !emailBody.trim()) return
    setEmailSending(true)
    try {
      await api.sendEmail(id, emailSubject.trim(), emailBody.trim())
      setEmailModalOpen(false)
      setEmailSubject('')
      setEmailBody('')
      Alert.alert('Sent', 'Email sent successfully.')
      // Refresh timeline
      const data = await api.getContact(id)
      setContact(data as ContactDetail)
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setEmailSending(false)
    }
  }, [id, emailSubject, emailBody])

  const handleAddTag = useCallback(async () => {
    if (!id || !contact || !newTag.trim()) return
    const trimmed = newTag.trim().toLowerCase()
    if ((contact.tags ?? []).includes(trimmed)) {
      setNewTag('')
      return
    }
    const updatedTags = [...(contact.tags ?? []), trimmed]
    setTagSaving(true)
    try {
      await api.updateTags(id, updatedTags)
      setContact((prev) => (prev ? { ...prev, tags: updatedTags } : prev))
      setNewTag('')
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update tags')
    } finally {
      setTagSaving(false)
    }
  }, [id, contact, newTag])

  const handleRemoveTag = useCallback(
    async (tag: string) => {
      if (!id || !contact) return
      const updatedTags = (contact.tags ?? []).filter((t) => t !== tag)
      setTagSaving(true)
      try {
        await api.updateTags(id, updatedTags)
        setContact((prev) => (prev ? { ...prev, tags: updatedTags } : prev))
      } catch (err: unknown) {
        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to remove tag')
      } finally {
        setTagSaving(false)
      }
    },
    [id, contact],
  )

  const handleEnrich = useCallback(async () => {
    if (!id) return
    setEnriching(true)
    try {
      await api.triggerEnrich(id)
      // Poll for up to 30s until enrichedAt changes
      const previousEnrichedAt = contact?.enrichedAt ?? null
      const deadline = Date.now() + 30_000
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 2000))
        const refreshed = (await api.getContact(id)) as ContactDetail
        if (refreshed.enrichedAt !== previousEnrichedAt) {
          setContact(refreshed)
          break
        }
      }
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to start enrichment')
    } finally {
      setEnriching(false)
    }
  }, [id, contact])

  const handleSaveCustomField = useCallback(
    async (fieldId: string, value: string) => {
      if (!id) return
      setFieldSavingId(fieldId)
      try {
        await api.setCustomFieldValue(id, fieldId, value)
        setCustomFieldValues((prev) => ({ ...prev, [fieldId]: value }))
      } catch (err: unknown) {
        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to save field')
      } finally {
        setFieldSavingId(null)
      }
    },
    [id],
  )

  const handleAssignPipeline = useCallback(
    async (pipelineId: string) => {
      if (!id) return
      setPipelineAssigning(true)
      try {
        await api.assignContactToPipeline(id, pipelineId)
        Alert.alert('Pipeline', 'Contact assigned to pipeline.')
      } catch (err: unknown) {
        Alert.alert('Error', err instanceof Error ? err.message : 'Failed to assign pipeline')
      } finally {
        setPipelineAssigning(false)
      }
    },
    [id],
  )

  // ─── Loading / error states ────────────────────────────────────────────────

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#f8fafc',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    )
  }

  if (error || !contact) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#f8fafc',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}
      >
        <Text style={{ color: '#ef4444', fontSize: 15, textAlign: 'center' }}>
          {error || 'Contact not found'}
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16, padding: 12 }}>
          <Text style={{ color: '#0ea5e9', fontWeight: '600' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const currentStage = contact.crmPipeline?.stage || 'NEW'
  const initials = contact.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Navigation header */}
      <View
        style={{
          backgroundColor: '#ffffff',
          paddingTop: 56,
          paddingBottom: 12,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#e2e8f0',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: '#0ea5e9', fontSize: 16, fontWeight: '600' }}>← Back</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          {(stageLoading || deleting) && <ActivityIndicator size="small" color="#0ea5e9" />}
          {/* Edit button */}
          <TouchableOpacity
            onPress={() => setEditModalOpen(true)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 5,
              borderRadius: 8,
              backgroundColor: '#f1f5f9',
            }}
          >
            <Text style={{ color: '#475569', fontWeight: '600', fontSize: 13 }}>Edit</Text>
          </TouchableOpacity>
          {/* Delete button */}
          <TouchableOpacity
            onPress={handleDelete}
            disabled={deleting}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 5,
              borderRadius: 8,
              backgroundColor: '#fee2e2',
            }}
          >
            <Text style={{ color: '#b91c1c', fontWeight: '600', fontSize: 13 }}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* Header card */}
        <View style={{ ...cardStyle, alignItems: 'center' }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              backgroundColor: '#8b5cf6',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 24 }}>
              {initials || '?'}
            </Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#0f172a' }}>{contact.name}</Text>
          {contact.company && (
            <Text style={{ color: '#64748b', fontSize: 14, marginTop: 2 }}>{contact.company}</Text>
          )}
          {contact.title && (
            <Text style={{ color: '#94a3b8', fontSize: 13, marginTop: 1 }}>{contact.title}</Text>
          )}
          <View
            style={{
              marginTop: 10,
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 12,
              backgroundColor: getStageStyle(currentStage).activeBg,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '700',
                color: getStageStyle(currentStage).activeText,
              }}
            >
              {currentStage}
            </Text>
          </View>
        </View>

        {/* Contact info */}
        <View style={{ ...cardStyle, gap: 12 }}>
          <Text style={{ fontWeight: '700', color: '#0f172a', fontSize: 15, marginBottom: 4 }}>
            Contact Info
          </Text>
          {contact.email && (
            <TouchableOpacity
              onPress={() => openEmail(contact.email!)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <Text style={{ color: '#94a3b8', fontSize: 13, width: 56 }}>Email</Text>
              <Text style={{ color: '#0ea5e9', fontSize: 14, flex: 1 }}>{contact.email}</Text>
            </TouchableOpacity>
          )}
          {contact.phone && (
            <TouchableOpacity
              onPress={() => openPhone(contact.phone!)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
            >
              <Text style={{ color: '#94a3b8', fontSize: 13, width: 56 }}>Phone</Text>
              <Text style={{ color: '#0ea5e9', fontSize: 14, flex: 1 }}>{contact.phone}</Text>
            </TouchableOpacity>
          )}
          {contact.website && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ color: '#94a3b8', fontSize: 13, width: 56 }}>Web</Text>
              <Text style={{ color: '#475569', fontSize: 14, flex: 1 }}>{contact.website}</Text>
            </View>
          )}
          {contact.address && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <Text style={{ color: '#94a3b8', fontSize: 13, width: 56, marginTop: 1 }}>Addr</Text>
              <Text style={{ color: '#475569', fontSize: 14, flex: 1, lineHeight: 20 }}>
                {contact.address}
              </Text>
            </View>
          )}
          {contact.sourceCard && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ color: '#94a3b8', fontSize: 13, width: 56 }}>Card</Text>
              <Text style={{ color: '#475569', fontSize: 14 }}>@{contact.sourceCard.handle}</Text>
            </View>
          )}
          {/* Send Email action */}
          {contact.email && (
            <TouchableOpacity
              onPress={() => setEmailModalOpen(true)}
              style={{
                marginTop: 4,
                paddingVertical: 9,
                borderRadius: 10,
                backgroundColor: '#eff6ff',
                alignItems: 'center',
              }}
            >
              <Text style={{ color: '#2563eb', fontWeight: '700', fontSize: 13 }}>Send Email</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Stage selector */}
        <View style={cardStyle}>
          <Text style={{ fontWeight: '700', color: '#0f172a', fontSize: 15, marginBottom: 12 }}>
            Stage
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {STAGES.map((stage) => {
              const isActive = currentStage === stage
              const stageStyle = getStageStyle(stage)
              return (
                <TouchableOpacity
                  key={stage}
                  onPress={() => void handleStageChange(stage)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    backgroundColor: isActive ? stageStyle.activeBg : stageStyle.bg,
                    borderWidth: 1.5,
                    borderColor: isActive ? stageStyle.activeText : 'transparent',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: isActive ? stageStyle.activeText : stageStyle.text,
                    }}
                  >
                    {stage}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        {/* Threaded Notes (Gap 1) */}
        <View style={cardStyle}>
          <Text style={{ fontWeight: '700', color: '#0f172a', fontSize: 15, marginBottom: 8 }}>
            Notes
          </Text>
          {/* Existing notes list */}
          {notes.length > 0 && (
            <View style={{ gap: 8, marginBottom: 12 }}>
              {notes.map((note) => (
                <View
                  key={note.id}
                  style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: 10,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                  }}
                >
                  {editingNoteId === note.id ? (
                    <>
                      <TextInput
                        value={editNoteContent}
                        onChangeText={setEditNoteContent}
                        multiline
                        numberOfLines={3}
                        maxLength={5000}
                        autoFocus
                        style={{
                          borderWidth: 1,
                          borderColor: '#0ea5e9',
                          borderRadius: 8,
                          padding: 8,
                          fontSize: 13,
                          color: '#0f172a',
                          minHeight: 64,
                          textAlignVertical: 'top',
                          backgroundColor: '#ffffff',
                        }}
                      />
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                        <TouchableOpacity
                          onPress={() => void handleSaveEditNote(note.id)}
                          disabled={editNoteSaving || !editNoteContent.trim()}
                          style={{
                            flex: 1,
                            paddingVertical: 7,
                            borderRadius: 8,
                            backgroundColor: editNoteContent.trim() ? '#0ea5e9' : '#e2e8f0',
                            alignItems: 'center',
                          }}
                        >
                          {editNoteSaving ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 12 }}>
                              Save
                            </Text>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={handleCancelEditNote}
                          style={{
                            flex: 1,
                            paddingVertical: 7,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: '#e2e8f0',
                            alignItems: 'center',
                          }}
                        >
                          <Text style={{ color: '#64748b', fontWeight: '600', fontSize: 12 }}>
                            Cancel
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={{ fontSize: 13, color: '#374151', lineHeight: 20 }}>
                        {note.content}
                      </Text>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: 6,
                        }}
                      >
                        <Text style={{ fontSize: 11, color: '#94a3b8' }}>
                          {relativeTime(note.createdAt)}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                          <TouchableOpacity onPress={() => handleStartEditNote(note)}>
                            <Text style={{ fontSize: 11, color: '#0ea5e9', fontWeight: '600' }}>
                              Edit
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => void handleDeleteNote(note.id)}>
                            <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: '600' }}>
                              Delete
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </>
                  )}
                </View>
              ))}
            </View>
          )}
          {notes.length === 0 && (
            <Text style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic', marginBottom: 12 }}>
              No notes yet.
            </Text>
          )}
          <TextInput
            value={noteText}
            onChangeText={setNoteText}
            placeholder="Add a note..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={3}
            maxLength={5000}
            style={{
              borderWidth: 1,
              borderColor: '#e2e8f0',
              borderRadius: 10,
              padding: 10,
              fontSize: 13,
              color: '#0f172a',
              minHeight: 72,
              textAlignVertical: 'top',
              backgroundColor: '#f8fafc',
            }}
          />
          <TouchableOpacity
            onPress={() => void handleAddNote()}
            disabled={noteSaving || !noteText.trim()}
            style={{
              marginTop: 8,
              paddingVertical: 9,
              borderRadius: 10,
              backgroundColor: noteText.trim() ? '#0ea5e9' : '#e2e8f0',
              alignItems: 'center',
            }}
          >
            {noteSaving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text
                style={{
                  color: noteText.trim() ? '#ffffff' : '#94a3b8',
                  fontWeight: '700',
                  fontSize: 13,
                }}
              >
                Save Note
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Tasks (Gap 7) */}
        <View style={cardStyle}>
          <Text style={{ fontWeight: '700', color: '#0f172a', fontSize: 15, marginBottom: 8 }}>
            Tasks
          </Text>
          {tasks.length > 0 && (
            <View style={{ gap: 8, marginBottom: 12 }}>
              {tasks.map((task) => (
                <View
                  key={task.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: 10,
                    backgroundColor: task.completed ? '#f0fdf4' : '#f8fafc',
                    borderRadius: 10,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: task.completed ? '#bbf7d0' : '#e2e8f0',
                  }}
                >
                  {/* Tap checkbox area to toggle */}
                  <TouchableOpacity
                    onPress={() => void handleToggleTask(task)}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      borderWidth: 2,
                      borderColor: task.completed ? '#16a34a' : '#94a3b8',
                      backgroundColor: task.completed ? '#16a34a' : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 1,
                      flexShrink: 0,
                    }}
                  >
                    {task.completed && (
                      <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '800' }}>✓</Text>
                    )}
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 13,
                        color: task.completed ? '#6b7280' : '#0f172a',
                        textDecorationLine: task.completed ? 'line-through' : 'none',
                        lineHeight: 20,
                      }}
                    >
                      {task.title}
                    </Text>
                    {task.dueAt && (
                      <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                        Due {formatDate(task.dueAt, userTz)}
                      </Text>
                    )}
                  </View>
                  {/* Delete button */}
                  <TouchableOpacity
                    onPress={() => handleDeleteTask(task.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ paddingLeft: 4, marginTop: 1 }}
                  >
                    <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: '600' }}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          {tasks.length === 0 && (
            <Text style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic', marginBottom: 12 }}>
              No tasks yet.
            </Text>
          )}
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
                placeholder="Add a task..."
                placeholderTextColor="#94a3b8"
                maxLength={500}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                  fontSize: 13,
                  color: '#0f172a',
                  backgroundColor: '#f8fafc',
                }}
                onSubmitEditing={() => void handleCreateTask()}
                returnKeyType="done"
              />
              <TouchableOpacity
                onPress={() => void handleCreateTask()}
                disabled={taskSaving || !newTaskTitle.trim()}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 10,
                  backgroundColor: newTaskTitle.trim() ? '#0ea5e9' : '#e2e8f0',
                  justifyContent: 'center',
                }}
              >
                {taskSaving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text
                    style={{
                      color: newTaskTitle.trim() ? '#ffffff' : '#94a3b8',
                      fontWeight: '700',
                      fontSize: 13,
                    }}
                  >
                    Add
                  </Text>
                )}
              </TouchableOpacity>
            </View>
            <TextInput
              value={newTaskDueAt}
              onChangeText={setNewTaskDueAt}
              placeholder="Due date (YYYY-MM-DD, optional)"
              placeholderTextColor="#94a3b8"
              maxLength={10}
              style={{
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 7,
                fontSize: 13,
                color: '#0f172a',
                backgroundColor: '#f8fafc',
              }}
            />
          </View>
        </View>

        {/* Deals */}
        <View style={cardStyle}>
          <Text style={{ fontWeight: '700', color: '#0f172a', fontSize: 15, marginBottom: 8 }}>
            Deals
          </Text>
          {deals.length > 0 && (
            <View style={{ gap: 8, marginBottom: 12 }}>
              {deals.map((deal) => (
                <View
                  key={deal.id}
                  style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: 10,
                    padding: 10,
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#0f172a', flex: 1 }}>
                      {deal.title}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                      <TouchableOpacity
                        onPress={() => void handleChangeDealStage(deal)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={{ fontSize: 11, color: '#0ea5e9', fontWeight: '600' }}>
                          Stage ›
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteDeal(deal.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={{ fontSize: 11, color: '#ef4444', fontWeight: '600' }}>
                          Delete
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}
                  >
                    {Number(deal.value) > 0 && (
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#16a34a' }}>
                        {new Intl.NumberFormat(undefined, {
                          style: 'currency',
                          currency: deal.currency || 'USD',
                          maximumFractionDigits: 0,
                        }).format(Number(deal.value))}
                      </Text>
                    )}
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 20,
                        backgroundColor:
                          deal.stage === 'CLOSED_WON'
                            ? '#dcfce7'
                            : deal.stage === 'CLOSED_LOST'
                              ? '#fee2e2'
                              : '#eff6ff',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '700',
                          color:
                            deal.stage === 'CLOSED_WON'
                              ? '#15803d'
                              : deal.stage === 'CLOSED_LOST'
                                ? '#b91c1c'
                                : '#1d4ed8',
                        }}
                      >
                        {deal.stage.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
          {deals.length === 0 && (
            <Text style={{ color: '#94a3b8', fontSize: 13, fontStyle: 'italic', marginBottom: 12 }}>
              No deals yet.
            </Text>
          )}
          {/* Quick add deal */}
          <View style={{ gap: 8 }}>
            <TextInput
              value={newDealTitle}
              onChangeText={setNewDealTitle}
              placeholder="Deal title..."
              placeholderTextColor="#94a3b8"
              maxLength={300}
              style={{
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 7,
                fontSize: 13,
                color: '#0f172a',
                backgroundColor: '#f8fafc',
              }}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                value={newDealValue}
                onChangeText={setNewDealValue}
                placeholder="Value (optional)"
                placeholderTextColor="#94a3b8"
                keyboardType="decimal-pad"
                maxLength={20}
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  paddingVertical: 7,
                  fontSize: 13,
                  color: '#0f172a',
                  backgroundColor: '#f8fafc',
                }}
              />
              <TouchableOpacity
                onPress={() => void handleCreateDeal()}
                disabled={dealSaving || !newDealTitle.trim()}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 10,
                  backgroundColor: newDealTitle.trim() ? '#16a34a' : '#e2e8f0',
                  justifyContent: 'center',
                }}
              >
                {dealSaving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text
                    style={{
                      color: newDealTitle.trim() ? '#ffffff' : '#94a3b8',
                      fontWeight: '700',
                      fontSize: 13,
                    }}
                  >
                    Add
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={cardStyle}>
          <Text style={{ fontWeight: '700', color: '#0f172a', fontSize: 15, marginBottom: 10 }}>
            Tags
          </Text>
          {(contact.tags ?? []).length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {(contact.tags ?? []).map((tag) => (
                <TouchableOpacity
                  key={tag}
                  onPress={() => void handleRemoveTag(tag)}
                  disabled={tagSaving}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 20,
                    backgroundColor: '#ede9fe',
                    gap: 4,
                  }}
                >
                  <Text style={{ color: '#6d28d9', fontSize: 12, fontWeight: '600' }}>{tag}</Text>
                  <Text style={{ color: '#6d28d9', fontSize: 12 }}>×</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={newTag}
              onChangeText={setNewTag}
              placeholder="Add tag..."
              placeholderTextColor="#94a3b8"
              maxLength={100}
              autoCapitalize="none"
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 10,
                paddingHorizontal: 10,
                paddingVertical: 7,
                fontSize: 13,
                color: '#0f172a',
                backgroundColor: '#f8fafc',
              }}
              onSubmitEditing={() => void handleAddTag()}
              returnKeyType="done"
            />
            <TouchableOpacity
              onPress={() => void handleAddTag()}
              disabled={tagSaving || !newTag.trim()}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                borderRadius: 10,
                backgroundColor: newTag.trim() ? '#8b5cf6' : '#e2e8f0',
                justifyContent: 'center',
              }}
            >
              {tagSaving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text
                  style={{
                    color: newTag.trim() ? '#ffffff' : '#94a3b8',
                    fontWeight: '700',
                    fontSize: 13,
                  }}
                >
                  Add
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Custom Fields */}
        {customFields.length > 0 && (
          <View style={cardStyle}>
            <Text style={{ fontWeight: '700', color: '#0f172a', fontSize: 15, marginBottom: 10 }}>
              Custom Fields
            </Text>
            {customFields.map((field) => {
              const currentValue = customFieldValues[field.id] ?? ''
              const isSaving = fieldSavingId === field.id
              return (
                <View key={field.id} style={{ marginBottom: 12 }}>
                  <Text
                    style={{ fontSize: 12, color: '#64748b', fontWeight: '600', marginBottom: 4 }}
                  >
                    {field.label}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {field.fieldType === 'SELECT' && field.options ? (
                      <View
                        style={{
                          flex: 1,
                          borderWidth: 1,
                          borderColor: '#e2e8f0',
                          borderRadius: 10,
                          overflow: 'hidden',
                          backgroundColor: '#f8fafc',
                        }}
                      >
                        {field.options.map((opt) => (
                          <TouchableOpacity
                            key={opt}
                            onPress={() => void handleSaveCustomField(field.id, opt)}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              backgroundColor: currentValue === opt ? '#ede9fe' : 'transparent',
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 13,
                                color: currentValue === opt ? '#6d28d9' : '#0f172a',
                                fontWeight: currentValue === opt ? '700' : '400',
                              }}
                            >
                              {opt}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : (
                      <>
                        <TextInput
                          value={customFieldValues[field.id] ?? ''}
                          onChangeText={(v) =>
                            setCustomFieldValues((prev) => ({ ...prev, [field.id]: v }))
                          }
                          placeholder={`Enter ${field.label.toLowerCase()}...`}
                          placeholderTextColor="#94a3b8"
                          keyboardType={
                            field.fieldType === 'NUMBER'
                              ? 'numeric'
                              : field.fieldType === 'URL'
                                ? 'url'
                                : 'default'
                          }
                          style={{
                            flex: 1,
                            borderWidth: 1,
                            borderColor: '#e2e8f0',
                            borderRadius: 10,
                            paddingHorizontal: 10,
                            paddingVertical: 7,
                            fontSize: 13,
                            color: '#0f172a',
                            backgroundColor: '#f8fafc',
                          }}
                          onSubmitEditing={() =>
                            void handleSaveCustomField(field.id, customFieldValues[field.id] ?? '')
                          }
                          returnKeyType="done"
                        />
                        <TouchableOpacity
                          onPress={() =>
                            void handleSaveCustomField(field.id, customFieldValues[field.id] ?? '')
                          }
                          disabled={isSaving}
                          style={{
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 10,
                            backgroundColor: '#0ea5e9',
                            justifyContent: 'center',
                          }}
                        >
                          {isSaving ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 12 }}>
                              Save
                            </Text>
                          )}
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* Pipeline assignment */}
        {pipelines.length > 0 && (
          <View style={cardStyle}>
            <Text style={{ fontWeight: '700', color: '#0f172a', fontSize: 15, marginBottom: 10 }}>
              Pipeline
            </Text>
            <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
              Assign this contact to a pipeline:
            </Text>
            {pipelines.map((pipeline) => (
              <TouchableOpacity
                key={pipeline.id}
                onPress={() => void handleAssignPipeline(pipeline.id)}
                disabled={pipelineAssigning}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                  marginBottom: 6,
                  backgroundColor: '#f8fafc',
                }}
              >
                <Text style={{ fontSize: 14, color: '#0f172a', fontWeight: '500' }}>
                  {pipeline.name}
                  {pipeline.isDefault ? ' (default)' : ''}
                </Text>
                {pipelineAssigning ? (
                  <ActivityIndicator size="small" color="#0ea5e9" />
                ) : (
                  <Text style={{ fontSize: 12, color: '#0ea5e9', fontWeight: '600' }}>Assign</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* AI Enrichment */}
        <View style={cardStyle}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
            }}
          >
            <Text style={{ fontWeight: '700', color: '#0f172a', fontSize: 15 }}>AI Enrichment</Text>
            <TouchableOpacity
              onPress={() => void handleEnrich()}
              disabled={enriching}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 8,
                backgroundColor: '#eff6ff',
              }}
            >
              {enriching ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : (
                <Text style={{ color: '#2563eb', fontWeight: '700', fontSize: 12 }}>
                  {contact.enrichedAt ? 'Re-enrich' : 'Enrich with AI'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {contact.enrichedAt ? (
            <View style={{ gap: 8 }}>
              {contact.enrichmentScore != null && (
                <View>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: '#64748b' }}>Confidence</Text>
                    <Text style={{ fontSize: 12, color: '#0f172a', fontWeight: '600' }}>
                      {contact.enrichmentScore}/100
                    </Text>
                  </View>
                  <View
                    style={{
                      height: 6,
                      backgroundColor: '#e2e8f0',
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        height: 6,
                        backgroundColor: '#6366f1',
                        borderRadius: 3,
                        width: `${contact.enrichmentScore}%`,
                      }}
                    />
                  </View>
                </View>
              )}
              {contact.enrichmentSummary && (
                <Text
                  style={{ fontSize: 13, color: '#475569', fontStyle: 'italic', lineHeight: 20 }}
                >
                  {contact.enrichmentSummary}
                </Text>
              )}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {contact.inferredIndustry && (
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 20,
                      backgroundColor: '#dbeafe',
                    }}
                  >
                    <Text style={{ color: '#1d4ed8', fontSize: 12, fontWeight: '600' }}>
                      {contact.inferredIndustry}
                    </Text>
                  </View>
                )}
                {contact.inferredSeniority && (
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 20,
                      backgroundColor: '#ede9fe',
                    }}
                  >
                    <Text style={{ color: '#6d28d9', fontSize: 12, fontWeight: '600' }}>
                      {contact.inferredSeniority}
                    </Text>
                  </View>
                )}
                {contact.inferredCompanySize && (
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 20,
                      backgroundColor: '#fef9c3',
                    }}
                  >
                    <Text style={{ color: '#a16207', fontSize: 12, fontWeight: '600' }}>
                      {contact.inferredCompanySize} employees
                    </Text>
                  </View>
                )}
              </View>
              {contact.inferredLinkedIn &&
                /^https:\/\/(www\.)?linkedin\.com\//.test(contact.inferredLinkedIn) && (
                  <TouchableOpacity onPress={() => void Linking.openURL(contact.inferredLinkedIn!)}>
                    <Text
                      style={{ color: '#2563eb', fontSize: 12, textDecorationLine: 'underline' }}
                    >
                      Inferred LinkedIn
                    </Text>
                  </TouchableOpacity>
                )}
            </View>
          ) : (
            <Text style={{ fontSize: 13, color: '#94a3b8', fontStyle: 'italic' }}>
              No enrichment data yet. Tap &quot;Enrich with AI&quot; to analyse this contact.
            </Text>
          )}
        </View>

        {/* Timeline */}
        {contact.timeline && contact.timeline.length > 0 && (
          <View style={cardStyle}>
            <Text style={{ fontWeight: '700', color: '#0f172a', fontSize: 15, marginBottom: 12 }}>
              Timeline
            </Text>
            <View style={{ gap: 12 }}>
              {contact.timeline.map((event) => (
                <View key={event.id} style={{ flexDirection: 'row', gap: 10 }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: eventDotColor(event),
                      marginTop: 5,
                      flexShrink: 0,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, color: '#475569', lineHeight: 20 }}>
                      {eventLabel(event)}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                      {relativeTime(event.createdAt)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Bottom padding */}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Edit Contact Modal */}
      {editModalOpen && (
        <EditContactModal
          visible={editModalOpen}
          contact={contact}
          onClose={() => setEditModalOpen(false)}
          onSaved={(updated) => setContact(updated)}
        />
      )}

      {/* Send Email Modal */}
      <Modal
        visible={emailModalOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEmailModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: '#ffffff',
              paddingTop: Platform.OS === 'ios' ? 56 : 32,
              paddingHorizontal: 20,
            }}
          >
            {/* Modal header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 20,
              }}
            >
              <TouchableOpacity onPress={() => setEmailModalOpen(false)}>
                <Text style={{ color: '#64748b', fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
              <Text style={{ fontWeight: '800', fontSize: 16, color: '#0f172a' }}>Send Email</Text>
              <TouchableOpacity
                onPress={() => void handleSendEmail()}
                disabled={emailSending || !emailSubject.trim() || !emailBody.trim()}
              >
                {emailSending ? (
                  <ActivityIndicator size="small" color="#0ea5e9" />
                ) : (
                  <Text
                    style={{
                      color: emailSubject.trim() && emailBody.trim() ? '#0ea5e9' : '#94a3b8',
                      fontWeight: '700',
                      fontSize: 15,
                    }}
                  >
                    Send
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>To</Text>
            <Text style={{ fontSize: 14, color: '#0f172a', marginBottom: 16 }}>
              {contact.email}
            </Text>

            {emailTemplates.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <TouchableOpacity
                  onPress={() => setTemplatePickerOpen(true)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#c7d2fe',
                    backgroundColor: '#eef2ff',
                  }}
                >
                  <Text style={{ fontSize: 13, color: '#4338ca', fontWeight: '600' }}>
                    Use a template
                  </Text>
                  <Text style={{ fontSize: 13, color: '#4338ca' }}>›</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Subject</Text>
            <TextInput
              value={emailSubject}
              onChangeText={setEmailSubject}
              placeholder="Subject"
              placeholderTextColor="#94a3b8"
              maxLength={200}
              style={{
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 10,
                padding: 10,
                fontSize: 14,
                color: '#0f172a',
                marginBottom: 16,
                backgroundColor: '#f8fafc',
              }}
            />

            <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Message</Text>
            <TextInput
              value={emailBody}
              onChangeText={setEmailBody}
              placeholder="Write your message..."
              placeholderTextColor="#94a3b8"
              multiline
              maxLength={5000}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: '#e2e8f0',
                borderRadius: 10,
                padding: 10,
                fontSize: 14,
                color: '#0f172a',
                textAlignVertical: 'top',
                backgroundColor: '#f8fafc',
              }}
            />
          </View>
        </KeyboardAvoidingView>

        {/* Template picker modal (inside email modal stack) */}
        <Modal
          visible={templatePickerOpen}
          animationType="slide"
          presentationStyle="formSheet"
          onRequestClose={() => setTemplatePickerOpen(false)}
        >
          <View style={{ flex: 1, backgroundColor: '#ffffff', paddingTop: 32 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                marginBottom: 16,
              }}
            >
              <Text style={{ fontWeight: '800', fontSize: 16, color: '#0f172a' }}>
                Choose Template
              </Text>
              <TouchableOpacity onPress={() => setTemplatePickerOpen(false)}>
                <Text style={{ color: '#64748b', fontSize: 15 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              contentContainerStyle={{ paddingHorizontal: 20, gap: 10, paddingBottom: 40 }}
            >
              {emailTemplates.map((tpl) => (
                <TouchableOpacity
                  key={tpl.id}
                  onPress={() => {
                    setEmailSubject(tpl.subject)
                    setEmailBody(tpl.body)
                    setTemplatePickerOpen(false)
                  }}
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: '#e2e8f0',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  <Text style={{ fontWeight: '700', fontSize: 14, color: '#0f172a' }}>
                    {tpl.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#64748b', marginTop: 2 }} numberOfLines={1}>
                    {tpl.subject}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Modal>
      </Modal>
    </View>
  )
}
