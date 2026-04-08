# Phase 4 — Polish & Scale

**Duration:** Weeks 12–15
**Goal:** Deliver every remaining surface that makes Dotly.one feature-complete for general
availability — custom domain routing, NFC tag writing, white-label enterprise, full mobile card
creation, direct email sending from the CRM, an email signature generator, end-to-end test
coverage, and deep performance and accessibility hardening. After Phase 4 the product is ready
to launch to the public with no deferred product features.

**Definition of done:** Every task below has its acceptance criteria met. The Playwright E2E
suite passes in CI. Lighthouse mobile score on the public card page is ≥ 90. A Business+ user
can point a custom domain to their card end-to-end without engineering involvement. An Enterprise
user can fully white-label the product. A Pro user can compose and send an email to a CRM contact
directly from the dashboard. The mobile app supports full card creation and NFC tag writing.

---

## Task List

---

### T23 — Custom Domain Routing

**Description:**
Allow Business+ plan users to serve their public card page from their own domain
(e.g. `card.acme.com`). The user submits a domain in Settings, receives DNS instructions, and
once DNS is verified Dotly automatically provisions SSL and routes requests through Next.js
middleware to the correct card handle — all without engineering involvement. This is a
differentiating feature not offered by any major competitor.

**Steps:**

_Database_
- [ ] Add `txtRecord` (String, unique, auto-generated UUID-based token) and `isVerified` (Boolean,
      default false) and `sslStatus` (enum: `PENDING | PROVISIONED | FAILED`) fields to
      `CustomDomain` model in Prisma schema if not already present from Phase 1
- [ ] Add `cardHandle` (String, nullable) foreign relation on `CustomDomain` — the domain maps
      to a specific card handle; if null, defaults to the user's primary card
- [ ] Run `prisma migrate dev --name custom-domain-ssl-fields`

_API — DomainsModule (NestJS)_
- [ ] Create `DomainsModule`, `DomainsController`, `DomainsService` in `apps/api/src/domains/`
- [ ] Implement `POST /domains`:
  - Accept `{ domain: string, cardHandle?: string }` DTO
  - Validate domain format (regex, no trailing slash, no path)
  - Check uniqueness across all `CustomDomain` records — return `409 Conflict` with message
    `"Domain already registered to another account"` if taken
  - Generate `txtRecord` as `dotly-verify-<uuidv4()>`
  - Persist `CustomDomain` record with `isVerified: false`, `sslStatus: PENDING`
  - Return domain record with DNS instructions payload:
    ```json
    {
      "id": "...",
      "domain": "card.acme.com",
      "cnameTarget": "cname.dotly.one",
      "txtName": "_dotly-verify.card.acme.com",
      "txtValue": "dotly-verify-<uuid>",
      "isVerified": false,
      "sslStatus": "PENDING"
    }
    ```
- [ ] Implement `POST /domains/:id/verify`:
  - Guard: domain must belong to authenticated user
  - Use Node.js `dns.promises.resolveTxt(txtName)` to query TXT records for
    `_dotly-verify.<domain>`
  - If TXT record value matches stored `txtRecord`, set `isVerified: true`
  - If verified: call Vercel API `POST /v9/projects/{projectId}/domains` with the custom domain
    (requires `VERCEL_API_TOKEN` and `VERCEL_PROJECT_ID` env vars) to provision SSL
    automatically on Vercel-hosted deployments; on Railway, trigger `certbot certonly` via
    shell exec as an alternative path
  - Update `sslStatus` to `PROVISIONED` on success, `FAILED` on error
  - Return updated domain record
- [ ] Implement `GET /domains`:
  - Return all `CustomDomain` records for authenticated user, ordered by `createdAt` desc
- [ ] Implement `DELETE /domains/:id`:
  - Guard: domain must belong to authenticated user
  - Remove domain from Vercel project via Vercel API `DELETE /v9/projects/{projectId}/domains/{domain}`
  - Delete `CustomDomain` record
  - Return `204 No Content`
- [ ] Apply `PlanGuard` (Business+) to all `DomainsController` endpoints; return `403` for Free/Pro

_Background Verification Polling (BullMQ)_
- [ ] Create `DomainVerificationQueue` in BullMQ backed by Redis
- [ ] Add a repeatable job `verify-pending-domains` that runs every 5 minutes:
  - Query all `CustomDomain` records where `isVerified: false` and `createdAt` is within the
    last 72 hours (stop polling after 72 hours to avoid runaway jobs)
  - For each: call the same `dns.promises.resolveTxt` check as the manual verify endpoint
  - On match: mark verified, trigger SSL provisioning
- [ ] Add `DomainVerificationProcessor` as a BullMQ worker in the API process

_Next.js Middleware (apps/web)_
- [ ] Update `middleware.ts`:
  - On every incoming request, extract `request.headers.get('host')` (the hostname)
  - If hostname matches `*.dotly.one` or `localhost`, skip — normal routing applies
  - Otherwise: call internal API `GET /domains/resolve?domain=<hostname>` (a new unguarded
    internal endpoint, IP-restricted to the Vercel edge network) which returns
    `{ cardHandle: string } | null`
  - If a matching verified domain is found: rewrite the request to `/card/<cardHandle>`
    using `NextResponse.rewrite(new URL('/card/' + cardHandle, request.url))`
  - If no match: return `404`
- [ ] Cache domain → handle resolution in Redis with a 60-second TTL to avoid hitting the DB
      on every request from a high-traffic custom domain card

_Web UI (apps/web)_
- [ ] Add "Custom Domain" section to `/dashboard/settings`:
  - Input field for domain entry, "Add Domain" button
  - DNS instructions panel: CNAME record and TXT record shown in a copyable code block
    immediately after submission
  - Domain status badge: `Pending DNS` (yellow), `Verified` (green), `SSL Provisioned` (blue),
    `Failed` (red)
  - "Verify Now" button triggers `POST /domains/:id/verify` manually; shows spinner while
    polling
  - "Retry" button on failed state
  - Delete domain button with confirmation dialog
  - Plan gate: Business+ only — render upsell CTA for Free/Pro users
- [ ] Add helper text: "DNS changes can take up to 24–48 hours to propagate globally."
- [ ] Show 409 error inline if domain is already taken by another account

**Acceptance Criteria:**
- [ ] A Business+ user can submit `card.acme.com`, receive correct CNAME and TXT DNS instructions
- [ ] `POST /domains` returns `409` if the domain is already registered to a different account
- [ ] `POST /domains/:id/verify` returns `isVerified: true` after a correct TXT record is detected
      via `dns.promises.resolveTxt`
- [ ] `POST /domains/:id/verify` returns `isVerified: false` with a clear error message if TXT
      record is missing or mismatched
- [ ] The BullMQ polling job runs every 5 minutes and auto-verifies a domain without manual action
- [ ] A request to `card.acme.com` (with correct DNS pointing to the Vercel deployment) is
      rewritten by `middleware.ts` and renders the correct card page SSR output
