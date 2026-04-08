# Phase 2 — Core MVP

**Duration:** Weeks 4–7
**Goal:** Deliver everything a user needs to go from sign-up to a live, shareable, beautiful digital
business card — including the shared card renderer, the full card CRUD API, the web card builder,
the public SSR card page, QR code generation, an analytics recording pipeline, and the mobile card
list and preview screen.

**Definition of done:** Every task below has its acceptance criteria met. A user can sign up, build
a card with avatar, social links, and a media embed, publish it to a live public URL, share it via
QR code, and see view/click analytics in the dashboard. The mobile app displays the user's cards and
renders a full card preview with a QR code.

---

## Task List

---

### T10 — Shared Card Renderer (`packages/ui`)

**Description:**
Build the production-ready `CardRenderer` component in `packages/ui` that is shared across the
Next.js web app and the React Native mobile app. The component accepts a typed `CardRendererProps`
object and renders one of four template layouts. Platform-specific output is handled through
conditional exports so that the web build receives HTML/Tailwind classes and the mobile build
receives NativeWind-compatible primitives. All sub-components are individually exported for use in
the card builder preview and the public card page. A Storybook instance documents every template and
sub-component in isolation.

**Steps:**
- [ ] Define `CardRendererProps` in `packages/types/src/card-renderer.types.ts`:
  - `card: CardData` — all card field data (name, title, company, bio, phone, email, website)
  - `theme: CardThemeData` — primaryColor, secondaryColor, fontFamily, backgroundUrl, logoUrl
  - `socialLinks: SocialLinkData[]` — platform, url, displayOrder
  - `mediaBlocks: MediaBlockData[]` — type (`VIDEO | IMAGE`), url, caption, displayOrder
  - `mode: 'web' | 'mobile'` — controls platform-aware rendering
  - `template: CardTemplate` — `MINIMAL | BOLD | CREATIVE | CORPORATE`
  - `onLeadCapture?: () => void` — callback for lead capture button tap
  - `onSaveContact?: () => void` — callback for save contact button tap
  - `onSocialLinkClick?: (platform: string, url: string) => void` — analytics callback
- [ ] Create `packages/ui/src/components/card/` directory structure:
  ```
  card/
  ├── CardRenderer.tsx            # Root renderer — selects template and composes sub-components
  ├── templates/
  │   ├── MinimalTemplate.tsx
  │   ├── BoldTemplate.tsx
  │   ├── CreativeTemplate.tsx
  │   └── CorporateTemplate.tsx
  ├── blocks/
  │   ├── AvatarBlock.tsx         # Circular avatar with fallback initials
  │   ├── SocialLinkList.tsx      # Row/grid of social icons with tap handler
  │   ├── MediaBlockList.tsx      # YouTube embed (web) or thumbnail (mobile)
  │   ├── LeadCaptureButton.tsx   # "Connect with me" CTA
  │   └── SaveContactButton.tsx   # "Save Contact" / download vCard CTA
  └── index.ts                    # Named exports for all components
  ```
- [ ] Implement `AvatarBlock`:
  - Renders `<img>` (web) or `<Image>` (mobile) when `avatarUrl` is present
  - Falls back to a colored circle with the user's initials derived from `card.name`
  - Accepts `size: 'sm' | 'md' | 'lg'` prop
- [ ] Implement `SocialLinkList`:
  - Maps `socialLinks` array to icon buttons (use `lucide-react` on web, `@expo/vector-icons`
    on mobile)
  - Calls `onSocialLinkClick(platform, url)` on tap
  - Opens URL: `window.open` on web, `Linking.openURL` on mobile
  - Renders nothing if `socialLinks` is empty
- [ ] Implement `MediaBlockList`:
  - For `type === 'VIDEO'` on web: renders a responsive `<iframe>` YouTube/Vimeo embed
    (extract embed URL from standard share URL)
  - For `type === 'VIDEO'` on mobile: renders a thumbnail image with a play icon overlay
    (full-screen WebView on tap)
  - For `type === 'IMAGE'`: renders a responsive image in a horizontal scroll gallery
  - Renders nothing if `mediaBlocks` is empty
- [ ] Implement `LeadCaptureButton`:
  - Renders a primary CTA button labeled "Connect with Me"
  - Calls `onLeadCapture()` on press
  - Hidden if `onLeadCapture` prop is not provided
- [ ] Implement `SaveContactButton`:
  - Renders a secondary button labeled "Save Contact"
  - Calls `onSaveContact()` on press
  - Hidden if `onSaveContact` prop is not provided
- [ ] Implement `MinimalTemplate`:
  - Single-column centered layout
  - Order: AvatarBlock (lg) → name + title → company → bio → SocialLinkList → MediaBlockList
    → LeadCaptureButton → SaveContactButton
  - Clean white/light background, minimal typography
- [ ] Implement `BoldTemplate`:
  - Full-width colored header band using `primaryColor`
  - AvatarBlock overlapping the header band at the bottom edge
  - Bold typography for name and title in `secondaryColor`
  - Social links as pill badges
- [ ] Implement `CreativeTemplate`:
  - Left-sidebar layout: AvatarBlock + social icons in a colored sidebar
  - Right content panel: name, title, bio, media blocks
  - Background image support via `theme.backgroundUrl` with overlay gradient
- [ ] Implement `CorporateTemplate`:
  - Two-row header: logo (left) + name/title (right), company color bar
  - Below: horizontal divider, contact details row, bio, SocialLinkList as text list,
    MediaBlockList, CTA buttons
  - Professional serif/sans font pairing
- [ ] Implement `CardRenderer`:
  - Receives `CardRendererProps` and switches on `template` to render the correct template
  - Passes all sub-component props down
  - Wraps the output in a container with `max-w-md` (web) or fixed mobile card width
