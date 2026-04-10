# Event Radar V01 - 009 - P03 - 03B - Entry Check-In And Scan Types

## Objective

Introduce event-day scan validation and check-in behavior so Event Radar can use issued passes and event nodes as real operational credentials during a live event.

This sprint adds:

- entry check-in flow
- scan type model
- pass validation at scan time
- check-in record model
- scan audit trail
- role-aware scan permissions
- event-day operational scan outcomes

At the end of this sprint, Event Radar should support real scan-driven event operations rather than only pre-event preparation and post-scan networking.

## Problem

After Sprint 008, Event Radar can issue event passes, but those passes are not yet useful for live event entry or event-day operational flows.

Without check-in and scan types:

- participants cannot use the pass as an actual event credential at the venue
- organizers cannot validate whether someone is admitted or already checked in
- stall and event-day scan actions remain indistinguishable
- there is no trustworthy audit trail for operational scans
- post-event analytics cannot distinguish registration, pass issuance, and actual attendance

The platform needs an event-day scan model that answers:

- what kind of scan happened
- who scanned whom or what
- whether the pass was valid
- whether the participant was checked in successfully
- whether the scan was for entry, a stall, or another allowed event-day action

## Product Intent

This sprint should make Event Radar feel like a true event identity and access system.

The product promise is:

- a participant can present a pass
- authorized event operators can scan and validate it
- the system can tell the difference between entry, stall, and later scan surfaces
- event-day scan history is reliable and reviewable

This sprint is not trying to complete all post-event workflows. It is focused on live operational truth.

## Sprint Scope

In scope:

- scan type model
- entry check-in scan flow
- pass validation endpoint and result model
- check-in record persistence
- authorized scanner permissions
- duplicate-scan handling
- scan audit trail
- organizer and operator event-day scan views
- event-day participant status updates derived from scans

Out of scope:

- physical turnstile integration
- badge printing
- session attendance analytics dashboards beyond basic logging
- geo-fencing or presence detection
- offline-first scanning unless already required by product constraints
- advanced anti-fraud beyond core credential validation

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

If a sprint leaves behind known scan validation, check-in truth, authorization, or audit-trail gaps that block dependable use of the sprint outcome, the work must not be treated as ready to continue to the next sprint.

If only non-blocking polish or deliberately deferred expansion remains, the sprint may be marked as safe to continue into the next sprint.

## Core Design Principle

This sprint must preserve separation among:

- pass issuance
- pass validation
- check-in outcome
- exchange or networking scan behavior

These must not be merged into one generic scan result.

Examples:

- a pass can validate successfully but not create a second check-in if already checked in
- a stall scan can be valid without being an entry check-in
- a session scan later may record attendance without changing entry state
- a revoked pass may fail validation even though the participant registration still exists

## Scan Type Model

This sprint introduces explicit scan types.

Recommended initial scan types:

- `ENTRY_PASS`
- `STALL_CHECKIN`
- `CONTACT_EXCHANGE`
- `SESSION_CHECKIN`
- `LEAD_CAPTURE`

Recommendation for this sprint:

- fully implement `ENTRY_PASS`
- support routing and model readiness for the others
- only partially activate other types where needed for future-safe design

### Meaning

`ENTRY_PASS`

- validates participant pass for event entry
- may create event check-in record

`STALL_CHECKIN`

- indicates participant presence at a stall or node
- may later contribute to stall visit analytics

`CONTACT_EXCHANGE`

- indicates participant or public exchange flow entry
- should remain separate from admission

`SESSION_CHECKIN`

- indicates session attendance in future phase

`LEAD_CAPTURE`

- indicates operational collection flow for a business or node

## Check-In Model

This sprint introduces a durable `CheckIn` record.

The check-in record should answer:

- which event it belongs to
- which participant or pass it belongs to
- what scan type triggered it
- where it happened
- who scanned it
- whether validation succeeded
- what the final operational result was

Recommendation:

- keep `CheckIn` separate from `EventPass`
- treat it as an immutable or append-heavy event record rather than a single mutable boolean state

## Pass Validation Model

Pass validation should evaluate at least:

- pass exists
- pass belongs to this event
- pass status is active and usable
- registration is still eligible
- scan actor is authorized for the scan type

Validation result should be explicit.

Recommended outcomes:

- `VALID_CHECKED_IN`
- `VALID_ALREADY_CHECKED_IN`
- `INVALID_PASS`
- `REVOKED_PASS`
- `WRONG_EVENT`
- `NOT_ELIGIBLE`
- `UNAUTHORIZED_SCANNER`

This gives the UI and audit trail enough operational detail to remain truthful.

