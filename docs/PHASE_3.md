# Phase 3 — Growth Features

**Duration:** Weeks 8–11
**Goal:** Activate monetization and ship the core CRM differentiator. By the end of Phase 3 the
platform accepts real payments, enforces plan-level feature gates at the API layer, sends transactional
emails, and gives users a full analytics dashboard, an inbuilt Kanban CRM pipeline, and team
management — making Dotly.one self-sustaining and meaningfully ahead of every competitor.

**Definition of done:** Every task below has its acceptance criteria met. Stripe billing is live in
test mode (and promoted to live mode before phase close). A Pro subscriber can upgrade via Stripe
Checkout, receive a confirmation email, view 90-day analytics, manage contacts through the Kanban
board, and invite a team member (Business plan). All plan gates are enforced at the NestJS API layer.

---

## Task List

---

### T17 — Stripe Billing & Subscription Management

**Description:**
Integrate Stripe as the billing layer for all paid plans. Create Stripe products and prices for
the Free, Pro, Business, and Enterprise tiers with both monthly and annual billing options. Expose
Checkout and Customer Portal endpoints from the NestJS API, handle all critical webhook events to
keep the database in sync, and enforce plan limits via a `PlanGuard` that blocks API calls when a
feature is not available on the user's current plan. Ship the Pricing page and the Billing section
in Settings on the web app. Apply a 14-day Pro trial on sign-up with no credit card required.

**Steps:**

_Stripe product & price configuration_
- [ ] In the Stripe dashboard (test mode), create four products:
  - `Dotly Free` — no price attached (plan tracked in DB only)
  - `Dotly Pro` — monthly price $9.00/mo (`price_pro_monthly`), annual price $90.00/yr
    (`price_pro_annual`, effective $7.50/mo — 2 months free)
  - `Dotly Business` — monthly price $29.00/mo (`price_business_monthly`), annual price
    $290.00/yr (`price_business_annual`, effective $24.17/mo — 2 months free)
  - `Dotly Enterprise` — no fixed price; handled via Stripe quotes / custom invoicing
- [ ] Record all Stripe Price IDs in `apps/api/.env` as:
  ```
  STRIPE_PRICE_PRO_MONTHLY=
  STRIPE_PRICE_PRO_ANNUAL=
  STRIPE_PRICE_BUSINESS_MONTHLY=
  STRIPE_PRICE_BUSINESS_ANNUAL=
  ```
- [ ] Add `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PUBLISHABLE_KEY` to
  `apps/api/.env.example` and `apps/web/.env.example`

_NestJS — BillingModule_
- [ ] Create `apps/api/src/billing/billing.module.ts` importing `StripeService`, `BillingController`
- [ ] Create `apps/api/src/billing/stripe.service.ts`:
  - Initialize `stripe` client using `STRIPE_SECRET_KEY` via `ConfigService`
  - Method `createCustomer(email, name)` — creates a Stripe customer, stores `stripeCustomerId`
    on the `User` record
  - Method `createCheckoutSession(userId, priceId, isAnnual)`:
    - Looks up or creates Stripe customer for user
    - Creates Stripe Checkout session with `mode: 'subscription'`
    - Sets `trial_period_days: 14` for first-time Pro subscriptions where no prior subscription
      exists
    - Sets `success_url` and `cancel_url` pointing back to `/dashboard/settings/billing`
  - Method `createPortalSession(userId)` — creates Stripe Billing Portal session for the user's
    customer ID
- [ ] Create `apps/api/src/billing/billing.controller.ts` with:
  - `POST /billing/checkout` — protected by `JwtAuthGuard`; accepts `{ priceId: string }` body;
    returns `{ url: string }` (Stripe Checkout URL)
  - `POST /billing/portal` — protected by `JwtAuthGuard`; returns `{ url: string }` (Portal URL)
  - `POST /billing/webhook` — **not** protected by `JwtAuthGuard`; receives raw body; verifies
    Stripe signature using `stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)`;
    returns `400` if signature verification fails

_Webhook event handlers_
- [ ] Handle `checkout.session.completed`:
  - Extract `subscription` and `customer` from the session object
  - Upsert `Subscription` record: set `stripeSubId`, `plan` (derive from price metadata),
    `status: 'active'`, `currentPeriodEnd`
  - Update `User.plan` to the subscribed plan
- [ ] Handle `customer.subscription.updated`:
  - Update `Subscription.status`, `plan`, `currentPeriodEnd`
  - Update `User.plan` to reflect new plan (handles upgrade, downgrade, and trial conversion)
- [ ] Handle `customer.subscription.deleted`:
  - Set `Subscription.status: 'cancelled'`
  - Downgrade `User.plan` to `FREE`
- [ ] Handle `invoice.payment_failed`:
  - Set `Subscription.status: 'past_due'`
  - Log the failure; trigger `EmailService.sendPaymentFailedEmail()` (see T20)
- [ ] All webhook handlers run inside a try/catch; log errors to Sentry; always return `200` to
  Stripe to prevent retries on non-critical processing errors

_PlanGuard_
- [ ] Create `apps/api/src/auth/plan.guard.ts`:
  - Decorator `@RequirePlan(...plans: Plan[])` — attaches metadata listing the minimum required plans
  - `PlanGuard` reads `request.user.plan` and compares against the required plan list
  - Returns `403 Forbidden` with body `{ message: 'Upgrade required', requiredPlan: '...' }` if
    the user's plan is not in the allowed list
  - `ENTERPRISE` always passes all plan gates
- [ ] Register `PlanGuard` as a global guard alongside `JwtAuthGuard` in `AppModule`
- [ ] Apply `@RequirePlan(Plan.PRO, Plan.BUSINESS, Plan.ENTERPRISE)` to: analytics history > 7 days,
  lead export, CRM, team features (documented inline at each controller)

_14-day trial_
- [ ] On user sign-up (`POST /auth/register` or Supabase webhook), create a `Subscription` record
  with `plan: PRO`, `status: 'trialing'`, `trialEndsAt: now + 14 days`
- [ ] `PlanGuard` treats `status: 'trialing'` as equivalent to the trial plan for gate checks
- [ ] When `customer.subscription.updated` fires with `status: 'trialing'` → `'active'` or
  `'cancelled'`, update the record accordingly