- [ ] Middleware resolution result is cached in Redis; a second identical request does not hit
      the database
- [ ] `GET /domains` returns only domains belonging to the authenticated user — no cross-user
      data leakage
- [ ] `DELETE /domains/:id` removes the domain from both the database and the Vercel project
- [ ] A Free or Pro user calling `POST /domains` receives `403 Forbidden`
- [ ] Domain status badges update in real time on the Settings UI after verification

---

### T24 — NFC Tag Writing (apps/mobile)

**Description:**
Allow mobile users to write their card's public URL to a blank NFC tag (e.g. NTAG213/215/216)
directly from the app using the Expo NFC module. A recipient taps the NFC tag with any NFC-enabled
phone and their browser opens the card page instantly — no app required on the receiving end.
This is the core hardware sharing feature that makes Dotly.one competitive with physical NFC
business card products.

**Steps:**

_Setup_
- [ ] Install `expo-nfc` in `apps/mobile`: `pnpm --filter mobile add expo-nfc`
- [ ] Add NFC permissions to `app.json`:
  - iOS: add `NFCReaderUsageDescription` to `infoPlist`; add `com.apple.developer.nfc.readersession.formats`
    entitlement with value `["NDEF"]` under `entitlements`
  - Android: `android.permissions` array — add `"android.permission.NFC"`
- [ ] Rebuild the Expo dev client (`eas build --profile development`) after modifying `app.json`
      to pick up the new entitlements

_NFC Write Flow_
- [ ] Add an "NFC" tab or a dedicated "Write to NFC Tag" button on the Card Detail screen
      (accessible from the Cards tab → tap any card)
- [ ] On tap, check `NfcManager.isSupported()`:
  - If `false`: show an alert "NFC is not supported on this device" and return early
  - If `true`: request NFC session (`NfcManager.start()`)
- [ ] Present a bottom sheet modal instructing the user: "Hold your phone to the back of the
      NFC tag until the write is complete"
- [ ] Build NDEF message: one `NdefRecord` of type `NdefRecord.RTD_URI` with the card's full
      public URL (e.g. `https://dotly.one/<handle>` or custom domain if verified)
- [ ] Call `NfcManager.ndefHandler.writeNdefMessage([ndefRecord])`
- [ ] On write success:
  - Dismiss the bottom sheet
  - Show a success toast: "NFC tag written successfully!"
  - Haptic feedback (`expo-haptics` — `Haptics.notificationAsync(NotificationFeedbackType.Success)`)
- [ ] On error — handle each case explicitly:
  - `NfcErrors.CANCELLED` — user cancelled, dismiss silently
  - `NfcErrors.TIMEOUT` — show "No tag detected. Please try again." with a "Retry" button
  - `NfcErrors.TAG_WRITE_FAILED` — show "Write failed. The tag may be locked." with a "Retry" button
  - Tag already contains data (`FormatException` or non-empty check):
    prompt "This tag already has data. Overwrite?" → confirm → format tag with
    `NfcManager.ndefHandler.makeReadOnly()` then rewrite (or use `writeNdefMessage` which
    overwrites on NTAG tags)
- [ ] Always call `NfcManager.cancelTechnologyRequest()` in a `finally` block to release the
      NFC session regardless of outcome

_NFC Read on App Launch (Android)_
- [ ] In `app/_layout.tsx` (root layout), add a `useEffect` that subscribes to NFC tag discovery
      events on Android using `NfcManager.registerTagEvent(callback)`
- [ ] If a tag is detected that contains a `dotly.one` URL: open the card URL in the in-app browser
      via `expo-web-browser` (`WebBrowser.openBrowserAsync(url)`)
- [ ] On iOS, NFC read in background is not supported — display read capability in a dedicated
      "Scan Tag" button that starts a foreground NFC read session and opens the URL

_Supported Tag Types_
- [ ] Document in code comments that the implementation targets NTAG213, NTAG215, and NTAG216
      (standard NFC business card chips); MIFARE Classic requires separate tech request and is
      explicitly out of scope

**Acceptance Criteria:**
- [ ] On a device with NFC, tapping "Write to NFC Tag" starts an NFC session and the bottom sheet
      modal appears
- [ ] A blank NTAG213/215/216 tag held to the device is written with the NDEF URL record
      successfully; the success toast appears and haptic feedback fires
- [ ] After writing, a second device tapping the NFC tag opens `https://dotly.one/<handle>` in
      the browser without needing the app installed
- [ ] On a device without NFC, the "NFC not supported" message is shown and no crash occurs
- [ ] Tag timeout (no tag presented within the NFC session window) shows the retry message
      without crashing
- [ ] An already-written tag triggers the overwrite confirmation prompt before writing
- [ ] `NfcManager.cancelTechnologyRequest()` is always called — verified by checking there are no
      orphaned NFC sessions after any error path (check device NFC indicator light goes off)
- [ ] On Android, scanning a Dotly NFC tag while the app is in the foreground opens the card URL
      in the in-app browser
- [ ] The NFC entitlement is correctly declared in `app.json` such that the iOS build does not
      crash on launch due to a missing entitlement
- [ ] `expo-haptics` fires on successful write

---

### T25 — White Label (Enterprise)

**Description:**
Enterprise users can configure a full white-label experience for their workspace — replacing all
Dotly branding on card pages, the sign-in page, and outbound emails with the team's own branding.
This unlocks the agency resale use case and is the primary value driver of the Enterprise plan.

**Steps:**

_Database_
- [ ] Add white-label fields to the `Team` model (or extend the existing `brandConfig` JSON field):
  ```
  customAppName       String?
  customLogoUrl       String?
  customFaviconUrl    String?
  customPrimaryColor  String?  // hex color
  customDomain        String?  // Enterprise login page domain
  hideDotyBranding    Boolean  @default(false)
  ```
- [ ] Alternatively, define a dedicated `TeamWhiteLabel` model with a 1:1 relation to `Team`
      for cleaner schema separation — document the decision in a code comment
- [ ] Run `prisma migrate dev --name team-white-label`

_API_
- [ ] Add `PUT /teams/:id/white-label` endpoint to `TeamsModule`:
  - Accept `WhiteLabelDto`: `{ customAppName?, customLogoUrl?, customFaviconUrl?,
    customPrimaryColor?, customDomain?, hideDotyBranding? }`
  - Validate `customPrimaryColor` matches hex color regex `^#[0-9A-Fa-f]{6}$`
  - Validate `customLogoUrl` and `customFaviconUrl` are valid https URLs pointing to
    Supabase Storage (enforce same-origin asset policy to prevent hotlinking arbitrary URLs)
  - Apply `PlanGuard` (Enterprise only) — return `403` for all lower plans
  - Persist changes, return updated team record