## Functional Requirements

### FR1 - Authorized scanner roles

Only authorized roles can perform event-day scans.

Minimum rule set:

- organizer can scan entry passes
- approved staff with scan permission can scan entry passes
- stall owners or authorized stall staff can perform stall-related scans only within scope

This sprint may keep scan permissions simple, but they must be explicit.

### FR2 - Entry pass scan flow

An authorized scanner can scan a participant pass and submit it for validation.

The system returns a clear result.

If valid and not already checked in:

- create check-in record
- mark participant as checked in via derived state or linked summary logic

### FR3 - Duplicate scan handling

If a pass already has a successful entry check-in for that event, the system must return a truthful duplicate result.

Recommendation:

- do not create a second successful entry check-in record that implies a new admission
- do log the duplicate scan attempt in the audit trail where useful

### FR4 - Wrong event handling

If a pass for one event is scanned at another event, validation must fail clearly.

### FR5 - Revoked or invalid pass handling

If a pass is revoked, expired, or unknown, validation must fail clearly and must not create successful check-in state.

### FR6 - Check-in persistence

Successful check-in must create a durable record.

Recommended fields:

- event id
- pass id
- registration id
- scan type
- scanned by user id
- node id if relevant
- timestamp
- validation result

### FR7 - Scan audit trail

The system should retain an audit trail of scan attempts and outcomes, including failed attempts when appropriate.

The audit trail should support later investigation of:

- who scanned
- what was scanned
- when
- what result occurred

### FR8 - Organizer event-day participant state

Organizer should be able to see participant state such as:

- approved but not checked in
- checked in
- invalid or unresolved scan attempt history if relevant

### FR9 - Stall-scope scan readiness

Even if this sprint is focused on entry, the scan architecture must allow later or partial support for stall and session scan types without rewriting the validation framework.

### FR10 - Scan result UX

The scanning experience must return a clear operator-facing result.

Examples:

- `Check-in successful`
- `Already checked in`
- `Pass revoked`
- `Wrong event`
- `You do not have permission to scan this pass`

### FR11 - Participant self-view update

If a participant is checked in successfully, participant-facing surfaces may reflect that event-day progress if appropriate.

This can be minimal in this sprint.

### FR12 - Event-day operational counts

Organizer operations surfaces should be able to show:

- total checked in
- not checked in yet
- recent scans

Keep these counts operational and truthful.

## Backend Scope

The backend scope for this sprint is the scan validation and check-in event model.

### Database

Recommended new model: `CheckIn`

Suggested fields:

- `id: String`
- `eventId: String`
- `registrationId: String?`
- `eventPassId: String?`
- `eventNodeId: String?`
- `scanType: EventScanType`
- `validationResult: CheckInValidationResult`
- `checkedIn: Boolean`
- `scannedByUserId: String`
- `createdAt: DateTime`

Recommended new enums:

- `EventScanType`
  - `ENTRY_PASS`
  - `STALL_CHECKIN`
  - `CONTACT_EXCHANGE`
  - `SESSION_CHECKIN`
  - `LEAD_CAPTURE`

- `CheckInValidationResult`
  - `VALID_CHECKED_IN`
  - `VALID_ALREADY_CHECKED_IN`
  - `INVALID_PASS`
  - `REVOKED_PASS`
  - `WRONG_EVENT`
  - `NOT_ELIGIBLE`
  - `UNAUTHORIZED_SCANNER`

Recommendation:

- store both validation result and `checkedIn` boolean for operational clarity
- do not treat `checkedIn` alone as the whole truth

Potential small settings additions if needed:

- event-level boolean for entry check-in enabled
- event-level scanner role settings if product needs them soon

### Index and constraints

- index on `eventId`
- index on `registrationId`
- index on `eventPassId`
- index on `scanType`
- index on `createdAt`
- consider query path for latest successful entry check-in by pass or registration

### API module and service

Recommended endpoints:

- `POST /events/:id/scan/validate`
- `GET /events/:id/check-ins`
- `GET /events/:id/check-ins/recent`
- `GET /events/:id/registrations/:registrationId/check-ins`

Optional if scan types expand in this sprint:

- `POST /events/:id/nodes/:nodeId/scan/validate`

### Service responsibilities

- authenticate scan operator
- authorize scan operator by event and role
- resolve pass from pass code or scanned token
- validate event match and pass state
- detect prior successful check-in
- persist check-in or scan-attempt audit record
- return operator-ready result payload

### Validation rules

- scanned pass must exist
- scanned pass must belong to event
- scanned pass must not be revoked or expired
- linked registration must remain eligible
- scan operator must be authorized
- duplicate entry check-ins must not create false admissions