_Web — Pricing page_
- [ ] Create `apps/web/app/(marketing)/pricing/page.tsx`:
  - Full-page plan comparison table with columns: Free / Pro / Business / Enterprise
  - Feature rows: cards, analytics history, lead capture, CRM, team management, custom domain,
    white label, priority support
  - Monthly / Annual toggle at the top — toggling updates prices displayed and the price IDs
    passed to the checkout endpoint
  - "Get Started" CTA for Free (links to `/auth`)
  - "Start Free Trial" CTA for Pro (calls `POST /billing/checkout` with Pro monthly price)
  - "Contact Sales" CTA for Enterprise (mailto: link)
  - Highlight "Most Popular" badge on Pro plan
  - Annual billing note: "Save 2 months — billed annually"

_Web — Billing settings_
- [ ] Create `apps/web/app/(dashboard)/dashboard/settings/billing/page.tsx`:
  - Current plan badge (Free / Pro / Business / Enterprise) with trial countdown if applicable
  - Next billing date (from `Subscription.currentPeriodEnd`)
  - "Manage Billing" button → calls `POST /billing/portal`, redirects to Stripe portal URL
  - "Upgrade" button (shown when on Free or lower plan) → links to `/pricing`
  - "Cancel Plan" link → opens Stripe portal (same as Manage Billing)
  - Plan feature summary for the current plan
- [ ] Update `apps/web/.env.example`:
  ```
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
  ```

_Test mode / live mode_
- [ ] All Stripe keys in development point to Stripe test mode
- [ ] Add note in `docs/ENVIRONMENT.md` to swap to live keys before production deploy
- [ ] Use Stripe CLI (`stripe listen --forward-to localhost:3001/billing/webhook`) for local
  webhook testing and document the command in `docs/ENVIRONMENT.md`

**Acceptance Criteria:**
- [ ] `POST /billing/checkout` with a valid JWT and a Pro monthly price ID returns a Stripe
  Checkout URL and redirects correctly in the browser
- [ ] Completing the Stripe Checkout flow (test card `4242 4242 4242 4242`) updates the user's plan
  to `PRO` and creates a `Subscription` record in the database
- [ ] `POST /billing/portal` returns a valid Stripe Customer Portal URL for the authenticated user
- [ ] `POST /billing/webhook` with an invalid signature returns `400 Bad Request`
- [ ] `POST /billing/webhook` for `customer.subscription.deleted` downgrades the user to `FREE`
- [ ] `POST /billing/webhook` for `invoice.payment_failed` sets subscription status to `past_due`
- [ ] A Free-plan user calling an endpoint decorated with `@RequirePlan(Plan.PRO)` receives
  `403 Forbidden` with the upgrade message
- [ ] A Pro-plan user passes the same guard
- [ ] A new user signing up has a 14-day Pro trial automatically created
- [ ] The `/pricing` page renders correctly with monthly/annual toggle and correct prices
- [ ] The `/dashboard/settings/billing` page shows current plan, next billing date, and correct CTAs
- [ ] Annual prices reflect 2-months-free discount (displayed as monthly equivalent)
- [ ] `turbo build` passes with no TypeScript errors after all billing code is added

---

### T18 — Full Analytics Dashboard (apps/web)

**Description:**
Build the full analytics dashboard at `/dashboard/analytics`. Replace the stub from Phase 1 with
a rich, interactive dashboard featuring date range selection, per-card switching, time-series
charts, device and country breakdowns, a referrer table, a sortable leads table with CSV export,
and a stats summary row. All chart data is fetched from a single parameterized API endpoint.
Analytics history depth is gated by plan via `PlanGuard`.

**Steps:**

_API — analytics query endpoint_
- [ ] Add `GET /cards/:id/analytics` to `CardsController` (or a dedicated `AnalyticsController`):
  - Query params: `from` (ISO date), `to` (ISO date), `metrics[]` (array: `views`, `clicks`,
    `devices`, `countries`, `referrers`, `leads`)
  - Validate that the requesting user owns the card (or is a team member with access)
  - Apply plan-based date range cap:
    - `FREE` — maximum 7 days history; return `403` if `from` is older than 7 days
    - `PRO` — maximum 90 days
    - `BUSINESS` / `ENTERPRISE` — unlimited history
  - Query `AnalyticsEvent` table, filter by `cardId` and `createdAt` between `from` and `to`
  - Aggregate and return:
    ```json
    {
      "summary": {
        "totalViews": 0,
        "uniqueVisitors": 0,
        "totalClicks": 0,
        "totalLeads": 0,
        "conversionRate": 0.0
      },
      "views": [{ "date": "2026-04-01", "views": 0, "saves": 0 }],
      "clicks": [{ "linkId": "...", "label": "LinkedIn", "clicks": 0 }],
      "devices": [{ "type": "mobile", "count": 0 }],
      "countries": [{ "country": "US", "views": 0 }],
      "referrers": [{ "referrer": "linkedin.com", "count": 0 }],
      "leads": [{ "id": "...", "name": "...", "email": "...", "sourceCard": "...", "createdAt": "..." }]
    }
    ```
  - `uniqueVisitors` is estimated as `COUNT(DISTINCT ipHash)` within the date range
  - `conversionRate` is computed as `(totalLeads / totalViews) * 100`, rounded to 2 decimal places

_Web — route and layout_
- [ ] Create `apps/web/app/(dashboard)/dashboard/analytics/page.tsx` as a client component
- [ ] Install `recharts` (or `@tremor/react`) in `apps/web`: `pnpm add recharts`
- [ ] Create `apps/web/src/components/analytics/` directory for all chart components

_Date range picker_
- [ ] Create `DateRangePicker` component:
  - Preset buttons: **7 days**, **30 days**, **90 days**
  - Custom range: two date inputs (from / to) with calendar popover using Shadcn/UI `Popover` and
    `Calendar` components
  - Disabled preset buttons shown with tooltip "Upgrade to Pro" when the plan does not support
    the range
  - State held in URL search params (`?from=&to=`) so ranges are shareable

_Card selector_
- [ ] Create `CardSelector` dropdown component:
  - Fetches the user's cards from `GET /cards` (existing endpoint from Phase 2)
  - Renders as Shadcn/UI `Select` with card handle and name
  - Switching card updates URL param `?cardId=` and refetches analytics

