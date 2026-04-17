import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import FormData from 'form-data'
import Mailgun from 'mailgun.js'
import { SESClient, SendEmailCommand, SendRawEmailCommand } from '@aws-sdk/client-ses'

export interface EmailAttachment {
  filename: string
  data: Buffer
  contentType: string
}

export interface EmailPayload {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
  attachments?: EmailAttachment[]
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)
  private mailgunClient: ReturnType<Mailgun['client']> | null = null
  private mailgunDomain: string | null = null
  private sesClient: SESClient | null = null
  private readonly fromEmail: string
  private readonly webUrl: string

  constructor(private readonly config: ConfigService) {
    // M-4: Use getOrThrow so a missing WEB_URL fails at startup rather than
    // silently producing broken email links that point to localhost in production.
    // WEB_URL is already validated in main.ts (process.exit if absent), so this
    // is a belt-and-suspenders check at the service level.
    this.webUrl = config.getOrThrow<string>('WEB_URL')
    this.fromEmail =
      config.get<string>('MAILGUN_FROM_EMAIL') ||
      config.get<string>('AWS_SES_FROM_EMAIL') ||
      'noreply@dotly.one'

    // Initialize Mailgun
    const mailgunKey = config.get<string>('MAILGUN_API_KEY')
    const mailgunDomain = config.get<string>('MAILGUN_DOMAIN')
    if (mailgunKey && mailgunDomain) {
      const mg = new Mailgun(FormData)
      this.mailgunClient = mg.client({ username: 'api', key: mailgunKey })
      this.mailgunDomain = mailgunDomain
      this.logger.log('Mailgun initialized')
    }

    // Initialize SES fallback
    const sesAccessKey = config.get<string>('AWS_SES_ACCESS_KEY')
    const sesSecretKey = config.get<string>('AWS_SES_SECRET_KEY')
    if (sesAccessKey && sesSecretKey) {
      this.sesClient = new SESClient({
        region: config.get<string>('AWS_SES_REGION') ?? 'us-east-1',
        credentials: {
          accessKeyId: sesAccessKey,
          secretAccessKey: sesSecretKey,
        },
      })
      this.logger.log('Amazon SES initialized as fallback')
    }
  }

  private formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error)
  }

  async send(payload: EmailPayload): Promise<boolean> {
    // Try Mailgun first
    if (this.mailgunClient && this.mailgunDomain) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const msg: any = {
          from: payload.from || this.fromEmail,
          to: [payload.to],
          subject: payload.subject,
          html: payload.html,
          text: payload.text || payload.html.replace(/<[^>]+>/g, ''),
        }
        if (payload.attachments?.length) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          msg.attachment = payload.attachments.map((a) => ({
            filename: a.filename,
            data: a.data,
            contentType: a.contentType,
          }))
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        await this.mailgunClient.messages.create(this.mailgunDomain, msg)
        // MED-05: Log only the domain part of the address (mask local-part) to
        // avoid recording PII (email addresses) in log aggregators where it may be
        // accessible to staff without data-access rights or retained beyond the
        // privacy-policy period.
        const maskedTo = payload.to.replace(/^[^@]+/, '***')
        this.logger.log(`Email sent via Mailgun to ${maskedTo}`)
        return true
      } catch (err) {
        this.logger.warn(`Mailgun failed, trying SES fallback: ${this.formatError(err)}`)
      }
    }

    // SES fallback
    if (this.sesClient) {
      try {
        if (payload.attachments?.length) {
          // HIGH-3: SendEmailCommand does not support attachments. Build a raw
          // MIME multipart/mixed message and use SendRawEmailCommand instead.
          const boundary = `_dotly_${Date.now().toString(36)}`
          const from = payload.from || this.fromEmail
          const textBody = payload.text || payload.html.replace(/<[^>]+>/g, '')

          const lines: string[] = [
            `From: ${from}`,
            `To: ${payload.to}`,
            `Subject: ${payload.subject}`,
            'MIME-Version: 1.0',
            `Content-Type: multipart/mixed; boundary="${boundary}"`,
            '',
            `--${boundary}`,
            'Content-Type: multipart/alternative; boundary="alt_' + boundary + '"',
            '',
            `--alt_${boundary}`,
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: quoted-printable',
            '',
            textBody,
            '',
            `--alt_${boundary}`,
            'Content-Type: text/html; charset=UTF-8',
            'Content-Transfer-Encoding: quoted-printable',
            '',
            payload.html,
            '',
            `--alt_${boundary}--`,
          ]

          for (const att of payload.attachments) {
            lines.push(`--${boundary}`)
            lines.push(`Content-Type: ${att.contentType}; name="${att.filename}"`)
            lines.push('Content-Transfer-Encoding: base64')
            lines.push(`Content-Disposition: attachment; filename="${att.filename}"`)
            lines.push('')
            // RFC 2045: base64 lines must be ≤ 76 chars
            const b64 = att.data.toString('base64')
            for (let i = 0; i < b64.length; i += 76) {
              lines.push(b64.slice(i, i + 76))
            }
            lines.push('')
          }

          lines.push(`--${boundary}--`)

          const rawMessage = lines.join('\r\n')
          await this.sesClient.send(
            new SendRawEmailCommand({
              RawMessage: { Data: Buffer.from(rawMessage, 'utf8') },
            }),
          )
        } else {
          await this.sesClient.send(
            new SendEmailCommand({
              Source: payload.from || this.fromEmail,
              Destination: { ToAddresses: [payload.to] },
              Message: {
                Subject: { Data: payload.subject, Charset: 'UTF-8' },
                Body: {
                  Html: { Data: payload.html, Charset: 'UTF-8' },
                  Text: {
                    Data: payload.text || payload.html.replace(/<[^>]+>/g, ''),
                    Charset: 'UTF-8',
                  },
                },
              },
            }),
          )
        }
        this.logger.log(`Email sent via SES to ${payload.to.replace(/^[^@]+/, '***')}`)
        return true
      } catch (err) {
        this.logger.error(`SES also failed: ${this.formatError(err)}`)
      }
    }

    this.logger.warn(
      `No email provider configured — email to ${payload.to.replace(/^[^@]+/, '***')} not sent`,
    )
    return false
  }

  // ---- Specific email methods ----

  /**
   * H-04: Strip CR and LF characters from a string before using it as an
   * email subject line.  Without this, an attacker who controls part of the
   * subject (e.g. the card name or inviter name) can inject additional
   * headers (Subject, CC, BCC) via HTTP header injection / email header
   * injection (CWE-93).  This helper must be applied to every value
   * interpolated into a `subject:` field.
   */
  private stripCrLf(s: string): string {
    return s.replace(/[\r\n]/g, '')
  }

  private escHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
  }

  async sendNewLeadNotification(
    to: string,
    leadName: string,
    cardName: string,
    _cardHandle: string,
    leadEmail?: string,
    leadPhone?: string,
  ): Promise<boolean> {
    const safeName = this.escHtml(leadName)
    const safeCard = this.escHtml(cardName)
    // LOW-03: Validate that leadEmail is actually an RFC-5322 email address
    // before using it inside a mailto: URI attribute.  escHtml only HTML-encodes
    // special characters but does not prevent a value like
    // `javascript:alert(1)` from becoming href="mailto:javascript:alert(1)"
    // which some mail clients treat as a clickable link.
    // We apply a strict allowlist regex: if the value does not look like a real
    // email address we simply omit the mailto link rather than risking injection.
    const EMAIL_RE =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    const safeEmail = leadEmail && EMAIL_RE.test(leadEmail) ? this.escHtml(leadEmail) : null
    const safePhone = leadPhone ? this.escHtml(leadPhone) : null
    return this.send({
      to,
      subject: this.stripCrLf(`New lead from your card: ${safeCard}`),
      html: `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h2 style="color:#0ea5e9">You have a new connection!</h2>
          <p><strong>${safeName}</strong> connected with your card <em>${safeCard}</em>.</p>
          ${safeEmail ? `<p>Email: <a href="mailto:${safeEmail}">${safeEmail}</a></p>` : ''}
          ${safePhone ? `<p>Phone: ${safePhone}</p>` : ''}
          <a href="${this.webUrl}/contacts" style="display:inline-block;padding:12px 24px;background:#0ea5e9;color:white;text-decoration:none;border-radius:8px;margin-top:16px">View in CRM</a>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px">Dotly.one — Tap. Share. Convert.</p>
        </div>
      `,
    })
  }

  async sendWelcomeEmail(to: string, name: string): Promise<boolean> {
    const safeName = this.escHtml(name || 'there')
    return this.send({
      to,
      subject: 'Welcome to Dotly.one — Create your first card',
      html: `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h1 style="color:#0ea5e9">Welcome to Dotly.one!</h1>
          <p>Hi ${safeName},</p>
          <p>You're all set. Complete onboarding and create your first digital business card in minutes.</p>
          <a href="${this.webUrl}/onboarding" style="display:inline-block;padding:12px 24px;background:#0ea5e9;color:white;text-decoration:none;border-radius:8px;margin-top:16px">Finish setup →</a>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px">Dotly.one — Tap. Share. Convert.</p>
        </div>
      `,
    })
  }

  async sendEmailVerificationEmail(
    to: string,
    name: string,
    verificationUrl: string,
  ): Promise<boolean> {
    const safeName = this.escHtml(name || 'there')
    const safeUrl = this.escHtml(verificationUrl)
    return this.send({
      to,
      subject: 'Verify your Dotly email address',
      html: `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h1 style="color:#0ea5e9">Verify your email</h1>
          <p>Hi ${safeName},</p>
          <p>Please confirm your email address to secure your Dotly account.</p>
          <a href="${safeUrl}" style="display:inline-block;padding:12px 24px;background:#0ea5e9;color:white;text-decoration:none;border-radius:8px;margin-top:16px">Verify email</a>
          <p style="color:#64748b;font-size:13px;margin-top:24px">This link expires in 1 hour.</p>
        </div>
      `,
      text: `Verify your Dotly email address: ${verificationUrl}`,
    })
  }

  async sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
    const safeUrl = this.escHtml(resetUrl)
    return this.send({
      to,
      subject: 'Reset your Dotly password',
      html: `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h1 style="color:#0ea5e9">Reset your password</h1>
          <p>Use the link below to choose a new password for your Dotly account.</p>
          <a href="${safeUrl}" style="display:inline-block;padding:12px 24px;background:#0ea5e9;color:white;text-decoration:none;border-radius:8px;margin-top:16px">Reset password</a>
          <p style="color:#64748b;font-size:13px;margin-top:24px">This link expires in 1 hour.</p>
        </div>
      `,
      text: `Reset your Dotly password: ${resetUrl}`,
    })
  }

  async sendPasswordChangedEmail(to: string, name: string): Promise<boolean> {
    const safeName = this.escHtml(name || 'there')
    return this.send({
      to,
      subject: 'Your Dotly password was changed',
      html: `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h1 style="color:#0ea5e9">Password changed</h1>
          <p>Hi ${safeName},</p>
          <p>Your Dotly account password was changed successfully.</p>
          <p>If this was not you, reset your password immediately and contact support.</p>
        </div>
      `,
      text: 'Your Dotly account password was changed successfully. If this was not you, reset your password immediately and contact support.',
    })
  }

  async sendEmailChangeVerificationEmail(
    to: string,
    name: string,
    verificationUrl: string,
  ): Promise<boolean> {
    const safeName = this.escHtml(name || 'there')
    const safeUrl = this.escHtml(verificationUrl)
    return this.send({
      to,
      subject: 'Confirm your new Dotly email address',
      html: `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h1 style="color:#0ea5e9">Confirm your new email</h1>
          <p>Hi ${safeName},</p>
          <p>Use the link below to confirm this email address for your Dotly account.</p>
          <a href="${safeUrl}" style="display:inline-block;padding:12px 24px;background:#0ea5e9;color:white;text-decoration:none;border-radius:8px;margin-top:16px">Confirm new email</a>
          <p style="color:#64748b;font-size:13px;margin-top:24px">This link expires in 1 hour.</p>
        </div>
      `,
      text: `Confirm your new Dotly email address: ${verificationUrl}`,
    })
  }

  async sendEmailChangeAlertEmail(to: string, name: string, newEmail: string): Promise<boolean> {
    const safeName = this.escHtml(name || 'there')
    const safeEmail = this.escHtml(newEmail)
    return this.send({
      to,
      subject: 'A Dotly email change was requested',
      html: `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h1 style="color:#0ea5e9">Email change requested</h1>
          <p>Hi ${safeName},</p>
          <p>A request was made to change your Dotly account email to <strong>${safeEmail}</strong>.</p>
          <p>If this was not you, reset your password immediately and contact support.</p>
        </div>
      `,
      text: `A request was made to change your Dotly account email to ${newEmail}. If this was not you, reset your password immediately and contact support.`,
    })
  }

  async sendEmailChangedConfirmationEmail(to: string, name: string): Promise<boolean> {
    const safeName = this.escHtml(name || 'there')
    return this.send({
      to,
      subject: 'Your Dotly email address was changed',
      html: `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h1 style="color:#0ea5e9">Email updated</h1>
          <p>Hi ${safeName},</p>
          <p>Your Dotly account email address was updated successfully.</p>
        </div>
      `,
      text: 'Your Dotly account email address was updated successfully.',
    })
  }

  async sendPlanUpgradeEmail(to: string, name: string, newPlan: string): Promise<boolean> {
    const safeName = this.escHtml(name || 'there')
    const safePlan = this.escHtml(newPlan)
    return this.send({
      to,
      subject: this.stripCrLf(`Your plan has been upgraded to ${safePlan}`),
      html: `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h2 style="color:#0ea5e9">Plan Upgraded!</h2>
          <p>Hi ${safeName}, your Dotly.one plan has been upgraded to <strong>${safePlan}</strong>.</p>
          <p>All ${safePlan} features are now available on your account.</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px">Dotly.one — Tap. Share. Convert.</p>
        </div>
      `,
    })
  }

  async sendPlanCancelledEmail(to: string, name: string, expiresAt: Date): Promise<boolean> {
    const safeName = this.escHtml(name || 'there')
    return this.send({
      to,
      subject: 'Your Dotly.one subscription has been cancelled',
      html: `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h2>Subscription Cancelled</h2>
          <p>Hi ${safeName}, your subscription has been cancelled. You'll retain access until ${expiresAt.toDateString()}.</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px">Dotly.one — Tap. Share. Convert.</p>
        </div>
      `,
    })
  }

  async sendRefundReviewRequestNotification(params: {
    to: string
    userId: string
    userEmail: string
    userName: string | null
    plan: string
    paymentId: string
    txHash: string
    refundUntil: string | null
  }): Promise<boolean> {
    const safeName = this.escHtml(params.userName || 'Unknown')
    const safeEmail = this.escHtml(params.userEmail)
    const safePlan = this.escHtml(params.plan)
    const safePaymentId = this.escHtml(params.paymentId)
    const safeTxHash = this.escHtml(params.txHash)
    const safeRefundUntil = this.escHtml(params.refundUntil || 'Unknown')
    const safeUserId = this.escHtml(params.userId)
    const internalUrl = `${this.webUrl}/internal/support/refunds`

    return this.send({
      to: params.to,
      subject: this.stripCrLf(`Refund review requested for ${params.userEmail}`),
      html: `
        <div style="font-family:Inter,sans-serif;max-width:680px;margin:0 auto;padding:24px">
          <h2 style="margin:0 0 16px;color:#111827">Refund review requested</h2>
          <p style="margin:0 0 16px;color:#374151">
            A manual refund review was requested for a paid Dotly subscription.
          </p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f9fafb;border-radius:12px;overflow:hidden">
            <tr><td style="padding:10px 14px;font-weight:600">User</td><td style="padding:10px 14px">${safeName}</td></tr>
            <tr><td style="padding:10px 14px;font-weight:600">Email</td><td style="padding:10px 14px">${safeEmail}</td></tr>
            <tr><td style="padding:10px 14px;font-weight:600">User ID</td><td style="padding:10px 14px">${safeUserId}</td></tr>
            <tr><td style="padding:10px 14px;font-weight:600">Plan</td><td style="padding:10px 14px">${safePlan}</td></tr>
            <tr><td style="padding:10px 14px;font-weight:600">Payment ID</td><td style="padding:10px 14px">${safePaymentId}</td></tr>
            <tr><td style="padding:10px 14px;font-weight:600">Tx Hash</td><td style="padding:10px 14px">${safeTxHash}</td></tr>
            <tr><td style="padding:10px 14px;font-weight:600">Refund window</td><td style="padding:10px 14px">${safeRefundUntil}</td></tr>
          </table>
          <p style="margin:20px 0 0">
            <a href="${this.escHtml(internalUrl)}" style="display:inline-block;padding:12px 20px;background:#111827;color:#ffffff;text-decoration:none;border-radius:10px">
              Open support refund queue
            </a>
          </p>
        </div>
      `,
    })
  }

  async sendTeamInvite(
    to: string,
    teamName: string,
    inviterName: string,
    inviteLink: string,
  ): Promise<boolean> {
    const safeTeam = this.escHtml(teamName)
    const safeInviter = this.escHtml(inviterName)
    // LOW-04: escHtml the inviteLink before embedding it in an href attribute.
    // Without this, a caller who passes a link containing `"` or `>` characters
    // (e.g. a malformed token containing HTML meta-characters) can break out of
    // the attribute and inject arbitrary HTML / JavaScript into the email body.
    // Real invite links are HTTPS URLs that do not contain these characters, so
    // escaping is a no-op for legitimate values.
    const safeLink = this.escHtml(inviteLink)
    return this.send({
      to,
      subject: this.stripCrLf(`${safeInviter} invited you to join ${safeTeam} on Dotly.one`),
      html: `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h2 style="color:#0ea5e9">You're invited!</h2>
          <p><strong>${safeInviter}</strong> has invited you to join the <strong>${safeTeam}</strong> team on Dotly.one.</p>
          <a href="${safeLink}" style="display:inline-block;padding:12px 24px;background:#0ea5e9;color:white;text-decoration:none;border-radius:8px;margin-top:16px">Accept Invitation</a>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px">Dotly.one — Tap. Share. Convert.</p>
        </div>
      `,
    })
  }

  /**
   * Builds an RFC 5545 iCalendar (.ics) string for a booking.
   *
   * RFC 5545 compliance:
   * - SUMMARY/DESCRIPTION/LOCATION: escape \, ; and ,; fold long values
   * - ORGANIZER/ATTENDEE CN: must be DQUOTE-quoted when the value contains
   *   any character other than ALPHA/DIGIT/a handful of safe symbols.
   * - Lines longer than 75 octets must be folded with CRLF + SPACE.
   */
  private buildIcs(
    booking: { startAt: Date; endAt: Date; guestName: string; guestEmail: string; token: string },
    apt: { name: string; description?: string | null; location?: string | null },
    owner: { name: string | null; email: string },
  ): Buffer {
    const fmt = (d: Date) =>
      d
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}/, '')

    // Fold a single property line at 75 octets (RFC 5545 §3.1)
    const foldLine = (line: string): string => {
      const octets = Buffer.from(line, 'utf8')
      if (octets.length <= 75) return line
      const parts: string[] = []
      let pos = 0
      // First chunk: 75 octets
      while (pos < octets.length) {
        const chunkSize = pos === 0 ? 75 : 74 // continuation lines start with a space (1 octet)
        let end = pos + chunkSize
        // Don't split in the middle of a multi-byte UTF-8 sequence
        while (end < octets.length && (octets[end]! & 0xc0) === 0x80) end--
        parts.push(octets.slice(pos, end).toString('utf8'))
        pos = end
      }
      return parts.join('\r\n ')
    }

    // Escape text values per RFC 5545 §3.3.11
    const escText = (s: string) =>
      s
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '')

    // Quote a CN parameter value (RFC 5545 §3.2): always quote to be safe
    const quoteCn = (s: string) => '"' + s.replace(/[\r\n"]/g, ' ').trim() + '"'

    const uid = `booking-${booking.token}@dotly.one`
    const now = fmt(new Date())
    const organizerName = quoteCn(owner.name ?? 'Dotly')
    const attendeeName = quoteCn(booking.guestName)

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Dotly.one//Scheduling//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${now}Z`,
      `DTSTART:${fmt(booking.startAt)}Z`,
      `DTEND:${fmt(booking.endAt)}Z`,
      `SUMMARY:${escText(apt.name ?? '')}`,
      apt.description ? `DESCRIPTION:${escText(apt.description)}` : '',
      apt.location ? `LOCATION:${escText(apt.location)}` : '',
      `ORGANIZER;CN=${organizerName}:mailto:${owner.email}`,
      `ATTENDEE;CN=${attendeeName};RSVP=TRUE:mailto:${booking.guestEmail}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ]
      .filter(Boolean)
      .map(foldLine)
      .join('\r\n')

    return Buffer.from(lines, 'utf8')
  }

  /**
   * Sent to the guest after a booking is confirmed.
   * Includes booking details, a cancellation link, a reschedule link, and an .ics attachment.
   * FIX-3/4: Show times in the appointment type's timezone so the guest sees the
   * correct local time matching what they saw on the booking page.
   */
  async sendBookingConfirmationToGuest(
    booking: { guestName: string; guestEmail: string; startAt: Date; endAt: Date; token: string },
    apt: {
      name: string
      durationMins: number
      location?: string | null
      description?: string | null
      timezone?: string | null
    },
    owner: { name: string | null; email: string },
  ): Promise<boolean> {
    const safeName = this.escHtml(booking.guestName)
    const safeApt = this.escHtml(apt.name)
    const safeOwner = this.escHtml(owner.name ?? 'Your host')
    const safeLocation = apt.location ? this.escHtml(apt.location) : null
    const cancelUrl = this.escHtml(`${this.webUrl}/book/cancel/${booking.token}`)
    const rescheduleUrl = this.escHtml(`${this.webUrl}/book/reschedule/${booking.token}`)
    const aptTz = apt.timezone || 'UTC'
    const startStr = booking.startAt.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: aptTz,
      timeZoneName: 'short',
    })
    const endStr = booking.endAt.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: aptTz,
      timeZoneName: 'short',
    })
    const icsBuffer = this.buildIcs(booking, apt, owner)
    return this.send({
      to: booking.guestEmail,
      subject: this.stripCrLf(`Your booking is confirmed: ${apt.name}`),
      html: `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h2 style="color:#0ea5e9;margin-bottom:4px">Booking Confirmed!</h2>
          <p style="color:#6b7280;margin-top:0">Hi ${safeName}, your appointment with <strong style="color:#111827">${safeOwner}</strong> is confirmed.</p>
          <div style="background:#f0f9ff;border-left:4px solid #0ea5e9;border-radius:8px;padding:16px;margin:20px 0">
            <p style="margin:0 0 8px 0;font-size:18px;font-weight:700;color:#0f172a">${safeApt}</p>
            <p style="margin:0 0 4px 0;color:#374151"><strong>📅</strong> ${startStr} – ${endStr}</p>
            ${safeLocation ? `<p style="margin:4px 0 0 0;color:#374151"><strong>📍</strong> ${safeLocation}</p>` : ''}
          </div>
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <a href="${rescheduleUrl}" style="display:inline-block;padding:10px 20px;background:#0ea5e9;color:white;text-decoration:none;border-radius:8px;font-size:14px">Reschedule</a>
            <a href="${cancelUrl}" style="display:inline-block;padding:10px 20px;background:#ef4444;color:white;text-decoration:none;border-radius:8px;font-size:14px">Cancel</a>
          </div>
          <p style="color:#6b7280;font-size:13px;margin-top:16px">A calendar invite (.ics) is attached — add it to your calendar.</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px">Dotly.one — Tap. Share. Convert.</p>
        </div>
      `,
      attachments: [
        {
          filename: 'booking.ics',
          data: icsBuffer,
          contentType: 'text/calendar; method=REQUEST',
        },
      ],
    })
  }

  /**
   * Notifies the owner when a new booking lands on their calendar.
   * FIX-M: Show booking times in the appointment type's timezone (owner's tz),
   * not hardcoded UTC, so the owner sees the correct local time.
   */
  async sendBookingNotificationToOwner(
    booking: {
      guestName: string
      guestEmail: string
      startAt: Date
      endAt: Date
      guestNotes?: string | null
    },
    apt: { name: string; durationMins: number; location?: string | null; timezone?: string | null },
    owner: { email: string; name: string | null },
  ): Promise<boolean> {
    const safeGuest = this.escHtml(booking.guestName)
    const safeGuestEmail = this.escHtml(booking.guestEmail)
    const safeApt = this.escHtml(apt.name)
    const safeNotes = booking.guestNotes ? this.escHtml(booking.guestNotes) : null
    const safeLocation = apt.location ? this.escHtml(apt.location) : null
    const dashboardUrl = `${this.webUrl}/scheduling`
    const ownerTz = apt.timezone || 'UTC'
    const startStr = booking.startAt.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: ownerTz,
      timeZoneName: 'short',
    })
    const endStr = booking.endAt.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: ownerTz,
      timeZoneName: 'short',
    })
    return this.send({
      to: owner.email,
      subject: this.stripCrLf(`New booking: ${apt.name} with ${booking.guestName}`),
      html: `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h2 style="color:#0ea5e9;margin-bottom:4px">New Booking!</h2>
          <p style="color:#6b7280;margin-top:0"><strong style="color:#111827">${safeGuest}</strong> (${safeGuestEmail}) just booked <strong style="color:#111827">${safeApt}</strong>.</p>
          <div style="background:#f0f9ff;border-left:4px solid #0ea5e9;border-radius:8px;padding:16px;margin:20px 0">
            <p style="margin:0 0 4px 0;color:#374151"><strong>📅</strong> ${startStr} – ${endStr}</p>
            ${safeLocation ? `<p style="margin:4px 0 0 0;color:#374151"><strong>📍</strong> ${safeLocation}</p>` : ''}
            ${safeNotes ? `<p style="margin:8px 0 0 0;color:#374151"><strong>📝 Notes:</strong> ${safeNotes}</p>` : ''}
          </div>
          <a href="${dashboardUrl}" style="display:inline-block;padding:12px 24px;background:#0ea5e9;color:white;text-decoration:none;border-radius:8px;margin-top:8px;font-weight:600">View in Dashboard</a>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px">Dotly.one — Tap. Share. Convert.</p>
        </div>
      `,
    })
  }

  /**
   * Sent to the guest after they reschedule their booking.
   */
  async sendRescheduleConfirmationToGuest(
    booking: { guestName: string; guestEmail: string; startAt: Date; endAt: Date; token: string },
    apt: {
      name: string
      durationMins: number
      location?: string | null
      description?: string | null
      // FIX-4: timezone is now required so we can show the correct local time to
      // the guest. Previously hardcoded to UTC which was wrong for all non-UTC owners.
      timezone?: string | null
    },
    owner: { name: string | null; email: string },
  ): Promise<boolean> {
    const safeName = this.escHtml(booking.guestName)
    const safeApt = this.escHtml(apt.name)
    const safeOwner = this.escHtml(owner.name ?? 'Your host')
    const safeLocation = apt.location ? this.escHtml(apt.location) : null
    const cancelUrl = this.escHtml(`${this.webUrl}/book/cancel/${booking.token}`)
    const aptTz = apt.timezone || 'UTC'
    const startStr = booking.startAt.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: aptTz,
      timeZoneName: 'short',
    })
    const endStr = booking.endAt.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: aptTz,
      timeZoneName: 'short',
    })
    const icsBuffer = this.buildIcs(booking, apt, owner)
    return this.send({
      to: booking.guestEmail,
      subject: this.stripCrLf(`Booking rescheduled: ${apt.name}`),
      html: `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h2 style="color:#0ea5e9;margin-bottom:4px">Booking Rescheduled!</h2>
          <p style="color:#6b7280;margin-top:0">Hi ${safeName}, your appointment with <strong style="color:#111827">${safeOwner}</strong> has been rescheduled.</p>
          <div style="background:#f0f9ff;border-left:4px solid #0ea5e9;border-radius:8px;padding:16px;margin:20px 0">
            <p style="margin:0 0 8px 0;font-size:18px;font-weight:700;color:#0f172a">${safeApt}</p>
            <p style="margin:0 0 4px 0;color:#374151"><strong>📅 New time:</strong> ${startStr} – ${endStr}</p>
            ${safeLocation ? `<p style="margin:4px 0 0 0;color:#374151"><strong>📍</strong> ${safeLocation}</p>` : ''}
          </div>
          <a href="${cancelUrl}" style="display:inline-block;padding:10px 20px;background:#ef4444;color:white;text-decoration:none;border-radius:8px;font-size:14px">Cancel this booking</a>
          <p style="color:#6b7280;font-size:13px;margin-top:16px">An updated calendar invite (.ics) is attached.</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px">Dotly.one — Tap. Share. Convert.</p>
        </div>
      `,
      attachments: [
        {
          filename: 'booking.ics',
          data: icsBuffer,
          contentType: 'text/calendar; method=REQUEST',
        },
      ],
    })
  }

  /**
   * Notifies the owner when a guest reschedules.
   * FIX-M: Show booking times in the appointment type's timezone (owner's tz),
   * not hardcoded UTC, so the owner sees the correct local time.
   */
  async sendRescheduleNotificationToOwner(
    booking: {
      guestName: string
      guestEmail: string
      startAt: Date
      endAt: Date
    },
    apt: { name: string; location?: string | null; timezone?: string | null },
    owner: { email: string; name: string | null },
  ): Promise<boolean> {
    const safeGuest = this.escHtml(booking.guestName)
    const safeGuestEmail = this.escHtml(booking.guestEmail)
    const safeApt = this.escHtml(apt.name)
    const safeLocation = apt.location ? this.escHtml(apt.location) : null
    const dashboardUrl = `${this.webUrl}/scheduling`
    const ownerTz = apt.timezone || 'UTC'
    const startStr = booking.startAt.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: ownerTz,
      timeZoneName: 'short',
    })
    const endStr = booking.endAt.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: ownerTz,
      timeZoneName: 'short',
    })
    return this.send({
      to: owner.email,
      subject: this.stripCrLf(`Booking rescheduled: ${apt.name} with ${booking.guestName}`),
      html: `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h2 style="color:#f59e0b;margin-bottom:4px">Booking Rescheduled</h2>
          <p style="color:#6b7280;margin-top:0"><strong style="color:#111827">${safeGuest}</strong> (${safeGuestEmail}) rescheduled <strong style="color:#111827">${safeApt}</strong>.</p>
          <div style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:8px;padding:16px;margin:20px 0">
            <p style="margin:0 0 4px 0;color:#374151"><strong>📅 New time:</strong> ${startStr} – ${endStr}</p>
            ${safeLocation ? `<p style="margin:4px 0 0 0;color:#374151"><strong>📍</strong> ${safeLocation}</p>` : ''}
          </div>
          <a href="${dashboardUrl}" style="display:inline-block;padding:12px 24px;background:#0ea5e9;color:white;text-decoration:none;border-radius:8px;margin-top:8px;font-weight:600">View in Dashboard</a>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px">Dotly.one — Tap. Share. Convert.</p>
        </div>
      `,
    })
  }

  /**
   * 24-hour reminder email sent to the guest before their booking.
   * FIX-M: Show times in the appointment type's timezone (the tz the guest saw
   * when they booked), not hardcoded UTC.
   */
  async sendBookingReminderToGuest(
    booking: { guestName: string; guestEmail: string; startAt: Date; endAt: Date; token: string },
    apt: {
      name: string
      durationMins: number
      location?: string | null
      description?: string | null
      timezone?: string | null
    },
    owner: { name: string | null; email: string },
  ): Promise<boolean> {
    const safeName = this.escHtml(booking.guestName)
    const safeApt = this.escHtml(apt.name)
    const safeOwner = this.escHtml(owner.name ?? 'Your host')
    const safeLocation = apt.location ? this.escHtml(apt.location) : null
    const cancelUrl = this.escHtml(`${this.webUrl}/book/cancel/${booking.token}`)
    const rescheduleUrl = this.escHtml(`${this.webUrl}/book/reschedule/${booking.token}`)
    const aptTz = apt.timezone || 'UTC'
    const startStr = booking.startAt.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: aptTz,
      timeZoneName: 'short',
    })
    const endStr = booking.endAt.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: aptTz,
      timeZoneName: 'short',
    })
    return this.send({
      to: booking.guestEmail,
      subject: this.stripCrLf(`Reminder: ${apt.name} is tomorrow`),
      html: `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h2 style="color:#0ea5e9;margin-bottom:4px">Your appointment is tomorrow!</h2>
          <p style="color:#6b7280;margin-top:0">Hi ${safeName}, just a reminder about your upcoming appointment with <strong style="color:#111827">${safeOwner}</strong>.</p>
          <div style="background:#f0f9ff;border-left:4px solid #0ea5e9;border-radius:8px;padding:16px;margin:20px 0">
            <p style="margin:0 0 8px 0;font-size:18px;font-weight:700;color:#0f172a">${safeApt}</p>
            <p style="margin:0 0 4px 0;color:#374151"><strong>📅</strong> ${startStr} – ${endStr}</p>
            ${safeLocation ? `<p style="margin:4px 0 0 0;color:#374151"><strong>📍</strong> ${safeLocation}</p>` : ''}
          </div>
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <a href="${rescheduleUrl}" style="display:inline-block;padding:10px 20px;background:#0ea5e9;color:white;text-decoration:none;border-radius:8px;font-size:14px">Reschedule</a>
            <a href="${cancelUrl}" style="display:inline-block;padding:10px 20px;background:#ef4444;color:white;text-decoration:none;border-radius:8px;font-size:14px">Cancel</a>
          </div>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px">Dotly.one — Tap. Share. Convert.</p>
        </div>
      `,
    })
  }

  /**
   * Confirms cancellation to the guest.
   * FIX-3: Show times in the appointment type's timezone so the guest sees the
   * correct local time, not UTC (which was confusing for non-UTC owners).
   */
  async sendCancellationConfirmationToGuest(
    booking: { guestName: string; guestEmail: string; startAt: Date; endAt: Date },
    apt: { name: string; location?: string | null; timezone?: string | null },
    owner: { name: string | null },
    reason?: string | null,
  ): Promise<boolean> {
    const safeName = this.escHtml(booking.guestName)
    const safeApt = this.escHtml(apt.name)
    const safeOwner = this.escHtml(owner.name ?? 'Your host')
    const safeReason = reason ? this.escHtml(reason) : null
    const aptTz = apt.timezone || 'UTC'
    const startStr = booking.startAt.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: aptTz,
      timeZoneName: 'short',
    })
    return this.send({
      to: booking.guestEmail,
      subject: this.stripCrLf(`Booking cancelled: ${apt.name}`),
      html: `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h2 style="color:#ef4444;margin-bottom:4px">Booking Cancelled</h2>
          <p style="color:#6b7280;margin-top:0">Hi ${safeName}, your appointment with <strong style="color:#111827">${safeOwner}</strong> has been cancelled.</p>
          <div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:8px;padding:16px;margin:20px 0">
            <p style="margin:0 0 8px 0;font-size:18px;font-weight:700;color:#0f172a">${safeApt}</p>
            <p style="margin:0 0 4px 0;color:#374151"><strong>📅</strong> ${startStr}</p>
            ${safeReason ? `<p style="margin:8px 0 0 0;color:#374151"><strong>Reason:</strong> ${safeReason}</p>` : ''}
          </div>
          <p style="color:#6b7280;font-size:14px">If you believe this is a mistake or would like to rebook, please contact your host directly.</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px">Dotly.one — Tap. Share. Convert.</p>
        </div>
      `,
    })
  }

  /**
   * Notifies the owner when a guest cancels their booking.
   * FIX-M: Show booking times in the appointment type's timezone (owner's tz),
   * not hardcoded UTC, so the owner sees the correct local time.
   */
  async sendCancellationNotificationToOwner(
    booking: { guestName: string; guestEmail: string; startAt: Date; endAt: Date },
    apt: { name: string; location?: string | null; timezone?: string | null },
    owner: { email: string; name: string | null },
    reason?: string | null,
  ): Promise<boolean> {
    const safeGuest = this.escHtml(booking.guestName)
    const safeGuestEmail = this.escHtml(booking.guestEmail)
    const safeApt = this.escHtml(apt.name)
    const safeReason = reason ? this.escHtml(reason) : null
    const safeLocation = apt.location ? this.escHtml(apt.location) : null
    const dashboardUrl = `${this.webUrl}/scheduling`
    const ownerTz = apt.timezone || 'UTC'
    const startStr = booking.startAt.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: ownerTz,
      timeZoneName: 'short',
    })
    return this.send({
      to: owner.email,
      subject: this.stripCrLf(`Booking cancelled: ${apt.name} with ${booking.guestName}`),
      html: `
        <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
          <h2 style="color:#ef4444;margin-bottom:4px">Booking Cancelled</h2>
          <p style="color:#6b7280;margin-top:0"><strong style="color:#111827">${safeGuest}</strong> (${safeGuestEmail}) cancelled their booking for <strong style="color:#111827">${safeApt}</strong>.</p>
          <div style="background:#fef2f2;border-left:4px solid #ef4444;border-radius:8px;padding:16px;margin:20px 0">
            <p style="margin:0 0 4px 0;color:#374151"><strong>📅</strong> ${startStr}</p>
            ${safeLocation ? `<p style="margin:4px 0 0 0;color:#374151"><strong>📍</strong> ${safeLocation}</p>` : ''}
            ${safeReason ? `<p style="margin:8px 0 0 0;color:#374151"><strong>Reason:</strong> ${safeReason}</p>` : ''}
          </div>
          <a href="${dashboardUrl}" style="display:inline-block;padding:12px 24px;background:#0ea5e9;color:white;text-decoration:none;border-radius:8px;margin-top:8px;font-weight:600">View Dashboard</a>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px">Dotly.one — Tap. Share. Convert.</p>
        </div>
      `,
    })
  }

  async sendDirectCrmEmail(
    to: string,
    subject: string,
    htmlBody: string,
    fromName: string,
    trackingToken?: string,
  ): Promise<void> {
    // Step 1: Strip all HTML tags from user-supplied body to prevent stored XSS / HTML injection.
    // This converts the body to plain text.
    const plainText = htmlBody.replace(/<[^>]+>/g, '')

    // Step 2: HTML-escape the plain text so it is safe to embed in HTML.
    const escapedText = plainText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    // Step 3: Auto-link plain-text URLs so that click tracking works.
    // After stripping HTML tags above, any URLs the user typed are plain text
    // (e.g. "https://example.com"). We convert them to <a href="..."> elements
    // — either pointing directly at the destination or through the click-tracking
    // redirect when a tracking token is provided.
    const linkedHtml = escapedText.replace(/(https?:\/\/[^\s<>"]+)/g, (url) => {
      const dest = trackingToken
        ? `${this.webUrl}/api/track/click/${trackingToken}?url=${encodeURIComponent(url)}`
        : url
      return `<a href="${dest}" style="color:#0ea5e9">${url}</a>`
    })

    // Step 4: Convert newlines to <br /> for HTML rendering.
    const safeHtml = linkedHtml.replace(/\n/g, '<br />')

    // wrappedHtml is now the fully sanitised + link-tracked HTML body.
    const wrappedHtml = safeHtml

    // Sanitise fromName for use inside a quoted RFC 5321 display name.
    // Strip double-quotes to prevent display-name injection such as:
    //   fromName = 'Attacker" <evil@phish.com>'
    // which would break the "Name via Dotly" <noreply@dotly.one> structure.
    // Also strip CR/LF to prevent header folding attacks.
    const safeFromName = fromName
      .replace(/[\r\n]/g, '') // no header folding
      .replace(/"/g, '') // no quote escape / injection

    const from = `"${safeFromName} via Dotly" <${this.fromEmail}>`

    // Gap 5: Inject a 1×1 tracking pixel at the bottom of the email body.
    // The pixel hits the public /track/open/:token endpoint to record the open event.
    // Only injected when a trackingToken is provided (CRM direct emails).
    const trackingPixelHtml = trackingToken
      ? `<img src="${this.webUrl}/api/track/open/${trackingToken}" width="1" height="1" style="display:block;border:0;outline:0" alt="" />`
      : ''

    const html = `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        ${wrappedHtml}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin-top:32px" />
        <p style="color:#9ca3af;font-size:12px;margin-top:12px">This email was sent via Dotly CRM. Dotly.one — Tap. Share. Convert.</p>
        ${trackingPixelHtml}
      </div>
    `
    // H-04: strip CR/LF from caller-supplied subject to prevent header injection
    const sent = await this.send({ to, subject: this.stripCrLf(subject), html, from })
    if (!sent) {
      // C3: Throw so callers do NOT record timeline / ContactEmail as if the
      // email was delivered. A warning log alone is a silent false-positive.
      throw new Error(
        'Email delivery failed: no provider configured or all providers rejected the message',
      )
    }
  }
}
