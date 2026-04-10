# Event Radar V01 - 001 - P01 - 01A - Event Foundation

## Objective

Establish the base domain model and product behavior for Event Radar so Dotly can support event-scoped networking and lead capture without yet introducing registration, passes, or check-in operations.

This sprint creates the foundation for all later Event Radar work by defining:

- what an event is
- who owns and manages an event
- which event types are supported
- how event defaults influence exchange behavior
- how events are represented in the dashboard, APIs, analytics, and CRM context

The output of this sprint should make it possible for later sprints to attach stalls, QR codes, sharing rules, and participant flows to a stable event model.

## Problem

Dotly already supports cards, QR sharing, analytics, lead capture, and CRM workflows, but it does not yet have an event-level container that groups these interactions under a single real-world context.

Without an event foundation:

- leads captured at conferences or exhibitions are mixed into normal card traffic
- organizers cannot create event-specific experiences
- businesses cannot separate stall leads from general card leads
- analytics cannot answer which event generated a contact or exchange
- later features such as attendee registration, event passes, and check-in would have no stable parent model

The platform needs an event object that acts as the canonical parent for all event-scoped actions.

## Product Intent

Event Radar should begin as an event-scoped exchange and lead intelligence layer on top of Cards.

In V1, the system is not trying to replace ticketing or badge platforms. It is solving a narrower but valuable problem:

- create an event in Dotly
- define how that event behaves by default
- prepare that event for stall-level QR exchange and lead capture
- keep all exchanges, leads, and analytics attributable to that event

This sprint is intentionally foundational. It should avoid prematurely implementing registration, approval workflows, or pass issuance, but it must shape the data model so those can be added cleanly in later phases.

## Sprint Scope

In scope:

- event entity and lifecycle
- organizer ownership model
- event type model and default presets
- event status model
- event-level sharing policy defaults
- event metadata for analytics and CRM attribution
- organizer dashboard list and detail shell for events
- authenticated CRUD APIs for event management
- auditability and extensibility decisions for future phases

Out of scope:

- stall or booth creation
- event QR generation
- attendee scan flow
- participant directory
- attendee registration
- approval workflows
- wallet passes or event badges
- check-in or entry scanning
- session-level event nodes
- billing or plan gating changes specific to Event Radar

## Sprint Delivery Structure

Every Event Radar sprint should be executable and reviewable through the same delivery frame. This sprint follows that model and future sprint docs should retain it.

Required sections for every sprint:

- backend scope
- frontend scope
- audit scope
- fix scope
- re-audit scope
- GREEN criteria
- handoff decision: can the remaining work continue in the next sprint or not

### Sprint completion rule

The sprint is not complete just because the feature is implemented. The sprint is complete only when:

- implementation scope is finished
- audit is performed
- audit findings are fixed or explicitly deferred with justification
- re-audit confirms the remaining state is acceptable
- all GREEN criteria are met

### Carry-forward rule

If a sprint leaves behind known correctness, security, ownership, or user-flow gaps that block dependable use of the sprint outcome, the work must not be treated as ready to continue to the next sprint.

If only non-blocking polish or deliberately deferred expansion remains, the sprint may be marked as safe to continue into the next sprint.

## User Roles In This Sprint

Primary roles supported now:

- Organizer
  - creates and manages an event
  - defines event type and defaults
  - controls visibility and default exchange behavior

- Organizer team member
  - future-compatible concept only in this sprint
  - not yet fully implemented unless team ownership already exists in Dotly patterns

Roles acknowledged but not yet active in this sprint:

- Exhibitor
- Stall owner
- Attendee
- Speaker
- Staff
- Sponsor

These roles should not be hardwired into the V1 foundation implementation unless needed for future-safe enums or schema shape.

## User Stories

### Organizer stories

1. As an organizer, I want to create an event in Dotly so that all later QR exchanges and leads are grouped under one event context.

2. As an organizer, I want to classify the event by type so that Dotly can apply sensible default exchange settings for different event formats.

3. As an organizer, I want to control whether the event is private, internal, or public so that future participant and sharing workflows can inherit the right behavior.

