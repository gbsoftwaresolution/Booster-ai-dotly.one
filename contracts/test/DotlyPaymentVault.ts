import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'

const REFUND_WINDOW = 7 * 24 * 60 * 60

describe('DotlyPaymentVault', () => {
  async function deployFixture() {
    const [owner, treasury, signer, payer, other] = await ethers.getSigners()

    const MockUSDC = await ethers.getContractFactory('MockUSDC')
    const usdt = await MockUSDC.deploy()
    await usdt.waitForDeployment()

    const DotlyPaymentVault = await ethers.getContractFactory('DotlyPaymentVault')
    const vault = await DotlyPaymentVault.deploy(
      owner.address,
      treasury.address,
      signer.address,
      await usdt.getAddress(),
    )
    await vault.waitForDeployment()

    const amount = 49_000_000n
    await usdt.mint(payer.address, amount * 20n)
    await usdt.connect(payer).approve(await vault.getAddress(), amount * 20n)

    return { owner, treasury, signer, payer, other, usdt, vault, amount }
  }

  async function signQuote(params: {
    vault: string
    token: string
    signer: { signTypedData: Function }
    payer: string
    userRef: string
    amount: bigint
    planId?: number
    duration?: number
    paymentRef: string
    deadline: bigint
  }) {
    const { vault, token, signer, payer, userRef, amount, paymentRef, deadline } = params
    const network = await ethers.provider.getNetwork()

    const domain = {
      name: 'DotlyPaymentVault',
      version: '1',
      chainId: Number(network.chainId),
      verifyingContract: vault,
    }

    const types = {
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
    }

    const value = {
      payer,
      userRef,
      amount,
      planId: params.planId ?? 2,
      duration: params.duration ?? 1,
      paymentRef,
      deadline,
      vault,
      chainId: Number(network.chainId),
      token,
    }

    return signer.signTypedData(domain, types, value)
  }

  it('records a payment after verifying the EIP-712 quote', async () => {
    const { vault, usdt, signer, payer, amount } = await loadFixture(deployFixture)
    const userRef = ethers.id('user:alice')
    const paymentRef = ethers.id('order:001')
    const deadline = BigInt((await time.latest()) + 3600)
    const signature = await signQuote({
      vault: await vault.getAddress(),
      token: await usdt.getAddress(),
      signer,
      payer: payer.address,
      userRef,
      amount,
      paymentRef,
      deadline,
    })

    const tx = await vault
      .connect(payer)
      .paySubscription(userRef, amount, 2, 1, paymentRef, deadline, signature)

    const paymentId = ethers.keccak256(ethers.solidityPacked(['bytes32'], [paymentRef]))
    const paidAt = await time.latest()

    await expect(tx)
      .to.emit(vault, 'PaymentRecorded')
      .withArgs(
        paymentId,
        userRef,
        payer.address,
        amount,
        2,
        1,
        paymentRef,
        paidAt,
        paidAt + REFUND_WINDOW,
      )

    const payment = await vault.getPayment(paymentId)
    expect(payment.payer).to.equal(payer.address)
    expect(payment.userRef).to.equal(userRef)
    expect(payment.amount).to.equal(amount)
    expect(payment.status).to.equal(1)
  })

  it('rejects invalid signatures', async () => {
    const { vault, usdt, payer, other, amount } = await loadFixture(deployFixture)
    const userRef = ethers.id('user:bob')
    const paymentRef = ethers.id('order:bad-signature')
    const deadline = BigInt((await time.latest()) + 3600)
    const signature = await signQuote({
      vault: await vault.getAddress(),
      token: await usdt.getAddress(),
      signer: other,
      payer: payer.address,
      userRef,
      amount,
      paymentRef,
      deadline,
    })

    await expect(
      vault.connect(payer).paySubscription(userRef, amount, 2, 1, paymentRef, deadline, signature),
    ).to.be.revertedWith('invalid payment signature')
  })

  it('rejects reused payment references', async () => {
    const { vault, usdt, signer, payer, amount } = await loadFixture(deployFixture)
    const userRef = ethers.id('user:carol')
    const paymentRef = ethers.id('order:single-use')
    const deadline = BigInt((await time.latest()) + 3600)
    const signature = await signQuote({
      vault: await vault.getAddress(),
      token: await usdt.getAddress(),
      signer,
      payer: payer.address,
      userRef,
      amount,
      paymentRef,
      deadline,
    })

    await vault
      .connect(payer)
      .paySubscription(userRef, amount, 2, 1, paymentRef, deadline, signature)

    await expect(
      vault.connect(payer).paySubscription(userRef, amount, 2, 1, paymentRef, deadline, signature),
    ).to.be.revertedWith('paymentRef already used')
  })

  it('allows the original payer to refund during the escrow window', async () => {
    const { vault, usdt, signer, payer, amount } = await loadFixture(deployFixture)
    const userRef = ethers.id('user:refund-user')
    const paymentRef = ethers.id('order:user-refund')
    const deadline = BigInt((await time.latest()) + 3600)
    const signature = await signQuote({
      vault: await vault.getAddress(),
      token: await usdt.getAddress(),
      signer,
      payer: payer.address,
      userRef,
      amount,
      paymentRef,
      deadline,
    })

    await vault
      .connect(payer)
      .paySubscription(userRef, amount, 2, 1, paymentRef, deadline, signature)
    const paymentId = await vault.paymentIdFor(paymentRef)

    await expect(vault.connect(payer).requestRefund(paymentId))
      .to.emit(vault, 'RefundedByUser')
      .withArgs(paymentId, userRef, payer.address, amount, paymentRef)
  })

  it('allows owner admin refunds during the escrow window', async () => {
    const { vault, usdt, signer, owner, payer, amount } = await loadFixture(deployFixture)
    const userRef = ethers.id('user:admin-refund')
    const paymentRef = ethers.id('order:admin-refund')
    const deadline = BigInt((await time.latest()) + 3600)
    const signature = await signQuote({
      vault: await vault.getAddress(),
      token: await usdt.getAddress(),
      signer,
      payer: payer.address,
      userRef,
      amount,
      paymentRef,
      deadline,
    })

    await vault
      .connect(payer)
      .paySubscription(userRef, amount, 2, 1, paymentRef, deadline, signature)
    const paymentId = await vault.paymentIdFor(paymentRef)

    await expect(vault.connect(owner).adminRefund(paymentId))
      .to.emit(vault, 'RefundedByAdmin')
      .withArgs(paymentId, userRef, payer.address, amount, paymentRef, owner.address)
  })

  it('allows anyone to finalize after the refund window and sends funds to treasury', async () => {
    const { vault, usdt, signer, payer, other, treasury, amount } = await loadFixture(deployFixture)
    const userRef = ethers.id('user:finalize')
    const paymentRef = ethers.id('order:finalize')
    const deadline = BigInt((await time.latest()) + 3600)
    const signature = await signQuote({
      vault: await vault.getAddress(),
      token: await usdt.getAddress(),
      signer,
      payer: payer.address,
      userRef,
      amount,
      paymentRef,
      deadline,
    })

    await vault
      .connect(payer)
      .paySubscription(userRef, amount, 2, 1, paymentRef, deadline, signature)
    const paymentId = await vault.paymentIdFor(paymentRef)

    await time.increase(REFUND_WINDOW + 1)

    await expect(vault.connect(other).finalizePayment(paymentId))
      .to.emit(vault, 'Finalized')
      .withArgs(paymentId, userRef, payer.address, amount, paymentRef, treasury.address)

    expect(await usdt.balanceOf(treasury.address)).to.equal(amount)
  })

  it('prevents state transitions after refund or finalization', async () => {
    const { vault, usdt, signer, payer, owner, other, amount } = await loadFixture(deployFixture)

    const refundedRef = ethers.id('order:state-refund')
    const refundedSig = await signQuote({
      vault: await vault.getAddress(),
      token: await usdt.getAddress(),
      signer,
      payer: payer.address,
      userRef: ethers.id('user:state-refund'),
      amount,
      paymentRef: refundedRef,
      deadline: BigInt((await time.latest()) + 3600),
    })
    await vault
      .connect(payer)
      .paySubscription(
        ethers.id('user:state-refund'),
        amount,
        2,
        1,
        refundedRef,
        BigInt((await time.latest()) + 3600),
        refundedSig,
      )
    const refundedId = await vault.paymentIdFor(refundedRef)
    await vault.connect(payer).requestRefund(refundedId)

    await expect(vault.connect(payer).requestRefund(refundedId)).to.be.revertedWith(
      'payment not refundable',
    )
    await expect(vault.connect(owner).adminRefund(refundedId)).to.be.revertedWith(
      'payment not refundable',
    )
    await expect(vault.connect(other).finalizePayment(refundedId)).to.be.revertedWith(
      'payment not finalizable',
    )

    const finalizedRef = ethers.id('order:state-finalize')
    const finalizedSig = await signQuote({
      vault: await vault.getAddress(),
      token: await usdt.getAddress(),
      signer,
      payer: payer.address,
      userRef: ethers.id('user:state-finalize'),
      amount,
      paymentRef: finalizedRef,
      deadline: BigInt((await time.latest()) + 3600),
    })
    await vault
      .connect(payer)
      .paySubscription(
        ethers.id('user:state-finalize'),
        amount,
        2,
        1,
        finalizedRef,
        BigInt((await time.latest()) + 3600),
        finalizedSig,
      )
    const finalizedId = await vault.paymentIdFor(finalizedRef)
    await time.increase(REFUND_WINDOW + 1)
    await vault.connect(other).finalizePayment(finalizedId)

    await expect(vault.connect(payer).requestRefund(finalizedId)).to.be.revertedWith(
      'payment not refundable',
    )
    await expect(vault.connect(owner).adminRefund(finalizedId)).to.be.revertedWith(
      'payment not refundable',
    )
    await expect(vault.connect(other).finalizePayment(finalizedId)).to.be.revertedWith(
      'payment not finalizable',
    )
  })

  it('blocks new payments while paused but still allows refunds and finalization', async () => {
    const { vault, usdt, signer, owner, payer, other, amount } = await loadFixture(deployFixture)
    const userRef = ethers.id('user:pause')
    const paymentRef = ethers.id('order:pause')
    const deadline = BigInt((await time.latest()) + 3600)
    const signature = await signQuote({
      vault: await vault.getAddress(),
      token: await usdt.getAddress(),
      signer,
      payer: payer.address,
      userRef,
      amount,
      paymentRef,
      deadline,
    })

    await vault
      .connect(payer)
      .paySubscription(userRef, amount, 2, 1, paymentRef, deadline, signature)
    const paymentId = await vault.paymentIdFor(paymentRef)

    await vault.connect(owner).pause()

    const nextRef = ethers.id('order:pause-blocked')
    const nextSig = await signQuote({
      vault: await vault.getAddress(),
      token: await usdt.getAddress(),
      signer,
      payer: payer.address,
      userRef,
      amount,
      paymentRef: nextRef,
      deadline,
    })

    await expect(
      vault.connect(payer).paySubscription(userRef, amount, 2, 1, nextRef, deadline, nextSig),
    ).to.be.revertedWithCustomError(vault, 'EnforcedPause')

    await expect(vault.connect(payer).requestRefund(paymentId)).to.not.be.reverted

    const secondRef = ethers.id('order:pause-finalize')
    const secondDeadline = BigInt((await time.latest()) + 3600)
    const secondSig = await signQuote({
      vault: await vault.getAddress(),
      token: await usdt.getAddress(),
      signer,
      payer: payer.address,
      userRef,
      amount,
      paymentRef: secondRef,
      deadline: secondDeadline,
    })

    await vault.connect(owner).unpause()
    await vault
      .connect(payer)
      .paySubscription(userRef, amount, 2, 1, secondRef, secondDeadline, secondSig)
    const secondPaymentId = await vault.paymentIdFor(secondRef)
    await vault.connect(owner).pause()
    await time.increase(REFUND_WINDOW + 1)

    await expect(vault.connect(other).finalizePayment(secondPaymentId)).to.not.be.reverted
  })

  it('allows signer rotation by owner', async () => {
    const { vault, usdt, signer, owner, payer, other, amount } = await loadFixture(deployFixture)
    await vault.connect(owner).setPaymentSigner(other.address)

    const userRef = ethers.id('user:rotation')
    const paymentRef = ethers.id('order:rotation')
    const deadline = BigInt((await time.latest()) + 3600)

    const oldSignature = await signQuote({
      vault: await vault.getAddress(),
      token: await usdt.getAddress(),
      signer,
      payer: payer.address,
      userRef,
      amount,
      paymentRef,
      deadline,
    })

    await expect(
      vault
        .connect(payer)
        .paySubscription(userRef, amount, 2, 1, paymentRef, deadline, oldSignature),
    ).to.be.revertedWith('invalid payment signature')

    const newSignature = await signQuote({
      vault: await vault.getAddress(),
      token: await usdt.getAddress(),
      signer: other,
      payer: payer.address,
      userRef,
      amount,
      paymentRef,
      deadline,
    })

    await expect(
      vault
        .connect(payer)
        .paySubscription(userRef, amount, 2, 1, paymentRef, deadline, newSignature),
    ).to.not.be.reverted
  })

  it('restricts admin controls to owner and rejects zero addresses', async () => {
    const { vault, owner, other } = await loadFixture(deployFixture)

    await expect(vault.connect(other).setTreasury(other.address)).to.be.revertedWithCustomError(
      vault,
      'OwnableUnauthorizedAccount',
    )
    await expect(
      vault.connect(other).setPaymentSigner(other.address),
    ).to.be.revertedWithCustomError(vault, 'OwnableUnauthorizedAccount')
    await expect(vault.connect(other).pause()).to.be.revertedWithCustomError(
      vault,
      'OwnableUnauthorizedAccount',
    )

    await expect(vault.connect(owner).setTreasury(ethers.ZeroAddress)).to.be.revertedWith(
      'treasury is zero',
    )
    await expect(vault.connect(owner).setPaymentSigner(ethers.ZeroAddress)).to.be.revertedWith(
      'signer is zero',
    )
  })

  it('cannot rescue escrowed USDT but can rescue other tokens and native ETH', async () => {
    const { vault, usdt, owner, payer } = await loadFixture(deployFixture)

    const MockUSDC = await ethers.getContractFactory('MockUSDC')
    const otherToken = await MockUSDC.deploy()
    await otherToken.waitForDeployment()
    await otherToken.mint(await vault.getAddress(), 1_000_000n)

    await expect(
      vault.connect(owner).rescueToken(await usdt.getAddress(), owner.address, 1n),
    ).to.be.revertedWith('cannot rescue USDT')

    await expect(
      vault.connect(owner).rescueToken(await otherToken.getAddress(), owner.address, 1_000_000n),
    ).to.emit(vault, 'TokenRescued')

    await payer.sendTransaction({ to: await vault.getAddress(), value: ethers.parseEther('1') })

    await expect(vault.connect(owner).rescueNative(owner.address, ethers.parseEther('1'))).to.emit(
      vault,
      'NativeRescued',
    )
  })
})
