import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../prisma/prisma.service'
import { createSign } from 'crypto'

/**
 * WalletPassesService
 *
 * Generates Apple Wallet (.pkpass) and Google Wallet pass links on-demand
 * from a published card's data.
 *
 * Apple Wallet:
 *   Requires the following env vars:
 *     APPLE_PASS_TYPE_ID    e.g. pass.one.dotly.card
 *     APPLE_TEAM_ID         e.g. ABC123DEF4
 *     APPLE_PASS_CERT_P12   Base64-encoded .p12 certificate (from Apple Developer)
 *     APPLE_PASS_CERT_PASS  Passphrase for the .p12 file
 *
 * Google Wallet:
 *   Requires:
 *     GOOGLE_WALLET_ISSUER_ID    Numeric issuer ID from Google Pay & Wallet Console
 *     GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL
 *     GOOGLE_WALLET_SERVICE_ACCOUNT_KEY  Base64-encoded JSON key file
 *
 * If any of these are absent the endpoint throws 400 Bad Request.
 */
@Injectable()
export class WalletPassesService {
  private readonly logger = new Logger(WalletPassesService.name)
  private readonly webUrl: string

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const webUrlRaw = config.get<string>('WEB_URL') ?? 'https://dotly.one'
    this.webUrl = webUrlRaw.startsWith('http') ? webUrlRaw : `https://${webUrlRaw}`
  }

  private async getPublishedCardByHandle(handle: string) {
    const card = await this.prisma.card.findUnique({
      where: { handle, isActive: true },
      include: {
        theme: true,
        socialLinks: true,
        user: {
          select: {
            id: true,
            teamMemberships: {
              take: 1,
              orderBy: { joinedAt: 'asc' },
              include: { team: { select: { brandLock: true, brandConfig: true } } },
            },
          },
        },
      },
    })
    if (!card) throw new NotFoundException('Card not found')
    return card
  }

  private resolveEffectiveTheme(
    card:
      | Awaited<ReturnType<typeof this.getPublishedCardByHandle>>
      | Awaited<ReturnType<typeof this.assertCardOwnerAndFetch>>,
  ) {
    const firstMembership = 'user' in card ? card.user?.teamMemberships?.[0] : undefined
    const team = firstMembership?.team
    const cfg = ((team?.brandConfig ?? {}) as Record<string, unknown>) || {}
    const brandLock = team?.brandLock ?? false

    return {
      primaryColor:
        (brandLock ? (cfg['primaryColor'] as string | undefined) : undefined) ??
        card.theme?.primaryColor ??
        '#0ea5e9',
      secondaryColor:
        (brandLock ? (cfg['secondaryColor'] as string | undefined) : undefined) ??
        card.theme?.secondaryColor ??
        '#ffffff',
      logoUrl:
        (brandLock ? (cfg['logoUrl'] as string | undefined) : undefined) ??
        card.theme?.logoUrl ??
        null,
    }
  }

  private async assertPublicExportAllowed(handle: string, requestUserId: string | null) {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; vcardPolicy: string }>>`
      SELECT id, "vcardPolicy"
      FROM "Card"
      WHERE handle = ${handle}
        AND "isActive" = true
      LIMIT 1
    `
    const card = rows[0]
    if (!card) throw new NotFoundException('Card not found')
    if (card.vcardPolicy === 'MEMBERS_ONLY' && !requestUserId) {
      throw new ForbiddenException('Sign in to export this contact')
    }
    return card
  }

  // ─── Ownership guard ─────────────────────────────────────────────────────────

  private async assertCardOwnerAndFetch(cardId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ id: userId }, { supabaseId: userId }] },
      select: { id: true },
    })
    if (!user) throw new ForbiddenException('User not found')

    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      include: {
        theme: true,
        socialLinks: { orderBy: { displayOrder: 'asc' } },
        user: {
          select: {
            teamMemberships: {
              take: 1,
              orderBy: { joinedAt: 'asc' },
              include: { team: { select: { brandLock: true, brandConfig: true } } },
            },
          },
        },
      },
    })
    if (!card) throw new NotFoundException('Card not found')
    if (card.userId !== user.id) throw new ForbiddenException('Access denied')
    return card
  }

  // ─── Apple Wallet ─────────────────────────────────────────────────────────────

  async generateApplePass(cardId: string, userId: string): Promise<Buffer> {
    const card = await this.assertCardOwnerAndFetch(cardId, userId)
    return this.generateApplePassInternal(card)
  }

  private async generateApplePassBuffer(
    card:
      | Awaited<ReturnType<typeof this.assertCardOwnerAndFetch>>
      | Awaited<ReturnType<typeof this.getPublishedCardByHandle>>,
  ): Promise<Buffer> {
    const passTypeId = this.config.get<string>('APPLE_PASS_TYPE_ID')
    const teamId = this.config.get<string>('APPLE_TEAM_ID')
    const certB64 = this.config.get<string>('APPLE_PASS_CERT_P12')

    if (!passTypeId || !teamId || !certB64) {
      throw new BadRequestException(
        'Apple Wallet passes are not configured on this server. ' +
          'Set APPLE_PASS_TYPE_ID, APPLE_TEAM_ID, APPLE_PASS_CERT_P12, and APPLE_PASS_CERT_PASS.',
      )
    }

    const fields = card.fields as Record<string, string>
    const theme = this.resolveEffectiveTheme(card)

    const primaryColor = theme.primaryColor
    const secondaryColor = theme.secondaryColor
    const cardUrl = `${this.webUrl}/card/${card.handle}`

    // ── pass.json ───────────────────────────────────────────────────────────────
    const passJson = {
      formatVersion: 1,
      passTypeIdentifier: passTypeId,
      serialNumber: card.id,
      teamIdentifier: teamId,
      organizationName: fields['company'] || 'Dotly',
      description: `${fields['name'] || 'Digital Card'} — ${fields['title'] || ''}`.trim(),
      logoText: fields['company'] || '',
      foregroundColor: `rgb(${this.hexToRgb(secondaryColor)})`,
      backgroundColor: `rgb(${this.hexToRgb(primaryColor)})`,
      labelColor: `rgb(${this.hexToRgb(secondaryColor)}cc)`,
      barcodes: [
        {
          message: cardUrl,
          format: 'PKBarcodeFormatQR',
          messageEncoding: 'iso-8859-1',
          altText: card.handle,
        },
      ],
      generic: {
        primaryFields: [{ key: 'name', label: 'NAME', value: fields['name'] || '' }],
        secondaryFields: [
          { key: 'title', label: 'TITLE', value: fields['title'] || '' },
          { key: 'company', label: 'COMPANY', value: fields['company'] || '' },
        ],
        auxiliaryFields: [
          { key: 'email', label: 'EMAIL', value: fields['email'] || '' },
          { key: 'phone', label: 'PHONE', value: fields['phone'] || '' },
        ],
        backFields: [
          { key: 'website', label: 'WEBSITE', value: fields['website'] || '' },
          { key: 'bio', label: 'ABOUT', value: fields['bio'] || '' },
          {
            key: 'url',
            label: 'CARD URL',
            value: cardUrl,
            attributedValue: `<a href="${cardUrl}">${cardUrl}</a>`,
          },
        ],
      },
      webServiceURL: `${this.webUrl}/api`,
      authenticationToken: card.id.replace(/-/g, '').slice(0, 16),
    }

    // ── Build the .pkpass zip ───────────────────────────────────────────────────
    const passJsonBuf = Buffer.from(JSON.stringify(passJson, null, 2))

    // manifest.json: sha1 hashes of all files in the bundle
    const { createHash } = await import('crypto')
    const manifest: Record<string, string> = {
      'pass.json': createHash('sha1').update(passJsonBuf).digest('hex'),
    }

    const manifestBuf = Buffer.from(JSON.stringify(manifest))

    // Signature — sign manifest with Apple certificate
    // In production this requires the actual .p12 → PEM conversion pipeline.
    // We generate a placeholder signature buffer here that proves the structure
    // is correct; replace with real p12→sign pipeline once Apple certs are set up.
    const sigBuf = await this.signManifest(
      manifestBuf,
      certB64,
      this.config.get<string>('APPLE_PASS_CERT_PASS') ?? '',
    )

    // Pack into a zip
    const pkpassBuf = await this.buildZip({
      'pass.json': passJsonBuf,
      'manifest.json': manifestBuf,
      signature: sigBuf,
    })

    return pkpassBuf
  }

  // ─── Google Wallet ─────────────────────────────────────────────────────────

  async generateGooglePassUrl(cardId: string, userId: string): Promise<string> {
    const issuerId = this.config.get<string>('GOOGLE_WALLET_ISSUER_ID')
    const saEmail = this.config.get<string>('GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL')
    const saKeyB64 = this.config.get<string>('GOOGLE_WALLET_SERVICE_ACCOUNT_KEY')

    if (!issuerId || !saEmail || !saKeyB64) {
      throw new BadRequestException(
        'Google Wallet passes are not configured on this server. ' +
          'Set GOOGLE_WALLET_ISSUER_ID, GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL, and GOOGLE_WALLET_SERVICE_ACCOUNT_KEY.',
      )
    }

    const card = await this.assertCardOwnerAndFetch(cardId, userId)
    const fields = card.fields as Record<string, string>
    const cardUrl = `${this.webUrl}/card/${card.handle}`
    const theme = this.resolveEffectiveTheme(
      card as Awaited<ReturnType<typeof this.assertCardOwnerAndFetch>>,
    )

    const objectId = `${issuerId}.dotly-${card.id.replace(/-/g, '')}`
    const classId = `${issuerId}.dotly-business-card`

    // Google Wallet "Generic" pass object payload
    const passObject = {
      id: objectId,
      classId,
      genericType: 'GENERIC_TYPE_UNSPECIFIED',
      cardTitle: {
        defaultValue: { language: 'en-US', value: fields['name'] || 'Digital Business Card' },
      },
      subheader: {
        defaultValue: { language: 'en-US', value: fields['title'] || '' },
      },
      header: {
        defaultValue: { language: 'en-US', value: fields['company'] || 'Dotly' },
      },
      hexBackgroundColor: theme.primaryColor,
      textModulesData: [
        { id: 'email', header: 'Email', body: fields['email'] || '' },
        { id: 'phone', header: 'Phone', body: fields['phone'] || '' },
        { id: 'website', header: 'Website', body: fields['website'] || '' },
      ].filter((m) => m.body),
      linksModuleData: {
        uris: [{ uri: cardUrl, description: 'View digital card', id: 'card-url' }],
      },
      barcode: {
        type: 'QR_CODE',
        value: cardUrl,
        alternateText: card.handle,
      },
      state: 'ACTIVE',
    }

    // Sign a JWT that Google Wallet can verify to "Save to Google Wallet"
    const saKeyJson = JSON.parse(Buffer.from(saKeyB64, 'base64').toString('utf-8')) as Record<
      string,
      string
    >

    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
    const now = Math.floor(Date.now() / 1000)
    const claimsObj = {
      iss: saEmail,
      sub: saEmail,
      aud: 'google',
      iat: now,
      exp: now + 3600,
      typ: 'savetowallet',
      payload: {
        genericObjects: [passObject],
      },
    }
    const claims = Buffer.from(JSON.stringify(claimsObj)).toString('base64url')
    const signingInput = `${header}.${claims}`

    const sign = createSign('RSA-SHA256')
    sign.update(signingInput)
    const privateKey = saKeyJson['private_key'] ?? ''
    const signature = sign.sign(privateKey, 'base64url')

    const jwt = `${signingInput}.${signature}`
    const saveUrl = `https://pay.google.com/gp/v/save/${jwt}`

    return saveUrl
  }

  // ─── Public pass endpoints (no auth — for Apple's web service callback) ──────

  async getPublicPassForHandle(handle: string, requestUserId: string | null): Promise<Buffer> {
    await this.assertPublicExportAllowed(handle, requestUserId)
    const card = await this.getPublishedCardByHandle(handle)
    return this.generateApplePassBuffer(card)
  }

  async getPublicGooglePassUrlForHandle(
    handle: string,
    requestUserId: string | null,
  ): Promise<string> {
    await this.assertPublicExportAllowed(handle, requestUserId)
    const card = await this.getPublishedCardByHandle(handle)
    return this.generateGooglePassUrl(card.id, card.user.id)
  }

  // ─── Internals ───────────────────────────────────────────────────────────────

  private async generateApplePassInternal(
    card: Awaited<ReturnType<typeof this.assertCardOwnerAndFetch>>,
  ): Promise<Buffer> {
    const passTypeId = this.config.get<string>('APPLE_PASS_TYPE_ID')
    const teamId = this.config.get<string>('APPLE_TEAM_ID')
    const certB64 = this.config.get<string>('APPLE_PASS_CERT_P12')

    if (!passTypeId || !teamId || !certB64) {
      throw new BadRequestException('Apple Wallet passes are not configured on this server.')
    }
    return this.generateApplePassBuffer(card)
  }

  /** Sign the manifest buffer using the Apple-provided certificate. */
  private async signManifest(
    manifest: Buffer,
    certB64: string,
    passphrase: string,
  ): Promise<Buffer> {
    // Full implementation requires @pkitools/node-forge or node-pkcs12 to unwrap the .p12.
    // We emit the signature placeholder that Apple's validator tool will reject with a clear
    // error message until the developer sets up their real Apple certificate.
    // Replace this entire block with real p12→PEM→sign logic once certs are enrolled.
    try {
      const certDer = Buffer.from(certB64, 'base64')
      // Attempt to produce a DER-encoded CMS signature
      const sign = createSign('SHA1')
      sign.update(manifest)
      // This will fail without a real RSA key — caught below
      const sigHex = sign.sign({ key: certDer.toString(), passphrase }, 'hex')
      return Buffer.from(sigHex, 'hex')
    } catch {
      this.logger.warn('Apple pass signing failed — no valid certificate available.')
      throw new BadRequestException('Apple Wallet passes are temporarily unavailable')
    }
  }

  /** Pack files into a zip Buffer using Node built-ins only (no archiver dep). */
  private buildZip(files: Record<string, Buffer>): Promise<Buffer> {
    // Minimal ZIP format: each file stored as STORED (no compression).
    // pkpass spec allows any compression but STORED is universally supported.
    const parts: Buffer[] = []
    const centralDir: Buffer[] = []
    let offset = 0

    for (const [name, data] of Object.entries(files)) {
      const nameBuf = Buffer.from(name, 'utf-8')
      const crc32 = this.crc32(data)
      const size = data.length

      // Local file header
      const localHeader = Buffer.alloc(30 + nameBuf.length)
      localHeader.writeUInt32LE(0x04034b50, 0) // signature
      localHeader.writeUInt16LE(20, 4) // version needed
      localHeader.writeUInt16LE(0, 6) // flags
      localHeader.writeUInt16LE(0, 8) // compression (STORED)
      localHeader.writeUInt16LE(0, 10) // mod time
      localHeader.writeUInt16LE(0, 12) // mod date
      localHeader.writeUInt32LE(crc32, 14) // CRC-32
      localHeader.writeUInt32LE(size, 18) // compressed size
      localHeader.writeUInt32LE(size, 22) // uncompressed size
      localHeader.writeUInt16LE(nameBuf.length, 26) // name length
      localHeader.writeUInt16LE(0, 28) // extra length
      nameBuf.copy(localHeader, 30)

      // Central directory entry
      const cdEntry = Buffer.alloc(46 + nameBuf.length)
      cdEntry.writeUInt32LE(0x02014b50, 0) // signature
      cdEntry.writeUInt16LE(20, 4) // version made by
      cdEntry.writeUInt16LE(20, 6) // version needed
      cdEntry.writeUInt16LE(0, 8) // flags
      cdEntry.writeUInt16LE(0, 10) // compression
      cdEntry.writeUInt16LE(0, 12) // mod time
      cdEntry.writeUInt16LE(0, 14) // mod date
      cdEntry.writeUInt32LE(crc32, 16) // CRC-32
      cdEntry.writeUInt32LE(size, 20) // compressed size
      cdEntry.writeUInt32LE(size, 24) // uncompressed size
      cdEntry.writeUInt16LE(nameBuf.length, 28) // name length
      cdEntry.writeUInt16LE(0, 30) // extra length
      cdEntry.writeUInt16LE(0, 32) // comment length
      cdEntry.writeUInt16LE(0, 34) // disk start
      cdEntry.writeUInt16LE(0, 36) // int attributes
      cdEntry.writeUInt32LE(0, 38) // ext attributes
      cdEntry.writeUInt32LE(offset, 42) // local header offset
      nameBuf.copy(cdEntry, 46)

      parts.push(localHeader, data)
      centralDir.push(cdEntry)
      offset += localHeader.length + data.length
    }

    const cdBuf = Buffer.concat(centralDir)
    const cdSize = cdBuf.length
    const cdOffset = offset
    const numEntries = centralDir.length

    // End of central directory record
    const eocd = Buffer.alloc(22)
    eocd.writeUInt32LE(0x06054b50, 0) // signature
    eocd.writeUInt16LE(0, 4) // disk number
    eocd.writeUInt16LE(0, 6) // disk with cd start
    eocd.writeUInt16LE(numEntries, 8) // entries on this disk
    eocd.writeUInt16LE(numEntries, 10) // total entries
    eocd.writeUInt32LE(cdSize, 12) // central dir size
    eocd.writeUInt32LE(cdOffset, 16) // central dir offset
    eocd.writeUInt16LE(0, 20) // comment length

    return Promise.resolve(Buffer.concat([...parts, cdBuf, eocd]))
  }

  /** CRC-32 implementation (ZIP spec). */
  private crc32(buf: Buffer): number {
    const table = this.makeCrcTable()
    let crc = 0xffffffff
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]!) & 0xff]!
    }
    return (crc ^ 0xffffffff) >>> 0
  }

  private _crcTable: number[] | null = null
  private makeCrcTable(): number[] {
    if (this._crcTable) return this._crcTable
    const table: number[] = []
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      }
      table[n] = c
    }
    this._crcTable = table
    return table
  }

  /** Convert hex color to "r, g, b" string for Apple pass JSON */
  private hexToRgb(hex: string): string {
    const clean = hex.replace(/^#/, '')
    const full =
      clean.length === 3
        ? clean
            .split('')
            .map((c) => c + c)
            .join('')
        : clean
    const r = parseInt(full.slice(0, 2), 16)
    const g = parseInt(full.slice(2, 4), 16)
    const b = parseInt(full.slice(4, 6), 16)
    return `${r}, ${g}, ${b}`
  }
}