- [ ] Create platform-aware exports in `packages/ui/package.json`:
  - `"main"` points to CJS build (web)
  - `"react-native"` field points to a React Native–specific entry that replaces web-only
    primitives (`<img>`, `<iframe>`) with their RN equivalents
- [ ] Set up Storybook in `packages/ui`:
  - Install `@storybook/react-vite` and configure `.storybook/`
  - Write a story for each of the 4 templates with realistic mock `CardRendererProps`
  - Write stories for each of the 5 sub-components individually
  - Run Storybook with `pnpm --filter @dotly/ui storybook`
- [ ] Export all public components and types from `packages/ui/src/index.ts`
- [ ] Update `turbo.json` to include a `storybook:build` pipeline task

**Acceptance Criteria:**
- [ ] `import { CardRenderer } from '@dotly/ui'` resolves in both `apps/web` and `apps/mobile`
      with no TypeScript errors
- [ ] All four templates render visually correctly in Storybook with no console errors
- [ ] `CardRendererProps` is fully typed with no `any` in `packages/types`
- [ ] `AvatarBlock` renders initials fallback when `avatarUrl` is `null`
- [ ] `SocialLinkList` renders an empty fragment (no DOM nodes) when `socialLinks` is `[]`
- [ ] `MediaBlockList` renders an `<iframe>` embed on web and a thumbnail on mobile for a
      YouTube URL
- [ ] `LeadCaptureButton` and `SaveContactButton` do not render when their callback props are
      omitted
- [ ] `pnpm --filter @dotly/ui storybook` starts with no errors and opens all stories
- [ ] `turbo typecheck` passes across all workspaces after adding the renderer
- [ ] Each template is visually distinct — a screenshot diff between any two templates shows
      clear layout differences

---

### T11 — Card CRUD API (`apps/api`)

**Description:**
Implement the full `CardsModule` in the NestJS API, covering all CRUD operations, a public
read endpoint, DTOs with validation, an owner guard, a plan enforcement guard, handle conflict
handling, a signed Supabase Storage upload URL endpoint, and a vCard generation endpoint.

**Steps:**
- [ ] Create `CardsModule` in `apps/api/src/cards/` with the following files:
  ```
  cards/
  ├── cards.module.ts
  ├── cards.controller.ts
  ├── cards.service.ts
  ├── cards.public.controller.ts      # Unauthenticated public endpoints
  ├── dto/
  │   ├── create-card.dto.ts
  │   ├── update-card.dto.ts
  │   ├── update-theme.dto.ts
  │   └── upsert-social-links.dto.ts
  ├── guards/
  │   ├── card-owner.guard.ts
  │   └── plan.guard.ts
  └── vcard/
      └── vcard.builder.ts
  ```
- [ ] Implement `CreateCardDto`:
  - `handle: string` — `@IsString()`, `@Matches(/^[a-z0-9-]{3,30}$/)`, required
  - `template: CardTemplate` — `@IsEnum(CardTemplate)`, required
  - `fields: CardFields` — `@IsObject()`, required (name, title, company, bio, phone, email,
    website, address as optional string fields)
- [ ] Implement `UpdateCardDto`:
  - All fields from `CreateCardDto` made optional via `PartialType(CreateCardDto)`
  - `isActive?: boolean` — `@IsOptional()`, `@IsBoolean()`
- [ ] Implement `UpdateThemeDto`:
  - `primaryColor?: string` — `@IsOptional()`, `@IsHexColor()`
  - `secondaryColor?: string` — `@IsOptional()`, `@IsHexColor()`
  - `fontFamily?: string` — `@IsOptional()`, `@IsString()`
  - `backgroundUrl?: string` — `@IsOptional()`, `@IsUrl()`
  - `logoUrl?: string` — `@IsOptional()`, `@IsUrl()`
- [ ] Implement `UpsertSocialLinksDto`:
  - `links: SocialLinkItem[]` — `@IsArray()`, `@ValidateNested({ each: true })`
  - Each `SocialLinkItem`: `platform: string`, `url: string` (`@IsUrl()`),
    `displayOrder: number` (`@IsInt()`, `@Min(0)`)
- [ ] Implement `CardsService` with the following methods:
  - `create(userId, dto)` — validates handle uniqueness, creates `Card` + `CardTheme` in a
    Prisma transaction, returns created card
  - `findAllByUser(userId)` — returns all cards owned by user with their themes and social
    link counts
  - `findOne(userId, cardId)` — returns full card with theme, social links, media blocks;
    throws `404` if not found or not owned by user
  - `update(cardId, dto)` — partial update of card fields
  - `updateTheme(cardId, dto)` — upsert `CardTheme` record
  - `upsertSocialLinks(cardId, links)` — delete existing links for card and re-insert the new
    ordered list in a single transaction
  - `delete(cardId)` — cascades to theme, social links, media blocks, QR code, analytics events
  - `publish(cardId)` — sets `isActive = true`
  - `unpublish(cardId)` — sets `isActive = false`
  - `getPublicCard(handle)` — fetches active card by handle; throws `404` if not found or
    `isActive === false`
  - `getUploadUrl(cardId, fileType, fileName)` — calls Supabase Storage to generate a signed
    upload URL; returns `{ uploadUrl, publicUrl }`
  - `generateVCard(handle)` — builds a vCard 3.0 string from card data and returns it
- [ ] Implement `CardOwnerGuard`:
  - Reads `cardId` from `request.params.id`
  - Queries DB to confirm `card.userId === request.user.sub`
  - Returns `403 Forbidden` if ownership check fails
  - Skips check if user is an admin (future-proof)
- [ ] Implement `PlanGuard` for card creation:
  - Counts existing cards for `userId`
  - Reads user's plan from DB
  - Enforces limits: `FREE=1`, `PRO=3`, `BUSINESS=10`, `ENTERPRISE=unlimited`
  - Returns `403` with body `{ code: 'PLAN_LIMIT_REACHED', limit: N, current: N }` if exceeded
