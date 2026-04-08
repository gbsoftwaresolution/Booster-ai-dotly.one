import { BadRequestException } from '@nestjs/common'
import { URL } from 'url'
import * as dns from 'dns'
import { promisify } from 'util'

const lookup = promisify(dns.lookup)

const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '169.254.169.254']

// IPv4 private/link-local/loopback/unspecified ranges
const BLOCKED_IPV4_RANGES = [
  /^0\./,                 // 0.0.0.0/8 — "this network" (routes to loopback on some kernels)
  /^127\./,               // loopback
  /^10\./,               // RFC 1918 class A
  /^172\.(1[6-9]|2\d|3[01])\./, // RFC 1918 class B
  /^192\.168\./,          // RFC 1918 class C
  /^169\.254\./,          // link-local (APIPA / metadata)
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // RFC 6598 CGNAT
  /^192\.0\.2\./,         // TEST-NET-1 (RFC 5737)
  /^198\.51\.100\./,      // TEST-NET-2 (RFC 5737)
  /^203\.0\.113\./,       // TEST-NET-3 (RFC 5737)
  /^240\./,               // reserved (RFC 1112)
]

// IPv6 private/link-local/loopback prefixes (lower-cased)
const BLOCKED_IPV6_PREFIXES = [
  '::1',           // loopback
  'fc',            // unique-local fc00::/7 (fc00:: – fdff::)
  'fd',            // unique-local fc00::/7
  'fe80',          // link-local fe80::/10
  'fe90',          // link-local
  'fea0',          // link-local
  'feb0',          // link-local
  '::ffff:',       // IPv4-mapped IPv6 — validated separately via IPv4 range checks
  '64:ff9b:',      // IPv4/IPv6 translation (RFC 6052)
  '::',            // unspecified / all-zeros
]

/**
 * Checks if a raw IPv4-mapped IPv6 address (::ffff:x.x.x.x or ::ffff:hex)
 * resolves to a private IPv4 address.
 */
function extractMappedIPv4(ip: string): string | null {
  // Matches both ::ffff:1.2.3.4 and ::ffff:0102:0304 forms
  const dotted = ip.match(/^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i)
  if (dotted) return dotted[1]!

  const hex = ip.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i)
  if (hex) {
    const a = parseInt(hex[1]!, 16)
    const b = parseInt(hex[2]!, 16)
    return `${(a >> 8) & 0xff}.${a & 0xff}.${(b >> 8) & 0xff}.${b & 0xff}`
  }

  return null
}

function isBlockedIp(ip: string): boolean {
  const lower = ip.toLowerCase()

  // Strip bracket notation for IPv6 (e.g. [::1])
  const stripped = lower.replace(/^\[/, '').replace(/\]$/, '')

  if (BLOCKED_HOSTS.includes(stripped)) return true

  // IPv4-mapped IPv6 — extract the embedded IPv4 and run it through IPv4 checks
  const mapped = extractMappedIPv4(stripped)
  if (mapped !== null) {
    // The mapped address itself might be safe-looking but embedded in ::ffff: space
    // Any IPv4-mapped address is blocked — force resolution instead.
    return isBlockedIPv4(mapped) || true  // always block ::ffff:* without known-safe list
  }

  // IPv6 prefix checks
  for (const prefix of BLOCKED_IPV6_PREFIXES) {
    if (stripped.startsWith(prefix)) return true
  }

  // IPv4 range checks
  return isBlockedIPv4(stripped)
}

function isBlockedIPv4(ip: string): boolean {
  for (const range of BLOCKED_IPV4_RANGES) {
    if (range.test(ip)) return true
  }
  return false
}

export async function assertSafeUrl(urlString: string): Promise<void> {
  let url: URL
  try {
    url = new URL(urlString)
  } catch {
    throw new BadRequestException('Invalid URL')
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new BadRequestException('Only HTTP/HTTPS URLs are allowed')
  }

  const hostname = url.hostname

  // Block known dangerous literals immediately (fast path)
  if (isBlockedIp(hostname)) {
    throw new BadRequestException('URL not allowed')
  }

  // DNS resolution check — prevents DNS-rebinding and hostnames that resolve to private IPs
  try {
    const { address } = await lookup(hostname)
    if (isBlockedIp(address)) {
      throw new BadRequestException('URL not allowed')
    }
  } catch (err: unknown) {
    // Re-throw our own BadRequestException
    if (err instanceof BadRequestException) throw err
    // DNS lookup failed — treat as unsafe
    throw new BadRequestException('URL not allowed')
  }
}
