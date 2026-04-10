# Event Radar V01 - 008 - P03 - 03A - Event Pass And Wallet Foundation

## Objective

Introduce the event pass model and wallet foundation so approved participants can receive a durable event credential that later supports entry, stall, and operational scan flows.

This sprint adds:

- event pass model
- pass issuance rules
- pass types by event role
- wallet readiness and pass delivery foundation
- pass identity separate from registration and exchange
- organizer visibility into pass issuance state

At the end of this sprint, Event Radar should support the idea that an approved participant can hold a verifiable event credential in Dotly, even before live entry and check-in scanning are implemented.

## Problem

After Phase 2, Event Radar has:

- event registration
- participant identity
- participant directory
- organizer and exhibitor operations

But it still lacks a durable event credential.

Without event passes:

- approved participants have no canonical event-day identity artifact
- organizer cannot distinguish registration approval from credential issuance
- staff and exhibitor operational permissions cannot be tied to a scannable event-day object
- later entry scanning and check-in would have to invent a pass model under time pressure
- Dotly cannot evolve from event networking into event identity

The platform needs a pass layer that answers:

- who has been issued a credential
- what kind of credential it is
- which event and participant it belongs to
- whether it is active, revoked, or pending
- whether it is ready to be delivered into Apple Wallet, Google Wallet, or Dotly-native pass surfaces

## Product Intent

This sprint should make Event Radar feel like it is becoming a full event identity system.

The product promise is:

- approved participants can receive an event pass
- different event roles can map to different pass types
- passes are durable and revocable
- pass issuance is operationally visible to organizers
- the system is ready for Phase 3 scanning and check-in

This sprint is not trying to complete entry scanning. It is creating the pass contract and issuance layer first.

## Sprint Scope

In scope:

- event pass model
- pass type model
- pass issuance state machine
- role-aware pass issuance rules
- organizer pass management view
- participant pass view
- wallet foundation and delivery metadata
- pass revocation or invalidation foundation
- pass-ready identifiers for future scanning

Out of scope:

- live entry scan validation UI
- check-in counters
- stall check-in scans
- session check-in
- physical badge printing workflows
- ticket payment logic
- seat assignment logic

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

If a sprint leaves behind known pass identity, issuance, revocation, or authorization gaps that block dependable use of the sprint outcome, the work must not be treated as ready to continue to the next sprint.

If only non-blocking polish or deliberately deferred expansion remains, the sprint may be marked as safe to continue into the next sprint.

## Core Design Principle

This sprint must preserve separation among:

- registration approval
- participant identity
- event pass issuance
- event-day scan state

These are related, but not interchangeable.

Examples:

- a participant can be approved but not yet issued a pass
- a pass can be revoked while the participant remains approved in registration
- a participant can have a role that maps to a special pass type
- future check-in status must not be stored directly on the registration object as a shortcut if it really belongs to pass or scan history

## User Roles In This Sprint

Primary active roles:

- Organizer
  - controls pass issuance rules
  - views pass issuance status for participants
  - revokes or reissues passes if needed

- Approved participant
  - receives and views their event pass
  - uses the pass later for event-day flows

- Staff, exhibitor, speaker, sponsor
  - may receive role-specific pass types

## User Stories

### Organizer stories

1. As an organizer, I want approved participants to receive passes so event identity is explicit before event day.

2. As an organizer, I want to issue different pass types for attendees, staff, exhibitors, or speakers so access rules can evolve later.

3. As an organizer, I want to revoke or reissue a pass if needed so event credentials remain controllable.

4. As an organizer, I want visibility into which participants have or do not have passes issued.

### Participant stories

1. As an approved participant, I want to receive an event pass so I have a clear event credential.

2. As an approved participant, I want the pass to reflect my role clearly.

3. As an approved participant, I want to access the pass inside Dotly and later through supported wallet surfaces.

### Platform stories

