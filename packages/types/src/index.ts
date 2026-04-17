// Enums
export enum Plan {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PRO = 'PRO',
  BUSINESS = 'BUSINESS',
  AGENCY = 'AGENCY',
  ENTERPRISE = 'ENTERPRISE',
}

export enum BillingDuration {
  MONTHLY = 'MONTHLY',
  SIX_MONTHS = 'SIX_MONTHS',
  ANNUAL = 'ANNUAL',
}

export enum CardTemplate {
  MINIMAL = 'MINIMAL',
  BOLD = 'BOLD',
  CREATIVE = 'CREATIVE',
  CORPORATE = 'CORPORATE',
  ELEGANT = 'ELEGANT',
  DARK = 'DARK',
  NEON = 'NEON',
  RETRO = 'RETRO',
  GLASSMORPHISM = 'GLASSMORPHISM',
}

export enum ContactStage {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  CLOSED = 'CLOSED',
  LOST = 'LOST',
}

export const CONTACT_STAGES = [
  ContactStage.NEW,
  ContactStage.CONTACTED,
  ContactStage.QUALIFIED,
  ContactStage.CLOSED,
  ContactStage.LOST,
] as const

export enum AnalyticsEventType {
  VIEW = 'VIEW',
  CLICK = 'CLICK',
  SAVE = 'SAVE',
  LEAD_SUBMIT = 'LEAD_SUBMIT',
}

export type AnalyticsActionType =
  | 'card_viewed'
  | 'open_booking_page'
  | 'booking_started'
  | 'booking_completed'
  | 'whatsapp_clicked'
  | 'open_lead_capture'
  | 'lead_submitted'
  | 'deposit_started'
  | 'deposit_completed'
  | 'payment_started'
  | 'payment_completed'
  | 'services_page_viewed'
  | 'store_page_viewed'
  | 'service_checkout_started'
  | 'service_checkout_completed'
  | 'product_checkout_started'
  | 'product_checkout_completed'
  | 'save_contact_attempt'
  | 'vcard_downloaded'
  | 'social_link_click'

export interface CardServiceOffer {
  id: string
  name: string
  description?: string
  priceUsdt: string
  highlighted?: boolean
}

export interface CardStoreProduct {
  id: string
  name: string
  description?: string
  priceUsdt: string
  imageUrl?: string
  inventoryCount?: number
  shippingNote?: string
  variantLabel?: string
  highlighted?: boolean
}

export enum SocialPlatform {
  LINKEDIN = 'LINKEDIN',
  TWITTER = 'TWITTER',
  INSTAGRAM = 'INSTAGRAM',
  GITHUB = 'GITHUB',
  YOUTUBE = 'YOUTUBE',
  TIKTOK = 'TIKTOK',
  WHATSAPP = 'WHATSAPP',
  FACEBOOK = 'FACEBOOK',
  CALENDLY = 'CALENDLY',
  CALCOM = 'CALCOM',
  CUSTOM = 'CUSTOM',
}

export enum MediaBlockType {
  VIDEO = 'VIDEO',
  IMAGE = 'IMAGE',
  AUDIO = 'AUDIO',
  DOCUMENT = 'DOCUMENT',
  HEADING = 'HEADING',
}

export enum TeamRole {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  PAST_DUE = 'PAST_DUE',
  PENDING = 'PENDING',
}

export interface UpdateProfileDto {
  name?: string
  /** ISO 3166-1 alpha-2 country code, e.g. "US", "GB", "IN" */
  country?: string | null
  /** IANA timezone identifier, e.g. "America/New_York", "Asia/Kolkata" */
  timezone?: string | null
}

// DTOs
export interface CreateCardDto {
  handle?: string
  templateId: CardTemplate
  fields?: Partial<CardFields>
}

export interface UpdateCardDto {
  handle?: string
  templateId?: CardTemplate
  fields?: Partial<CardFields>
  isActive?: boolean
}

export type CardActionType = 'BOOK' | 'WHATSAPP_CHAT' | 'LEAD_CAPTURE'

