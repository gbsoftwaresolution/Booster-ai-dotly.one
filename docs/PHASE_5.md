# Phase 5 — Production Hardening & AI

**Duration:** Weeks 16–20
**Goal:** Harden the platform for production at scale — AI-powered contact enrichment, business
card scanning, push notifications, full app store submission, observability, security, load
testing, disaster recovery, and a final zero-downtime deployment to dotly.one. This is the
final phase. Every task gate-keeps the public launch.

**Stack overrides (authoritative for this phase):**

- **Billing:** Smart contract / crypto (EVM — Polygon or Base, USDC/ETH). No Stripe.
- **Storage:** Cloudflare R2
- **Email:** Mailgun (primary), Amazon SES (fallback)
- **Database:** Local PostgreSQL — host: localhost, user: naveenprasath-p, db: dotly_one
- **Redis:** localhost:6379

**Definition of done:** Every task below has its acceptance criteria met. The platform is
deployed at dotly.one with SSL, both mobile apps are live in their respective stores, all
observability tooling is active, disaster recovery has been tested, and the full launch
checklist is signed off.

---

## Task List

### T31 — AI Contact Enrichment

**Description:**
Add an AI-powered enrichment pipeline that, given a contact's name, email, and company,
queries OpenAI GPT-4o to derive LinkedIn URL, job title, industry, and company size. Each
enriched field carries a confidence score. Low-confidence fields are displayed with a
"suggested" badge and never silently overwrite confirmed data. Enrichment runs via a BullMQ
background job so it never blocks the API request thread.

**Steps:**

- [ ] Create `EnrichmentModule` in `apps/api/src/enrichment/`
- [ ] Install `openai` SDK and `bullmq` (if not already present from Phase 2)
- [ ] Define `EnrichmentJob` payload type in `packages/types`:
  ```ts
  interface EnrichmentJobPayload {
    contactId: string
    userId: string
    name: string
    email: string
    company?: string
  }
  ```
- [ ] Define `EnrichmentResult` type in `packages/types`:
  ```ts
  interface EnrichedField {
    value: string
    confidence: number // 0.0 – 1.0
    source: 'ai'
  }
  interface EnrichmentResult {
    linkedinUrl?: EnrichedField
    jobTitle?: EnrichedField
    industry?: EnrichedField
    companySize?: EnrichedField
  }
  ```
- [ ] Add `ContactEnrichment` Prisma model to `packages/database/schema.prisma`:

  ```prisma
  model ContactEnrichment {
    id            String   @id @default(cuid())
    contactId     String   @unique
    contact       Contact  @relation(fields: [contactId], references: [id], onDelete: Cascade)
    linkedinUrl   String?
    linkedinConf  Float?
    jobTitle      String?
    jobTitleConf  Float?
    industry      String?
    industryConf  Float?
    companySize   String?
    companySizeConf Float?
    status        EnrichmentStatus @default(PENDING)
    requestedAt   DateTime @default(now())
    completedAt   DateTime?
  }

  enum EnrichmentStatus {
    PENDING
    PROCESSING
    COMPLETED
    FAILED
  }
  ```

- [ ] Run `prisma migrate dev --name add_contact_enrichment`
- [ ] Create `EnrichmentQueue` BullMQ queue (Redis connection: `localhost:6379`)
- [ ] Create `EnrichmentProcessor` (BullMQ worker):
  - Pull contact record from DB
  - Build GPT-4o prompt:
    ```
    Given the following contact information, return a JSON object with the following fields:
    linkedinUrl, jobTitle, industry, companySize.
    For each field, also return a confidence score between 0.0 and 1.0 indicating how
    certain you are based solely on the data provided. If you cannot determine a value,
    return null for both the field and its confidence.
    Contact: name="{name}", email="{email}", company="{company}"
    ```
  - Parse JSON response; validate confidence scores are in [0, 1]
  - Upsert `ContactEnrichment` record with results and status `COMPLETED`
  - On OpenAI error: set status `FAILED`, log structured error
- [ ] Create `EnrichmentController`:
  - `POST /contacts/:id/enrich` — validates ownership, checks rate limit, enqueues job, returns `202 Accepted`
  - `GET /contacts/:id/enrich/status` — returns `ContactEnrichment` record (status + fields)
- [ ] Enforce rate limits in `EnrichmentController`:
  - Pro plan: 100 enrichments per user per calendar day (tracked in Redis with a TTL key)
  - Business+ plan: unlimited
  - Exceeding limit: `429 Too Many Requests` with `Retry-After` header
- [ ] Add `aiEnrichmentEnabled` boolean to `User` model (default `true`); migrate
- [ ] Add `POST /users/me/settings` (or `PATCH /users/me`) to toggle `aiEnrichmentEnabled`
- [ ] Auto-trigger enrichment job on `POST /contacts` (create) if `aiEnrichmentEnabled === true`
      and the user's plan allows it
- [ ] **Web:**
  - Add "Enrich" button to contact detail page (disabled if enrichment in progress)
  - Show spinner while status is `PENDING` or `PROCESSING` (poll `GET /contacts/:id/enrich/status`
    every 3 seconds)
  - On `COMPLETED`: populate enriched fields into the contact detail form
  - Fields with confidence < 0.7 display a yellow "Suggested" badge
  - Fields with confidence ≥ 0.7 populate directly with a subtle "AI" chip
  - If rate limit exceeded, show toast: "Daily enrichment limit reached. Upgrade to Business+"
- [ ] **Mobile:**
  - Add "Enrich Contact" option to contact row swipe actions (right swipe action)
  - Show inline loading indicator in contact detail screen
  - On completion, update displayed fields with same confidence-badge logic as web
- [ ] Add `Settings → Privacy → AI Enrichment` toggle:
  - Web: toggle in `/dashboard/settings` under a "Privacy" section
  - Mobile: toggle in Settings tab under "Privacy"
  - Both call `PATCH /users/me` with `{ aiEnrichmentEnabled: boolean }`
- [ ] Write unit tests for `EnrichmentProcessor` (mock OpenAI client):
  - Returns correctly structured fields on valid response
  - Handles malformed JSON from OpenAI gracefully (status → FAILED)
  - Handles null fields when GPT-4o is not confident
- [ ] Add Swagger docs for both endpoints

**Acceptance Criteria:**

- [ ] `POST /contacts/:id/enrich` with a valid Pro token returns `202` and creates a
      `ContactEnrichment` record with status `PENDING`
- [ ] `GET /contacts/:id/enrich/status` returns `{ status: 'COMPLETED', linkedinUrl: '...', ... }`
      after the BullMQ worker processes the job
- [ ] Every enriched field has a `confidence` value between 0.0 and 1.0
- [ ] Fields with confidence < 0.7 are displayed with a "Suggested" badge in both web and mobile
- [ ] A Pro user who has used 100 enrichments today receives `429` on the 101st request
- [ ] A Business+ user is not rate-limited
- [ ] Toggling "AI Enrichment" to off via settings stops auto-enrichment on new contact creation
- [ ] Unit tests pass: `turbo test --filter api` exits 0
- [ ] Swagger docs render both endpoints with request/response schemas

---

### T32 — Business Card Scanner (apps/mobile)

**Description:**
Allow users to scan a physical business card using the device camera. The image is sent to
Google Cloud Vision API (AWS Textract as fallback) for OCR. Extracted fields are presented
in an editable review form before saving. Low-confidence fields are highlighted in yellow.
If AI enrichment is enabled, it is auto-triggered after save.

