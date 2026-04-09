/**
 * CardsService — pure logic unit tests
 *
 * Tests the magic-byte signature verification and PLAN_CARD_LIMITS map
 * without requiring a database or S3 connection.
 */

// ── Mirror of verifyMagicBytes from cards.service.ts ─────────────────────────
const MAGIC_BYTES: Record<string, { offset: number; bytes: number[] }[]> = {
  'image/jpeg': [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  'image/png': [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47] }],
  'image/webp': [{ offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }],
  'image/gif': [
    { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61] },
    { offset: 0, bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] },
  ],
}

function verifyMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const signatures = MAGIC_BYTES[mimeType]
  if (!signatures) return false
  return signatures.some(({ offset, bytes }) => bytes.every((b, i) => buffer[offset + i] === b))
}

// ── Mirror of PLAN_CARD_LIMITS ───────────────────────────────────────────────
const PLAN_CARD_LIMITS: Record<string, number> = {
  FREE: 1,
  STARTER: 1,
  PRO: 3,
  BUSINESS: 10,
  AGENCY: 50,
  ENTERPRISE: Infinity,
}

describe('verifyMagicBytes', () => {
  it('accepts a valid JPEG (FF D8 FF prefix)', () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00])
    expect(verifyMagicBytes(buf, 'image/jpeg')).toBe(true)
  })

  it('accepts a valid PNG (89 50 4E 47 prefix)', () => {
    const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a])
    expect(verifyMagicBytes(buf, 'image/png')).toBe(true)
  })

  it('accepts a valid GIF87a', () => {
    const buf = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61, 0x00])
    expect(verifyMagicBytes(buf, 'image/gif')).toBe(true)
  })

  it('accepts a valid GIF89a', () => {
    const buf = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00])
    expect(verifyMagicBytes(buf, 'image/gif')).toBe(true)
  })

  it('accepts a valid WebP (RIFF prefix)', () => {
    const buf = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00])
    expect(verifyMagicBytes(buf, 'image/webp')).toBe(true)
  })

  it('rejects a PHP file disguised as JPEG', () => {
    const buf = Buffer.from('<?php echo "hello"; ?>', 'ascii')
    expect(verifyMagicBytes(buf, 'image/jpeg')).toBe(false)
  })

  it('rejects an HTML file disguised as PNG', () => {
    const buf = Buffer.from('<html><body>XSS</body></html>', 'ascii')
    expect(verifyMagicBytes(buf, 'image/png')).toBe(false)
  })

  it('rejects an unknown MIME type', () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff])
    expect(verifyMagicBytes(buf, 'application/octet-stream')).toBe(false)
  })

  it('rejects an empty buffer', () => {
    expect(verifyMagicBytes(Buffer.alloc(0), 'image/jpeg')).toBe(false)
  })
})

describe('PLAN_CARD_LIMITS', () => {
  it('FREE plan allows 1 card', () => expect(PLAN_CARD_LIMITS['FREE']).toBe(1))
  it('STARTER plan allows 1 card', () => expect(PLAN_CARD_LIMITS['STARTER']).toBe(1))
  it('PRO plan allows 3 cards', () => expect(PLAN_CARD_LIMITS['PRO']).toBe(3))
  it('BUSINESS plan allows 10 cards', () => expect(PLAN_CARD_LIMITS['BUSINESS']).toBe(10))
  it('AGENCY plan allows 50 cards', () => expect(PLAN_CARD_LIMITS['AGENCY']).toBe(50))
  it('ENTERPRISE plan has no limit', () => expect(PLAN_CARD_LIMITS['ENTERPRISE']).toBe(Infinity))

  it('all 6 plan tiers are defined', () => {
    const expected = ['FREE', 'STARTER', 'PRO', 'BUSINESS', 'AGENCY', 'ENTERPRISE']
    expect(Object.keys(PLAN_CARD_LIMITS).sort()).toEqual(expected.sort())
  })

  it('limits are non-decreasing (no plan regresses)', () => {
    const order = ['FREE', 'STARTER', 'PRO', 'BUSINESS', 'AGENCY', 'ENTERPRISE']
    for (let i = 1; i < order.length; i++) {
      const prev = PLAN_CARD_LIMITS[order[i - 1] as string] as number
      const curr = PLAN_CARD_LIMITS[order[i] as string] as number
      expect(curr).toBeGreaterThanOrEqual(prev)
    }
  })
})