- [ ] Add `GET /teams/:id/white-label` to retrieve current white-label config (Enterprise only)
- [ ] When resolving a card's public page, include the team's white-label config in the
      `GET /public/cards/:handle` response if the card's owner is a member of an Enterprise team
      with `hideDotyBranding: true`

_Web — White Label Settings Page_
- [ ] Create `/dashboard/team/white-label` route (Enterprise plan guard — redirect to upsell if
      lower plan)
- [ ] Form fields:
  - App name input (used in `<title>` and nav branding on custom domain)
  - Logo URL input + preview thumbnail (or upload button using existing Supabase Storage uploader)
  - Favicon URL input + preview
  - Primary color picker (hex input + `<input type="color">` native picker)
  - Custom domain input (links to T23 Custom Domain flow for domain setup)
  - "Hide Dotly.one branding" toggle
- [ ] Show "Enterprise only" upsell banner for non-Enterprise teams with a link to billing

_Card Page Rendering (apps/web)_
- [ ] In `app/card/[handle]/page.tsx` (SSR), after fetching card + team white-label config:
  - If `hideDotyBranding: true`: suppress the `<footer>` "Powered by Dotly.one" link entirely
  - If `customLogoUrl` present: render team logo in the card page header/footer area instead
  - If `customPrimaryColor` present: inject as a CSS custom property `--brand-primary` scoped
    to the card page wrapper; update CTA button colors to use this variable
  - If `customFaviconUrl` present: set `<link rel="icon">` in page `<head>` metadata
  - If `customAppName` present: use as the `<title>` and OG `site_name` meta tag

_White-Label Login Page_
- [ ] In `middleware.ts`, detect requests to a custom Enterprise domain (cross-reference
      `Team.customDomain` via the domain resolution cache):
  - Rewrite `/auth` to a white-labeled sign-in page that renders team logo and `customAppName`
    instead of the Dotly.one logo
- [ ] Create `app/(auth)/auth/white-label/page.tsx` as the branded sign-in page variant, accepting
      a `teamId` query param set by the middleware rewrite

_Email White Label (Resend)_
- [ ] When sending lead capture notification emails for a card owned by an Enterprise team with
      `hideDotyBranding: true`:
  - Use the team's `customLogoUrl` in the email header template instead of the Dotly.one logo
  - Set the `from` name to `customAppName` (e.g. "Acme Cards") using a Resend verified domain
    configured for the Enterprise team
  - Do not include "Sent via Dotly.one" footer text in the email body
- [ ] Document in `docs/ENVIRONMENT.md` that Enterprise email white-labeling requires a
      Resend custom domain to be set up per Enterprise team and verified

**Acceptance Criteria:**
- [ ] `PUT /teams/:id/white-label` returns `403` for a Pro user and `200` for an Enterprise user
- [ ] An Enterprise user saving white-label settings persists all six fields correctly in the database
- [ ] An invalid `customPrimaryColor` (e.g. `"red"` instead of `"#FF0000"`) returns `400` with
      a validation error message
- [ ] A public card page belonging to an Enterprise team with `hideDotyBranding: true` renders
      with no "Powered by Dotly.one" footer — verified by inspecting the SSR HTML output
- [ ] A public card page with `customPrimaryColor` set applies the color to CTA buttons — verified
      by checking the injected CSS custom property value in the rendered HTML
- [ ] A public card page with `customFaviconUrl` set has the correct `<link rel="icon">` tag in
      `<head>`
- [ ] A request to the team's `customDomain` for `/auth` renders the branded sign-in page with
      the team logo and `customAppName` instead of Dotly.one branding
- [ ] Lead capture notification emails for an Enterprise white-label team show the team logo and
      `customAppName` sender name — verified in Resend logs
- [ ] Non-Enterprise team members cannot access `/dashboard/team/white-label` — redirected to
      the upsell page
- [ ] A logo URL pointing to a non-Supabase Storage origin is rejected with `400`

---

### T26 — Mobile Card Creation & Editing (apps/mobile)

**Description:**
Build full card creation and editing flows in the React Native app, reaching parity with the
web card builder for all core fields. A user should be able to create, customize, and publish a
card entirely from their phone without ever needing to open a browser. Media blocks (video embeds,
portfolio gallery) remain web-only in Phase 4 and are shown as read-only preview blocks in the
mobile editor.

**Steps:**

_Navigation_
- [ ] Add a "Create Card" FAB (floating action button) on the My Cards tab (`app/(tabs)/index.tsx`)
- [ ] Add a stack navigator nested inside the tabs navigator for card editing:
  ```
  app/(tabs)/cards/
  ├── index.tsx                 # My Cards list (existing)
  ├── create.tsx                # New card creation flow
  └── [id]/
      ├── edit.tsx              # Edit card screen
      └── preview.tsx           # Full-screen card preview
  ```

_Create Card Screen (`create.tsx`)_
- [ ] Step 1 — Template Picker:
  - Horizontally scrollable template selector showing all 4 templates
    (`MINIMAL`, `BOLD`, `CREATIVE`, `CORPORATE`) as thumbnail previews rendered by
    `packages/ui` `CardRenderer` component
  - "Continue" button advances to Step 2
- [ ] Step 2 — Basic Profile Fields:
  - `TextInput` fields: Full Name (required), Job Title, Company, Phone, Email (required),
    Website, Bio (multiline, max 160 chars with character counter)
  - Avatar upload: "Add Photo" button → `expo-image-picker` launches image picker
    (camera or library) → selected image is uploaded to Supabase Storage via the existing
    `POST /upload` endpoint → returned URL set as `avatarUrl` on the card
  - "Create Card" button calls `POST /cards` API and navigates to the Edit screen for the
    new card on success
  - Inline field validation (required fields highlighted on attempted submit)

_Edit Card Screen (`edit.tsx`)_
- [ ] All fields from Create screen, pre-populated with existing card data
- [ ] Social Links Manager:
  - List of existing social links with platform icon, URL, and delete icon
  - "Add Social Link" button: platform picker (dropdown list of all supported platforms)
    + URL input + "Add" confirm
  - Reorder via long-press drag (use `react-native-draggable-flatlist`)
- [ ] Theme section:
  - Primary color picker: a grid of 12 preset colors + a hex input field
    (full color wheel deferred to post-GA)
  - Font family picker: 4 options matching web builder options
- [ ] Handle editor:
  - `TextInput` for the card handle (slug)
  - Real-time availability check: debounce 500ms → call `GET /cards/check-handle?handle=<value>`
    → show green checkmark or red "Handle taken" message
- [ ] Publish / Unpublish toggle: calls `PATCH /cards/:id` with `{ isActive: boolean }`;
      shows confirmation dialog before unpublishing
- [ ] Media blocks read-only notice: if the card has any `MediaBlock` records, render a
      non-interactive banner "Video and portfolio blocks can be edited on the web — dotly.one/dashboard"