**Steps:**

- [ ] Install `expo-camera` and `expo-image-picker` in `apps/mobile`
- [ ] Add camera and photo library permissions to `app.json`:
  ```json
  "ios": {
    "infoPlist": {
      "NSCameraUsageDescription": "Used to scan business cards and add contacts.",
      "NSPhotoLibraryUsageDescription": "Used to import business card images."
    }
  },
  "android": {
    "permissions": ["CAMERA", "READ_EXTERNAL_STORAGE"]
  }
  ```
- [ ] Create `ScanCardFAB` component on the Contacts tab:
  - Floating action button (bottom-right)
  - On press: show action sheet — "Scan Card" or "Choose from Library"
- [ ] Create `ScanCardScreen` (`app/(tabs)/scan-card.tsx`):
  - Full-screen camera view using `expo-camera`
  - Overlay: card-frame guide rectangle with corner markers
  - Capture button at bottom center
  - "Use Photo Library" button for choosing existing image
  - On capture: show captured image preview with "Use Photo" / "Retake" actions
- [ ] On "Use Photo":
  - Compress image to JPEG, max 1024px longest side, quality 0.85
  - `POST /contacts/scan` with `multipart/form-data` body (field name: `card`)
  - Show full-screen spinner with "Scanning card..."
- [ ] Create `POST /contacts/scan` API endpoint in `ContactsController`:
  - Accept `multipart/form-data` image upload (use `@nestjs/platform-express` Multer)
  - Upload image to Cloudflare R2 (`scan-uploads/` prefix) using `@aws-sdk/client-s3`
    (R2 is S3-compatible)
  - Call Google Cloud Vision API `TEXT_DETECTION` feature with the R2 public URL
  - Parse Vision API `TextAnnotation` response; extract fields using regex + heuristics:
    - `name` — first proper-noun line
    - `title` — line containing common title keywords (CEO, Manager, Engineer, etc.)
    - `company` — line after title or containing Inc/Ltd/LLC/Corp
    - `email` — regex `[\w.+-]+@[\w-]+\.[a-z]{2,}`
    - `phone` — regex for international/local phone formats
    - `website` — regex for URLs
    - `address` — remaining lines after known fields are stripped
  - Assign `confidence: number` (0–1) per field based on Vision API confidence + heuristic match quality
  - If Vision API fails (non-200 or quota exceeded): fall back to AWS Textract
    (`DetectDocumentText` API), apply same parsing heuristics
  - Return extracted fields — do NOT save to DB
  - Delete the R2 object after extraction completes (scans are ephemeral)
  - Response shape:
    ```json
    {
      "fields": {
        "name": { "value": "Jane Doe", "confidence": 0.95 },
        "title": { "value": "Product Manager", "confidence": 0.88 },
        "company": { "value": "Acme Corp", "confidence": 0.91 },
        "email": { "value": "jane@acme.com", "confidence": 0.99 },
        "phone": { "value": "+1 555 123 4567", "confidence": 0.97 },
        "website": { "value": "acme.com", "confidence": 0.82 },
        "address": { "value": "123 Main St, San Francisco, CA", "confidence": 0.74 }
      },
      "rawText": "..."
    }
    ```
- [ ] Create `CardReviewScreen` (`app/(tabs)/scan-card-review.tsx`):
  - Receives extracted fields as route params
  - Shows editable `TextInput` for every field (name, title, company, email, phone, website, address)
  - Fields with `confidence < 0.75` have a yellow `#FDE68A` background highlight
  - Shows small yellow warning icon and text "Low confidence — please verify" below highlighted fields
  - "Save Contact" button at bottom
  - "Cancel" button at top-right
- [ ] On "Save Contact":
  - `POST /contacts` with the (potentially edited) field values
  - If `aiEnrichmentEnabled === true`: auto-trigger `POST /contacts/:id/enrich`
  - Navigate to the new contact detail screen
- [ ] Fallback: if OCR fails entirely (500 from API or no text detected):
  - Show toast: "Card scan failed. You can enter details manually."
  - Open a blank `CardReviewScreen` (all fields empty, user fills in manually)
  - Pre-fill with any partial results if some fields were extracted
- [ ] Enforce scan rate limits (checked server-side, enforced in `POST /contacts/scan`):
  - Pro plan: 50 scans per calendar day (Redis TTL counter)
  - Business+ plan: 500 scans per calendar day
  - Exceed limit: `429` with `Retry-After`; mobile shows toast "Daily scan limit reached"
- [ ] Write unit tests for the field-extraction parsing logic (pure function, no Vision API call):
  - Correctly extracts email from multi-line text
  - Correctly extracts phone in multiple formats
  - Returns low confidence for ambiguous name lines

**Acceptance Criteria:**

- [ ] Tapping "Scan Card" FAB opens the camera screen without crashing on iOS and Android
- [ ] Capturing an image of a business card and submitting calls `POST /contacts/scan`
      and returns extracted fields within 5 seconds
- [ ] The review form pre-fills all extracted fields; fields with confidence < 0.75 have
      yellow background highlight
- [ ] User can edit any field before saving
- [ ] Saving creates a new contact in the DB via `POST /contacts`
- [ ] If Google Cloud Vision fails, AWS Textract is used automatically (verified by mocking
      Vision to return 500 in tests)
- [ ] If both OCR services fail, the blank fallback form opens
- [ ] Pro user hitting 51st scan today receives `429`; toast is shown in the app
- [ ] Unit tests for field-extraction pass: `turbo test --filter mobile` exits 0

---

### T33 — Push Notifications (apps/mobile)

**Description:**
Implement push notifications for the mobile app using Expo Notifications, Firebase Cloud
Messaging (Android), and APNs (iOS). Notifications are delivered asynchronously via BullMQ
so no request thread is ever blocked. Users can configure per-type toggles in Settings.
Notification taps deep-link to the relevant screen.

**Steps:**

- [ ] Install `expo-notifications` in `apps/mobile`
- [ ] Configure FCM in Firebase Console; download `google-services.json`; add to `apps/mobile/`
- [ ] Configure APNs in Apple Developer Portal; upload `.p8` key to Expo (EAS Credentials)
- [ ] Add notification permissions to `app.json`:
  ```json
  "plugins": [
    ["expo-notifications", {
      "icon": "./assets/notification-icon.png",
      "color": "#0F172A",
      "sounds": ["./assets/sounds/notification.wav"]
    }]
  ]
  ```
- [ ] Create `NotificationsModule` in `apps/api/src/notifications/`
- [ ] Add `PushToken` Prisma model:
  ```prisma
  model PushToken {
    id        String   @id @default(cuid())
    userId    String
    user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    token     String   @unique
    platform  String   // 'ios' | 'android'
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
  }
  ```
- [ ] Run `prisma migrate dev --name add_push_tokens`
- [ ] Add `NotificationPreferences` Prisma model:
  ```prisma
  model NotificationPreferences {
    id                  String   @id @default(cuid())
    userId              String   @unique
    user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)
    newLead             Boolean  @default(true)
    viewMilestone       Boolean  @default(true)
    newTeamMember       Boolean  @default(true)
    renewalReminder     Boolean  @default(true)
    paymentFailed       Boolean  @default(true)
  }
  ```
- [ ] Run `prisma migrate dev --name add_notification_preferences`
- [ ] Create `POST /notifications/register` endpoint:
  - Auth-protected
  - Body: `{ token: string, platform: 'ios' | 'android' }`
  - Upsert `PushToken` record for the authenticated user
  - Returns `201 Created`