1. As the platform, I need a durable pass identifier that future scans can validate.

2. As the platform, I need pass state to be independent from registration state so revocation and reissuance are safe.

## Pass Model

This sprint introduces an `EventPass` concept.

An event pass represents an issued event credential for one approved participant in one event.

The pass should answer:

- which event it belongs to
- which participant registration it belongs to
- what pass type it is
- whether it is active
- whether it has wallet metadata attached

Recommendation:

- one active pass per registration in V1 foundation
- if reissue occurs, either rotate the credential or mark prior pass invalid and create a new current pass

## Pass Type Model

Recommended pass types:

- `ATTENDEE`
- `EXHIBITOR`
- `STAFF`
- `SPEAKER`
- `SPONSOR`
- `VIP`

Recommendation:

- map these from participant role by default
- allow organizer override if needed later

This sprint does not need full access policy semantics for each pass type yet, but it must store the type explicitly.

## Pass Status Model

Recommended pass statuses:

- `PENDING_ISSUANCE`
- `ISSUED`
- `REVOKED`
- `EXPIRED`

Optional future-safe value:

- `REISSUED`

Recommendation:

- keep `REISSUED` as an operational event rather than a current status if possible
- current pass row can simply be active or revoked while a newer pass becomes issued

### Meaning

`PENDING_ISSUANCE`

- participant is eligible but pass has not been fully generated yet

`ISSUED`

- pass exists and is usable for future event-day validation

`REVOKED`

- pass is no longer valid for event-day usage

`EXPIRED`

- pass is no longer valid because the event is over or policy expired it

## Pass Issuance Rules

Recommended V3 foundation rules:

- only approved registrations are eligible
- each approved participant can have one current active pass
- pass type defaults from participant role
- organizer can issue or reissue pass
- organizer can revoke pass

Optional automation:

- auto-issue on approval

Recommendation:

- support either manual or automatic issuance, but make the chosen behavior explicit in event settings

## Wallet Foundation Model

This sprint should define the wallet delivery foundation without overcommitting to full wallet UX.

The pass model should support:

- Dotly-native pass view
- Apple Wallet metadata readiness
- Google Wallet metadata readiness
- stable barcode or QR payload identity

Important rule:

- wallet representation is a delivery format
- `EventPass` is the product object

Do not let wallet vendor requirements become the primary domain model.

## Functional Requirements

### FR1 - Event pass settings

An organizer can configure whether the event uses passes and whether issuance is manual or automatic.

Recommended settings:

- passes enabled
- issuance mode
  - `MANUAL`
  - `AUTO_ON_APPROVAL`
- pass expiration behavior optional

### FR2 - Pass issuance eligibility

Only eligible approved participants can receive a pass.

Ineligible cases:

- registration not approved
- registration cancelled or rejected
- pass system disabled for event

### FR3 - Create pass

Organizer or automatic flow can issue a pass for an eligible participant.

The pass must store:

- event id
- registration id
- pass type
- current status
- stable pass identifier
- issuance timestamp

### FR4 - View pass status in organizer UI

Organizer can see pass status for participants.

Recommended list values:

- no pass
- pending issuance
- issued
- revoked

### FR5 - Participant pass view

Approved participant with an issued pass can view their event pass.

The pass view should show:

- event name
- participant name
- pass type
- pass state
- pass code or visual token placeholder for future scan validation

### FR6 - Wallet metadata readiness

The system should generate and store enough metadata for future Apple/Google wallet rendering or delivery.

This can be partial in V3A, but the shape must be correct.

### FR7 - Revoke pass

Organizer can revoke an issued pass.

Rules:

- revoked pass must become invalid for later check-in flows
- participant registration may remain approved independently

### FR8 - Reissue pass

Organizer can reissue a pass if needed.

Recommendation:

- invalidate old pass identity and replace with a new active pass identifier
- preserve historical traceability

### FR9 - Pass type mapping

