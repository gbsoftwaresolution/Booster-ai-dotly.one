# Dotly.one — Production Readiness Report

**Generated:** 2026-04-08  
**Scope:** Full monorepo — API (NestJS), Web (Next.js), Mobile (Expo/React Native), Contracts (Solidity/Hardhat), Infrastructure (Docker, Railway, Vercel, GitHub Actions)  
**Auditor:** Automated security + production readiness analysis  
**Severity Scale:** CRITICAL / HIGH / MEDIUM / LOW / INFO

---

## Executive Summary

Dotly.one is a well-architected digital business card platform with a thoughtful security foundation: JWT algorithm pinning, SSRF guards, magic-byte file validation, PII-redacted logging, serializable plan-limit transactions, and solid CORS/Helmet configuration. However, **the application is not ready for production deployment** in its current state.

There are **3 CRITICAL blockers** that must be resolved before any public launch, **25+ HIGH issues** that create meaningful security and reliability risk, and over **40 MEDIUM/LOW** findings that should be addressed in the weeks following initial launch.

The critical blockers are:

1. Real production secrets exist in `.env` files on disk (all must be rotated before any git push)
2. `next@14.2.4` has an explicit security vulnerability notice in the lock file
3. The mobile app uses `enterpriseProvisioning: "universal"` for App Store distribution (Apple TOS violation — will result in certificate revocation)

---

## CRITICAL — Must Fix Before Any Deployment

### C-01 | Real Production Secrets in `.env` Files

**Files:** `apps/api/.env`, `.env`, `apps/web/.env.local`

Live, working credentials are present in `.env` files on disk:

| Credential                      | File                    | Risk                                  |
| ------------------------------- | ----------------------- | ------------------------------------- |
| Mailgun API key (`7c16b119...`) | `apps/api/.env`         | Full email send/receive access        |
| R2 Access Key + Secret          | `apps/api/.env`         | Full object storage read/write/delete |
| BoosterAI Internal API Key      | `apps/api/.env`         | Internal billing API access           |
| BoosterAI Dotly API Key         | `apps/api/.env`         | Partner billing access                |
| Auth JWT Secret                 | `apps/api/.env`, `.env` | First-party JWT signing key material  |
| Google Auth Client Secret       | `apps/api/.env`, `.env` | Google sign-in impersonation risk     |

**Actions (in order):**

1. Run `git log --all --full-history -- apps/api/.env .env apps/web/.env.local` — if any of these were ever committed, purge with `git-filter-repo` immediately
2. Rotate **every credential** listed above regardless of git history findings
3. Move all secrets to Railway environment variables (API), Vercel environment variables (web), and EAS Secrets (mobile) — never store real values in `.env` files in the repository
4. Add a secret-scanning step (TruffleHog / Gitleaks) as the first CI gate

---

### C-02 | `next@14.2.4` Has an Explicit Security Vulnerability

**File:** `apps/web/package.json` — `"next": "14.2.4"` (exact pin)

The pnpm lock file carries an official `deprecated` notice on this version: _"This version has a security vulnerability. Please upgrade to a patched version. See https://nextjs.org/blog/security-update-2025-12-11 for more details."_

**Action:** Upgrade to the latest patched `14.2.x` release (>=14.2.30 per the advisory), or migrate to Next.js 15.x. Also update `"eslint-config-next": "14.2.4"` to match.

---

### C-03 | Mobile App Uses Apple Enterprise Provisioning for App Store Distribution

**File:** `apps/mobile/eas.json` — `"enterpriseProvisioning": "universal"` in the `production` profile

`enterpriseProvisioning: "universal"` is an Apple Enterprise Distribution setting for internal employee-only apps. Using it for a public consumer app violates Apple's Enterprise Program License Agreement. Apple will revoke the certificate — immediately revoking the app for **all users simultaneously**.

**Action:** Remove the `"ios": { "enterpriseProvisioning": "universal" }` block from the `production` EAS profile entirely. Standard App Store builds do not need this key.

---

## HIGH — Fix Before or Immediately After Launch

### H-01 | Redis Exposed to All Network Interfaces With No Authentication

**File:** `infrastructure/docker-compose.infra.yml`

Redis port `6379` is bound to `0.0.0.0` (all interfaces) with no password (`--requirepass` not set). Any host or network peer that can reach port 6379 can read and write the rate-limit counters and BullMQ job queues.

