# Dotly.one — Project Context

## Vision

Dotly.one is a world-class Digital Smart Business Card platform that goes beyond simple contact sharing.
Where every competitor stops at sharing a card, Dotly.one closes the loop — turning connections into
pipeline, and pipeline into customers.

**Tagline:** *Tap. Share. Convert.*

**Core belief:** A business card is not just an introduction. It is the first step of a sales relationship.
Dotly.one is the only digital card platform that treats it that way — with a built-in CRM pipeline,
rich media embeds, and deep analytics baked in from day one.

---

## The Problem

Current digital business card tools (HiHello, Blinq, Popl, BusinessBay) all stop at sharing contact
info and routing leads out to third-party CRMs. This creates friction:

- SMBs and solopreneurs do not want to pay for HubSpot just to track card-scan leads
- Freelancers and consultants want their card to function as a micro landing page, not just a vCard
- Agencies want to white-label a card solution for clients without building one from scratch
- Sales teams want to know who viewed their card, clicked a link, and whether to follow up

Dotly.one solves all of this in a single platform.

---

## Target Audience

| Segment | Pain Point Solved |
|---|---|
| Solopreneurs & freelancers | Rich card with video, portfolio, and booking link in one place |
| Consultants & coaches | Lead capture + inbuilt pipeline to track prospects |
| Small sales teams (2–20 reps) | Team card management + CRM without separate tool costs |
| Agencies | White-label resell to clients |
| SMBs (10–200 employees) | Team cards + analytics + branded experience |

---

## Competitive Position

Dotly.one differentiates from the market in five specific ways:

### 1. Inbuilt CRM Pipeline (Unique in market)
No competitor offers a built-in Kanban pipeline. HiHello, Blinq, and Popl all route leads to
external CRMs. Dotly.one keeps the full loop — card scan → lead → pipeline stage → closed — in
one product. Targeted at users who do not want another SaaS tool.

### 2. Rich Media Card Page
Dotly.one cards support embedded YouTube/Vimeo videos, image portfolio galleries, and Calendly/Cal.com
booking buttons. Competitors render plain profile + links. Dotly.one turns the card into a
micro landing page.

### 3. Custom Domain Support
HiHello, Blinq, and Popl do not offer custom domains. Dotly.one allows paid users to point
`yourname.com` or `team.yourcompany.com` to their card.

### 4. White Label for Agencies
Enterprise tier supports full white labeling — custom branding, own domain, and resale to clients.
No major competitor offers this clearly.

### 5. Monorepo Shared Renderer
A shared `packages/ui` card renderer ensures pixel-identical rendering across the web dashboard,
public card page, and React Native mobile app — something competitors typically fail at due to
divergent codebases.

---

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Monorepo | Turborepo + pnpm workspaces | Fast incremental builds, shared packages |
| Web Frontend | Next.js 14 (App Router) | SSR for public card pages (SEO critical), fast DX |
| Styling | Tailwind CSS + Shadcn/UI | Rapid UI, consistent design system |
| Mobile App | React Native (Expo SDK 51+) | One codebase iOS + Android, shares types with web |
| Backend API | NestJS (TypeScript) | Modular, scalable, first-class DI and guard system |
| ORM | Prisma | Type-safe DB access, clean migrations |
| Database | PostgreSQL | Relational, ACID, proven for structured card/CRM data — Local: host=localhost, user=naveenprasath-p, db=dotly_one |
| Auth | Supabase Auth | Managed JWT, Google + LinkedIn OAuth, minimal setup |
| File Storage | Cloudflare R2 | S3-compatible object storage for avatars, logos, portfolio images, QR exports |
| Cache / Queue | Redis | Analytics event queue, session cache — Local Redis: localhost:6379 |
| Email | Mailgun (primary) + Amazon SES (fallback) | Transactional email with automatic failover (lead notifications, billing) |
| Payments | Smart Contract (EVM/Solidity on Polygon or Base) | Crypto-based subscription billing with USDC/ETH, on-chain plan verification |
| Deployment | Vercel (web), Railway (API + Redis) | Zero-config deploy, auto SSL |
| Monitoring | Sentry + PostHog | Error tracking, product analytics |

---

## Monorepo Structure

```
Dotly.one/
├── apps/
│   ├── web/                  # Next.js 14 — dashboard + public card pages
│   ├── mobile/               # React Native (Expo) — iOS + Android app
│   └── api/                  # NestJS — REST API
├── packages/
│   ├── ui/                   # Shared card renderer + base components
│   ├── types/                # Shared TypeScript types, DTOs, enums
│   ├── database/             # Prisma schema, migrations, seed
│   └── config/               # Shared ESLint, Prettier, Tailwind config
├── docs/                     # Project documentation
├── infra/                    # Docker compose, deployment scripts
├── turbo.json                # Turborepo pipeline config
├── pnpm-workspace.yaml       # pnpm workspace definition
└── package.json              # Root package.json
```

---

## Core Features

### 1. Custom Card Builder
- Template gallery (minimal, bold, creative, corporate)
- Drag-and-drop field editor: name, title, company, phone, email, website, bio, address
- Logo and avatar upload, background images, custom colors and fonts
- Live preview rendered by shared `packages/ui` card renderer
- Mobile-responsive card output

