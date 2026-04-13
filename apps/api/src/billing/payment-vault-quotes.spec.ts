import { BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Wallet, verifyTypedData, keccak256 } from 'ethers'
import { BillingDuration, Plan } from '@dotly/types'
import { PaymentVaultQuotes } from './payment-vault-quotes'

describe('PaymentVaultQuotes', () => {
  const privateKey = '0x59c6995e998f97a5a0044976f7d7c7650f9d7a8f86c4d4b4207f2555026a7566'
  const walletAddress = '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
  const vaultAddress = '0x1111111111111111111111111111111111111111'
  const usdtAddress = '0x2222222222222222222222222222222222222222'

  function makeService(overrides?: Record<string, string | undefined>) {
    const config: Record<string, string | undefined> = {
      DOTLY_CONTRACT_ADDRESS: vaultAddress,
      DOTLY_USDT_ADDRESS: usdtAddress,
      DOTLY_PAYMENT_SIGNER_PRIVATE_KEY: privateKey,
      ...overrides,
    }

    return new PaymentVaultQuotes({
      get: (key: string) => config[key],
    } as ConfigService)
  }

  it('parses USDT amounts to 6-decimal raw values', () => {
    const service = makeService()
    expect(service.parseAmountRaw('10.00')).toBe(10_000_000n)
    expect(service.parseAmountRaw('55.25')).toBe(55_250_000n)
    expect(service.parseAmountRaw('199.123456')).toBe(199_123_456n)
  })

  it('derives paymentId the same way as the vault contract', () => {
    const service = makeService()
    const paymentRef = '0x' + 'ab'.repeat(32)
    expect(service.paymentIdFor(paymentRef)).toBe(keccak256(paymentRef))
  })

  it('creates stable user refs and unique payment refs when nonce changes', () => {
    const service = makeService()
    const userRefA = service.makeUserRef('user-123')
    const userRefB = service.makeUserRef('user-123')
    expect(userRefA).toBe(userRefB)

    const paymentRefA = service.makePaymentRef({
      userId: 'user-123',
      plan: Plan.PRO,
      duration: BillingDuration.MONTHLY,
      walletAddress,
      nonce: '1',
    })
    const paymentRefB = service.makePaymentRef({
      userId: 'user-123',
      plan: Plan.PRO,
      duration: BillingDuration.MONTHLY,
      walletAddress,
      nonce: '2',
    })

    expect(paymentRefA).not.toBe(paymentRefB)
  })

  it('signs a valid EIP-712 payment quote', async () => {
    const service = makeService()
    const userRef = service.makeUserRef('user-123')
    const paymentRef = service.makePaymentRef({
      userId: 'user-123',
      plan: Plan.PRO,
      duration: BillingDuration.MONTHLY,
      walletAddress,
      nonce: '1',
    })

    const signature = await service.signQuote({
      payer: walletAddress,
      userRef,
      amountRaw: 20_000_000n,
      planId: 2,
      durationId: 1,
      paymentRef,
      deadline: 1_900_000_000n,
    })

    const signer = verifyTypedData(
      {
        name: 'DotlyPaymentVault',
        version: '1',
        chainId: 42161,
        verifyingContract: vaultAddress,
      },
      {
        PaymentQuote: [
          { name: 'payer', type: 'address' },
          { name: 'userRef', type: 'bytes32' },
          { name: 'amount', type: 'uint256' },
          { name: 'planId', type: 'uint32' },
          { name: 'duration', type: 'uint8' },
          { name: 'paymentRef', type: 'bytes32' },
          { name: 'deadline', type: 'uint64' },
          { name: 'vault', type: 'address' },
          { name: 'chainId', type: 'uint256' },
          { name: 'token', type: 'address' },
        ],
      },
      {
        payer: walletAddress,
        userRef,
        amount: 20_000_000n,
        planId: 2,
        duration: 1,
        paymentRef,
        deadline: 1_900_000_000n,
        vault: vaultAddress,
        chainId: 42161,
        token: usdtAddress,
      },
      signature,
    )

    expect(signer.toLowerCase()).toBe(new Wallet(privateKey).address.toLowerCase())
  })

  it('fails closed when signer config is missing', async () => {
    const service = makeService({ DOTLY_PAYMENT_SIGNER_PRIVATE_KEY: undefined })
    await expect(
      service.signQuote({
        payer: walletAddress,
        userRef: service.makeUserRef('user-123'),
        amountRaw: 20_000_000n,
        planId: 2,
        durationId: 1,
        paymentRef: '0x' + 'cd'.repeat(32),
        deadline: 1_900_000_000n,
      }),
    ).rejects.toThrow(BadRequestException)
  })
})