4. As an organizer, I want to define event dates and a basic description so that the event is recognizable across dashboards, scan surfaces, and later registration flows.

5. As an organizer, I want to see all my events in one place so that I can manage them like I manage cards.

### Platform stories

1. As the platform, I need a stable parent object for event-scoped analytics, leads, exchanges, and check-ins so that future phases do not require foundational rework.

2. As the platform, I need event-level defaults to be explicit and durable rather than inferred from scan behavior so that privacy and business logic remain predictable.

3. As the platform, I need event ownership to be clear and enforceable so that only authorized users can modify event settings.

## Event Type Model

Event types in this sprint should be implemented as a controlled enum or constrained string set, not as fully dynamic user-defined categories.

Initial supported event types:

- `INDIVIDUAL_GATHERING`
- `COMPANY_GATHERING`
- `BUSINESS_MEETUP`
- `EXHIBITION`
- `CONFERENCE`

### Why presets matter

These types should not radically change the data model. They should set default behavior and help the product present the right starting configuration.

Example preset intent:

- `INDIVIDUAL_GATHERING`
  - simpler setup
  - softer exchange defaults
  - low need for stalls

- `COMPANY_GATHERING`
  - default privacy may lean internal/private
  - future participant discovery may be restricted to internal members

- `BUSINESS_MEETUP`
  - mutual networking behavior is likely common
  - suitable for attendee-to-attendee exchange later

- `EXHIBITION`
  - strongest fit for stall-level structure
  - should anticipate multiple event nodes in later sprints

- `CONFERENCE`
  - should support both organizer-level and session/stall expansion in later phases

### Product requirement

Event type selection sets defaults, but every default remains editable by the organizer.

That means:

- event type is a starting template, not a lock-in
- the event retains explicit persisted settings after creation
- changing event type later should not silently override organizer-customized settings without confirmation

## Event Status Model

The foundation should include an event lifecycle status that is simple now and expandable later.

Recommended statuses:

- `DRAFT`
- `ACTIVE`
- `COMPLETED`
- `ARCHIVED`

### Behavior

- `DRAFT`
  - event is being configured
  - not yet exposed to scan or participant-facing flows

- `ACTIVE`
  - event can be used by downstream QR and exchange features
  - later sprints may require this before QR nodes are usable

- `COMPLETED`
  - event is no longer active for live exchange by default
  - reporting remains available

- `ARCHIVED`
  - hidden from default dashboard views
  - read-only unless explicitly restored

### Important rule

This sprint should define statuses, but should avoid coupling too much behavior to them until the later QR and registration flows exist.

## Event Visibility Model

Event visibility is needed now because later participant access and directory behavior depend on it.

Recommended values:

- `PRIVATE`
- `INTERNAL`
- `PUBLIC`

### Definitions

- `PRIVATE`
  - organizer-controlled event
  - no public listing intent
  - future access by invite, direct QR, or organizer action

- `INTERNAL`
  - intended for company or team-scoped usage
  - future participant access may depend on org/team membership

- `PUBLIC`
  - externally shareable and intended for open participation

This sprint only stores and displays visibility. It does not yet enforce participant-facing access controls beyond organizer ownership.

## Event Default Exchange Policy

This sprint should define persisted event defaults that later scan flows inherit.

Recommended event-level defaults to store now:

- `defaultExchangeMode`
  - `STALL_ONLY`
  - `ORGANIZER_ONLY`
  - `EVENT_WIDE`
  - `MUTUAL_ONLY`

- `defaultBusinessMode`
  - `COLLECT_ONLY`
  - `SHARE_ONLY`
  - `COLLECT_AND_SHARE`

- `allowEventWideSharing`
  - boolean

- `allowMutualExchange`
  - boolean

- `requireExplicitFieldConsent`
  - boolean, default true

### Why these belong in foundation

These values define the behavioral contract of the event. Even before scan flows exist, they should be explicit at event creation so later QR and exchange features do not need to invent policy at runtime.

## Functional Requirements

### FR1 - Create event

Authenticated users can create a new event.

Required fields:

- name
- event type

