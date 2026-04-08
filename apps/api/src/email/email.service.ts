import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import FormData from 'form-data'
import Mailgun from 'mailgun.js'
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

export interface EmailPayload {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
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

  async send(payload: EmailPayload): Promise<boolean> {
    // Try Mailgun first
    if (this.mailgunClient && this.mailgunDomain) {
      try {
        await this.mailgunClient.messages.create(this.mailgunDomain, {
          from: payload.from || this.fromEmail,
          to: [payload.to],
          subject: payload.subject,
          html: payload.html,
          text: payload.text || payload.html.replace(/<[^>]+>/g, ''),
        })
        // MED-05: Log only the domain part of the address (mask local-part) to
        // avoid recording PII (email addresses) in log aggregators where it may be
        // accessible to staff without data-access rights or retained beyond the
        // privacy-policy period.
        const maskedTo = payload.to.replace(/^[^@]+/, '***')
        this.logger.log(`Email sent via Mailgun to ${maskedTo}`)
        return true
      } catch (err) {
        this.logger.warn(`Mailgun failed, trying SES fallback: ${err}`)
      }
    }

    // SES fallback
    if (this.sesClient) {
      try {
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
        this.logger.log(`Email sent via SES to ${payload.to.replace(/^[^@]+/, '***')}`)
        return true
      } catch (err) {
        this.logger.error(`SES also failed: ${err}`)
      }
    }

    this.logger.warn(`No email provider configured — email to ${payload.to} not sent`)
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
          <a href="${this.webUrl}/dashboard/contacts" style="display:inline-block;padding:12px 24px;background:#0ea5e9;color:white;text-decoration:none;border-radius:8px;margin-top:16px">View in CRM</a>
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
          <p>You're all set. Create your first digital business card in minutes — it takes less than 3 minutes.</p>
          <a href="${this.webUrl}/cards/create" style="display:inline-block;padding:12px 24px;background:#0ea5e9;color:white;text-decoration:none;border-radius:8px;margin-top:16px">Create my card →</a>
          <p style="color:#9ca3af;font-size:12px;margin-top:32px">Dotly.one — Tap. Share. Convert.</p>
        </div>
      `,
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

  async sendDirectCrmEmail(
    to: string,
    subject: string,
    htmlBody: string,
    fromName: string,
  ): Promise<void> {
    // Strip all HTML tags from user-supplied body to prevent stored XSS / HTML injection
    const safeText = htmlBody.replace(/<[^>]+>/g, '')
    const safeHtml = safeText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br />')

    // Sanitise fromName for use inside a quoted RFC 5321 display name.
    // Strip double-quotes to prevent display-name injection such as:
    //   fromName = 'Attacker" <evil@phish.com>'
    // which would break the "Name via Dotly" <noreply@dotly.one> structure.
    // Also strip CR/LF to prevent header folding attacks.
    const safeFromName = fromName
      .replace(/[\r\n]/g, '') // no header folding
      .replace(/"/g, '') // no quote escape / injection

    const from = `"${safeFromName} via Dotly" <${this.fromEmail}>`
    const html = `
      <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:24px">
        ${safeHtml}
        <hr style="border:none;border-top:1px solid #e5e7eb;margin-top:32px" />
        <p style="color:#9ca3af;font-size:12px;margin-top:12px">This email was sent via Dotly CRM. Dotly.one — Tap. Share. Convert.</p>
      </div>
    `
    // H-04: strip CR/LF from caller-supplied subject to prevent header injection
    const sent = await this.send({ to, subject: this.stripCrLf(subject), html, from })
    if (!sent) {
      this.logger.warn(`Direct CRM email to ${to} could not be delivered (no provider configured)`)
    }
  }
}
