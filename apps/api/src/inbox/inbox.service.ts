import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import * as path from 'path'

// ─── Allowed MIME types ────────────────────────────────────────────────────────

const VOICE_ALLOWED_TYPES = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/x-wav',
  'audio/aac',
])

const DROPBOX_ALLOWED_TYPES = new Set([
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Archives
  'application/zip',
  'application/x-zip-compressed',
  // Text
  'text/plain',
  'text/csv',
  'application/json',
])

const MAX_VOICE_BYTES = 20 * 1024 * 1024 // 20 MB
const MAX_FILE_BYTES = 50 * 1024 * 1024 // 50 MB

interface InboxUploadTokenPayload {
  cardId: string
  publicUrl: string
  contentType: string
  fileSizeBytes: number
  category: 'voice' | 'dropbox'
  exp: number
}

@Injectable()
export class InboxService {
  private readonly r2Client: S3Client
  private readonly r2Bucket: string
  private readonly r2PublicUrl: string
  private readonly uploadTokenSecret: string

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const accountId = this.config.getOrThrow<string>('R2_ACCOUNT_ID')
    const accessKeyId = this.config.getOrThrow<string>('R2_ACCESS_KEY_ID')
    const secretAccessKey = this.config.getOrThrow<string>('R2_SECRET_ACCESS_KEY')
    this.r2Bucket = this.config.getOrThrow<string>('R2_BUCKET')
    const r2Url = this.config.get<string>('R2_PUBLIC_URL') ?? 'https://cdn.dotly.one'
    this.r2PublicUrl = r2Url.startsWith('http') ? r2Url : `https://${r2Url}`
    this.uploadTokenSecret =
      this.config.get<string>('INBOX_UPLOAD_TOKEN_SECRET') ??
      this.config.get<string>('SUPABASE_JWT_SECRET') ??
      secretAccessKey