- [ ] Implement `CardsController` (authenticated, prefix `/cards`):
  - `POST /cards` — `@UseGuards(PlanGuard)` → `cardsService.create()`
  - `GET /cards` — `cardsService.findAllByUser()`
  - `GET /cards/:id` — `@UseGuards(CardOwnerGuard)` → `cardsService.findOne()`
  - `PATCH /cards/:id` — `@UseGuards(CardOwnerGuard)` → `cardsService.update()`
  - `PATCH /cards/:id/theme` — `@UseGuards(CardOwnerGuard)` → `cardsService.updateTheme()`
  - `PUT /cards/:id/social-links` — `@UseGuards(CardOwnerGuard)` →
    `cardsService.upsertSocialLinks()`
  - `DELETE /cards/:id` — `@UseGuards(CardOwnerGuard)` → `cardsService.delete()`
  - `POST /cards/:id/publish` — `@UseGuards(CardOwnerGuard)` → `cardsService.publish()`
  - `POST /cards/:id/unpublish` — `@UseGuards(CardOwnerGuard)` → `cardsService.unpublish()`
  - `POST /cards/:id/upload-url` — `@UseGuards(CardOwnerGuard)` →
    `cardsService.getUploadUrl()`
- [ ] Implement `CardsPublicController` (no auth guard, prefix `/public/cards`):
  - `GET /public/cards/:handle` — `cardsService.getPublicCard(handle)`, returns full card
    payload including theme, social links, media blocks
  - `GET /public/cards/:handle/vcard` — `cardsService.generateVCard(handle)`, returns response
    with `Content-Type: text/vcard`,
    `Content-Disposition: attachment; filename="<name>.vcf"`
- [ ] Exclude `/public/*` routes from the global `JwtAuthGuard` using a route decorator or
      guard reflection metadata
- [ ] Handle handle conflicts: if `handle` already exists, return `409 Conflict` with body
      `{ code: 'HANDLE_TAKEN', suggestion: '<handle>-2' }` (increment suffix until free)
- [ ] Add Swagger `@ApiTags`, `@ApiOperation`, `@ApiResponse` decorators to all endpoints
- [ ] Write unit tests for `CardsService` using Jest + Prisma mock:
  - `create` — success path
  - `create` — duplicate handle → suggestion returned
  - `PlanGuard` — FREE user at limit → 403
  - `CardOwnerGuard` — mismatched userId → 403
  - `getPublicCard` — inactive card → 404

**Acceptance Criteria:**
- [ ] `POST /cards` with valid DTO creates a card and returns `201` with the card object
- [ ] `POST /cards` with a duplicate handle returns `409` with a `suggestion` field
- [ ] `GET /public/cards/:handle` returns the full card payload without an auth token
- [ ] `GET /public/cards/nonexistent` returns `404`
- [ ] `GET /public/cards/:handle` for an unpublished card returns `404`
- [ ] `GET /public/cards/:handle/vcard` returns a valid `.vcf` attachment with correct headers
- [ ] `DELETE /cards/:id` called by a different user returns `403`
- [ ] A FREE-plan user attempting to create a second card returns `403` with
      `PLAN_LIMIT_REACHED`
- [ ] `POST /cards/:id/upload-url` returns a signed URL from Supabase Storage
- [ ] All DTO validation errors return `400` with per-field error messages
- [ ] Swagger UI at `/api/docs` documents all new endpoints
- [ ] All new unit tests pass with `turbo test --filter api`

---

### T12 — Card Builder UI (`apps/web`)

**Description:**
Build the primary card creation and editing experience in the web dashboard. The builder is a
two-panel layout: a left editor panel with tabbed sections (Profile, Links, Media, Theme) and a
right live preview panel showing the `CardRenderer` in real time. Changes auto-save with a
debounced 1.5-second delay. The builder enforces file size limits, handles upload progress,
checks handle availability, lets the user pick a template and customize colors and fonts, and
exposes a Publish button that reveals the live public URL. Unsaved changes are guarded on
navigation.

**Steps:**
- [ ] Create route `app/(dashboard)/builder/[cardId]/page.tsx` and
      `app/(dashboard)/builder/new/page.tsx`
- [ ] Create the main layout component `CardBuilderLayout`:
  - Left panel: `w-[420px]` fixed-width editor with a tab bar at the top
  - Right panel: flex-1 preview area, centered, light grey background
  - Responsive: on screens below `lg` breakpoint, stack vertically with preview below editor
- [ ] Implement `EditorTabBar` with four tabs using Shadcn `Tabs`:
  - **Profile** — card field inputs
  - **Links** — social links manager
  - **Media** — video and image block manager
  - **Theme** — template picker, color pickers, font selector
- [ ] Implement **Profile tab** (`ProfileEditor`):
  - Inputs: Display Name, Job Title, Company, Bio (textarea), Phone, Email, Website, Address
  - Avatar upload: drag-and-drop zone + file picker, preview thumbnail, max 2 MB enforced
    client-side with error message, uploads via `POST /cards/:id/upload-url` → Supabase PUT
  - Background image upload: max 5 MB, same upload flow
  - Handle field: text input with `dotly.one/` prefix label, real-time availability check
    (debounced 500ms) that calls `GET /public/cards/:handle` and shows a green checkmark if
    `404` (available) or red X if `200` (taken) or yellow spinner while checking
- [ ] Implement **Links tab** (`SocialLinksEditor`):
  - Supported platforms: LinkedIn, Twitter/X, Instagram, GitHub, YouTube, TikTok, WhatsApp,
    Facebook, Calendly, Cal.com, Custom URL
  - Add link: platform dropdown + URL input + Add button
  - Reorder links: drag-and-drop list (use `@dnd-kit/sortable`)
  - Remove link: trash icon per row
  - Platform icon rendered next to platform name in the dropdown
  - URL validated client-side (`@IsUrl`) before adding
