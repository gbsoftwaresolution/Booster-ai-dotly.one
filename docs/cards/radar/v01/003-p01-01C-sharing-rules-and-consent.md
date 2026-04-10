# Event Radar V01 - 003 - P01 - 01C - Sharing Rules And Consent

## Objective

Define and implement the consent and exchange behavior that happens after a visitor scans an Event Radar node QR.

This sprint converts Event Radar from a node-routing system into a real contact-sharing product by adding:

- share scope selection
- field-level sharing consent
- business participation modes
- mutual-only exchange behavior
- consent recording
- exchange creation rules
- exchange-ready public flow after scan

At the end of this sprint, a visitor should be able to scan an event or stall QR, understand what will happen, choose what to share, choose who can receive it, and complete a controlled exchange that Dotly can later surface in CRM and event dashboards.

## Problem

After Sprint 002, Dotly can identify which event node was scanned, but it still does not know:

- whether the visitor wants to share details
- which fields the visitor wants to share
- whether the visitor wants to share only with the stall or more broadly with the event
- whether the business wants one-way collection or mutual exchange
- what legal and product-safe record proves the exchange was consented to

Without explicit sharing rules and consent:

- event QR scans are only page visits, not usable exchanges
- businesses may over-collect information
- visitors may not understand who receives their data
- organizer/stall/event-wide visibility becomes ambiguous
- CRM and reporting cannot trust exchange records as intentional user actions

This sprint creates the policy and execution layer that makes Event Radar a real exchange system instead of only a QR routing system.

## Product Intent

This sprint should make Event Radar feel controlled, explicit, and privacy-aware.

The core user promise is:

- you know what you scanned
- you know who will receive your information
- you choose what you share
- you choose the scope of that sharing
- the system respects the node and event defaults without hiding them

The core business promise is:

- stall and event operators can configure whether they collect only, share only, or do both
- exchanges are structured and attributable
- later dashboards and CRM logic can trust the exchange records

## Sprint Scope

In scope:

- exchange mode model
- share scope model
- field-level consent selection
- node and event default inheritance
- business participation modes
- consent capture and persistence
- exchange record creation
- public scan flow for consent and confirmation
- event/node-aware exchange metadata
- handoff shape for CRM and dashboard reporting

Out of scope:

- event registration
- participant directory
- event-wide participant discovery UI
- pass issuance
- check-in workflows
- advanced attendee profile editing
- large-scale anti-spam systems beyond basic guardrails
- organizer approval workflows for exchanges

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

If a sprint leaves behind known consent, privacy, correctness, or routing gaps that block dependable use of the sprint outcome, the work must not be treated as ready to continue to the next sprint.

If only non-blocking polish or deliberately deferred expansion remains, the sprint may be marked as safe to continue into the next sprint.

## User Roles In This Sprint

Primary active roles:

- Organizer
  - defines event-level sharing defaults
  - controls whether the event allows broader sharing modes

- Stall operator or business
  - operates a node linked to a business card
  - may restrict whether their node collects only, shares only, or allows both

- Visitor or scanner
  - scans an event node QR
  - sees the sharing options
  - chooses fields and recipients
  - confirms consent

Roles not yet fully active:

- Registered attendee
- Speaker
- Staff
- Sponsor

## User Stories

### Visitor stories

1. As a visitor, I want to know whether I am sharing my details with only this stall, the organizer, or more broadly with the event.

2. As a visitor, I want to choose exactly which details I share so I do not expose more information than I intended.

3. As a visitor, I want mutual exchange to be explicit so I know whether I will receive contact details back.

4. As a visitor, I want a clear success state after exchange so I know what happened.

### Organizer and business stories

1. As an organizer, I want event-level defaults so the event behaves consistently unless a node overrides it.

2. As a stall operator, I want to control whether my booth only collects leads, shares a card, or supports mutual exchange.

3. As an organizer or business user, I want each exchange to be attributable to the event and node that caused it.

### Platform stories

1. As the platform, I need consent and field selection to be persisted so reporting and CRM are built on intentional actions.

2. As the platform, I need scope rules to be explicit so later attendee directory or event-wide exchange features can safely build on them.

## Consent And Sharing Model

This sprint introduces the real exchange model.

An exchange is not just a page visit. It is a persisted user-authorized action that records:

- who initiated the exchange or anonymous public participant context if not signed in
- which event was involved
- which node was involved
- what fields were shared
- what scope was granted
- whether the exchange was one-way or mutual
- what business mode applied