The system should derive a default pass type from participant role.

Examples:

- attendee -> attendee pass
- exhibitor -> exhibitor pass
- staff -> staff pass

If override is supported in V3A, it must be explicit.

### FR10 - Pass identity ready for scanning

Each issued pass must have a stable machine-readable identifier that future scan endpoints can validate.

This should not depend on mutable display fields.

### FR11 - Event and pass lifecycle independence

Pass status transitions must be valid even if registration state later changes, but the rules must remain sensible.

Examples:

- cancelled registration should eventually invalidate active pass
- revoked pass should not silently restore itself

### FR12 - Organizer visibility into issuance gaps

Operations surfaces should show which approved participants still do not have a pass when passes are enabled.

## Backend Scope

The backend scope for this sprint is the pass domain model, issuance, and revocation foundation.

### Database

Recommended new model: `EventPass`

Suggested fields:

- `id: String`
- `eventId: String`
- `registrationId: String`
- `passType: EventPassType`
- `status: EventPassStatus`
- `passCode: String`
- `issuedAt: DateTime?`
- `revokedAt: DateTime?`
- `expiresAt: DateTime?`
- `walletProviderData: Json?`
- `createdAt: DateTime`
- `updatedAt: DateTime`

Recommended enums:

- `EventPassType`
  - `ATTENDEE`
  - `EXHIBITOR`
  - `STAFF`
  - `SPEAKER`
  - `SPONSOR`
  - `VIP`

- `EventPassStatus`
  - `PENDING_ISSUANCE`
  - `ISSUED`
  - `REVOKED`
  - `EXPIRED`

Potential additions to `Event` settings:

- `passesEnabled: Boolean`
- `passIssuanceMode: EventPassIssuanceMode`

Recommended enum:

- `EventPassIssuanceMode`
  - `MANUAL`
  - `AUTO_ON_APPROVAL`

### Index and constraints

- index on `eventId`
- index on `registrationId`
- index on `status`
- unique constraint on active current pass logic as appropriate
- unique constraint on `passCode`

### API module and service

Recommended endpoints:

- `PATCH /events/:id/pass-settings`
- `POST /events/:id/registrations/:registrationId/pass`
- `GET /events/:id/passes`
- `GET /events/:id/registrations/:registrationId/pass`
- `POST /events/:id/registrations/:registrationId/pass/reissue`
- `POST /events/:id/registrations/:registrationId/pass/revoke`
- `GET /events/:id/me/pass`

### Service responsibilities

- determine pass eligibility
- derive default pass type from role
- generate stable pass code
- persist pass issuance state
- revoke and reissue safely
- prepare wallet metadata payload shape
- enforce organizer-only pass management actions

### Validation rules

- event must have passes enabled
- registration must belong to event
- registration must be approved to issue pass
- revoked or expired pass cannot be treated as active
- reissue must not leave multiple active passes accidentally
- participant can only view their own pass

### Backend test scope

- issue pass happy path
- reject issue for unapproved registration
- manual vs auto issuance behavior tests
- revoke pass tests
- reissue pass tests
- participant self-view access tests
- organizer-only management tests

## Frontend Scope

The frontend scope for this sprint covers organizer pass management and participant pass viewing.

### Organizer pass management UX

Recommended surfaces:

- pass settings in event operations
- participant list with pass status column
- pass action buttons:
  - issue
  - revoke
  - reissue

### Organizer event pass dashboard view

Recommended summary:

- passes enabled or disabled
- approved participants count
- passes issued count
- passes pending count
- passes revoked count
- participants missing passes

### Participant pass view UX

Recommended route:

- event-specific `My Pass` view

The pass surface should show:

- event branding
- participant name
- pass type badge
- machine-readable code or placeholder QR for future scanning
- status message
- wallet availability state if not yet fully active

### Wallet UX

If actual wallet issuance is not fully active in this sprint, UI must remain truthful.