**Fix:**

```yaml
command: redis-server --appendonly yes --requirepass <STRONG_PASSWORD>
ports:
  - '127.0.0.1:6379:6379'
```

Add `REDIS_URL=redis://:password@localhost:6379` to consuming services.

---

### H-02 | PgBouncer Uses `auth_type = trust` With No Password

**Files:** `infrastructure/pgbouncer/pgbouncer.ini`, `infrastructure/pgbouncer/userlist.txt`

`auth_type = trust` means any client reaching port 6432 on the host is granted database access with no credentials. The empty password in `userlist.txt` confirms this.

**Fix:** Change to `auth_type = scram-sha-256`, set a real password, and bind the port to loopback only (`"127.0.0.1:6432:6432"`).

---

### H-03 | PgBouncer `host=localhost` Broken in Docker Context

**File:** `infrastructure/pgbouncer/pgbouncer.ini` line 2

Inside a Docker container, `localhost` resolves to the container itself — not the PostgreSQL host. PgBouncer will silently fail to connect to any database.

**Fix:** Replace `host=localhost` with the PostgreSQL container service name (e.g., `host=postgres`) or the Docker bridge host IP.

---

### H-04 | No Container Health Checks or Resource Limits

**File:** `infrastructure/docker-compose.infra.yml`

Neither `pgbouncer` nor `redis` defines a `healthcheck:` block or `deploy.resources.limits`. Containers report "running" before they are ready, and an unconstrained Redis can be OOM-killed with no warning.

**Fix:** Add healthchecks and resource limits to both services (see full infrastructure audit for specific YAML).

---

### H-05 | Mobile API Client Falls Back to `http://localhost:3001` on Missing Env Var

**File:** `apps/mobile/lib/api.ts` line 3

```typescript
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001'
```

If `EXPO_PUBLIC_API_URL` is unset in a production EAS build, all API calls go to plaintext HTTP localhost and silently fail — or worse, succeed against a different service on the device. Tokens and PII would travel over unencrypted HTTP.

**Fix:**

```typescript
const API_URL = process.env.EXPO_PUBLIC_API_URL
if (!API_URL || !API_URL.startsWith('https://')) {
  throw new Error('EXPO_PUBLIC_API_URL must be set and must use https://')
}
```

---

### H-06 | No Deep Link URL Validation in Mobile App

**File:** `apps/mobile/app/scan-result.tsx` lines 24–40; `apps/mobile/app.json` line 8

The `dotly://` URL scheme accepts arbitrary query parameters and populates form fields directly from `useLocalSearchParams()` with no validation. A malicious app on the same device could inject crafted data via `Linking.openURL('dotly://scan-result?email=evil@...')`, which flows into `Linking.openURL('mailto:...')` calls.

**Fix:** Add a scheme/host allowlist validator for all incoming deep links. Sanitize `email`, `phone`, and `website` params before storing or acting on them.

---

### H-07 | `checkHandleAvailable` Returns `true` on Any Network Error

**File:** `apps/mobile/lib/api.ts` lines 101–112

```typescript
} catch {
  return { available: true }  // any error = handle appears available
}
```

Network failures silently report handles as available, allowing users to attempt card creation with taken handles.

**Fix:** Return a distinct `'unknown'` state on errors and block form progression until availability is confirmed.

---

### H-08 | `mimeType` Is Caller-Controlled — No Server-Side Validation

**File:** `apps/mobile/lib/api.ts` lines 117–148

The mobile client sends `mimeType` verbatim to the server. If the server trusts this value to determine file type instead of inspecting magic bytes, a MIME-confusion attack is possible.

**Fix:** Whitelist `mimeType` on the client. On the server (primary fix), always derive MIME type from magic bytes — never trust the client-supplied value. (The API already uses magic-byte validation for avatar uploads per the earlier audit — confirm this covers the scan endpoint too.)

---

### H-09 | No Certificate Pinning on Any Mobile Network Call

**Files:** `apps/mobile/lib/api.ts`, `apps/mobile/lib/auth.ts`

The mobile app is vulnerable to MITM on devices with a custom root certificate (Burp Suite, corporate MDM, jailbroken devices).

**Fix:** Integrate `react-native-ssl-pinning` or configure iOS `NSPinnedDomains` / Android network security config. At minimum, document as known risk and roadmap for v2.

---

