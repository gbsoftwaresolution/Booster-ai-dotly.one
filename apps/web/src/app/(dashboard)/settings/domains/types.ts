export interface CustomDomain {
  id: string
  domain: string
  status: 'PENDING' | 'ACTIVE' | 'FAILED'
  verificationToken: string
  isVerified: boolean
  sslStatus: string
  createdAt: string
  card?: {
    id: string
    handle: string
  } | null
}

export interface CardOption {
  id: string
  handle: string
  fields?: { name?: string } | null
}

export interface ConfirmDialogState {
  domainId: string
  domain: string
}