- [ ] Auto-save: debounce 1 second on any field change → call `PATCH /cards/:id` with changed
      fields; show "Saved" / "Saving..." indicator in the screen header
- [ ] Optimistic UI: apply changes to local state immediately, revert on API error with a toast

_Preview Screen (`preview.tsx`)_
- [ ] Render the card using the shared `packages/ui` `CardRenderer` component (same component
      used on the web public card page) inside a `ScrollView`
- [ ] "Share" button: native share sheet with the card URL (`expo-sharing` or `Share.share()`)
- [ ] "Open in Browser" button: opens the public card URL in `expo-web-browser`

_Avatar Upload_
- [ ] Request `MediaLibrary` and `Camera` permissions via `expo-image-picker` before opening picker
- [ ] Compress image to max 1MB before upload (use `expo-image-manipulator` to resize to
      max 800×800 and convert to JPEG quality 80)
- [ ] Show upload progress indicator while the image is being uploaded to Supabase Storage
- [ ] On upload error, show a toast and keep the previous avatar

**Acceptance Criteria:**
- [ ] A user can create a new card from the mobile app (select template, fill required fields,
      upload avatar) and the card appears in the My Cards list immediately after creation
- [ ] All 7 core fields (name, title, company, phone, email, website, bio) save correctly and
      are reflected on the public card page after saving
- [ ] Social links added in the mobile editor appear on the public card page in the correct order
- [ ] The handle availability check shows green/red feedback within 600ms of the user stopping
      typing
- [ ] Publish/unpublish toggle updates `isActive` on the card; an unpublished card returns `404`
      on its public URL
- [ ] Auto-save fires within 1 second of the last edit and the "Saved" indicator appears
- [ ] An optimistic UI update that fails (simulated by toggling airplane mode) reverts correctly
      and shows an error toast
- [ ] Avatar image selected from the camera roll is compressed, uploaded, and displayed without
      a full screen reload
- [ ] Cards that have media blocks show the read-only banner and do not crash or attempt to render
      the media editor
- [ ] The `CardRenderer` component on the preview screen is visually identical to the web public
      card page for the same card data — verified by side-by-side screenshot comparison

---

### T27 — Direct Email Send from CRM (Resend)

**Description:**
Allow card owners to compose and send an email to any CRM contact directly from the dashboard,
using Resend as the delivery provider. Every sent email is logged to the contact's timeline so
the full communication history is visible in one place. This makes the inbuilt CRM genuinely
useful for follow-up without needing a separate email client.

**Steps:**

_Database_
- [ ] Create `ContactEmail` model:
  ```
  id            String   @id @default(cuid())
  contactId     String
  contact       Contact  @relation(...)
  ownerUserId   String
  subject       String
  body          String   @db.Text
  fromAddress   String
  resendEmailId String?
  sentAt        DateTime @default(now())
  ```
- [ ] Run `prisma migrate dev --name contact-email-log`

_API — ContactEmailsModule (NestJS)_
- [ ] Create `ContactEmailsModule` with `ContactEmailsController` and `ContactEmailsService`
- [ ] Implement `POST /contacts/:id/emails`:
  - Guard: contact must belong to authenticated user
  - Accept `SendEmailDto`: `{ subject: string, body: string }`
  - Validate: `subject` max 255 chars; `body` max 10,000 chars; both required
  - Enforce rate limit via a custom `RateLimitGuard`:
    - Pro: max 50 emails/day per user (count `ContactEmail` records for `ownerUserId` in last
      24h, return `429 Too Many Requests` if limit exceeded)
    - Business+: max 500 emails/day per user
    - Free: email send is not permitted, return `403`
  - Look up the user's configured reply-to address from `UserEmailSettings` (see below);
    fall back to the user's account email
  - Call Resend SDK: `resend.emails.send({ from, to, subject, html: body })`
  - Persist `ContactEmail` record with the Resend `emailId`
  - Return `{ id, sentAt, resendEmailId }`
- [ ] Implement `GET /contacts/:id/emails`:
  - Guard: contact must belong to authenticated user
  - Return all `ContactEmail` records for the contact, ordered by `sentAt` desc
  - Include `subject`, `sentAt`, `fromAddress` in the response (not the full body — body
    is fetched lazily on expand)
- [ ] Add `GET /contacts/:id/emails/:emailId` to return the full email body for a single record

_User Email Settings_
- [ ] Create `UserEmailSettings` model:
  ```
  id              String  @id @default(cuid())
  userId          String  @unique
  replyToAddress  String?
  signatureHtml   String? @db.Text
  ```
- [ ] Run `prisma migrate dev --name user-email-settings`
- [ ] Add `GET /settings/email` and `PUT /settings/email` endpoints in a `SettingsModule`
- [ ] `PUT /settings/email` accepts `{ replyToAddress?: string, signatureHtml?: string }`;
      validate `replyToAddress` is a valid email format

_Web UI_
- [ ] Contact detail drawer / page: add "Send Email" button in the action bar
- [ ] "Send Email" opens a compose modal (Shadcn `Dialog`):
  - Subject input field
  - Rich text body editor (use `@tiptap/react` minimal setup: bold, italic, link, paragraph)
  - If `signatureHtml` is configured for the user, append it to the body automatically
    (user can delete it before sending)
  - "Send" button with loading state; closes modal on success and shows success toast
  - "Cancel" button discards the draft
- [ ] Contact timeline section: render a chronological list of timeline items interleaving
      `ContactEmail` records with existing notes and stage changes:
  - Email item: envelope icon, subject, sent timestamp, "View" expand button that reveals body
- [ ] Create `/dashboard/settings/email` page:
  - Reply-to address field with save button
  - Email signature section (links to T28 Email Signature Generator at
    `/dashboard/email-signature` — show a shortcut link here)

**Acceptance Criteria:**
- [ ] A Pro user can open the compose modal from a contact's detail view, fill subject and body,
      and send — the email is delivered (verified in Resend dashboard logs)
- [ ] The sent email appears in the contact's timeline immediately after sending without a
      page reload
- [ ] A Pro user who has sent 50 emails in the last 24 hours receives `429 Too Many Requests`
      on the 51st send attempt; the error is shown as a toast in the UI
- [ ] A Free user cannot access the send button — the button is hidden and `POST /contacts/:id/emails`
      returns `403`
- [ ] `POST /contacts/:id/emails` for a contact that belongs to a different user returns `404`
      (not `403` — to avoid user enumeration)
- [ ] The user's configured reply-to address appears as the `Reply-To` header in the sent email —
      verified in Resend logs
- [ ] A user's email signature (configured at `/dashboard/settings/email`) is pre-populated in
      the compose modal body
- [ ] `GET /contacts/:id/emails` returns emails only for the authenticated user's contacts —
      no cross-user data leakage
- [ ] The compose modal shows a character counter warning at 9,000 characters and blocks submission
      at 10,001 characters