Examples:

- `Wallet support is being prepared for this event`
- `Your pass is available in Dotly now`

Do not show fake Apple/Google wallet buttons unless they work.

### Frontend technical scope

- reuse existing pass-related visual patterns if wallet passes already exist elsewhere in the repo
- keep pass screen mobile-first
- do not overdesign event badge visuals before scanning behavior exists

### Frontend test scope

- organizer issue/revoke/reissue actions
- participant pass view states
- no-pass state
- revoked pass state
- truthful wallet availability messaging

## Pass Code Strategy

The pass code must be stable and machine-readable.

Recommended rule:

- generate a dedicated pass credential token or code
- do not use mutable display fields such as email or card handle as the actual pass identity

The pass code should later be the primary scan validation input for check-in endpoints.

## Wallet Strategy

This sprint should align with existing wallet capabilities in the repo where possible.

Recommended approach:

- reuse existing wallet infrastructure patterns
- extend them for event-specific pass semantics
- keep event pass metadata separate from generic card wallet behavior if their purposes differ

Examples of metadata that may be needed later:

- event name
- participant name
- pass type
- visual branding
- pass code
- validity state

## Operations And Reporting Impact

This sprint should make pass state visible in operations surfaces.

Recommended visibility:

- participant list includes pass status
- event operations shows unissued approved participants
- pass type visible where operationally relevant

This does not require a separate analytics dashboard, but it does require clear operational state.

## Privacy And Trust Requirements

- participant must only access their own pass
- revoked passes must be clearly marked invalid
- pass code must not leak through unauthorized list or export surfaces
- wallet messaging must be truthful if delivery is partial

## Audit Scope

Audit is mandatory for this sprint.

The audit must cover:

- pass issuance eligibility
- pass code uniqueness and stability
- organizer-only pass management
- participant self-view authorization
- revoke and reissue safety
- wallet messaging truthfulness

### Audit checklist

- can a pass be issued to an unapproved registration?
- can two active passes exist unintentionally for the same participant?
- can a participant view another participant's pass?
- can a revoked pass still appear active in organizer or participant UI?
- can reissue leave old pass usable?
- does the UI imply wallet support where none exists yet?

## Fix Scope

Any issues found during audit that affect pass identity, authorization, revocation correctness, or wallet truthfulness must be fixed inside this sprint.

Must-fix categories:

- issuing pass to invalid registration state
- multiple active pass bugs
- pass self-view authorization leaks
- revoked pass remaining effectively active
- reissue not invalidating old credential
- misleading wallet delivery messaging

Can-defer categories only with explicit note:

- visual pass polish
- optional pass branding enhancements
- optional organizer filters for pass state
- non-blocking wallet metadata enrichment

## Re-Audit Scope

After fixes are applied, re-audit is required.

The re-audit should confirm:

- pass issuance remains correct
- revoke and reissue remain safe
- participant self-view remains scoped correctly
- wallet messaging remains truthful

Re-audit output should classify remaining issues as:

- blocking
- acceptable for this sprint
- intentionally deferred to next sprint

## GREEN Criteria

This sprint is GREEN only if all of the following are true:

- pass settings exist on events
- approved participants can receive passes
- pass type and pass status are persisted correctly
- organizer can issue, revoke, and reissue passes safely
- participant can view only their own pass
- pass identity is stable enough for future scan validation
- audit is completed
- must-fix findings are fixed
- re-audit confirms no blocking issues remain
- relevant tests for issuance, revocation, reissue, and authorization pass

If any of the above is false, the sprint is not GREEN.

## Continue Or Stop Gate

### Can this sprint continue into the next sprint?

Yes, but only if the sprint exits GREEN.

This sprint can hand off safely to `009-p03-03B-entry-check-in-and-scan-types.md` when:

- pass identity is durable
- issuance and revocation are trustworthy
- future scan validation has a stable credential to validate