- [ ] Implement **Media tab** (`MediaEditor`):
  - Add video embed: URL input (YouTube or Vimeo), validate URL format, add to list
  - Add portfolio image: file picker, max 3 MB per image, uploads via signed URL flow
  - Display list of media blocks with thumbnail preview, caption input, drag-to-reorder,
    delete button
  - Maximum of 6 portfolio images on FREE plan — show upgrade prompt beyond that
- [ ] Implement **Theme tab** (`ThemeEditor`):
  - Template picker: 2×2 grid of template cards showing a miniature preview of each layout
    (Minimal, Bold, Creative, Corporate), selected template has a highlighted border ring
  - Primary color picker: Shadcn `Popover` wrapping a hex color swatch grid + free hex input
  - Secondary color picker: same pattern
  - Font family selector: dropdown with a curated subset of Google Fonts:
    `Inter`, `Poppins`, `Playfair Display`, `Lato`, `Montserrat`, `Roboto Slab`
    — each option rendered in its own font face
- [ ] Implement live preview panel (`CardPreview`):
  - Renders `<CardRenderer mode='web' {...currentCardData} />` from `@dotly/ui`
  - Reflects all editor state changes in real time (no save required to see preview)
  - Contained in a device mockup frame (phone outline) with overflow scroll
- [ ] Implement auto-save logic:
  - Use `useDebounce` (custom hook or `use-debounce` library) with 1500ms delay
  - On debounce trigger: call `PATCH /cards/:id` and/or `PATCH /cards/:id/theme` and/or
    `PUT /cards/:id/social-links` depending on which section was changed
  - Show a subtle "Saving…" → "Saved" status indicator in the top-right of the builder header
  - On API error: show "Save failed — Retry" with retry button
- [ ] Implement **Publish button** flow:
  - Button labeled "Publish" in the builder header
  - On click: calls `POST /cards/:id/publish`
  - On success: shows a modal/toast with the live URL `dotly.one/:handle` and a Copy Link button
  - Button changes to "Unpublish" after publishing, and vice versa
- [ ] Implement **Upgrade prompt**:
  - Triggered when a FREE user tries to create a second card or add a 7th+ portfolio image
  - Full-screen modal overlay with plan comparison and a "Upgrade to Pro" CTA (links to billing
    page — Stripe not wired in Phase 2, page is a stub)
- [ ] Implement **Unsaved changes guard**:
  - Track whether there are unsaved local changes in component state
  - Use Next.js `router.beforePopState` or `beforeunload` event listener
  - Show a browser-native confirm dialog (or Shadcn `AlertDialog`) on navigation away if
    unsaved changes exist
- [ ] Create `hooks/useCardBuilder.ts` to encapsulate all builder state, API calls, and
      auto-save logic as a custom hook
- [ ] Add the builder entry point to the dashboard sidebar: "Create Card" button and card list
      items link to `/builder/:cardId`

**Acceptance Criteria:**
- [ ] Navigating to `/builder/new` creates a new draft card and redirects to `/builder/:newId`
- [ ] All four editor tabs render without errors and are navigable
- [ ] Changing any profile field updates the right-panel preview within 100ms
- [ ] Handle availability check shows green for an unused handle and red for a taken one
- [ ] Uploading a 1.9 MB avatar succeeds; uploading a 2.1 MB file to the avatar field shows
      a client-side error without uploading
- [ ] After 1.5s of inactivity following a change, `PATCH /cards/:id` is called automatically
- [ ] "Saved" indicator appears after successful auto-save
- [ ] Selecting a different template changes the live preview layout immediately
- [ ] Clicking "Publish" calls the API and shows the live URL in a modal
- [ ] Navigating away with unsaved changes triggers the unsaved changes warning
- [ ] FREE plan user sees the upgrade prompt when attempting to create a second card

---

### T13 — Public Card Page (`apps/web`)

**Description:**
Implement the public-facing card page as a Next.js Server Component with full SSR, Open Graph
and Twitter Card metadata, the shared `CardRenderer`, save-to-contacts, a lead capture modal,
and client-side analytics beacon firing. The page must score ≥ 90 on Lighthouse mobile and
return a `404` for inactive or missing card handles.

**Steps:**
- [ ] Implement `app/card/[handle]/page.tsx` as an async Server Component:
  - Fetch card data from `GET /public/cards/:handle` at render time (no client-side fetch)
  - If fetch returns `404` or card is inactive: call Next.js `notFound()` to render the
    `not-found.tsx` page
  - Pass card data as props to the `CardRenderer` sub-tree
- [ ] Implement `generateMetadata` in `app/card/[handle]/page.tsx`:
  - `title`: `"<Name> — <Title> | Dotly.one"`
  - `description`: `card.fields.bio` (truncated to 160 chars) or a sensible default
  - Open Graph tags: `og:title`, `og:description`, `og:image` (avatar URL or a generated
    placeholder), `og:url`, `og:type: 'profile'`
  - Twitter Card tags: `twitter:card: 'summary_large_image'`, `twitter:title`,
    `twitter:description`, `twitter:image`
  - Canonical URL: `https://dotly.one/:handle`
- [ ] Implement `app/card/[handle]/not-found.tsx`:
  - Friendly 404 page: "This card doesn't exist or has been deactivated."
  - CTA: "Create your own card on Dotly.one" linking to `/auth`
- [ ] Render `CardRenderer` in `mode='web'` with the full card data from the server fetch
- [ ] Implement **Save to Contacts** button:
  - Client component `SaveContactButton` that calls `GET /public/cards/:handle/vcard`
  - Triggers a file download of the `.vcf` response in the browser
  - Uses the `Content-Disposition` filename from the API response