export interface CardActionConfig {
  type: CardActionType
  label?: string
  enabled?: boolean
  whatsappMessage?: string
}

export interface CardActionsConfig {
  primary?: CardActionConfig | null
  secondary?: CardActionConfig[]
}

export interface CardFields {
  name: string
  title: string
  company: string
  phone: string
  whatsapp: string
  email: string
  website: string
  bio: string
  address: string
  mapUrl: string
  avatarUrl: string
  logoUrl: string
  bookingAppointmentSlug?: string
  actions?: CardActionsConfig
  services?: CardServiceOffer[]
  products?: CardStoreProduct[]
}

export type ButtonStyle = 'icon' | 'filled-icon' | 'icon-text' | 'filled-icon-text'

export type SocialButtonStyle = 'icons' | 'pills' | 'list' | 'follow'

export interface UpdateThemeDto {
  primaryColor?: string
  secondaryColor?: string
  fontFamily?: string
  backgroundUrl?: string
  logoUrl?: string
  buttonStyle?: ButtonStyle
  socialButtonStyle?: SocialButtonStyle
}

export interface SocialLinkInput {
  platform: SocialPlatform
  url: string
  displayOrder: number
}

export interface UpsertSocialLinksDto {
  links: SocialLinkInput[]
}

export interface CreateContactDto {
  name: string
  email?: string
  phone?: string
  company?: string
  sourceCardId?: string
}

export interface UpdateContactDto {
  name?: string
  email?: string
  phone?: string
  company?: string
  stage?: ContactStage
  notes?: string
  tags?: string[]
}

export type VcardPolicy = 'PUBLIC' | 'MEMBERS_ONLY'

// Shared data shapes (used by CardRenderer)
export interface CardData {
  id: string
  handle: string
  templateId: CardTemplate
  fields: CardFields
  isActive: boolean
  vcardPolicy?: VcardPolicy
}

export interface CardThemeData {
  primaryColor: string
  secondaryColor: string
  fontFamily: string
  backgroundUrl?: string
  logoUrl?: string
  buttonStyle?: ButtonStyle
  socialButtonStyle?: SocialButtonStyle
}

export interface SocialLinkData {
  id: string
  platform: SocialPlatform
  url: string
  displayOrder: number
}

export interface MediaBlockData {
  id: string
  type: MediaBlockType
  url: string | null
  caption?: string
  altText?: string
  linkUrl?: string
  displayOrder: number
  /** MIME type stored at upload time (e.g. "application/pdf", "image/webp") */
  mimeType?: string
  /** File size in bytes, stored at upload time for locally-uploaded files */
  fileSize?: number
  /** Shared identifier for all blocks belonging to the same group */
  groupId?: string
  /** Display name of the group (e.g. "Portfolio", "Downloads") */
  groupName?: string
}

export interface CardRendererProps {
  card: CardData
  theme: CardThemeData
  socialLinks: SocialLinkData[]
  mediaBlocks: MediaBlockData[]
  mode: 'web' | 'mobile' | 'preview'
  onLeadCapture?: () => void
  onSaveContact?: () => void
  onSocialLinkClick?: (platform: string, url: string) => void
}

export interface ApiErrorResponse {
  statusCode: number
  code: string
  timestamp: string
  path: string
  message: string
  details?: unknown
}

export interface ItemsResponse<T> {
  items: T[]
}