_Stats summary row_
- [ ] Create `AnalyticsSummaryRow` component:
  - Five stat cards in a horizontal row: Total Views, Unique Visitors, Total Clicks, Total Leads,
    Conversion Rate
  - Each card: large number, label, percentage change vs. previous period (computed client-side
    by fetching the equivalent prior period and comparing)
  - Skeleton loading state while data is fetching

_Charts_
- [ ] Create `ViewsSavesLineChart` component:
  - `recharts` `<LineChart>` with two lines: views (primary color) and saves (secondary color)
  - X-axis: dates formatted as `MMM DD`
  - Tooltip showing date, views count, saves count
  - Responsive container fills parent width

- [ ] Create `LinkClicksBarChart` component:
  - `recharts` `<BarChart>` with one bar per social link / CTA button
  - X-axis labels: platform name (LinkedIn, GitHub, etc.)
  - Sorted descending by click count
  - Horizontal layout if more than 6 links (swap to `<BarChart layout="vertical">`)

- [ ] Create `DeviceDonutChart` component:
  - `recharts` `<PieChart>` with `innerRadius` (donut style)
  - Three segments: Mobile, Desktop, Tablet with distinct colors
  - Center label: "Devices"
  - Legend below chart

- [ ] Create `CountriesBarChart` component:
  - `recharts` `<BarChart>` horizontal layout
  - Top 10 countries by view count
  - Country code labels on Y-axis

_Leads table_
- [ ] Create `LeadsTable` component:
  - Columns: Name, Email, Source Card, Date Added
  - Sortable by clicking column headers (client-side sort)
  - Pagination: 25 rows per page
  - "Export CSV" button:
    - Available for `PRO` and above; shows upgrade tooltip for `FREE`
    - On click: serializes leads array to CSV and triggers browser download
      (`Blob` with `text/csv` mime type, filename `leads-YYYY-MM-DD.csv`)
  - Empty state: "No leads yet — share your card to start capturing contacts"

_Referrer table_
- [ ] Create `ReferrerTable` component:
  - Columns: Referrer, Count, Percentage of total
  - Top 20 referrers sorted by count descending
  - "Direct / Unknown" row for events with no referrer

_Page assembly_
- [ ] Assemble all components in the analytics page with the following layout:
  ```
  [CardSelector]           [DateRangePicker]
  ─────────────────────────────────────────
  [AnalyticsSummaryRow — 5 stat cards]
  ─────────────────────────────────────────
  [ViewsSavesLineChart (full width)]
  [LinkClicksBarChart]   [DeviceDonutChart]
  [CountriesBarChart]    [ReferrerTable]
  ─────────────────────────────────────────
  [LeadsTable (full width)]
  ```
- [ ] All chart data is loaded in a single `useEffect` call to `GET /cards/:id/analytics` with
  the selected date range and all metrics requested
- [ ] Show a full-page skeleton loader while the initial data fetch is in progress
- [ ] Show an error banner if the fetch fails, with a "Retry" button

**Acceptance Criteria:**
- [ ] `GET /cards/:id/analytics?from=&to=&metrics[]=views,clicks,devices,countries,referrers,leads`
  returns the correct aggregated JSON for a card with seeded analytics events
- [ ] A Free-plan user requesting analytics with `from` older than 7 days receives `403 Forbidden`
- [ ] The `/dashboard/analytics` page renders all five stat cards, four charts, leads table, and
  referrer table without errors
- [ ] Switching the date range preset to "30 days" updates all charts with new data
- [ ] Switching the card selector updates all charts for the newly selected card
- [ ] The "Export CSV" button is visible but disabled (with tooltip) for Free-plan users
- [ ] The "Export CSV" button for a Pro-plan user downloads a correctly formatted CSV file
- [ ] Unique visitor count uses `DISTINCT ipHash` — two events with the same `ipHash` count as
  one unique visitor
- [ ] Conversion rate is calculated as `(totalLeads / totalViews) * 100` and displayed as a
  percentage rounded to 2 decimal places
- [ ] All charts are responsive and render correctly at 375px viewport width (mobile browser)
- [ ] `turbo build` passes with no TypeScript errors after all analytics code is added

---

### T19 — Inbuilt CRM Pipeline

**Description:**
Build the full CRM feature: a contact list page at `/dashboard/contacts` with search, filter,
bulk actions, and manual entry; and a Kanban pipeline board at `/dashboard/crm` with drag-and-drop
stage management. Clicking a contact card opens a right-side Contact Detail drawer with inline
editing, a rich-text notes editor, a full interaction timeline, and tag management. All CRM data
is backed by the existing `Contact` and `CrmPipeline` Prisma models and a new set of dedicated
API endpoints.

**Steps:**

_API — ContactsModule_
- [ ] Create `apps/api/src/contacts/contacts.module.ts`
- [ ] Create `apps/api/src/contacts/contacts.controller.ts` with:
  - `GET /contacts` — paginated list; query params: `page`, `limit`, `search` (name/email),
    `stage` (enum filter), `sourceCardId`, `sortBy` (`createdAt` | `name`), `order` (`asc` | `desc`)
    - Returns `{ data: Contact[], total, page, limit }`
    - Scoped to `ownerUserId = request.user.id` — users never see other users' contacts
  - `POST /contacts` — create a contact manually; body: `CreateContactDto` (name, email, phone,
    company, sourceCardId optional, stage defaults to `NEW`)
  - `GET /contacts/:id` — single contact with CRM pipeline record, tags, and latest 20 timeline
    events
  - `PUT /contacts/:id` — full update of contact fields
  - `DELETE /contacts/:id` — soft delete (set `deletedAt`); add `deletedAt DateTime?` field to
    `Contact` model and filter it out of all queries
  - `PATCH /contacts/:id/stage` — body: `{ stage: ContactStage }`; updates `CrmPipeline.stage`,
    appends a `STAGE_CHANGED` timeline event
  - `POST /contacts/:id/notes` — body: `{ content: string }`; saves a note, appends a
    `NOTE_ADDED` timeline event
  - `GET /contacts/:id/timeline` — returns all timeline events for the contact in descending
    chronological order