- [ ] Implement **Lead Capture modal** (`LeadCaptureModal`):
  - Client component triggered by the `LeadCaptureButton` in `CardRenderer`
  - Modal fields: Full Name (required), Email (required, validated), Phone (optional)
  - Submit calls `POST /public/contacts` with body
    `{ name, email, phone, sourceCardId, sourceHandle }`
  - On success: close modal, show a thank-you toast "Thanks! The card owner will be in touch."
  - On error: show inline error message, keep modal open
  - The API creates a `Contact` record and a `CrmPipeline` record in stage `NEW` (see Notes)
- [ ] Implement `POST /public/contacts` endpoint in `apps/api`:
  - No auth required
  - `CreatePublicContactDto`: `name: string`, `email: string`, `phone?: string`,
    `sourceCardId: string`
  - Validates `sourceCardId` exists and is active
  - Creates `Contact` with `ownerUserId = card.userId` and `sourceCardId`
  - Creates `CrmPipeline` entry with `stage = 'NEW'`, `ownerUserId = card.userId`
  - Returns `201 { contactId }`
- [ ] Implement **Analytics VIEW beacon** (client component `AnalyticsBeacon`):
  - Rendered inside `app/card/[handle]/page.tsx` as a Client Component island
  - On mount (`useEffect`): fire `POST /public/analytics` with
    `{ type: 'VIEW', cardId, handle, referrer: document.referrer,
      userAgent: navigator.userAgent }`
  - Runs once per page load, suppressed if the viewer is the card owner (check for auth cookie)
- [ ] Implement **Analytics CLICK tracking**:
  - `onSocialLinkClick` callback passed to `CardRenderer` → fires
    `POST /public/analytics` with `{ type: 'CLICK', cardId, platform, url }`
- [ ] Implement `POST /public/analytics` endpoint in `apps/api`:
  - No auth required
  - `RecordAnalyticsDto`: `type: AnalyticsEventType`, `cardId: string`, metadata fields
  - Delegates to `AnalyticsService.record()` (implemented in T15)
  - Returns `204 No Content`
- [ ] Create `app/card/[handle]/loading.tsx`:
  - Skeleton placeholder matching the card layout (avatar circle, text lines) for streaming
- [ ] Run Lighthouse mobile audit on the public card page:
  - Ensure all images have `width` and `height` attributes (or use `next/image`)
  - Ensure font preloading is configured
  - Ensure no render-blocking resources
  - Defer all analytics beacon scripts to after page paint

**Acceptance Criteria:**
- [ ] `GET /card/test-user` server-renders the full card HTML with no client-side flash
- [ ] Page `<head>` contains correct `og:title`, `og:image`, and `twitter:card` tags
      (verify with `curl` or browser DevTools)
- [ ] `/card/nonexistent-handle` renders the custom `not-found.tsx` page with a `404` status
- [ ] `/card/<inactive-handle>` also renders the `404` page
- [ ] Clicking "Save Contact" downloads a valid `.vcf` file that imports into iOS Contacts
- [ ] Submitting the lead capture form with valid data creates a `Contact` and `CrmPipeline`
      record in the database
- [ ] Submitting the form with a missing email shows a validation error inside the modal
- [ ] `POST /public/analytics` is called on page load with `type: 'VIEW'`
- [ ] Clicking a social link fires `POST /public/analytics` with `type: 'CLICK'`
- [ ] Lighthouse mobile performance score ≥ 90 (run `pnpm lighthouse` or manual audit)
- [ ] The page renders correctly with JavaScript disabled (SSR content fully present)

---

### T14 — QR Code Generation

**Description:**
Implement QR code generation for cards. The API exposes endpoints to generate and retrieve a
styled QR code. The web card builder includes a QR section with a live preview, color pickers,
optional logo overlay, and download buttons for PNG and SVG. The mobile app renders a QR code
on the card detail screen. All QR codes encode the canonical card URL `dotly.one/:handle` and
must be natively scannable by iOS and Android cameras.

**Steps:**
- [ ] Install QR generation library in `apps/api`: `qrcode` (`pnpm add qrcode @types/qrcode`)
- [ ] Create `QrCodesModule` in `apps/api/src/qr-codes/`:
  ```
  qr-codes/
  ├── qr-codes.module.ts
  ├── qr-codes.controller.ts
  ├── qr-codes.service.ts
  └── dto/
      └── generate-qr.dto.ts
  ```
- [ ] Implement `GenerateQrDto`:
  - `foregroundColor?: string` — `@IsOptional()`, `@IsHexColor()`, default `#000000`
  - `backgroundColor?: string` — `@IsOptional()`, `@IsHexColor()`, default `#FFFFFF`
  - `logoUrl?: string` — `@IsOptional()`, `@IsUrl()`
  - `errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'` — default `'M'`
    (use `'H'` when logo is present to compensate for logo occlusion)
- [ ] Implement `QrCodesService`:
  - `generate(cardId, dto)`:
    - Resolves card handle from `cardId`
    - Builds target URL: `https://dotly.one/:handle`
    - Generates QR code as SVG string using `qrcode` library with the provided style config
    - If `dto.logoUrl` is provided: fetches the logo image, composites it centered over the
      SVG using `sharp` (install `sharp` in `apps/api`)
    - Converts final SVG to PNG buffer using `sharp`
    - Upserts `QrCode` record in DB with `styleConfig` JSON and `shortUrl`
    - Returns `{ svgString, pngBuffer, shortUrl }`
  - `getQr(cardId)`: returns existing `QrCode` record for the card
- [ ] Implement `QrCodesController` (authenticated, prefix `/cards/:id/qr`):
  - `POST /cards/:id/qr` — `@UseGuards(CardOwnerGuard)` → generates and stores QR code
    → returns `{ svgString, pngBase64, shortUrl }`
  - `GET /cards/:id/qr` — `@UseGuards(CardOwnerGuard)` → returns stored QR data or `404`
    if not yet generated