export interface PaginatedResponse<T> extends ItemsResponse<T> {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CursorPageResponse<T> extends ItemsResponse<T> {
  hasMore: boolean
  nextCursor: string | null
}

export interface SuccessResponse {
  success: true
}

export interface DeletedResponse {
  deleted: true
}

export interface UserMeResponse {
  id: string
  email: string
  emailVerifiedAt: string | null
  name: string | null
  avatarUrl: string | null
  plan: string
  walletAddress: string | null
  country: string | null
  timezone: string | null
  notifLeadCaptured: boolean | null
  notifWeeklyDigest: boolean | null
  notifProductUpdates: boolean | null
  createdAt: string
  updatedAt: string
}

export interface BillingSummaryResponse {
  plan: string
  status: string | null
  currentPeriodEnd: string | null
  walletAddress: string | null
  txHash: string | null
  chainId: number | null
  boosterAiOrderId: string | null
  billingDuration: string | null
  amountUsdt: string | null
  cryptoBlocked: boolean
  billingCountry: string | null
  refund: BillingRefundSummary | null
}

export type BillingRefundStatus = 'NONE' | 'PAID_ESCROW' | 'REFUNDED' | 'FINALIZED'

export interface BillingRefundSummary {
  paymentId: string | null
  paymentVaultAddress: string | null
  status: BillingRefundStatus
  refundUntil: string | null
  eligible: boolean
  canSelfRefund: boolean
  canRequestManualReview: boolean
  supportRequestedAt: string | null
}

export interface BillingCheckoutQuoteResponse {
  amountUsdt: string
  amountRaw: string
  paymentVaultAddress: string
  usdtTokenAddress: string
  paymentRef: string
  paymentId: string
  userRef: string
  planId: number
  durationId: number
  deadline: string
  signature: string
  chainId: number
}

export interface BillingHostedCheckoutQuoteResponse extends BillingCheckoutQuoteResponse {
  plan: string
  duration: string
  walletAddress: string
}

export interface BillingActivateCheckoutDto {
  paymentId: string
  txHash: string
  chainId: number
}

export interface BillingActivateCheckoutResponse {
  status: 'ACTIVE' | 'PENDING' | 'CANCELLED'
  plan: string
  currentPeriodEnd: string | null
}

export interface BillingActivateHostedCheckoutDto {
  paymentId: string
  txHash: string
  chainId: number
}

export interface BillingHostedCheckoutStatusResponse {
  paymentId: string
  status: 'PENDING' | 'PAID' | 'ACTIVE' | 'REFUNDED' | 'EXPIRED'
  paid: boolean
  activated: boolean
  txHash: string | null
  currentPeriodEnd: string | null
}

export interface BillingRefundRequestResponse {
  status: 'REQUESTED'
  paymentId: string
  requestedAt: string
  alreadyRequested: boolean
}

export interface BillingRefundReviewItem {
  requestId: string
  userId: string | null
  userEmail: string | null
  userName: string | null
  requestedAt: string
  paymentId: string | null
  txHash: string | null
  plan: string
  subscriptionStatus: string | null
  currentPeriodEnd: string | null
  refund: BillingRefundSummary | null
  canAdminRefund: boolean
  adminRefundTxHash: string | null
}

export interface BillingRefundReviewListResponse {
  items: BillingRefundReviewItem[]
  adminRefundEnabled: boolean
}

export interface BillingAdminRefundResponse {
  status: 'REFUNDED'
  paymentId: string
  txHash: string
}

export type CardFieldKey = keyof CardFields

export type PartialCardFields = Partial<CardFields>

export interface CardThemeResponse {
  id: string
  primaryColor: string
  secondaryColor: string
  fontFamily: string
  backgroundUrl: string | null
  logoUrl: string | null
  buttonStyle: ButtonStyle
  socialButtonStyle: SocialButtonStyle
}

export interface CardRecordResponse {
  id: string
  handle: string
  templateId: CardTemplate
  isActive: boolean
  vcardPolicy?: VcardPolicy
  fields: PartialCardFields
  theme?: CardThemeResponse | null
  socialLinks?: SocialLinkData[]
  mediaBlocks?: MediaBlockData[]
  createdAt?: string
  updatedAt?: string
}

export interface CardEditorResponse extends CardRecordResponse {
  fields: PartialCardFields
}

export interface CardListItemResponse {
  id: string
  handle: string
  templateId: CardTemplate
  isActive: boolean
  fields: PartialCardFields
  createdAt: string
  viewCount?: number
}

export interface ContactSourceCardResponse {
  handle: string
}

export interface ContactPipelineResponse {
  id?: string
  stage: ContactStage | string
  updatedAt?: string
  pipelineId?: string | null
}

export interface ContactTimelineEventResponse {
  id: string
  event: string
  metadata: Record<string, unknown>
  createdAt: string
}

export interface ContactNoteResponse {
  id: string
  content: string
  createdAt: string
  updatedAt?: string
}

export type ContactTaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type ContactTaskType = 'CALL' | 'EMAIL' | 'MEETING' | 'TODO' | 'FOLLOW_UP'

export interface ContactTaskResponse {
  id: string
  title: string
  dueAt: string | null
  completed: boolean
  completedAt: string | null
  createdAt: string
  updatedAt?: string
  priority?: ContactTaskPriority
  type?: ContactTaskType
  contact?: {
    id: string
    name: string
  }
}

export type DealStage = 'PROSPECT' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST'

export const DEAL_STAGES = [
  'PROSPECT',
  'PROPOSAL',
  'NEGOTIATION',
  'CLOSED_WON',
  'CLOSED_LOST',
] as const satisfies readonly DealStage[]

export interface ContactDealResponse {
  id: string
  title: string
  value: number | string | null
  currency: string
  stage: DealStage | string
  probability: number | string | null
  closeDate: string | null
  notes?: string | null
  contact?: {
    id: string
    name: string
    email?: string | null
  }
}

export interface CustomFieldDefinitionResponse {
  id: string
  label: string
  fieldType: string
  options: string[] | null
  required?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface ContactCustomFieldValueResponse {
  id?: string
  fieldId: string
  value: string
  field?: CustomFieldDefinitionResponse
}

export interface ContactDetailResponse {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  company?: string | null
  title?: string | null
  website?: string | null
  address?: string | null
  notes?: string | null
  tags?: string[]
  createdAt?: string
  updatedAt?: string
  enrichedAt?: string | null
  enrichmentScore?: number | null
  enrichmentSummary?: string | null
  inferredIndustry?: string | null
  inferredSeniority?: string | null
  inferredCompanySize?: string | null
  inferredLinkedIn?: string | null
  sourceCard?: ContactSourceCardResponse | null
  crmPipeline?: ContactPipelineResponse | null
  timeline?: ContactTimelineEventResponse[]
  contactNotes?: ContactNoteResponse[]
  tasks?: ContactTaskResponse[]
  deals?: ContactDealResponse[]
  customFieldValues?: ContactCustomFieldValueResponse[]
}

export interface PipelineResponse {
  id: string
  name: string
  isDefault: boolean
  stages?: string[]
  stageColors?: Record<string, string> | null
  createdAt?: string
  updatedAt?: string
}

export interface AppointmentAvailabilityRuleResponse {
  id: string
  dayOfWeek: string
  startTime: string
  endTime: string
}

export interface AppointmentQuestionResponse {
  id: string
  label: string
  type: string
  options: string[]
  required: boolean
  position: number
}

export interface AppointmentTypeResponse {
  id: string
  name: string
  slug: string
  description: string | null
  durationMins: number
  color: string
  bufferDays: number
  bufferAfterMins: number
  location: string | null
  isActive: boolean
  timezone: string
  depositEnabled?: boolean
  depositAmountUsdt?: string | null
  availabilityRules?: AppointmentAvailabilityRuleResponse[]
  questions?: AppointmentQuestionResponse[]
  _count?: { bookings: number }
}

export type BookingStatusResponse = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW'

export interface BookingResponse {
  id: string
  startAt: string
  endAt: string
  status: BookingStatusResponse
  guestName: string
  guestEmail: string
  appointmentType: {
    name: string
    color: string
    durationMins?: number
  }
}

export function relativeTimeLabel(dateStr: string, nowMs = Date.now()): string {
  const diff = nowMs - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function contactTimelineEventColor(event: ContactTimelineEventResponse): string {
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

export function contactTimelineEventLabel(event: ContactTimelineEventResponse): string {
  switch (event.event) {
    case 'LEAD_CAPTURED':
      return `Lead captured${event.metadata?.sourceHandle ? ` from @${String(event.metadata.sourceHandle)}` : ''}`
    case 'STAGE_CHANGED':
      return `Stage changed: ${String(event.metadata?.from ?? '?')} -> ${String(event.metadata?.to ?? '?')}`
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