Optional fields:

- description
- venue name
- city
- country
- starts at
- ends at
- visibility
- status
- default exchange mode
- default business mode
- boolean event policy flags

System-managed fields:

- id
- organizer user id
- created at
- updated at

Defaults if omitted:

- status: `DRAFT`
- visibility: chosen from event type preset or `PRIVATE`
- default exchange mode: chosen from event type preset
- default business mode: `COLLECT_AND_SHARE`
- allowEventWideSharing: false unless event type preset recommends true
- allowMutualExchange: true for business-networking-friendly presets, otherwise false
- requireExplicitFieldConsent: true

### FR2 - List events

Authenticated organizers can list all events they own.

List response should include enough metadata for dashboard cards:

- id
- name
- type
- status
- visibility
- starts at
- ends at
- venue name
- created at
- updated at
- lightweight counts placeholder fields if available later

The API should be designed so future counts can be included without breaking the response shape.

### FR3 - View event details

Authenticated organizers can retrieve a single event they own.

The detail response should include all persisted event settings and future-ready placeholders for:

- node counts
- participant counts
- exchange counts
- lead counts

Actual aggregate values may be omitted or null in this sprint if not yet implemented.

### FR4 - Update event

Authenticated organizers can edit event configuration fields.

Editable fields:

- name
- description
- event type
- venue fields
- starts at
- ends at
- visibility
- status
- default exchange mode
- default business mode
- policy booleans

Validation rules:

- name must not be empty after trimming
- end date cannot be before start date
- enum values must be valid
- text lengths should be capped to reasonable limits

### FR5 - Archive event

Authenticated organizers can archive an event.

This may be implemented as either:

- `status = ARCHIVED`

or

- a dedicated archive endpoint that updates status

Recommendation: use status transition, not hard delete.

### FR6 - No destructive delete in MVP foundation

The sprint should not require permanent event deletion unless the product already has strong delete patterns for similarly complex parent objects.

Reason:

- events will later own nodes, exchanges, registrations, and check-ins
- soft operational closure via status is safer than early hard delete support

If delete is added, it must be heavily constrained and should likely only be allowed when the event has no dependent records.

### FR7 - Ownership enforcement

Only the event organizer can read or modify the event in this sprint, unless a broader existing team-permission model is already available and intentionally adopted.

### FR8 - Event preset application

When an organizer selects an event type during creation, the platform applies matching default settings.

Those defaults must be persisted as real event fields, not recalculated on every read.

### FR9 - CRM and analytics attribution readiness

The event model must be structured so future event-scoped interactions can consistently attach:

- `eventId`
- `eventType`
- organizer context

This sprint does not need to backfill analytics or contacts, but must make the future attribution path straightforward.

## Backend Scope

The backend scope for this sprint is the minimum server and data foundation required to support event creation and management as a durable product surface.

### Database

- add `Event` model to Prisma schema
- add required enums:
  - `EventType`
  - `EventStatus`
  - `EventVisibility`
  - `EventExchangeMode`
  - `EventBusinessMode`
- add ownership relation from `Event.organizerUserId` to `User.id`
- add indexes for organizer list and status filtering
- add migration and ensure the migration is deterministic and reversible through normal Prisma workflows

### API module and service

- add `events` module in `apps/api`
- add authenticated controller and service
- implement:
  - `POST /events`
  - `GET /events`
  - `GET /events/:id`
  - `PATCH /events/:id`
  - `PATCH /events/:id/archive`
- apply owner authorization checks on all event reads and writes
- implement event type preset mapping in one clear service path
- persist effective defaults on create
- validate update behavior when event type changes

### DTO and validation scope

- create DTOs for create, update, and listing filters if needed
- enforce max lengths and enum correctness
- reject invalid date ranges
- normalize trimmed string fields
- ensure unset optional values do not overwrite existing data incorrectly on patch

### Backend non-functional scope

- API responses should use a stable shape that can later include counts
- avoid introducing public unauthenticated endpoints in this sprint
- reuse existing NestJS patterns already established in the repo
- ensure error responses are explicit and predictable

### Backend test scope

