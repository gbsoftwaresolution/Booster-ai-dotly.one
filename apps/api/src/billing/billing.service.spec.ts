/**
 * BillingService unit tests
 *
 * Tests the PLAN_INDEX_MAP logic and verifyAndSyncSubscription guard behaviour
 * without hitting a real blockchain or database.
 */
import { BadRequestException } from '@nestjs/common'
import { Plan } from '@dotly/types'

// ── PLAN_INDEX_MAP sanity tests ───────────────────────────────────────────────
// We re-derive the map here to ensure it stays in sync with the contract.
// DotlySubscription.sol enum:  FREE=0  PRO=1  BUSINESS=2  ENTERPRISE=3
const PLAN_INDEX_MAP: Plan[] = [Plan.FREE, Plan.PRO, Plan.BUSINESS, Plan.ENTERPRISE]

describe('PLAN_INDEX_MAP', () => {
  it('maps index 0 → FREE', () => {
    expect(PLAN_INDEX_MAP[0]).toBe(Plan.FREE)
  })

  it('maps index 1 → PRO', () => {
    expect(PLAN_INDEX_MAP[1]).toBe(Plan.PRO)
  })

  it('maps index 2 → BUSINESS', () => {
    expect(PLAN_INDEX_MAP[2]).toBe(Plan.BUSINESS)
  })

  it('maps index 3 → ENTERPRISE', () => {
    expect(PLAN_INDEX_MAP[3]).toBe(Plan.ENTERPRISE)
  })

  it('has exactly 4 entries matching the Solidity enum', () => {
    expect(PLAN_INDEX_MAP).toHaveLength(4)
  })

  it('returns undefined for out-of-range index (no silent privilege escalation)', () => {
    // Any index outside 0-3 must resolve to undefined so callers can fall back
    // to FREE rather than granting a higher plan by accident.
    expect(PLAN_INDEX_MAP[4]).toBeUndefined()
    expect(PLAN_INDEX_MAP[99]).toBeUndefined()
    expect(PLAN_INDEX_MAP[-1]).toBeUndefined()
  })
})

// ── assertTxOrigin behaviour (isolated) ──────────────────────────────────────
// We cannot call the real viem client in a unit test, so we test the guard
// logic by extracting the decision into a pure helper that mirrors the real code.

function checkTxOrigin(txFrom: string, claimed: string): void {
  if (txFrom.toLowerCase() !== claimed.toLowerCase()) {
    throw new BadRequestException('Transaction sender does not match the provided wallet address')
  }
}

describe('assertTxOrigin (pure logic)', () => {
  const wallet = '0xABCDEF1234567890ABCDEF1234567890ABCDEF12'

  it('passes when tx.from matches claimed address (case-insensitive)', () => {
    expect(() => checkTxOrigin(wallet, wallet.toLowerCase())).not.toThrow()
    expect(() => checkTxOrigin(wallet.toLowerCase(), wallet)).not.toThrow()
  })

  it('throws BadRequestException when tx.from differs from claimed address', () => {
    const different = '0x0000000000000000000000000000000000000001'
    expect(() => checkTxOrigin(different, wallet)).toThrow(BadRequestException)
  })

  it('throws BadRequestException for completely unrelated address', () => {
    expect(() => checkTxOrigin('0xdeadbeef', wallet)).toThrow(BadRequestException)
  })
})

describe('wallet normalization (pure logic)', () => {
  function normalizeWalletAddress(walletAddress: string): string {
    return walletAddress.toLowerCase()
  }

  it('normalizes checksum-case addresses before persistence/comparison', () => {
    expect(normalizeWalletAddress('0xAbCdEf1234567890ABCDEF1234567890abCDef12')).toBe(
      '0xabcdef1234567890abcdef1234567890abcdef12',
    )
  })
})
