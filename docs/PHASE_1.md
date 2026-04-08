# Phase 1 — Foundation

**Duration:** Weeks 1–3
**Goal:** Establish the complete technical foundation — monorepo, database, API scaffold, auth,
web shell, and mobile shell — so that every Phase 2 product feature can be built on a solid,
tested base with no rework.

**Definition of done:** Every task below has its acceptance criteria met. CI passes on all
workspaces. A developer can clone the repo, run `pnpm install && turbo dev`, and have the API,
web dashboard, and mobile app all running locally with auth working end-to-end.

---

## Task List

### T1 — Monorepo Setup

**Description:**
Initialize the Turborepo monorepo with pnpm workspaces. Configure the build pipeline so all
apps and packages can be built, linted, and type-checked in a single command.

**Steps:**
- [ ] Initialize repo with `pnpm init` and `pnpm add -D turbo` at root
- [ ] Create `pnpm-workspace.yaml` defining `apps/*` and `packages/*`
- [ ] Create `turbo.json` with `build`, `lint`, `typecheck`, and `dev` pipeline tasks
- [ ] Scaffold empty workspace directories: `apps/web`, `apps/api`, `apps/mobile`,
      `packages/ui`, `packages/types`, `packages/database`, `packages/config`
- [ ] Add root `.gitignore` covering `node_modules`, `.turbo`, `.env`, `dist`, `.next`, `.expo`
- [ ] Configure root `tsconfig.base.json` with strict mode, path aliases, and composite project refs
- [ ] Add `packages/config` with shared ESLint config (`eslint-config-dotly`) and
      shared Prettier config

**Acceptance Criteria:**
- [ ] `pnpm install` completes with no errors from repo root
- [ ] `turbo build` runs across all workspaces and exits 0 (even with empty packages)
- [ ] `turbo lint` runs ESLint across all workspaces using shared config
- [ ] `turbo typecheck` runs `tsc --noEmit` across all workspaces
- [ ] No circular dependency warnings in Turborepo output

---

### T2 — Shared Packages Scaffold

**Description:**
Create the three shared packages that the API, web, and mobile apps all depend on. These must
be wired up before any app code is written.

**Steps:**
- [ ] `packages/types` — Create `index.ts` with initial shared enums and interfaces:
  - `Plan` enum: `FREE | PRO | BUSINESS | ENTERPRISE`
  - `CardTemplate` enum: `MINIMAL | BOLD | CREATIVE | CORPORATE`
  - `ContactStage` enum: `NEW | CONTACTED | QUALIFIED | CLOSED | LOST`
  - `AnalyticsEventType` enum: `VIEW | CLICK | SAVE | LEAD_SUBMIT`
  - `CreateCardDto`, `UpdateCardDto`, `CreateContactDto` interfaces
- [ ] `packages/ui` — Stub with a single `Button` component (React, Tailwind) as proof-of-concept
      that the shared renderer concept works
- [ ] Wire `packages/types` as a dependency in `apps/api`, `apps/web`, `apps/mobile`

**Acceptance Criteria:**
- [ ] `import { Plan } from '@dotly/types'` works in both `apps/api` and `apps/web` with no errors
- [ ] `turbo typecheck` passes with the new package imports
- [ ] No `any` types in `packages/types`

---

### T3 — Database Schema & Prisma Setup

**Description:**
Define the complete Prisma schema for all core entities. Run the initial migration and create
a seed script with test data.

**Steps:**
- [ ] Initialize Prisma in `packages/database`: `prisma init`
- [ ] Write `schema.prisma` with all core models:
  - `User` — id, email, name, avatarUrl, plan, stripeCustomerId, createdAt
  - `Card` — id, userId, handle (unique), templateId, fields (Json), isActive, createdAt
  - `CardTheme` — id, cardId, primaryColor, secondaryColor, fontFamily, backgroundUrl, logoUrl
  - `SocialLink` — id, cardId, platform, url, displayOrder
  - `MediaBlock` — id, cardId, type (VIDEO | IMAGE), url, caption, displayOrder
  - `QrCode` — id, cardId, styleConfig (Json), shortUrl
  - `AnalyticsEvent` — id, cardId, type, metadata (Json), ipHash, createdAt
  - `Contact` — id, ownerUserId, name, email, phone, company, sourceCardId, createdAt
  - `CrmPipeline` — id, contactId, stage, notes, tags (String[]), ownerUserId, updatedAt
  - `Subscription` — id, userId, plan, status, stripeSubId, currentPeriodEnd
  - `CustomDomain` — id, userId, domain, isVerified, sslStatus, txtRecord
  - `Team` — id, name, ownerUserId, brandConfig (Json)
  - `TeamMember` — id, teamId, userId, role (ADMIN | MEMBER)