### H-10 | ThrottlerModule Uses In-Memory Storage — Rate Limits Not Shared Across Pods

**File:** `apps/api/src/app.module.ts`

Rate limits reset on every pod restart and are not shared across horizontal API replicas.

**Fix:**

```typescript
ThrottlerModule.forRoot({
  throttlers: [...],
  storage: new ThrottlerStorageRedisService(redisClient),
})
```

---

### H-11 | `BoosterAiPartnerGuard` Uses Non-Constant-Time String Comparison

**File:** `apps/api/src/billing/boosterai-partner.guard.ts`

Plain `===` comparison for API key verification is vulnerable to timing attacks.

**Fix:** Use `crypto.timingSafeEqual()`:

```typescript
import { timingSafeEqual } from 'crypto'
const a = Buffer.from(provided)
const b = Buffer.from(expected)
if (a.length !== b.length || !timingSafeEqual(a, b)) { throw ... }
```

---

### H-12 | `DOTLY_CONTRACT_ADDRESS` Is Zero Address (`0x000...000`)

**Files:** `.env`, `apps/api/.env`

The smart contract address is set to the Ethereum zero address. On-chain billing will fail silently or treat all users as FREE tier in production until a real contract is deployed and the address updated.

**Fix:** Deploy the `DotlySubscription` contract to Polygon/Base and update this env var before enabling on-chain billing.

---

### H-13 | Smart Contract — `transfer`/`transferFrom` Return Values Not Checked

**File:** `contracts/contracts/DotlySubscription.sol` lines 45, 77

```solidity
usdc.transferFrom(msg.sender, address(this), price);  // return value discarded
usdc.transfer(to, amount);                              // return value discarded
```

If `transferFrom` returns `false` (non-reverting ERC-20), the subscription is written to storage without payment being received.

**Fix:** Use OpenZeppelin's `SafeERC20` (`safeTransferFrom`, `safeTransfer`).

---

### H-14 | `MockUSDC.mint()` Has No Access Control

**File:** `contracts/contracts/MockUSDC.sol` line 13

Any address can mint unlimited tokens. If accidentally deployed to mainnet, it is exploitable immediately.

**Fix:** Add `onlyOwner`, move to `contracts/mocks/`, and exclude from mainnet deploy scripts.

---

### H-15 | Smart Contract Owned by Single EOA — No Multisig

**File:** `contracts/contracts/DotlySubscription.sol`

Single EOA controls all USDC revenue and pricing. A compromised key drains all funds instantly.

**Fix:** Transfer ownership to a Gnosis Safe multisig immediately after deployment. Add a `TimelockController` for price changes.

---

### H-16 | `openai` Package — Lock File/Installed Version Major Version Desync

**File:** `apps/api/package.json` — declared `^4.103.0`, installed `6.33.0`

In CI, `pnpm install` would install `4.x`, not `6.x`, silently breaking any v5/v6 API features used by the AI service.

**Fix:** Update `package.json` to `"openai": "^6.33.0"` and commit the regenerated lock file.

---

### H-17 | Multiple React Instances — `packages/ui` Resolves to React 19 While Apps Use React 18

**File:** `packages/ui/package.json`

`react` declared as a `dependency` (not `peerDependency`) resolves to `19.2.4` while `apps/web` uses `18.3.1` and `apps/mobile` uses `18.2.0`. This causes the "multiple React instances" problem — hooks, context, and refs break across the boundary.

**Fix:** Move `react` and `react-dom` from `dependencies` to `peerDependencies` in `packages/ui/package.json`.

---

### H-18 | `NSPhotoLibraryUsageDescription` Missing — iOS Will Crash

**File:** `apps/mobile/app.json` lines 21–25

The iOS info plist does not declare `NSPhotoLibraryUsageDescription`, but the app calls `ImagePicker.requestMediaLibraryPermissionsAsync()` in the create-card and edit-card flows. iOS will crash the app when requesting photo library access.

**Fix:** Add to `app.json` under `ios.infoPlist`:

```json
"NSPhotoLibraryUsageDescription": "Used to select a profile photo for your digital card"
```

---

### H-19 | Email Confirmation Deep Link Not Handled in Mobile App

**File:** `apps/mobile/lib/auth.ts`, `apps/mobile/app/_layout.tsx`

The mobile app must handle password reset and Google sign-in deep links consistently or users can land in a dead-end auth state.