- [ ] Implement QR section in the web card builder (new sub-tab or panel within Theme tab):
  - Live QR preview: renders an `<img src="data:image/svg+xml;base64,..." />` using the
    current style config, updates in real time as color pickers change
  - Foreground color picker (hex input + swatch grid)
  - Background color picker (hex input + swatch grid)
  - Optional logo upload: same signed-URL upload flow as avatar, max 1 MB
  - Error correction level selector: `L / M / Q / H` radio group with tooltip explanation
  - "Generate QR" button: calls `POST /cards/:id/qr` and refreshes the preview
  - **Download PNG** button: triggers download of `dotly-qr-<handle>.png`
  - **Download SVG** button: triggers download of `dotly-qr-<handle>.svg`
  - Display the encoded URL below the QR preview as a caption
- [ ] Install `react-native-qrcode-svg` in `apps/mobile`
- [ ] On the mobile card detail screen (T16), render the QR code:
  - Use `<QRCode value="https://dotly.one/:handle" size={200} color="#000000"
    backgroundColor="#FFFFFF" />`
  - Show below the card preview section
  - QR code dimensions ensure scannability (minimum 200×200 px logical pixels)
- [ ] Validate that a generated QR code is scannable:
  - Test URL with iOS camera app (physical or simulator)
  - Test URL with Android camera app (emulator)
  - Confirm decoded URL matches `https://dotly.one/:handle`

**Acceptance Criteria:**
- [ ] `POST /cards/:id/qr` returns `201` with `svgString` and `pngBase64` fields
- [ ] `GET /cards/:id/qr` returns the stored QR config or `404` if not generated
- [ ] `POST /cards/:id/qr` called by a non-owner returns `403`
- [ ] Generated QR code PNG decodes to `https://dotly.one/:handle` when scanned
- [ ] Generated QR code with a logo overlay is still scannable (error correction level `H`)
- [ ] Web builder QR preview updates live when color pickers change (no page reload)
- [ ] "Download PNG" triggers a browser file download of a valid PNG file
- [ ] "Download SVG" triggers a browser file download of a valid SVG file
- [ ] Mobile QR code renders on the card detail screen without crashing
- [ ] Mobile QR code is scannable by both iOS and Android native camera apps
- [ ] `turbo build` passes with the new `sharp` and `qrcode` dependencies in `apps/api`

---

### T15 — Analytics Recording Pipeline

**Description:**
Implement the full analytics recording pipeline: a Redis-buffered event queue with a cron flush
job, a Postgres bulk insert, a summary endpoint, and a dashboard widget. The pipeline handles
high-volume event ingestion without write-storming the database during viral card shares. A
direct-write fallback ensures no event is lost if Redis is unavailable.

**Steps:**
- [ ] Create `AnalyticsModule` in `apps/api/src/analytics/`:
  ```
  analytics/
  ├── analytics.module.ts
  ├── analytics.controller.ts
  ├── analytics.service.ts
  ├── analytics.cron.ts           # Cron job for flush
  └── dto/
      └── record-analytics.dto.ts
  ```
- [ ] Install required packages in `apps/api`:
  - `ioredis` — Redis client (`pnpm add ioredis`)
  - `@nestjs/schedule` — cron job support (`pnpm add @nestjs/schedule`)
- [ ] Create `RedisModule` (or reuse if already scaffolded in Phase 1):
  - Provide a singleton `Redis` instance using `REDIS_URL` env var
  - Export `REDIS_CLIENT` token for injection
- [ ] Implement `RecordAnalyticsDto`:
  - `type: AnalyticsEventType` — `@IsEnum(AnalyticsEventType)`
  - `cardId: string` — `@IsUUID()`
  - `platform?: string` — `@IsOptional()`, `@IsString()` (for CLICK events)
  - `url?: string` — `@IsOptional()`, `@IsUrl()` (for CLICK events)
  - `referrer?: string` — `@IsOptional()`, `@IsString()`
  - `userAgent?: string` — `@IsOptional()`, `@IsString()`
- [ ] Implement `AnalyticsService`:
  - `record(dto, ipAddress)`:
    - Hashes `ipAddress` to `ipHash` using SHA-256 (never store raw IPs)
    - Builds event object:
      `{ type, cardId, platform, url, referrer, userAgent, ipHash, createdAt: new Date() }`
    - Attempts `redis.rpush('analytics:queue', JSON.stringify(event))`
    - If Redis throws: immediately writes directly to `AnalyticsEvent` table via Prisma
      (fallback path — log a warning)
  - `flush()`:
    - Uses `redis.lrange('analytics:queue', 0, -1)` to read all buffered events
    - If the list is empty: returns immediately
    - Parses all JSON strings into event objects
    - Calls `prisma.analyticsEvent.createMany({ data: events, skipDuplicates: true })`
    - On successful DB write: calls `redis.ltrim('analytics:queue', listLength, -1)` to
      remove flushed events atomically
    - Logs count of flushed events
  - `getSummary(cardId, userId)`:
    - Verifies card ownership
    - Queries `AnalyticsEvent` for the given `cardId`:
      - `totalViews`: count of `type === 'VIEW'`
      - `totalClicks`: count of `type === 'CLICK'`
      - `totalLeads`: count of `type === 'LEAD_SUBMIT'`
      - `last7Days`: array of 7 objects `{ date: 'YYYY-MM-DD', views: N, clicks: N }` for the
        past 7 calendar days (query with `createdAt >= now - 7 days`, group by date)
    - Returns summary object
- [ ] Implement `AnalyticsCron`:
  - `@Cron(CronExpression.EVERY_30_SECONDS)` method calling `analyticsService.flush()`
  - Log start and completion of each flush with item count
- [ ] Implement `AnalyticsController` (authenticated):
  - `GET /cards/:id/analytics/summary` — `@UseGuards(CardOwnerGuard)` →
    `analyticsService.getSummary(cardId, userId)` → returns summary object