### 2. QR Code & NFC Sharing
- Styled QR code with optional logo watermark
- Short URL: `dotly.one/handle` (free) or `yourdomain.com` (paid)
- NFC deep link — write card URL to NFC tag via Expo NFC module
- Downloadable QR code (PNG/SVG), printable sheet

### 3. Public Card Page
- SSR via Next.js App Router for SEO and fast load
- Open Graph tags (name, photo, title for link previews)
- Mobile-optimized layout
- "Save to Contacts" button — generates `.vcf` file
- Custom domain routing via Next.js middleware + DNS TXT record verification
- Optional lead capture form (visitor leaves their details)

### 4. Social Links & Media Embeds
- Supported platforms: LinkedIn, Twitter/X, Instagram, GitHub, YouTube, TikTok, WhatsApp,
  Facebook, Calendly, Cal.com, custom URL
- Embedded YouTube/Vimeo video block
- Portfolio image gallery (up to 6 images on free, unlimited on Pro+)
- "Book a meeting" CTA button (Calendly / Cal.com integration)

### 5. Analytics Dashboard
- Real-time view counter per card
- Click tracking per social link and CTA button
- Device type, country, and referrer breakdown
- Time-series chart: views and saves over 7 / 30 / 90 days
- Lead capture submission table with export (Pro+)

### 6. Contact Exchange / Lead Capture
- Visitor fills mini-form on card page → stored as a contact record
- Card owner receives email notification via Mailgun/SES
- CRM entry created automatically for each lead
- QR scan source tracked (which card, which event)

### 7. Inbuilt CRM Pipeline
- Contact list with tags, notes, phone, email, source
- Kanban board: `New → Contacted → Qualified → Closed / Lost`
- Contact detail page: full interaction timeline, notes editor
- CSV export of all contacts (Pro+)
- Bulk tag and stage management

### 8. Team Management (Business+)
- Admin dashboard to create and manage team member cards
- Brand lock: enforce logo, colors, and font across all team cards
- Bulk card creation and invite by email
- Per-user analytics aggregated at team level

---

## Monetization

| Plan | Price | Cards | Key Features |
|---|---|---|---|
| Free | $0/mo | 1 | Path-based URL, basic analytics (7 days), 3 social links |
| Pro | $9/mo | 3 | Custom branding, 90-day analytics, lead capture, full CRM, portfolio embeds |
| Business | $29/mo | 10 | Custom domain, team management, team analytics, CSV export, priority support |
| Enterprise | Custom | Unlimited | White label, SSO, SCIM, API access, SLA, dedicated onboarding |

Annual billing: 2 months free (effective 17% discount).

---

## Database Entities (High-Level)

| Entity | Purpose |
|---|---|
| `users` | Account, plan, on-chain wallet address / subscription reference |
| `cards` | Card definition, handle, template, field data (JSON), active status |
| `card_themes` | Colors, fonts, background, logo URL per card |
| `social_links` | Platform, URL, display order per card |
| `media_blocks` | Video embeds, portfolio images per card |
| `qr_codes` | QR style config, short URL per card |
| `analytics_events` | View / click / save events with metadata (device, country, referrer) |
| `contacts` | Lead capture submissions, manual contacts, source card reference |
| `crm_pipeline` | Stage, notes, tags, owner, linked contact |
| `subscriptions` | Plan, status, on-chain contract subscription ID, billing period |
| `custom_domains` | Domain, DNS verification status, SSL status per user |
| `teams` | Team name, owner, brand config |
| `team_members` | User ↔ Team relationship with role |

---

## Development Phases Overview

| Phase | Duration | Deliverable |
|---|---|---|
| Phase 1 — Foundation | Weeks 1–3 | Monorepo, NestJS scaffold, Prisma schema, Supabase auth, Next.js shell, Expo shell, CI |
| Phase 2 — Core MVP | Weeks 4–7 | Card builder, public card page, QR generation, social links, basic analytics |
| Phase 3 — Growth Features | Weeks 8–11 | Lead capture, inbuilt CRM, analytics dashboard, Smart Contract billing, email signatures |
| Phase 4 — Polish & Scale | Weeks 12–15 | Custom domains, NFC writing, mobile push, white label, E2E tests, production deploy |
| Phase 5 — Production Hardening & AI | Weeks 16–20 | AI card suggestions, smart follow-up nudges, abuse detection, infra scaling, SLA hardening |

---

## Key Design Principles

1. **Shared renderer** — `packages/ui` card component renders identically on web, mobile, and in SSR
   card pages. No divergence in visual output.

2. **Analytics queue** — Events are written to Redis and flushed to PostgreSQL in batches to avoid
   write storms during viral card shares.

3. **Plan enforcement at API level** — All feature gates are enforced in NestJS guards/decorators,
   not just in the frontend. The frontend reflects the gate but does not control it.

4. **SSR for public pages** — All `/card/[handle]` pages are server-rendered for SEO and load speed.
   The dashboard is client-rendered via React.

5. **Custom domains via middleware** — Next.js middleware intercepts requests on custom domains,
   maps them to the correct card handle, and renders the same public card page SSR component.

6. **Security first** — JWT validation on every API route, row-level data scoping by `user_id`,
   signed Cloudflare R2 URLs for all media, Smart Contract billing webhook/event verification.

---

*Last updated: Updated April 2026 — stack corrected: crypto billing, R2 storage, Mailgun/SES email, 5 phases*
