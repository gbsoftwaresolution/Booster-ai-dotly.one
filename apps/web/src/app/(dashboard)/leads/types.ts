export interface SubmissionContact {
  id: string
  name: string
  email?: string | null
  phone?: string | null
}

export interface LeadSubmission {
  id: string
  leadFormId: string
  leadFormTitle: string | null
  cardHandle: string | null
  cardId: string | null
  answers: Record<string, string>
  submittedAt: string
  contact: SubmissionContact | null
}

export interface CardSummary {
  id: string
  handle: string
}