- [ ] Verify `POST /public/analytics` (from T13) delegates to `AnalyticsService.record()`:
  - Public controller (no auth) validates `RecordAnalyticsDto`
  - Extracts real IP from `X-Forwarded-For` header (set by Vercel/Railway proxy)
  - Calls `analyticsService.record(dto, ipAddress)`
- [ ] Implement **Dashboard analytics widget** in `apps/web`:
  - Route: `app/(dashboard)/dashboard/page.tsx` (My Cards overview)
  - Per-card stat cards: display `totalViews`, `totalClicks`, `totalLeads` fetched from
    `GET /cards/:id/analytics/summary`
  - 7-day sparkline chart using `recharts` `<LineChart>` or Tremor `<SparkLineChart>`:
    - X-axis: last 7 days (abbreviated date labels)
    - Lines: Views and Clicks
    - Compact size: fits within a card list item (`h-16` chart area)
  - Loading skeleton for each card item while summary data fetches
- [ ] Implement **Analytics summary badge** in the card builder sidebar:
  - Below the card title in the builder header or sidebar: show pill badges
    `N views · N clicks · N leads`
  - Fetches from `GET /cards/:id/analytics/summary` on builder mount
  - Refreshes every 60 seconds while the builder is open
- [ ] Add Redis health check to `GET /health` endpoint:
  - Returns `{ status: 'ok', redis: 'up' | 'down', ... }`

**Acceptance Criteria:**
- [ ] Calling `POST /public/analytics` 100 times in quick succession results in 100 events
      in Redis queue and does not cause any Postgres write errors during the burst
- [ ] Within 30 seconds, the cron job flushes all 100 events into `AnalyticsEvent` table
- [ ] After flushing, Redis queue length returns to 0
- [ ] If Redis is manually stopped, `POST /public/analytics` falls back to direct Postgres write
      without returning an error to the caller
- [ ] `GET /cards/:id/analytics/summary` returns correct `totalViews` after flush
- [ ] `last7Days` array contains exactly 7 entries with correct date strings
- [ ] Dashboard widget displays stat cards with view/click/lead counts per card
- [ ] 7-day sparkline renders without errors using `recharts` or Tremor
- [ ] Builder sidebar shows analytics badge with correct counts on mount
- [ ] `GET /health` includes `redis` field indicating connection status

---

### T16 — Mobile Card List & Preview (`apps/mobile`)

**Description:**
Build the primary mobile experience for card owners: a My Cards tab showing all their cards in
a `FlatList` with key stats, and a Card Detail screen that renders the full `CardRenderer` in
mobile mode alongside a native QR code, a share sheet, and a copy-link button. The screen uses
skeleton loading states while data fetches.

**Steps:**
- [ ] Create an API client library `apps/mobile/lib/api.ts`:
  - Export `getCards()`: `GET /cards` with JWT attached (reads token from Supabase session)
  - Export `getCard(id)`: `GET /cards/:id` with JWT attached
  - Export `getAnalyticsSummary(id)`: `GET /cards/:id/analytics/summary` with JWT attached
  - Attach JWT: read from Supabase session via `supabase.auth.getSession()`,
    include as `Authorization: Bearer <token>` header
  - Return typed responses using types from `@dotly/types`
  - Handle `401` → call `supabase.auth.signOut()` and redirect to sign-in
  - Handle `403`, `404`, `500` with typed error objects
- [ ] Implement **My Cards tab** (`app/(tabs)/index.tsx`):
  - On mount: call `getCards()`, store result in state
  - Render `FlatList` of card items, each showing:
    - Avatar thumbnail (use `expo-image` for caching and performance)
    - Display name (bold)
    - `dotly.one/:handle` subtitle (grey)
    - View count badge (pill: `N views` in the top-right corner of the item)
  - Tap navigates to Card Detail screen with `cardId` param
  - Pull-to-refresh: `refreshControl` prop calling `getCards()` again
  - Empty state: when `cards.length === 0`, render a centered illustration placeholder,
    heading "No cards yet", subtext "Create your first card on the web dashboard",
    and a "Go to Dashboard" link (opens `EXPO_PUBLIC_WEB_URL` in browser)
  - Loading state: 3 skeleton placeholder rows (animated shimmer using `moti` or
    `expo-linear-gradient`)
- [ ] Create navigation route for Card Detail:
  - Route file: `app/card/[id].tsx` (Expo Router dynamic route)
  - Register as a stack screen in `app/(tabs)/_layout.tsx` or root `_layout.tsx`
- [ ] Implement **Card Detail screen** (`app/card/[id].tsx`):
  - On mount: call `getCard(id)` and `getAnalyticsSummary(id)`, store in state
  - Loading state: full-screen skeleton matching the card layout
  - Render `<CardRenderer mode='mobile' {...cardData} />` from `@dotly/ui`
    (renders the card in the same template/theme as the web version)
  - Below the card renderer, render a section labeled "Your QR Code":
    - `<QRCode value="https://dotly.one/:handle" size={200} />` from
      `react-native-qrcode-svg`
    - A small caption below: `dotly.one/:handle`
  - Action bar below the QR section (horizontal row of buttons):
    - **Share** button: calls
      `Share.share({ message: 'Check out my card: https://dotly.one/:handle', url: 'https://dotly.one/:handle' })`
      (React Native native Share API)
    - **Copy Link** button: calls `Clipboard.setStringAsync('https://dotly.one/:handle')`,
      shows a brief toast "Link copied!"
  - Analytics mini-summary below the action bar:
    - Three stat chips: `N Views`, `N Clicks`, `N Leads`
    - Fetched from `getAnalyticsSummary(id)`
- [ ] Install required packages in `apps/mobile`:
  - `expo-image` — performant image loading
  - `expo-clipboard` — copy to clipboard
  - `react-native-qrcode-svg` (already required by T14)
  - `moti` — animation library for skeleton loading (or use `expo-linear-gradient` directly)
