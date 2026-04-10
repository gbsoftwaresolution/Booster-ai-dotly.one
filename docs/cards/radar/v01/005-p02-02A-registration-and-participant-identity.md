# Event Radar V01 - 005 - P02 - 02A - Registration And Participant Identity

## Objective

Introduce event registration and participant identity so Event Radar can move from anonymous or scan-only exchange into a structured event participation system.

This sprint adds:

- event registration model
- participant identity linked to an event
- role assignment per event
- registration states and approval flow
- organizer registration management
- participant-aware event experience foundation

At the end of this sprint, Event Radar should support the idea that a person is not only someone who scanned a QR, but someone who is known to the event in a structured way.

## Problem

Phase 1 gives Event Radar event creation, node QR routing, consented exchanges, and reporting. But the system still lacks a durable participant model.

Without registration and participant identity:

- event participation is mostly anonymous unless someone explicitly shares details in an exchange
- organizers cannot know who is expected at the event
- businesses cannot distinguish registered attendees from unregistered walk-up visitors
- later directory, mutual participant exchange, pass issuance, and check-in flows have no identity foundation
- one person may appear multiple times across exchanges without a stable event-scoped identity

The platform needs a participant model that separates:

- who the person is in Dotly
- whether they are part of a specific event
- what role they hold in that event
- whether they are approved, pending, or rejected

## Product Intent

This sprint should make Event Radar feel like an actual event system rather than only a smart QR workflow.

The product promise is:

- an organizer can accept registrations into an event
- each participant can hold an event-specific identity and role
- event membership becomes durable and queryable
- later event directory, pass, and check-in features can build on that identity layer cleanly

This sprint is not trying to become a full ticketing product yet. It is establishing the participant identity contract.

## Sprint Scope

In scope:

- event registration model
- participant identity model
- participant roles
- registration state machine
- organizer approval or rejection flow
- registration forms and registration entry points
- participant list for organizer
- participant detail view foundation
- event-scoped identity linkage to existing user/card profile when available
- attribution bridge between participant identity and future exchange history

Out of scope:

- participant directory for attendees
- event pass issuance
- entry or check-in scanning
- ticket pricing and payments
- waitlist optimization logic beyond basic state support if needed
- automatic networking suggestions
- advanced invite campaigns

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

If a sprint leaves behind known identity, approval, authorization, or registration-state gaps that block dependable use of the sprint outcome, the work must not be treated as ready to continue to the next sprint.

If only non-blocking polish or deliberately deferred expansion remains, the sprint may be marked as safe to continue into the next sprint.

## Core Design Principle

This sprint must preserve separation among three distinct concepts:

- `Identity`
  - who the person is in Dotly

- `Registration`
  - whether the person belongs to this event and in what state

- `Exchange`
  - what data the person chose to share with others in event interactions

These must not collapse into one object.

Example:

- someone may be approved for an event
- have a participant role of attendee
- but still share only limited fields during event exchanges

That separation is mandatory for later privacy-safe directory and pass behavior.

## User Roles In This Sprint

Primary active roles:

- Organizer
  - creates registration settings
  - reviews and manages registrations
  - assigns or approves participant roles

- Participant
  - submits registration to join an event
  - holds an event-specific participant identity

- Staff or exhibitor role candidate
  - same registration foundation, different event role

Supported participant roles for V2 foundation:

- `ATTENDEE`
- `EXHIBITOR`
- `ORGANIZER`
- `STAFF`
- `SPEAKER`
- `SPONSOR`

Recommendation:

- keep these as event roles, not global user types

## User Stories

### Organizer stories

1. As an organizer, I want to allow people to register for my event so I can know who plans to attend.

2. As an organizer, I want to control whether registrations are open, invite-only, or approval-based so the event can match different formats.

3. As an organizer, I want to review participant registrations and assign or confirm roles so the event has structure.

4. As an organizer, I want to see participant status clearly so I know who is pending, approved, rejected, or cancelled.