**Fix:** Keep the `_layout.tsx` deep-link listener aligned with the first-party auth callback payload format and cover it with end-to-end tests.

---

### H-20 | `google-play-service-account.json` Path Not in `.gitignore`

**File:** `apps/mobile/eas.json` line 43

The Google Play service account private key file referenced by EAS submit is not gitignored. A `git add .` would commit it.

**Fix:** Add `apps/mobile/google-play-service-account.json` to `.gitignore`. Use `eas secret:create` instead of a local file.

---

### H-21 | No Sentry DSN Set — Production Errors Not Captured

**File:** `apps/api/.env` — `SENTRY_DSN` not present

Sentry is initialized with `enabled: !!SENTRY_DSN`, so it is disabled in production. Runtime errors will not be captured or alerted.

**Fix:** Create a Sentry project, set `SENTRY_DSN` in Railway environment variables.

---

### H-22 | `deploy-web` Runs in Parallel With `deploy-api` — Compatibility Window

**File:** `.github/workflows/deploy.yml`

The web deployment races against the API container restart after migrations. A schema-breaking change could cause a brief period of incompatibility.

**Fix:**

```yaml
deploy-web:
  needs: [ci-gate, deploy-api]
```

---

### H-23 | Smart Contract — Front-Running: Owner Can Raise Price Between Approval and Subscribe

**File:** `contracts/contracts/DotlySubscription.sol` lines 39–58, 80–83

The owner can call `setMonthlyPrice` after a user's `approve()` transaction appears in the mempool but before their `subscribe()` confirms, causing the user to pay a higher price than shown.

**Fix:** Add a `maxPricePerMonth` slippage guard to `subscribe()`. Add a `TimelockController` on `setMonthlyPrice`.

---

## MEDIUM — Fix Within First Month of Launch

### Infrastructure & CI/CD

| ID   | Finding                                                                          | File                                          |
| ---- | -------------------------------------------------------------------------------- | --------------------------------------------- |
| M-01 | No rollback step after failed deployment                                         | `.github/workflows/deploy.yml`                |
| M-02 | No Dockerfile — Railway uses Nixpacks with no pinned base image or non-root user | `apps/api/Procfile`                           |
| M-03 | No staging environment in CI pipeline                                            | `.github/workflows/deploy.yml`                |
| M-04 | No secret-scanning step in CI                                                    | `.github/workflows/ci.yml`                    |
| M-05 | No `pnpm audit` step in CI                                                       | `.github/workflows/ci.yml`                    |
| M-06 | EAS production build auto-submits to stores without human approval gate          | `.github/workflows/eas-build.yml`             |
| M-07 | Load tests use `continue-on-error: true` — failures are not enforced             | `.github/workflows/load-test.yml`             |
| M-08 | No `railway.toml` — health check path not declared as code                       | (missing)                                     |
| M-09 | No database backup strategy documented                                           | `infrastructure/`                             |
| M-10 | Log aggregation is console-only — logs lost on pod restart                       | `apps/api/src/common/logger/logger.module.ts` |

### API

| ID   | Finding                                                                               | File                                                       |
| ---- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| M-11 | Account deletion must revoke local refresh sessions and clear all auth state reliably | `apps/api/src/auth`, `apps/api/src/users/users.service.ts` |
| M-12 | `SentryExceptionFilter` drops all 4xx errors — auth failures not captured             | `apps/api/src/common/filters/sentry-exception.filter.ts`   |
| M-13 | No Prisma connection pool limits — can exhaust connections under horizontal scale     | `apps/api/src/prisma/prisma.service.ts`                    |
| M-14 | Analytics flush lock is 25s but flush could exceed this under load                    | `apps/api/src/analytics/analytics.service.ts`              |
| M-15 | `email.service.ts` logs full recipient email address in SES branch (PII leak)         | `apps/api/src/email/email.service.ts` line 102             |

### Mobile