- [ ] Business+ user's daily limit is 500 emails — verified by checking the rate limit guard
      logic in a unit test

---

### T28 — Email Signature Generator

**Description:**
Provide a tool that generates a professional HTML email signature from any of the user's cards.
The signature must be compatible with Gmail, Outlook, and Apple Mail without external CSS
dependencies, and must be copyable in a format that pastes correctly into each client's compose
window. This is also a viral loop — every email sent with a Dotly signature is an impression
for the product.

**Steps:**

_Route & Layout_
- [ ] Create `/dashboard/email-signature` page in `apps/web`
- [ ] Page layout: left column = controls, right column = live preview iframe

_Signature Generation Logic_
- [ ] Create a pure TypeScript function `generateSignatureHtml(card: CardData, style: SignatureStyle): string`
      in `packages/ui/src/signature/generateSignatureHtml.ts`
- [ ] Implement three signature styles:
  - **Classic**: two-column table — avatar on left (60×60px circle), text on right
    (name bold, title, company, phone, email as mailto link, card URL as "View my digital card",
    social icons row)
  - **Compact**: single-row, no avatar, name | title | company | card URL inline, social icon
    row below
  - **Modern**: full-width single column, avatar centered top, name large, title/company small,
    card URL as a styled button (inline background-color), social icons centered below
- [ ] All styles must use only inline CSS (`style=""` attributes) and HTML tables — no external
      stylesheets, no `<style>` blocks, no CSS classes (required for Outlook compatibility)
- [ ] Social icons: use 16×16 PNG icons hosted on Supabase Storage (static assets) referenced
      by absolute URL — do not use SVG (not supported in Outlook)
- [ ] "View my digital card" link must include UTM parameters:
      `?utm_source=email_signature&utm_medium=email&utm_campaign=dotly_sig`

_Web UI_
- [ ] Card selector: `<Select>` dropdown showing all the user's cards (fetched from
      `GET /cards`) — selecting a card updates the preview in real time
- [ ] Style picker: three buttons/tabs for Classic, Compact, Modern
- [ ] Live preview: render the generated HTML inside a sandboxed `<iframe srcDoc={signatureHtml}>`
      so iframe styles do not bleed into the dashboard page
- [ ] "Copy HTML" button:
  - Copies raw `signatureHtml` string to clipboard via `navigator.clipboard.writeText()`
  - Shows "Copied!" confirmation tooltip for 2 seconds
- [ ] "Copy for Gmail" button:
  - Uses `ClipboardItem` with `text/html` MIME type:
    ```ts
    const item = new ClipboardItem({ 'text/html': new Blob([signatureHtml], { type: 'text/html' }) })
    await navigator.clipboard.write([item])
    ```
  - This allows pasting directly into Gmail's compose window with formatting preserved
  - Show a tooltip "Paste into Gmail Settings → See all settings → General → Signature"
    with step instructions
- [ ] "Download HTML" button: creates a `Blob` with MIME `text/html`, triggers a download of
      `dotly-signature.html` via a temporary `<a>` element
- [ ] Persist the user's last-used style preference in `UserEmailSettings.signatureStyle`
      (new field: `String?`, values `CLASSIC | COMPACT | MODERN`)

_Integration with T27_
- [ ] After a signature is generated, a "Use as My Email Signature" button calls
      `PUT /settings/email` with `{ signatureHtml: <generated html> }` so it is pre-populated
      in the T27 email compose modal

**Acceptance Criteria:**
- [ ] Selecting a card and a style instantly updates the live iframe preview without a page reload
- [ ] The generated HTML for all three styles passes W3C HTML validation with no errors
- [ ] The generated HTML uses only inline styles and tables — no `<style>` blocks present in
      the output (verified by parsing the HTML string)
- [ ] "Copy HTML" copies the raw HTML string; pasting into a plain text editor shows the HTML
      markup correctly
- [ ] "Copy for Gmail" copies the HTML with `text/html` MIME type; pasting into a Gmail compose
      window renders the formatted signature (tested manually in Chrome)
- [ ] "Download HTML" triggers a file download of `dotly-signature.html` containing the full
      signature markup
- [ ] Social icons render as 16×16px images with `alt` text in the generated HTML
- [ ] The "View my digital card" link in the signature includes all three UTM parameters
- [ ] "Use as My Email Signature" saves the HTML to `UserEmailSettings` and it appears in the
      T27 compose modal on next open
- [ ] The signature generator page renders without error when the user has no cards yet
      (empty state with a CTA to create a card)
- [ ] All three styles render correctly in a sandboxed iframe without cross-frame CSS bleed

---

### T29 — E2E Test Suite (Playwright)

**Description:**
Build a comprehensive Playwright end-to-end test suite covering the full critical user journey —
from sign-up through card creation, lead capture, billing, and custom domain setup. Tests run
in CI on every PR targeting `main`, and visual regression snapshots are captured for all four
card templates to catch unintended UI regressions between deploys.

**Steps:**

_Setup_
- [ ] Install Playwright in `apps/web`:
      `pnpm --filter web add -D @playwright/test`
- [ ] Run `pnpm --filter web exec playwright install --with-deps chromium firefox`
- [ ] Create `apps/web/playwright.config.ts`:
  - `testDir: './e2e'`
  - `baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'`
  - Projects: `chromium` (primary), `firefox` (secondary), `Mobile Chrome` (for card page tests)
  - `webServer`: launch `pnpm dev` before tests when `PLAYWRIGHT_BASE_URL` is not set
  - `reporter`: `['list', ['html', { open: 'never' }]]`

_Test Suites_

- [ ] **Auth flow** (`e2e/auth.spec.ts`):
  - Sign up with a new email+password → verify redirect to `/dashboard`
  - Sign in with existing credentials → verify dashboard accessible
  - Sign out → verify redirect to `/auth`
  - Google OAuth: mock the Supabase OAuth endpoint using Playwright's `page.route()` to
    intercept the OAuth redirect and inject a mock session cookie; verify dashboard accessible

- [ ] **Card builder** (`e2e/card-builder.spec.ts`):
  - Sign in as a test user (fixture)
  - Create a new card: select MINIMAL template, fill all 7 core fields, add one social link
  - Publish the card
  - Visit the public URL `/card/<handle>`
  - Assert SSR: verify page `<title>` contains the card owner's name, and the card name and
    job title are visible in the DOM (using `page.locator` — not `innerHTML` snapshots)
  - Assert OG meta tag `og:title` is present and correct

- [ ] **Lead capture** (`e2e/lead-capture.spec.ts`):
  - Visit a published public card page as an unauthenticated user
  - Submit the lead capture form with name, email, and phone
  - Sign in as the card owner
  - Navigate to `/dashboard/contacts`
  - Assert the submitted lead appears in the contact list with correct name and email