### Backend test scope

- successful entry scan test
- duplicate scan test
- wrong event scan test
- revoked pass scan test
- unauthorized scanner test
- recent check-ins query test
- check-in count aggregation test if implemented

## Frontend Scope

The frontend scope for this sprint covers the operator scan experience and event-day operational views.

### Scanner UX

Recommended scanner flow:

1. authorized operator opens event scan screen
2. operator selects or is already in event context
3. operator scans pass QR or enters code
4. app submits to validation endpoint
5. app shows explicit result state

### Result-state UX

Recommended operator result cards:

- success state with participant identity and pass type
- already checked in state
- revoked or invalid state
- wrong event state
- unauthorized state

Do not use generic success or error banners only. Event-day operations need precise results.

### Organizer event-day view

Recommended sections:

- total checked in
- not checked in yet
- recent scan activity
- check-in exceptions if tracked

### Participant detail event-day state

Organizer participant detail can now include:

- pass status
- checked-in status
- recent scan history summary

### Frontend technical scope

- keep scanner UI fast and simple
- prioritize readability and operator confidence over visual complexity
- if using mobile web or mobile app, match existing repo patterns for scanning entry points

### Frontend test scope

- scan success result
- duplicate result
- revoked or invalid result
- organizer event-day summary render
- unauthorized scan state

## Scan Authorization Strategy

Recommended V3 rule set:

- organizer can scan any event pass for their event
- event staff with explicit scan permission can scan entry passes
- stall owners and stall staff should not automatically get entry permissions unless intentionally granted

This keeps entry control tighter than general event operations.

## Duplicate Check-In Strategy

Recommendation:

- first valid entry scan creates successful check-in
- later entry scans return `VALID_ALREADY_CHECKED_IN`
- duplicate attempts may still create audit rows if the product values operator traceability

This avoids silently hiding repeat scans while keeping attendance truth accurate.

## Scan Audit Strategy

This sprint should define the audit trail as part of the core product, not an afterthought.

The audit trail should help answer:

- how many scan attempts happened
- which operator scanned
- which passes failed and why
- which participants were admitted successfully

Recommendation:

- record failed validations where operationally useful
- make sure audit volume remains manageable and filtered by event context

## Operations And Reporting Impact

This sprint should extend operations reporting with event-day truth.

Recommended operational metrics:

- approved participants
- passes issued
- checked in count
- pending arrival count
- recent scans

These metrics should remain operational, not inflated marketing analytics.

## Privacy And Trust Requirements

- only authorized operators can validate passes
- pass scan results must not expose more participant data than needed for event-day operations
- failed validations should be visible to authorized operators only
- participant self-view should not falsely claim check-in without successful validation

## Audit Scope

Audit is mandatory for this sprint.

The audit must cover:

- scan authorization
- pass validation correctness
- duplicate check-in handling
- wrong-event isolation
- revoked-pass handling
- scan audit trail integrity
- operator UI truthfulness

### Audit checklist

- can an unauthorized user validate passes?
- can a revoked pass still create successful check-in?
- can the same pass create multiple successful entry admissions?
- can a pass from another event validate incorrectly?
- does failed validation still appear as success in any UI path?
- are scan audit rows attributable to the scanning operator?

## Fix Scope

Any issues found during audit that affect event-day authorization, validation truth, duplicate handling, or scan audit integrity must be fixed inside this sprint.

Must-fix categories:

- unauthorized scan access
- revoked or wrong-event passes validating incorrectly
- duplicate successful check-ins
- missing or misleading validation result mapping
- incomplete scan audit attribution
- UI mislabeling scan outcomes

Can-defer categories only with explicit note:

- scanner visual polish
- non-blocking scan history UI refinement
- optional secondary scan-type activation
- minor operator ergonomics improvements

## Re-Audit Scope

After fixes are applied, re-audit is required.

The re-audit should confirm:

- valid entry check-ins still work
- duplicate handling still works
- unauthorized access remains blocked
- wrong-event and revoked-pass failures remain correct
- scan result UI remains truthful

Re-audit output should classify remaining issues as:

- blocking
- acceptable for this sprint
- intentionally deferred to next sprint

## GREEN Criteria

This sprint is GREEN only if all of the following are true:

- authorized operators can validate entry passes
- successful entry scan creates truthful check-in state
- duplicate scans are handled correctly
- revoked, invalid, and wrong-event passes fail correctly
- scan audit trail exists and is attributable
- event-day counts and recent scans are available to organizer
- audit is completed
- must-fix findings are fixed
- re-audit confirms no blocking issues remain
- relevant tests for validation, authorization, and duplicate handling pass