This sprint must not hand off as ready if:

- pass issuance is still semantically weak
- old credentials remain usable after reissue or revoke
- self-view authorization leaks remain
- wallet or pass messaging is misleading

### What may continue in the next sprint

- entry check-in scans
- stall and session scan type support
- pass validation endpoints
- scan audit trail

### What must not be pushed carelessly to the next sprint

- unresolved pass authorization issues
- unresolved revoke or reissue safety bugs
- unresolved instability in pass code generation

## Dependencies

Technical dependencies:

- Phase 2 participant identity and operations
- existing wallet/pass infrastructure in the repo if reusable

Product dependencies:

- agreement on pass types
- agreement on manual vs auto issuance
- agreement on whether wallet support is native in this sprint or only foundational

## Non-Goals

- entry scanning
- stall scanning
- session scanning
- physical badge printing
- access gates by venue area

## Risks

### Risk 1 - Conflating registration and pass issuance

If pass issuance is treated as automatic identity truth without its own state, later revocation and scanning will be fragile.

Mitigation:

- keep pass as a separate model with its own lifecycle

### Risk 2 - Wallet-first modeling

If Apple or Google wallet format drives the core domain design, the product model may become awkward.

Mitigation:

- keep `EventPass` as the product object and wallet as delivery format

### Risk 3 - Unsafe reissue behavior

If old credentials remain valid after reissue, event-day security breaks down.

Mitigation:

- enforce invalidation of previous active credential on reissue

### Risk 4 - Overbuilding visual badge design

If too much effort goes into badge presentation before scan validation exists, delivery slows without improving core readiness.

Mitigation:

- keep V3A focused on pass correctness and visibility first

## Open Questions

1. Should pass issuance default to `AUTO_ON_APPROVAL` for some event types, or remain organizer-controlled everywhere in V3A?

2. Should there be one pass per registration always, or do some roles need multiple credentials later?

3. Should pass expiration be explicit by event end time in V3A, or added in the next sprint with scan rules?

4. How much of Apple/Google wallet support should be real in this sprint versus foundational only?

## Recommended Implementation Notes

- Prefer one active pass per registration.
- Keep pass status transitions explicit and testable.
- Reuse wallet infrastructure if it fits, but do not bend the domain around it.
- Keep participant pass UX truthful even if some delivery formats are not complete yet.
- Treat this sprint as credential foundation, not event-day scanning.

## Acceptance Criteria

1. An organizer can enable pass issuance for an event.

2. An eligible approved participant can receive an event pass.

3. Organizer can revoke and reissue passes safely.

4. Participant can view their own pass.

5. Pass identity is durable enough for the next sprint to use in check-in validation.

6. The system is ready for entry and scan-type workflows to build on top of a stable pass foundation.

## Definition Of Done

This sprint is complete when:

- event pass model exists
- pass issuance exists
- pass revoke and reissue exist
- participant pass view exists
- wallet foundation shape exists
- audit, fix, and re-audit are completed
- documentation clearly explains how entry and scan-type work build on top of this pass foundation next

## Sprint Closeout Message

At sprint close, the owning engineer or reviewer should record one of these explicit outcomes:

- `GREEN - Continue`
  - sprint passed implementation, audit, fix, and re-audit
  - next sprint may build on top of trustworthy event pass identity and issuance state

- `GREEN - Continue With Noted Deferrals`
  - sprint is safe to build on
  - only non-blocking deferred items remain and are documented

- `NOT GREEN - Do Not Continue`
  - blocking issues remain
  - next sprint must not treat event passes as reliable for scan validation

Recommended closeout message format:

```md
Status: GREEN - Continue

Why:

- Event pass identity and issuance are durable and controlled
- Revocation and reissue are safe
- Entry and check-in scanning can now validate a stable pass credential

Deferred:

- Optional richer wallet delivery
- Optional advanced pass branding
```
