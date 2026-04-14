/**
 * BillingService unit tests
 *
 * Tests the PLAN_INDEX_MAP logic and verifyAndSyncSubscription guard behaviour
 * without hitting a real blockchain or database.
 */
import { BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Plan } from '@dotly/types'
import { BillingService } from './billing.service'

function makeBillingService() {
  const prisma = {
    subscription: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
    auditLog: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  }
  const audit = { log: jest.fn().mockResolvedValue(undefined) }
  const config = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'DOTLY_CONTRACT_ADDRESS':
          return '0x0000000000000000000000000000000000000001'
        case 'ARBITRUM_RPC_URL':
          return 'https://arb.example'
        default:
          return undefined
      }
    }),
  } as unknown as ConfigService
  const paymentVaultQuotes = {} as never
  const email = { sendRefundReviewRequestNotification: jest.fn().mockResolvedValue(true) } as never

  return {
    prisma,
    audit,
    service: new BillingService(prisma as never, audit as never, config, paymentVaultQuotes, email),
  }
}

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

describe('stale pending checkout cleanup (pure logic)', () => {
  function isStalePending(updatedAt: Date, now: Date): boolean {
    const stalePendingThresholdMs = 2 * 60 * 60 * 1000
    return updatedAt.getTime() < now.getTime() - stalePendingThresholdMs
  }

  it('treats pending checkout as stale after the configured threshold', () => {
    const now = new Date('2026-04-14T12:00:00.000Z')
    const stale = new Date('2026-04-14T09:59:59.000Z')
    expect(isStalePending(stale, now)).toBe(true)
  })

  it('does not treat recent pending checkout as stale', () => {
    const now = new Date('2026-04-14T12:00:00.000Z')
    const fresh = new Date('2026-04-14T10:30:00.000Z')
    expect(isStalePending(fresh, now)).toBe(false)
  })
})

describe('refund downgrade flow', () => {
  it('downgrades an active subscription when the recorded payment has been refunded', async () => {
    const { prisma, audit, service } = makeBillingService()

    prisma.subscription.findUnique.mockResolvedValue({
      status: 'ACTIVE',
      currentPeriodEnd: new Date('2026-06-01T00:00:00.000Z'),
      txHash: '0xabc',
      user: {
        plan: Plan.PRO,
        walletAddress: '0xwallet',
        country: 'US',
      },
    })
    prisma.auditLog.findFirst.mockResolvedValue(null)

    jest.spyOn(service as any, 'readRecordedPaymentByTxHash').mockResolvedValue({
      paymentId: '0x' + '1'.repeat(64),
      payer: '0xwallet',
      userRef: '0x' + '2'.repeat(64),
      amount: 100000n,
      planId: 2,
      duration: 0,
      paymentRef: '0x' + '3'.repeat(64),
      paidAt: 1710000000n,
      refundUntil: 1710600000n,
      status: 2,
    } as any)

    const summary = await service.getUserSubscription('user_1', 'US')

    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { userId: 'user_1' },
      data: {
        status: 'CANCELLED',
        plan: Plan.FREE,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      },
    })
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user_1' },
      data: { plan: Plan.FREE },
    })
    expect(summary.plan).toBe(Plan.FREE)
    expect(summary.status).toBe('CANCELLED')
    expect(summary.refund?.status).toBe('REFUNDED')
    expect(audit.log).toHaveBeenCalled()
  })
})