### Participant stories

1. As a participant, I want to register for an event in Dotly so I become part of that event rather than only a one-time scanner.

2. As a participant, I want my registration status to be clear so I know whether I am approved or still waiting.

3. As a participant, I want my event profile to connect to my Dotly identity where appropriate so I do not re-enter everything repeatedly.

### Platform stories

1. As the platform, I need a stable participant identity for each event so later directory, pass, and check-in features can build on it.

2. As the platform, I need role and status to be event-specific so one user can have different participation contexts across different events.

## Registration Model

Recommended new core concept: `EventRegistration`

This represents a person's relationship to a specific event.

Minimum fields should answer:

- who is registering
- for which event
- in what role
- with what status
- when they registered
- whether the organizer has reviewed them

## Participant Identity Model

This sprint should also define a participant identity layer.

Depending on the current codebase shape, this can be implemented in one of two ways:

1. `EventRegistration` itself carries the participant-facing identity fields
2. separate `ParticipantProfile` linked to `EventRegistration`

Recommendation for V2 foundation:

- start with identity fields on `EventRegistration` unless separation is clearly needed immediately

Reason:

- simpler to ship
- enough for V2 registration
- can later split into `ParticipantProfile` if pass, directory, and advanced profile settings grow

## Registration Status Model

Recommended statuses:

- `PENDING`
- `APPROVED`
- `REJECTED`
- `CANCELLED`

Optional future-safe value:

- `WAITLISTED`

Recommendation:

- include `WAITLISTED` only if the product expects it soon
- otherwise keep V2 lean with the four primary states above

### Meaning

`PENDING`

- participant submitted registration
- organizer review may still be required

`APPROVED`

- participant is accepted into the event
- later passes and directory eligibility can depend on this

`REJECTED`

- participant is not accepted

`CANCELLED`

- participant withdrew or organizer cancelled the registration

## Registration Access Modes

The event should support registration modes such as:

- `OPEN`
- `APPROVAL_REQUIRED`
- `INVITE_ONLY`

Recommendation:

- store this on the `Event` model or a simple event settings extension

### Meaning

`OPEN`

- registrations are accepted immediately as `APPROVED` or as `PENDING` with auto-approval depending on design choice

Recommendation:

- for `OPEN`, register as `APPROVED`

`APPROVAL_REQUIRED`

- registration is created as `PENDING`
- organizer later approves or rejects

`INVITE_ONLY`

- self-registration is disabled unless invite support exists
- this sprint can support the state but may keep invite issuance itself simple or deferred

## Functional Requirements

### FR1 - Event registration settings

An organizer can configure whether an event accepts registrations and how registration approval works.

Required settings:

- registrations enabled
- access mode
- default role for public registrants

Optional settings:

- registration close date
- registration note or instructions

### FR2 - Public registration entry

A participant can register for an event through a public event registration route when registration is enabled and allowed.

The route should be event-aware and truthful.

### FR3 - Registration form

The registration form should collect the minimum useful participant identity.

Recommended fields:

- full name
- email
- phone optional
- company optional
- title optional
- requested role if supported

Recommendation for V2:

- keep the form minimal
- prefill from signed-in Dotly profile where possible, but do not require sign-in if the product wants easier entry

### FR4 - Create registration

Submitting a valid registration creates an event registration record.

Status behavior:

- `OPEN` event -> registration becomes `APPROVED`
- `APPROVAL_REQUIRED` event -> registration becomes `PENDING`
- `INVITE_ONLY` event -> public self-registration rejected unless valid invite path exists

### FR5 - Prevent duplicate registrations

The system must prevent the same participant from registering repeatedly for the same event in a way that creates duplicate participant records without intent.

Recommendation:

- dedupe by event plus normalized email for public registrants
- if signed-in Dotly user exists, prefer dedupe by `userId + eventId`

### FR6 - Organizer participant list

An organizer can list registrations for an owned event.

