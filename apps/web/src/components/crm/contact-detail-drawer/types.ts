import type {
  ContactCustomFieldValueResponse,
  ContactDealResponse,
  ContactDetailResponse,
  ContactNoteResponse,
  ContactTaskResponse,
  ContactTimelineEventResponse,
  CustomFieldDefinitionResponse,
} from '@dotly/types'

export type ContactNote = ContactNoteResponse

export interface ContactEmail {
  id: string
  subject: string
  sentAt: string
  openedAt: string | null
  clickedAt: string | null
}

export type ContactDeal = ContactDealResponse & {
  value: string | null
  probability: number | null
}

export type ContactTask = ContactTaskResponse

export type TimelineEvent = ContactTimelineEventResponse

export type ContactCustomFieldValue = Omit<ContactCustomFieldValueResponse, 'field'> & {
  field: {
    label: string
    fieldType: string
  }
}

export type CustomFieldDefinition = CustomFieldDefinitionResponse

export interface DuplicateContact {
  id: string
  name: string
  email?: string | null
  company?: string | null
}

export interface DuplicateGroup {
  reason: string
  contacts: DuplicateContact[]
}

export type ConfirmIntent =
  | { type: 'note'; id: string; label: string }
  | { type: 'task'; id: string; label: string }
  | { type: 'deal'; id: string; label: string }

export type ContactDetail = Omit<
  ContactDetailResponse,
  'tags' | 'createdAt' | 'contactNotes' | 'tasks' | 'deals' | 'customFieldValues'
> & {
  tags: string[]
  createdAt: string
  contactNotes?: ContactNote[]
  tasks?: ContactTask[]
  deals?: ContactDeal[]
  customFieldValues?: ContactCustomFieldValue[]
}

export interface ContactDetailDrawerProps {
  contactId: string | null
  onClose: () => void
  onUpdate?: (contact: ContactDetail) => void
  onMutate?: () => void
}