- unit tests for preset mapping logic
- unit tests for date validation and default application
- authorization tests for owner-only access
- controller or integration tests for create, update, list, detail, archive
- negative tests for invalid enum/date payloads

## Frontend Scope

The frontend scope for this sprint is the organizer-only management shell for Event Radar foundation.

### Web dashboard scope

- add Event Radar entry surface within the existing Cards-aligned app structure
- add event list page
- add event create flow
- add event detail/edit page
- show event type, status, visibility, date, and venue information
- show event default exchange settings in human-readable form
- show clear empty state when no events exist
- show validation messages for bad input

### UX behavior requirements

- organizers can create an event without needing stalls or QR setup yet
- event type selection should explain or preview what defaults it applies
- draft state should be clear in UI
- archive action should be explicit and not resemble deletion
- pages should not show fake metrics or fake participant data in this sprint

### Frontend technical scope

- use existing route conventions and shell/navigation patterns
- keep state and forms minimal and maintainable
- avoid introducing speculative multi-step wizard complexity if a single form page is enough
- future sections may be shown only as disabled placeholders if that helps the flow, but must be clearly marked as not yet available

### Frontend test scope

- render tests if the repo patterns support them
- E2E coverage for create event happy path is preferred if the route is implemented now
- validation behavior should be tested at least for the main required fields

## Audit Scope

Audit is mandatory for this sprint.

The audit must cover:

- ownership and authorization correctness
- enum and payload validation gaps
- date range correctness
- accidental destructive behavior
- future-compatibility of the schema and response shape
- UX clarity around draft vs active vs archived states
- route placement consistency with existing product navigation

### Audit checklist

- can a non-owner read another user's event?
- can a non-owner modify another user's event?
- can invalid enum values reach the database?
- can `endsAt` precede `startsAt`?
- can event type changes silently mutate organizer-configured settings?
- does archive behave like archive, not destructive delete?
- does the UI mislead users into thinking stalls, QR, or registration already work?
- does the schema make later event nodes and registrations harder than necessary?

## Fix Scope

Any issues found during audit that affect correctness, privacy, authorization, validation, or misleading product behavior must be fixed inside this sprint.

Must-fix categories:

- broken ownership checks
- missing validation on persisted fields
- incorrect preset persistence
- destructive archive/delete behavior
- response shapes that block future sprints unnecessarily
- frontend states that misrepresent non-existent functionality

Can-defer categories only with explicit note:

- minor copy polish
- low-impact visual polish
- non-blocking layout refinement
- additional convenience filters or sorting not required by the sprint goal

## Re-Audit Scope

After fixes are applied, re-audit is required.

The re-audit should confirm:

- original critical findings are resolved
- fixes did not introduce regression in create/list/detail/update/archive flows
- owner-only access still holds after all changes
- event type defaults remain persisted and visible correctly
- UI continues to reflect only what is actually implemented

Re-audit output should classify remaining issues as:

- blocking
- acceptable for this sprint
- intentionally deferred to next sprint

## GREEN Criteria

This sprint is GREEN only if all of the following are true:

- database migration is applied cleanly
- API endpoints for create, list, detail, update, and archive work as expected
- organizer-only authorization is verified
- preset defaults are persisted correctly from event type
- invalid payloads are rejected cleanly
- dashboard flow allows event creation and editing without broken states
- audit is completed
- must-fix findings are fixed
- re-audit confirms no blocking issues remain
- relevant tests for the implemented scope pass

If any of the above is false, the sprint is not GREEN.

## Continue Or Stop Gate

### Can this sprint continue into the next sprint?

Yes, but only if the sprint exits GREEN.

This sprint can hand off safely to `002-p01-01B-stall-and-qr-exchange.md` when:

- the event model is stable
- event ownership is correct
- event defaults are persisted reliably
- the dashboard and API surface are dependable enough to attach stalls and QR nodes next

This sprint must not hand off as ready if:

- event ownership is still shaky
- create/update behavior is unstable
- archive/delete semantics are unclear
- the schema is obviously incompatible with event nodes or exchange attribution

