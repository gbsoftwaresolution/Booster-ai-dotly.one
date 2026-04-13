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

## Operational Notes

- Deploy first to Arbitrum
- Use a separate backend signer from owner
- Use `Ownable2Step`
- Start with single admin EOA if needed, then transfer ownership to multisig later
- Treasury updates affect future finalizations because finalized funds go to the current treasury at finalization time