- [ ] Create `PATCH /notifications/preferences` endpoint:
  - Auth-protected
  - Body: partial `NotificationPreferences` object
  - Upsert preferences for the authenticated user
- [ ] Create `GET /notifications/preferences` endpoint:
  - Auth-protected
  - Returns current preferences for the authenticated user
- [ ] Create `NotificationsService` with method:

  ```ts
  sendToUser(
    userId: string,
    payload: {
      type: NotificationType;
      title: string;
      body: string;
      data?: Record<string, string>;
    }
  ): Promise<void>
  ```

  - Look up all `PushToken` records for `userId`
  - Check `NotificationPreferences` — skip if that notification type is disabled
  - Enqueue `NotificationDeliveryJob` to BullMQ queue (`notifications-delivery`)

- [ ] Create `NotificationDeliveryProcessor` (BullMQ worker):
  - For each token, call Expo Push API (`https://exp.host/--/api/v2/push/send`)
  - Batch up to 100 messages per request (Expo push batch limit)
  - Handle `DeviceNotRegistered` receipts: delete stale tokens from DB
  - Retry up to 3 times on transient Expo API errors (exponential backoff)
- [ ] Define `NotificationType` enum in `packages/types`:
  ```ts
  enum NotificationType {
    NEW_LEAD = 'new_lead',
    VIEW_MILESTONE = 'view_milestone',
    NEW_TEAM_MEMBER = 'new_team_member',
    RENEWAL_REMINDER = 'renewal_reminder',
    PAYMENT_FAILED = 'payment_failed',
  }
  ```
- [ ] Wire notification triggers at each event site:
  - `NEW_LEAD`: call `NotificationsService.sendToUser` after `POST /public/leads` saves a lead
  - `VIEW_MILESTONE`: call after analytics event write when total card views crosses 100, 500, 1000
    (check and set a Redis key `milestone:{cardId}:{milestone}` to avoid duplicate sends)
  - `NEW_TEAM_MEMBER`: call after team member invite is accepted
  - `RENEWAL_REMINDER`: BullMQ cron job runs daily at 09:00 UTC — queries users whose subscription
    `currentPeriodEnd` is exactly 3 days away and enqueues notification
  - `PAYMENT_FAILED`: call from the smart contract event listener when an on-chain payment
    transaction fails or a subscription renewal is missed (see T38 for on-chain monitoring)
- [ ] **Mobile — token registration:**
  - On app launch (authenticated), call `Notifications.requestPermissionsAsync()`
  - If granted, call `Notifications.getExpoPushTokenAsync({ projectId: ... })`
  - `POST /notifications/register` with the token and platform
  - Store token in `AsyncStorage` to avoid re-registering on every launch
- [ ] **Mobile — deep linking on tap:**
  - `NEW_LEAD` notification `data.contactId` → navigate to `/contacts/:contactId`
  - `VIEW_MILESTONE` notification `data.cardId` → navigate to `/analytics` (filtered to that card)
  - `NEW_TEAM_MEMBER` → navigate to `/settings/team`
  - `RENEWAL_REMINDER` → navigate to `/settings/billing`
  - `PAYMENT_FAILED` → navigate to `/settings/billing`
  - Use `Notifications.addNotificationResponseReceivedListener` in root `_layout.tsx`
- [ ] **Mobile — Settings:**
  - Add "Notifications" section in Settings tab
  - Five toggle rows (one per `NotificationType`) with human-readable labels:
    - New Lead Captured
    - View Milestone Reached
    - New Team Member Joined
    - Subscription Renewal Reminder
    - Payment / Transaction Failed
  - Toggles call `PATCH /notifications/preferences` on change
  - Load current state from `GET /notifications/preferences` on screen mount

**Acceptance Criteria:**

- [ ] `POST /notifications/register` with a valid Expo push token returns `201` and
      persists a `PushToken` record
- [ ] `NotificationsService.sendToUser` enqueues a job without blocking the calling request
- [ ] A new lead submission triggers a push notification delivered to the card owner's device
      within 10 seconds
- [ ] View milestone notification fires exactly once when total card views crosses 100 (no
      duplicate sends verified by Redis key check)
- [ ] Per-type toggles in mobile Settings persist to the DB and suppress the correct
      notification type
- [ ] Tapping a `NEW_LEAD` notification while the app is backgrounded opens the CRM contact
      detail screen for that lead
- [ ] Stale tokens (`DeviceNotRegistered`) are deleted from DB automatically
- [ ] Renewal reminder cron job correctly identifies users with `currentPeriodEnd` in 3 days
      (verified with a test subscription record)

---

### T34 — App Store & Play Store Submission

**Description:**
Prepare and submit the iOS app to the Apple App Store and the Android app to Google Play.
This task covers all metadata, screenshots, compliance declarations, privacy policy, EAS
build configuration, and the staged rollout strategy on Android.

**Steps:**

#### iOS Submission

- [ ] Set bundle ID to `one.dotly.app` in `app.json` under `ios.bundleIdentifier`
- [ ] Configure `app.json` entitlements:
  ```json
  "ios": {
    "bundleIdentifier": "one.dotly.app",
    "buildNumber": "1",
    "entitlements": {
      "com.apple.developer.nfc.readersession.formats": ["NDEF"],
      "aps-environment": "production"
    },
    "infoPlist": {
      "NFCReaderUsageDescription": "Used to read NFC-enabled business cards.",
      "NSCameraUsageDescription": "Used to scan business cards and add contacts.",
      "NSPhotoLibraryUsageDescription": "Used to import business card images.",
      "NSContactsUsageDescription": "Used to save scanned business card contacts to your address book.",
      "NSUserNotificationsUsageDescription": "Used to send you lead alerts and milestones."
    }
  }
  ```
- [ ] Create EAS Build production profile in `eas.json`:
  ```json
  {
    "build": {
      "production": {
        "ios": {
          "distribution": "store",
          "credentialsSource": "remote"
        }
      }
    }
  }
  ```
- [ ] Run `eas credentials` to generate/upload iOS Distribution Certificate and
      Provisioning Profile
- [ ] Run `eas build --platform ios --profile production` and confirm IPA is generated
- [ ] Create App Store Connect listing:
  - Name: `Dotly — Digital Business Card`
  - Subtitle: `Share. Scan. Connect.`
  - Description: full marketing copy (3–4 paragraphs; covers NFC sharing, QR codes,
    lead capture, CRM, analytics, team cards, crypto billing)
  - Keywords (100 chars max): `business card,NFC,digital card,QR code,networking,CRM,lead capture,contact scanner`
  - Support URL: `https://dotly.one/support`
  - Marketing URL: `https://dotly.one`
  - Privacy Policy URL: `https://dotly.one/privacy`
- [ ] Capture screenshots (use Simulator + Xcode):
  - iPhone 6.7" (iPhone 15 Pro Max): 5 screenshots (Home, Card Builder, QR Share, CRM, Analytics)
  - iPhone 6.1" (iPhone 15): 5 screenshots (same screens)
  - iPad Pro 12.9" 6th gen: 5 screenshots (same screens, iPad layout)