If any of the above is false, the sprint is not GREEN.

## Continue Or Stop Gate

### Can this sprint continue into the next sprint?

Yes, but only if the sprint exits GREEN.

This sprint can hand off safely to `010-p03-03C-post-event-ops-and-crm-routing.md` when:

- event-day attendance and scan truth are reliable
- pass validation and check-in history are dependable
- post-event workflows can safely reason about who attended and how event-day interactions occurred

This sprint must not hand off as ready if:

- check-in truth is unstable
- authorization leaks remain in scanning
- duplicate or invalid passes still create ambiguous outcomes
- scan history is incomplete or misleading

### What may continue in the next sprint

- post-event follow-up views
- CRM routing by event-day outcome
- attendance-aware reporting
- hot lead and attended-contact prioritization

### What must not be pushed carelessly to the next sprint

- unresolved scan authorization issues
- unresolved duplicate-check-in bugs
- unresolved audit trail gaps
- unresolved wrong-event or revoked-pass validation bugs

## Dependencies

Technical dependencies:

- Sprint 008 event pass foundation
- participant identity and operations foundations from prior phases
- scanner-capable UI surface in web or mobile

Product dependencies:

- agreement on authorized scanner roles
- agreement on initial scan types to expose vs defer
- agreement on whether failed scan attempts are stored persistently in V3B

## Non-Goals

- physical hardware integration
- session attendance dashboards
- fraud scoring
- badge printing
- offline device sync

## Risks

### Risk 1 - Overloading one scan endpoint for all behaviors

If scan behavior is implemented as one vague endpoint with ad hoc branching, future maintenance will become fragile.

Mitigation:

- use explicit scan type and validation result models

### Risk 2 - Weak authorization at event day

If any authenticated user can scan or validate passes, the event-day trust model fails.

Mitigation:

- enforce event-scoped scanner permissions strictly

### Risk 3 - Incorrect duplicate handling

If repeat scans create multiple admissions or hide repeat attempts completely, operations become unreliable.

Mitigation:

- distinguish successful first check-in from duplicate validation result

### Risk 4 - UI ambiguity during live operations

If the operator interface returns vague results, staff may admit the wrong person or reject a valid one.

Mitigation:

- use explicit operator-facing result states

## Open Questions

1. Should failed scan attempts always be persisted as audit records, or only some validation failures?

2. Should stall owners have any event-day scan permission in V3B, or wait until later after entry scanning is stable?

3. Should check-in status be derived from successful check-in records only, or mirrored into a summary field for faster reads?

4. Should `STALL_CHECKIN` be partially active in this sprint, or remain only model-ready for future use?

## Recommended Implementation Notes

- Keep `ENTRY_PASS` as the primary active scan type in this sprint.
- Treat validation result as first-class product data.
- Keep check-in state append-safe and auditable.
- Optimize the operator UI for clarity and speed.
- Do not let future scan types complicate the first usable entry flow.

## Acceptance Criteria

1. Authorized operators can scan and validate entry passes.

2. Valid first-time scans create successful check-in state.

3. Duplicate scans are handled truthfully.

4. Invalid, revoked, and wrong-event passes fail truthfully.

5. Scan history and check-in history are durable enough for post-event reporting and CRM routing.

6. The system is ready for the final sprint to build post-event operational and CRM workflows on top of reliable attendance data.

## Definition Of Done

This sprint is complete when:

- scan type model exists
- entry validation exists
- check-in records exist
- event-day scan UI exists
- audit, fix, and re-audit are completed
- documentation clearly explains how post-event operations and CRM routing build on top of this scan and attendance foundation next

## Sprint Closeout Message

At sprint close, the owning engineer or reviewer should record one of these explicit outcomes:

- `GREEN - Continue`
  - sprint passed implementation, audit, fix, and re-audit
  - next sprint may build on top of trustworthy event-day attendance and scan audit data

- `GREEN - Continue With Noted Deferrals`
  - sprint is safe to build on
  - only non-blocking deferred items remain and are documented

- `NOT GREEN - Do Not Continue`
  - blocking issues remain
  - next sprint must not treat event-day scan outcomes as reliable for post-event operations or CRM routing

Recommended closeout message format:

```md
Status: GREEN - Continue

Why:

- Entry pass validation and check-in are reliable
- Duplicate and invalid scan outcomes are truthfully handled
- Post-event workflows can now build on dependable attendance and scan history

Deferred:

- Optional partial activation of stall check-in scan type
- Optional richer operator scan history filtering
```