- [ ] Add all required Prisma relations and indexes (cardId, userId, handle, domain)
- [ ] Run `prisma migrate dev --name init` to generate the initial migration
- [ ] Write `seed.ts` script creating:
  - 1 test user with FREE plan
  - 1 card with handle `test-user`, MINIMAL template, sample social links
  - 3 analytics events
  - 2 contacts with CRM pipeline entries

**Acceptance Criteria:**
- [ ] `prisma migrate dev` runs with no errors and generates migration SQL
- [ ] `prisma db seed` runs and inserts test data without errors
- [ ] `prisma studio` opens and shows all 13 tables with the correct columns
- [ ] All relations are correct (no Prisma validation warnings)
- [ ] `handle` field on `Card` has a unique index
- [ ] `domain` field on `CustomDomain` has a unique index

---

### T4 — NestJS API Scaffold

**Description:**
Bootstrap the NestJS application with the core module structure, Supabase JWT guard, global
configuration, and a health check endpoint.

**Steps:**
- [ ] Create `apps/api` with NestJS CLI: `nest new api --package-manager pnpm`
- [ ] Install and configure dependencies:
  - `@nestjs/config` — environment variables via `ConfigModule.forRoot()`
  - `@nestjs/swagger` — OpenAPI docs at `/api/docs`
  - `@supabase/supabase-js` — for JWT verification
  - `@prisma/client` — import from `packages/database`
  - `class-validator` + `class-transformer` — DTO validation
- [ ] Create module structure:
  - `AppModule` — root module, imports all feature modules
  - `PrismaModule` — global Prisma service wrapping `PrismaClient`
  - `AuthModule` — Supabase JWT strategy + `JwtAuthGuard`
  - `UsersModule` — stub for user profile endpoints
  - `CardsModule` — stub for card CRUD endpoints
  - `HealthModule` — `GET /health` endpoint
- [ ] Implement `SupabaseJwtStrategy`:
  - Extract Bearer token from `Authorization` header
  - Verify JWT using Supabase JWT secret (`SUPABASE_JWT_SECRET` env var)
  - Attach decoded user payload to `request.user`
- [ ] Apply `JwtAuthGuard` globally with `APP_GUARD` provider
- [ ] Add `HealthController` with `GET /health` returning `{ status: 'ok', timestamp: ISO_STRING }`
- [ ] Configure global validation pipe: `new ValidationPipe({ whitelist: true, transform: true })`
- [ ] Configure CORS for web app origin

**Acceptance Criteria:**
- [ ] `pnpm --filter api dev` starts the server on port 3001 with no errors
- [ ] `GET http://localhost:3001/health` returns `200 { status: 'ok', timestamp: '...' }`
- [ ] `GET http://localhost:3001/users/me` without a token returns `401 Unauthorized`
- [ ] `GET http://localhost:3001/users/me` with a valid Supabase JWT returns `200`
- [ ] `GET http://localhost:3001/api/docs` renders Swagger UI with all documented endpoints
- [ ] Sending a DTO with an invalid field returns `400 Bad Request` with validation messages

---

### T5 — Supabase Auth Integration

**Description:**
Set up the Supabase project and wire auth into both the NestJS API (JWT validation) and the
Next.js web app (session management). Configure Google OAuth provider.