- [ ] **Analytics** (`e2e/analytics.spec.ts`):
  - Visit a published public card page
  - Verify a `VIEW` analytics event is recorded: call `GET /analytics/cards/:id/summary`
    API directly via `request.get()` and assert `totalViews >= 1`
  - Sign in as the card owner, navigate to `/dashboard/analytics`
  - Assert the view count widget shows a non-zero value

- [ ] **QR code** (`e2e/qr-code.spec.ts`):
  - Sign in, navigate to a card's QR code settings
  - Click "Download PNG"
  - Assert the downloaded file exists and has a file size > 0 bytes (use Playwright
    `download` event)

- [ ] **Billing** (`e2e/billing.spec.ts`):
  - Sign in as a Free user
  - Click "Upgrade to Pro" → Stripe Checkout opens (Stripe test mode)
  - Use Playwright to fill Stripe test card `4242 4242 4242 4242`, expiry `12/34`, CVC `424`
  - Complete checkout → verify redirect back to dashboard
  - Verify the plan badge in the dashboard header shows "Pro"
  - Navigate to a Pro-gated feature (e.g. lead capture settings) and verify it is accessible
  - Downgrade via billing portal (or simulate via test webhook `customer.subscription.updated`)
  - Verify the Pro feature is gated again (plan badge shows "Free")

- [ ] **Custom domain** (`e2e/custom-domain.spec.ts`):
  - Sign in as a Business+ user
  - Navigate to `/dashboard/settings`
  - Submit a test domain `e2e-test.example.com`
  - Verify the DNS instructions panel is visible and contains a CNAME target of
    `cname.dotly.one` and a TXT record starting with `dotly-verify-`
  - Verify the domain status badge shows "Pending DNS"