### What may continue in the next sprint

- stall model and event node design
- QR attachment to event or stall nodes
- scan entry routing
- node-level attribution

### What must not be pushed carelessly to the next sprint

- unresolved authorization issues
- unresolved validation holes
- broken create/edit UX
- unclear event lifecycle semantics

## Data Model

Recommended new primary model: `Event`

Suggested fields:

- `id: String`
- `organizerUserId: String`
- `name: String`
- `slug: String?`
- `description: String?`
- `type: EventType`
- `status: EventStatus`
- `visibility: EventVisibility`
- `venueName: String?`
- `city: String?`
- `country: String?`
- `startsAt: DateTime?`
- `endsAt: DateTime?`
- `defaultExchangeMode: EventExchangeMode`
- `defaultBusinessMode: EventBusinessMode`
- `allowEventWideSharing: Boolean`
- `allowMutualExchange: Boolean`
- `requireExplicitFieldConsent: Boolean`
- `createdAt: DateTime`
- `updatedAt: DateTime`

Recommended relations later, even if not added yet:

- `nodes`
- `participants`
- `exchanges`
- `registrations`
- `passes`
- `checkIns`

### Notes on `slug`

Slug is optional in V1 foundation.

Recommendation:

- store it if public event pages are likely soon
- otherwise omit until a real public route exists

Do not introduce vanity URL complexity before the product needs it.

### Index recommendations

- index on `organizerUserId`
- index on `status`
- composite index on `organizerUserId, status`
- optional index on `startsAt`

## Enum Recommendations

### `EventType`

- `INDIVIDUAL_GATHERING`
- `COMPANY_GATHERING`
- `BUSINESS_MEETUP`
- `EXHIBITION`
- `CONFERENCE`

### `EventStatus`

- `DRAFT`
- `ACTIVE`
- `COMPLETED`
- `ARCHIVED`

### `EventVisibility`

- `PRIVATE`
- `INTERNAL`
- `PUBLIC`

### `EventExchangeMode`

- `STALL_ONLY`
- `ORGANIZER_ONLY`
- `EVENT_WIDE`
- `MUTUAL_ONLY`

### `EventBusinessMode`

- `COLLECT_ONLY`
- `SHARE_ONLY`
- `COLLECT_AND_SHARE`

## API Plan

Recommended authenticated endpoints:

- `POST /events`
- `GET /events`
- `GET /events/:id`
- `PATCH /events/:id`
- `PATCH /events/:id/archive`

Optional later:

- `PATCH /events/:id/status`

### Create request example

```json
{
  "name": "Chennai Founder Expo 2026",
  "type": "EXHIBITION",
  "description": "A startup and services expo for founders, operators, and SME buyers.",
  "venueName": "Trade Centre Hall A",
  "city": "Chennai",
  "country": "India",
  "startsAt": "2026-08-12T09:00:00.000Z",
  "endsAt": "2026-08-12T18:00:00.000Z",
  "visibility": "PUBLIC"
}
```

### Create response example

```json
{
  "id": "evt_xxx",
  "organizerUserId": "usr_xxx",
  "name": "Chennai Founder Expo 2026",
  "type": "EXHIBITION",
  "status": "DRAFT",
  "visibility": "PUBLIC",
  "venueName": "Trade Centre Hall A",
  "city": "Chennai",
  "country": "India",
  "startsAt": "2026-08-12T09:00:00.000Z",
  "endsAt": "2026-08-12T18:00:00.000Z",
  "defaultExchangeMode": "STALL_ONLY",
  "defaultBusinessMode": "COLLECT_AND_SHARE",
  "allowEventWideSharing": false,
  "allowMutualExchange": false,
  "requireExplicitFieldConsent": true,
  "createdAt": "2026-04-10T10:00:00.000Z",
  "updatedAt": "2026-04-10T10:00:00.000Z"
}
```

## Validation Rules

- `name`
  - required
  - trimmed
  - max length 120 or 160

- `description`
  - optional
  - max length 2000

- `venueName`, `city`, `country`
  - optional
  - capped to avoid UI overflow and abusive payloads

