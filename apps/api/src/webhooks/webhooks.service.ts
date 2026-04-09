import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common'
import { Prisma } from '@dotly/database'
import { PrismaService } from '../prisma/prisma.service'
import { createHmac, randomBytes } from 'crypto'
import * as https from 'https'
import * as http from 'http'
import { URL } from 'url'
import * as dns from 'dns'
import * as net from 'net'

export const WEBHOOK_EVENTS = [
  'lead.created',
  'card.viewed',
  'card.click',
  'contact.created',
  'contact.updated',
  'contact.deleted',
  'contact.stage_changed',
  'contact.enriched',
  'contact.note_added',
  'contact.email_sent',
] as const

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]

export interface WebhookPayload {
  event: WebhookEvent
  createdAt: string
  data: Record<string, unknown>
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name)

  constructor(private readonly prisma: PrismaService) {}

  // ─── SSRF guard ──────────────────────────────────────────────────────────────

  /**
   * Resolve the webhook URL's hostname to an IP and reject any address that
   * falls inside RFC-1918 private ranges, loopback, link-local, or other
   * non-routable blocks.  Called on create(), update(), AND inside deliver()
   * to defeat DNS-rebinding attacks (where a hostname resolves differently at
   * delivery time than it did at registration time).
   */
  private async assertSafeWebhookUrl(url: string): Promise<void> {
    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      throw new BadRequestException('Invalid webhook URL')
    }

    const hostname = parsed.hostname
    // If the hostname is already an IP literal, validate it directly.
    // net.isIP returns 4, 6, or 0.
    const isIpLiteral = net.isIP(hostname) !== 0
    const addrs: string[] = isIpLiteral
      ? [hostname.replace(/^\[|\]$/g, '')] // strip IPv6 brackets
      : await new Promise<string[]>((resolve, reject) =>
          dns.resolve(hostname, (err, addresses) => {
            if (err) reject(new BadRequestException(`Cannot resolve webhook hostname: ${hostname}`))
            else resolve(addresses)
          }),
        )

    for (const addr of addrs) {
      if (this.isPrivateAddress(addr)) {
        throw new BadRequestException(
          'Webhook URL must not resolve to a private or reserved IP address',
        )
      }
    }
  }

  /** Returns true for loopback, RFC-1918, link-local, and other reserved ranges. */
  private isPrivateAddress(ip: string): boolean {
    // IPv6 loopback / link-local
    if (net.isIPv6(ip)) {
      const lower = ip.toLowerCase()
      if (lower === '::1') return true
      if (lower.startsWith('fe80:')) return true
      if (lower.startsWith('fc') || lower.startsWith('fd')) return true // ULA
      if (lower === '::' || lower === '0:0:0:0:0:0:0:1') return true
      return false
    }

    // IPv4
    const parts = ip.split('.').map(Number)
    if (parts.length !== 4) return false
    const a = parts[0] as number
    const b = parts[1] as number
    const c = parts[2] as number

    if (a === 10) return true // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12
    if (a === 192 && b === 168) return true // 192.168.0.0/16
    if (a === 127) return true // 127.0.0.0/8 loopback
    if (a === 169 && b === 254) return true // 169.254.0.0/16 link-local
    if (a === 0) return true // 0.0.0.0/8
    if (a === 100 && b >= 64 && b <= 127) return true // 100.64.0.0/10 CGNAT
    if (a === 192 && b === 0 && c === 0) return true // 192.0.0.0/24 IANA
    if (a === 198 && (b === 18 || b === 19)) return true // 198.18.0.0/15 benchmarking
    if (a === 240) return true // 240.0.0.0/4 reserved
    if (a === 255 && ip === '255.255.255.255') return true // broadcast
    return false
  }

  // ─── Ownership guard ─────────────────────────────────────────────────────────

  private async resolveUserId(rawId: string): Promise<string> {
    const u = await this.prisma.user.findFirst({
      where: { OR: [{ id: rawId }, { supabaseId: rawId }] },
      select: { id: true },
    })
    if (!u) throw new ForbiddenException('User not found')
    return u.id
  }

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  async create(userId: string, dto: { url: string; events: string[] }) {
    const internalId = await this.resolveUserId(userId)

    // Validate URL scheme — only HTTPS in production, allow HTTP in dev
    let parsed: URL
    try {
      parsed = new URL(dto.url)
    } catch {
      throw new BadRequestException('Invalid webhook URL')
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new BadRequestException('Webhook URL must use http or https')
    }
    if (parsed.protocol === 'http:' && process.env['NODE_ENV'] === 'production') {
      throw new BadRequestException(
        'Webhook URL must use HTTPS in production — HTTP URLs transmit payloads and ' +
          'signatures in plaintext and are not permitted.',
      )
    }

    // SSRF guard: resolve hostname and reject private/internal IP addresses
    await this.assertSafeWebhookUrl(dto.url)

    // Validate events
    const invalidEvents = dto.events.filter(
      (e) => !(WEBHOOK_EVENTS as readonly string[]).includes(e),
    )
    if (invalidEvents.length > 0) {
      throw new BadRequestException(`Unknown event types: ${invalidEvents.join(', ')}`)
    }

    // Cap per-user webhook endpoints
    const count = await this.prisma.webhookEndpoint.count({ where: { userId: internalId } })
    if (count >= 20) {
      throw new BadRequestException('Maximum of 20 webhook endpoints per account')
    }

    const secret = randomBytes(24).toString('hex')

    const endpoint = await this.prisma.webhookEndpoint.create({
      data: {
        userId: internalId,
        url: dto.url,
        events: dto.events,
        secret,
        enabled: true,
      },
    })

    return { ...endpoint, secret } // return raw secret only on creation
  }

  async findAll(userId: string) {
    const internalId = await this.resolveUserId(userId)
    return this.prisma.webhookEndpoint.findMany({
      where: { userId: internalId },
      include: { _count: { select: { deliveries: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  async update(
    userId: string,
    endpointId: string,
    dto: { url?: string; events?: string[]; enabled?: boolean },
  ) {
    const internalId = await this.resolveUserId(userId)
    const ep = await this.prisma.webhookEndpoint.findUnique({ where: { id: endpointId } })
    if (!ep || ep.userId !== internalId) throw new ForbiddenException('Not found')

    if (dto.events) {
      const invalid = dto.events.filter((e) => !(WEBHOOK_EVENTS as readonly string[]).includes(e))
      if (invalid.length)
        throw new BadRequestException(`Unknown event types: ${invalid.join(', ')}`)
    }

    // Validate URL on update too — identical rules as create().
    // Without this, an attacker could create a valid endpoint then patch the URL
    // to an arbitrary internal address (SSRF) since update() previously skipped
    // URL validation entirely.
    if (dto.url !== undefined) {
      let parsed: URL
      try {
        parsed = new URL(dto.url)
      } catch {
        throw new BadRequestException('Invalid webhook URL')
      }
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new BadRequestException('Webhook URL must use http or https')
      }
      if (parsed.protocol === 'http:' && process.env['NODE_ENV'] === 'production') {
        throw new BadRequestException(
          'Webhook URL must use HTTPS in production — HTTP URLs transmit payloads and ' +
            'signatures in plaintext and are not permitted.',
        )
      }
      // SSRF guard: resolve hostname and reject private/internal IP addresses
      await this.assertSafeWebhookUrl(dto.url)
    }

    return this.prisma.webhookEndpoint.update({
      where: { id: endpointId },
      data: {
        ...(dto.url !== undefined && { url: dto.url }),
        ...(dto.events !== undefined && { events: dto.events }),
        ...(dto.enabled !== undefined && { enabled: dto.enabled }),
      },
    })
  }

  async regenerateSecret(userId: string, endpointId: string) {
    const internalId = await this.resolveUserId(userId)
    const ep = await this.prisma.webhookEndpoint.findUnique({ where: { id: endpointId } })
    if (!ep || ep.userId !== internalId) throw new ForbiddenException('Not found')
    const secret = randomBytes(24).toString('hex')
    const updated = await this.prisma.webhookEndpoint.update({
      where: { id: endpointId },
      data: { secret },
    })
    return { ...updated, secret }
  }

  async delete(userId: string, endpointId: string) {
    const internalId = await this.resolveUserId(userId)
    const ep = await this.prisma.webhookEndpoint.findUnique({ where: { id: endpointId } })
    if (!ep || ep.userId !== internalId) throw new ForbiddenException('Not found')
    await this.prisma.webhookEndpoint.delete({ where: { id: endpointId } })
    return { deleted: true }
  }

  async getDeliveries(userId: string, endpointId: string) {
    const internalId = await this.resolveUserId(userId)
    const ep = await this.prisma.webhookEndpoint.findUnique({ where: { id: endpointId } })
    if (!ep || ep.userId !== internalId) throw new ForbiddenException('Not found')
    return this.prisma.webhookDelivery.findMany({
      where: { endpointId },
      orderBy: { deliveredAt: 'desc' },
      take: 50,
    })
  }

  // ─── Test fire ───────────────────────────────────────────────────────────────

  async testEndpoint(userId: string, endpointId: string) {
    const internalId = await this.resolveUserId(userId)
    const ep = await this.prisma.webhookEndpoint.findUnique({ where: { id: endpointId } })
    if (!ep || ep.userId !== internalId) throw new ForbiddenException('Not found')

    const payload: WebhookPayload = {
      event: 'lead.created',
      createdAt: new Date().toISOString(),
      data: {
        test: true,
        name: 'Jane Doe',
        email: 'jane@example.com',
        cardHandle: 'my-card',
      },
    }

    const result = await this.deliver(ep.id, ep.url, ep.secret, payload, true)
    return result
  }

  // ─── Fan-out: called by ContactsService / AnalyticsService ───────────────────

  /**
   * Find all enabled endpoints for a user that subscribe to the given event,
   * then fire-and-forget each delivery. Safe to call without await.
   */
  async fanOut(userId: string, event: WebhookEvent, data: Record<string, unknown>): Promise<void> {
    let endpoints: { id: string; url: string; secret: string }[]
    try {
      endpoints = await this.prisma.webhookEndpoint.findMany({
        where: { userId, enabled: true, events: { has: event } },
        select: { id: true, url: true, secret: true },
        take: 20,
      })
    } catch (err) {
      this.logger.warn(`webhooks.fanOut: DB error for userId=${userId} event=${event}`, err)
      return
    }

    if (endpoints.length === 0) return

    const payload: WebhookPayload = {
      event,
      createdAt: new Date().toISOString(),
      data,
    }

    for (const ep of endpoints) {
      void this.deliver(ep.id, ep.url, ep.secret, payload, false).catch((err: unknown) =>
        this.logger.warn(`webhook delivery failed endpoint=${ep.id}`, err),
      )
    }
  }

  // ─── Internal HTTP delivery ───────────────────────────────────────────────────

  private async deliver(
    endpointId: string,
    url: string,
    secret: string,
    payload: WebhookPayload,
    isTest: boolean,
  ) {
    const body = JSON.stringify(payload)
    const sig = createHmac('sha256', secret).update(body).digest('hex')
    const start = Date.now()

    let statusCode: number | null = null
    let responseBody = ''
    let success = false

    try {
      // SSRF guard at delivery time — defeats DNS-rebinding: a hostname that
      // resolved to a public IP at registration time could later resolve to an
      // internal IP.  Re-checking here ensures we never send an actual HTTP
      // request to a private address regardless of when the URL was saved.
      await this.assertSafeWebhookUrl(url)

      const parsed = new URL(url)
      const lib = parsed.protocol === 'https:' ? https : http
      const result = await new Promise<{ status: number; body: string }>((resolve, reject) => {
        const req = lib.request(
          {
            hostname: parsed.hostname,
            port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            path: parsed.pathname + parsed.search,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(body),
              'X-Dotly-Event': payload.event,
              'X-Dotly-Sig-256': `sha256=${sig}`,
              'X-Dotly-Delivery': randomBytes(8).toString('hex'),
              ...(isTest ? { 'X-Dotly-Test': '1' } : {}),
            },
            timeout: 10_000,
          },
          (res) => {
            let data = ''
            res.on('data', (c: Buffer) => {
              data += c.toString()
            })
            res.on('end', () => resolve({ status: res.statusCode ?? 0, body: data }))
          },
        )
        req.on('timeout', () => {
          req.destroy()
          reject(new Error('Request timed out'))
        })
        req.on('error', reject)
        req.write(body)
        req.end()
      })

      statusCode = result.status
      responseBody = result.body.slice(0, 2000)
      success = statusCode >= 200 && statusCode < 300
    } catch (err) {
      responseBody = (err as Error).message?.slice(0, 2000) ?? 'Unknown error'
    }

    const durationMs = Date.now() - start

    // Log delivery asynchronously — do not throw on DB failure
    void this.prisma.webhookDelivery
      .create({
        data: {
          endpointId,
          event: payload.event,
          payload: payload as unknown as Prisma.InputJsonValue,
          statusCode: statusCode ?? undefined,
          responseBody: responseBody || undefined,
          durationMs,
          success,
        },
      })
      .catch((e: unknown) => this.logger.warn('Failed to log webhook delivery', e))

    return { success, statusCode, durationMs, responseBody }
  }
}