- [ ] Upload screenshots and app previews to App Store Connect via Transporter or web upload
- [ ] App Review Notes:

  ```
  Test credentials:
    Email: appreviewer@dotly.one
    Password: DotlyReview2026!

  NFC note: NFC card sharing requires a physical NFC tag. Core features (QR, CRM, analytics)
  are fully functional without NFC hardware. NFC is only available on iPhone 7 and later.

  Crypto billing note: Subscription payments use USDC on Polygon/Base network. The app
  does not facilitate cryptocurrency trading or exchange.
  ```

- [ ] Set age rating to 4+
- [ ] Select primary category: Business; secondary category: Productivity
- [ ] Export compliance: HTTPS only; select "No" for encryption beyond standard HTTPS
- [ ] Ensure `/privacy` page is live at `dotly.one/privacy` before submission
- [ ] Ensure `/terms` page is live at `dotly.one/terms` before submission
- [ ] Submit for App Review

#### Android Submission

- [ ] Set application ID to `one.dotly.app` in `app.json` under `android.package`
- [ ] Configure `app.json` for Android:
  ```json
  "android": {
    "package": "one.dotly.app",
    "versionCode": 1,
    "permissions": [
      "CAMERA",
      "READ_CONTACTS",
      "WRITE_CONTACTS",
      "RECEIVE_BOOT_COMPLETED",
      "VIBRATE",
      "POST_NOTIFICATIONS"
    ],
    "googleServicesFile": "./google-services.json"
  }
  ```
- [ ] Create EAS Build production profile for Android in `eas.json`:
  ```json
  "android": {
    "buildType": "app-bundle",
    "distribution": "store",
    "credentialsSource": "remote"
  }
  ```
- [ ] Run `eas build --platform android --profile production` and confirm AAB is generated
- [ ] Create Google Play Console application:
  - Upload AAB to Internal Testing track first
  - Fill in Store Listing:
    - App name: `Dotly — Digital Business Card`
    - Short description (80 chars): `NFC & QR digital business cards with CRM and lead capture`
    - Full description: same marketing copy as iOS (4000 chars max)
    - Feature graphic: 1024×500px JPG/PNG (branded Dotly banner)
    - App icon: 512×512px PNG (hi-res version of app icon)
    - Screenshots: phone (min 2, max 8; 5 provided), tablet optional
  - Category: Business
- [ ] Complete IARC content rating questionnaire (answer: no violence, no mature content →
      rated Everyone / PEGI 3)
- [ ] Set target SDK to API level 34 (Android 14) in `app.json`
- [ ] Complete Data Safety form:
  - Camera: collected, not shared with third parties
  - Contacts: collected, used for app functionality, not shared
  - Device or other IDs (push tokens): collected for app functionality
  - No user data sold
- [ ] Promote from Internal Testing → Closed Testing (add 10 internal testers) → Open Testing →
      Production (staged rollout: 10% → 50% → 100% over 7 days)

#### Both Platforms

- [ ] Confirm Privacy Policy at `dotly.one/privacy` is live, accessible, and covers:
      camera, contacts, push notifications, crypto wallet addresses, analytics data
- [ ] Confirm Terms of Service at `dotly.one/terms` is live
- [ ] Confirm app version numbers match in `app.json`, EAS, and store listings

**Acceptance Criteria:**