- `startsAt`, `endsAt`
  - valid ISO dates if supplied
  - `endsAt >= startsAt`

- enums
  - must use known values only

- boolean flags
  - explicit booleans only

## Preset Mapping

Suggested preset table for create-time defaults:

### `INDIVIDUAL_GATHERING`

- visibility: `PRIVATE`
- defaultExchangeMode: `MUTUAL_ONLY`
- defaultBusinessMode: `COLLECT_AND_SHARE`
- allowEventWideSharing: false
- allowMutualExchange: true

### `COMPANY_GATHERING`

- visibility: `INTERNAL`
- defaultExchangeMode: `ORGANIZER_ONLY`
- defaultBusinessMode: `COLLECT_AND_SHARE`
- allowEventWideSharing: false
- allowMutualExchange: true

### `BUSINESS_MEETUP`

- visibility: `PUBLIC`
- defaultExchangeMode: `MUTUAL_ONLY`
- defaultBusinessMode: `COLLECT_AND_SHARE`
- allowEventWideSharing: true
- allowMutualExchange: true

### `EXHIBITION`

- visibility: `PUBLIC`
- defaultExchangeMode: `STALL_ONLY`
- defaultBusinessMode: `COLLECT_AND_SHARE`
- allowEventWideSharing: false
- allowMutualExchange: false

### `CONFERENCE`

- visibility: `PUBLIC`
- defaultExchangeMode: `ORGANIZER_ONLY`
- defaultBusinessMode: `COLLECT_AND_SHARE`
- allowEventWideSharing: true
- allowMutualExchange: true

These defaults are recommendations, not immutable product law. The purpose is to reduce setup friction for the organizer.

## UX Requirements

### Organizer event creation flow

Recommended first-run flow:

1. Organizer opens Event Radar from Cards context or app launcher
2. Organizer clicks `Create event`
3. Organizer enters:
   - event name
   - event type
4. Organizer optionally fills:
   - description
   - venue
   - date/time
   - visibility
5. UI shows a short summary of defaults selected by event type
6. Organizer saves event as draft
7. Organizer lands on event detail page with next-step CTAs for later sprints

### Event list page

Each event card should show:

- event name
- type badge
- status badge
- date or draft state
- venue if available
- one-line description if available

This page should avoid fake metrics in this sprint. If counts are not implemented, do not render placeholder zeros that imply real activity.

### Event detail page

Foundation shell should contain:

- event overview section
- settings summary
- dates and venue
- exchange defaults summary
- future sections visibly disabled or marked `coming next`

Examples of placeholder modules that can appear if useful:

- stalls
- QR nodes
- participant flows
- registration

But these should not pretend to be functional.

## Navigation Plan

Suggested placement:

- under `Cards` as a new sub-surface

or

- as a top-level app if product ambition is larger

Recommendation for V1 foundation:

- keep Event Radar closely associated with Cards
- make it feel like an extension of card-led networking rather than a disconnected event product

Possible routes on web:

- `/apps/cards/radar`
- `/apps/cards/radar/events`
- `/apps/cards/radar/events/:id`

Use the routing style already established by the repo rather than inventing a completely separate navigation model.

## Analytics Plan

This sprint does not require scan analytics, but it should define the attribution strategy.

Future event-scoped events should carry metadata such as:

- `eventId`
- `eventType`
- `eventNodeId`
- `surface`
- `exchangeMode`

If the analytics system already stores event metadata JSON per event type, Event Radar should reuse that approach rather than creating a separate analytics table immediately.

## CRM Impact

This sprint should define the intended downstream CRM behavior even if implementation lands later.

Future event-generated contacts should be attributable by:

- source card
- event id
- event node or stall id
- exchange mode

Recommendation:

- use metadata on existing contact timeline / lead records where possible in early versions
- avoid duplicating the CRM contact model just for Event Radar

## Audit And Security Requirements

- only authenticated owners can manage events
- event create and update actions should be auditable if audit infrastructure already exists
- validation should prevent oversized payloads and invalid enum values
- event foundation should not expose any public endpoints in this sprint
- no hidden implicit policy inference from event type at read time; all effective policy must be persisted

