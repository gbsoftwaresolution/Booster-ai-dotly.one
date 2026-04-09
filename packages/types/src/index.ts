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
}

export enum ContactStage {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  CLOSED = 'CLOSED',
  LOST = 'LOST',
}

export enum AnalyticsEventType {
  VIEW = 'VIEW',
  CLICK = 'CLICK',
  SAVE = 'SAVE',
  LEAD_SUBMIT = 'LEAD_SUBMIT',
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
  TRIALING = 'TRIALING',
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

// Shared data shapes (used by CardRenderer)
export interface CardData {
  id: string
  handle: string
  templateId: CardTemplate
  fields: CardFields
  isActive: boolean
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
