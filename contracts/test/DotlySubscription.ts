import { expect } from 'chai'
import { ethers } from 'hardhat'
import { time } from '@nomicfoundation/hardhat-network-helpers'

describe('DotlySubscription', function () {
  // Helper: max uint256 – used as "no slippage guard" sentinel
  const MAX_UINT256 = ethers.MaxUint256

  async function deployFixture() {
    const [owner, user, user2, treasury] = await ethers.getSigners()

    // MockUSDC is now in contracts/mocks/MockUSDC.sol but the artifact name is still 'MockUSDC'
    const MockUSDC = await ethers.getContractFactory('MockUSDC')
    const usdc = await MockUSDC.deploy()
    await usdc.waitForDeployment()

    const DotlySubscription = await ethers.getContractFactory('DotlySubscription')
    const subscription = await DotlySubscription.deploy(await usdc.getAddress())
    await subscription.waitForDeployment()

    // mint must be called from owner (deployer) – not from user
    await usdc.connect(owner).mint(user.address, 1_000_000_000n)
    await usdc.connect(owner).mint(user2.address, 1_000_000_000n)
    await usdc.connect(user).approve(await subscription.getAddress(), 1_000_000_000n)
    await usdc.connect(user2).approve(await subscription.getAddress(), 1_000_000_000n)

    return { owner, user, user2, treasury, usdc, subscription }
  }

  // ─── Happy-path tests ───────────────────────────────────────────────────────

  it('activates a PRO subscription and stores expiry', async function () {
    const { user, subscription } = await deployFixture()

    await expect(subscription.connect(user).subscribe(1, 1, MAX_UINT256))
      .to.emit(subscription, 'SubscriptionActivated')

    const sub = await subscription.getSubscription(user.address)
    expect(sub[0]).to.equal(1)   // plan = PRO
    expect(sub[2]).to.equal(true) // active
    expect(sub[1]).to.be.greaterThan(0n) // expiresAt set
  })

  it('extends from current expiry when already active', async function () {
    const { user, subscription } = await deployFixture()

    await subscription.connect(user).subscribe(1, 1, MAX_UINT256)
    const first = await subscription.getSubscription(user.address)

    await subscription.connect(user).subscribe(1, 2, MAX_UINT256)
    const second = await subscription.getSubscription(user.address)

    expect(second[1]).to.be.greaterThan(first[1])
  })

  it('cancels an active subscription and emits plan + timestamp', async function () {
    const { user, subscription } = await deployFixture()

    await subscription.connect(user).subscribe(1, 1, MAX_UINT256)
    const tx = await subscription.connect(user).cancelSubscription()
    const receipt = await tx.wait()
    const block = await ethers.provider.getBlock(receipt!.blockNumber)

    await expect(tx)
      .to.emit(subscription, 'SubscriptionCancelled')
      .withArgs(user.address, 1n /* PRO */, BigInt(block!.timestamp))

    const sub = await subscription.getSubscription(user.address)
    expect(sub[2]).to.equal(false) // active = false
  })

  it('lets owner withdraw collected USDC and emits FundsWithdrawn', async function () {
    const { owner, user, treasury, usdc, subscription } = await deployFixture()

    await subscription.connect(user).subscribe(2, 1, MAX_UINT256) // BUSINESS = $29
    const balanceBefore = await usdc.balanceOf(treasury.address)

    await expect(
      subscription.connect(owner).withdrawUSDC(treasury.address, 29_000_000n)
    )
      .to.emit(subscription, 'FundsWithdrawn')
      .withArgs(treasury.address, 29_000_000n)

    expect(await usdc.balanceOf(treasury.address)).to.equal(balanceBefore + 29_000_000n)
  })

  it('allows upgrade from PRO to BUSINESS mid-cycle', async function () {
    const { user, subscription } = await deployFixture()

    await subscription.connect(user).subscribe(1, 1, MAX_UINT256) // PRO
    await expect(
      subscription.connect(user).subscribe(2, 1, MAX_UINT256) // BUSINESS – upgrade OK
    ).to.emit(subscription, 'SubscriptionActivated')
  })

  it('allows re-subscribe to same plan mid-cycle (renewal)', async function () {
    const { user, subscription } = await deployFixture()

    await subscription.connect(user).subscribe(1, 1, MAX_UINT256)
    await expect(
      subscription.connect(user).subscribe(1, 1, MAX_UINT256)
    ).to.emit(subscription, 'SubscriptionActivated')
  })

  // ─── Slippage guard ─────────────────────────────────────────────────────────

  it('reverts when price exceeds maxPricePerMonth slippage guard', async function () {
    const { user, subscription } = await deployFixture()

    // PRO is $9 (9_000_000). Pass a guard of $8.
    await expect(
      subscription.connect(user).subscribe(1, 1, 8_000_000n)
    ).to.be.revertedWith('Price exceeds slippage guard')
  })

  it('succeeds when maxPricePerMonth equals exact plan price', async function () {
    const { user, subscription } = await deployFixture()

    await expect(
      subscription.connect(user).subscribe(1, 1, 9_000_000n)
    ).to.emit(subscription, 'SubscriptionActivated')
  })

  // ─── Downgrade guard ────────────────────────────────────────────────────────

  it('reverts when attempting mid-cycle downgrade', async function () {
    const { user, subscription } = await deployFixture()

    await subscription.connect(user).subscribe(2, 1, MAX_UINT256) // BUSINESS
    await expect(
      subscription.connect(user).subscribe(1, 1, MAX_UINT256) // PRO – downgrade
    ).to.be.revertedWith('Cannot downgrade mid-cycle; cancel first')
  })

  it('allows downgrade after subscription expires', async function () {
    const { user, subscription } = await deployFixture()

    await subscription.connect(user).subscribe(2, 1, MAX_UINT256) // BUSINESS for 1 month
    // Advance time past expiry (30 days + 1 second)
    await time.increase(30 * 24 * 60 * 60 + 1)

    // After expiry, downgrade is allowed because the guard only applies to active subscriptions
    await expect(
      subscription.connect(user).subscribe(1, 1, MAX_UINT256) // PRO
    ).to.emit(subscription, 'SubscriptionActivated')
  })

  it('allows downgrade after cancellation', async function () {
    const { user, subscription } = await deployFixture()

    await subscription.connect(user).subscribe(2, 1, MAX_UINT256) // BUSINESS
    await subscription.connect(user).cancelSubscription()

    // After cancel, active=false so downgrade guard is bypassed
    await expect(
      subscription.connect(user).subscribe(1, 1, MAX_UINT256) // PRO
    ).to.emit(subscription, 'SubscriptionActivated')
  })

  // ─── Pause / unpause ────────────────────────────────────────────────────────

  it('reverts subscribe when paused', async function () {
    const { owner, user, subscription } = await deployFixture()

    await subscription.connect(owner).pause()
    await expect(
      subscription.connect(user).subscribe(1, 1, MAX_UINT256)
    ).to.be.revertedWithCustomError(subscription, 'EnforcedPause')
  })

  it('allows subscribe after unpause', async function () {
    const { owner, user, subscription } = await deployFixture()

    await subscription.connect(owner).pause()
    await subscription.connect(owner).unpause()
    await expect(
      subscription.connect(user).subscribe(1, 1, MAX_UINT256)
    ).to.emit(subscription, 'SubscriptionActivated')
  })

  it('reverts pause/unpause when called by non-owner', async function () {
    const { user, subscription } = await deployFixture()

    await expect(
      subscription.connect(user).pause()
    ).to.be.revertedWithCustomError(subscription, 'OwnableUnauthorizedAccount')
  })

  // ─── Access control ─────────────────────────────────────────────────────────

  it('reverts withdrawUSDC when called by non-owner', async function () {
    const { user, subscription } = await deployFixture()

    await expect(
      subscription.connect(user).withdrawUSDC(user.address, 1n)
    ).to.be.revertedWithCustomError(subscription, 'OwnableUnauthorizedAccount')
  })

  it('reverts withdrawUSDC to zero address', async function () {
    const { owner, user, subscription } = await deployFixture()

    await subscription.connect(user).subscribe(1, 1, MAX_UINT256)
    await expect(
      subscription.connect(owner).withdrawUSDC(ethers.ZeroAddress, 9_000_000n)
    ).to.be.revertedWith('Cannot withdraw to zero address')
  })

  it('reverts setMonthlyPrice when called by non-owner', async function () {
    const { user, subscription } = await deployFixture()

    await expect(
      subscription.connect(user).setMonthlyPrice(1, 1_000_000n)
    ).to.be.revertedWithCustomError(subscription, 'OwnableUnauthorizedAccount')
  })

  // ─── Edge cases / adversarial ───────────────────────────────────────────────

  it('reverts subscribe to FREE plan', async function () {
    const { user, subscription } = await deployFixture()

    await expect(
      subscription.connect(user).subscribe(0, 1, MAX_UINT256)
    ).to.be.revertedWith('Use FREE plan without payment')
  })

  it('reverts subscribe with 0 months', async function () {
    const { user, subscription } = await deployFixture()

    await expect(
      subscription.connect(user).subscribe(1, 0, MAX_UINT256)
    ).to.be.revertedWith('1-12 months only')
  })

  it('reverts subscribe with 13 months', async function () {
    const { user, subscription } = await deployFixture()

    await expect(
      subscription.connect(user).subscribe(1, 13, MAX_UINT256)
    ).to.be.revertedWith('1-12 months only')
  })

  it('reverts cancelSubscription when no active subscription', async function () {
    const { user, subscription } = await deployFixture()

    await expect(
      subscription.connect(user).cancelSubscription()
    ).to.be.revertedWith('No active subscription')
  })

  it('reverts double-cancel', async function () {
    const { user, subscription } = await deployFixture()

    await subscription.connect(user).subscribe(1, 1, MAX_UINT256)
    await subscription.connect(user).cancelSubscription()
    await expect(
      subscription.connect(user).cancelSubscription()
    ).to.be.revertedWith('No active subscription')
  })

  it('isActive returns false after expiry even if active flag was not cleared', async function () {
    const { user, subscription } = await deployFixture()

    await subscription.connect(user).subscribe(1, 1, MAX_UINT256) // 30 days
    await time.increase(30 * 24 * 60 * 60 + 1)

    expect(await subscription.isActive(user.address)).to.equal(false)
  })

  it('reverts constructor with zero USDC address', async function () {
    const DotlySubscription = await ethers.getContractFactory('DotlySubscription')
    await expect(
      DotlySubscription.deploy(ethers.ZeroAddress)
    ).to.be.revertedWith('USDC address cannot be zero')
  })

  it('non-owner cannot mint MockUSDC', async function () {
    const { user, usdc } = await deployFixture()

    await expect(
      usdc.connect(user).mint(user.address, 1n)
    ).to.be.revertedWithCustomError(usdc, 'OwnableUnauthorizedAccount')
  })
})