| ID   | Finding                                                                          | File                                              |
| ---- | -------------------------------------------------------------------------------- | ------------------------------------------------- |
| M-16 | EAS Project ID is a placeholder — OTA updates and push notifications will fail   | `apps/mobile/app.json` line 42                    |
| M-17 | Apple submission IDs are placeholders — `eas submit` will fail                   | `apps/mobile/eas.json` lines 38–41                |
| M-18 | Deprecated `Clipboard` API from React Native core (removed in RN 0.59)           | `apps/mobile/app/card/[id].tsx` line 91           |
| M-19 | No input length/format validation on any user-facing text field                  | `sign-up.tsx`, `create-card.tsx`, `edit/[id].tsx` |
| M-20 | `Linking.openURL` called with unsanitized server-supplied email/phone            | `apps/mobile/app/contact/[id].tsx` lines 244, 253 |
| M-21 | `app.json privacy: "public"` exposes OTA update bundles publicly on expo.dev     | `apps/mobile/app.json` line 10                    |
| M-22 | Store metadata describes features not yet implemented (App Store rejection risk) | `apps/mobile/STORE_METADATA.md`                   |

### Smart Contracts

| ID   | Finding                                                                                    | File                                  |
| ---- | ------------------------------------------------------------------------------------------ | ------------------------------------- |
| M-23 | Cancelled subscription retains stale `expiresAt` — off-chain systems may misread state     | `DotlySubscription.sol` lines 60–64   |
| M-24 | Plan switching allows downgrade exploit — user can overwrite paid plan at lower tier price | `DotlySubscription.sol` lines 39–58   |
| M-25 | Non-upgradeable contract — bugs require full redeployment and user migration               | `DotlySubscription.sol`               |
| M-26 | 30-day month approximation loses 5 days per year vs. calendar billing                      | `DotlySubscription.sol` lines 48–49   |
| M-27 | No `Pausable` circuit breaker — cannot halt subscriptions during an incident               | `DotlySubscription.sol`               |
| M-28 | Only 4 happy-path test cases — no boundary, error, or adversarial coverage                 | `contracts/test/DotlySubscription.ts` |
| M-29 | Slither and Mythril not run — checklist items marked incomplete                            | `contracts/SECURITY_AUDIT.md`         |

### Dependencies

| ID   | Finding                                                                                                      | Package                                      |
| ---- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| M-30 | `@xmldom/xmldom@0.7.13` — deprecated with "critical issues" notice                                           | Transitive via Expo                          |
| M-31 | `path-to-regexp@0.1.13` — CVE-2024-45296 ReDoS via Express                                                   | Transitive via NestJS                        |
| M-32 | `@nestjs/bull@11` vs `@nestjs/common@10` major version mismatch                                              | `apps/api`                                   |
| M-33 | Web auth/session flow should be covered by end-to-end tests after the first-party auth migration             | `apps/web`                                   |
| M-34 | Expo SDK 55 module packages (`expo-device`, `expo-image-picker`, `expo-notifications`) used with SDK 51 core | `apps/mobile`                                |
| M-35 | `eslint@8.57.1` — officially deprecated / EOL                                                                | `apps/web`, `apps/mobile`, `packages/config` |
| M-36 | Two TypeScript versions in build toolchain (`5.7.2` and `5.9.3`)                                             | Transitive tooling                           |

---

## LOW — Address in First Quarter

### API

- `SentryExceptionFilter` only captures 500+ errors — 4xx auth failures are silently dropped
- No request ID / correlation ID in error responses
- `HealthModule` does not import `RedisModule` — fragile dependency resolution

### Web

- Missing `Strict-Transport-Security` (HSTS) header in `vercel.json`
- Missing `Content-Security-Policy` header in `vercel.json`

### Mobile

- `expo@~51.0.0` is 39 patch versions behind (latest: 51.0.39)
- Email confirmation deep link not handled (auth flow broken)
- `NfcManager.start()` called on every write instead of once at init
- Plan error detected by string-matching `'403'` instead of typed error code
- `console.log`/`console.error` statements will appear in production builds
- No client-side sign-in rate limiting / lockout after failed attempts
- No client-side image upload size check (camera photos can be 8–15 MB)
- Push notification `contactId` not validated before routing

### Smart Contracts

- Floating `^0.8.20` pragma — lock to `0.8.20` for production
- No `FundsWithdrawn` event on `withdrawUSDC`
- ENTERPRISE plan has misleading error message when price is zero
- Deprecated `polygon_mumbai` network in deploy npm script (use `polygon_amoy`)
- Hardhat local network uses `address(1)` placeholder for USDC

### Dependencies