_Visual Regression_
- [ ] Create `e2e/visual-regression.spec.ts`:
  - Seed one test card for each of the 4 templates (MINIMAL, BOLD, CREATIVE, CORPORATE)
  - Visit each card's public URL
  - Capture a full-page screenshot with `page.screenshot({ fullPage: true })`
  - Store screenshots as baseline snapshots in `e2e/snapshots/`
  - On subsequent runs, diff against the baseline and fail if pixel difference exceeds 0.1%
    threshold (use Playwright's built-in `expect(page).toHaveScreenshot()`)
- [ ] Add the baseline snapshots to `.gitignore` except for the initial committed baselines;
      document the process for updating baselines in a code comment

_CI Integration_
- [ ] Add a new job `e2e` to `.github/workflows/ci.yml`:
  ```yaml
  e2e:
    runs-on: ubuntu-latest
    needs: [build]
    services:
      postgres:
        image: postgres:15
        env: { POSTGRES_PASSWORD: postgres, POSTGRES_DB: dotly_test }
      redis:
        image: redis:7
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install
      - run: pnpm --filter database exec prisma migrate deploy
        env: { DATABASE_URL: postgresql://postgres:postgres@localhost:5432/dotly_test }
      - run: pnpm --filter database exec prisma db seed
        env: { DATABASE_URL: postgresql://postgres:postgres@localhost:5432/dotly_test }
      - run: pnpm --filter web exec playwright install --with-deps chromium
      - run: pnpm --filter web exec playwright test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/dotly_test
          NEXT_PUBLIC_API_URL: http://localhost:3001
          PLAYWRIGHT_BASE_URL: http://localhost:3000
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: apps/web/playwright-report/
  ```
- [ ] E2E job runs only on PRs targeting `main` (add `on: pull_request: branches: [main]`)
- [ ] Mark the `e2e` job as a required check in the branch protection rule for `main`

**Acceptance Criteria:**
- [ ] All 6 test suites pass on a clean checkout against a local seeded database
- [ ] The auth flow test correctly mocks Google OAuth without requiring real credentials in CI
- [ ] The billing test completes the Stripe test mode checkout flow end-to-end using test card
      `4242 4242 4242 4242` without manual intervention
- [ ] The card builder test verifies SSR content (OG tags + card fields) on the public page
- [ ] The lead capture test verifies a submitted lead appears in the CRM contacts list
- [ ] The QR download test asserts a non-empty PNG file was downloaded
- [ ] The custom domain test verifies DNS instructions are rendered correctly
- [ ] Visual regression tests capture baselines for all 4 card templates and fail if pixel
      difference exceeds 0.1%
- [ ] The Playwright CI job passes on a green PR and uploads an HTML report artifact on failure
- [ ] E2E test run completes in under 8 minutes in CI (parallel test execution enabled)
- [ ] No test relies on `page.waitForTimeout()` — all waits use Playwright's smart locator
      waiting strategy

---

### T30 — Performance & Accessibility Hardening

**Description:**
Drive the public card page to a Lighthouse mobile score of ≥ 90, enforce API response time SLAs,
apply security headers across all responses, achieve WCAG AA color contrast compliance, and
ensure full keyboard and screen reader navigability across the dashboard and public pages.
This is the final engineering gate before general availability — performance and accessibility
are not optional polish, they are launch requirements.

**Steps:**

_Next.js — Image Optimization_
- [ ] Audit all `<img>` tags across `apps/web` — replace every instance with `next/image`
- [ ] Set explicit `width` and `height` props on all `next/image` instances to eliminate
      Cumulative Layout Shift (CLS)
- [ ] Configure `next.config.ts` `images.formats: ['image/avif', 'image/webp']` for modern
      format delivery
- [ ] Set `next/image` `sizes` prop on card page avatar and logo images to match rendered size
      (e.g. `sizes="(max-width: 768px) 80px, 120px"`) to avoid downloading oversized images

_Next.js — Font Optimization_
- [ ] Replace any `@import url('https://fonts.googleapis.com/...')` calls with `next/font/google`
      equivalents in the card page and dashboard layout
- [ ] Use `display: 'swap'` and `subsets: ['latin']` to minimize font download size and
      eliminate invisible-text flash (FOIT)
- [ ] Confirm zero layout shift from font loading — verify with Lighthouse CLS score of 0

_Next.js — Bundle Analysis_
- [ ] Install `@next/bundle-analyzer`: `pnpm --filter web add -D @next/bundle-analyzer`
- [ ] Add `analyze` script to `apps/web/package.json`:
      `"analyze": "ANALYZE=true next build"`
- [ ] Run bundle analysis, identify and eliminate any large unnecessary imports on the
      card page route
- [ ] Target: first-load JS for `/card/[handle]` ≤ 200KB (gzip)
- [ ] Common reductions to investigate: tree-shake icon libraries (import individual icons,
      not entire packs), lazy-load the QR code renderer with `next/dynamic`, code-split the
      dashboard vs card page bundles

_Next.js — ISR (Incremental Static Regeneration)_
- [ ] Convert `app/card/[handle]/page.tsx` from a fully dynamic SSR page to an ISR page:
  - Add `export const revalidate = 60` to the page module (revalidates every 60 seconds)
  - Add `generateStaticParams()` to pre-generate the top 100 most-viewed card handles at
    build time (query `AnalyticsEvent` for top handles by view count)
  - Cards not in `generateStaticParams()` are rendered on first request and then cached
  - Force-revalidate a specific card via `revalidatePath('/card/' + handle)` called from the
    API whenever a card is updated (`PATCH /cards/:id`)
- [ ] Document the ISR revalidation strategy in a code comment at the top of the page file:
  - Static generation for top 100 cards at build time
  - On-demand revalidation via API webhook on card update
  - Background revalidation every 60 seconds for all other cards
  - Implication: a card edit may take up to 60 seconds to appear on the live page for
    non-top-100 cards; on-demand revalidation reduces this to ~2 seconds for active editors

_API — Response Time & Indexing_
- [ ] Run an index audit on the `AnalyticsEvent`, `Contact`, and `Card` tables:
  - Confirm `Card.handle` has a unique index (from Phase 1)
  - Add composite index `(cardId, createdAt)` on `AnalyticsEvent` for time-series queries
  - Add index on `Contact.ownerUserId` and `Contact.createdAt` for CRM list queries
  - Add index on `CustomDomain.domain` (unique, from Phase 1) — confirm it is present
  - Run `prisma migrate dev --name perf-indexes`
- [ ] Add `p95` response time assertion to the Playwright API test fixture:
  - Measure 20 sequential calls to `GET /public/cards/:handle`
  - Assert p95 ≤ 100ms (local, against seeded data)
- [ ] Alternatively, run `autocannon` benchmark: `autocannon -c 10 -d 10 http://localhost:3001/public/cards/test-user`
      and document the result in a PR comment

_API — Rate Limiting_
- [ ] Install `express-rate-limit` (or `@nestjs/throttler` for NestJS):
      `pnpm --filter api add @nestjs/throttler`
- [ ] Configure `ThrottlerModule` globally:
  - Public endpoints (`/public/*`): 100 requests/minute per IP
  - Auth endpoints (`/auth/*`): 10 requests/minute per IP
  - Authenticated endpoints: 300 requests/minute per user
- [ ] Add `ThrottlerGuard` as a global guard (after `JwtAuthGuard`)
- [ ] Return `429 Too Many Requests` with `Retry-After` header when limit is exceeded

_API — Security Headers (Helmet.js)_
- [ ] Install `helmet`: `pnpm --filter api add helmet`
- [ ] Apply `helmet()` middleware globally in `main.ts` before the NestJS app bootstraps
- [ ] Configure Helmet options:
  - `contentSecurityPolicy`: configure `defaultSrc`, `scriptSrc`, `imgSrc`, `connectSrc`
    to allow Supabase Storage and Resend image domains
  - `crossOriginEmbedderPolicy: false` (required for iframe embeds in card pages)
  - `hsts`: `{ maxAge: 31536000, includeSubDomains: true }`
- [ ] Verify headers in Playwright test: `GET /health` response must include
      `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`,
      `Strict-Transport-Security` headers

_Accessibility — Keyboard Navigation_
- [ ] Audit the card builder (`/dashboard/cards/[id]/edit`) and the CRM contacts page:
  - Tab order follows logical reading order — verify using browser DevTools accessibility tree
  - All interactive elements (buttons, inputs, dropdowns, modals) are reachable via Tab and
    activated via Enter/Space
  - Modal dialogs trap focus (Tab cycles within the modal; Escape closes the modal)
  - Drag-and-drop in the social links reorder list has a keyboard alternative (up/down arrow
    keys to reorder)

_Accessibility — ARIA Labels_
- [ ] Audit all interactive elements across the dashboard and public card page:
  - All icon-only buttons have `aria-label` (e.g. "Delete social link", "Copy card URL")
  - All form inputs have associated `<label>` elements (not just placeholder text)
  - All card template preview thumbnails have `alt` text describing the template style
  - All status badges have `aria-label` describing the status meaning
  - The Kanban pipeline columns have `role="list"` and each card has `role="listitem"`

_Accessibility — Color Contrast_
- [ ] Install `axe-core` Playwright integration:
      `pnpm --filter web add -D axe-playwright`
- [ ] Add `e2e/accessibility.spec.ts`:
  - Run `checkA11y(page)` on the public card page for all 4 templates
  - Run `checkA11y(page)` on the dashboard home, card builder, and contacts page
  - Assert zero WCAG AA contrast violations
- [ ] Manually audit the default card templates: ensure text-on-background color combinations
      all meet 4.5:1 ratio (AA) for normal text and 3:1 for large text
- [ ] Fix any contrast violations found in Tailwind theme config or card template styles

_Accessibility — Screen Reader Testing_
- [ ] Test the public card page with VoiceOver (macOS/iOS):
  - Navigate through the entire page using VoiceOver keyboard commands
  - Verify the card holder's name, job title, company, social links, and CTA buttons are all
    announced correctly
  - Verify the lead capture form fields are announced with their labels
- [ ] Test with TalkBack (Android) on the mobile app card preview screen
- [ ] Document any issues found and fix before marking this task complete

_Lighthouse CI_
- [ ] Install `@lhci/cli`: `pnpm --filter web add -D @lhci/cli`
- [ ] Create `apps/web/lighthouserc.js`:
  ```js
  module.exports = {
    ci: {
      collect: {
        url: ['http://localhost:3000/card/test-user'],
        numberOfRuns: 3,
      },
      assert: {
        assertions: {
          'categories:performance': ['error', { minScore: 0.9 }],
          'categories:accessibility': ['error', { minScore: 0.9 }],
          'categories:best-practices': ['warn', { minScore: 0.9 }],
          'categories:seo': ['warn', { minScore: 0.9 }],
        },
      },
      upload: { target: 'temporary-public-storage' },
    },
  }
  ```
- [ ] Add `lhci` job to `.github/workflows/ci.yml` running after the `build` job:
  - Boot the Next.js server with the seeded test card
  - Run `lhci autorun`
  - Assert mobile Lighthouse performance score ≥ 90 (fail CI if below threshold)

**Acceptance Criteria:**
- [ ] All `<img>` tags on the public card page are replaced with `next/image` — verified by
      running `grep -r '<img' apps/web/app/card` returning zero results
- [ ] Google Fonts are loaded via `next/font` with zero FOIT or CLS — verified by Lighthouse
      CLS score of 0 on the card page
- [ ] First-load JS for the `/card/[handle]` route is ≤ 200KB (gzip) — verified by bundle
      analyzer output
- [ ] The card page uses ISR with `revalidate = 60`; updating a card via the API triggers
      `revalidatePath` and the live page reflects the change within 5 seconds
- [ ] `GET /public/cards/:handle` p95 response time is ≤ 100ms against a local seeded database
      with 1,000 analytics events — verified by autocannon benchmark
- [ ] All API responses include `X-Content-Type-Options: nosniff` and
      `Strict-Transport-Security` headers — verified in the Playwright security headers test
- [ ] `GET /public/cards/test-user` returns `429` after 100 requests within one minute from
      the same IP — verified by a Playwright test that fires 101 rapid requests
- [ ] Zero WCAG AA color contrast violations on all 4 card templates — verified by the
      `axe-playwright` accessibility spec
- [ ] All icon-only buttons have `aria-label` attributes — verified by the axe-core scan
- [ ] Modal dialogs trap focus correctly — verified by keyboard navigation manual test
- [ ] Lighthouse mobile score ≥ 90 on performance AND accessibility on the `/card/test-user`
      page — enforced as a failing CI check
- [ ] VoiceOver announces all card fields and the lead capture form labels correctly — verified
      manually and documented in a PR comment

---

## Phase 4 — Definition of Done

The phase is complete when all of the following are true:

- [ ] All 8 tasks (T23–T30) have every acceptance criterion checked
- [ ] A Business+ user can register a custom domain, receive DNS instructions, and have their
      card served from that domain without any engineering intervention
- [ ] An Enterprise user can configure a full white-label workspace (custom logo, colors,
      hidden Dotly branding) and the changes are reflected on the public card page and
      outbound emails
- [ ] A mobile user can create a new card, add social links, upload an avatar, and publish —
      entirely from the Expo app — and the card is immediately live on the web
- [ ] A mobile user with an NFC-capable device can write their card URL to a blank NTAG tag;
      a third-party device tapping the tag opens the card in the browser
- [ ] A Pro user can send an email to a CRM contact from within the dashboard, and the email
      appears in the contact's timeline
- [ ] A user can generate an HTML email signature from any of their cards and copy it directly
      into Gmail without losing formatting
- [ ] All 6 Playwright E2E test suites pass in CI on a PR targeting `main`
- [ ] Visual regression baselines are committed for all 4 card templates; no snapshot diff
      failures on a clean PR
- [ ] Lighthouse mobile score ≥ 90 on both performance and accessibility for the public card
      page, enforced as a failing CI check
- [ ] First-load JS for the card page is ≤ 200KB (gzip)
- [ ] Zero WCAG AA contrast violations detected by axe-core on the public card page and
      dashboard home
- [ ] All API responses include Helmet.js security headers
- [ ] `p95 GET /public/cards/:handle` ≤ 100ms verified by benchmark
- [ ] The ISR revalidation strategy is implemented and documented — card updates appear on the
      live page within 5 seconds (on-demand) or 60 seconds (background)
- [ ] No `TODO` or `FIXME` comments left untracked — all deferred items have open GitHub issues
- [ ] Phase 5 can begin immediately; no Phase 4 task requires rework

---

## Dependencies & Blockers

| Dependency | Owner | Needed by | Notes |
|---|---|---|---|
| Vercel API token + Project ID (`VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`) | DevOps / Team lead | T23 | Required to add custom domains to the Vercel project programmatically and provision SSL; without this, SSL provisioning falls back to the Railway + Let's Encrypt path |
| Expo NFC entitlement for iOS (`com.apple.developer.nfc.readersession.formats`) | Mobile lead | T24 | Must be added to `app.json` and an EAS build must be triggered before NFC can be tested on a physical iOS device; iOS Simulator does not support NFC |
| Physical NFC tags (NTAG213/215/216) for testing | QA | T24 | Cannot be tested on emulators; at least 5 physical blank NFC tags required for write and overwrite test coverage |
| Enterprise client or internal test account for white-label testing | Product / Sales | T25 | The white-label feature requires an Enterprise-plan workspace to fully exercise; a test Enterprise account must be provisioned in staging before T25 acceptance criteria can be signed off |
| Resend custom domain verified per Enterprise team | DevOps | T25 | White-label outbound emails require a Resend sending domain separate from the default `dotly.one` sending domain; each Enterprise team needs a verified Resend domain or a shared branded domain configured |
| Stripe test mode active with test products matching Pro / Business plans | DevOps | T29 | The Playwright billing E2E test requires Stripe test mode keys and the correct test price IDs to be set in the staging environment; mismatched IDs cause silent checkout failures |
| Staging environment with seeded test data | DevOps | T29, T30 | All E2E tests and the Lighthouse CI job require a running staging environment with the seeded `test-user` card and associated analytics events |

---

## Notes

- **T26 — Mobile card builder media block deferral:** The mobile card builder (T26) does not
  include editing of `MediaBlock` records (video embeds and portfolio image gallery). These
  blocks are intentionally deferred to a post-GA mobile release. The rationale is that media
  block editing requires a file upload manager and a video URL embed parser that would
  significantly increase the scope of T26. In Phase 4, the mobile editor renders a read-only
  notice for cards that already contain media blocks, directing the user to the web dashboard.
  A GitHub issue must be opened tracking "Mobile media block editing — post-GA" before T26 is
  closed.

- **T30 — ISR revalidation strategy:** The public card page in Phase 1–3 was built as a
  fully dynamic SSR page (`no-store` fetch, no caching). Converting it to ISR in T30 requires
  three coordinated changes: (1) add `export const revalidate = 60` to the page module, which
  switches Next.js from dynamic rendering to ISR; (2) add `generateStaticParams()` to
  pre-generate the top 100 card handles at build time, reducing cold-start latency for high-traffic
  cards; (3) call `revalidatePath('/card/' + handle)` from the NestJS API in the
  `PATCH /cards/:id` handler (via a Next.js revalidation webhook or direct Next.js server
  action call) to trigger on-demand revalidation within ~2 seconds of a card being edited.
  The implication for editors: a card update may take up to 60 seconds to appear live for
  cards not in the top-100 pre-generated set, unless the on-demand revalidation webhook is
  correctly wired. This must be documented in the user-facing help center before GA launch.

- **T23 — DNS propagation user experience:** DNS TTL means verification can take minutes to
  hours even after a user correctly adds their records. The UX must clearly communicate this
  with a "DNS changes can take up to 48 hours to propagate" message and a visible "Pending DNS"
  state. The BullMQ polling job provides silent background verification so the user does not
  need to click "Verify Now" repeatedly — the status will update automatically when DNS
  propagates. The 72-hour polling cutoff is a hard limit to prevent zombie jobs for abandoned
  domain setups.

- **T29 — Visual regression baseline management:** The initial visual regression baselines
  committed with T29 represent the source-of-truth for all four card template appearances.
  When a deliberate design change is made to any template, the baseline must be updated by
  running `playwright test --update-snapshots` locally and committing the updated snapshot
  files. This process must be documented in `CONTRIBUTING.md`. Unintended snapshot failures
  on a PR are a signal of a visual regression and must not be bypassed by updating snapshots
  without design review.

---

*Phase 4 of 5 — Dotly.one / Prev: Phase 3 — Growth Features | Next: Phase 5 — Production Hardening & AI*