The list should show:

- participant name
- role
- status
- email
- company if present
- registered at
- last updated at

### FR7 - Organizer registration decision

An organizer can approve, reject, or cancel a registration as allowed by business rules.

Rules:

- only organizer or authorized manager can change status
- invalid state transitions must be rejected

### FR8 - Role assignment

An organizer can assign or update a participant's event role.

Examples:

- attendee -> speaker
- attendee -> exhibitor
- staff stays staff

Role changes must not erase registration history.

### FR9 - Participant detail view

An organizer can open a participant detail view showing:

- registration info
- role
- status
- identity fields
- linked user/card info if available
- future-safe placeholder for pass and check-in state

### FR10 - Participant-aware exchange linkage readiness

The model should support linking future exchanges to participant identity when the registered person later scans or shares.

This sprint does not need perfect auto-linking yet, but the data shape must support it.

### FR11 - Status visibility for participant

After registration, the participant sees a clear status outcome.

Examples:

- `You are registered for this event`
- `Your registration is pending organizer approval`
- `Registration is not available for this event`

### FR12 - Organizer auditability

Organizer decisions on approval or rejection should be attributable and timestamped if existing audit patterns support it.

## Backend Scope

The backend scope for this sprint is the registration, role, and participant identity layer.

### Database

Recommended new model: `EventRegistration`

Suggested fields:

- `id: String`
- `eventId: String`
- `userId: String?`
- `fullName: String`
- `email: String`
- `phone: String?`
- `company: String?`
- `title: String?`
- `role: EventParticipantRole`
- `status: EventRegistrationStatus`
- `registeredAt: DateTime`
- `reviewedAt: DateTime?`
- `reviewedByUserId: String?`
- `notes: String?`
- `createdAt: DateTime`
- `updatedAt: DateTime`

Recommended new enums:

- `EventParticipantRole`
  - `ATTENDEE`
  - `EXHIBITOR`
  - `ORGANIZER`
  - `STAFF`
  - `SPEAKER`
  - `SPONSOR`

- `EventRegistrationStatus`
  - `PENDING`
  - `APPROVED`
  - `REJECTED`
  - `CANCELLED`

Potential small addition to `Event`:

- `registrationEnabled: Boolean`
- `registrationMode: EventRegistrationMode`
- `defaultRegistrantRole: EventParticipantRole`
- `registrationClosesAt: DateTime?`

### Index and constraints

- index on `eventId`
- index on `userId`
- index on `status`
- composite index on `eventId, status`
- composite unique or guarded dedupe path for `eventId + normalizedEmail`
- optional uniqueness for `eventId + userId` when `userId` exists

### API module and service

Recommended endpoints:

- `PATCH /events/:id/registration-settings`
- `POST /public/events/:id/register`
- `GET /events/:id/registrations`
- `GET /events/:id/registrations/:registrationId`
- `PATCH /events/:id/registrations/:registrationId/status`
- `PATCH /events/:id/registrations/:registrationId/role`

Optional later:

- `POST /events/:id/registrations/:registrationId/cancel`

### Service responsibilities

- validate event registration availability
- determine initial status from registration mode
- dedupe registrations safely
- persist participant identity fields
- enforce organizer-only review actions
- reject invalid status transitions
- link signed-in users where available

### Validation rules

- event must exist
- event must allow registration for self-serve public flow
- name and email required
- email normalized
- status transitions valid
- role values valid
- organizer cannot access registrations for events they do not own

### Backend test scope

- open registration flow
- approval-required flow
- invite-only rejection flow
- duplicate registration protection
- organizer approve/reject tests
- organizer role-change tests
- unauthorized access tests
- status transition validation tests

## Frontend Scope

The frontend scope for this sprint covers registration settings, public registration flow, and organizer participant management.

### Organizer event settings UX

Add registration controls to the event management surface.

Recommended controls:

- registrations enabled toggle
- registration mode selector
- default role selector
- registration close date optional
- save settings action