- [ ] Ensure `@dotly/ui` `CardRenderer` in `mode='mobile'` renders without errors:
  - Verify NativeWind classes apply correctly on the mobile card
  - Verify `AvatarBlock` loads the avatar image via `expo-image`
  - Verify `SocialLinkList` opens URLs with `Linking.openURL`
  - Verify `MediaBlockList` renders a YouTube thumbnail (not an iframe) on mobile
- [ ] Wire `EXPO_PUBLIC_WEB_URL` env variable (e.g., `https://dotly.one`) used for the
      empty state "Go to Dashboard" link

**Acceptance Criteria:**
- [ ] My Cards tab renders a list of the authenticated user's cards with avatar, name, handle,
      and view count badge
- [ ] Pull-to-refresh triggers a fresh `GET /cards` request and updates the list
- [ ] Empty state renders when the user has no cards, with the "Go to Dashboard" link
- [ ] Skeleton loading animation plays while the card list is fetching
- [ ] Tapping a card navigates to the Card Detail screen
- [ ] Card Detail screen renders the `CardRenderer` in `mode='mobile'` with correct template
      and theme applied
- [ ] QR code section renders and displays the correct `dotly.one/:handle` URL
- [ ] Share button opens the native share sheet with the card URL
- [ ] Copy Link button copies the URL and shows a "Link copied!" toast
- [ ] Analytics chips show correct view, click, and lead counts from the summary API
- [ ] No crashes on iOS Simulator or Android Emulator when navigating between screens
- [ ] `turbo typecheck` passes across all workspaces after T16 changes

---

## Phase 2 — Definition of Done

The phase is complete when all of the following are true:

- [ ] All 7 tasks (T10–T16) have every acceptance criterion checked
- [ ] A new user can sign up, create a card, customize theme and social links, and publish it
      to a live public URL — end-to-end — without any manual backend intervention
- [ ] The public card page at `dotly.one/:handle` server-renders with correct Open Graph tags,
      passes Lighthouse mobile ≥ 90, and is accessible from any device
- [ ] Scanning the QR code on a physical iOS or Android device navigates to the correct card URL
- [ ] A visitor submitting the lead capture form on the public card page creates a `Contact` and
      `CrmPipeline` record in the database
- [ ] Analytics events are buffered in Redis and flushed to Postgres within 30 seconds
- [ ] The mobile app shows the card list and card detail with QR code, share, and copy-link
- [ ] `turbo build` passes for all workspaces with no TypeScript errors
- [ ] `turbo lint` passes with zero errors across all workspaces
- [ ] All unit tests pass with `turbo test`
- [ ] No `TODO` or `FIXME` comments left untracked (open GitHub issues for any deferred items)
- [ ] Phase 3 can begin immediately without any Phase 2 rework

---

## Dependencies & Blockers

| Dependency | Owner | Needed by |
|---|---|---|
| Phase 1 complete (API scaffold, Prisma schema, auth, web/mobile shells) | All | T10–T16 |
| `packages/types` `CardRendererProps` defined | T10 author | T11, T12, T13, T16 |
| `CardRenderer` component published from `packages/ui` | T10 | T12, T13, T16 |
| `CardsModule` API endpoints live | T11 | T12, T13, T14, T15, T16 |
| Supabase Storage bucket created and CORS policy configured for web origin | Team lead | T11, T12 |
| `sharp` binary compatible with Railway deployment target (Linux x64) | Dev | T14 |
| Redis available in development (Docker Compose or Railway) | Dev | T15 |
| `NEXT_PUBLIC_APP_URL` set to `https://dotly.one` (or staging equivalent) | Team lead | T13, T14 |
| Google Fonts subset CSS loaded in `apps/web` (`next/font` or CDN) | T12 author | T12 |
| `react-native-qrcode-svg` compatible with current Expo SDK version | T14/T16 author | T14, T16 |

---

## Notes

- **Lead capture contacts:** `Contact` and `CrmPipeline` records are created in Phase 2 when
  a visitor submits the lead capture form on the public card page. However, the CRM UI — the
  Kanban board, contact list, contact detail page, notes, and tags — is built in Phase 3.
  Phase 2 only stores the data; Phase 3 exposes it to the card owner.

- **Mobile card creation deferred:** The ability to create and edit a card from within the
  mobile app is deferred to Phase 4. In Phase 2, the mobile app is read-only for cards —
  displaying existing cards created via the web builder. This avoids duplicating a complex
  multi-step form in React Native before the core web builder is validated.

- **Stripe not enforced in Phase 2:** Plan limits (`FREE=1 card`, `PRO=3`, `BUSINESS=10`) are
  enforced at the API level via `PlanGuard`, and the upgrade prompt UI is wired in the web
  builder. However, Stripe checkout and subscription management are not implemented until
  Phase 3. In Phase 2, plan tier is set directly on the `User` record in the database for
  testing purposes.

- **Resend email notifications deferred:** When a visitor submits a lead capture form in Phase
  2, the contact data is stored immediately but no email notification is sent to the card owner.
  Resend transactional email is wired in Phase 3 alongside the full CRM feature, at which point
  a "New lead from your card" email will be dispatched on each `Contact` creation.

- **Analytics on public endpoints:** `POST /public/analytics` and `POST /public/contacts` are
  unauthenticated by design. Rate limiting (e.g., via `@nestjs/throttler`) should be added to
  these endpoints before production launch to prevent abuse. This is tracked as a Phase 4 task.

- **vCard format:** The `GET /public/cards/:handle/vcard` endpoint generates vCard 3.0 format
  for maximum compatibility with iOS and Android native contacts apps. vCard 4.0 offers richer
  fields but has inconsistent mobile support as of 2026.

---

*Phase 2 of 5 — Dotly.one / Prev: Phase 1 — Foundation | Next: Phase 3 — Growth Features*