- [ ] Create `apps/api/src/contacts/crm.controller.ts` with:
  - `GET /crm/pipeline` — returns contacts grouped by stage:
    ```json
    {
      "NEW": [...],
      "CONTACTED": [...],
      "QUALIFIED": [...],
      "CLOSED": [...],
      "LOST": [...]
    }
    ```
    Each contact item includes: `id`, `name`, `company`, `email`, `sourceCardName`,
    `stageEnteredAt` (timestamp when stage was last changed), `avatarInitials` (first letter of
    first name + first letter of last name)
- [ ] Add `ContactTimeline` model to Prisma schema in `packages/database/prisma/schema.prisma`:
  ```
  model ContactTimeline {
    id          String   @id @default(cuid())
    contactId   String
    contact     Contact  @relation(fields: [contactId], references: [id])
    eventType   String   // LEAD_CAPTURED | STAGE_CHANGED | NOTE_ADDED | EMAIL_SENT
    metadata    Json?
    createdAt   DateTime @default(now())
  }
  ```
- [ ] Run `prisma migrate dev --name add_contact_timeline_soft_delete`
- [ ] Apply `@RequirePlan(Plan.PRO, Plan.BUSINESS, Plan.ENTERPRISE)` to all `/contacts` and
  `/crm` endpoints — CRM is a Pro+ feature

_Web — Contact list page_
- [ ] Create `apps/web/app/(dashboard)/dashboard/contacts/page.tsx`
- [ ] Install `@tanstack/react-table` for table management:
  `pnpm add @tanstack/react-table`
- [ ] Build `ContactsTable` component using TanStack Table:
  - Columns: checkbox, Name (with avatar initials), Email, Phone, Company, Source Card, Date Added,
    Stage (colored badge)
  - Column sorting on all columns via header click
  - Client-side search input filtering by name and email
  - Server-side filter by Stage (`NEW` / `CONTACTED` / `QUALIFIED` / `CLOSED` / `LOST`) via
    Shadcn/UI `Select` filter control
  - Server-side filter by Source Card via Shadcn/UI `Select`
  - Pagination: 25 rows per page, page controls at bottom

- [ ] Implement bulk actions toolbar (visible when ≥1 row is checked):
  - "Change Stage" — dropdown selecting new stage, applied to all selected contacts via
    `PATCH /contacts/:id/stage` in parallel
  - "Add Tag" — text input popover, tags appended to all selected contacts via `PUT /contacts/:id`
  - "Export CSV" — serializes selected contacts to CSV (Pro+ only, tooltip for Free)
  - "Delete" — confirmation dialog, soft-deletes all selected contacts

