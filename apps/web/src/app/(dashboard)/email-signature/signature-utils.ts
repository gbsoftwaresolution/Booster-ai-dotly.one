// ─── Types ────────────────────────────────────────────────────────────────────

export interface CardSummary {
  id: string
  handle: string
  fields: Record<string, string>
  theme?: {
    primaryColor?: string
  } | null
  socialLinks?: { platform: string; url: string }[]
  // Resolved QR image data URL (fetched separately from GET /cards/:id/qr)
  qrImageUrl?: string | null
}

export type SignatureStyle = 'minimal' | 'professional' | 'branded'

export interface SignatureOptions {
  showPhoto: boolean
  showSocials: boolean
  showQr: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function safeUrl(value: string, allowedProtocols: readonly string[]): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    const url = new URL(trimmed)
    return allowedProtocols.includes(url.protocol) ? url.toString() : null
  } catch {
    return null
  }
}

function safeLinkHref(value: string): string | null {
  return safeUrl(value, ['http:', 'https:', 'mailto:'])
}

function safeImgSrc(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^data:image\//i.test(trimmed)) return trimmed
  return safeUrl(trimmed, ['http:', 'https:'])
}

// ─── Generator ────────────────────────────────────────────────────────────────

export function generateSignatureHtml(
  card: CardSummary,
  style: SignatureStyle,
  options: SignatureOptions,
): string {
  const f = card.fields
  const name = f['name'] ?? card.handle
  const title = f['title'] ?? ''
  const company = f['company'] ?? ''
  const phone = f['phone'] ?? ''
  const email = f['email'] ?? ''
  const website = f['website'] ?? ''
  const avatarUrl = f['avatarUrl'] ?? ''
  const cardUrl = `${process.env.NEXT_PUBLIC_WEB_URL ?? 'https://dotly.one'}/card/${card.handle}`
  const primaryColor = card.theme?.primaryColor ?? '#6366f1'
  const safeCardUrl = safeLinkHref(cardUrl) ?? 'https://dotly.one'
  const safeWebsiteUrl = safeLinkHref(website)
  const safeAvatarUrl = safeImgSrc(avatarUrl)

  const socialLinks = card.socialLinks ?? []
  // Use the resolved QR image data URL; fall back to nothing if unavailable
  const qrImageUrl = safeImgSrc(card.qrImageUrl ?? '') ?? ''

  const socialRow =
    options.showSocials && socialLinks.length > 0
      ? `<tr><td colspan="2" style="padding-top:8px;font-size:12px;color:#6b7280;">
          ${socialLinks
            .map((s) => {
              const href = safeLinkHref(s.url)
              if (!href) return ''
              return `<a href="${esc(href)}" style="color:#6366f1;text-decoration:none;margin-right:10px;">${esc(s.platform)}</a>`
            })
            .filter(Boolean)
            .join('')}
        </td></tr>`
      : ''

  const qrCell =
    options.showQr && qrImageUrl
      ? `<tr><td colspan="2" style="padding-top:10px;">
          <img src="${esc(qrImageUrl)}" alt="QR" width="72" height="72" style="display:block;border-radius:4px;" />
        </td></tr>`
      : ''

  if (style === 'minimal') {
    const parts: string[] = []
    if (name) parts.push(`<strong>${esc(name)}</strong>`)
    if (title) parts.push(esc(title))
    const line1 = parts.join(' | ')

    const details: string[] = []
    if (phone) details.push(esc(phone))
    if (email)
      details.push(
        `<a href="${esc(safeLinkHref(`mailto:${email}`) ?? `mailto:${email}`)}" style="color:#6366f1;text-decoration:none;">${esc(email)}</a>`,
      )
    if (safeWebsiteUrl)
      details.push(
        `<a href="${esc(safeWebsiteUrl)}" style="color:#6366f1;text-decoration:none;">${esc(website)}</a>`,
      )
    const line2 = details.join(' &bull; ')

    return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;font-size:13px;color:#374151;line-height:1.5;">
  <tr><td style="padding-bottom:2px;">${line1}</td></tr>
  ${line2 ? `<tr><td style="padding-bottom:2px;color:#6b7280;">${line2}</td></tr>` : ''}
  <tr><td style="padding-bottom:2px;"><a href="${esc(safeCardUrl)}" style="color:#6366f1;text-decoration:none;font-size:12px;">${esc(cardUrl)}</a></td></tr>
  ${socialRow}
</table>`
  }

  if (style === 'professional') {
    const avatar =
      options.showPhoto && safeAvatarUrl
        ? `<td style="padding-right:16px;vertical-align:top;">
            <img src="${esc(safeAvatarUrl)}" alt="${esc(name)}" width="60" height="60" style="border-radius:50%;display:block;object-fit:cover;" />
          </td>`
        : ''

    return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;font-size:13px;color:#374151;line-height:1.5;">
  <tr>
    ${avatar}
    <td style="vertical-align:top;">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr><td style="font-size:15px;font-weight:bold;color:#111827;padding-bottom:1px;">${esc(name)}</td></tr>
        ${title ? `<tr><td style="color:#4b5563;">${esc(title)}</td></tr>` : ''}
        ${company ? `<tr><td style="color:#6b7280;">${esc(company)}</td></tr>` : ''}
        <tr><td style="padding-top:6px;color:#6b7280;">
          ${[
            phone ? esc(phone) : '',
            email
              ? `<a href="${esc(safeLinkHref(`mailto:${email}`) ?? `mailto:${email}`)}" style="color:#6366f1;text-decoration:none;">${esc(email)}</a>`
              : '',
          ]
            .filter(Boolean)
            .join(' &nbsp;|&nbsp; ')}
        </td></tr>
        ${safeWebsiteUrl ? `<tr><td><a href="${esc(safeWebsiteUrl)}" style="color:#6366f1;text-decoration:none;font-size:12px;">${esc(website)}</a></td></tr>` : ''}
        <tr><td style="padding-top:4px;"><a href="${esc(safeCardUrl)}" style="color:#6366f1;text-decoration:none;font-size:12px;">${esc(cardUrl)}</a></td></tr>
        ${socialRow}
        ${qrCell}
      </table>
    </td>
  </tr>
  <tr><td colspan="2" style="padding-top:10px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;">
    Sent via <a href="https://dotly.one" style="color:#6366f1;text-decoration:none;">Dotly.one</a>
  </td></tr>
</table>`
  }

  // branded
  return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,sans-serif;font-size:13px;color:#374151;line-height:1.5;">
  <tr>
    <td style="border-left:4px solid ${esc(primaryColor)};padding-left:14px;vertical-align:top;">
      <table cellpadding="0" cellspacing="0" border="0">
        ${
          options.showPhoto && safeAvatarUrl
            ? `<tr><td style="padding-bottom:8px;"><img src="${esc(safeAvatarUrl)}" alt="${esc(name)}" width="60" height="60" style="border-radius:50%;display:block;object-fit:cover;" /></td></tr>`
            : ''
        }
        <tr><td style="font-size:15px;font-weight:bold;color:${esc(primaryColor)};padding-bottom:1px;">${esc(name)}</td></tr>
        ${title ? `<tr><td style="color:#4b5563;">${esc(title)}</td></tr>` : ''}
        ${company ? `<tr><td style="color:#6b7280;">${esc(company)}</td></tr>` : ''}
        <tr><td style="padding-top:6px;color:#6b7280;">
          ${[
            phone ? esc(phone) : '',
            email
              ? `<a href="${esc(safeLinkHref(`mailto:${email}`) ?? `mailto:${email}`)}" style="color:${esc(primaryColor)};text-decoration:none;">${esc(email)}</a>`
              : '',
          ]
            .filter(Boolean)
            .join(' &nbsp;|&nbsp; ')}
        </td></tr>
        ${safeWebsiteUrl ? `<tr><td><a href="${esc(safeWebsiteUrl)}" style="color:${esc(primaryColor)};text-decoration:none;font-size:12px;">${esc(website)}</a></td></tr>` : ''}
        <tr><td style="padding-top:4px;"><a href="${esc(safeCardUrl)}" style="color:${esc(primaryColor)};text-decoration:none;font-size:12px;">${esc(cardUrl)}</a></td></tr>
        ${socialRow}
        ${qrCell}
      </table>
    </td>
  </tr>
  <tr><td style="padding-top:10px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;">
    Sent via <a href="https://dotly.one" style="color:${esc(primaryColor)};text-decoration:none;">Dotly.one</a>
  </td></tr>
</table>`
}
