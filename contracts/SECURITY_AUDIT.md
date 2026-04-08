# Smart Contract Security Audit — DotlySubscription.sol

## Contract Details

| Field | Value |
|-------|-------|
| Contract Name | `DotlySubscription` |
| File | `contracts/DotlySubscription.sol` |
| Language | Solidity |
| Framework | Hardhat |
| Target Networks | Polygon (chainId 137), Base (chainId 8453) |
| Audit Status | **Pre-audit (pending)** |

---

## Audit Status

The contract has not yet undergone a formal third-party security audit. **Do not deploy to mainnet until an audit is complete.**

---

## Known Security Considerations

### Re-entrancy

- Verify that all state changes occur **before** any external calls (checks-effects-interactions pattern).
- Consider using OpenZeppelin `ReentrancyGuard` on any function that sends ETH or calls external contracts.

### Integer Overflow / Underflow

- Solidity 0.8.x has built-in overflow protection. Confirm the pragma version is `^0.8.0` or higher.
- Explicitly check for division-by-zero where applicable.

### Access Control

- Confirm `onlyOwner` / role-based modifiers are applied to all admin functions.
- Consider migrating from `Ownable` to `AccessControl` for multi-role setups.
- Evaluate `multisig` admin ownership before mainnet deploy.

### Timestamp Dependence

- Subscription expiry uses block timestamps. Miners can manipulate `block.timestamp` by ±15 seconds — acceptable for monthly billing windows, but document this assumption.

### Front-running

- Subscription activation transactions are visible in the mempool. Evaluate if front-running the `subscribe()` call would cause harm (e.g., denial-of-service for a specific address).

### Upgrade Risk

- The contract is currently not upgradeable. A proxy pattern (e.g., OpenZeppelin Transparent or UUPS Proxy) is recommended to allow bug fixes post-deployment.

---

## Recommended Audit Firms

| Firm | Specialisation | URL |
|------|---------------|-----|
| Trail of Bits | Smart contracts, protocol security | https://www.trailofbits.com |
| Consensys Diligence | EVM, DeFi protocols | https://consensys.io/diligence |
| OpenZeppelin Audits | Solidity, ERC standards | https://www.openzeppelin.com/security-audits |
| Certik | Automated + manual audits | https://www.certik.com |

---

## Pre-Deployment Checklist

- [ ] Deploy to testnet (Mumbai for Polygon, Base Goerli for Base) and run full integration tests
- [ ] Run `npx hardhat test` — all tests passing
- [ ] Run `slither .` (static analysis) and resolve all high/medium findings
- [ ] Run `mythril analyze` for symbolic execution checks
- [ ] Obtain formal third-party audit from at least one firm above
- [ ] Migrate admin ownership to a multisig wallet (e.g., Gnosis Safe) before mainnet
- [ ] Deploy behind a proxy pattern (UUPS recommended) to allow future upgrades
- [ ] Set up contract monitoring on Tenderly or OpenZeppelin Defender
- [ ] Document the emergency pause mechanism and test it on testnet
- [ ] Lock compiler version to a specific Solidity release (not a range)
