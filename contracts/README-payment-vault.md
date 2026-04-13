# DotlyPaymentVault

`DotlyPaymentVault` is Dotly.one's product-only USDT payment vault.

It does:

- collect USDT subscription payments
- escrow funds for a fixed 7-day refund window
- allow payer refunds during the refund window
- allow owner support refunds during the refund window
- allow anyone to finalize cleared payments to the Dotly treasury
- emit clean reconciliation events

It does not do:

- partner attribution
- commission calculation
- payout splitting
- retention qualification
- affiliate withdrawals

## Contract Shape

Main entrypoints:

- `paySubscription(bytes32 userRef, uint256 amount, uint32 planId, uint8 duration, bytes32 paymentRef, uint64 deadline, bytes signature)`
- `requestRefund(bytes32 paymentId)`
- `adminRefund(bytes32 paymentId)`
- `finalizePayment(bytes32 paymentId)`

Admin entrypoints:

- `setTreasury(address)`
- `setPaymentSigner(address)`
- `pause()`
- `unpause()`
- `rescueToken(address token, address to, uint256 amount)` for non-USDT tokens only
- `rescueNative(address payable to, uint256 amount)`

## EIP-712 Quote

Domain:

```text
name:              DotlyPaymentVault
version:           1
chainId:           current chain id
verifyingContract: deployed vault address
```

Struct:

```text
PaymentQuote(
  address payer,
  bytes32 userRef,
  uint256 amount,
  uint32 planId,
  uint8 duration,
  bytes32 paymentRef,
  uint64 deadline,
  address vault,
  uint256 chainId,
  address token
)
```

Notes:

- `payer` must equal `msg.sender`
- `userRef` is a backend-generated `bytes32` user identifier
- `paymentRef` is a backend-generated `bytes32` order/payment reference
- `deadline` is a hard expiry for the quote
- `vault`, `chainId`, and `token` are bound into the signed payload
- quotes are single-use because `paymentRef` is permanently unique

## Payment Lifecycle

1. Backend creates order and signs quote.
2. Frontend gets user approval for USDT.
3. Frontend calls `paySubscription(...)`.
4. Vault transfers USDT from payer into escrow.
5. Vault emits `PaymentRecorded`.
6. Backend grants provisional paid access.
7. During 7 days:
   - payer may call `requestRefund(paymentId)`
   - owner may call `adminRefund(paymentId)`
8. After 7 days:
   - anyone may call `finalizePayment(paymentId)`
   - full amount transfers to current treasury

## Status Model

```solidity
enum PaymentStatus {
  NONE,
  PAID_ESCROW,
  REFUNDED,
  FINALIZED
}
```

## Events

- `PaymentRecorded`
- `RefundedByUser`
- `RefundedByAdmin`
- `Finalized`

All main events include `paymentId`, `userRef`, and payer/payment context for backend reconciliation.

## Deployment Environment

Required env vars for `scripts/deploy-payment-vault.ts`:

- `USDT_ADDRESS`
- `DOTLY_TREASURY_ADDRESS`
- `DOTLY_PAYMENT_SIGNER_ADDRESS`

Optional:

- `DOTLY_OWNER_ADDRESS`

## Backend Quote Generation Example

Example using `ethers` v6 in a backend service:

```ts
import { Wallet } from 'ethers'

const signer = new Wallet(process.env.DOTLY_PAYMENT_SIGNER_PRIVATE_KEY!)

const domain = {
  name: 'DotlyPaymentVault',
  version: '1',
  chainId: 42161,
  verifyingContract: '0xYourVaultAddress',
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
  payer: '0xPayerWallet',
  userRef: '0xUserRefBytes32',
  amount: 49_000_000n,
  planId: 2,
  duration: 1,
  paymentRef: '0xPaymentRefBytes32',
  deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
  vault: '0xYourVaultAddress',
  chainId: 42161,
  token: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
}

const signature = await signer.signTypedData(domain, types, value)
```

Backend rules:

- generate a unique `paymentRef` for every checkout
- convert your backend user id to a deterministic `bytes32 userRef`
- never reuse a signed `paymentRef`
- use a short `deadline`
- sign with the dedicated payment signer, not the owner key

## Arbitrum Deployment

Recommended mainnet env vars:

```bash
export DEPLOYER_PRIVATE_KEY=0x...
export ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
export USDT_ADDRESS=0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9
export DOTLY_TREASURY_ADDRESS=0x...
export DOTLY_PAYMENT_SIGNER_ADDRESS=0x...
export DOTLY_OWNER_ADDRESS=0x...
```

Deploy command:

```bash
cd contracts
pnpm deploy:vault:arbitrum
```

The script writes deployment output to:

```text
contracts/deployments/payment-vault-arbitrum.json
```

Recommended post-deploy checks:

- confirm owner, treasury, signer, and USDT addresses
- verify the contract on your explorer
- test one signed quote on a fork or staging path before live traffic
- move ownership to multisig later if desired

Arbiscan verification example:

```bash
cd contracts
pnpm hardhat verify --network arbitrum \
  <DEPLOYED_VAULT_ADDRESS> \
  <OWNER_ADDRESS> \
  <TREASURY_ADDRESS> \
  <PAYMENT_SIGNER_ADDRESS> \
  0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9
```

Constructor args are verified in this order:

```text
1. initialOwner
2. initialTreasury
3. initialPaymentSigner
4. usdtToken
```

You will need an Arbiscan API key configured for Hardhat verification locally.

## Operational Notes

- Deploy first to Arbitrum
- Use a separate backend signer from owner
- Use `Ownable2Step`
- Start with single admin EOA if needed, then transfer ownership to multisig later
- Treasury updates affect future finalizations because finalized funds go to the current treasury at finalization time