**Steps:**
- [ ] Create Supabase project in the dashboard, note `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- [ ] Enable Google OAuth provider in Supabase Auth settings
- [ ] Enable Email/Password auth provider
- [ ] Note `SUPABASE_JWT_SECRET` from Project Settings → API
- [ ] Add `.env.example` to `apps/api`:
  ```
  DATABASE_URL=
  SUPABASE_URL=
  SUPABASE_ANON_KEY=
  SUPABASE_JWT_SECRET=
  REDIS_URL=
  PORT=3001
  ```
- [ ] Install `@supabase/ssr` and `@supabase/supabase-js` in `apps/web`
- [ ] Create Supabase browser client helper `lib/supabase/client.ts`
- [ ] Create Supabase server client helper `lib/supabase/server.ts` (uses cookies)
- [ ] Create `middleware.ts` in Next.js root to refresh session on every request
- [ ] Create `/auth` route with sign-in (email/password + Google OAuth button) and sign-up forms
- [ ] Create `/auth/callback` route handler for OAuth redirect

**Acceptance Criteria:**
- [ ] A new user can sign up with email + password via the web UI
- [ ] A new user can sign in with Google OAuth via the web UI
- [ ] After sign-in, the Supabase session cookie is set and `middleware.ts` keeps it refreshed
- [ ] The NestJS API correctly validates a JWT token obtained from the Supabase sign-in response
- [ ] A user accessing `/dashboard` while unauthenticated is redirected to `/auth`
- [ ] Token expiry causes automatic session refresh (via `@supabase/ssr` middleware)

---

### T6 — Next.js Web Shell

**Description:**
Bootstrap the Next.js 14 App Router application with Tailwind CSS, Shadcn/UI, the full
route structure, and auth-aware layout.

**Steps:**
- [ ] Create `apps/web` with Next.js: `pnpm create next-app@latest web --typescript --tailwind --app`
- [ ] Install and initialize Shadcn/UI: `pnpm dlx shadcn-ui@latest init`
- [ ] Add Shadcn components: Button, Input, Label, Card, Avatar, Badge, Separator, Dropdown
- [ ] Set up route structure:
  ```
  app/
  ├── (auth)/
  │   ├── auth/
  │   │   ├── page.tsx          # Sign-in / Sign-up
  │   │   └── callback/
  │   │       └── route.ts      # OAuth callback
  ├── (dashboard)/
  │   ├── layout.tsx            # Sidebar + nav layout (auth-protected)
  │   ├── dashboard/
  │   │   └── page.tsx          # My Cards overview
  │   ├── contacts/
  │   │   └── page.tsx          # Contacts + CRM (stub)
  │   └── analytics/
  │       └── page.tsx          # Analytics (stub)
  ├── card/
  │   └── [handle]/
  │       └── page.tsx          # Public card page (SSR)
  └── layout.tsx                # Root layout
  ```
- [ ] Create `(dashboard)/layout.tsx` with sidebar navigation and auth guard
  (redirect to `/auth` if no session)
- [ ] Create stub pages for dashboard, contacts, analytics with placeholder content
- [ ] Create public `card/[handle]` page with SSR fetching card data from the API
- [ ] Add `next.config.ts` with custom domain rewrite support (placeholder for Phase 4)
- [ ] Wire `@dotly/types` import for shared DTOs

**Acceptance Criteria:**
- [ ] `pnpm --filter web dev` starts on port 3000 with no errors
- [ ] Visiting `/dashboard` while unauthenticated redirects to `/auth`
- [ ] Visiting `/dashboard` while authenticated renders the sidebar layout
- [ ] Visiting `/card/test-user` renders the seeded test card data from the API
- [ ] `turbo build` for `apps/web` completes with no TypeScript errors
- [ ] Tailwind classes apply correctly, Shadcn/UI Button component renders

---

### T7 — React Native (Expo) Mobile Shell

**Description:**
Bootstrap the Expo app with navigation, Supabase auth client, and tab structure. The app should
boot, complete auth, and reach the main tab navigator on both iOS and Android.

**Steps:**
- [ ] Create `apps/mobile` with Expo: `pnpm create expo-app mobile --template tabs`
- [ ] Install dependencies:
  - `expo-router` — file-based navigation
  - `@supabase/supabase-js` — auth client
  - `expo-secure-store` — token storage
  - `react-native-url-polyfill` — required by Supabase
  - `nativewind` — Tailwind for React Native
  - `@dotly/types` — shared types
- [ ] Configure NativeWind with `tailwind.config.js`
- [ ] Set up route structure using Expo Router:
  ```
  app/
  ├── _layout.tsx               # Root layout with auth check
  ├── (auth)/
  │   ├── _layout.tsx
  │   └── sign-in.tsx           # Sign-in screen
  └── (tabs)/
      ├── _layout.tsx           # Tab bar layout
      ├── index.tsx             # My Cards tab
      ├── contacts.tsx          # Contacts tab
      ├── analytics.tsx         # Analytics tab
      └── settings.tsx          # Settings tab
  ```
- [ ] Create Supabase client for React Native with `expo-secure-store` adapter
- [ ] Implement auth flow: unauthenticated → redirect to `(auth)/sign-in`
- [ ] Add email/password sign-in on the sign-in screen (Google OAuth in Phase 2)
- [ ] Each tab renders a stub screen with the tab title and a placeholder message
- [ ] Wire API base URL via `EXPO_PUBLIC_API_URL` environment variable

**Acceptance Criteria:**
- [ ] App boots on iOS Simulator without crashing
- [ ] App boots on Android Emulator without crashing
- [ ] Unauthenticated launch shows the sign-in screen
- [ ] Sign-in with valid test credentials navigates to the tab navigator
- [ ] All 4 tabs (Cards, Contacts, Analytics, Settings) are reachable and render without errors
- [ ] `EXPO_PUBLIC_API_URL` is read from `.env` and logged on app start (confirm wiring)
- [ ] `@dotly/types` import resolves correctly in mobile app

---

### T8 — CI/CD Foundation

**Description:**
Set up GitHub Actions to run lint, typecheck, and build on every pull request. The pipeline
must fail fast on any code quality issue.

**Steps:**
- [ ] Create `.github/workflows/ci.yml` with the following jobs:
  - `lint` — runs `turbo lint` across all workspaces
  - `typecheck` — runs `turbo typecheck` across all workspaces
  - `build` — runs `turbo build` for `apps/api` and `apps/web`
    (mobile build excluded from CI for now — requires native toolchain)
- [ ] Configure `pnpm` caching in the workflow for faster runs
- [ ] Configure Turborepo remote cache (optional, set up if Vercel account is available)
- [ ] Add branch protection rule: require CI to pass before merge to `main`
- [ ] Add `.github/pull_request_template.md` with checklist:
  ```
  - [ ] CI passes
  - [ ] No new `any` types
  - [ ] Acceptance criteria met (link to task)
  - [ ] Self-reviewed
  ```

**Acceptance Criteria:**
- [ ] Opening a PR triggers the CI workflow automatically
- [ ] Introducing a TypeScript error causes `typecheck` job to fail with a clear error message
- [ ] Introducing an ESLint violation causes `lint` job to fail with the rule name
- [ ] A clean PR passes all three jobs (lint, typecheck, build)
- [ ] CI run completes in under 3 minutes with pnpm cache warm

---

### T9 — Environment & Secrets Management

**Description:**
Document all required environment variables across all apps and create `.env.example` files
so any developer can onboard without asking for values.

**Steps:**
- [ ] Create `apps/api/.env.example`:
  ```
  # Database
  DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/dotly

  # Supabase
  SUPABASE_URL=https://YOUR_PROJECT.supabase.co
  SUPABASE_ANON_KEY=
  SUPABASE_JWT_SECRET=

  # Redis
  REDIS_URL=redis://localhost:6379

  # Stripe
  STRIPE_SECRET_KEY=
  STRIPE_WEBHOOK_SECRET=

  # Resend (email)
  RESEND_API_KEY=

  # App
  PORT=3001
  NODE_ENV=development
  WEB_URL=http://localhost:3000
  ```
- [ ] Create `apps/web/.env.example`:
  ```
  # Supabase
  NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=

  # API
  NEXT_PUBLIC_API_URL=http://localhost:3001

  # App
  NEXT_PUBLIC_APP_URL=http://localhost:3000
  ```
- [ ] Create `apps/mobile/.env.example`:
  ```
  # Supabase
  EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
  EXPO_PUBLIC_SUPABASE_ANON_KEY=

  # API
  EXPO_PUBLIC_API_URL=http://localhost:3001
  ```
- [ ] Confirm all `.env` files are in `.gitignore`
- [ ] Add a brief `docs/ENVIRONMENT.md` describing each variable, its source, and whether it is
  required or optional

**Acceptance Criteria:**
- [ ] No `.env` files with real secrets exist in the repo
- [ ] All `.env.example` files are committed and contain every variable the app reads
- [ ] A developer can copy `.env.example` to `.env`, fill in Supabase values from the dashboard,
  and start all three apps without hitting a missing-variable error
- [ ] `process.env.SOME_VAR` calls without a fallback that are not in `.env.example` are treated
  as a lint/review failure

---

## Phase 1 — Definition of Done

The phase is complete when all of the following are true:

- [ ] All 9 tasks above have every acceptance criterion checked
- [ ] `git clone → pnpm install → turbo dev` brings up API (3001), web (3000), and Expo dev
  server with no manual intervention beyond copying `.env.example`
- [ ] Auth works end-to-end: sign up → sign in → JWT validated by API → dashboard accessible
- [ ] `GET /card/test-user` on the web renders the seeded test card data
- [ ] CI passes on a clean PR with all three jobs green
- [ ] No `TODO` or `FIXME` comments left untracked (open GitHub issues for any deferred items)
- [ ] Phase 2 can begin immediately without any foundation rework

---

## Dependencies & Blockers

| Dependency | Owner | Needed by |
|---|---|---|
| Supabase project created | Team lead | T4, T5, T6, T7 |
| PostgreSQL instance available (local or Railway) | Dev | T3, T4 |
| Redis instance available (local or Railway) | Dev | T4 |
| GitHub repo created with branch protection | Team lead | T8 |
| Stripe account (test mode keys) | Team lead | T9 (keys only, no billing logic in Phase 1) |

---

## Notes

- Redis is wired up in Phase 1 but the analytics event queue is not implemented until Phase 2.
  The Redis connection is established and health-checked in the API to avoid surprises later.
- Stripe keys are added to `.env.example` in Phase 1 but Stripe billing logic is implemented
  in Phase 3.
- The Expo mobile app uses email/password only in Phase 1. Google OAuth for mobile is deferred
  to Phase 2 (requires Expo Auth Session setup and app scheme configuration).
- The shared `packages/ui` card renderer component is a stub in Phase 1. The full renderer
  is built in Phase 2 alongside the card builder.

---

*Phase 1 of 4 — Dotly.one*
*Next: [Phase 2 — Core MVP] (coming after Phase 1 is complete)*