## Dependencies

Technical dependencies:

- authenticated user context
- Prisma schema migration support
- API module/controller/service wiring patterns
- dashboard navigation surface

Product dependencies:

- event type naming finalized
- default policy values agreed
- route placement within Cards/dashboard decided

## Non-Goals

- attendee self-service registration
- public event landing page
- QR scanning UI
- actual exchange record creation
- contact field picker UI
- stall management
- directory permissions
- check-in operations

## Acceptance Criteria

1. An authenticated user can create an event with a name and type.

2. Event type presets correctly populate persisted default fields for visibility and exchange behavior.

3. An organizer can list all events they own.

4. An organizer can view a single event and see all configured defaults.

5. An organizer can update an event's editable fields.

6. Invalid event type, visibility, status, or date combinations are rejected with validation errors.

7. Only the owning organizer can access or modify the event in this sprint.

8. Events can be archived without hard deletion.

9. The model and response shape are future-safe for later addition of stalls, registrations, exchanges, passes, and check-ins.

10. The UI provides a clear event creation and management shell without pretending later-phase features already exist.

## Risks

### Risk 1 - Over-modeling too early

If this sprint introduces too many future-only tables or relationships, it may slow V1 delivery and create fragile abstractions.

Mitigation:

- add only the core `Event` model now
- keep later relations planned but not fully implemented unless needed

### Risk 2 - Under-modeling future permissions

If event ownership is shaped too narrowly, later team-based organizer access could require migration pain.

Mitigation:

- use clear organizer ownership now
- keep schema naming neutral enough to add organizer-team access later

### Risk 3 - Preset confusion

If event type changes silently overwrite user settings, organizers may lose trust.

Mitigation:

- presets apply at create time
- later type changes require explicit confirmation if defaults will be re-applied

### Risk 4 - Route fragmentation

If Event Radar is placed too far away from Cards, the feature may feel disconnected from Dotly's core story.

Mitigation:

- keep Event Radar within the Cards ecosystem at first

## Open Questions

1. Should Event Radar remain nested under Cards long-term, or graduate into its own app once registration and passes arrive?

2. Should `CONFERENCE` and `EXHIBITION` remain separate types in V1, or can one be deferred until usage justifies both?

3. Do we need team ownership for events in V1 foundation, or is user ownership enough until organizer collaboration becomes real?

4. Should event slug/public URLs be introduced now for future public event pages, or deferred until registration/public discovery exists?

5. Should archived events remain editable, or become effectively read-only outside status restoration?

## Recommended Implementation Notes

- Prefer a minimal `Event` model over multiple speculative tables.
- Persist effective defaults on the event row instead of recalculating from type.
- Reuse existing patterns from Cards, Contacts, Analytics, and Wallet Passes where possible.
- Keep naming generic enough that event nodes, registrations, and check-ins can attach cleanly in later phases.
- Avoid public-facing flows in this sprint; keep the surface organizer-only.

## Definition Of Done

This sprint is complete when:

- event schema exists and is migrated
- authenticated CRUD APIs exist for organizer-owned events
- event type presets are implemented and persisted
- dashboard screens for listing and editing events exist in a foundation form
- validation, ownership checks, and archive behavior are in place
- documentation clearly describes how this event foundation supports later QR, registration, and pass workflows

## Sprint Closeout Message

At sprint close, the owning engineer or reviewer should record one of these explicit outcomes:

- `GREEN - Continue`
  - sprint passed implementation, audit, fix, and re-audit
  - next sprint may start on top of this foundation

- `GREEN - Continue With Noted Deferrals`
  - sprint is safe to build on
  - only non-blocking deferred items remain and are documented

- `NOT GREEN - Do Not Continue`
  - blocking issues remain
  - next sprint must not treat this foundation as stable

Recommended closeout message format:

```md
Status: GREEN - Continue

Why:

- Event model and CRUD flows are stable
- Ownership and validation were audited and re-audited
- No blocking issues remain for stall and QR work

Deferred:

- Optional event slug support
- Non-blocking list filters
```