- [ ] Create "Add Contact" button opening `AddContactModal` (`Shadcn/UI Dialog`):
  - Form fields: Full Name (required), Email (required), Phone, Company, Source Card (optional
    dropdown from user's cards), Stage (defaults to `NEW`)
  - Submit calls `POST /contacts`, closes modal on success, refreshes table

_Web — CRM Kanban board_
- [ ] Create `apps/web/app/(dashboard)/dashboard/crm/page.tsx`
- [ ] Install `@dnd-kit/core` and `@dnd-kit/sortable`:
  `pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
- [ ] Build `CrmKanbanBoard` component:
  - Fetches `GET /crm/pipeline` on mount
  - Renders 5 columns: **New**, **Contacted**, **Qualified**, **Closed**, **Lost**
  - Column header: stage name, contact count badge
  - Each column is a droppable zone using `@dnd-kit/core` `useDroppable`
  - Each contact card is a draggable item using `useDraggable`
  - On drag-end, optimistically update the UI and call `PATCH /contacts/:id/stage`; roll back
    on API error and show a toast notification

- [ ] Build `CrmContactCard` (Kanban card) component:
  - Avatar circle with initials (first letter first name + first letter last name)
  - Contact name (bold)
  - Company name (muted)
  - Source card chip (small colored badge with card handle)
  - "Time in stage" label (e.g., "3 days" — computed from `stageEnteredAt`)
  - Clicking the card opens the `ContactDetailDrawer`

- [ ] Build `ContactDetailDrawer` component (Shadcn/UI `Sheet` — right side panel):
  - **Header:** avatar initials circle, name (editable inline — click to edit), company (editable),
    stage selector (`Shadcn/UI Select`) — change calls `PATCH /contacts/:id/stage`
  - **Contact info section:** email, phone, source card — all editable inline; save on blur via
    `PUT /contacts/:id`
  - **Tags editor:** tag chips with `×` to remove; text input to add new tag; saved via
    `PUT /contacts/:id`
  - **Notes editor:** `<textarea>` with basic formatting (bold, italic via keyboard shortcuts);
    auto-saves 1 second after the user stops typing (debounced `POST /contacts/:id/notes`);
    shows "Saved" indicator
  - **Timeline section:** vertical timeline list, newest event at top:
    - `LEAD_CAPTURED`: "Lead captured from [Card Name]" with timestamp
    - `STAGE_CHANGED`: "Stage changed from [Old] to [New]" with timestamp
    - `NOTE_ADDED`: "Note added" with note preview and timestamp
    - `EMAIL_SENT`: "Email sent" (Phase 4 — shown as placeholder in Phase 3)
  - **"Send Email" button:** opens `mailto:[contact.email]?subject=Following up` in the default
    mail client (direct Resend integration is Phase 4)
  - Drawer is dismissible via `Escape` key and clicking the overlay

**Acceptance Criteria:**
- [ ] `GET /contacts` returns paginated contacts scoped to the authenticated user
- [ ] `POST /contacts` creates a contact and returns the new record with a `NEW` stage entry
- [ ] `PATCH /contacts/:id/stage` updates the stage and appends a `STAGE_CHANGED` timeline event
- [ ] `GET /contacts/:id/timeline` returns all timeline events in descending order
- [ ] `GET /crm/pipeline` returns contacts correctly grouped into all 5 stage keys
- [ ] A Free-plan user calling `GET /contacts` receives `403 Forbidden` with the upgrade message
- [ ] The `/dashboard/contacts` page renders the contacts table with all columns, sorting,
  filtering, and pagination working correctly
- [ ] The bulk "Change Stage" action updates all selected contacts in the database
- [ ] The bulk "Export CSV" action is gated behind Pro plan with a tooltip for Free users
- [ ] The "Add Contact" modal creates a contact and it appears in the table without a page refresh
- [ ] The `/dashboard/crm` Kanban board renders all 5 columns with contact cards
- [ ] Dragging a contact from "New" to "Contacted" calls `PATCH /contacts/:id/stage` and the card
  appears in the correct column after the API responds
- [ ] Dragging a card and receiving an API error rolls back the card to its original column and
  shows a toast error notification
- [ ] The `ContactDetailDrawer` opens when a Kanban card is clicked
- [ ] Inline edits to contact fields auto-save via `PUT /contacts/:id` on blur
- [ ] Notes are auto-saved with a 1-second debounce and show a "Saved" confirmation
- [ ] The timeline shows events in correct chronological order (newest first)
- [ ] `turbo build` passes with no TypeScript errors after all CRM code is added

---

### T20 — Lead Capture Email Notifications (Resend)

**Description:**
Install and configure the Resend SDK in the NestJS API and build an `EmailModule` that centralises
all transactional email sending. Implement four email types: new lead notification to the card
owner, welcome email on sign-up, subscription change confirmation, and payment failure warning.
All email templates live in `apps/api/src/email/templates/` as self-contained HTML strings
or React Email components. Every email send is non-blocking (fire-and-forget with error logging).

**Steps:**

_Setup_
- [ ] Install Resend SDK in `apps/api`: `pnpm --filter api add resend`
- [ ] Add to `apps/api/.env.example`:
  ```
  RESEND_API_KEY=
  RESEND_FROM_EMAIL=noreply@dotly.one
  ```
- [ ] Register `RESEND_API_KEY` and `RESEND_FROM_EMAIL` in `ConfigModule`

_EmailModule_
- [ ] Create `apps/api/src/email/email.module.ts`:
  - Exports `EmailService` as a global provider so any module can inject it without importing
    `EmailModule` explicitly
- [ ] Create `apps/api/src/email/email.service.ts`:
  - Constructor injects `ConfigService`; initializes `new Resend(apiKey)` client
  - All send methods are `async` and wrapped in try/catch; errors are logged to Sentry / console
    but never thrown (fire-and-forget — email failure must not break the primary request)
  - Method `sendNewLeadNotification(ownerEmail, ownerName, leadName, leadEmail, cardName,
    cardUrl)` — sends new lead email to card owner
  - Method `sendWelcomeEmail(userEmail, userName)` — sends welcome email on sign-up
  - Method `sendSubscriptionUpgradeEmail(userEmail, userName, newPlan)` — sends upgrade
    confirmation
  - Method `sendSubscriptionCancelledEmail(userEmail, userName)` — sends cancellation confirmation
  - Method `sendPaymentFailedEmail(userEmail, userName, nextRetryDate)` — sends payment failure
    warning

_Email templates_
- [ ] Create `apps/api/src/email/templates/` directory with the following HTML template files:

- [ ] `new-lead.html.ts` — exports a function `newLeadTemplate(params)` returning an HTML string:
  - Subject: `New lead from your card "{{cardName}}"`
  - Header: Dotly.one logo + "You have a new lead!" headline
  - Body: lead's name, email, and the card they scanned
  - Card link: a styled button "View Card" linking to `cardUrl`
  - CTA button: "View in CRM" linking to `{{webUrl}}/dashboard/crm`
  - Footer: "You received this because you own a Dotly.one card. Manage notification settings."

- [ ] `welcome.html.ts` — exports `welcomeTemplate(params)` returning an HTML string:
  - Subject: `Welcome to Dotly.one — create your first card`
  - Header: "Welcome to Dotly.one, {{userName}}!" headline
  - Body: 3-step quick-start guide: (1) Create your card, (2) Add your links, (3) Share your QR code
  - CTA button: "Create Your Card Now" linking to `{{webUrl}}/dashboard`
  - Mention of 14-day Pro trial

- [ ] `subscription-upgraded.html.ts` — exports `subscriptionUpgradedTemplate(params)`:
  - Subject: `Your Dotly.one plan has been upgraded to {{newPlan}}`
  - Body: confirmation of new plan name, list of newly unlocked features, link to billing page

- [ ] `subscription-cancelled.html.ts` — exports `subscriptionCancelledTemplate(params)`:
  - Subject: `Your Dotly.one subscription has been cancelled`
  - Body: confirmation of cancellation, access end date, option to resubscribe

- [ ] `payment-failed.html.ts` — exports `paymentFailedTemplate(params)`:
  - Subject: `Action required — payment failed for your Dotly.one subscription`
  - Body: payment failure notice, next retry date, "Update Payment Method" CTA button linking
    to the Stripe Customer Portal

_Trigger integrations_
- [ ] In `LeadCaptureService` (created in Phase 2 T13): after a lead is saved to the database,
  call `EmailService.sendNewLeadNotification(...)` — inject `EmailService` via constructor DI
- [ ] In `UsersService.createUser()` (called on first sign-in / registration): call
  `EmailService.sendWelcomeEmail(...)`
- [ ] In `BillingService` webhook handlers (T17):
  - On `customer.subscription.updated` where new status is `active` (upgrade from trial or
    plan change): call `EmailService.sendSubscriptionUpgradeEmail(...)`
  - On `customer.subscription.deleted`: call `EmailService.sendSubscriptionCancelledEmail(...)`
  - On `invoice.payment_failed`: call `EmailService.sendPaymentFailedEmail(...)`

_Resend domain verification_
- [ ] Document in `docs/ENVIRONMENT.md`: Resend requires `dotly.one` to be added as a verified
  sending domain in the Resend dashboard with the required DNS records before any emails send
  from a `@dotly.one` address in production

**Acceptance Criteria:**
- [ ] `EmailService` initializes with the Resend client using `RESEND_API_KEY` from environment
- [ ] Submitting the lead capture form on a public card page triggers a new-lead notification
  email to the card owner (verified via Resend dashboard logs in test mode)
- [ ] A newly registered user receives a welcome email within 30 seconds of sign-up
- [ ] Completing a Stripe Checkout upgrade triggers the subscription upgrade email
- [ ] A `customer.subscription.deleted` webhook triggers the cancellation email
- [ ] An `invoice.payment_failed` webhook triggers the payment failed email with a portal link
- [ ] If Resend returns an error (e.g., invalid API key), the primary request still completes
  successfully and the error is logged — the email failure is silent to the user
- [ ] All email templates render valid HTML (no broken tags, no missing variables)
- [ ] The "View in CRM" CTA in the new-lead email links to the correct URL
- [ ] No hardcoded email addresses or API keys exist in the template files — all values come
  from function parameters or environment variables
- [ ] `turbo build` passes with no TypeScript errors in the email module

---

### T21 — Team Management (Business+ plan)

**Description:**
Build the team management feature gated behind the Business plan. An account owner can create a
team, invite members by email, assign roles (Admin / Member), remove members, and configure shared
brand settings. When brand lock is enabled all team members' cards inherit the team logo, primary
color, secondary color, and font — enforced at render time by the shared `packages/ui` card
renderer. Aggregated analytics are available at the team level. All team endpoints are protected
by both `JwtAuthGuard` and `@RequirePlan(Plan.BUSINESS, Plan.ENTERPRISE)`.

**Steps:**

_API — TeamsModule_
- [ ] Create `apps/api/src/teams/teams.module.ts`
- [ ] Create `apps/api/src/teams/teams.controller.ts` with:
  - `POST /teams` — body: `{ name: string }`; creates team record, sets `ownerUserId` to
    the requesting user's ID, creates a `TeamMember` record for the owner with `role: ADMIN`
  - `GET /teams/:id` — returns team info, member list (with roles), and brandConfig; only
    accessible by team members
  - `PUT /teams/:id` — body: `{ name?: string, brandConfig?: object }`; updates team name or
    brand configuration; only accessible by team `ADMIN`
  - `POST /teams/:id/members/invite` — body: `{ email: string, role: 'ADMIN' | 'MEMBER' }`;
    generates a signed invite token (JWT with 48-hour expiry), stores as a pending invite record,
    sends invite email via `EmailService.sendTeamInviteEmail(...)`; only accessible by team `ADMIN`
  - `GET /teams/:id/members/accept-invite` — query param: `token`; verifies the invite JWT;
    if valid and recipient is already a registered user adds them to the team; if not registered
    redirects to sign-up with the token preserved in a query param so it is applied post-sign-up
  - `DELETE /teams/:id/members/:userId` — removes a member from the team; the owner cannot be
    removed; only accessible by team `ADMIN`
  - `PATCH /teams/:id/members/:userId/role` — body: `{ role: 'ADMIN' | 'MEMBER' }`; changes
    the role of a team member; only accessible by team `ADMIN`
  - `GET /teams/:id/cards` — returns all cards belonging to all team members; paginated; only
    accessible by team members
  - `GET /teams/:id/analytics` — returns aggregated analytics (total views, total clicks, total
    leads, per-member card breakdown) for all cards in the team; date range via `from` / `to`
    query params; only accessible by team members
- [ ] Apply `@RequirePlan(Plan.BUSINESS, Plan.ENTERPRISE)` to all team endpoints
- [ ] Add `TeamInvite` model to Prisma schema:
  ```
  model TeamInvite {
    id          String   @id @default(cuid())
    teamId      String
    team        Team     @relation(fields: [teamId], references: [id])
    email       String
    role        String   @default("MEMBER")
    token       String   @unique
    expiresAt   DateTime
    acceptedAt  DateTime?
    createdAt   DateTime @default(now())
  }
  ```
- [ ] Run `prisma migrate dev --name add_team_invite`

_Brand lock enforcement_
- [ ] Add `brandLock Boolean @default(false)` field to `Team` model in Prisma schema
- [ ] Run `prisma migrate dev --name add_team_brand_lock`
- [ ] In the `GET /cards/:handle` public card page SSR handler (`apps/web`): after fetching the
  card, check if `card.userId` belongs to a team with `brandLock: true`; if so, merge
  `team.brandConfig` (logo, primaryColor, secondaryColor, fontFamily) over the card's own
  `CardTheme` before passing to the renderer
- [ ] In `packages/ui` card renderer: accept an optional `brandOverride` prop; when present,
  the brand values in `brandOverride` replace the card's own theme values

_Email — team invite_
- [ ] Add `sendTeamInviteEmail(inviteeEmail, inviterName, teamName, acceptUrl)` to `EmailService`
- [ ] Create `team-invite.html.ts` template:
  - Subject: `{{inviterName}} has invited you to join {{teamName}} on Dotly.one`
  - Body: invite context, team name, inviter name
  - CTA button: "Accept Invitation" linking to `acceptUrl`
  - Note: link expires in 48 hours

_Web — Team settings pages_
- [ ] Create `apps/web/app/(dashboard)/dashboard/team/page.tsx`:
  - Shows team name at the top (editable inline for Admins)
  - Member list table: columns: Avatar, Name, Email, Role badge (Admin / Member), Joined date,
    Actions (change role dropdown for Admins, "Remove" button for Admins — cannot remove self
    or owner)
  - "Invite Member" button opens `InviteMemberModal` (`Shadcn/UI Dialog`):
    - Email input (required), Role selector (Admin / Member, defaults to Member)
    - Submit calls `POST /teams/:id/members/invite`; shows success toast with "Invite sent to
      [email]"
  - Pending invites section: list of outstanding invites with email, role, expiry date, and
    "Revoke" button
  - Empty state for teams with only the owner: "Invite your first team member to get started"

- [ ] Create `apps/web/app/(dashboard)/dashboard/team/brand/page.tsx`:
  - Brand config editor:
    - Logo uploader (Supabase Storage upload, same pattern as card logo upload in Phase 2)
    - Primary color picker (`<input type="color">` with hex input fallback)
    - Secondary color picker
    - Font family selector (same font list as the card builder from Phase 2)
    - "Brand Lock" toggle (`Shadcn/UI Switch`): when enabled shows a warning "When enabled,
      all team member cards will use these brand settings — individual card theme changes will
      be overridden"
  - Live preview using the shared `packages/ui` card renderer with brand override applied
  - "Save Brand Settings" button calls `PUT /teams/:id` with updated `brandConfig` and
    `brandLock` value

- [ ] Add "Team" entry to the dashboard sidebar navigation, visible only to Business+ plan users
  (hidden for Free and Pro with no tooltip — teams are not advertised until upgrade)

_Invite acceptance flow_
- [ ] Create `apps/web/app/(dashboard)/accept-invite/page.tsx`:
  - Reads `token` from URL query param
  - If user is authenticated: calls `GET /teams/:id/members/accept-invite?token=` → on success
    shows "You've joined [Team Name]!" and redirects to `/dashboard/team`
  - If user is not authenticated: shows "Sign in or create an account to accept this invite"
    with sign-in and sign-up buttons that preserve the `token` param through the auth flow
  - On sign-up completion (in `/auth/callback`): if a `pending_invite_token` cookie is present,
    fire the accept-invite API call before redirecting to dashboard

**Acceptance Criteria:**
- [ ] `POST /teams` creates a team and automatically adds the creator as an Admin member
- [ ] `POST /teams/:id/members/invite` sends an invite email with a valid accept link
- [ ] Visiting the accept link as an authenticated user adds the user to the team
- [ ] Visiting the accept link as an unauthenticated user presents the sign-in/sign-up prompt
  and the invite is applied after authentication
- [ ] `DELETE /teams/:id/members/:userId` removes the member and they can no longer access
  team endpoints
- [ ] `PATCH /teams/:id/members/:userId/role` updates the member's role and the change is
  reflected immediately in `GET /teams/:id`
- [ ] `GET /teams/:id/analytics` returns aggregated view and click totals for all team cards
- [ ] A Business-plan user calling `POST /teams` succeeds; a Pro-plan user receives `403 Forbidden`
- [ ] When `brandLock: true`, the public card page for a team member's card renders with the
  team's logo and colors, not the card's own theme
- [ ] The brand editor live preview updates in real time as colors and font are changed
- [ ] The `/dashboard/team` page renders correctly with member list, invite modal, and pending
  invites section
- [ ] An expired invite token (> 48 hours) is rejected at the accept endpoint with a clear error
- [ ] `turbo build` passes with no TypeScript errors after all team code is added

---

### T22 — Mobile CRM & Contacts Tab (apps/mobile)

**Description:**
Build the Contacts tab in the Expo mobile app to give users on-the-go access to their CRM.
The tab shows a scrollable contact list with search, stage badges, and source card info. Tapping
a contact opens a Contact Detail screen. Swipe-to-action provides quick stage changes and
native call/email deep links. Pull-to-refresh keeps the list current. Notes are read-only in
Phase 3; editing is deferred to Phase 4.

**Steps:**

_Contacts tab screen_
- [ ] Replace the stub `app/(tabs)/contacts.tsx` with a full implementation:
  - Fetches `GET /contacts?limit=50&page=1` from the API on mount using the authenticated
    session token
  - Renders a `FlatList` with `keyExtractor={item => item.id}`
  - Each list item (`ContactListItem` component):
    - Avatar circle: initials (first letter first name + first letter last name) on a colored
      background (color derived deterministically from contact ID using a small color palette)
    - Contact name (bold, single line, ellipsize)
    - Email address (secondary text, single line, ellipsize)
    - Source card chip: small pill badge with the card handle (NativeWind styled)
    - Stage badge: colored pill — New (gray), Contacted (blue), Qualified (yellow), Closed
      (green), Lost (red) — using `ContactStage` enum from `@dotly/types`
  - Pull-to-refresh: `refreshControl` prop on `FlatList` with `onRefresh` refetching the list
  - Pagination: load more on `onEndReached` (append next page to list state)
  - Empty state view (shown when list is empty and not loading):
    - Icon: a simple address-book or person icon
    - Text: "Your leads will appear here after someone scans your card"

_Search bar_
- [ ] Add a `TextInput` search bar above the `FlatList`:
  - Uses NativeWind for styling (rounded, gray background, search icon left)
  - Filters the in-memory contact list client-side on `name` and `email` fields
  - Clears filter when input is emptied
  - Debounced 300ms to avoid excessive re-renders on fast typing

_Swipe-to-action_
- [ ] Install `react-native-gesture-handler` (already included with Expo Router; confirm it is
  in the project):
  `pnpm --filter mobile add react-native-gesture-handler`
- [ ] Wrap each `ContactListItem` in a `Swipeable` component (from `react-native-gesture-handler`):
  - **Swipe left** — reveals "Change Stage" action button (blue):
    - Opens a bottom sheet / `ActionSheetIOS` (iOS) or `Alert` with options (Android) listing
      the 5 stages
    - On selection: calls `PATCH /contacts/:id/stage`, updates the item in local state
  - **Swipe right** — reveals two action buttons:
    - "Call" (green): opens `tel:[phone]` deep link via `Linking.openURL`; hidden if contact has
      no phone number
    - "Email" (blue): opens `mailto:[email]` deep link via `Linking.openURL`

_Contact Detail screen_
- [ ] Create `app/(tabs)/contact-detail.tsx` (or a modal screen `app/contact/[id].tsx` using
  Expo Router modal presentation):
  - Navigated to by tapping a `ContactListItem` — pass `contactId` as a route param
  - Fetches `GET /contacts/:id` on mount
  - Renders:
    - **Header:** large avatar circle with initials, name (large bold), company (subtitle),
      stage badge
    - **Info section:** email row (tap to open mailto:), phone row (tap to open tel:), company,
      source card name
    - **Stage selector:** row of 5 stage buttons (pill style); active stage highlighted; tapping
      a different stage calls `PATCH /contacts/:id/stage` and updates local state
    - **Notes section:** scrollable read-only view of all notes in chronological order;
      note text, timestamp; "Notes editing coming soon" placeholder text at the bottom
      (editing is Phase 4)
    - **Timeline section:** vertical list of timeline events — same event types as the web CRM
      (LEAD_CAPTURED, STAGE_CHANGED, NOTE_ADDED); each event: event label, relative timestamp
      (e.g., "2 days ago")
  - Back button in the header navigates back to the contacts list

_Loading and error states_
- [ ] Show a `ActivityIndicator` (centered) while the contact list is loading on first mount
- [ ] Show a `ActivityIndicator` in the navigation bar while a stage change is in progress
- [ ] If `GET /contacts` returns `403` (Free plan), show a full-screen upsell card:
  - Text: "CRM is available on Pro and above"
  - CTA button: "Upgrade Now" — opens `Linking.openURL('https://dotly.one/pricing')`
- [ ] If any API call fails, show a red error banner at the top of the screen with the error
  message and a "Retry" button

**Acceptance Criteria:**
- [ ] The Contacts tab renders a `FlatList` of contacts fetched from `GET /contacts` using the
  authenticated token
- [ ] Each contact list item displays name, email, source card chip, and stage badge with the
  correct stage color
- [ ] Typing in the search bar filters the list to matching contacts (client-side)
- [ ] Pull-to-refresh re-fetches the contact list and updates the UI
- [ ] Scrolling to the bottom of the list triggers pagination and loads the next page of contacts
- [ ] Swiping left on a contact reveals the "Change Stage" button; selecting a new stage updates
  the contact in the database and the badge updates in the list
- [ ] Swiping right on a contact reveals "Call" and "Email" buttons; tapping "Call" opens the
  phone dialer with the contact's number
- [ ] Tapping a contact navigates to the Contact Detail screen
- [ ] The Contact Detail screen shows name, email, phone, company, stage selector, notes, and
  timeline
- [ ] Tapping a different stage button on the Contact Detail screen calls `PATCH /contacts/:id/stage`
  and the active stage button updates
- [ ] Notes are displayed read-only with a "coming soon" indicator for editing
- [ ] A Free-plan user sees the upsell card instead of the contact list
- [ ] An API error shows the red error banner with a retry option
- [ ] The app does not crash when the contacts list is empty (empty state renders correctly)

---

## Phase 3 — Definition of Done

The phase is complete when all of the following are true:

- [ ] All 6 tasks (T17–T22) have every acceptance criterion checked and verified
- [ ] Stripe billing is functional in test mode: checkout, portal, and all four webhook events
  work correctly; `User.plan` and `Subscription` are correctly updated on every event
- [ ] `PlanGuard` is enforced at the API layer: Free users are blocked from CRM, analytics
  history > 7 days, CSV export, and team features — verified with automated or manual tests
- [ ] The full analytics dashboard renders all charts and tables with live data and correct
  plan-based date range restrictions
- [ ] The CRM pipeline Kanban board supports drag-and-drop stage changes that persist to the
  database and appear in the contact timeline
- [ ] All four transactional emails (new lead, welcome, subscription change, payment failed)
  are confirmed delivered in Resend test logs
- [ ] Team management is functional for Business-plan users: create team, invite by email,
  accept invite, brand lock enforcement on public card pages
- [ ] Mobile Contacts tab renders, searches, paginates, swipe-actions work, and the Contact
  Detail screen displays correctly on both iOS Simulator and Android Emulator
- [ ] No `console.error` or unhandled promise rejections in development mode across all apps
- [ ] `turbo build` exits 0 for `apps/api`, `apps/web`, and `turbo typecheck` exits 0 for all
  workspaces
- [ ] CI passes on a clean PR with all jobs green
- [ ] All Stripe test-mode keys are confirmed; a note is filed to rotate to live keys before
  Phase 4 production deploy
- [ ] Phase 4 can begin immediately without any Phase 3 rework

---

## Dependencies & Blockers

| Dependency | Owner | Needed by | Notes |
|---|---|---|---|
| Stripe account with live mode keys approved | Team lead | T17 | Test mode keys sufficient for Phase 3 dev; live keys required before Phase 4 production deploy |
| Resend account with `dotly.one` domain verified | Team lead | T20, T21 | DNS records (SPF, DKIM, DMARC) must be added to the domain registrar; without this, emails send from a Resend subdomain in test mode |
| Team invite email domain — `dotly.one` MX records | Team lead | T21 | Invite emails must be deliverable to recipient inboxes; domain reputation matters for deliverability |
| Phase 2 lead capture form (`POST /leads`) complete | Dev | T20 | T20 hooks into the lead capture endpoint built in Phase 2 T13; that endpoint must exist before T20 can be integrated |
| Phase 2 card builder & `GET /cards` endpoint complete | Dev | T18, T19, T22 | Analytics dashboard card selector and CRM source card filter depend on the card list endpoint from Phase 2 |
| `packages/ui` card renderer accepts `brandOverride` prop | Dev | T21 | Brand lock enforcement requires the renderer to accept and apply a brand override; this is a `packages/ui` change that affects both web and mobile renders |
| Redis available on Railway (or local Docker) | Dev | T18 | Analytics queries in Phase 2 write events to Redis before flushing to PostgreSQL; the analytics endpoint in T18 reads from PostgreSQL after flush |

---

## Notes

- **"Send Email" from CRM Contact Detail is `mailto:` only in Phase 3.** The button in the
  `ContactDetailDrawer` (web) and the Email swipe action (mobile) both open the user's default
  mail client via a `mailto:` deep link. Direct email sending from within the app using Resend
  — with a thread view, reply tracking, and a sent log in the contact timeline — is a Phase 4
  feature. The Phase 3 implementation deliberately uses `mailto:` to avoid scope creep.

- **Mobile notes editing is deferred to Phase 4.** The Contact Detail screen in `apps/mobile`
  displays notes in read-only mode with a "Notes editing coming soon" indicator. A full inline
  notes editor with auto-save on mobile requires careful handling of the soft keyboard,
  text selection, and scroll behavior on both iOS and Android. This is scoped to Phase 4 to
  keep Phase 3 focused on the CRM pipeline and monetization deliverables.

- **Stripe Enterprise plan has no automated checkout.** The "Contact Sales" CTA on the pricing
  page opens a `mailto:` link in Phase 3. Stripe quote-based invoicing and SCIM/SSO for
  Enterprise are Phase 4 / Phase 5 scope.

- **Team analytics aggregation is best-effort in Phase 3.** `GET /teams/:id/analytics` runs a
  single aggregated query over all team member card events. For large teams this may be slow;
  a background-computed materialized view or Redis-cached summary is a Phase 4 optimization.

- **Annual billing discount display.** The pricing page shows the monthly-equivalent price for
  annual plans (e.g., "$ 7.50/mo billed annually"). The actual Stripe price is charged as a
  single annual lump sum. Ensure the Stripe price is created with `billing_scheme: per_unit`
  and `interval: year` — not as 10 monthly charges — to avoid proration complexity.

---

*Phase 3 of 5 — Dotly.one / Prev: Phase 2 — Core MVP | Next: Phase 4 — Polish & Scale*