- `jsonwebtoken` duplicated at `9.0.2` and `9.0.3` — add `pnpm.overrides`
- `lodash` duplicated at `4.17.21` and `4.18.1` — add `pnpm.overrides`
- `glob` present at 7 deprecated versions — transitive, address via toolchain upgrades
- `react-native@0.74.0` — Expo SDK 51 is superseded; plan SDK 53 migration
- `aes-js@4.0.0-beta.5` — beta crypto library in production chain (via ethers)
- Node engine floor should be `>=20.18.1` (not `>=20.0.0`) due to `undici@7` requirement
- `eslint-plugin-react-hooks@5.0.0-canary-...-20230705` — 3-year-old canary in lint toolchain

---

## Positives — Well-Implemented Security Controls

The following were found to be correctly and carefully implemented:

| Area                   | Implementation                                                                                       |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| JWT Security           | Algorithm pinning (ES256 vs HS256), no `ignoreExpiration`, placeholder detection in env validation   |
| Rate Limiting          | ThrottlerGuard applied before JwtAuthGuard — correct ordering                                        |
| File Upload Validation | Magic-byte (libmagic) validation on avatar uploads — rejects mismatched MIME types                   |
| SSRF Protection        | `assertSafeUrl()` guard applied to custom domain and brand config URL fields                         |
| Input Validation       | `class-validator` DTOs throughout the API with documented max lengths                                |
| Injection Prevention   | Log injection sanitization in `AuditService`; email header injection prevention (stripCrLf, escHtml) |
| PII Handling           | Winston logger redacts PII in production; vCard Content-Disposition uses DB-validated handle         |
| Transaction Safety     | Serializable transaction for plan-limit check on card creation (prevents TOCTOU race)                |
| GDPR                   | Export and erasure endpoints with transaction-atomic deletion                                        |
| Team Safety            | Last-admin protection; invite email verification (email must match invite)                           |
| Distributed Systems    | Distributed lock for analytics flush cron prevents multi-pod double-flush                            |
| Headers                | Helmet CSP, strict CORS allowlist, `trust proxy: 1`, 8MB body size limit                             |
| Health                 | Health endpoint does not expose uptime/timestamp fingerprinting data                                 |
| Swagger                | Disabled in production                                                                               |
| Contract               | `nonReentrant` guard on `subscribe()` (highest-value attack surface); `usdc` is `immutable`          |

---

## Launch Blocklist (Absolute Minimum Before Going Live)

These items must be resolved before any production traffic is accepted:

1. **C-01** — Rotate all leaked credentials and remove them from disk
2. **C-02** — Upgrade `next@14.2.4` to a patched version
3. **C-03** — Remove `enterpriseProvisioning: "universal"` from mobile EAS config
4. **H-01** — Add Redis password and bind to loopback only
5. **H-02/H-03** — Fix PgBouncer authentication and host resolution
6. **H-05** — Enforce `https://` in mobile API URL (no localhost fallback)
7. **H-06** — Add deep link parameter validation in mobile
8. **H-12** — Deploy smart contract to mainnet before enabling on-chain billing
9. **H-13** — Use `SafeERC20` in smart contract
10. **H-14** — Restrict `MockUSDC.mint()` and exclude from mainnet deployment
11. **H-15** — Transfer contract ownership to multisig immediately after deploy
12. **H-16** — Fix `openai` package version desync in lock file
13. **H-17** — Move `react` to `peerDependencies` in `packages/ui`
14. **H-18** — Add `NSPhotoLibraryUsageDescription` to `app.json` (iOS crash fix)
15. **H-21** — Set `SENTRY_DSN` in production environment
16. **M-16** — Set real EAS project ID in `app.json`
17. **M-17** — Set real Apple submission credentials (or configure via EAS Secrets)

---

## Recommended `pnpm.overrides` Block

Add to root `package.json` to address transitive dependency risks:

```json
"pnpm": {
  "overrides": {
    "next": ">=14.2.30",
    "openai": "^6.33.0",
    "@xmldom/xmldom": ">=1.0.0",
    "jsonwebtoken": "9.0.3",
    "lodash": "^4.18.1",
    "typescript": "^5.9.3",
    "tar": "^7.0.0",
    "cookie": "^0.7.2",
    "undici": "^6.0.0",
    "path-to-regexp": "^8.0.0"
  }
}
```

---

_This report was generated by automated static analysis and code review. Manual penetration testing and a formal smart contract audit by a certified auditing firm are strongly recommended before handling real user data or on-chain funds._
