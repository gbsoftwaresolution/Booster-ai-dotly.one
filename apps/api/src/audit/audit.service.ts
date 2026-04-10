import { Injectable } from '@nestjs/common'
import { Prisma } from '@dotly/database'
import { PrismaService } from '../prisma/prisma.service'

export interface AuditLogParams {
  userId: string
  action: string
  resourceId?: string
  resourceType?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

/**
 * LOW-02: Strip characters that enable log injection / ANSI escape-sequence
 * attacks from caller-supplied strings before they reach the audit log.
 *
 * Specifically we strip:
 *  - CR (\r) and LF (\n) — prevent multi-line injection into log forwarders
 *    (e.g. Datadog, CloudWatch) that parse one line per event.
 *  - ESC (\x1b) — prevent ANSI terminal escape sequences that can overwrite
 *    prior log entries in a developer console or CI output.
 *
 * We truncate to 512 characters because User-Agent strings longer than that
 * are almost certainly attacker-supplied probing payloads, not real browsers.
 */
function sanitizeLogField(value: string | undefined, maxLen = 512): string | undefined {
  if (value === undefined) return undefined
  return value
    .replace(/[\r\n\x1b]/g, '') // strip CR, LF, ESC
    .slice(0, maxLen) // truncate to safe length
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: AuditLogParams): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        resource: params.resourceType ?? '',
        resourceId: params.resourceId,
        metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
        // LOW-02: sanitize before writing to DB / log forwarder
        ipAddress: sanitizeLogField(params.ipAddress, 45), // max IPv6 length = 45 chars
        userAgent: sanitizeLogField(params.userAgent, 512),
      },
    })
  }
}
