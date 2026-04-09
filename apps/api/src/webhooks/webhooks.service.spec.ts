/**
 * WebhooksService — isPrivateAddress unit tests
 *
 * Extracts and tests the private-IP detection logic in isolation.
 * These guard the SSRF prevention layer: if isPrivateAddress returns false
 * for a private IP, the webhook service will make an outbound HTTP request
 * to an internal network address.
 */
import { BadRequestException } from '@nestjs/common'

// ── Mirror of isPrivateAddress from webhooks.service.ts ──────────────────────
// Keep in sync with the real implementation.
function isPrivateAddress(ip: string): boolean {
  if (ip.includes(':')) {
    // IPv6
    const lower = ip.toLowerCase()
    if (lower === '::1') return true
    if (lower.startsWith('fe80:')) return true
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true
    if (lower === '::' || lower === '0:0:0:0:0:0:0:1') return true
    return false
  }

  const parts = ip.split('.').map(Number)
  if (parts.length !== 4) return false
  const a = parts[0] as number
  const b = parts[1] as number
  const c = parts[2] as number

  if (a === 10) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 127) return true
  if (a === 169 && b === 254) return true
  if (a === 0) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  if (a === 192 && b === 0 && c === 0) return true
  if (a === 198 && (b === 18 || b === 19)) return true
  if (a === 240) return true
  if (a === 255 && ip === '255.255.255.255') return true
  return false
}

describe('isPrivateAddress — IPv4 private ranges', () => {
  // RFC-1918
  it('blocks 10.x.x.x', () => expect(isPrivateAddress('10.0.0.1')).toBe(true))
  it('blocks 10.255.255.255', () => expect(isPrivateAddress('10.255.255.255')).toBe(true))
  it('blocks 172.16.0.1', () => expect(isPrivateAddress('172.16.0.1')).toBe(true))
  it('blocks 172.31.255.255', () => expect(isPrivateAddress('172.31.255.255')).toBe(true))
  it('blocks 192.168.1.1', () => expect(isPrivateAddress('192.168.1.1')).toBe(true))

  // Loopback
  it('blocks 127.0.0.1', () => expect(isPrivateAddress('127.0.0.1')).toBe(true))
  it('blocks 127.255.255.254', () => expect(isPrivateAddress('127.255.255.254')).toBe(true))

  // Link-local
  it('blocks 169.254.0.1', () => expect(isPrivateAddress('169.254.0.1')).toBe(true))
  it('blocks 169.254.169.254 (AWS metadata)', () =>
    expect(isPrivateAddress('169.254.169.254')).toBe(true))

  // CGNAT
  it('blocks 100.64.0.1', () => expect(isPrivateAddress('100.64.0.1')).toBe(true))
  it('blocks 100.127.255.255', () => expect(isPrivateAddress('100.127.255.255')).toBe(true))

  // Broadcast
  it('blocks 255.255.255.255', () => expect(isPrivateAddress('255.255.255.255')).toBe(true))

  // Public IPs must NOT be blocked
  it('allows 1.1.1.1 (Cloudflare DNS)', () => expect(isPrivateAddress('1.1.1.1')).toBe(false))
  it('allows 8.8.8.8 (Google DNS)', () => expect(isPrivateAddress('8.8.8.8')).toBe(false))
  it('allows 93.184.216.34 (example.com)', () =>
    expect(isPrivateAddress('93.184.216.34')).toBe(false))
  it('allows 172.15.255.255 (just below RFC-1918 range)', () =>
    expect(isPrivateAddress('172.15.255.255')).toBe(false))
  it('allows 172.32.0.0 (just above RFC-1918 range)', () =>
    expect(isPrivateAddress('172.32.0.0')).toBe(false))
})

describe('isPrivateAddress — IPv6', () => {
  it('blocks ::1 (loopback)', () => expect(isPrivateAddress('::1')).toBe(true))
  it('blocks fe80::1 (link-local)', () => expect(isPrivateAddress('fe80::1')).toBe(true))
  it('blocks fc00:: (ULA)', () => expect(isPrivateAddress('fc00::')).toBe(true))
  it('blocks fd12:3456::1 (ULA)', () => expect(isPrivateAddress('fd12:3456::1')).toBe(true))
  it('allows 2606:4700::1 (Cloudflare public IPv6)', () =>
    expect(isPrivateAddress('2606:4700::1')).toBe(false))
})

// ── Webhook URL scheme validation (mirrors create()/update() logic) ───────────
function assertWebhookUrlScheme(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new BadRequestException('Invalid webhook URL')
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new BadRequestException('Webhook URL must use http or https')
  }
}

describe('webhook URL scheme validation', () => {
  it('accepts https:// URLs', () =>
    expect(() => assertWebhookUrlScheme('https://example.com/hook')).not.toThrow())
  it('accepts http:// URLs', () =>
    expect(() => assertWebhookUrlScheme('http://example.com/hook')).not.toThrow())
  it('rejects file:// URLs', () =>
    expect(() => assertWebhookUrlScheme('file:///etc/passwd')).toThrow(BadRequestException))
  it('rejects ftp:// URLs', () =>
    expect(() => assertWebhookUrlScheme('ftp://example.com')).toThrow(BadRequestException))
  it('rejects javascript: URLs', () =>
    expect(() => assertWebhookUrlScheme('javascript:alert(1)')).toThrow(BadRequestException))
  it('rejects completely invalid strings', () =>
    expect(() => assertWebhookUrlScheme('not a url !!!')).toThrow(BadRequestException))
})