- [ ] EAS Build produces a valid IPA for iOS distribution without build errors
- [ ] EAS Build produces a valid AAB for Android without build errors
- [ ] App Store Connect listing is fully completed with no missing required fields
- [ ] Google Play Console Internal Testing track has an active release with the AAB uploaded
- [ ] All five screenshot sets (iPhone 6.7", 6.1", iPad 12.9") are uploaded to App Store Connect
- [ ] Both platforms show Privacy Policy and Terms URLs linking to live pages
- [ ] iOS app submitted for App Review (status: "Waiting for Review" or later)
- [ ] Android app promoted to at least Closed Testing track with 10 testers
- [ ] Age rating 4+ / Everyone applied on both platforms

---

### T35 — Observability Stack

**Description:**
Instrument the full platform with error tracking (Sentry), product analytics (PostHog),
infrastructure uptime monitoring (BetterUptime/Checkly), and structured server-side logging
(pino → Logtail or Datadog). Every service and every app must be covered.

**Steps:**

#### Sentry

- [ ] Create three Sentry projects: `dotly-api`, `dotly-web`, `dotly-mobile`
- [ ] Install and configure Sentry in `apps/api`:
  - `@sentry/node` + `@sentry/profiling-node`
  - Initialize in `main.ts` before NestJS app creation:
    ```ts
    Sentry.init({
      dsn: process.env.SENTRY_DSN_API,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 1.0,
      profilesSampleRate: 1.0,
      integrations: [nodeProfilingIntegration()],
    })
    ```
  - Add `SentryInterceptor` as a global interceptor to capture all unhandled exceptions
  - Add Sentry performance instrumentation for all HTTP endpoints
    (use `SentryTracingInterceptor` or equivalent)
  - Upload source maps in CI:
    ```
    npx @sentry/cli releases files $VERSION upload-sourcemaps ./dist --rewrite
    ```
- [ ] Install and configure Sentry in `apps/web`:
  - `@sentry/nextjs`
  - Run `npx @sentry/wizard@latest -i nextjs` to generate `sentry.client.config.ts`,
    `sentry.server.config.ts`, `sentry.edge.config.ts`
  - Configure `SENTRY_DSN_WEB` environment variable in Vercel
  - Enable performance monitoring for all Next.js page loads and API routes
  - Upload source maps on every Vercel deployment via Sentry Vercel integration
- [ ] Install and configure Sentry in `apps/mobile`:
  - `@sentry/react-native`
  - Initialize in `app/_layout.tsx`:
    ```ts
    Sentry.init({
      dsn: process.env.EXPO_PUBLIC_SENTRY_DSN_MOBILE,
      enableAutoSessionTracking: true,
      tracesSampleRate: 1.0,
    })
    ```
  - Wrap root component with `Sentry.wrap()`
  - Upload source maps as part of EAS Build post-hook:
    ```
    npx @sentry/cli releases files $VERSION upload-sourcemaps
    ```
  - Add Expo screen load transactions (wrap each screen with `Sentry.startTransaction`)
- [ ] Configure Sentry alert rule on all three projects:
  - Condition: error rate > 1% of events in a 5-minute window
  - Action: post to `#dotly-alerts` Slack channel with issue URL + affected service name
  - Also send email to on-call engineer

#### PostHog

- [ ] Create PostHog production project; note `POSTHOG_API_KEY`
- [ ] Install and configure PostHog in `apps/web`:
  - `posthog-js`
  - Initialize in `providers.tsx` (client component):
    ```ts
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: 'https://app.posthog.com',
      capture_pageview: false, // manual for SPA
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') posthog.opt_out_capturing()
      },
    })
    ```
  - Add `PostHogProvider` wrapping the app in `layout.tsx`
  - Use `usePostHog` hook to call `identify()` after auth:
    ```ts
    posthog.identify(userId, { plan, createdAt })
    ```
  - Instrument events:
    - `card_created` — `POST /cards` success
    - `card_published` — card `isActive` toggled to true
    - `lead_captured` — `POST /public/leads` success (fire from API via PostHog server SDK)
    - `crm_stage_changed` — stage dropdown change in CRM view
    - `qr_downloaded` — QR download button click
    - `plan_upgraded` — billing upgrade completion
    - `plan_cancelled` — billing cancellation
    - `card_viewed` — fired server-side (API) on `GET /public/cards/:handle`
- [ ] Install and configure PostHog in `apps/mobile`:
  - `posthog-react-native`
  - Initialize in `app/_layout.tsx` with `PostHogProvider`
  - Call `posthog.identify()` after successful sign-in
  - Instrument same 8 events where applicable (card_created, lead_captured, etc.)
  - Enable `autocaptureFeature` for React Native screen views
- [ ] Configure PostHog feature flags:
  - `ai-enrichment-v2` — gradual rollout for next iteration of enrichment model
  - `business-card-scanner` — can be used to disable scanner feature remotely without deploy
  - `crypto-billing-v2` — for testing new billing contract version
  - Check flags on app load; store results in React context / NestJS config service

#### Infrastructure Monitoring

- [ ] Set up BetterUptime (or Checkly) monitors:
  - Monitor 1: `GET https://dotly.one` — ping every 60s from 3 regions
    (US East, EU West, Asia Pacific)
  - Monitor 2: `GET https://api.dotly.one/health` — ping every 60s from 3 regions;
    assert status 200 and JSON body contains `"status":"ok"`
  - Monitor 3: `GET https://dotly.one/card/test-user` — ping every 60s; assert status 200
  - Alert condition: >2 consecutive failures (>2 min downtime) → send email + Slack to
    `#dotly-alerts`
  - Configure status page at `status.dotly.one`
- [ ] Add Vercel Web Analytics to `apps/web`:
  - `@vercel/analytics` — add `<Analytics />` component to root `layout.tsx`
- [ ] Add Vercel Speed Insights to `apps/web`:
  - `@vercel/speed-insights` — add `<SpeedInsights />` component to root `layout.tsx`

#### Structured Logging

- [ ] Install `pino` and `pino-http` in `apps/api`
- [ ] Replace NestJS default logger with a `PinoLogger` wrapper:
  - All log entries are JSON objects with fields: `timestamp`, `level`, `service`, `requestId`,
    `userId`, `message`, `error` (if applicable)
  - Attach `requestId` (UUID) per incoming HTTP request via middleware
  - Log request method, path, status code, and duration on every response
- [ ] Configure log forwarding:
  - Development: pretty-print with `pino-pretty`
  - Production: JSON output piped to stdout (Railway captures and forwards to Logtail or Datadog)
  - Set up Logtail (or Datadog) log drain on Railway; confirm logs appear in dashboard

**Acceptance Criteria:**

- [ ] A thrown exception in `apps/api` appears in the `dotly-api` Sentry project within 60 seconds
- [ ] A JavaScript error in `apps/web` appears in the `dotly-web` Sentry project within 60 seconds
- [ ] A native crash in `apps/mobile` appears in the `dotly-mobile` Sentry project with a
      symbolicated stack trace (not hex addresses)
- [ ] All 8 PostHog events fire correctly — verified in PostHog Live Events view during manual
      walkthrough of each flow
- [ ] `posthog.identify()` is called with `plan` and `createdAt` properties after sign-in
      on both web and mobile
- [ ] BetterUptime/Checkly monitor shows green for all 3 checks in the dashboard
- [ ] Bringing `GET /health` down (temporarily returning 500) triggers a Slack alert within 3
      minutes
- [ ] API logs are structured JSON in production and visible in Logtail/Datadog
- [ ] No PII (email, full name, phone) appears in raw log output

---

### T36 — Security Hardening & SOC 2 Readiness

**Description:**
Apply a comprehensive security hardening layer across the API, auth system, and frontend.
Establish the audit trail, compliance controls, and privacy tooling required to credibly
pursue SOC 2 Type I. Special attention is given to the crypto billing path, where private
key hygiene and on-chain verification replace traditional server-side billing trust.

**Steps:**

#### API Security

- [ ] Install `helmet` in `apps/api`; apply as global middleware with full options:
  ```ts
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: [
            "'self'",
            'data:',
            'https://res.cloudinary.com',
            'https://*.r2.cloudflarestorage.com',
          ],
          connectSrc: ["'self'", 'https://api.dotly.one'],
          frameSrc: ["'none'"],
        },
      },
      hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xFrameOptions: { action: 'deny' },
    }),
  )
  ```
- [ ] Harden CORS to a strict allowlist:
  - Allowed origins: `['https://dotly.one', 'https://www.dotly.one', 'https://app.dotly.one']`
  - Development only: add `http://localhost:3000`
  - Reject all other origins with `403`
- [ ] Install `dompurify` + `jsdom` in `apps/api`; sanitize all user-supplied HTML fields
      (card bio, custom HTML blocks) before storage using `DOMPurify.sanitize()`
- [ ] Audit all Prisma `$queryRaw` and `$executeRaw` calls — ensure every one uses tagged
      template literals (not string concatenation); add lint rule to fail on raw query string concat
- [ ] Implement SSRF prevention middleware:
  - Before any server-side URL fetch (R2 uploads, webhook delivery, custom domain validation):
    resolve the hostname to an IP
    reject if IP is in private ranges: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`,
    `127.0.0.0/8`, `169.254.0.0/16`, `::1`, `fc00::/7`
    reject if IP is a cloud metadata endpoint: `169.254.169.254`
  - Return `400 Bad Request` with message "URL not allowed"
- [ ] Add `truffleHog` or `gitleaks` scan to CI pipeline:
  - Job: `secret-scan` — runs on every PR, scans the full diff for secrets
  - Fail PR if any secret patterns are detected

#### Authentication Security

- [ ] Configure first-party access token TTL to 15 minutes
- [ ] Configure first-party refresh token TTL to 30 days
- [ ] Implement session invalidation on plan downgrade:
  - When a user's plan is downgraded (detected in billing event handler), revoke all local refresh
    sessions for the user
  - User will be prompted to sign in again, receiving a new token reflecting the new plan
- [ ] Implement auth rate limiting:
  - Add Redis-backed rate limiter to `POST /auth/login` and `POST /auth/register` (or equivalent
    first-party auth endpoints): 10 attempts per 15 minutes per IP
  - After limit hit: `429 Too Many Requests`, `Retry-After: 900` header
  - Log blocked attempts to the structured logger with `level: 'warn'`
- [ ] Implement TOTP MFA:
  - Add TOTP enrollment and verification to the first-party auth system
  - For Business+ plan users: allow team owners to enforce MFA for all team members
    (`enforceTeamMfa: boolean` field on `Team` model; add migration)
  - When `enforceTeamMfa` is true: API middleware checks `amr` claim in JWT; if no TOTP factor
    present, return `403 MFA required` with instruction URL

#### Privacy & Data Subject Rights

- [ ] Implement `GET /users/me/export`:
  - Auth-protected
  - Gather all data for the authenticated user:
    cards, social links, media blocks, QR codes, contacts, CRM pipeline entries,
    analytics events (aggregated, not raw IPs), subscription record, push tokens (token
    values excluded), enrichment results, team memberships
  - Package as a ZIP archive with JSON files per entity type
  - Upload ZIP to a private R2 path (`exports/{userId}/{timestamp}.zip`)
  - Return a signed R2 URL valid for 1 hour
  - Log the export request in `AuditLog`
- [ ] Implement `DELETE /users/me`:
  - Auth-protected
  - Body: `{ confirmation: "DELETE MY ACCOUNT" }` (must match exactly)
  - Immediately:
    - Anonymize PII: set `name = '[deleted]'`, `email = null`, `avatarUrl = null` on `User`
    - Revoke all first-party refresh sessions for the user
    - Set `deletedAt` on `User` record
  - Schedule hard delete in 30 days via BullMQ delayed job:
    - Delete all `Card`, `Contact`, `CrmPipeline`, `AnalyticsEvent`, `PushToken`,
      `ContactEnrichment`, `TeamMember`, `Subscription` records
    - Delete R2 objects under `user-uploads/{userId}/`
    - Hard delete `User` record
  - Send confirmation email via Mailgun:
    - Subject: "Your Dotly account deletion has been requested"
    - Body: confirms 30-day window, provides support contact if in error
  - Return `202 Accepted`
- [ ] Implement GDPR/CCPA cookie consent:
  - Install `cookie-consent` library or implement lightweight custom banner in `apps/web`
  - Banner shown on first visit; blocks PostHog and any analytics scripts until consent granted
  - Persist consent in `localStorage` key `dotly_cookie_consent`
  - Provide "Accept All", "Reject Non-Essential", and "Manage Preferences" options
  - Manage Preferences: toggles for Analytics, Marketing (future)
- [ ] Ensure `/privacy` route exists at `apps/web/app/privacy/page.tsx` with full policy content
- [ ] Ensure `/terms` route exists at `apps/web/app/terms/page.tsx` with full terms content

#### SOC 2 Controls

- [ ] Create `AuditLog` Prisma model:
  ```prisma
  model AuditLog {
    id         String   @id @default(cuid())
    userId     String?
    action     String   // e.g. 'contact.created', 'card.deleted', 'billing.upgraded'
    resource   String   // e.g. 'Contact:clxyz123', 'Card:clxyz456'
    ipAddress  String?
    userAgent  String?
    metadata   Json?
    createdAt  DateTime @default(now())
    @@index([userId])
    @@index([action])
    @@index([createdAt])
  }
  ```
- [ ] Run `prisma migrate dev --name add_audit_log`
- [ ] Instrument `AuditLog` writes for all critical actions:
  - `auth.login`, `auth.logout`, `auth.mfa_enabled`, `auth.mfa_disabled`
  - `card.created`, `card.updated`, `card.deleted`, `card.published`, `card.unpublished`
  - `contact.created`, `contact.deleted`, `contact.enriched`
  - `billing.upgraded`, `billing.downgraded`, `billing.cancelled`
  - `team.member_added`, `team.member_removed`, `team.mfa_enforced`
  - `data.export_requested`, `account.delete_requested`, `account.deleted`
  - `domain.verified`, `domain.removed`
  - Create `AuditService` with `log(userId, action, resource, req)` helper; inject and call at
    each site
- [ ] Add `snyk` or `npm audit` to CI:
  - Job: `dependency-audit` — runs `npm audit --audit-level=high` (or `snyk test --severity-threshold=high`)
  - Fail CI on any HIGH or CRITICAL severity CVE
- [ ] Create OWASP Top 10 pen test checklist document at `docs/SECURITY_CHECKLIST.md`:
  - A01 Broken Access Control: all endpoints verify ownership (contactId/cardId belongs to authed user)
  - A02 Cryptographic Failures: HTTPS everywhere, no secrets in logs, no sensitive data in JWT payload
  - A03 Injection: Prisma parameterized queries, DOMPurify sanitization
  - A04 Insecure Design: rate limits, plan enforcement, SSRF prevention
  - A05 Security Misconfiguration: Helmet headers, strict CORS, no debug endpoints in production
  - A06 Vulnerable Components: Snyk/npm audit in CI
  - A07 Auth Failures: rate-limited auth, short-lived tokens, MFA support
  - A08 SSRF: SSRF middleware applied to all outbound URL fetches
  - A09 Logging: structured logs, AuditLog table, no PII in raw logs
  - A10 SSRF/Supply Chain: gitleaks in CI, lock file committed

#### Crypto Billing Security

- [ ] Confirm no private keys are stored in any `.env` file or environment variable:
  - Smart contract deployment key: use a hardware wallet (Ledger) or AWS KMS; document process
  - Subscription contract owner key: same requirement
- [ ] All transaction signing is performed client-side (in the mobile/web app using the user's
      connected wallet — MetaMask, WalletConnect, or Coinbase Wallet)
- [ ] API server verifies subscription status by reading on-chain state only:
  - Call the subscription smart contract's `isSubscriptionActive(address)` view function
  - Never trust client-reported payment status
  - Cache on-chain result in Redis for 60 seconds to reduce RPC calls
- [ ] Engage a smart contract auditor before mainnet deployment:
  - Add "Smart contract audit complete" as a hard blocker in the launch checklist (T38)
  - Audit scope: subscription contract, payment contract, upgrade/downgrade logic

**Acceptance Criteria:**

- [ ] `curl -I https://api.dotly.one/health` returns `X-Frame-Options: DENY`,
      `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, and a `Content-Security-Policy`
      header
- [ ] A CORS request from `https://evil.example.com` to the API returns `403`
- [ ] DOMPurify strips `<script>` tags from card bio input (verified in unit test)
- [ ] SSRF middleware rejects URLs resolving to `192.168.1.1` with `400` (unit test)
- [ ] `gitleaks` CI job catches a test AWS key deliberately added to a branch and fails the PR
- [ ] A Pro user with expired auth token is signed out and redirected to sign-in
- [ ] A 5th auth attempt within 5 minutes from the same IP returns `429`
- [ ] `GET /users/me/export` returns a signed ZIP URL containing JSON files for all user data
- [ ] `DELETE /users/me` with the correct confirmation string returns `202` and sends the
      confirmation email via Mailgun
- [ ] Cookie consent banner appears on first visit to dotly.one and blocks PostHog until accepted
- [ ] Every `card.created` event has a corresponding `AuditLog` row with `userId`, `action`,
      `resource`, `ipAddress`, and `createdAt`
- [ ] `npm audit --audit-level=high` in CI fails a branch that has a known HIGH CVE introduced
- [ ] No private keys present in any environment variable or `.env.example` file
- [ ] API correctly returns `403 Subscription inactive` for a wallet address with no active
      on-chain subscription

---

### T37 — Load Testing & Disaster Recovery

**Description:**
Validate the platform's performance under realistic peak load using k6 or Artillery scenarios.
Establish database connection pooling, read replicas for analytics, automated backups with
verified restore, and documented runbooks for all failure modes. Formally define and test
RTO/RPO targets.

**Steps:**

#### Load Testing

- [ ] Install k6 or Artillery; create test scripts in `tools/load-tests/`
- [ ] Write and run **Scenario S1** — Public Card Page Surge:
  ```
  Target: GET /public/cards/:handle (using handle: 'test-user')
  Virtual users: ramp 0 → 1000 over 60s, hold 1000 for 5min, ramp down
  Thresholds:
    - p95 response time < 200ms
    - p99 response time < 500ms
    - error rate < 0.1%
  ```
- [ ] Write and run **Scenario S2** — Authenticated Dashboard Users:
  ```
  Target: authenticated mix of GET /cards, GET /contacts, GET /analytics/events,
          POST /analytics/events
  Virtual users: ramp 0 → 200 over 30s, hold 200 for 3min
  Thresholds:
    - p95 response time < 400ms
    - error rate < 0.5%
  ```
- [ ] Write and run **Scenario S3** — Analytics Ingestion Spike:
  ```
  Target: POST /public/analytics
  Virtual users: constant 500 events/sec for 2min
  Thresholds:
    - p95 response time < 100ms
    - error rate < 0.1%
    - all events written to Redis queue (verify queue depth after test)
  ```
- [ ] Run all three scenarios against the staging environment before promoting to production
- [ ] Document results in `docs/LOAD_TEST_RESULTS.md` with p50/p95/p99 latencies, throughput,
      and error rates for each scenario
- [ ] If any threshold fails: identify bottleneck (DB query, missing index, N+1, CPU),
      fix, re-run until all thresholds pass

#### Database Resilience

- [ ] Install and configure **PgBouncer** as a connection pooler in front of PostgreSQL:
  - Pool mode: `transaction` (recommended for NestJS with Prisma)
  - Max client connections: 200
  - Max server connections (pool size): 20
  - Update `DATABASE_URL` in API to point to PgBouncer endpoint
  - Update Prisma `datasource` to use `pgbouncer=true` query param
  - Verify Prisma migrations still run directly against PostgreSQL (not through PgBouncer)
- [ ] Provision a **PostgreSQL read replica**:
  - On Railway: enable read replica in the Postgres service settings
  - Add `DATABASE_REPLICA_URL` environment variable
  - Create `PrismaReadService` in `apps/api` using the replica connection
  - Route all analytics read queries (`GET /analytics/events`, `GET /analytics/summary`)
    to the read replica via `PrismaReadService`
- [ ] Configure **automated daily backups**:
  - Railway PostgreSQL: enable daily automated backups with 30-day retention
  - Verify backup schedule in Railway dashboard
- [ ] **PITR verification:**
  - Document how to use Railway's PITR (Point-in-Time Recovery) in `docs/DR_RUNBOOK.md`
  - Perform one PITR test: restore the staging DB to a timestamp 2 hours prior; confirm
    row counts match expected state
- [ ] **Backup restore drill:**
  - Restore the most recent automated backup to a fresh staging database instance
  - Verify application connects successfully and core flows work (create card, capture lead)
  - Document steps and result in `docs/DR_RUNBOOK.md` under "Backup Restore Drill"

#### Disaster Recovery

- [ ] Define formal RTO and RPO targets:
  - **RTO (Recovery Time Objective): < 30 minutes** — from incident detection to service restored
  - **RPO (Recovery Point Objective): < 1 hour** — maximum data loss acceptable
- [ ] Write `docs/DR_RUNBOOK.md` with the following runbooks (each as a numbered step-by-step):
  1. **API Down** — symptoms, first responder steps, Railway deployment rollback command,
     how to verify recovery, escalation path
  2. **Database Corruption** — symptoms, immediate steps (put API in maintenance mode),
     PITR restore procedure, data validation steps, how to lift maintenance mode
  3. **Redis Failure** — symptoms, impact assessment (queues halted, rate limits disabled),
     Railway Redis restart procedure, BullMQ queue drain and backfill steps
  4. **Vercel Incident** — symptoms, how to check Vercel status page, fallback options
     (direct Railway API serving, Cloudflare cache), estimated recovery timeline
- [ ] **Zero-downtime failover test:**
  - Simulate API instance restart on Railway (trigger a redeploy with zero-downtime setting)
  - Run k6 Scenario S1 concurrently during the redeploy
  - Confirm error rate during failover stays below 0.5% (Railway health check drain handles
    in-flight requests)
  - Document result in `docs/DR_RUNBOOK.md`

**Acceptance Criteria:**

- [ ] S1 (1000 concurrent public card GETs for 5min): p95 < 200ms, error rate < 0.1%
- [ ] S2 (200 concurrent authenticated dashboard users): p95 < 400ms, error rate < 0.5%
- [ ] S3 (500 events/sec analytics ingestion): p95 < 100ms, error rate < 0.1%
- [ ] All three scenarios pass thresholds on staging before production promotion
- [ ] `docs/LOAD_TEST_RESULTS.md` exists with complete metrics from each scenario run
- [ ] PgBouncer is running; `SHOW POOLS` in psql shows active connections
- [ ] Analytics read queries are confirmed routing to the replica (verified via `SELECT
pg_is_in_recovery()` returning `true` on the query connection)
- [ ] Automated daily backup visible in Railway dashboard with 30-day retention policy
- [ ] PITR restore drill completed successfully; documented in `docs/DR_RUNBOOK.md`
- [ ] `docs/DR_RUNBOOK.md` contains all 4 runbooks with step-by-step recovery procedures
- [ ] Zero-downtime failover test shows error rate < 0.5% during Railway redeploy

---

### T38 — Final Production Deployment

**Description:**
Execute the final production deployment to dotly.one. Wire all DNS records, configure
CI/CD with manual approval gate for production promotion, establish the database migration
strategy, and complete the full pre-launch checklist. This task is the launch gate.

**Steps:**

#### Infrastructure & DNS

- [ ] Deploy `apps/web` to Vercel production project:
  - Connect GitHub repo → Vercel project → production branch: `main`
  - Add custom domain `dotly.one` in Vercel project settings
  - Add custom domain `www.dotly.one` with redirect to `dotly.one`
  - Confirm Vercel auto-provisions SSL certificate for `dotly.one`
- [ ] Deploy `apps/api` to Railway production service:
  - Create Railway production environment (separate from staging)
  - Deploy NestJS API service with private networking enabled
  - Add custom domain `api.dotly.one` in Railway service settings
  - Confirm Railway auto-provisions SSL certificate for `api.dotly.one`
- [ ] Configure PostgreSQL on Railway production (private networking to API service):
  - Confirm `DATABASE_URL` uses Railway private network URL (not public)
  - PgBouncer sits in front of Postgres within Railway private network
- [ ] Configure Redis on Railway production (private networking):
  - Confirm `REDIS_URL` uses Railway private network URL
- [ ] Configure DNS records (provider: wherever dotly.one is registered):
  ```
  dotly.one         A/ALIAS   → Vercel (use Vercel's provided ALIAS record)
  www.dotly.one     CNAME     → cname.vercel-dns.com
  api.dotly.one     CNAME     → Railway-provided hostname for API service
  cname.dotly.one   CNAME     → cname.vercel-dns.com  (for custom card domains)
  ```
- [ ] Confirm all DNS records propagate (`dig dotly.one`, `dig api.dotly.one`)
- [ ] Confirm SSL is active on all four hostnames (no mixed content warnings)

#### CI/CD Pipeline

- [ ] Update `.github/workflows/ci.yml` to add full deployment pipeline:

  ```yaml
  on:
    push:
      branches: [main]
    pull_request:
      branches: [main]

  jobs:
    lint: # existing
    typecheck: # existing
    build: # existing
    secret-scan: # new (T36)
    dependency-audit: # new (T36)

    deploy-staging:
      needs: [lint, typecheck, build, secret-scan, dependency-audit]
      if: github.ref == 'refs/heads/main'
      runs-on: ubuntu-latest
      steps:
        - name: Deploy to Railway staging
          run: railway up --environment staging
        - name: Deploy to Vercel staging
          run: vercel --prod=false

    deploy-production:
      needs: [deploy-staging]
      if: github.ref == 'refs/heads/main'
      environment: production # GitHub environment with required reviewer protection
      runs-on: ubuntu-latest
      steps:
        - name: Run prisma migrate deploy (production)
          run: railway run --environment production prisma migrate deploy
        - name: Deploy API to Railway production
          run: railway up --environment production
        - name: Deploy Web to Vercel production
          run: vercel --prod
  ```

- [ ] Create GitHub `production` environment with required reviewers (at least 1 manual approval
      before `deploy-production` job runs)
- [ ] Configure one-click rollback:
  - Railway: use Railway's "Rollback" button in the deployment history UI
  - Vercel: use Vercel's "Instant Rollback" button in deployment history UI
  - Document rollback procedure in `docs/DR_RUNBOOK.md`
- [ ] Add branch protection on `main`: require PR, require CI pass, require 1 approver

#### Database Migration Strategy

- [ ] Configure Railway production `releaseCommand`:
  ```
  prisma migrate deploy
  ```
  This runs migrations before the new API version starts receiving traffic.
- [ ] Establish and document zero-downtime migration policy in `docs/DB_MIGRATION_POLICY.md`:
  - All migrations must be backward-compatible with the previous API version
  - Never: DROP COLUMN, RENAME COLUMN, change column type without a multi-step migration
  - Allowed: ADD COLUMN (nullable or with default), ADD INDEX, CREATE TABLE
  - Breaking changes: use expand/contract pattern (Phase 1: add new, Phase 2: migrate data,
    Phase 3: remove old) across separate deployments

#### Pre-Launch Checklist

- [ ] All environment variables configured in Vercel production project
- [ ] All environment variables configured in Railway production service
- [ ] Production auth, storage, and database services are on plans that meet production SLAs
- [ ] Smart contract deployed and verified on-chain (Polygon or Base mainnet):
  - Contract source code verified on Polygonscan/Basescan
  - Contract address stored in environment as `SUBSCRIPTION_CONTRACT_ADDRESS`
  - External smart contract audit complete (hard blocker)
- [ ] Mailgun domain `dotly.one` verified with DKIM, SPF, and DMARC records configured
- [ ] Mailgun sending domain shows "Active" in Mailgun dashboard
- [ ] Cloudflare R2 bucket `dotly-uploads` created with CORS policy:
  ```json
  [
    {
      "AllowedOrigins": ["https://dotly.one"],
      "AllowedMethods": ["GET", "PUT", "DELETE"],
      "AllowedHeaders": ["*"]
    }
  ]
  ```
- [ ] Sentry DSNs added to all three production environments; source maps uploading on deploy
- [ ] PostHog production project API key configured in Vercel and Railway env vars
- [ ] BetterUptime/Checkly uptime monitors active and showing green
- [ ] `dotly.one` SSL certificate active and auto-renewing
- [ ] `/privacy` page live at `dotly.one/privacy`
- [ ] `/terms` page live at `dotly.one/terms`
- [ ] iOS App Store app approved and live (status: "Ready for Sale")
- [ ] Android Google Play app approved and live in production track
- [ ] Load test p95 < 200ms threshold passed (S1 results in `docs/LOAD_TEST_RESULTS.md`)
- [ ] Backup restoration drill completed and documented in `docs/DR_RUNBOOK.md`
- [ ] All runbooks written and reviewed by at least one other engineer

**Acceptance Criteria:**

- [ ] `https://dotly.one` loads the Next.js web app with valid SSL — no certificate warnings
- [ ] `https://api.dotly.one/health` returns `200 { "status": "ok" }` with valid SSL
- [ ] `https://dotly.one/card/test-user` renders the seeded test card (end-to-end SSR working)
- [ ] CI pipeline on a clean `main` merge triggers staging deploy automatically and waits for
      manual approval before promoting to production
- [ ] A failed production deploy can be rolled back to the previous version within 5 minutes
      using the one-click rollback in Railway/Vercel
- [ ] `prisma migrate deploy` runs successfully as the Railway release command with no errors
- [ ] All pre-launch checklist items above are checked

---

## Phase 5 — Definition of Done

The phase — and the entire Dotly.one build — is complete when all of the following are true:

- [ ] All 8 tasks (T31–T38) have every acceptance criterion checked
- [ ] AI Contact Enrichment is live: `POST /contacts/:id/enrich` returns enriched fields
      with confidence scores; rate limits enforced per plan
- [ ] Business Card Scanner is live in the iOS and Android apps: camera → OCR → review →
      save flow works end-to-end without crashing
- [ ] Push notifications are delivered within 10 seconds of a triggering event on both iOS
      and Android; per-type preferences are respected
- [ ] iOS app is approved and live in the App Store (status: "Ready for Sale")
- [ ] Android app is approved and live in Google Play production track
- [ ] Sentry is capturing errors with symbolicated stack traces across API, web, and mobile
- [ ] PostHog is recording all 8 instrumented events; `identify()` fires on sign-in with plan
      and `createdAt` properties
- [ ] BetterUptime/Checkly monitors are green for all 3 endpoints across 3 regions
- [ ] Structured JSON logging is active in production; logs are visible in Logtail/Datadog
- [ ] All Helmet security headers present on API responses; CORS allowlist is enforced
- [ ] AuditLog table is populated for all critical actions; no PII in raw log output
- [ ] `GET /users/me/export` and `DELETE /users/me` are functional and tested
- [ ] GDPR cookie consent banner is live on dotly.one
- [ ] Smart contract is deployed, verified on-chain (Polygon or Base mainnet), and externally
      audited; no private keys in any env file
- [ ] All three load test scenarios pass their p95/error-rate thresholds on staging
- [ ] `docs/DR_RUNBOOK.md` contains runbooks for all 4 failure modes; PITR and backup restore
      drills are documented
- [ ] Zero-downtime failover test passed with < 0.5% error rate during Railway redeploy
- [ ] CI/CD pipeline has manual approval gate for production; one-click rollback is confirmed
      working
- [ ] All pre-launch checklist items in T38 are checked
- [ ] `dotly.one` is live with valid SSL; `api.dotly.one` is live with valid SSL;
      `dotly.one/card/test-user` renders correctly in production

---

## Dependencies & Blockers

| Dependency                                                      | Owner     | Needed by                                                    |
| --------------------------------------------------------------- | --------- | ------------------------------------------------------------ |
| Apple Developer Program account (active, paid)                  | Team lead | T34 — iOS submission, EAS credentials                        |
| Google Play Console account (one-time $25 fee paid)             | Team lead | T34 — Android submission                                     |
| OpenAI API key (GPT-4o access, billing enabled)                 | Team lead | T31 — AI enrichment                                          |
| Google Cloud Vision API key (billing enabled, quota sufficient) | Team lead | T32 — card scanner OCR                                       |
| AWS account with Textract enabled (fallback)                    | Team lead | T32 — OCR fallback                                           |
| Smart contract auditor engaged and audit timeline confirmed     | Team lead | T36, T38 — security gate + launch checklist                  |
| Mailgun account with `dotly.one` domain verified (DKIM + SPF)   | Team lead | T36 (account deletion email), T38 (launch checklist)         |
| Cloudflare R2 bucket created with CORS configured               | Dev       | T32 (scan uploads), T36 (export ZIP), T38 (launch checklist) |
| Vercel API token (for CI deploy job)                            | Dev       | T38 — CI/CD deployment                                       |
| Railway API token (for CI deploy job)                           | Dev       | T38 — CI/CD deployment                                       |

---

## Final Note

Upon completion of Phase 5, Dotly.one is a production-ready, Google & Apple grade platform.
Smart contract billing is live on-chain. All mobile apps are approved and published. Security
hardening is complete, observability is fully instrumented, disaster recovery is tested. The
platform is ready for growth.

---

_Phase 5 of 5 — Dotly.one / Prev: Phase 4 — Polish & Scale | This is the final phase._