### Public registration flow

Recommended route:

- event-specific public registration page

Examples:

- `/r/events/:eventId/register`
- `/event-radar/events/:eventId/register`

Recommended behavior:

- show event name
- explain registration availability
- show registration form if enabled
- show status result after submit
- show closed or unavailable state when registration is not allowed

### Organizer participant list UI

Recommended columns:

- name
- email
- role
- status
- company
- registered at
- actions

Recommended actions:

- approve
- reject
- change role
- open participant detail

### Participant detail UX

Recommended sections:

- identity info
- registration status
- role
- notes if used
- future placeholders:
  - pass status
  - check-in status
  - event exchanges

### Frontend technical scope

- reuse existing dashboard list and detail patterns
- keep registration form minimal and mobile-friendly
- keep approval actions explicit and confirm destructive transitions where needed

### Frontend test scope

- public registration submit flow
- unavailable registration states
- organizer list and status updates
- role assignment UI behavior
- empty participant list state

## Identity Linkage Strategy

This sprint should define how event registration connects to existing Dotly identity.

Recommended order of preference:

1. signed-in Dotly user linked by `userId`
2. otherwise public registration linked only by submitted identity fields

Important rule:

- lack of sign-in should not prevent registration if the product wants easier event entry
- but signed-in users should gain better continuity for later pass and exchange features

## Exchange Linkage Strategy

This sprint should not force full exchange-to-participant reconciliation yet, but it must prepare for it.

Recommended future linkage keys:

- `userId`
- normalized email
- eventId

That gives later sprints a path to connect:

- registrations
- directory entries
- exchanges
- passes
- check-ins

## Audit Scope

Audit is mandatory for this sprint.

The audit must cover:

- registration mode correctness
- duplicate registration handling
- organizer-only management access
- state transition correctness
- identity linkage correctness
- public flow truthfulness for open, approval-required, and unavailable states

### Audit checklist

- can a user register for an invite-only event through the public flow?
- can the same email register repeatedly for the same event in conflicting ways?
- can a non-owner view or modify registrations for another organizer's event?
- can invalid role or status values be persisted?
- can an organizer move a registration through invalid transitions?
- does the public flow promise approval when the event is actually approval-required?
- are status messages truthful after submission?

## Fix Scope

Any issues found during audit that affect registration truthfulness, organizer authorization, dedupe, or state transitions must be fixed inside this sprint.

Must-fix categories:

- duplicate registration creation holes
- unauthorized organizer access gaps
- broken approval or rejection transitions
- incorrect initial status assignment
- misleading public registration messaging
- invalid role persistence

Can-defer categories only with explicit note:

- copy polish
- participant table sorting enhancements
- optional extra participant fields
- non-blocking registration-form styling improvements

## Re-Audit Scope

After fixes are applied, re-audit is required.

The re-audit should confirm:

- dedupe still works
- organizer actions remain restricted correctly
- status transitions remain valid
- participant list and detail views still reflect truth
- public registration outcomes remain honest and consistent

Re-audit output should classify remaining issues as:

- blocking
- acceptable for this sprint
- intentionally deferred to next sprint

## GREEN Criteria

This sprint is GREEN only if all of the following are true:

- registration settings exist on events
- public registration flow works for enabled events
- registration mode behavior is correct
- participant identity is persisted per event registration
- organizer can list and manage registrations
- duplicate registration handling is reliable
- role and status updates are validated correctly
- audit is completed
- must-fix findings are fixed
- re-audit confirms no blocking issues remain
- relevant tests for registration, dedupe, and organizer review pass

If any of the above is false, the sprint is not GREEN.

## Continue Or Stop Gate

### Can this sprint continue into the next sprint?

Yes, but only if the sprint exits GREEN.

This sprint can hand off safely to `006-p02-02B-directory-and-mutual-exchange.md` when:

- event participants are represented durably
- registration states are trustworthy
- organizer approval logic is stable
- the platform can safely decide who counts as an event participant for directory or mutual sharing purposes

This sprint must not hand off as ready if:

- participant identity is still ambiguous
- duplicate registration issues remain
- organizer review permissions are weak
- registration status truth is unstable

### What may continue in the next sprint

- participant directory
- participant visibility preferences
- mutual participant exchange network
- attendee discovery rules

### What must not be pushed carelessly to the next sprint

- unresolved dedupe issues
- unresolved approval authorization gaps
- unresolved ambiguity around who counts as an approved event participant

## Dependencies

Technical dependencies:

- Phase 1 event foundation and reporting
- authenticated user model
- public routing for event-specific flows

Product dependencies:

- agreement on registration modes
- agreement on initial participant roles
- decision on whether sign-in is required or optional for registration

## Non-Goals

- attendee directory browsing
- event passes
- entry scanning
- ticketing/payment
- session management

## Risks

### Risk 1 - Identity and exchange conflation

If registration becomes the same as exchange participation, the product will be hard to evolve safely.

Mitigation:

- keep registration separate from exchange data and consent data

### Risk 2 - Duplicate participant records

If dedupe is weak, participant counts and later pass issuance will become unreliable.

Mitigation:

- use normalized email and user linkage where available

### Risk 3 - Overcomplicated registration too early

If this sprint tries to become full ticketing, delivery will slow and the core identity layer may become messy.

Mitigation:

- keep V2 focused on registration status and participant identity only

### Risk 4 - Unclear organizer control

If approval and role management are not explicit, later participant directory and pass logic become hard to trust.

Mitigation:

- make organizer controls explicit and auditable

## Open Questions

1. Should public registration require Dotly sign-in, or should anonymous registration be allowed with optional later account linking?

2. Should `WAITLISTED` be part of V2 now, or deferred until event volume proves the need?

3. Should exhibitor and sponsor roles be self-selectable during registration, or only assignable by organizer?

4. Should approved participants automatically gain eligibility for future event-wide sharing and directory visibility, or should that remain a separate opt-in in the next sprint?

## Recommended Implementation Notes

- Prefer a minimal `EventRegistration` model first.
- Keep event role and registration status explicit.
- Normalize email consistently for dedupe.
- Avoid building payments or ticket classes into this sprint.
- Make public registration flows honest and organizer review flows strict.

## Acceptance Criteria

1. An organizer can enable and configure event registration.

2. A participant can register for an eligible event through a public flow.

3. Registration status is assigned correctly based on event registration mode.

4. Duplicate registrations are handled safely.

5. An organizer can list, review, approve, reject, and role-manage registrations.

6. Participant identity is stored durably enough to support later directory and pass flows.

7. The system is ready for the next sprint to define participant directory and mutual event-wide sharing rules.

## Definition Of Done

This sprint is complete when:

- registration settings exist
- public registration flow exists
- organizer registration management exists
- participant identity and registration status are persisted correctly
- audit, fix, and re-audit are completed
- documentation clearly explains how participant directory and mutual exchange build on top of this registration foundation next

## Sprint Closeout Message

At sprint close, the owning engineer or reviewer should record one of these explicit outcomes:

- `GREEN - Continue`
  - sprint passed implementation, audit, fix, and re-audit
  - next sprint may build on top of trustworthy participant identity and registration state

- `GREEN - Continue With Noted Deferrals`
  - sprint is safe to build on
  - only non-blocking deferred items remain and are documented

- `NOT GREEN - Do Not Continue`
  - blocking issues remain
  - next sprint must not treat participant identity and registration state as reliable

Recommended closeout message format:

```md
Status: GREEN - Continue

Why:

- Event registration and participant identity are durable and organizer-controlled
- Registration mode and approval state behave correctly
- Directory and mutual exchange work can safely build on approved participant data

Deferred:

- Optional waitlist support
- Optional signed-in profile prefill improvements
```