    this.r2Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    })
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  /** Resolve a published card by handle and verify it exists */
  private async resolveCard(handle: string) {
    const card = await this.prisma.card.findUnique({ where: { handle, isActive: true } })
    if (!card) throw new NotFoundException('Card not found')
    return card
  }

  private encodeUploadToken(payload: InboxUploadTokenPayload): string {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
    const sig = createHmac('sha256', this.uploadTokenSecret).update(body).digest('base64url')
    return `${body}.${sig}`
  }

  private decodeUploadToken(token: string): InboxUploadTokenPayload {
    const [body, sig] = token.split('.')
    if (!body || !sig) throw new BadRequestException('Invalid upload token')
    const expectedSig = createHmac('sha256', this.uploadTokenSecret)
      .update(body)
      .digest('base64url')
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
      throw new BadRequestException('Invalid upload token')
    }
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as InboxUploadTokenPayload
    if (payload.exp < Date.now()) {
      throw new BadRequestException('Upload token has expired')
    }
    return payload
  }

  /** Assert the requesting user owns the card */
  private async assertCardOwner(cardId: string, userId: string) {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      select: { userId: true },
    })
    if (!card) throw new NotFoundException('Card not found')
    // support both internal id and supabaseId
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ id: userId }, { supabaseId: userId }] },
      select: { id: true },
    })
    if (!user || card.userId !== user.id) throw new ForbiddenException('Forbidden')
    return user.id
  }

  /** Generate presigned R2 PUT URL for client-side upload */
  private async presign(
    prefix: string,
    filename: string,
    contentType: string,
    fileSizeBytes: number,
  ) {
    const safeFilename = path.basename(filename) || 'upload'
    const suffix = randomBytes(4).toString('hex')
    const key = `inbox/${prefix}/${Date.now()}-${suffix}-${safeFilename}`
    const command = new PutObjectCommand({
      Bucket: this.r2Bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: fileSizeBytes,
    })
    const uploadUrl = await getSignedUrl(this.r2Client, command, { expiresIn: 300 })
    return { uploadUrl, publicUrl: `${this.r2PublicUrl}/${key}` }
  }

  // ── Messages ─────────────────────────────────────────────────────────────────

  async sendMessage(
    handle: string,
    senderName: string,
    senderEmail: string | undefined,
    message: string,
  ) {
    const card = await this.resolveCard(handle)
    return this.prisma.cardMessage.create({
      data: { cardId: card.id, senderName, senderEmail, message },
      select: { id: true, createdAt: true },
    })
  }

  async getMessages(cardId: string, userId: string, cursor?: string, limit = 30) {
    await this.assertCardOwner(cardId, userId)
    const items = await this.prisma.cardMessage.findMany({
      where: { cardId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })
    const hasMore = items.length > limit
    return {
      items: items.slice(0, limit),
      hasMore,
      nextCursor: hasMore ? items[limit - 1]?.id : null,
    }
  }

  async markMessageRead(id: string, userId: string) {
    const msg = await this.prisma.cardMessage.findUnique({
      where: { id },
      select: { cardId: true },
    })
    if (!msg) throw new NotFoundException('Message not found')
    await this.assertCardOwner(msg.cardId, userId)
    return this.prisma.cardMessage.update({
      where: { id },
      data: { read: true },
      select: { id: true, read: true },
    })
  }

  async deleteMessage(id: string, userId: string) {
    const msg = await this.prisma.cardMessage.findUnique({
      where: { id },
      select: { cardId: true },
    })
    if (!msg) throw new NotFoundException('Message not found')
    await this.assertCardOwner(msg.cardId, userId)
    await this.prisma.cardMessage.delete({ where: { id } })
  }

  // ── Voice Notes ───────────────────────────────────────────────────────────────

  async getVoiceUploadUrl(
    handle: string,
    filename: string,
    contentType: string,
    fileSizeBytes: number,
  ) {
    if (!VOICE_ALLOWED_TYPES.has(contentType))
      throw new BadRequestException(`Audio type not allowed: ${contentType}`)
    if (fileSizeBytes > MAX_VOICE_BYTES)
      throw new BadRequestException('Audio file too large (max 20 MB)')
    const card = await this.resolveCard(handle)
    const { uploadUrl, publicUrl } = await this.presign(
      `voice/${card.id}`,
      filename,
      contentType,
      fileSizeBytes,
    )
    const uploadToken = this.encodeUploadToken({
      cardId: card.id,
      publicUrl,
      contentType,
      fileSizeBytes,
      category: 'voice',
      exp: Date.now() + 5 * 60 * 1000,
    })
    return { uploadUrl, publicUrl, uploadToken, cardId: card.id }
  }

  async confirmVoiceNote(
    handle: string,
    senderName: string,
    senderEmail: string | undefined,
    uploadToken: string,
    durationSec: number | undefined,
  ) {
    const card = await this.resolveCard(handle)
    const upload = this.decodeUploadToken(uploadToken)
    if (upload.category !== 'voice' || upload.cardId !== card.id) {
      throw new BadRequestException('Upload token does not match this voice upload')
    }
    return this.prisma.cardVoiceNote.create({
      data: {
        cardId: card.id,
        senderName,
        senderEmail,
        audioUrl: upload.publicUrl,
        mimeType: upload.contentType,
        fileSize: upload.fileSizeBytes,
        durationSec,
      },
      select: { id: true, createdAt: true },
    })
  }

  async getVoiceNotes(cardId: string, userId: string, cursor?: string, limit = 30) {
    await this.assertCardOwner(cardId, userId)
    const items = await this.prisma.cardVoiceNote.findMany({
      where: { cardId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })
    const hasMore = items.length > limit
    return {
      items: items.slice(0, limit),
      hasMore,
      nextCursor: hasMore ? items[limit - 1]?.id : null,
    }
  }

  async markVoiceNoteRead(id: string, userId: string) {
    const note = await this.prisma.cardVoiceNote.findUnique({
      where: { id },
      select: { cardId: true },
    })
    if (!note) throw new NotFoundException('Voice note not found')
    await this.assertCardOwner(note.cardId, userId)
    return this.prisma.cardVoiceNote.update({
      where: { id },
      data: { read: true },
      select: { id: true, read: true },
    })
  }

  async deleteVoiceNote(id: string, userId: string) {
    const note = await this.prisma.cardVoiceNote.findUnique({
      where: { id },
      select: { cardId: true },
    })
    if (!note) throw new NotFoundException('Voice note not found')
    await this.assertCardOwner(note.cardId, userId)
    await this.prisma.cardVoiceNote.delete({ where: { id } })
  }

  // ── Dropbox Files ─────────────────────────────────────────────────────────────

  async getDropboxUploadUrl(
    handle: string,
    filename: string,
    contentType: string,
    fileSizeBytes: number,
  ) {
    if (!DROPBOX_ALLOWED_TYPES.has(contentType))
      throw new BadRequestException(`File type not allowed: ${contentType}`)
    if (fileSizeBytes > MAX_FILE_BYTES) throw new BadRequestException('File too large (max 50 MB)')
    const card = await this.resolveCard(handle)
    const { uploadUrl, publicUrl } = await this.presign(
      `dropbox/${card.id}`,
      filename,
      contentType,
      fileSizeBytes,
    )
    const uploadToken = this.encodeUploadToken({
      cardId: card.id,
      publicUrl,
      contentType,
      fileSizeBytes,
      category: 'dropbox',
      exp: Date.now() + 5 * 60 * 1000,
    })
    return { uploadUrl, publicUrl, uploadToken, cardId: card.id }
  }

  async confirmDropboxFile(
    handle: string,
    senderName: string,
    senderEmail: string | undefined,
    fileName: string,
    uploadToken: string,
  ) {
    const card = await this.resolveCard(handle)
    const upload = this.decodeUploadToken(uploadToken)
    if (upload.category !== 'dropbox' || upload.cardId !== card.id) {
      throw new BadRequestException('Upload token does not match this file upload')
    }
    return this.prisma.cardDropboxFile.create({
      data: {
        cardId: card.id,
        senderName,
        senderEmail,
        fileName,
        fileUrl: upload.publicUrl,
        mimeType: upload.contentType,
        fileSize: upload.fileSizeBytes,
      },
      select: { id: true, createdAt: true },
    })
  }

  async getDropboxFiles(cardId: string, userId: string, cursor?: string, limit = 30) {
    await this.assertCardOwner(cardId, userId)
    const items = await this.prisma.cardDropboxFile.findMany({
      where: { cardId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    })
    const hasMore = items.length > limit
    return {
      items: items.slice(0, limit),
      hasMore,
      nextCursor: hasMore ? items[limit - 1]?.id : null,
    }
  }

  async markDropboxFileRead(id: string, userId: string) {
    const file = await this.prisma.cardDropboxFile.findUnique({
      where: { id },
      select: { cardId: true },
    })
    if (!file) throw new NotFoundException('File not found')
    await this.assertCardOwner(file.cardId, userId)
    return this.prisma.cardDropboxFile.update({
      where: { id },
      data: { read: true },
      select: { id: true, read: true },
    })
  }

  async deleteDropboxFile(id: string, userId: string) {
    const file = await this.prisma.cardDropboxFile.findUnique({
      where: { id },
      select: { cardId: true },
    })
    if (!file) throw new NotFoundException('File not found')
    await this.assertCardOwner(file.cardId, userId)
    await this.prisma.cardDropboxFile.delete({ where: { id } })
  }

  // ── Inbox summary (all cards for a user) ─────────────────────────────────────

  async getInboxSummary(userId: string) {
    // resolve internal user id
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ id: userId }, { supabaseId: userId }] },
      select: { id: true },
    })
    if (!user) throw new NotFoundException('User not found')

    const cards = await this.prisma.card.findMany({
      where: { userId: user.id },
      select: { id: true, handle: true, fields: true },
    })
    const cardIds = cards.map((c) => c.id)

    const [messages, voices, files] = await Promise.all([
      this.prisma.cardMessage.findMany({
        where: { cardId: { in: cardIds } },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          cardId: true,
          senderName: true,
          senderEmail: true,
          message: true,
          read: true,
          createdAt: true,
        },
      }),
      this.prisma.cardVoiceNote.findMany({
        where: { cardId: { in: cardIds } },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          cardId: true,
          senderName: true,
          senderEmail: true,
          audioUrl: true,
          durationSec: true,
          mimeType: true,
          fileSize: true,
          read: true,
          createdAt: true,
        },
      }),
      this.prisma.cardDropboxFile.findMany({
        where: { cardId: { in: cardIds } },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          cardId: true,
          senderName: true,
          senderEmail: true,
          fileName: true,
          fileUrl: true,
          mimeType: true,
          fileSize: true,
          read: true,
          createdAt: true,
        },
      }),
    ])

    const cardMap = Object.fromEntries(cards.map((c) => [c.id, c]))

    const enrich = <T extends { cardId: string }>(items: T[]) =>
      items.map((item) => ({ ...item, card: cardMap[item.cardId] ?? null }))

    return {
      messages: enrich(messages),
      voiceNotes: enrich(voices),
      dropboxFiles: enrich(files),
      unreadCount: {
        messages: messages.filter((m) => !m.read).length,
        voiceNotes: voices.filter((v) => !v.read).length,
        dropboxFiles: files.filter((f) => !f.read).length,
      },
    }
  }

  // ── Meeting Memories ──────────────────────────────────────────────────────────

  private async resolveUserId(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ id: userId }, { supabaseId: userId }] },
      select: { id: true },
    })
    if (!user) throw new NotFoundException('User not found')
    return user.id
  }

  private async assertContactOwner(contactId: string, userId: string) {
    const internalId = await this.resolveUserId(userId)
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, ownerUserId: internalId },
      select: { id: true },
    })
    if (!contact) throw new NotFoundException('Contact not found')
    return internalId
  }

  async getMemories(contactId: string, userId: string) {
    const internalId = await this.assertContactOwner(contactId, userId)
    return this.prisma.contactMemory.findMany({
      where: { contactId, ownerUserId: internalId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createMemory(contactId: string, userId: string, content: string) {
    const internalId = await this.assertContactOwner(contactId, userId)
    return this.prisma.contactMemory.create({
      data: { contactId, ownerUserId: internalId, content },
    })
  }

  async deleteMemory(id: string, userId: string) {
    const internalId = await this.resolveUserId(userId)
    const memory = await this.prisma.contactMemory.findFirst({
      where: { id, ownerUserId: internalId },
    })
    if (!memory) throw new NotFoundException('Memory not found')
    await this.prisma.contactMemory.delete({ where: { id } })
  }
}
