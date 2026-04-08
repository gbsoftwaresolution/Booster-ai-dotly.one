# Environment Variables

This document describes every environment variable used across all Dotly.one apps.
Copy the relevant `.env.example` to `.env` in each app directory, fill in the values, and start the server.

---

## `apps/api`

| Variable | Description | Required | Source |
|---|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Unix socket path for local dev) | Yes | Local PostgreSQL / Railway |
| `SUPABASE_URL` | Supabase project URL | Yes | Supabase dashboard → Settings → API |
| `SUPABASE_ANON_KEY` | Supabase public anon key | Yes | Supabase dashboard → Settings → API |
| `SUPABASE_JWT_SECRET` | JWT secret used to verify Supabase-issued tokens | Yes | Supabase dashboard → Settings → API |
| `REDIS_URL` | Redis connection URL | Yes | Local Redis / Railway |
| `MAILGUN_API_KEY` | Mailgun private API key (primary email sender) | Yes | Mailgun dashboard |
| `MAILGUN_DOMAIN` | Mailgun sending domain (e.g. `mg.yourdomain.com`) | Yes | Mailgun dashboard |
| `MAILGUN_FROM_EMAIL` | From address used for Mailgun sends | Yes | Your verified Mailgun domain |
| `AWS_SES_ACCESS_KEY` | AWS IAM access key for SES (fallback email sender) | Yes | AWS IAM console |
| `AWS_SES_SECRET_KEY` | AWS IAM secret key for SES | Yes | AWS IAM console |
| `AWS_SES_REGION` | AWS region where SES is configured | Yes | AWS console (e.g. `us-east-1`) |
| `AWS_SES_FROM_EMAIL` | From address used for SES sends | Yes | AWS SES verified identity |
| `R2_ACCOUNT_ID` | Cloudflare account ID for R2 | Yes | Cloudflare dashboard |
| `R2_ACCESS_KEY_ID` | R2 API token access key ID | Yes | Cloudflare R2 → Manage API tokens |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret | Yes | Cloudflare R2 → Manage API tokens |
| `R2_BUCKET_NAME` | R2 bucket name for file uploads | Yes | Cloudflare R2 (create manually) |
| `R2_PUBLIC_URL` | Public base URL for R2-served assets | Yes | Cloudflare R2 bucket settings |
| `CONTRACT_RPC_URL` | RPC endpoint for the billing smart contract chain | Yes | Chain provider (e.g. Polygon RPC) |
| `CONTRACT_ADDRESS` | Deployed billing smart contract address | Yes | Deployment output |
| `CONTRACT_CHAIN_ID` | EVM chain ID for the billing contract (137 = Polygon) | Yes | Chain documentation |
| `PORT` | Port the API server listens on | No (default: `3001`) | — |
| `NODE_ENV` | Node environment (`development` / `production`) | No (default: `development`) | — |
| `WEB_URL` | Base URL of the web app (used for CORS and email links) | Yes | `http://localhost:3000` locally |

---

## `apps/web`

| Variable | Description | Required | Source |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (browser-visible) | Yes | Supabase dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key (browser-visible) | Yes | Supabase dashboard → Settings → API |
| `NEXT_PUBLIC_API_URL` | Base URL of the NestJS API | Yes | `http://localhost:3001` locally |
| `NEXT_PUBLIC_APP_URL` | Base URL of this web app | Yes | `http://localhost:3000` locally |
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | Billing smart contract address (browser-visible) | Yes | Deployment output |
| `NEXT_PUBLIC_CONTRACT_CHAIN_ID` | EVM chain ID for billing contract (browser-visible) | No (default: `137`) | Chain documentation |

---

## `apps/mobile`

| Variable | Description | Required | Source |
|---|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL (bundled into app) | Yes | Supabase dashboard → Settings → API |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key (bundled into app) | Yes | Supabase dashboard → Settings → API |
| `EXPO_PUBLIC_API_URL` | Base URL of the NestJS API | Yes | `http://localhost:3001` locally (use LAN IP on device) |
| `EXPO_PUBLIC_CONTRACT_ADDRESS` | Billing smart contract address (bundled into app) | Yes | Deployment output |
| `EXPO_PUBLIC_CONTRACT_CHAIN_ID` | EVM chain ID for billing contract (bundled into app) | No (default: `137`) | Chain documentation |

---

## Notes

- Variables prefixed with `NEXT_PUBLIC_` are inlined into the Next.js browser bundle at build time — never put secrets in them.
- Variables prefixed with `EXPO_PUBLIC_` are bundled into the Expo app at build time — never put secrets in them.
- Server-only secrets (`SUPABASE_JWT_SECRET`, `MAILGUN_API_KEY`, AWS keys, R2 keys, `CONTRACT_RPC_URL`) must **never** appear in `apps/web` or `apps/mobile` env files.
- `.env` files are git-ignored. Only `.env.example` files are committed. Copy `.env.example` → `.env` and fill in real values locally.