## Exchange Scope Model

Recommended scope values:

- `STALL_ONLY`
- `ORGANIZER_ONLY`
- `EVENT_WIDE`
- `MUTUAL_ONLY`

### Meaning

`STALL_ONLY`

- visitor shares only with the scanned stall or node owner context
- other participants do not get access

`ORGANIZER_ONLY`

- visitor shares with the organizer context only
- useful for main event networking intake or organizer-managed collection

`EVENT_WIDE`

- visitor allows their selected fields to be visible to event participants who are authorized by later phases
- this sprint may record the permission even if a full directory UI does not yet exist

`MUTUAL_ONLY`

- visitor only participates where the exchange is reciprocal
- if the business mode or node does not support reciprocity, the flow must explain this clearly

## Business Mode Model

Recommended business mode values:

- `COLLECT_ONLY`
- `SHARE_ONLY`
- `COLLECT_AND_SHARE`

### Meaning

`COLLECT_ONLY`

- business or node collects visitor information
- visitor does not automatically receive business contact details through the exchange workflow
- a public card preview may still be visible if product chooses, but this is not treated as mutual exchange

`SHARE_ONLY`

- node shares business identity or card
- visitor is not asked to submit their own details through the exchange flow
- useful for informational nodes or sponsor visibility

`COLLECT_AND_SHARE`

- visitor can share selected fields and receive the node/business contact identity where applicable

Recommendation for V1:

- support all three modes
- expose them clearly in organizer and node settings

## Field Consent Model

The visitor must be able to choose which fields are shared.

Recommended selectable fields:

- `name`
- `email`
- `phone`
- `company`
- `title`
- `website`
- `notes`
- `card_link`

Recommendation for V1:

- support at least `name`, `email`, `phone`, `company`, and `title`
- other fields can be enabled if the existing card/profile model already makes them easy

### Rules

- field consent must be explicit
- preselected fields are allowed only if clearly shown and editable
- at least one field must be selected before a share action completes if the mode requires user data submission
- hidden sharing of extra fields is not allowed

## Default Inheritance Model

The exchange flow should resolve behavior in this order:

1. node-specific override if defined
2. event-level default from Sprint 001
3. product safe fallback

This applies to:

- default scope
- business mode
- whether event-wide sharing is allowed
- whether mutual exchange is allowed
- whether field consent is required

### Important rule

Defaults shape the starting UX, but the actual visitor choice is what is persisted as the final consented behavior.

## Functional Requirements

### FR1 - Resolve effective exchange configuration

When a visitor reaches a node route, the system resolves the effective exchange behavior using event defaults and node overrides.

The resolved config must include:

- event id
- event node id
- node type
- assigned card summary if present
- allowed scopes
- default scope
- effective business mode
- allowed fields
- whether mutual exchange is available

### FR2 - Render consent form

The public flow must show a consent screen after node resolution.

The consent screen should clearly explain:

- what entity is receiving the information
- what the current node represents
- whether exchange is one-way or mutual
- which fields are available to share
- what scope options are available

### FR3 - Allow scope selection

If more than one scope is allowed, the visitor can choose their preferred scope.

If only one scope is allowed, the UI should show it clearly as fixed for this flow.

### FR4 - Allow field-level selection

The visitor can choose the fields they want to share.

Validation:

- at least one field selected if the flow requires visitor share input
- values must pass reasonable validation before submission
- fields not selected must not be persisted as shared fields

### FR5 - Support collect-only nodes

If the effective business mode is `COLLECT_ONLY`, the flow should:

- explain that the visitor is sharing details with the stall or organizer
- avoid implying they will automatically receive mutual exchange back
- still allow scope and field choices if applicable

### FR6 - Support share-only nodes

If the effective business mode is `SHARE_ONLY`, the flow should:

- surface the assigned card or business identity
- not require visitor data submission
- still record analytics for interaction if desired
- not create a visitor exchange record that falsely implies contact sharing happened

### FR7 - Support collect-and-share nodes

If the effective business mode is `COLLECT_AND_SHARE`, the flow should:

- allow visitor share submission
- show reciprocal business identity or next-step access where appropriate
- persist the exchange as bidirectional only if the behavior is actually reciprocal

### FR8 - Persist exchange record

A successful consent flow should create an exchange record that includes:

- event id
- node id
- assigned card id if present
- selected scope
- effective business mode
- selected shared fields
- submitted values or linked participant reference
- consent timestamp
- whether exchange was one-way or mutual

### FR9 - Persist consent proof

Consent persistence must be explicit enough that later audit and support investigation can answer:

- what the user agreed to
- when they agreed
- which node and event it applied to

### FR10 - Confirmation screen

After successful exchange, the visitor should see a truthful confirmation screen.

The success screen should say:

- whether details were shared
- with whom they were shared
- whether mutual exchange occurred
- any follow-up action available now

### FR11 - Anti-confusion guardrails

The flow must not imply `share with all participants` means immediate access to a full directory unless that feature exists.

If event-wide sharing is recorded but participant directory is not yet live, the message must reflect that honestly.

### FR12 - Attribution readiness for CRM and dashboard

The exchange record must be designed so later dashboards and CRM can group by:

- event
- node
- node type
- business mode
- selected scope
- card

## Backend Scope

The backend scope for this sprint is the policy resolution and exchange persistence layer.

### Database

Recommended new model: `Exchange`

Suggested fields:

- `id: String`
- `eventId: String`
- `eventNodeId: String`
- `assignedCardId: String?`
- `scope: ExchangeScope`
- `businessMode: EventBusinessMode`
- `direction: ExchangeDirection`
- `sharedFields: Json`
- `sharedData: Json`
- `participantUserId: String?`
- `participantSessionId: String?`
- `consentedAt: DateTime`
- `createdAt: DateTime`

Recommended enum:

- `ExchangeDirection`
  - `INBOUND_ONLY`
  - `OUTBOUND_ONLY`
  - `BIDIRECTIONAL`

Recommendation:

- use JSON for selected fields and submitted values in V1
- avoid prematurely normalizing every field into a separate table unless clearly required

### Node configuration support

If node-level overrides are needed, extend `EventNode` with optional override fields such as:

- `overrideExchangeMode`
- `overrideBusinessMode`
- `allowEventWideSharing`
- `allowMutualExchange`

Only add what is truly needed for V1 behavior.

### API module and service

Recommended endpoints:

- `GET /public/events/nodes/:nodeId/exchange-config`
- `POST /public/events/nodes/:nodeId/exchanges`

Organizer-side support endpoints if useful:

- `PATCH /events/:eventId/nodes/:nodeId/settings`

### Service responsibilities

- resolve effective exchange configuration from event plus node
- validate allowed scopes against event and node capabilities
- validate business mode and mutual logic
- validate selected fields and submitted values
- persist consent and exchange records
- avoid creating false mutual exchange records when the node is collect-only
- expose exchange payloads that downstream dashboards can later consume

### Backend validation scope

- selected scope must be one of the allowed scopes for that node flow
- selected fields must be from an allowed field set
- required values must be present for selected fields
- empty submissions are invalid for data-sharing flows
- mutual-only cannot succeed on a node that disallows mutual exchange
- event-wide cannot succeed when event-wide sharing is disabled

### Backend test scope

- config resolution tests
- scope validation tests
- business-mode behavior tests
- mutual-only behavior tests
- field-selection validation tests
- exchange creation happy path and negative tests
- proof that share-only mode does not create false inbound lead records

## Frontend Scope

The frontend scope for this sprint is the public exchange flow that appears after a node QR scan.

### Public flow structure

Recommended screens:

1. node context intro
2. consent and sharing options
3. confirmation

The public flow can be one page with steps or multiple pages, but it must remain simple and honest.

### Consent screen requirements

The consent screen should show:

- event name
- node name
- business or card identity if assigned
- explanation of what happens on submit
- scope options
- field checkboxes or toggles
- field inputs for selected values if not already known
- submit button

### UX requirements

- copy must clearly distinguish `share`, `receive`, and `mutual`
- if only stall-only sharing is allowed, event-wide options must not be shown
- if the node is share-only, the flow should not present a misleading data-entry form
- if the node is collect-only, the flow should not imply the visitor is receiving a reciprocal exchange

### Success state requirements

The success state should clearly say one of the following kinds of outcomes:

- `Your details were shared with this stall`
- `Your details were shared with the event organizer`
- `You joined event-wide sharing`
- `You received this business contact`
- `Mutual exchange completed`

Use the exact truth of the flow, not generic success copy.

### Organizer settings UI

This sprint may need a small organizer-facing settings surface for node-level overrides.

Recommended controls:

- business mode selector
- allowed scope options
- allow event-wide toggle
- allow mutual toggle

Keep this minimal. Do not build a large policy builder UI unless necessary.

### Frontend test scope

- collect-only flow
- share-only flow
- collect-and-share flow
- mutual-only validation
- field selection validation
- success messaging correctness
- honest rendering when event-wide sharing is recorded but not yet surfaced as directory access

## Public Flow Logic

Recommended high-level flow:

1. visitor lands on node route
2. app fetches effective exchange config
3. app renders consent screen
4. visitor selects scope
5. visitor selects fields
6. visitor enters selected values
7. app submits exchange request
8. backend validates and persists exchange
9. app renders truthful success state

## CRM Impact

This sprint should prepare exchange records to become CRM inputs in the next sprint.

Recommended V1 rule:

- not every exchange must immediately create a full CRM contact if the product wants an explicit handoff step later

But if contact creation is already desired now, it must carry:

- source event id
- source node id
- selected scope
- business mode
- consent timestamp

Recommendation for V1:

- persist exchange first
- let Sprint 004 decide how event and stall dashboards convert or display that exchange as lead intelligence

## Analytics Plan

This sprint should record exchange-related interactions in a way that supports later reporting.

Recommended analytics metadata on public flow interactions:

- `eventId`
- `eventNodeId`
- `eventNodeType`
- `assignedCardId`
- `selectedScope`
- `businessMode`
- `surface: event_radar_exchange`
- `action`

Recommended tracked actions:

- config_loaded
- scope_selected
- field_selected
- exchange_submitted
- exchange_completed

## Privacy And Trust Requirements

- user must know who receives their information
- hidden default sharing beyond visible choices is not allowed
- event-wide sharing must not over-promise access to others if directory is not implemented yet
- mutual exchange must only be claimed when actual reciprocal behavior exists
- visitor-facing copy should prefer clarity over marketing language

## Audit Scope

Audit is mandatory for this sprint.

The audit must cover:

- whether effective config resolution matches event and node settings
- whether disallowed scopes can still be submitted
- whether hidden fields are being persisted incorrectly
- whether collect-only, share-only, and mutual flows are truthful
- whether exchange records accurately represent what happened
- whether event-wide sharing is being overstated before participant-directory features exist

### Audit checklist

- can a user submit `EVENT_WIDE` when the event disables it?
- can a user submit `MUTUAL_ONLY` on a non-mutual node?
- can unselected fields still be stored as shared?
- can the UI imply reciprocal sharing when the business mode is collect-only?
- can share-only mode incorrectly create a lead-like exchange record?
- does the success message match the actual persisted exchange direction?
- is consent timestamp and selected scope persisted reliably?

## Fix Scope

Any issues found during audit that affect privacy, consent truthfulness, field handling, or exchange correctness must be fixed inside this sprint.

Must-fix categories:

- invalid scopes accepted by backend
- hidden or unselected field persistence
- false mutual exchange claims
- false lead/exchange creation in share-only mode
- misleading success messaging
- incorrect config inheritance from event and node

Can-defer categories only with explicit note:

- copy polish that does not change legal or behavioral meaning
- visual refinement of the consent form
- minor layout improvements
- non-blocking analytics instrumentation polish

## Re-Audit Scope

After fixes are applied, re-audit is required.

The re-audit should confirm:

- collect-only flow remains correct
- share-only flow remains correct
- collect-and-share flow remains correct
- mutual-only restrictions hold
- consent persistence matches submitted choices
- success messaging remains truthful after fixes

Re-audit output should classify remaining issues as:

- blocking
- acceptable for this sprint
- intentionally deferred to next sprint

## GREEN Criteria

This sprint is GREEN only if all of the following are true:

- effective exchange config resolves correctly from event and node settings
- public consent flow supports allowed scopes and field selection
- backend rejects invalid scope or field combinations
- collect-only, share-only, and collect-and-share behaviors are all truthful
- mutual-only logic works correctly when enabled
- successful exchanges are persisted with consent details and attribution
- UI success states match the actual exchange outcome
- audit is completed
- must-fix findings are fixed
- re-audit confirms no blocking issues remain
- relevant tests for exchange resolution, validation, and persistence pass

If any of the above is false, the sprint is not GREEN.

## Continue Or Stop Gate

### Can this sprint continue into the next sprint?

Yes, but only if the sprint exits GREEN.

This sprint can hand off safely to `004-p01-01D-leads-dashboard-and-export.md` when:

- exchanges are persisted reliably
- consent data is trustworthy
- scopes and business modes are accurately recorded
- dashboards can safely report on exchange outcomes without misleading users

This sprint must not hand off as ready if:

- exchange records do not reliably reflect consented behavior
- success messages and persisted direction can disagree
- share-only and collect-only semantics are still confused
- event-wide sharing is overstated beyond implemented functionality

### What may continue in the next sprint

- event and stall exchange dashboards
- lead and exchange export
- CRM handoff logic
- recent activity views grouped by node and event

### What must not be pushed carelessly to the next sprint

- unresolved privacy and consent gaps
- broken field-level persistence
- false mutual exchange semantics
- misleading public flow messaging

## Dependencies

Technical dependencies:

- Sprint 001 event foundation
- Sprint 002 event node and QR routing
- public route and API support for node resolution

Product dependencies:

- agreement on supported V1 scopes
- agreement on supported V1 field set
- agreement that event-wide sharing may be recorded before full participant directory exists

## Non-Goals

- attendee registration status
- participant directory UI
- entry passes
- check-in scanning
- advanced role-based participant visibility

## Risks

### Risk 1 - Over-promising event-wide sharing

If the product says `share with all participants` before a participant-access surface exists, users may misunderstand what they are getting.

Mitigation:

- record the consent now, message it honestly, and avoid promising directory access that does not yet exist

### Risk 2 - Modeling consent too loosely

If consent is stored only as a vague success flag, later support and compliance questions become hard to answer.

Mitigation:

- persist selected scope, selected fields, direction, and consent timestamp explicitly

### Risk 3 - Treating all exchanges as leads

Some flows are informational or share-only and should not automatically inflate lead metrics.

Mitigation:

- distinguish exchange direction and business mode in persistence and later reporting

### Risk 4 - UX ambiguity

If the consent screen uses fuzzy language, visitors may not understand what happens.

Mitigation:

- use explicit labels and truthful success states

## Open Questions

1. Should V1 allow event-wide sharing selection even before a participant directory exists, or should that option be deferred entirely until V2?

2. Should signed-in Dotly users be able to prefill fields from their card, or should V1 always require manual input for clarity?

3. Should `card_link` be part of the initial field set, or can it wait until registration and participant identity arrive?

4. Should exchange submission create CRM contacts immediately, or should Sprint 004 decide the CRM handoff behavior based on reporting needs?

## Recommended Implementation Notes

- Keep the V1 exchange model explicit rather than clever.
- Persist what the visitor chose, not just what the node default was.
- Separate business mode from exchange direction.
- Do not equate event-wide permission with immediate feature completeness.
- Optimize for truthful product behavior over aggressive networking growth mechanics.

## Acceptance Criteria

1. A visitor scanning an event node QR can see a consent flow that explains what entity they are interacting with.

2. The flow supports valid scope selection according to node and event settings.

3. The flow supports explicit field-level sharing selection.

4. Backend validation rejects invalid scope, field, or mutual combinations.

5. Successful submissions persist an exchange record with consent details.

6. Collect-only, share-only, and collect-and-share behaviors are represented truthfully.

7. Success messaging matches the actual exchange outcome.

8. The resulting data is dependable enough for event and stall dashboards in the next sprint.

## Definition Of Done

This sprint is complete when:

- exchange policy resolution exists
- public consent flow exists
- exchange persistence exists
- field and scope validation are enforced
- truthful confirmation states are implemented
- audit, fix, and re-audit are completed
- documentation clearly explains how dashboard and export work can build on these exchange records next

## Sprint Closeout Message

At sprint close, the owning engineer or reviewer should record one of these explicit outcomes:

- `GREEN - Continue`
  - sprint passed implementation, audit, fix, and re-audit
  - next sprint may start on top of trustworthy exchange data

- `GREEN - Continue With Noted Deferrals`
  - sprint is safe to build on
  - only non-blocking deferred items remain and are documented

- `NOT GREEN - Do Not Continue`
  - blocking issues remain
  - next sprint must not treat exchange records as reliable for dashboard or export use

Recommended closeout message format:

```md
Status: GREEN - Continue

Why:

- Consent and scope logic are enforced correctly
- Exchange records persist truthful business mode and direction
- Dashboard work can safely build on top of the exchange dataset

Deferred:

- Optional signed-in prefill from Dotly profile
- Optional richer success-state personalization
```
